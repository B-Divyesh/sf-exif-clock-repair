import './style.css';
import { classify, createLedger, createSidecarBundle, formatFileTime, groupKey, parseJpegExif, readStoredState, type PhotoRecord } from './lib';

const isDemo = location.pathname === '/demo' || location.pathname === '/demo/' || new URLSearchParams(location.search).get('demo') === '1';
const isNotFound = !isDemo && location.pathname !== '/';
const storageKey = `${isDemo ? 'demo:' : ''}exif-clock-repair:last-plan`;
const app = document.querySelector<HTMLDivElement>('#app')!;
const stored = readStoredState(localStorage.getItem(storageKey));
let records: PhotoRecord[] = stored.records;
let status = stored.recovered
  ? 'The saved plan was damaged, so it was safely cleared. Choose the original photos to scan again.'
  : records.length ? `Restored ${records.length} previous finding${records.length === 1 ? '' : 's'}. Files are never retained.`
    : isDemo ? 'Sample archive loaded. Review the two proposed sidecars before you export.' : 'Choose a folder or a few image files. Nothing leaves this device.';
let filter = 'all';

function sampleRecords(): PhotoRecord[] {
  return [
    { id: 'demo-kitchen', name: '1998-kitchen-birthday.jpg', path: 'Family archive/1998/1998-kitchen-birthday.jpg', type: 'image/jpeg', size: 2840180, modified: '1998:06:14 21:18:42', camera: 'Canon PowerShot A5', dates: { DateTimeOriginal: '1998:06:14 13:18:42' }, issue: 'File date is +8h from capture time', candidate: '1998:06:14 13:18:42', shiftHours: 8, selected: true },
    { id: 'demo-garden', name: '2003-garden-portrait.jpg', path: 'Family archive/2003/2003-garden-portrait.jpg', type: 'image/jpeg', size: 3124420, modified: '2003:08:02 10:31:04', camera: 'Nikon Coolpix 4300', dates: { DateTimeOriginal: '2003:08:02 09:31:04', CreateDate: '2003:08:02 10:31:04' }, issue: 'EXIF date fields disagree', candidate: '2003:08:02 09:31:04', selected: true },
    { id: 'demo-snow', name: '2007-snow-day.jpg', path: 'Family archive/2007/2007-snow-day.jpg', type: 'image/jpeg', size: 2667391, modified: '2007:12:16 15:40:03', camera: 'Sony DSC-W55', dates: { DateTimeOriginal: '2007:12:16 15:40:03' }, issue: 'No clear repair proposed', candidate: '2007:12:16 15:40:03', selected: false }
  ];
}

if (isDemo && !records.length) records = sampleRecords();
if (stored.recovered) localStorage.removeItem(storageKey);

const escape = (s: string) => s.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]!));
function stamp(text: string) { return `<span class="stamp">${escape(text)}</span>`; }
function download(name: string, body: BlobPart, type = 'application/json') { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([body], { type })), download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function save() { localStorage.setItem(storageKey, JSON.stringify(records)); }
function selected() { return records.filter(r => r.selected && r.candidate); }
const count = (amount: number, singular: string, plural = `${singular}s`) => `${amount} ${amount === 1 ? singular : plural}`;

