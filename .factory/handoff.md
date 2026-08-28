# Handoff — independent verification

## Result

**FAIL — do not release candidate
`5ecfa943136ac8dfbe8b5ae751f31b1c3a92c5e4`.**

The live site at `https://exif-clock-repair.sociobot.in/` was tested on
2026-08-28 and byte-for-byte matches the candidate production build. The prior
deployment concern is resolved; the rejection is based on fresh product
evidence. Full commands, hashes, cases, measurements, and severity details are
in `.factory/verification.md`.

## What passed

- Clean `npm ci`, 4/4 unit tests, TypeScript check, and exact Vite production
  build completed; `dist/` was produced.
- Live Lighthouse mobile: 98 performance, 100 accessibility, 100 best
  practices; LCP 1.1s, TBT 110ms, CLS 0.062.
- Candidate/live hashes match for HTML, JS, CSS, manifest, service worker, and
  hero image.
- Supported JPEG fields, camera identity, positive/negative EXIF offset reading,
  grouped findings, persistence, JSON download, and unsupported/malformed-file
  handling were exercised.
- No third-party requests, analytics, upload, CDN asset, console error, or page
  error occurred in normal use.
- PWA installability, service-worker control/update polling, and offline reload
  with restored local state passed.
- Desktop and 390px layouts have no horizontal overflow; reduced motion is
  respected; Axe found no serious/critical issues.

## Release blockers

1. A real conflict carrying `OffsetTimeOriginal=-04:00` produces invalid XMP
   date values. ExifTool reports invalid `CreateDate`/`ModifyDate` warnings and
   reads the value with the negative timezone sign lost. This violates the
   core timezone-provenance and portable-sidecar promises.
2. Keyboard Tab cannot reach “Choose photo folder” or “Choose files”, making
   the core workflow unavailable to keyboard-only users.
3. Sidecars are emitted as one download every 150ms. A 10k selection takes
   about 25 minutes to schedule, and identical basenames in different folders
   request identical `.xmp` names, breaking safe source association.

## Other material defects

- +1h20m is rounded and selected as a misleading whole-hour +1h pattern.
- Corrupt persisted JSON blanks the app with an uncaught exception.
- The privacy clear action is hidden at 390px; multiple targets are below 44px.
- Populated view has one moderate Axe landmark issue.
- Required one-time Sociobot paid unlock is absent.
- npm audit reports critical/high/moderate development-tool vulnerabilities.
- Hashed assets have only 30-second caching; CSP/framing/Permissions-Policy are
  absent; manifest MIME is generic octet-stream.

## How to reproduce

```sh
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Use a JPEG whose EXIF fields disagree and whose `OffsetTimeOriginal` is a
negative offset, export its XMP, then run:

```sh
exiftool -G1 -a -s -validate -warning -XMP:all exported.xmp
```

Tab from a fresh landing page to reproduce the unreachable scan controls. Scan
at 390px to see that “Clear local plan” is absent. Seed or scan two selected
records with the same basename in different folders to observe identical
download names.

## Next steps

Normalize XMP values to interoperable XMP date syntax and independently test
readback for all timezone cases. Bundle exports (for example, a ZIP) with
collision-safe path mapping and one user-initiated download. Restore keyboard
and mobile access to scan/clear controls, validate persisted state defensively,
and require true whole-hour evidence. Then rerun every check recorded in
`.factory/verification.md` against the new commit and deployed artifact.
