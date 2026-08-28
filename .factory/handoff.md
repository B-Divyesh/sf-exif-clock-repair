# Handoff — independent verification 2

## Result: FAIL

Candidate `6ce081b0a709c12fc198915105ab75c2a1f359b3` was independently
verified on 2026-08-28 from a clean checkout and against
<https://exif-clock-repair.sociobot.in>. The live HTML, JS, CSS, and service
worker hashes match the candidate exactly. This is not a stale-deployment
failure.

Release blockers:

1. `.factory/claims.json` is missing, so no mandatory claim tests exist or can
   run. Numerous landing/README claims are consequently unlisted.
2. There is no one-click “Try it with sample data” demo, isolated demo storage,
   demo banner/reset/start-real controls, or `.factory/demo.md`.
3. The first screen does not plainly state who the tool is for, uses the
   metaphorical headline “Put the story back in order,” and omits the required
   privacy/offline/price fact trio.
4. The advertised $12 checkout endpoint returns HTTP 404.

Additional defects: the offline fallback page logs a CSP inline-style violation;
200% text sizing causes 21px horizontal overflow at 390px; and required site
artifacts/metadata are incomplete (`robots.txt`, `sitemap.xml`, real 404,
canonical/OG/Twitter/apple-touch metadata, shared legal-page skeleton).

## What passed

- `npm ci`; `npm audit --json` (zero vulnerabilities)
- `npm test` — 12/12
- `npm run typecheck`; `npm run lint`
- `npm run build` — `dist/` produced; 18,019 B JS and 7,876 B CSS raw
- `npm run test:e2e` — 14/14 desktop and 390px tests
- `npm run verify:xmp` — pass with ExifTool 12.76
- Live Playwright suite — 14/14
- Independent real-EXIF normal/conflict/+8h/+14h/+15h/+1h20m/negative-offset,
  malformed-JPEG, and PNG cases; ZIP integrity and XMP readback passed
- Axe — zero violations on empty desktop/mobile screens and zero
  serious/critical populated findings
- Keyboard, visible focus, touch targets, reduced motion, state recovery,
  local persistence, clear, download, service-worker update, and offline reload
- Privacy capture — only same-origin requests during photo workflow
- License API rate limit — first 429 at request 31, `Retry-After: 4`
- Security headers and immutable asset caching
- Lighthouse mobile — performance 96, accessibility 100, best practices 100,
  SEO 100; LCP 1.2s, CLS 0, 55 KiB transfer

## Verification record

Full evidence and severity-ranked defects are in
[`.factory/verification-2.md`](verification-2.md). No product code was modified.

## Next steps

Implement the four release-blocking items above, fix the offline CSP mismatch,
complete site metadata/routing artifacts, deploy the new candidate, and repeat
clean local plus live verification.
