import { describe, expect, it } from 'vitest';
import { classify, createLedger, createXmp, formatFileTime, groupKey, parseJpegExif } from '../src/lib';

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
  it('formats local dates without UTC conversion', () => expect(formatFileTime(new Date(2020, 0, 2, 3, 4, 5).getTime())).toBe('2020:01:02 03:04:05'));
  it('reads DateTimeOriginal from a documented JPEG EXIF APP1 block', () => {
    const bytes = new Uint8Array(78); bytes.set([0xff, 0xd8, 0xff, 0xe1, 0, 72, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0], 0);
    bytes.set([0x69, 0x87, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0], 22); // Exif IFD at TIFF offset 26
    bytes.set([1, 0, 3, 0x90, 2, 0, 20, 0, 0, 0, 44, 0, 0, 0, 0, 0, 0, 0], 38);
    bytes.set(new TextEncoder().encode('2020:01:01 12:00:00\0'), 56); bytes.set([0xff, 0xd9], 76);
    expect(parseJpegExif(bytes.buffer).dates.DateTimeOriginal).toBe('2020:01:01 12:00:00');
  });
});
