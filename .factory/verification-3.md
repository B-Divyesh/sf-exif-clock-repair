# Independent verification — candidate `5bfed517427e718efcce448dea135d4ba6fd3302`

**Verdict: FAIL (release-blocking claims-contract defect).**

Verified 2026-08-28 from a clean checkout against
<https://exif-clock-repair.sociobot.in>. The deployed root HTML, app JS, CSS,
and service worker SHA-256 values match a fresh production build of this exact
commit. The app otherwise performed well in both local and live testing. The
failure is nevertheless mandatory: the live landing page and README contain
claims that have no corresponding `.factory/claims.json` entry and tagged demo
test. The attached claims contract explicitly makes this a failed review.

## First-read test (cold live visit)

PASS. The first screen says: “Repair photo capture clocks before sorting.” It
names people sorting a family photo archive as the audience, and its first
primary action is **Try it with sample data**, with the adjacent explanation
“See a three-photo repair plan right away.” One click opened `/demo` with a
three-file, two-sidecar plan and the persistent “Demo — sample data, nothing is
saved” banner. No console or page errors occurred.

## Required claim gate

`npm ci` completed successfully (60 packages, zero audit vulnerabilities).
Each required command was run independently from the clean checkout and passed
in both the desktop and 390x844 Playwright projects:

| Claim | Command | Result |
| --- | --- | --- |
| Demo sample data is isolated | `npm run test:e2e -- --grep @claim:demo-isolated` | PASS (2/2) |
| Photos stay on this device | `npm run test:e2e -- --grep @claim:local-photo-processing` | PASS (2/2) |
| Works offline after first visit | `npm run test:e2e -- --grep @claim:offline-reload` | PASS (2/2) |
| XMP/ledger ZIP export | `npm run test:e2e -- --grep @claim:sidecar-export` | PASS (2/2) |
| Free core workflow | `npm run test:e2e -- --grep @claim:free-core` | PASS (2/2) |

`.factory/claims.json` exists and has five valid entries. This does **not**
clear the unlisted-claim finding below.

## Local quality gates

- `npm test`: PASS, 12/12.
- `npm run typecheck` and `npm run lint`: PASS.
- `npm run build`: PASS; `dist/` produced. Main JS is 18,077 bytes raw
  (7.13 KB gzip), CSS is 8,409 bytes raw (2.56 KB gzip), and the hero WebP is
  44,922 bytes.
- `npm run test:e2e -- --reporter=dot`: PASS, 24/24 in 26.4 seconds (desktop
  and 390px mobile).
- `npm run verify:xmp`: first reported a missing documented system prerequisite
  (`exiftool`, ENOENT). After installing ExifTool 12.76 in the disposable QA
  container, PASS for `-04:00`, `+05:30`, `+12:45`, and no offset.

## End-to-end and accessibility evidence

- Live `/demo` exported a valid `exif-clock-repair/repair-ledger@2` ledger
  with 3 findings and 2 repairs. Its ZIP contained both expected folder-path
  XMP files and `exif-clock-repair-ledger.json`.
- A malformed `.jpg` and unsupported `.png` scan recovered without errors as
  two “No documented capture time” findings and zero proposals; Clear local
  plan restored the empty state with an announced next step.
- Fresh live demo loaded offline after service-worker control and retained
  “3 files examined · 2 sidecars ready.” Its registration has active controller
  `sw.js?v=5`, no waiting worker, cache `exif-clock-repair-v5`; an explicit
  `registration.update()` completed cleanly. Source includes `skipWaiting`,
  `clientsClaim`, and the update toast.
- Keyboard: the skip link receives first focus; the file chooser is reachable
  and visibly focused. Reduced-motion, 44px controls, clear-dialog recovery,
  and 200% text at 390px are covered in the passing E2E suite. Independent
  live 200%-text measurement was 390px scroll width / 390px client width.
- Independent axe scans of live `/` and `/demo` found zero serious or critical
  violations; each route had one `h1`, one `main`, `lang=en`, and no console or
  page errors. The live demo made same-origin requests only throughout export.
- Lighthouse mobile, live: performance 99, accessibility 100, best practices
  100, SEO 100; LCP 1.1 s, CLS 0.026, TBT 140 ms.

## Deployment, privacy, and policy evidence

Fresh local/live SHA-256 pairs match:

| Artifact | SHA-256 |
| --- | --- |
| `index.html` | `180d12aec6d28234a0780b5d773c6a2389acf2267e117c3ba315a0bb8e2bae3a` |
| `assets/main-BgAe99GV.js` | `1ca04c11ce868c2b3b2697be371a6c6cd3cf83735d7bf1e6f4ee4fb203d5efb7` |
| `assets/main-DZBJ1pR1.css` | `ea52ccb1e88a4256fd400d684e677da906a45ec7e2e5ab5a85b7e82c5849390d` |
| `sw.js` | `a69d17445d93bc62c532ab36427e0f9c81c23ffad45bf6c8773d90b2aa1e3fa6` |

Live `/`, `/demo`, `/privacy/`, `/terms/`, `/offline.html`, manifest, robots,
and sitemap return 200; a nonexistent page returns the styled 404 with HTTP
404. HTTPS response headers include HSTS, CSP with `frame-ancestors 'none'`,
`X-Frame-Options: DENY`, `nosniff`, restrictive Permissions-Policy, and
strict-origin referrer policy. Hashed assets are `max-age=31536000, immutable`;
the service worker is `no-cache`. OPTIONS is 204 and POST/TRACE are 405. This
is a static PWA with no product server-side/API endpoint, account system, or
factory unlock call, so rate-limit burst testing and Entra verification are
not applicable.

## Defects

### BLOCKER — C-01: visitor-facing claims are missing required claim entries and demo tests

The five registered claims do not cover several claims a visitor can rely on.
Examples on the live landing page:

- `src/main.ts:59`: “Exif Clock Repair reads JPEG EXIF in this version.”
- `src/main.ts:59`: “It records only filenames and findings in this browser;
  image pixels and originals stay where they are.”
- `src/main.ts:60`: “The app reads documented JPEG EXIF capture fields, shows
  disagreements … It never edits the original photo files.”
- `src/main.ts:61`: “Local-first · no analytics”.

README also promises documented JPEG EXIF/camera/offset reading and
whole-hour conflict detection at lines 4 and 19–21. None has an ID in
`.factory/claims.json`; none is asserted by the five tagged claim commands.
For example, `@claim:local-photo-processing` observes off-origin requests in
the demo and cannot prove the separate no-original-mutation, JPEG parsing,
metadata-retention, conflict-detection, or no-analytics promises.

Per the supplied claims skill: “any claim-like sentence with no entry in
`claims.json` is a finding … that fails the review until the sentence is
removed or a test is added.” Add individually observable, demo-entry-point
claims/tests (or remove/narrow this copy), then repeat the independent claim
gate and verification.

## Non-blocking notes

No other defects were found. The XMP verifier has an external ExifTool
prerequisite; README documents it, but a CI image should install it before
calling `npm run verify:xmp`.
