export type Field = 'DateTimeOriginal' | 'CreateDate' | 'ModifyDate';
export type PhotoRecord = {
  id: string; name: string; path: string; type: string; size: number; modified: string;
  camera: string; dates: Partial<Record<Field, string>>; offset?: string; issue: string;
  candidate?: string; shiftHours?: number; selected?: boolean;
};

export type StoredState = { records: PhotoRecord[]; recovered: boolean };

const decoder = new TextDecoder('ascii');
const dateTags: Record<number, Field> = { 0x9003: 'DateTimeOriginal', 0x9004: 'CreateDate', 0x0132: 'ModifyDate' };

function ascii(bytes: Uint8Array, start: number, length: number) {
  return decoder.decode(bytes.subarray(start, start + length)).replace(/\0.*$/, '').trim();
}
function read16(v: DataView, at: number, le: boolean) { return v.getUint16(at, le); }
function read32(v: DataView, at: number, le: boolean) { return v.getUint32(at, le); }
function exifDate(value: string) { return /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value : undefined; }

/** Extract the documented, non-destructive timestamp fields from JPEG EXIF. */
export function parseJpegExif(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let app1 = -1;
  for (let i = 2; i + 10 < bytes.length;) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) + bytes[i + 3];
    if (marker === 0xe1 && ascii(bytes, i + 4, 6) === 'Exif') { app1 = i + 10; break; }
    if (length < 2 || marker === 0xda) break;
    i += 2 + length;
  }
  const output: { dates: Partial<Record<Field, string>>; camera: string; offset?: string } = { dates: {}, camera: 'Unknown camera' };
  if (app1 < 0 || app1 + 8 >= bytes.length) return output;
  const view = new DataView(buffer); const le = ascii(bytes, app1, 2) === 'II';
  if (!le && ascii(bytes, app1, 2) !== 'MM') return output;
  const base = app1; const make: string[] = []; let exifPointer = 0;
  const visit = (offset: number) => {
    if (base + offset + 2 > bytes.length) return;
    const count = read16(view, base + offset, le);
    for (let n = 0; n < count; n++) {
      const p = base + offset + 2 + n * 12; if (p + 12 > bytes.length) break;
      const tag = read16(view, p, le); const type = read16(view, p + 2, le); const countValue = read32(view, p + 4, le);
      const pointer = type === 2 && countValue <= 4 ? p + 8 : base + read32(view, p + 8, le);
      if (tag === 0x8769) exifPointer = read32(view, p + 8, le);
      if (type === 2 && pointer + countValue <= bytes.length) {
        const value = ascii(bytes, pointer, countValue);
        if (tag === 0x010f || tag === 0x0110) make.push(value);
        if (dateTags[tag]) { const d = exifDate(value); if (d) output.dates[dateTags[tag]] = d; }
        if (tag === 0x9011 && /^[+-]\d\d:\d\d$/.test(value)) output.offset = value;
      }
    }
  };
  visit(read32(view, base + 4, le)); if (exifPointer) visit(exifPointer);
  if (make.length) output.camera = make.filter(Boolean).join(' · ');
  return output;
}

