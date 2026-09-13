import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const root = new URL("../public/", import.meta.url);
const code = await readFile(new URL("sw.js", root), "utf8");
const origin = "https://tutorflow.test";

function worker() {
  const handlers = {}, stores = new Map(), calls = [];
  const key = value => new URL(typeof value === "string" ? value : value.url, origin).href;
  const caches = {
    keys: async () => [...stores.keys()], delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return { addAll: async paths => { for (const path of paths) store.set(key(path), new Response(path)); },
        match: async request => store.get(key(request))?.clone(), put: async (request, response) => store.set(key(request), response),
        keys: async () => [...store.keys()].map(url => ({ url })), delete: async request => store.delete(key(request)) };
    },
  };
  const state = { offline: false };
  vm.runInNewContext(code, { URL, Response, Set, caches, self: { location: { origin }, clients: { claim: async () => {} }, addEventListener: (type, listener) => { handlers[type] = listener; } }, fetch: async request => {
    calls.push(request.url); if (state.offline) throw new Error("offline");
    const response = new Response("network"); Object.defineProperty(response, "type", { value: "basic" }); return response;
  } });
  const lifecycle = type => { let pending; handlers[type]({ waitUntil: value => { pending = value; } }); return pending; };
  const request = (path, options = {}) => {
    let result;
    handlers.fetch({ request: { url: new URL(path, origin).href, method: "GET", mode: "cors", headers: new Headers(), ...options }, respondWith: promise => { result = promise; } });
    return result;
  };
  return { lifecycle, request, stores, calls, state };
}

test("manifest launches TutorFlow standalone and supplies correctly sized PNG icons", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
  assert.equal(manifest.name, "TutorFlow"); assert.equal(manifest.short_name, "TutorFlow");
  assert.equal(manifest.display, "standalone"); assert.equal(manifest.start_url, "/"); assert.equal(manifest.scope, "/");
  for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["icon-maskable-512", 512], ["apple-touch-icon", 180]]) {
    const png = await readFile(new URL(`icons/${name}.png`, root));
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
});

test("only safe public shell is precached; old app caches are cleaned without touching unrelated storage", async () => {
  const w = worker(); w.stores.set("other-app", new Map()); w.stores.set("tutorflow-pwa-old", new Map());
  await w.lifecycle("install"); await w.lifecycle("activate");
  assert.ok(w.stores.has("other-app")); assert.ok(!w.stores.has("tutorflow-pwa-old"));
  const keys = [...w.stores.get("tutorflow-pwa-shell-v1").keys()];
  assert.ok(keys.includes(`${origin}/offline.html`));
  assert.ok(keys.every(key => key.endsWith("/offline.html") || key.includes("/icons/")));
});

test("Firebase APIs, tokens, auth helpers, RSC and non-GET requests are never intercepted", () => {
  const w = worker();
  for (const url of ["https://identitytoolkit.googleapis.com/v1/accounts:lookup", "https://securetoken.googleapis.com/v1/token", "https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel", "https://firebasestorage.googleapis.com/v0/b/files", "/__/auth/handler", "/__/firebase/init.json", "/api/payments", "/statistics?_rsc=123"]) assert.equal(w.request(url), undefined);
  assert.equal(w.request("/icons/icon-192.png", { method: "POST" }), undefined);
  assert.equal(w.request("/_next/static/chunk.js", { headers: new Headers({ authorization: "Bearer secret" }) }), undefined);
  assert.equal(w.request("/_next/static/chunk.js", { headers: new Headers({ rsc: "1" }) }), undefined);
  assert.deepEqual(w.calls, []);
});

test("online app HTML is network-only and offline navigation gets a data-free shell", async () => {
  const w = worker(); await w.lifecycle("install");
  assert.equal(await (await w.request("/payments", { mode: "navigate" })).text(), "network");
  assert.ok([...w.stores.values()].every(store => !store.has(`${origin}/payments`)));
  w.state.offline = true;
  for (const path of ["/", "/login", "/schedule", "/payments", "/statistics", "/students/seva"]) assert.equal(await (await w.request(path, { mode: "navigate" })).text(), "/offline.html");
});

test("build resources are cached and available offline, with a bounded runtime cache", async () => {
  const w = worker(); await w.lifecycle("install");
  await w.request("/_next/static/chunk.js"); w.state.offline = true;
  assert.equal(await (await w.request("/_next/static/chunk.js")).text(), "network");
  w.state.offline = false;
  for (let i = 0; i < 105; i++) await w.request(`/_next/static/${i}.js`);
  assert.equal(w.stores.get("tutorflow-pwa-static-v1").size, 100);
});
