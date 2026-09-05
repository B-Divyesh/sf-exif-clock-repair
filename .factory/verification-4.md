# Independent verification 4 — Repair photo capture clocks before sorting

**Verdict: PASS.** There are zero findings and zero untested public claims.

Verified on 2026-09-05 from a fresh clone and clean dependency install. The
implementation reviewed is `f03779acb690ecd4500c09192b65c28b6f819704`.
The verification/documentation checkout is
`13bdd9212a0a362a24d801bfa0a8fb35b7368e2c`; its diff from the implementation
changes claims/test/report files only, not shipped product source. Live URL:
<https://exif-clock-repair.sociobot.in>.

## First screen and demo

Fresh, cache-free desktop (1440×900) and phone (iPhone 13) sessions were
checked before scrolling. Both showed the same first screen:

- Job: “Repair photo capture clocks before sorting.”
- Audience: people sorting a family photo archive with dates changed by
  cameras, computers, or time zones.
- First action: **Try it with sample data**; its adjacent result says it opens
  a three-photo repair plan immediately.
- Facts: photos stay on this device; it works offline after the first visit;
  it is free with no purchase required.

The action was in the initial viewport in both sessions. One click opened
`/demo`, showing “3 files examined · 2 sidecars ready” and the persistent
“Demo — sample data, nothing is saved” banner with **Reset demo** and
**Start for real**. There were no browser console or page errors.

Independent live reset exercise: a pre-seeded real plan remained byte-for-byte
unchanged while a demo proposal was deselected; **Reset demo** removed only
`demo:exif-clock-repair:last-plan` and restored the sample. No real photo or
plan was modified.

## Claim gate

All commands below were run independently after `npm ci` in the fresh clone.
Each passed in desktop and 390×844 mobile Chromium (2/2 each). The final full
suite also passed locally and against live, covering normal, malformed,
unsupported-format, boundary, recovery, keyboard, reduced-motion, offline,
privacy, legal-route, and 404 paths.

| Claim ID | Command | Result |
| --- | --- | --- |
| `demo-isolated` | `npm run test:e2e -- --grep @claim:demo-isolated` | PASS, 2/2 |
| `local-photo-processing` | `npm run test:e2e -- --grep @claim:local-photo-processing` | PASS, 2/2 |
| `offline-reload` | `npm run test:e2e -- --grep @claim:offline-reload` | PASS, 2/2 |
| `sidecar-export` | `npm run test:e2e -- --grep @claim:sidecar-export` | PASS, 2/2 |
| `free-core` | `npm run test:e2e -- --grep @claim:free-core` | PASS, 2/2 |
| `jpeg-exif-reading` | `npm run test:e2e -- --grep @claim:jpeg-exif-reading` | PASS, 2/2 |
| `conflict-detection` | `npm run test:e2e -- --grep @claim:conflict-detection` | PASS, 2/2 |
| `originals-unchanged` | `npm run test:e2e -- --grep @claim:originals-unchanged` | PASS, 2/2 |
| `plan-storage` | `npm run test:e2e -- --grep @claim:plan-storage` | PASS, 2/2 |
| `no-analytics` | `npm run test:e2e -- --grep @claim:no-analytics` | PASS, 2/2 |

The landing page, README, privacy page, and terms page were cross-checked
against `.factory/claims.json`. All visitor-reliance claims are represented
by one observable tagged test. Untested public claims: **0**.

## Clean-checkout checks

- `npm ci` and `npm audit --audit-level=low`: PASS; 60 packages installed,
  zero vulnerabilities.
- `npm test`: PASS, 12/12.
- `npm run lint` and `npm run typecheck`: PASS.
- `npm run verify:xmp`: PASS for `-04:00`, `+05:30`, `+12:45`, and no offset.
  ExifTool was installed as the README-documented prerequisite before this
  runtime check.
- `npm run build`: PASS; `dist/index.html` exists. Main JS is 18,175 bytes
  raw / 7.13 KiB gzip and CSS is 8,409 bytes raw / 2.56 KiB gzip.
- `npm run test:e2e -- --reporter=dot`: PASS, 34/34 local.
- `PLAYWRIGHT_BASE_URL=https://exif-clock-repair.sociobot.in npm run test:e2e -- --reporter=dot`:
  PASS, 34/34 live.

`verify-url.sh` passed for live `/` and `/demo`: titles, `lang=en`, one `h1`,
`main`, image alt text, labelled buttons, and no console errors. The suite's
Playwright Axe integration passed with zero serious or critical violations.
The standalone Axe CLI could not start because this container has no system
Chrome binary; this is not an untested accessibility claim because the
attached accessibility contract permits the Playwright Axe integration, which
ran against the product in both full suites.

