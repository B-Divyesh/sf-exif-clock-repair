import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createXmp, type PhotoRecord } from '../src/lib';

const directory = mkdtempSync(join(tmpdir(), 'exif-clock-repair-'));
const cases = [
  { offset: '-04:00', expected: '2010:11:07 01:30:00-04:00' },
  { offset: '+05:30', expected: '2010:11:07 01:30:00+05:30' },
  { offset: '+12:45', expected: '2010:11:07 01:30:00+12:45' },
  { offset: undefined, expected: '2010:11:07 01:30:00' }
];

for (const [index, item] of cases.entries()) {
  const record: PhotoRecord = { id: String(index), name: 'test.jpg', path: 'test.jpg', type: 'image/jpeg', size: 1, modified: '2010:11:07 01:30:00', camera: 'Test', dates: { DateTimeOriginal: '2010:11:07 01:30:00' }, offset: item.offset, issue: 'test', candidate: '2010:11:07 01:30:00', selected: true };
  const file = join(directory, `offset-${index}.xmp`); writeFileSync(file, createXmp(record));
  const json = JSON.parse(execFileSync('exiftool', ['-j', '-validate', '-warning', '-XMP:CreateDate', '-XMP:ModifyDate', '-XMP-exif:DateTimeOriginal', file], { encoding: 'utf8' }))[0];
  if (json.Warning) throw new Error(`${item.offset || 'no offset'}: ${json.Warning}`);
  if (json.CreateDate !== item.expected || json.ModifyDate !== item.expected || json.DateTimeOriginal !== item.expected) throw new Error(`${item.offset || 'no offset'} read back incorrectly: ${JSON.stringify(json)}`);
  console.log(`${item.offset || 'no offset'} -> ${json.CreateDate}`);
}
