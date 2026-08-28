# Demo sandbox

Open `/demo` or select **Try it with sample data** on the landing page.

The demo immediately loads a three-photo family archive: an eight-hour file
clock pattern, an EXIF-field conflict, and a photo with no repair selected. It
shows the same inspection, selection, JSON ledger, and XMP ZIP workflow as the
real workspace.

Demo findings use only `localStorage` key
`demo:exif-clock-repair:last-plan`. Real findings use
`exif-clock-repair:last-plan`; the demo never reads or writes that key. The
banner says “Demo — sample data, nothing is saved,” includes **Reset demo**, and
links to **Start for real**. Reset discards demo changes and loads the original
sample records. Starting for real navigates to `/`, leaving the demo namespace
behind.

The service worker precaches both `/` and `/demo/`, so the sample plan can be
reloaded offline after the first visit.
