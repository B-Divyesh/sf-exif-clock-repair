import './style.css';
import { classify, createLedger, createXmp, formatFileTime, groupKey, parseJpegExif, type PhotoRecord } from './lib';

const storageKey = 'exif-clock-repair:last-plan';
let records: PhotoRecord[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
let status = records.length ? `Restored ${records.length} previous findings. Files are never retained.` : 'Choose a folder or a few image files. Nothing leaves this device.';
let filter = 'all';

const escape = (s: string) => s.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]!));
const app = document.querySelector<HTMLDivElement>('#app')!;
function stamp(text: string) { return `<span class="stamp">${escape(text)}</span>`; }
function download(name: string, body: string, type = 'application/json') { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([body], { type })), download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function save() { localStorage.setItem(storageKey, JSON.stringify(records)); }
function selected() { return records.filter(r => r.selected && r.candidate); }

function render() {
  const proposed = selected(); const groups = new Map<string, PhotoRecord[]>();
  records.forEach(r => { const key = groupKey(r); groups.set(key, [...(groups.get(key) || []), r]); });
  const visible = filter === 'all' ? records : groups.get(filter) || [];
  app.innerHTML = `
    <header class="masthead"><a class="brand" href="/" aria-label="Exif Clock Repair home"><span aria-hidden="true">✣</span> Exif Clock Repair</a><nav aria-label="Secondary"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></header>
    <main id="main">
      <section class="hero ${records.length ? 'compact' : ''}" aria-labelledby="page-title">
        <div class="hero-copy"><p class="eyebrow">Private photo archive utility</p><h1 id="page-title">Put the story back in order.</h1><p class="lede">Inspect capture clocks, spot recurring offsets, and write a reversible repair plan — before anything touches an original.</p>
          <div class="actions"><label class="button primary" for="folder">Choose photo folder<input id="folder" type="file" multiple accept="image/jpeg,image/tiff,image/heic,image/png" webkitdirectory directory /></label><label class="button quiet" for="files">Choose files<input id="files" type="file" multiple accept="image/jpeg,image/tiff,image/heic,image/png" /></label></div>
          <p id="status" class="status" aria-live="polite">${escape(status)}</p>
        </div><figure class="hero-art"><img src="/notebook-bench.webp" width="1200" height="800" fetchpriority="high" decoding="async" alt="A magnifying glass and photographic contact sheet on an archival workbench." /><figcaption>Original AI-generated illustration</figcaption></figure>
      </section>
      ${records.length ? `<section class="workspace" aria-labelledby="findings-title">
        <div class="section-head"><div><p class="eyebrow">Scan ledger</p><h2 id="findings-title">${records.length} files examined · ${proposed.length} sidecars ready</h2></div><div class="export-actions"><button id="export-json" class="button quiet">Export repair ledger</button><button id="export-xmp" class="button primary" ${proposed.length ? '' : 'disabled'}>Download sidecars</button></div></div>
        <aside class="method"><strong>How to read this:</strong> a proposal is a hypothesis, not a write. We compare documented EXIF fields and use the file date only to reveal whole-hour patterns. Spot-check before exporting.</aside>
        <div class="finding-layout"><section class="groups" aria-label="Pattern groups"><h3>Patterns found</h3><button class="group ${filter === 'all' ? 'active' : ''}" data-filter="all"><span>All findings</span><b>${records.length}</b></button>${[...groups].map(([name, set]) => `<button class="group ${filter === name ? 'active' : ''}" data-filter="${escape(name)}"><span>${escape(name)}</span><b>${set.length}</b></button>`).join('')}<button class="text-button" id="clear">Clear local plan</button></section>
        <section class="entries" aria-label="Photo findings">${visible.map((r, i) => `<article class="entry"><label class="check"><input type="checkbox" data-select="${escape(r.id)}" ${r.selected ? 'checked' : ''} ${r.candidate ? '' : 'disabled'} /><span class="visually-hidden">Include ${escape(r.name)} in repair plan</span></label><div class="entry-main"><h3>${escape(r.name)}</h3><p>${escape(r.path)} · ${escape(r.camera)} ${r.offset ? `· original offset ${escape(r.offset)}` : ''}</p><dl><div><dt>Capture</dt><dd>${escape(r.dates.DateTimeOriginal || '—')}</dd></div><div><dt>Create</dt><dd>${escape(r.dates.CreateDate || '—')}</dd></div><div><dt>File date</dt><dd>${escape(r.modified)}</dd></div></dl></div><div class="entry-result">${stamp(r.issue)}<p>${r.candidate ? `Sidecar will preserve <strong>${escape(r.candidate)}</strong>` : 'No sidecar proposed'}</p></div></article>`).join('')}</section></div>
      </section>` : `<section class="empty-note"><div class="index">01</div><div><h2>Start with a copy of the archive</h2><p>Exif Clock Repair reads JPEG EXIF in this version. It records only filenames and findings in this browser; image pixels and originals stay where they are.</p></div><ol><li>Choose a folder or a selection of JPEGs.</li><li>Review grouped conflicts and whole-hour clues.</li><li>Export JSON/XMP sidecars and an audit ledger.</li></ol></section>`}
      <section class="promise"><div class="index">02</div><div><h2>What this tool will and won’t do</h2><p><strong>It will:</strong> read documented JPEG EXIF timestamp fields, show their disagreement, retain source timezone offsets, and generate portable XMP/JSON sidecars.</p><p><strong>It won’t:</strong> upload photos, rewrite image pixels, mutate EXIF, guess ambiguous dates, or use the file date as proof.</p></div></section>
    </main><footer><span>Made for careful family archives.</span><span>Local-first · no analytics · <a href="/privacy/">privacy</a></span></footer><div id="update" class="toast" hidden>Update ready. <button id="reload">Reload</button></div>`;
  bind();
}

