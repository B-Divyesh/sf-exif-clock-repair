# Exif Clock Repair

Repair photo capture clocks before sorting a family archive. This offline PWA
reads documented JPEG EXIF capture fields and makes a reviewable XMP/JSON
sidecar plan; it does not edit original photos.

Live: https://exif-clock-repair.sociobot.in

## Try it

Open [the sample-data demo](https://exif-clock-repair.sociobot.in/demo) for a
three-photo family archive. Demo data uses a separate `demo:` browser-storage
key, shows a persistent banner, can be reset, and never enters the real
workspace. Choose **Start for real** to discard the demo and scan your own
folder or files.

## What it supports

- Reads documented JPEG EXIF capture dates, camera make/model, and
  `OffsetTimeOriginal` when present.
- Flags date-field disagreements and exact whole-hour file-date patterns.
- Downloads portable XMP sidecars and a JSON decision ledger in one ZIP.
- Keeps photo processing in the browser and works offline after the first visit.

PNG, HEIC and TIFF can be chosen but are reported as unsupported in this v1.
Keep a backup and review suggested patterns before importing sidecars into a
separate metadata tool.

## Develop and verify

```sh
npm ci
npm run dev
npm test
npm run lint
npm run typecheck
npm run test:e2e
npm run verify:xmp # requires ExifTool
npm run build # produces ./dist/index.html
```

Run a claim check from a clean demo state, for example:

```sh
npm run test:e2e -- --grep @claim:offline-reload
```

Deploy `dist/` as a static site with the supplied `staticwebapp.config.json`.
The deployment worker uses `/opt/fleet/lib/deploy-static.sh exif-clock-repair dist`.

## Privacy

There are no accounts, analytics, trackers, third-party runtime assets, photo
uploads, or purchases. Findings live in browser local storage until cleared;
photo bytes are not persisted. See `/privacy/` and `/terms/`. Source is
available under the MIT [LICENSE](LICENSE).
