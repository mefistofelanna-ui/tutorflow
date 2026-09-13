# TutorFlow PWA

## Files and registration

- `public/manifest.webmanifest`: TutorFlow, `/` start URL/scope, standalone display.
- `public/icons/`: 192/512 PNG icons, a maskable 512 PNG, an Apple 180 PNG, and the SVG source based on the existing lavender T monogram.
- `app/PwaRegistration.tsx`: registers `/sw.js` with scope `/` after page load, only in production. Mounted outside `AppProvider` so registration does not depend on login.
- `public/sw.js`: precaches the offline shell and icons; caches explicitly allowed public assets and `/_next/static/` build files, capped at 100 runtime entries. Online page HTML and Next RSC are never cached. All external requests, non-GET requests, Authorization headers and Firebase `/__/` helpers bypass the worker. Firebase IndexedDB/session storage is never cleared or modified.
- `public/offline.html`: a self-contained, data-free offline page. It requires no React, Auth or Firestore. “Попробовать снова” navigates online to `/`.
- `next.config.ts`: prevents HTTP caching of the service worker script.

Increment the cache version in `sw.js` when changing precached content. Updates wait until existing app windows close, then old **TutorFlow PWA caches only** are removed. No automatic reload interrupts lesson/payment forms.

## Local verification

Use the production server: `npm run build`, then `npm run start -- --hostname 127.0.0.1 --port 3002`. Open `http://127.0.0.1:3002` on this computer. Registration is intentionally disabled in `npm run dev` to avoid caching development/HMR files.

In browser DevTools, check Application → Manifest and Service Workers. Reload once after registration. In Network, switch Offline and navigate/reload `/schedule`: the offline page should appear. Restore connectivity and use “Попробовать снова”. Cache Storage should contain only static assets and `offline.html`, never payments, students, API responses or tokens.

On a real phone, use an HTTPS origin serving this production build. The computer's `127.0.0.1` is not reachable as that address from a phone, and plain HTTP on a LAN IP does not qualify for a service worker. Publishing is a separate action; these changes do not publish the site.

## Android

Open the HTTPS site in Chrome → menu → Install app / Add to Home screen → Install. Launch **the installed icon**, not a saved browser bookmark. Check that the browser address bar is absent and internal navigation stays inside the app.

## iPhone

Open the HTTPS site in Safari → Share → Add to Home Screen. Leave **Open as Web App** enabled if that switch is shown. Add TutorFlow and launch its Home Screen icon. Check the icon, standalone window and internal navigation.

## Authentication and device checks

The existing `getAuth()` configuration remains unchanged. Firebase's default browser persistence is local; signing in inside the installed app should survive closing and reopening it. An iPhone Home Screen app may have separate storage from Safari: sign in once inside the installed app rather than assuming Safari's session is shared.

On each phone: sign in, close the app completely, reopen it online, and confirm the same user is restored. Check `/schedule`, `/payments` and `/statistics` at the phone's width. Then go offline, relaunch and verify the offline screen; reconnect and confirm the session is still restored. Finally sign out and confirm reopening requires login. Clearing site/app data or an expired/revoked session can require a fresh sign-in.

Automated desktop checks cannot certify physical iPhone/Android installation or their OS-specific storage lifecycle; complete the above device checks before considering those verified.

References: [Firebase persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence), [Android installation](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en), [iPhone installation](https://support.apple.com/guide/iphone/iphea86e5236/ios).
