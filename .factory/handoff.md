# Handoff — Exif Clock Repair repair 2

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

Pending this repair commit being pushed and deployed. Update this section with
the deployment identifier, live browser/claim checks, response policy, and
artifact hashes immediately afterward.

## Known gaps

None known locally. The static-preview server itself returns its standard
SPA HTTP 200 for an unknown browser URL, while the deployed Azure configuration
includes `responseOverrides` for the designed 404 response; validate that
deployment behavior live.
