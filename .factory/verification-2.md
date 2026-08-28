# Independent verification 2 — Exif Clock Repair

**Verdict: FAIL**

Candidate `6ce081b0a709c12fc198915105ab75c2a1f359b3` was tested from a
clean checkout on 2026-08-28. The deployed product at
<https://exif-clock-repair.sociobot.in> is byte-for-byte identical to the
candidate production build. This is not a stale or deployment-only result.

The repaired core workflow works and the defects in the first verification are
fixed. Release is nevertheless blocked because the mandatory claims manifest
is absent, there is no one-click sample-data demo, the first screen does not
plainly identify the intended user, and the advertised paid checkout returns
404.

## Mandatory acceptance gates

### Claims: FAIL

`.factory/claims.json` does not exist. This was the first command run from the
clean checkout:

```text
$ cat .factory/claims.json
cat: .factory/claims.json: No such file or directory
```

Therefore there were no declared claim commands to run. A repository search
also found no `@claim:*` tests. This is release-blocking by the supplied claims
contract. The landing page and README contain many unlisted claims, including
offline operation, local-only photo processing, no analytics, timezone-offset
preservation, portable XMP/JSON export, collision-safe folder paths, and a
one-time purchase.

### First-read and demo: FAIL

Cold-opened the live root in a fresh Chromium profile at 1440×900 and 390×844.

- What it does: inspect photo capture clocks, identify recurring offsets, and
  make a reversible sidecar repair plan.
- For whom: the first screen does not say in plain words. “Private photo archive
  utility” names a product category, not the person inheriting and sorting a
  family archive.
- What to click first: “Choose photo folder” appears to be the primary action.
- The headline “Put the story back in order” is metaphorical rather than the job
  in the user's words.
- The required three short facts about privacy, offline use, and price are not
  present on the first screen.
- There is no “Try it with sample data” action at `/`, `/demo`, or `?demo=1`.
  `/demo` merely serves the ordinary empty app. There is no demo banner, reset,
  “Start for real” action, sample archive, or separate demo storage namespace.
- `.factory/demo.md` is absent.

The supplied acceptance contract says either first-screen failure or absence of
the one-click demo fails the candidate; both conditions are present.

## Clean-checkout gates

Environment: Node `22.23.2`, npm `10.9.8`, Playwright `1.58.2`, Chromium
`145.0.7632.6`, Lighthouse `12.6.0`, ExifTool `12.76`.

| Command | Result |
| --- | --- |
| `npm ci` | PASS; 60 packages installed, zero audit findings |
| `npm audit --json` | PASS; zero known vulnerabilities |
| `npm test` | PASS; 12/12 unit tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (`tsc -b`) |
| `npm run build` | PASS; exact production build produced `dist/` |
| `npm run test:e2e` | PASS; 14/14 local desktop/mobile tests |
| `npm run verify:xmp` | PASS after installing its documented ExifTool prerequisite |
| `PLAYWRIGHT_BASE_URL=https://exif-clock-repair.sociobot.in npx playwright test` | PASS; 14/14 live tests |

Production output is comfortably within budget: application JS 18,019 B raw /
7.31 KB gzip, CSS 7,876 B raw / 2.45 KB gzip, and hero WebP 44,922 B.

## Independent end-to-end exercise

I generated real temporary JPEGs with ExifTool, selected them through the live
UI, reviewed proposals, downloaded one ZIP, unzipped it, inspected its complete
ledger, and validated every XMP with ExifTool.

| Input | Observed result |
| --- | --- |
| Three equal EXIF dates and equal file date | No repair selected |
| File date exactly +8h | Selected as a +8h pattern |
| EXIF fields disagree | Selected and explained |
| Exact +14h boundary | Selected |
| +15h boundary | Not selected |
| Non-whole +1h20m delta | Not selected |
| `OffsetTimeOriginal=-04:00` | Offset displayed, ledgered, and preserved in XMP |
| Malformed JPEG | “No documented capture time”; no proposal or crash |
| Unsupported PNG | Clearly reported as JPEG-only; no proposal |

The result was 9 files examined and 4 sidecars ready. There were no page or
console errors and all requests during this photo workflow were same-origin.
The ZIP passed `unzip -t`; its four XMP files and full decision ledger were
present. ExifTool reported `Validate: OK` and read the negative-offset timestamps
back exactly. The 10,000-sidecar unit test completed within its five-second
budget (about 2.1 seconds in this run).

Recovery checks also passed: corrupt saved state is cleared with an announced
next step; saved state survives refresh; clear-plan works at 390px; JSON and ZIP
downloads work; duplicate basenames retain directory paths; and deselected
findings remain in the audit ledger.