export function formatFileTime(ms: number) {
  const d = new Date(ms); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
export function toLocalMillis(value: string) {
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : NaN;
}
export function classify(record: Omit<PhotoRecord, 'issue' | 'candidate' | 'shiftHours' | 'selected'>): PhotoRecord {
  const original = record.dates.DateTimeOriginal || record.dates.CreateDate || record.dates.ModifyDate;
  if (!original) return { ...record, issue: 'No documented capture time' };
  const fields = Object.values(record.dates); const mismatch = fields.some((d) => d !== original);
  const deltaHours = (toLocalMillis(record.modified) - toLocalMillis(original)) / 3600000;
  const delta = Number.isInteger(deltaHours) ? deltaHours : undefined;
  if (mismatch) return { ...record, issue: 'EXIF date fields disagree', candidate: original, selected: true };
  if (delta !== undefined && Math.abs(delta) >= 1 && Math.abs(delta) <= 14) return { ...record, issue: `File date is ${delta > 0 ? '+' : ''}${delta}h from capture time`, candidate: original, shiftHours: delta, selected: true };
  return { ...record, issue: 'No clear repair proposed', candidate: original, selected: false };
}
export function groupKey(record: PhotoRecord) {
  return `${record.camera} / ${record.shiftHours === undefined ? record.issue : `${record.shiftHours > 0 ? '+' : ''}${record.shiftHours}h pattern`}`;
}
export function createLedger(records: PhotoRecord[]) {
  return { schema: 'exif-clock-repair/repair-ledger@2', createdAt: new Date().toISOString(), timezonePolicy: 'Capture timestamps remain local wall time; source offsets are preserved when present.', findings: records.map(r => ({ source: r.path, camera: r.camera, before: r.dates, sourceOffset: r.offset || null, finding: r.issue, decision: r.selected && r.candidate ? 'selected' : 'not_selected' })), repairs: records.filter(r => r.selected && r.candidate).map(r => ({ source: r.path, camera: r.camera, before: r.dates, sourceOffset: r.offset || null, proposed: { DateTimeOriginal: r.candidate, CreateDate: r.candidate }, rationale: r.issue, reversible: true })) };
}

function xml(value: string) { return value.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&apos;', '"':'&quot;' }[c]!)); }
export function toXmpDate(value: string, offset?: string) {
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error('Cannot export an invalid EXIF date');
  const zone = offset && /^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset) ? offset : '';
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${zone}`;
}
export function createXmp(record: PhotoRecord) {
  const value = record.candidate || record.dates.DateTimeOriginal || record.dates.CreateDate || record.dates.ModifyDate || '';
  const date = xml(toXmpDate(value, record.offset));
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Exif Clock Repair"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" exif:DateTimeOriginal="${date}" xmp:CreateDate="${date}" xmp:ModifyDate="${date}" xmp:Label="Exif Clock Repair sidecar"/></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>`;
}

function validRecord(value: unknown): value is PhotoRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return ['id', 'name', 'path', 'type', 'modified', 'camera', 'issue'].every(k => typeof r[k] === 'string')
    && typeof r.size === 'number' && !!r.dates && typeof r.dates === 'object'
    && (r.offset === undefined || typeof r.offset === 'string')
    && (r.candidate === undefined || typeof r.candidate === 'string')
    && (r.shiftHours === undefined || typeof r.shiftHours === 'number')
    && (r.selected === undefined || typeof r.selected === 'boolean');
}

export function readStoredState(raw: string | null): StoredState {
  if (!raw) return { records: [], recovered: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(validRecord)) throw new Error('Invalid saved plan');
    return { records: value, recovered: false };
  } catch {
    return { records: [], recovered: true };
  }
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result;
}
function safeSidecarPath(source: string) {
  const parts = source.replace(/\\/g, '/').split('/').filter(part => part && part !== '.' && part !== '..').map(part => part.replace(/[<>:"|?*\x00-\x1f]/g, '_'));
  const fallback = parts.pop() || 'photo.jpg';
  return [...parts, fallback.replace(/\.[^.]+$/, '') + '.xmp'].join('/');
}

/** Build one uncompressed, UTF-8 ZIP so large exports remain one user download. */
export function createSidecarBundle(records: PhotoRecord[]) {
  const chosen = records.filter(r => r.selected && r.candidate);
  const used = new Set<string>();
  const files = chosen.map(record => {
    const desired = safeSidecarPath(record.path); let name = desired; let n = 2;
    while (used.has(name.toLocaleLowerCase())) name = desired.replace(/\.xmp$/i, `__${n++}.xmp`);
    used.add(name.toLocaleLowerCase()); return { name, body: createXmp(record) };
  });
  files.push({ name: 'exif-clock-repair-ledger.json', body: JSON.stringify(createLedger(records), null, 2) });
  const encoder = new TextEncoder(); const local: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name); const body = encoder.encode(file.body); const crc = crc32(body);
    const header = new Uint8Array(30 + name.length); const h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, body.length, true); h.setUint32(22, body.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
    const directory = new Uint8Array(46 + name.length); const d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x0800, true); d.setUint32(16, crc, true); d.setUint32(20, body.length, true); d.setUint32(24, body.length, true); d.setUint16(28, name.length, true); d.setUint32(42, offset, true); directory.set(name, 46);
    local.push(header, body); central.push(directory); offset += header.length + body.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0); const end = new Uint8Array(22); const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return concat([...local, ...central, end]);
}
