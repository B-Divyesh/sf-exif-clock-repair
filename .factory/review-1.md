# Review 1 — Repair photo capture clocks before sorting

**Verdict: PASS — 0 findings; 0 untested public claims.**

Reviewed 2026-09-05 at <https://exif-clock-repair.sociobot.in>.

Implementation candidate: `f03779acb690ecd4500c09192b65c28b6f819704`.
Review/documentation checkout: `663a2cec1638d32742d43341b634a60c8e746912`.
The later diff changes only claims, tests, and factory reports; it contains no
shipped product source. Fresh local JavaScript and CSS hashes match live.

## First screen and demo

Fresh cache-free desktop (1440×960) and phone (390×844) visits were checked
before scrolling. Both stated the job, “Repair photo capture clocks before
sorting”; the audience, people sorting a family photo archive with dates changed
by cameras, computers, or time zones; and the visible first action, **Try it
with sample data**, with “See a three-photo repair plan right away.” Both showed
the privacy, offline, and free facts.

The action opened `/demo` with “3 files examined · 2 sidecars ready” and a
persistent “Demo — sample data, nothing is saved” label with **Reset demo** and
**Start for real**. A pre-seeded real plan remained unchanged after demo entry
and reset; reset restored the sample and removed the demo storage entry. No
console or page errors occurred.

## Claims

After `npm ci`, every declared command was run independently. Each passed in
desktop and 390px mobile Chromium (2/2).

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

Landing, README, privacy, and terms copy was cross-checked against the
manifest. Every public reliance claim has one observable demo-entry test.
Untested public claims: **0**.

## Checks

- `npm audit --audit-level=low`: PASS, zero vulnerabilities.
- `npm test`: PASS, 12/12; `npm run lint` and `npm run typecheck`: PASS.
- `npm run verify:xmp`: PASS for `-04:00`, `+05:30`, `+12:45`, and no offset.
  ExifTool was absent from the fresh container, then installed as the
  README-documented prerequisite before measurement.
- `npm run build`: PASS and produces `dist/index.html`; JS is 18,175 bytes raw
  / 7.13 KiB gzip and CSS is 8,409 bytes raw / 2.56 KiB gzip.
- `npm run test:e2e -- --reporter=dot`: PASS, 34/34 local.
- `PLAYWRIGHT_BASE_URL=https://exif-clock-repair.sociobot.in npm run test:e2e -- --reporter=dot`:
  PASS, 34/34 live.

The complete suites cover valid, malformed, unsupported, boundary, recovery,
keyboard, focus, 200% text, reduced-motion, offline, privacy, legal, and 404
paths. Playwright Axe found no serious or critical violations. Keyboard focus
reaches the file chooser, shows the focus ring, and opens it with Enter.

## Live site

`/`, `/demo`, `/privacy/`, `/terms/`, and `/offline.html` return 200 with
route titles, one `h1`, and one `main`; landing-page links resolve. The styled
`/does-not-exist` page deliberately returns HTTP 404, as expected. Manifest,
robots, and sitemap return 200. GET/HEAD return 200, OPTIONS 204, POST/TRACE
405. Live headers provide CSP with `frame-ancestors 'none'`, `nosniff`, strict
referrer policy, permissions policy, and `X-Frame-Options: DENY`; hashed assets
are immutable cached.

The full privacy and offline flows recorded no third-party runtime requests,
XHR, fetch, beacon, or cookies. Photo bytes are not persisted; plan metadata
remains until cleared. The worker restores the populated demo offline after its
first visit. This static PWA has no backend, tenant, account, payment, or
server-side product state, so tenant isolation, restart persistence, and
429/`Retry-After` checks do not apply.

| Artifact | SHA-256 |
| --- | --- |
| `assets/main-CEafEp47.js` | `54df2fa79e0efe4e4dbae5ab1ac4322d732bd35a02367ace3943785b0a467a4c` |
| `assets/main-DZBJ1pR1.css` | `ea52ccb1e88a4256fd400d684e677da906a45ec7e2e5ab5a85b7e82c5849390d` |

## Earlier findings

| Earlier finding(s) | Current disposition |
| --- | --- |
| Invalid timezone XMP | Fixed: independent ExifTool passes negative, positive, unusual, and absent offsets. |
| Keyboard-unreachable controls, default focus, small targets | Fixed: full desktop/mobile keyboard, focus, and target tests pass. |
| Per-file sidecar collision/scale failure | Fixed: 10,000-sidecar unit test and directory-preserving ZIP claim pass. |
| Rounded +1h20m pattern | Fixed: accepts exact +8/+14, rejects +15 and +1h20m. |
| Corrupt state blank page and hidden mobile clear | Fixed: announced recovery and mobile clear tests pass. |
| Axe landmark issue | Fixed: no serious or critical Axe violations. |
| Missing/broken paid checkout | Retired honestly: no paid tier or purchase claim remains; the free core is tested. |
| Vulnerable tooling | Fixed: clean audit reports zero vulnerabilities. |
| Cache, old worker, CSP/frame/policy, and manifest MIME defects | Fixed: current header/cache/worker/manifest checks pass. |
| Singular count and duplicate caption styling | Fixed: plural tests pass; current render has no duplicate caption treatment. |
| Missing claims/demo/plain first screen/docs | Fixed: ten claims pass and the direct fresh-device demo check passes. |
| Offline CSP, 200% overflow, routes/metadata/legal/404 gaps | Fixed: current live and full-suite checks pass. |
| Unlisted JPEG/storage/conflict/original/no-analytics claims | Fixed: final five claim commands cover them and pass. |

## Result

**PASS — 0 findings; 0 untested public claims.**
