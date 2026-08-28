# Exif Clock Repair — visual thesis

## Direction: handwritten lab notebook

This is a careful repair bench for family memories, not a photo manager. The
interface borrows the calm evidence-gathering vocabulary of a field notebook:
warm paper, indigo ink, clipped findings, red pencil warnings, and a faint
measure-grid. It makes a potentially scary bulk edit feel inspectable and
reversible. The UI is deliberately single-mode light; the warm paper is part
of the archival metaphor and is painted explicitly in every state.

## Tokens

| Role | Value | Reason |
| --- | --- | --- |
| paper | `#f6f0df` | aged, high-key notebook ground |
| paper-deep | `#e8dfca` | inset ledger areas |
| ink | `#172a45` | dependable blue-black, 12.5:1 on paper |
| muted | `#56627a` | explanatory marginalia, 5.5:1 on paper |
| indigo | `#34559a` | active tools and links |
| pencil | `#a63e31` | conflicts and items needing attention |
| amber | `#8a5900` | warnings without alarmism |
| green | `#176b52` | staged/reversible confirmation |
| line | `#b9b09b` | rules, stamps, grid marks |

Typography uses a self-hosted local-safe serif stack (`Georgia`, `Cambria`) for
the notebook's headings and a system sans stack (`Inter`-like `ui-sans-serif`)
for metadata, controls and dense tables. There are no network font requests.
Numbers use tabular figures. The spacing unit is 4px, with 8/12/16/24/32/48px
steps; reading measure stays below 72 characters.

## Interaction and motion

The scan button is the clear, stamped primary action. Findings arrive as
indexed notebook rows, while a selected repair reads like a margin annotation
beside the original evidence. Actions use 180ms opacity/transform transitions;
with `prefers-reduced-motion`, all transitions become instant. No decorative
looping animation is used. Controls have 44px targets, a visible indigo focus
ring, and text labels in addition to marks.

## Asset plan and provenance

The hero uses one original raster illustration: a top-down archival workbench
with a contact sheet, calendar ruler, pencil and magnifier, leaving room for
the product copy. It supports the task rather than pretending this browser app
can see inside a disk.

Prompt sheet: top-down editorial still life, worn cream paper and blue-black
ink, restrained muted vermilion, soft north-window daylight, tactile analogue
materials, quiet forensic care; no people, no text, no watermark, no logos,
no brands, no uncanny symbols.

Generated with the factory Azure image deployment through
`/opt/fleet/lib/gen-image.sh` on 2026-08-28. The selected output and its exact
prompt are stored as `assets/src/notebook-bench.png` and
`assets/src/notebook-bench.prompt.json`; it is original generated artwork for
this product. It will be converted to WebP below 300 KB before shipping.

The footer discloses that the notebook illustration is AI-generated. All
functional icons are authored as inline SVG/CSS and do not depend on a third
party icon library.
