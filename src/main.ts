import './style.css';
import { classify, createLedger, createSidecarBundle, formatFileTime, groupKey, parseJpegExif, readStoredState, type PhotoRecord } from './lib';

const storageKey = 'exif-clock-repair:last-plan';
const licenseKey = 'sb_license:exif-clock-repair';
const verdictKey = `${licenseKey}:verdict`;
const stored = readStoredState(localStorage.getItem(storageKey));
let records: PhotoRecord[] = stored.records;
if (stored.recovered) localStorage.removeItem(storageKey);
let status = stored.recovered ? 'The saved plan was damaged, so it was safely cleared. Choose the original photos to scan again.' : records.length ? `Restored ${records.length} previous finding${records.length === 1 ? '' : 's'}. Files are never retained.` : 'Choose a folder or a few image files. Nothing leaves this device.';
let filter = 'all';
type LicenseStatus = 'none' | 'checking' | 'active' | 'inactive' | 'offline';
let licenseStatus: LicenseStatus = 'none';
let licenseMessage = '';

function cachedVerdict() {
  try {
    const value = JSON.parse(localStorage.getItem(verdictKey) || 'null') as { valid?: unknown; checkedAt?: unknown } | null;
    return value && typeof value.valid === 'boolean' && typeof value.checkedAt === 'number' ? { valid: value.valid, checkedAt: value.checkedAt } : null;
  } catch { return null; }
}
function captureReturnedLicense() {
  const url = new URL(location.href); const returned = url.searchParams.get('license');
  if (returned?.trim()) { localStorage.setItem(licenseKey, returned.trim()); localStorage.removeItem(verdictKey); url.searchParams.delete('license'); history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`); }
}
captureReturnedLicense();
const initialToken = localStorage.getItem(licenseKey);
const initialVerdict = cachedVerdict();
if (initialToken) {
  if (initialVerdict?.valid && Date.now() - initialVerdict.checkedAt < 86400000) { licenseStatus = 'active'; licenseMessage = 'Archive Support license active on this device.'; }
  else licenseStatus = 'checking';
}

const escape = (s: string) => s.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]!));
const app = document.querySelector<HTMLDivElement>('#app')!;
function stamp(text: string) { return `<span class="stamp">${escape(text)}</span>`; }
function download(name: string, body: BlobPart, type = 'application/json') { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([body], { type })), download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function save() { localStorage.setItem(storageKey, JSON.stringify(records)); }
function selected() { return records.filter(r => r.selected && r.candidate); }
const count = (amount: number, singular: string, plural = `${singular}s`) => `${amount} ${amount === 1 ? singular : plural}`;

function render() {
  const proposed = selected(); const groups = new Map<string, PhotoRecord[]>();
  records.forEach(r => { const key = groupKey(r); groups.set(key, [...(groups.get(key) || []), r]); });
  const visible = filter === 'all' ? records : groups.get(filter) || [];
  app.innerHTML = `
    <header class="masthead"><a class="brand" href="/" aria-label="Exif Clock Repair home"><span aria-hidden="true">✣</span> Exif Clock Repair</a><nav aria-label="Secondary"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></header>
    <main id="main">
      <section class="hero ${records.length ? 'compact' : ''}" aria-labelledby="page-title">
        <div class="hero-copy"><p class="eyebrow">Private photo archive utility</p><h1 id="page-title">Put the story back in order.</h1><p class="lede">Inspect capture clocks, spot recurring offsets, and write a reversible repair plan — before anything touches an original.</p>
          <div class="actions"><button class="button primary" id="folder-trigger" type="button">Choose photo folder</button><input class="file-input" id="folder" type="file" tabindex="-1" aria-label="Photo folder" multiple accept="image/jpeg,image/tiff,image/heic,image/png" webkitdirectory directory /><button class="button quiet" id="files-trigger" type="button">Choose files</button><input class="file-input" id="files" type="file" tabindex="-1" aria-label="Photo files" multiple accept="image/jpeg,image/tiff,image/heic,image/png" /></div>
          <p id="status" class="status" aria-live="polite">${escape(status)}</p>
        </div><figure class="hero-art"><img src="/notebook-bench.webp" width="1200" height="800" fetchpriority="high" decoding="async" alt="A magnifying glass and photographic contact sheet on an archival workbench." /><figcaption>Original AI-generated illustration</figcaption></figure>
      </section>
      ${records.length ? `<section class="workspace" aria-labelledby="findings-title">
        <div class="section-head"><div><p class="eyebrow">Scan ledger</p><h2 id="findings-title">${count(records.length, 'file')} examined · ${count(proposed.length, 'sidecar')} ready</h2></div><div class="export-actions"><button id="export-json" class="button quiet">Export repair ledger</button><button id="export-xmp" class="button primary" ${proposed.length ? '' : 'disabled'}>Download sidecar bundle</button></div></div>
        <div class="method" role="note"><strong>How to read this:</strong> a proposal is a hypothesis, not a write. We compare documented EXIF fields and use the file date only to reveal exact whole-hour patterns. The ZIP keeps each sidecar beside its original folder path. Spot-check before importing.</div>
        <div class="finding-layout"><section class="groups" aria-label="Pattern groups"><h3>Patterns found</h3><button class="group ${filter === 'all' ? 'active' : ''}" data-filter="all"><span>All findings</span><b>${records.length}</b></button>${[...groups].map(([name, set]) => `<button class="group ${filter === name ? 'active' : ''}" data-filter="${escape(name)}"><span>${escape(name)}</span><b>${set.length}</b></button>`).join('')}<button class="text-button" id="clear">Clear local plan</button></section>
        <section class="entries" aria-label="Photo findings">${visible.map((r, i) => `<article class="entry"><label class="check"><input type="checkbox" data-select="${escape(r.id)}" ${r.selected ? 'checked' : ''} ${r.candidate ? '' : 'disabled'} /><span class="visually-hidden">Include ${escape(r.name)} in repair plan</span></label><div class="entry-main"><h3>${escape(r.name)}</h3><p>${escape(r.path)} · ${escape(r.camera)} ${r.offset ? `· original offset ${escape(r.offset)}` : ''}</p><dl><div><dt>Capture</dt><dd>${escape(r.dates.DateTimeOriginal || '—')}</dd></div><div><dt>Create</dt><dd>${escape(r.dates.CreateDate || '—')}</dd></div><div><dt>File date</dt><dd>${escape(r.modified)}</dd></div></dl></div><div class="entry-result">${stamp(r.issue)}<p>${r.candidate ? `Sidecar will preserve <strong>${escape(r.candidate)}</strong>` : 'No sidecar proposed'}</p></div></article>`).join('')}</section></div>
      </section>` : `<section class="empty-note"><div class="index">01</div><div><h2>Start with a copy of the archive</h2><p>Exif Clock Repair reads JPEG EXIF in this version. It records only filenames and findings in this browser; image pixels and originals stay where they are.</p></div><ol><li>Choose a folder or a selection of JPEGs.</li><li>Review grouped conflicts and whole-hour clues.</li><li>Export JSON/XMP sidecars and an audit ledger.</li></ol></section>`}
      <section class="promise"><div class="index">02</div><div><h2>What this tool will and won’t do</h2><p><strong>It will:</strong> read documented JPEG EXIF timestamp fields, show their disagreement, retain source timezone offsets, and generate portable XMP/JSON sidecars.</p><p><strong>It won’t:</strong> upload photos, rewrite image pixels, mutate EXIF, guess ambiguous dates, or use the file date as proof.</p></div></section>
      <section class="license" aria-labelledby="license-title"><div class="index">03</div><div><p class="eyebrow">Optional Archive Support license</p><h2 id="license-title">Keep careful tools independent.</h2><p><strong>$12 USD, one-time.</strong> The license supports maintenance and keeps the complete archive workflow available on this device. Core scanning, accessibility, safety, and data export remain available without purchase.</p><div class="license-actions"><a class="button primary" href="https://api.sociobot.in/api/v1/products/exif-clock-repair/checkout">Buy Archive Support</a><details><summary>Have a license? Restore it</summary><form id="license-form"><label for="license-token">License token</label><div class="restore-row"><input id="license-token" name="license" autocomplete="off" required /><button class="button quiet" type="submit" aria-label="Restore license">Restore license</button></div></form></details></div><p id="license-status" class="status" aria-live="polite">${escape(licenseMessage || (licenseStatus === 'checking' ? 'Checking the saved license…' : licenseStatus === 'inactive' ? 'License no longer active. The free workspace is still available.' : licenseStatus === 'offline' ? 'License could not be checked while offline. The free workspace is still available.' : 'Checkout is hosted by Sociobot/Dodo, the merchant of record. Refunds are handled there and revoke the license.'))}</p></div></section>
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
  document.querySelector('#folder-trigger')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#folder')?.click());
  document.querySelector('#files-trigger')?.addEventListener('click', () => document.querySelector<HTMLInputElement>('#files')?.click());
  document.querySelector<HTMLInputElement>('#folder')?.addEventListener('change', e => scan((e.currentTarget as HTMLInputElement).files!));
  document.querySelector<HTMLInputElement>('#files')?.addEventListener('change', e => scan((e.currentTarget as HTMLInputElement).files!));
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter!; render(); }));
  document.querySelectorAll<HTMLInputElement>('[data-select]').forEach(c => c.addEventListener('change', () => { const r = records.find(x => x.id === c.dataset.select); if (r) r.selected = c.checked; save(); render(); }));
  document.querySelector('#clear')?.addEventListener('click', () => { if (!confirm(`Clear ${count(records.length, 'saved finding')} from this browser? Original photos will not be changed.`)) return; records = []; localStorage.removeItem(storageKey); status = 'Local repair plan cleared. Original files were never changed.'; render(); });
  document.querySelector('#export-json')?.addEventListener('click', () => download('exif-clock-repair-ledger.json', JSON.stringify(createLedger(records), null, 2)));
  document.querySelector('#export-xmp')?.addEventListener('click', () => { const bytes = createSidecarBundle(records); download('exif-clock-repair-sidecars.zip', bytes.buffer as ArrayBuffer, 'application/zip'); status = `${count(selected().length, 'sidecar')} bundled in one download with folder paths preserved.`; render(); });
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', event => { event.preventDefault(); const token = new FormData(event.currentTarget as HTMLFormElement).get('license')?.toString().trim(); if (!token) return; localStorage.setItem(licenseKey, token); localStorage.removeItem(verdictKey); licenseStatus = 'checking'; licenseMessage = ''; render(); void verifyLicense(true); });
  document.querySelector('#reload')?.addEventListener('click', () => location.reload());
}
async function verifyLicense(force = false) {
  const token = localStorage.getItem(licenseKey); if (!token) return;
  const verdict = cachedVerdict();
  if (!force && verdict && Date.now() - verdict.checkedAt < 86400000) return;
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/exif-clock-repair/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('Verification unavailable');
    const result = await response.json() as { valid?: boolean };
    const valid = result.valid === true; localStorage.setItem(verdictKey, JSON.stringify({ valid, checkedAt: Date.now() }));
    licenseStatus = valid ? 'active' : 'inactive'; licenseMessage = valid ? 'Archive Support license active on this device.' : '';
  } catch { licenseStatus = verdict?.valid ? 'active' : 'offline'; licenseMessage = verdict?.valid ? 'Using the last verified license while offline.' : ''; }
  render();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=4').then(reg => { reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) document.querySelector('#update')?.removeAttribute('hidden'); }); }); }).catch(() => undefined);
render();
if (initialToken && !(initialVerdict && Date.now() - initialVerdict.checkedAt < 86400000)) void verifyLicense();