function render() {
  if (isNotFound) {
    document.title = 'Page not found — Exif Clock Repair';
    app.innerHTML = `<header class="masthead"><a class="brand" href="/" aria-label="Exif Clock Repair home"><span aria-hidden="true">✣</span> Exif Clock Repair</a><nav aria-label="Primary"><a href="/demo">Demo</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></header><main id="main" class="not-found"><p class="eyebrow">404</p><h1>This page is not in the notebook.</h1><p>Use the repair planner or try the sample archive instead.</p><a class="button primary" href="/">Go to the repair planner</a></main><footer><span>Made for careful family archives.</span><span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · Built by Param Factory · v1.1.0</span></footer>`;
    return;
  }
  const proposed = selected(); const groups = new Map<string, PhotoRecord[]>();
  records.forEach(r => { const key = groupKey(r); groups.set(key, [...(groups.get(key) || []), r]); });
  const visible = filter === 'all' ? records : groups.get(filter) || [];
  document.title = isDemo ? 'Demo — Exif Clock Repair' : 'Exif Clock Repair — repair photo capture clocks';
  app.innerHTML = `
    <header class="masthead"><a class="brand" href="/" aria-label="Exif Clock Repair home"><span aria-hidden="true">✣</span> Exif Clock Repair</a><nav aria-label="Primary"><a href="/demo">Demo</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></header>
    ${isDemo ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved.</strong><span>Explore the repair plan without touching your archive.</span><button class="text-button" id="reset-demo" type="button">Reset demo</button><a class="text-button" href="/">Start for real</a></aside>` : ''}
    <main id="main">
      <section class="hero ${records.length ? 'compact' : ''}" aria-labelledby="page-title">
        <div class="hero-copy"><p class="eyebrow">Local repair planner</p><h1 id="page-title">Repair photo capture clocks before sorting.</h1><p class="lede">For people sorting a family photo archive with dates changed by cameras, computers, or time zones.</p>
          <div class="actions"><a class="button primary" href="/demo">Try it with sample data</a><span class="action-note">See a three-photo repair plan right away.</span><button class="button quiet" id="folder-trigger" type="button">Choose photo folder</button><input class="file-input" id="folder" type="file" tabindex="-1" aria-label="Photo folder" multiple accept="image/jpeg,image/tiff,image/heic,image/png" webkitdirectory directory /><button class="button quiet" id="files-trigger" type="button">Choose files</button><input class="file-input" id="files" type="file" tabindex="-1" aria-label="Photo files" multiple accept="image/jpeg,image/tiff,image/heic,image/png" /></div>
          <ul class="facts" aria-label="Product facts"><li>Photos stay on this device.</li><li>Works offline after first visit.</li><li>Free to use. No purchase required.</li></ul><p id="status" class="status" aria-live="polite">${escape(status)}</p>
        </div><figure class="hero-art"><img src="/notebook-bench.webp" width="1200" height="800" fetchpriority="high" decoding="async" alt="A magnifying glass and photographic contact sheet on an archival workbench." /><figcaption>Original AI-generated illustration</figcaption></figure>
      </section>
      ${records.length ? `<section class="workspace" aria-labelledby="findings-title">
        <div class="section-head"><div><p class="eyebrow">Scan ledger</p><h2 id="findings-title">${count(records.length, 'file')} examined · ${count(proposed.length, 'sidecar')} ready</h2></div><div class="export-actions"><button id="export-json" class="button quiet">Export repair ledger</button><button id="export-xmp" class="button primary" ${proposed.length ? '' : 'disabled'}>Download sidecar bundle</button></div></div>
        <div class="method" role="note"><strong>How to read this:</strong> a proposal is a hypothesis, not a write. We compare documented EXIF fields and use the file date only to reveal exact whole-hour patterns. The ZIP keeps each sidecar beside its original folder path. Spot-check before importing.</div>
        <div class="finding-layout"><section class="groups" aria-label="Pattern groups"><h3>Patterns found</h3><button class="group ${filter === 'all' ? 'active' : ''}" data-filter="all"><span>All findings</span><b>${records.length}</b></button>${[...groups].map(([name, set]) => `<button class="group ${filter === name ? 'active' : ''}" data-filter="${escape(name)}"><span>${escape(name)}</span><b>${set.length}</b></button>`).join('')}<button class="text-button" id="clear">Clear local plan</button></section>
        <section class="entries" aria-label="Photo findings">${visible.map(r => `<article class="entry"><label class="check"><input type="checkbox" data-select="${escape(r.id)}" ${r.selected ? 'checked' : ''} ${r.candidate ? '' : 'disabled'} /><span class="visually-hidden">Include ${escape(r.name)} in repair plan</span></label><div class="entry-main"><h3>${escape(r.name)}</h3><p>${escape(r.path)} · ${escape(r.camera)} ${r.offset ? `· original offset ${escape(r.offset)}` : ''}</p><dl><div><dt>Capture</dt><dd>${escape(r.dates.DateTimeOriginal || '—')}</dd></div><div><dt>Create</dt><dd>${escape(r.dates.CreateDate || '—')}</dd></div><div><dt>File date</dt><dd>${escape(r.modified)}</dd></div></dl></div><div class="entry-result">${stamp(r.issue)}<p>${r.candidate ? `Sidecar will preserve <strong>${escape(r.candidate)}</strong>` : 'No sidecar proposed'}</p></div></article>`).join('')}</section></div>
      </section>` : `<section class="empty-note"><div class="index">01</div><div><h2>Start with a copy of the archive</h2><p>Exif Clock Repair reads JPEG EXIF in this version. It records only filenames and findings in this browser; image pixels and originals stay where they are.</p></div><ol><li>Choose a folder or a selection of JPEGs.</li><li>Review grouped conflicts and whole-hour clues.</li><li>Export JSON/XMP sidecars and an audit ledger.</li></ol></section>`}
      <section class="promise"><div class="index">02</div><div><h2>Make a reviewable repair plan</h2><p>The app reads documented JPEG EXIF capture fields, shows disagreements, and creates portable XMP sidecars with a JSON audit ledger. It never edits the original photo files.</p><p>File dates are clues, not proof. Keep a backup and review each proposal before importing a sidecar into another metadata tool.</p></div></section>
    </main><footer><span>Made for careful family archives.</span><span>Local-first · no analytics · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · Built by Param Factory · v1.1.0</span></footer><div id="update" class="toast" hidden>Update ready. <button id="reload">Reload</button></div>`;
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
  document.querySelector('#folder-trigger')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#folder')?.click());
  document.querySelector('#files-trigger')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#files')?.click());
  document.querySelector<HTMLInputElement>('#folder')?.addEventListener('change', e => scan((e.currentTarget as HTMLInputElement).files!));
  document.querySelector<HTMLInputElement>('#files')?.addEventListener('change', e => scan((e.currentTarget as HTMLInputElement).files!));
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter!; render(); }));
  document.querySelectorAll<HTMLInputElement>('[data-select]').forEach(c => c.addEventListener('change', () => { const r = records.find(x => x.id === c.dataset.select); if (r) r.selected = c.checked; save(); render(); }));
  document.querySelector('#clear')?.addEventListener('click', () => { if (!confirm(`Clear ${count(records.length, 'saved finding')} from this browser? Original photos will not be changed.`)) return; records = []; localStorage.removeItem(storageKey); status = 'Local repair plan cleared. Original files were never changed.'; render(); });
  document.querySelector('#reset-demo')?.addEventListener('click', () => { records = sampleRecords(); filter = 'all'; localStorage.removeItem(storageKey); status = 'Sample archive reset. Nothing from this demo was saved.'; render(); });
  document.querySelector('#export-json')?.addEventListener('click', () => download('exif-clock-repair-ledger.json', JSON.stringify(createLedger(records), null, 2)));
  document.querySelector('#export-xmp')?.addEventListener('click', () => { const bytes = createSidecarBundle(records); download('exif-clock-repair-sidecars.zip', bytes.buffer as ArrayBuffer, 'application/zip'); status = `${count(selected().length, 'sidecar')} bundled in one download with folder paths preserved.`; render(); });
  document.querySelector('#reload')?.addEventListener('click', () => location.reload());
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=5').then(reg => { reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) document.querySelector('#update')?.removeAttribute('hidden'); }); }); }).catch(() => undefined);
render();
