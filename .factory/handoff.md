# Handoff — Exif Clock Repair repair 1

## Result

The release-blocking defects reported in verifier commit
`c62539bc18cf82448d8f133043587bde0dba90aa` for candidate
`5ecfa943136ac8dfbe8b5ae751f31b1c3a92c5e4` are repaired and deployed at
<https://exif-clock-repair.sociobot.in>. The artifact remains a static,
local-first offline PWA with `dist/index.html` at its root.

The repository did not contain `.factory/brief.json` at the base commit or in
reachable history. Scope was preserved from `.factory/verification.md`, the
existing README, and `.factory/design.md`.

## Repairs

- XMP dates are serialized as ISO 8601 (`YYYY-MM-DDTHH:mm:ss±HH:mm`) rather
  than concatenated EXIF date strings. Positive, negative, fractional-hour,
  and absent offsets retain their meaning.
- Sidecars download in one valid ZIP. Relative source directories are retained,
  exact duplicate paths receive deterministic suffixes, and a complete ledger
  includes both selected and rejected decisions. A 10,000-sidecar regression
  completes in about 0.36 seconds rather than scheduling 25 minutes of browser
  downloads.
- Folder and file pickers now use native focusable buttons. Enter opens the
  chooser. Designed focus rings and 44px targets cover pickers, checkboxes,
  deletion, navigation, restore, and update controls.
- Corrupt or structurally invalid local state is removed safely and produces an
  announced recovery message instead of a blank page. “Clear local plan” is
  visible at 390px and asks for specific confirmation.
- File-date evidence must be an exact whole-hour delta. `+1h20m` is no longer
  rounded or staged. Singular result text and the duplicated figure shadow were
  also corrected.
- The nested complementary landmark was replaced with a note, eliminating the
  populated-workspace Axe finding.
- The optional $12 one-time Archive Support client implements the required
  checkout URL, query-token capture and URL stripping, local token storage,
  once-per-day verification cache, optimistic cached/offline behavior, invalid
  license handling, restore form, merchant/refund copy, and privacy/terms copy.
  Core safety, accessibility, and export remain free.
- Vite/Vitest were updated; `npm audit` now reports zero vulnerabilities.
- Service worker cache `v4` precaches full response bodies, claims clients,
  removes old product caches, uses network-first navigation and cache-first
  static assets, and never serves HTML as a failed script/style fallback.
- Azure Static Web Apps configuration adds CSP, frame protection,
  Permissions-Policy, `nosniff`, strict-origin referrers, correct manifest MIME,
  no-cache worker/manifest rules, and one-year immutable caching for hashed
  assets, icons, and the hero image.

## Verification evidence

Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2, Chromium
145.0.7632.6, ExifTool 12.76.

- `npm ci` — pass; 60 packages installed, zero audit findings.
- `npm run lint` / `npm run typecheck` — pass (`tsc -b`).
- `npm test` — 12/12 pass, including exact-hour rejection, saved-state
  recovery, collision-safe ZIP paths, complete audit decisions, offset
  normalization, and a 10,000-record bundle.
- `npm run test:e2e` — 14/14 pass across desktop Chromium and 390×844 mobile:
  keyboard-triggered folder selection, real EXIF fixture scan, semantic smoke,
  Axe serious/critical scan, visible 44px mobile clear/checkbox controls,
  corrupt-state recovery, license capture/daily cache, privacy request capture,
  reduced motion, ZIP extraction, update check/cache cleanup, and offline
  saved-workspace reload.
- `npm run verify:xmp` — ExifTool `-validate` reports `OK`; readback exactly
  preserved `-04:00`, `+05:30`, `+12:45`, and no-offset timestamps with no
  warning.
- `npm run build` — pass. App JS 18,019 B raw / 7.31 KB gzip; CSS 7,876 B raw /
  2.45 KB gzip; hero WebP 44,922 B. All are below product budgets.
- `/opt/fleet/lib/verify-url.sh` — pass locally and live: title, `lang`, one
  `h1`, `main`, image alt, labelled buttons, and zero console/page errors.
- Live Playwright suite via
  `PLAYWRIGHT_BASE_URL=https://exif-clock-repair.sociobot.in npx playwright test`
  — 14/14 pass, including live desktop/mobile, keyboard, Axe, ZIP, license,
  service-worker control, cache readiness, update path, and offline reload.
- Live Lighthouse 12.6 mobile — performance 100, accessibility 100, best
  practices 100; FCP 0.8s, LCP 1.1s, TBT 50ms, CLS 0, transfer 65 KiB.
- Live response policy — HTTPS 200; GET 200, HEAD 200, OPTIONS 204, POST 405,
  TRACE 405; HSTS, CSP with `frame-ancestors 'none'`, X-Frame-Options DENY,
  Permissions-Policy, `nosniff`, and strict-origin referrer policy present.
  Manifest is `application/manifest+json`; hashed JS and hero responses use
  `public, max-age=31536000, immutable`.
- Live identity — local/live SHA-256 matches:
  JS `a18cce6ef896fce547f2562ad9f5d3eaa7a54614b6ec32a5c21477c5d77fdd70`,
  CSS `a05f0ff88911fc7115c65aa6ad53e1b2812f02e7fed35a5a4cce058a6aff69ee`,
  worker `f5fae50f4c86ae60384947878c480804ef3834424de7c4f7ff08ac6fdaeeb8cd`.

## Deployment

`/opt/fleet/lib/deploy-static.sh exif-clock-repair dist` completed successfully
to existing Azure Static Web App `sf-exif-clock-repair` in `centralus`.
Deployment IDs: `b2bfe997-7397-402a-9f19-5b606602aaf5` and MIME-policy follow-up
`7dd68e97-063f-4769-ba77-6e2c1029a6d0`. The custom domain reported `Ready` and
HTTPS returned 200.

## Known external gap

The repository-side paid-unlock implementation is complete, but both production
and pilot checkout URLs currently return HTTP 404 because the product has not
been registered in the Sociobot billing engine. No registration utility or
authorized billing configuration was present in this work order, and repository
policy forbids changing billing infrastructure. The factory must register the
`exif-clock-repair` product with the documented $12 price/return URL before
announcing the paid option; no code change is required afterward.
