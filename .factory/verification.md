# Independent verification — Exif Clock Repair

**Verdict: FAIL**

Candidate `5ecfa943136ac8dfbe8b5ae751f31b1c3a92c5e4` was tested on
2026-08-28 from a clean `main` checkout. The deployed product at
`https://exif-clock-repair.sociobot.in/` is available and byte-for-byte matches
the candidate production build, so this is not a deployment-only failure.
Release is blocked by an invalid timezone-bearing XMP export, inaccessible core
file controls for keyboard users, and an export design that is unsafe for
duplicate filenames and impractical at the brief's 10,000-file pilot scale.

## Environment and commands

- Node `22.23.2`, npm `10.9.8`
- Playwright `1.58.2`, Chromium `145.0.7632.6`
- Lighthouse `12.6.0`, ExifTool `12.76`
- `npm ci` — completed from the lockfile; reported 3 development dependency
  vulnerabilities (1 moderate, 1 high, 1 critical).
- `npm test` — PASS, 1 file / 4 tests.
- `npm run build` — PASS. This is the exact production command and includes
  `tsc -b`; `dist/` was produced.
- No lint script or separate integration/e2e script exists in `package.json`.
- `npm audit --json` — FAIL: vulnerable locked versions of Vitest (critical,
  GHSA-5xrq-8626-4rwp), Vite (high), and esbuild (moderate). These affect
  development/test tooling, not the emitted static runtime.

No product source was changed during verification.

## Production artifact and deployment identity

The build emitted:

| Artifact | Raw size | Gzip/transfer evidence |
| --- | ---: | ---: |
| Application JS | 11,254 B | 4.95 KB build gzip / 5,003 B Lighthouse transfer |
| CSS | 6,635 B | 2.24 KB build gzip / 2,287 B Lighthouse transfer |
| Hero WebP | 44,922 B | 44,997 B Lighthouse transfer |
| Total first-load transfer | — | 62,818 B / 7 requests |

The JS, CSS, font (0 B), and hero-image budgets pass. SHA-256 comparisons of
local `dist/` and live responses matched for `index.html`, JS, CSS, manifest,
service worker, and hero image. Examples:

- `index.html`: `f2be48f23c2939cfe3220cbf4b88261194f3c3b944c223980aad3471e5358d6b`
- JS: `b15af5392105a4e9b333da3d73821995618b068904fdb25fae8e252d6fff41f1`
- service worker: `443b0458fcf4a3f5176afbc7398e879decb2f023c3e08fe33e1fbc338a817b11`

## End-to-end product exercise

The local production preview and matching live build were exercised with
generated standards-compliant EXIF JPEGs and malformed/unsupported inputs.

| Case | Result |
| --- | --- |
| Real JPEG with Make, Model, all 3 dates and `OffsetTimeOriginal` | Parsed all fields and preserved the offset in local findings. |
| EXIF fields disagree by 8 hours | Staged a proposal and downloaded JSON plus XMP. |
| File-date offsets +8h and boundary +14h | Staged by default. |
| Boundary +15h | Correctly did not stage. |
| Non-whole offset +1h20m | **Incorrectly rounded and staged as a +1h pattern.** |
| Unsupported PNG | Reported “JPEG EXIF only”; no proposal. |
| Malformed JPEG | Reported no documented capture time without a crash. |
| Select/deselect, group filtering, JSON/XMP downloads | Worked with pointer/programmatic file selection. |
| Refresh after scan | Restored findings and selections from local storage. |
| Corrupt local-storage value | **Uncaught JSON parse error; the app rendered completely blank.** |
| Clear local plan | Worked on desktop; **the control is CSS-hidden at 390px.** |
| 10,000 synthetic EXIF files | Scan/render completed in 11.96s, created 10,000 rows and 3,438,891 B of local storage. |

The exported ledger records only selected repairs, not rejected findings, so it
is not a complete decision audit. Originals were not modified in any test.

### Independent XMP interoperability check

A real conflict with `OffsetTimeOriginal=-04:00` exported this value:

`xmp:CreateDate="2010:11:07 01:30:00-04:00"`

ExifTool `12.76 -validate -warning -XMP:all` returned two warnings:
`Invalid date/time format for XMP:CreateDate` and the same warning for
`XMP:ModifyDate`. More seriously, it read both values as
`2010:11:07 01:30:00:04:00`, losing the minus sign and corrupting timezone
meaning. This fails the brief's “preserve timezone provenance” constraint and
the promise of a portable repair sidecar. The existing unit test only checks
that the XMP contains a label, so it does not detect this.

### Archive-scale export

“Download sidecars” schedules one independent browser download every 150ms.
At 10,000 selected files the final download is scheduled after 1,499.85 seconds
(about 25 minutes), with no ZIP/bundle or directory-preserving export. Two
records at `folder-a/IMG_0001.jpg` and `folder-b/IMG_0001.jpg` both requested
the identical download name `IMG_0001.xmp`; browser collision renaming breaks
the sidecar-to-original filename association. This is not safe or useful for
the brief's large inherited archives.

## Browser, accessibility and responsive QA

- Tested live and local at 1440×900 and 390×844; no horizontal overflow, console
  error, or page error on valid state. Visual hierarchy is clear and matches
  the recorded notebook thesis.
- Landing pages have `lang="en"`, a descriptive title, one `h1`, one `main`,
  useful image alt text, and a skip link. Privacy and terms pages also passed
  their semantic smoke tests.
