import { describe, expect, it } from 'vitest';
import { classify, createLedger, createSidecarBundle, createXmp, formatFileTime, groupKey, parseJpegExif, readStoredState, toXmpDate, type PhotoRecord } from '../src/lib';

describe('repair planning', () => {
  const base = { id: '1', name: 'A.jpg', path: 'A.jpg', type: 'image/jpeg', size: 2, modified: '2020:01:01 20:00:00', camera: 'Acme', dates: { DateTimeOriginal: '2020:01:01 12:00:00' as const } };
  it('flags a plausible whole-hour file-date pattern without changing the source', () => {
    const result = classify(base);
    expect(result.shiftHours).toBe(8); expect(result.selected).toBe(true); expect(groupKey(result)).toContain('+8h');
  });
  it('keeps the repair plan auditable and reversible', () => {
    const record = classify(base); const ledger = createLedger([record]);
    expect(ledger.repairs[0].before.DateTimeOriginal).toBe('2020:01:01 12:00:00');
    expect(ledger.repairs[0].reversible).toBe(true);
    expect(createXmp(record)).toContain('Exif Clock Repair sidecar');
  });
  it('requires an exact whole-hour delta rather than rounding nearby evidence', () => {
    const result = classify({ ...base, modified: '2020:01:01 13:20:00' });
    expect(result.shiftHours).toBeUndefined(); expect(result.selected).toBe(false); expect(result.issue).toBe('No clear repair proposed');
  });
  it.each([
    ['-04:00', '2010-11-07T01:30:00-04:00'],
    ['+05:30', '2010-11-07T01:30:00+05:30'],
    ['+12:45', '2010-11-07T01:30:00+12:45'],
    [undefined, '2010-11-07T01:30:00']
  ])('normalizes EXIF wall time with offset %s to interoperable XMP', (offset, expected) => {
    expect(toXmpDate('2010:11:07 01:30:00', offset)).toBe(expected);
    const xmp = createXmp({ ...classify(base), candidate: '2010:11:07 01:30:00', offset });
    expect(xmp).toContain(`xmp:CreateDate="${expected}"`); expect(xmp).toContain(`exif:DateTimeOriginal="${expected}"`);
  });
  it('recovers safely from corrupt or structurally invalid saved plans', () => {
    expect(readStoredState('{broken')).toEqual({ records: [], recovered: true });
    expect(readStoredState('[{"name":"partial"}]')).toEqual({ records: [], recovered: true });
    expect(readStoredState(JSON.stringify([classify(base)]))).toMatchObject({ recovered: false, records: [{ name: 'A.jpg' }] });
  });
  it('records rejected decisions and bundles colliding basenames by source folder', () => {
    const first = { ...classify(base), id: 'a', path: 'folder-a/IMG_0001.jpg', name: 'IMG_0001.jpg' };
    const second = { ...first, id: 'b', path: 'folder-b/IMG_0001.jpg' };
    const rejected = { ...first, id: 'c', path: 'folder-c/rejected.jpg', selected: false };
    const ledger = createLedger([first, rejected]);
    expect(ledger.findings).toHaveLength(2); expect(ledger.findings[1].decision).toBe('not_selected'); expect(ledger.repairs).toHaveLength(1);
    const zip = createSidecarBundle([first, second, rejected]); const text = new TextDecoder().decode(zip);
    expect(text).toContain('folder-a/IMG_0001.xmp'); expect(text).toContain('folder-b/IMG_0001.xmp'); expect(text).toContain('exif-clock-repair-ledger.json');
    expect(new DataView(zip.buffer).getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(new DataView(zip.buffer).getUint16(zip.length - 12, true)).toBe(3);
  });
  it('creates a 10,000-sidecar archive synchronously without download timers', () => {
    const record = classify(base); const records: PhotoRecord[] = Array.from({ length: 10000 }, (_, index) => ({ ...record, id: String(index), name: `IMG_${index}.jpg`, path: `roll-${index % 20}/IMG_${index}.jpg` }));
    const started = performance.now(); const zip = createSidecarBundle(records);
    expect(zip.byteLength).toBeGreaterThan(5_000_000); expect(performance.now() - started).toBeLessThan(5000);
    expect(new DataView(zip.buffer).getUint16(zip.length - 12, true)).toBe(10001);
  }, 10000);
  it('formats local dates without UTC conversion', () => expect(formatFileTime(new Date(2020, 0, 2, 3, 4, 5).getTime())).toBe('2020:01:02 03:04:05'));
  it('reads DateTimeOriginal from a documented JPEG EXIF APP1 block', () => {
    const bytes = new Uint8Array(78); bytes.set([0xff, 0xd8, 0xff, 0xe1, 0, 72, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0], 0);
    bytes.set([0x69, 0x87, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0], 22); // Exif IFD at TIFF offset 26
    bytes.set([1, 0, 3, 0x90, 2, 0, 20, 0, 0, 0, 44, 0, 0, 0, 0, 0, 0, 0], 38);
    bytes.set(new TextEncoder().encode('2020:01:01 12:00:00\0'), 56); bytes.set([0xff, 0xd9], 76);
    expect(parseJpegExif(bytes.buffer).dates.DateTimeOriginal).toBe('2020:01:01 12:00:00');
  });
});
