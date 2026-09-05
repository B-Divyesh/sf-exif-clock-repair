# Repair verification 4 — Exif Clock Repair

Verified 2026-09-05. The implementation candidate is
`f03779acb690ecd4500c09192b65c28b6f819704`.

## Result

PASS. The release-blocking claims defect in `.factory/verification-3.md` is
fixed. All visitor-facing claims called out by that verifier now have entries
in `.factory/claims.json` and one outcome-based tagged browser test each.

## Claim gate

Each declared command was run independently after `npm ci`. Every command
passed in fresh desktop and 390×844 mobile Chromium contexts:

| Claim ID | Observable evidence |
| --- | --- |
| `demo-isolated` | Demo changes and reset never alter the real key; Start for real deletes the demo key. |
| `local-photo-processing` | A private EXIF JPEG and both exports send no photo or plan payload. |
| `offline-reload` | `/demo` reloads after the browser context goes offline. |
| `sidecar-export` | One ZIP contains directory-preserving XMP files and a complete reversible ledger. |
| `free-core` | Proposals and exports work without account or purchase state. |
| `jpeg-exif-reading` | A valid JPEG exposes capture/create dates, make, model, and offset; PNG, HEIC, TIFF, and malformed JPEG paths recover safely. |
| `conflict-detection` | +8-hour, boundary +14-hour, and EXIF disagreement cases are staged; +15 hours and +1 hour 20 minutes are not. |
| `originals-unchanged` | SHA-256 of the selected source file is identical before and after scan and both exports. |
| `plan-storage` | Structured plan metadata survives reload and clears on reset; no photo payload appears in browser storage. |
| `no-analytics` | The full demo uses known same-origin static assets, no XHR/fetch traffic, and no cookies. |

The previous inaccurate sentence saying that only filenames and findings were
stored now says that repair-plan metadata is stored and photo bytes are not.
The test inspects local storage, session storage, IndexedDB, and Cache Storage.

## Full local verification

Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2, Chromium 145,
ExifTool 12.76, Lighthouse 12.6.0.

- `npm ci` and `npm audit --audit-level=low`: pass; zero vulnerabilities.
- `npm test`: 12/12 pass.
- `npm run lint` and `npm run typecheck`: pass.
- `npm run verify:xmp`: pass for `-04:00`, `+05:30`, `+12:45`, and no offset.
- `npm run build`: pass; `dist/index.html` exists. Main JS is 18.18 KB raw /
  7.13 KB gzip; CSS is 8.41 KB raw / 2.56 KB gzip.
- `npm run test:e2e`: 34/34 pass across desktop and mobile. This includes Axe,
  keyboard focus, 44 px targets, 200% text, reduced motion, error recovery,
  route titles, legal pages, 404, ZIP output, privacy traffic, and offline reload.
- `/opt/fleet/lib/verify-url.sh` passes for local `/` and `/demo` with no
  console errors, one `h1`, `main`, `lang=en`, and complete image alt text.
- Local mobile Lighthouse: performance 100, accessibility 100, best practices
  100, SEO 100; LCP 1.7 s, CLS 0.026, TBT 0 ms.

## Deployment and cold live verification

`/opt/fleet/lib/deploy-static.sh exif-clock-repair dist` deployed the candidate
successfully. Azure deployment ID:
`97feb52a-b904-4249-b724-6ea9096d0f95`.

- Live desktop/mobile Playwright: 34/34 pass, including all claim tests and the
  service-worker offline reload.
- Fresh live `/` and `/demo` URL checks: pass with no console or page errors.
  Screenshots and JSON reports are under `/work/.evidence/live-root` and
  `/work/.evidence/live-demo`.
- Live mobile Lighthouse: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 0.8 s, LCP 1.1 s, CLS 0.026, TBT 10 ms, 65 KiB transfer.
- `/does-not-exist` returns the designed page with HTTP 404. Its heading is now
  plain: “This page was not found.”
- GET/HEAD return 200, OPTIONS 204, and POST/TRACE 405. HSTS, CSP with
  `frame-ancestors 'none'`, X-Frame-Options DENY, Permissions-Policy,
  `nosniff`, and strict-origin referrers are present. Hashed assets are immutable
  for one year; the app document revalidates.
- Live and local SHA-256 values match:
  - `index.html`: `5134b07ef04cb9c6846107ea5514c70ef1c2153c9ffc8b10e6bed7eae1b6e950`
  - app JS: `54df2fa79e0efe4e4dbae5ab1ac4322d732bd35a02367ace3943785b0a467a4c`
  - app CSS: `ea52ccb1e88a4256fd400d684e677da906a45ec7e2e5ab5a85b7e82c5849390d`
  - service worker: `a69d17445d93bc62c532ab36427e0f9c81c23ffad45bf6c8773d90b2aa1e3fa6`

## Earlier findings

The XMP interoperability, collision-safe bulk export, exact-hour detection,
corrupt-state recovery, keyboard/touch access, mobile clearing, Axe landmark,
dependency, service-worker cache, security-header, CSP, metadata, legal-shell,
plain first screen, demo, and 200%-text findings remain fixed. This repair adds
regression evidence for the only open finding in verification 3.

This is a static PWA with no product backend, tenant data, account endpoint, or
paid offer in the inherited candidate. Backend isolation, restart persistence,
rate-limit, and billing-registration checks are therefore not applicable.

## Remaining gaps

No known product defect remains. `npm run verify:xmp` still requires the
documented ExifTool system prerequisite.