Fresh live route/link crawl: `/`, `/demo`, `/privacy/`, `/terms/`,
`/offline.html`, manifest, robots, and sitemap returned 200. Every internal
link returned 200. `/does-not-exist` deliberately returned the designed 404
page with title “Page not found — Exif Clock Repair” and heading “This page was
not found.”

## Live, PWA, privacy, and performance evidence

- The live demo reloaded offline after service-worker control and rendered the
  populated sample plan. The worker precaches the app shell, removes old
  product caches, and supplies the in-app update notice path.
- The complete local and live test flows observed only same-origin static
  requests, no XHR/fetch/beacon/websocket traffic, and no cookies. Photo bytes
  were absent from local/session/IndexedDB/cache storage; plan metadata
  persisted until reset or clear.
- GET and HEAD returned 200; OPTIONS returned 204; POST and TRACE returned
  405. Live headers include HSTS, CSP with `frame-ancestors 'none'`,
  `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies.
- Fresh build and live artifact SHA-256 values match exactly:
  `index.html` `5134b07ef04cb9c6846107ea5514c70ef1c2153c9ffc8b10e6bed7eae1b6e950`;
  JS `54df2fa79e0efe4e4dbae5ab1ac4322d732bd35a02367ace3943785b0a467a4c`;
  CSS `ea52ccb1e88a4256fd400d684e677da906a45ec7e2e5ab5a85b7e82c5849390d`;
  service worker `a69d17445d93bc62c532ab36427e0f9c81c23ffad45bf6c8773d90b2aa1e3fa6`.
- Fresh live mobile Lighthouse measurement: performance 99, accessibility 100,
  best practices 100, SEO 100; LCP 1.1 s, CLS 0.026, TBT 90 ms, 65 KiB total
  transfer. This meets the required performance gate. The earlier 100
  performance score was not reproduced; Lighthouse performance varies slightly
  between runs and is not a visitor-facing quantitative claim.

This is a static PWA. There is no product backend, tenant, login, payment, or
server-side state; tenant isolation, restart persistence, and 429/Retry-After
checks do not apply.

## Earlier finding disposition

| Earlier finding | Current disposition and evidence |
| --- | --- |
| Negative-offset XMP interoperability | Fixed: `verify:xmp` passes four offset/no-offset forms and ZIP tests inspect XMP/ledger output. |
| Keyboard-unreachable scan actions | Fixed: full suite tabs to the file chooser, confirms focus and Enter operation. |
| Unsafe 10k/colliding export | Fixed: unit suite passes the 10k archive case; ZIP claim confirms folder-preserving paths and one bundle. |
| Rounded +1h20m pattern | Fixed: conflict claim accepts exact +8/+14 and rejects +15 and +1h20m. |
| Corrupt storage blank page | Fixed: recovery test clears corrupt state and announces the next step. |
| Hidden mobile clear path | Fixed: mobile test exposes and operates the clear control. |
| Small targets/default focus | Fixed: target-size and designed focus assertions pass. |
| Axe landmark violation | Fixed: Playwright Axe has zero serious/critical violations. |
| Missing paid unlock | Retired deliberately: no paid tier or purchase claim remains; core workflow is free and tested. |
| Vulnerable tooling | Fixed: fresh audit reports zero vulnerabilities. |
| Short asset cache/old caches retained | Fixed: live hashed assets are immutable and worker test confirms only cache v5 remains. |
| Missing CSP/framing/permissions policy | Fixed: live headers verified above. |
| Manifest wrong MIME | Fixed: manifest route and configured MIME are live. |
| Singular result copy | Fixed by plural-aware count assertions in full suite. |
| Figure shadow/caption duplication | Fixed in current rendered art; no duplicated caption treatment observed. |
| Missing claims manifest/tests | Fixed: ten entries and ten independent tagged commands pass. |
| Missing isolated demo | Fixed: direct desktop/phone exercise and isolation/reset test pass. |
| Unclear first screen | Fixed: cold first-screen check above passes on desktop and phone. |
| Broken purchase link | Removed with the retired paid tier; no purchase link remains. |
| Offline CSP console error | Fixed: `/offline.html` loaded with no console errors. |
| 200% mobile text overflow | Fixed: full suite verifies no horizontal overflow at 390px and 200% text. |
| Missing robots/sitemap/metadata/404/legal shell | Fixed: route crawl, metadata/legal assertions, and designed HTTP 404 pass. |
| Missing demo and copy-audit docs | Fixed: `.factory/demo.md` and `.factory/copy-audit.md` exist and match live behavior/copy. |
| Unlisted JPEG, storage, conflict, original, and no-analytics claims | Fixed: the final five claim IDs cover each outcome and pass independently. |

## Evidence and result

URL-smoke evidence is in `/work/.evidence/live-root-verify4` and
`/work/.evidence/live-demo-verify4`; the Lighthouse JSON is
`/work/.evidence/lighthouse-verify4.json`.

**Final result: PASS — 0 findings; 0 untested claims.**