## Browser, accessibility, and responsive QA

- Tested live at 1440×900 and 390×844 with fresh contexts.
- Axe found zero violations on the empty live screen at both sizes, hence zero
  serious/critical findings. The populated-state Axe assertions also passed in
  the local and live suites.
- Keyboard focus order reaches the skip link, brand, navigation, both file
  pickers, purchase link, restore disclosure, and footer. Every focused control
  had the designed 3px red outline. Enter opened the folder chooser.
- Touch-size assertions for the mobile clear action and selection controls pass.
- Reduced-motion mode reports zero-duration interface transitions.
- No horizontal overflow occurred at normal 390px sizing. At a simulated 200%
  root text size, the page widened from 390px to 411px around the license section;
  this is a minor responsive-text reflow defect.
- Home, privacy, and terms have `lang`, titles, one `h1`, and `main`. Privacy and
  terms do not use the standard shared header/footer.

## PWA, privacy, requests, and policies

- Manifest metadata and 192/512/maskable icons are valid. Service worker `v4`
  controls the page, precaches full hashed assets, clears older product caches,
  and accepts an explicit update check.
- After the first live load, an offline reload restored a saved repair plan.
- First load and the complete nine-file photo workflow made only same-origin
  requests. No analytics, trackers, CDN fonts/scripts, or photo upload were
  observed. Photo findings are stored only in local storage; photo bytes are
  not persisted.
- `/privacy/`, `/terms/`, and MIT `LICENSE` exist.
- Live headers include HSTS, CSP with `frame-ancestors 'none'`, X-Frame-Options
  DENY, Permissions-Policy, `nosniff`, and strict-origin referrers. GET/HEAD are
  200, OPTIONS is 204, and POST/TRACE are 405. Hashed JS/CSS and the hero use
  one-year immutable caching; the worker and manifest use `no-cache`.
- `/offline.html` emits a CSP console error because its inline `<style>` is
  blocked by the site's `style-src 'self'` policy. The normal cached-app offline
  reload still works.
- The license verification endpoint accepts the production origin and correctly
  reports invalid tokens. A 150-request burst produced 30 HTTP 200 responses,
  then 120 HTTP 429 responses; the first 429 was request 31 and included
  `Retry-After: 4`.
- Sign-in/Entra checks are not applicable; the product has no sign-in.

## Deployment identity and performance

Local/live SHA-256 pairs matched exactly:

- `dist/index.html`: `361b50ffcfbc98573c325608ae1dcaa56099e449ea4ea107f60bf0a62b328bfc`
- JS: `a18cce6ef896fce547f2562ad9f5d3eaa7a54614b6ec32a5c21477c5d77fdd70`
- CSS: `a05f0ff88911fc7115c65aa6ad53e1b2812f02e7fed35a5a4cce058a6aff69ee`
- service worker: `f5fae50f4c86ae60384947878c480804ef3834424de7c4f7ff08ac6fdaeeb8cd`

Live Lighthouse mobile at `2026-08-28T09:49:32Z`: performance 96,
accessibility 100, best practices 100, SEO 100; FCP 1.1s, LCP 1.2s, TBT 220ms,
CLS 0, speed index 1.1s, and 55 KiB total transfer.

## Defects by severity

### High — release blockers

1. **Mandatory claims manifest and claim tests are absent.** There is no
   `.factory/claims.json` and no `@claim:*` test despite numerous product claims.
2. **Mandatory sample-data demo is absent.** There is no one-click demo, demo
   route behavior, sandbox namespace, banner, reset, or documentation.
3. **The cold first screen fails the plain-words contract.** It does not plainly
   identify the target user and lacks the required three facts; its headline is
   metaphorical.
4. **The advertised purchase is broken.** The production “Buy Archive Support”
   URL returns HTTP 404 with `{"error":"enabled factory product","status":404}`.

### Medium

1. `/offline.html` violates the live CSP with a blocked inline style and a
   console error.
2. A 200% text-size simulation creates 21px of horizontal overflow around the
   license section at a 390px viewport.
3. Site-structure deliverables are incomplete: `robots.txt` and `sitemap.xml`
   return 404; unknown routes return the home app with HTTP 200 instead of a
   designed 404; canonical, Open Graph, Twitter-card, and apple-touch metadata
   are absent; legal routes lack the shared header/footer.

### Documentation

1. `.factory/demo.md` and `.factory/copy-audit.md` are absent.

## Release decision

Do not release this candidate. Add the claims inventory and observable demo-only
tests, implement the isolated sample-data demo and first-screen copy contract,
register or remove the broken paid purchase, and repair the offline-page CSP
violation. Then rerun this full verification against the new candidate and live
deployment.
