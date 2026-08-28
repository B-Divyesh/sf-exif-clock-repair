export type Field = 'DateTimeOriginal' | 'CreateDate' | 'ModifyDate';
export type PhotoRecord = {
  id: string; name: string; path: string; type: string; size: number; modified: string;
  camera: string; dates: Partial<Record<Field, string>>; offset?: string; issue: string;
  candidate?: string; shiftHours?: number; selected?: boolean;
};

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
  const delta = Math.round((toLocalMillis(record.modified) - toLocalMillis(original)) / 3600000);
  if (mismatch) return { ...record, issue: 'EXIF date fields disagree', candidate: original, selected: true };
  if (Math.abs(delta) >= 1 && Math.abs(delta) <= 14) return { ...record, issue: `File date is ${delta > 0 ? '+' : ''}${delta}h from capture time`, candidate: original, shiftHours: delta, selected: true };
  return { ...record, issue: 'No clear repair proposed', candidate: original, selected: false };
}
export function groupKey(record: PhotoRecord) {
  return `${record.camera} / ${record.shiftHours === undefined ? record.issue : `${record.shiftHours > 0 ? '+' : ''}${record.shiftHours}h pattern`}`;
}
export function createLedger(records: PhotoRecord[]) {
  return { schema: 'exif-clock-repair/repair-ledger@1', createdAt: new Date().toISOString(), timezonePolicy: 'Capture timestamps remain local wall time; source offsets are preserved when present.', repairs: records.filter(r => r.selected && r.candidate).map(r => ({ source: r.path, camera: r.camera, before: r.dates, sourceOffset: r.offset || null, proposed: { DateTimeOriginal: r.candidate, CreateDate: r.candidate }, rationale: r.issue, reversible: true })) };
}
export function createXmp(record: PhotoRecord) {
  const value = record.candidate || record.dates.DateTimeOriginal || record.dates.CreateDate || record.dates.ModifyDate || '';
  const offset = record.offset || '';
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" exif:DateTimeOriginal="${value}" xmp:CreateDate="${value}${offset}" xmp:ModifyDate="${value}${offset}" xmp:Label="Exif Clock Repair sidecar"/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
}
