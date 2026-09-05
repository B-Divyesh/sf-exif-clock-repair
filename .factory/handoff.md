# Handoff — independent verification 4

## Result

PASS. Independent QA reviewed implementation
`f03779acb690ecd4500c09192b65c28b6f819704` at
<https://exif-clock-repair.sociobot.in>. Documentation and final test coverage
are at `13bdd9212a0a362a24d801bfa0a8fb35b7368e2c`. The later commit changes
only claims/test/report material, not shipped product source. There are zero
findings and zero untested public claims.

## What was verified

- Fresh desktop and phone visits identify the job, audience, and first action
  before scrolling. One-click sample data opens a populated isolated workspace
  with the persistent resettable demo label.
- All ten declared claim commands passed independently (desktop and 390px
  mobile); full local and live Playwright suites passed 34/34 each.
- `npm ci`, audit, 12 unit tests, lint, typecheck, ExifTool XMP verification,
  and production build passed in a fresh clone. `dist/` is produced.
- The app handles valid JPEG metadata, unsupported/malformed files, exact and
  boundary offsets, corrupt saved state, keyboard, reduced motion, 200% text,
  XMP/ledger exports, original-file safety, browser-only storage, and offline
  demo reload.
- Live route/link/404/title/legal/header/security checks pass. The live build
  exactly matches the fresh local artifact hashes. Playwright Axe has no
  serious or critical issues.

## How to run

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run verify:xmp # install ExifTool first
npm run test:e2e
npm run build
```

For every visitor-facing claim, run the command listed in
`.factory/claims.json`. For live regression:

```sh
PLAYWRIGHT_BASE_URL=https://exif-clock-repair.sociobot.in npm run test:e2e
```

## Notes

Fresh mobile Lighthouse measured 99 performance, 100 accessibility, 100 best
practices, and 100 SEO (LCP 1.1 s; CLS 0.026; 65 KiB transfer), meeting the
required gate. The product is a static PWA with no backend, tenant, account,
or payment workflow, so backend isolation, restart, and rate-limit checks do
not apply. No product-code changes were made during this verification.

Full evidence is in `.factory/verification-4.md`.