async function scan(files: FileList | File[]) {
  const list = Array.from(files); if (!list.length) return;
  status = `Reading ${list.length} file${list.length === 1 ? '' : 's'} locally…`; render();
  const out: PhotoRecord[] = [];
  for (const [index, file] of list.entries()) {
    let dates: PhotoRecord['dates'] = {}; let camera = 'Unsupported format'; let offset: string | undefined;
    if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) ({ dates, camera, offset } = parseJpegExif(await file.arrayBuffer()));
    else camera = 'Not scanned — JPEG EXIF only';
    const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    out.push(classify({ id: `${Date.now()}-${index}-${file.name}`, name: file.name, path, type: file.type, size: file.size, modified: formatFileTime(file.lastModified), camera, dates, offset }));
  }
  records = out; filter = 'all'; save(); status = `Scan complete. ${selected().length} reversible sidecar proposal${selected().length === 1 ? '' : 's'} staged.`; render();
}
function bind() {
  document.querySelector<HTMLInputElement>('#folder')?.addEventListener('change', e => scan((e.currentTarget as HTMLInputElement).files!));
  document.querySelector<HTMLInputElement>('#files')?.addEventListener('change', e => scan((e.currentTarget as HTMLInputElement).files!));
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter!; render(); }));
  document.querySelectorAll<HTMLInputElement>('[data-select]').forEach(c => c.addEventListener('change', () => { const r = records.find(x => x.id === c.dataset.select); if (r) r.selected = c.checked; save(); render(); }));
  document.querySelector('#clear')?.addEventListener('click', () => { records = []; localStorage.removeItem(storageKey); status = 'Local repair plan cleared. Original files were never changed.'; render(); });
  document.querySelector('#export-json')?.addEventListener('click', () => download('exif-clock-repair-ledger.json', JSON.stringify(createLedger(selected()), null, 2)));
  document.querySelector('#export-xmp')?.addEventListener('click', () => { selected().forEach((r, i) => setTimeout(() => download(`${r.name.replace(/\.[^.]+$/, '')}.xmp`, createXmp(r), 'application/rdf+xml'), i * 150)); });
  document.querySelector('#reload')?.addEventListener('click', () => location.reload());
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').then(reg => { reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) document.querySelector('#update')?.removeAttribute('hidden'); }); }); }).catch(() => undefined);
render();
