# Exif Clock Repair

Exif Clock Repair is a private, browser-based repair bench for people sorting a
family-photo archive with inconsistent capture clocks. It scans documented JPEG
EXIF date fields locally, groups conflicts and whole-hour clues, and exports a
reversible XMP/JSON repair plan plus an audit ledger. It never uploads images or
modifies originals.

Live: https://exif-clock-repair.sociobot.in

## What it supports

- Local JPEG EXIF reading: `DateTimeOriginal`, `DateTimeDigitized` (reported as
  Create), `DateTime`, camera make/model, and `OffsetTimeOriginal` when present.
- A cautious comparison of date fields and file dates. File dates are only a
  pattern clue, never treated as evidence on their own.
- Portable XMP sidecars and a JSON repair ledger. Sidecars retain the original
  capture value and source offset; this v1 intentionally has no EXIF-writing
  button.
- Offline app shell and browser-local repair-plan persistence.

PNG, HEIC and TIFF can be chosen but are clearly reported as unsupported in this
v1 rather than guessed at. Keep a backup and spot-check suggested patterns
before importing any sidecars into another metadata tool.

## Develop and verify

```sh
npm install
npm run dev
npm test
npm run build # produces ./dist/index.html
```

Deploy `dist/` as a static site with history fallback if you want `/privacy` and
`/terms` available without trailing slashes. The included pages also work as
physical static directories.

## Privacy and license

The app makes no network request for photo data and includes no analytics or
third-party runtime assets. Findings are stored in browser local storage only
until cleared. See `/privacy/` and `/terms/`. Source is available under the MIT
license in [LICENSE](LICENSE).
