import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const port = 4321;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return response;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Next.js server did not start in time");
}

test("standard Next.js server renders TutorFlow", async () => {
  const nextBin = new URL("../node_modules/next/dist/bin/next", import.meta.url);
  const server = spawn(process.execPath, [nextBin.pathname.slice(1), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: new URL("..", import.meta.url),
    stdio: "ignore",
  });
  try {
    const response = await waitForServer();
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>TutorFlow/);
    assert.match(html, /Firebase не настроен|Загружаем TutorFlow|Занятия сегодня/);
    assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Building your site/);
    assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
    assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
    assert.match(html, /rel="apple-touch-icon"/);
  } finally {
    server.kill();
  }
});
