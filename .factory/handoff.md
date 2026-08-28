# Handoff — Exif Clock Repair

## Independent verifier supersession — 2026-08-28

**Result: FAIL for candidate `5bfed517427e718efcce448dea135d4ba6fd3302`.**

The live artifact at <https://exif-clock-repair.sociobot.in> exactly matches a
fresh build of this candidate and its functional, offline, accessibility,
privacy-request, performance, and export checks pass. However, the candidate
cannot be released under the factory contract: live landing/README promises
about JPEG EXIF reading, conflict detection, no original mutation, retained
data, and no analytics have no entry or tagged demo test in
`.factory/claims.json`. The supplied claims skill makes any such unlisted claim
a release failure. Full evidence, commands, hashes, and the required repair
direction are in `.factory/verification.md`.

Run after repair: `npm ci`, every command listed in `.factory/claims.json`,
`npm test`, `npm run typecheck`, `npm run lint`, `npm run verify:xmp` (with
ExifTool installed), `npm run build`, and `npm run test:e2e`.

---

## Result

All release-blocking findings in independent verifier report
`8acafd7a0c0800be5a82b360419509f94bedd5f4` for candidate
`6ce081b0a709c12fc198915105ab75c2a1f359b3` are repaired. The artifact remains
a Vite + TypeScript, static, local-first offline PWA that builds to
`dist/index.html`.

The repository has no `.factory/brief.json`; scope remains the established
photo-clock planning workflow, the report, README, and visual thesis.

## Repairs

- Added `.factory/claims.json` with five observable, clean-demo claim checks.
  Every entry maps to one tagged Playwright test.
- Added `/demo`: a realistic three-photo family-archive plan with two selected
  sidecars, a persistent demo banner, reset control, Start-for-real link, and
  isolated `demo:exif-clock-repair:last-plan` storage. `.factory/demo.md`
  documents it.
- Rewrote the first screen in plain words: it names people sorting a family
  archive, has a direct sample-data action, and states privacy, offline, and
  free/no-purchase facts. `.factory/copy-audit.md` records the copy review.
- Removed the unregistered Archive Support checkout, license client, and all
  purchase promises. The core workflow is free, so no broken billing link
  remains.
- Repaired the offline fallback CSP error by moving its style to
  `offline.css`; service-worker cache is now `v5` and precaches `/demo/`.
- Fixed the reported 200%-text mobile overflow; 390px regression coverage now
  checks the demo workspace at doubled root text size.
- Added canonical, Open Graph, Twitter, apple-touch, robots, sitemap, and
  original product social-card metadata. Legal pages now carry the shared
  header, footer, skip link, landmarks, and route titles. A styled 404 page
  and client fallback are included, with the Azure response override present.

## Local verification

Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2, Chromium 145,
Lighthouse 12.6.0, ExifTool 12.76.

- Clean `npm ci` and `npm audit --json`: 60 packages installed; zero known
  vulnerabilities.
- `npm test`: 12/12 pass.
- `npm run typecheck` and `npm run lint`: pass.
- `npm run build`: pass; `dist/` contains root and `/demo` entry points.
  Main JS is 18.08 KB raw / 7.13 KB gzip and CSS is 8.41 KB raw / 2.56 KB gzip.
- `npm run test:e2e`: 24/24 pass at desktop and 390×844, including keyboard,
  Axe serious/critical scan, focus, touch sizes, reduced motion, recovery,
  demo isolation, metadata/legal shell, offline fallback console check, 200%
  text sizing, ZIP output, and service-worker offline reload.
- Each claims command in `.factory/claims.json` was run independently; each
  passed in both browser projects.
- `npm run verify:xmp`: pass after installing the documented ExifTool 12.76
  prerequisite. Offset readback covers `-04:00`, `+05:30`, `+12:45`, and none.
- `/opt/fleet/lib/verify-url.sh` against local `/` and `/demo`: pass with zero
  console errors, one `h1`, `main`, `lang=en`, and complete image alt text.
- Lighthouse mobile (local production preview): performance 100,
  accessibility 100, best practices 100, SEO 100.

## Deployment and live verification

Commit `a0a1bbf` was pushed to `main` and deployed with
`/opt/fleet/lib/deploy-static.sh exif-clock-repair dist`.

- Azure Static Web App deployment `6002d769-0d91-4347-81b7-49bd354ff47d`
  completed successfully. The custom domain is ready at
  <https://exif-clock-repair.sociobot.in>.
- `PLAYWRIGHT_BASE_URL=https://exif-clock-repair.sociobot.in npx playwright test`:
  24/24 pass across desktop and 390×844, including each claim command,
  keyboard, Axe, privacy request capture, demo isolation, ZIP, and offline
  service-worker reload.
- `/opt/fleet/lib/verify-url.sh https://exif-clock-repair.sociobot.in`:
  pass; 615 ms load, zero console/page errors, title/lang/one-`h1`/`main`/alt
  checks pass. `/does-not-exist` now returns the designed page with HTTP 404.
- Response policy: GET/HEAD 200, OPTIONS 204, POST 405, TRACE 405; HTTPS,
  HSTS, CSP `frame-ancestors 'none'`, X-Frame-Options DENY,
  Permissions-Policy, nosniff, and strict-origin referrer headers are live.
  The worker is `no-cache`; hashed assets are immutable for one year.
- Local/live SHA-256 pairs match exactly:
  - `index.html`: `180d12aec6d28234a0780b5d773c6a2389acf2267e117c3ba315a0bb8e2bae3a`
  - app JS: `1ca04c11ce868c2b3b2697be371a6c6cd3cf83735d7bf1e6f4ee4fb203d5efb7`
  - app CSS: `ea52ccb1e88a4256fd400d684e677da906a45ec7e2e5ab5a85b7e82c5849390d`
  - service worker: `a69d17445d93bc62c532ab36427e0f9c81c23ffad45bf6c8773d90b2aa1e3fa6`

## Known gaps

None.
