# Handoff — Exif Clock Repair v1

## Delivered

- Vite + vanilla TypeScript offline PWA built to `dist/`.
- A local JPEG EXIF scanner for documented date fields, camera identity and
  `OffsetTimeOriginal`; unsupported formats are stated plainly.
- Pattern grouping for field disagreements and plausible whole-hour file-date
  offsets, with per-file selection before export.
- Reversible JSON repair ledger and individual XMP sidecar downloads. The app
  does not mutate EXIF or pixels; original timezone provenance is retained.
- Browser-local plan persistence, clear action, offline fallback, install
  manifest, service worker app-shell precache and update toast.
- Mobile/keyboard responsive handwritten-lab-notebook UI, privacy/terms pages,
  MIT license, self-hosted/no-CDN implementation, and original generated hero
  asset.

## Verification

- `npm test` — 4 tests passed (EXIF APP1 extraction, local time formatting,
  grouping and ledger/XMP reversibility).
- `npm run build` — passed; `dist/index.html` is at the static deploy root.
  Initial application JS is 11.23 KB (4.95 KB gzip), CSS 6.64 KB (2.24 KB
  gzip), and hero WebP is 44 KB.
- Playwright Chromium at 390×844 — page has one `h1`, one `main`, expected
  title, no browser console errors, and axe returned zero violations.
- Playwright offline reload after service-worker activation — passed; app shell
  title remained available offline.

## Known gaps / next steps

- Browser-native, reliable EXIF parsing is intentionally limited to JPEG in
  this v1. TIFF/HEIC support needs format-specific parsers and should retain the
  same source-field/provenance model.
- The browser File API cannot safely overwrite a selected archive in a
  cross-browser way, so optional EXIF mutation is deliberately deferred. Use
  the XMP sidecars and ledger with a backed-up external metadata workflow.
- Suggestions are evidence to review, not a claim that file timestamps are
  correct; users should spot-check every group.