- Axe: no serious or critical findings on empty or populated screens. The
  populated workspace has one moderate
  `landmark-complementary-is-top-level` issue (the `aside` is nested in a
  labelled section).
- Keyboard-only: Tab moves from skip link through header/footer links but never
  reaches either “Choose photo folder” or “Choose files”. Both are labels with
  `tabIndex=-1` around `display:none` inputs. A keyboard user cannot begin the
  core workflow. Focus uses the browser's default 1px outline rather than the
  specified designed focus treatment.
- Multiple controls miss 44×44 CSS px, including 20×20 selection checkboxes,
  the 25px-high clear action, and small navigation/footer links.
- At 390px the clear action is `display:none`, contradicting the privacy page's
  instruction to use it and preventing in-app deletion of persisted filenames
  and findings on mobile.
- `prefers-reduced-motion: reduce` produced 0s transition durations.

## PWA, offline and update behavior

- Chromium reported no installability errors. Manifest name, standalone mode,
  versioned start URL, 192px icon, and 512px any/maskable icon were valid.
- Service worker installed and controlled the page; cache
  `exif-clock-repair-v2` was present. An explicit `registration.update()`
  completed, with the current worker remaining activated. Source includes
  `skipWaiting`, `clients.claim`, and an update-ready toast path.
- After `context.setOffline(true)`, a live reload succeeded and restored a saved
  one-record plan from local storage with no errors.
- The manifest is served as `application/octet-stream` rather than a manifest
  JSON MIME type, although Chromium still parsed it without errors.
- Every live response, including content-hashed JS/CSS and the hero, uses
  `Cache-Control: public, must-revalidate, max-age=30`; immutable assets are not
  given the required long-lived immutable browser caching.
- The worker never deletes old versioned caches during activation.

## Privacy, network and response policies

- Request capture on both viewport sizes found no third-party requests,
  analytics, trackers, CDN fonts/scripts, product APIs, or photo uploads.
- Source search found only same-origin service-worker fetches. Findings and
  selections are stored locally; photo bytes are not persisted.
- `/privacy/`, `/terms/`, and MIT `LICENSE` exist. Privacy text accurately
  describes local storage on desktop, but its promised clear control is hidden
  on mobile.
- HTTPS redirect, HSTS, `nosniff`, strict-origin referrer policy, GET/HEAD/OPTIONS
  method restriction, and TRACE/POST 405 behavior passed.
- Responses omit Content-Security-Policy, framing protection
  (`frame-ancestors`/`X-Frame-Options`), and Permissions-Policy.
- This is a static product with no application API or billing/unlock endpoint,
  so API rate-limit burst testing and `429 Retry-After` are not applicable.
  Sign-in/Entra testing is also not applicable.
- The researched brief calls for one-time monetization and the supplied paid
  unlock contract, but the candidate has no price, checkout link, license
  capture/restore/verification, or merchant/refund copy.

## Lighthouse (live mobile)

Lighthouse 12.6.0 at `2026-08-28T07:29:29Z`:

- Performance: **98**
- Accessibility: **100**
- Best practices: **100**
- FCP 0.8s, LCP 1.1s, Speed Index 0.9s, TBT 110ms, CLS 0.062

The PWA category is no longer available in this Lighthouse version, so
installability and offline behavior were tested directly through Chromium.

## Defects by severity

### High — release blockers

1. **Timezone-bearing XMP is not interoperable and can corrupt negative offset
   meaning.** Reproduced with a real `-04:00` EXIF offset and ExifTool warnings/
   damaged readback. Violates the core safety and provenance contract.
2. **Core file selection is unreachable by keyboard.** Neither scan action is
   in sequential focus order, so keyboard-only users cannot use the product.
3. **Bulk sidecar export is unsafe/impractical for the required archive scale.**
   Ten thousand downloads take about 25 minutes to schedule, and duplicate
   source basenames request colliding sidecar names with no folder mapping.

### Medium

1. A +1h20m delta is rounded to and selected as a “+1h pattern”, despite the
   product claiming whole-hour evidence.
2. Corrupt local storage causes an uncaught exception and blank page with no
   recovery UI.
3. “Clear local plan” is hidden on 390px mobile, leaving no in-app privacy
   recovery path.
4. Selection checkboxes, clear action and several links miss the 44px target
   contract; focus treatment is only the browser default.
5. The populated workspace has one moderate Axe landmark violation.
6. One-time Sociobot paid unlock described by the brief/work order is absent.
7. Locked development tooling has critical/high/moderate known vulnerabilities.

### Low / hardening

1. Hashed assets receive only 30-second revalidation caching, not immutable
   caching; old service-worker caches are not removed.
2. CSP, framing protection and Permissions-Policy are absent.
3. Manifest MIME type is `application/octet-stream`.
4. Singular result copy says “1 files” and “1 sidecars”.
5. The illustration's figure-level drop shadow visually duplicates the caption.

## Required next verification

Correct and standards-normalize XMP date values (including positive, negative,
missing and unusual offsets), add import/readback tests with an independent
metadata tool, replace per-file downloads with a collision-safe bundled export,
make scan and clear actions fully keyboard/mobile accessible, and add guarded
local-state recovery. Re-run the full clean install/build/test, real EXIF
end-to-end cases, Axe/keyboard/mobile suite, 10k export, live identity, and
offline/update checks before release.
