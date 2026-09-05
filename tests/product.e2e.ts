import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, utimesSync, writeFileSync } from 'node:fs';

type ExifFixture = {
  make?: string;
  model?: string;
  original?: string;
  created?: string;
  modified?: string;
  offset?: string;
};

const jpegImage = readFileSync('tests/fixtures/capture.jpg');

function exifJpeg(values: ExifFixture = {}) {
  const make = values.make || 'Canon';
  const model = values.model || 'PowerShot G2';
  const original = values.original || '2012:07:04 09:15:30';
  const created = values.created || original;
  const modified = values.modified || original;
  const offset = values.offset || '-04:00';
  const strings = [make, model, modified, original, created, offset].map(value => Buffer.from(`${value}\0`, 'ascii'));
  const ifd0Offset = 8;
  const ifd0DataOffset = ifd0Offset + 2 + (4 * 12) + 4;
  const exifIfdOffset = ifd0DataOffset + strings.slice(0, 3).reduce((sum, value) => sum + value.length, 0);
  const exifDataOffset = exifIfdOffset + 2 + (3 * 12) + 4;
  const tiff = Buffer.alloc(exifDataOffset + strings.slice(3).reduce((sum, value) => sum + value.length, 0));
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(ifd0Offset, 4);

  const writeAscii = (entry: number, tag: number, value: Buffer, dataOffset: number) => {
    tiff.writeUInt16LE(tag, entry); tiff.writeUInt16LE(2, entry + 2); tiff.writeUInt32LE(value.length, entry + 4);
    tiff.writeUInt32LE(dataOffset, entry + 8); value.copy(tiff, dataOffset);
  };
  tiff.writeUInt16LE(4, ifd0Offset);
  let dataOffset = ifd0DataOffset;
  writeAscii(ifd0Offset + 2, 0x010f, strings[0], dataOffset); dataOffset += strings[0].length;
  writeAscii(ifd0Offset + 14, 0x0110, strings[1], dataOffset); dataOffset += strings[1].length;
  writeAscii(ifd0Offset + 26, 0x0132, strings[2], dataOffset); dataOffset += strings[2].length;
  const pointerEntry = ifd0Offset + 38;
  tiff.writeUInt16LE(0x8769, pointerEntry); tiff.writeUInt16LE(4, pointerEntry + 2); tiff.writeUInt32LE(1, pointerEntry + 4); tiff.writeUInt32LE(exifIfdOffset, pointerEntry + 8);

  tiff.writeUInt16LE(3, exifIfdOffset); dataOffset = exifDataOffset;
  writeAscii(exifIfdOffset + 2, 0x9003, strings[3], dataOffset); dataOffset += strings[3].length;
  writeAscii(exifIfdOffset + 14, 0x9004, strings[4], dataOffset); dataOffset += strings[4].length;
  writeAscii(exifIfdOffset + 26, 0x9011, strings[5], dataOffset);

  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const app1 = Buffer.alloc(payload.length + 4);
  app1[0] = 0xff; app1[1] = 0xe1; app1.writeUInt16BE(payload.length + 2, 2); payload.copy(app1, 4);
  return Buffer.concat([jpegImage.subarray(0, 2), app1, jpegImage.subarray(2)]);
}

function writeExifFixture(path: string, values: ExifFixture, fileDate: string) {
  writeFileSync(path, exifJpeg(values));
  const date = new Date(fileDate);
  utimesSync(path, date, date);
  return path;
}

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

const savedRecord = {
  id: 'saved-1', name: 'IMG_0001.jpg', path: 'album/IMG_0001.jpg', type: 'image/jpeg', size: 100,
  modified: '2020:01:01 20:00:00', camera: 'Archive Camera', dates: { DateTimeOriginal: '2020:01:01 12:00:00' },
  issue: 'File date is +8h from capture time', candidate: '2020:01:01 12:00:00', shiftHours: 8, selected: true
};

test('core workflow is semantic, keyboard reachable, and error free', async ({ page }) => {
  const errors: string[] = []; const origins = new Set<string>(); page.on('request', request => origins.add(new URL(request.url()).origin)); page.on('pageerror', error => errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle(/Exif Clock Repair/); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveCount(1); await expect(page.locator('main')).toHaveCount(1); await expect(page.locator('img:not([alt])')).toHaveCount(0);
  await page.keyboard.press('Tab'); await expect(page.locator('.skip')).toBeFocused();
  for (let i = 0; i < 10 && !(await page.locator('#folder-trigger').evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(page.locator('#folder-trigger')).toBeFocused(); await expect(page.locator('#folder-trigger')).toHaveCSS('outline-style', 'solid');
  const chooserEvent = page.waitForEvent('filechooser'); await page.keyboard.press('Enter'); const chooser = await chooserEvent; await chooser.setFiles('tests/fixtures');
  await expect(page.locator('#findings-title')).toContainText('1 file examined');
  const axe = await new AxeBuilder({ page }).analyze(); expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
  expect(errors).toEqual([]); expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('reduced motion removes interface transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await expect(page.locator('#folder-trigger')).toHaveCSS('transition-duration', '0s');
});

test('corrupt local state recovers with an announced next step', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('exif-clock-repair:last-plan', '{broken'));
  await page.goto('/'); await expect(page.locator('#status')).toContainText('safely cleared');
  expect(await page.evaluate(() => localStorage.getItem('exif-clock-repair:last-plan'))).toBeNull();
});

test('saved plan can be cleared on mobile and targets remain large', async ({ page }) => {
  await page.addInitScript(record => localStorage.setItem('exif-clock-repair:last-plan', JSON.stringify([record])), savedRecord);
  await page.goto('/'); const clear = page.locator('#clear'); await expect(clear).toBeVisible();
  const clearBox = await clear.boundingBox(); expect(clearBox!.height).toBeGreaterThanOrEqual(44);
  const checkboxBox = await page.locator('.check').boundingBox(); expect(checkboxBox!.width).toBeGreaterThanOrEqual(44); expect(checkboxBox!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  page.once('dialog', dialog => dialog.accept()); await clear.click(); await expect(page.locator('#status')).toContainText('cleared');
  expect(await page.evaluate(() => localStorage.getItem('exif-clock-repair:last-plan'))).toBeNull();
});

test('first screen names the user, demo, privacy, offline, and free facts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Repair photo capture clocks before sorting.');
  await expect(page.locator('.lede')).toContainText('family photo archive');
  const sampleAction = page.getByRole('link', { name: 'Try it with sample data' });
  await expect(sampleAction).toHaveAttribute('href', '/demo'); await expect(sampleAction).toBeVisible();
  expect(await sampleAction.evaluate(element => element.getBoundingClientRect().bottom <= innerHeight && scrollY === 0)).toBe(true);
  await expect(page.locator('.facts')).toContainText('Photos stay on this device.');
  await expect(page.locator('.facts')).toContainText('Works offline after first visit.');
  await expect(page.locator('.facts')).toContainText('Free to use. No purchase required.');
  await sampleAction.click(); await expect(page).toHaveURL(/\/demo\/?$/);
  await expect(page.locator('.demo-banner')).toContainText('Demo — sample data, nothing is saved.');
  await expect(page.locator('#findings-title')).toContainText('3 files examined · 2 sidecars ready');
});

test('site routes have release metadata, shared legal structure, a real 404, and no fallback CSP error', async ({ page }) => {
  const errors: string[] = []; page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/'); await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://exif-clock-repair.sociobot.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /social-card/); await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  for (const [route, title] of [['/privacy/', 'Privacy — Exif Clock Repair'], ['/terms/', 'Terms — Exif Clock Repair']] as const) { await page.goto(route); await expect(page).toHaveTitle(title); await expect(page.locator('header')).toHaveCount(1); await expect(page.locator('footer')).toHaveCount(1); await expect(page.locator('h1')).toHaveCount(1); await expect(page.locator('main')).toHaveCount(1); }
  const notFound = await page.goto('/does-not-exist'); expect([200, 404]).toContain(notFound?.status()); await expect(page).toHaveTitle('Page not found — Exif Clock Repair'); await expect(page.locator('h1')).toHaveText('This page was not found.'); errors.length = 0;
  await page.goto('/offline.html'); await expect(page).toHaveTitle('Offline — Exif Clock Repair'); await expect(page.locator('main')).toHaveCount(1); expect(errors).toEqual([]);
});

test('mobile layout has no horizontal overflow at 200% text size', async ({ page }) => {
  await page.goto('/demo'); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('@claim:demo-isolated demo sample data is separate from a real plan and can be reset', async ({ page }) => {
  await page.addInitScript(record => localStorage.setItem('exif-clock-repair:last-plan', JSON.stringify([record])), savedRecord);
  await page.goto('/demo'); await expect(page).toHaveTitle('Demo — Exif Clock Repair');
  await expect(page.locator('.demo-banner')).toContainText('sample data, nothing is saved'); await expect(page.locator('#findings-title')).toContainText('3 files examined');
  await page.locator('[data-select="demo-kitchen"]').uncheck();
  expect(await page.evaluate(() => localStorage.getItem('exif-clock-repair:last-plan'))).toContain(JSON.stringify(savedRecord.id));
  expect(await page.evaluate(() => localStorage.getItem('demo:exif-clock-repair:last-plan'))).toContain('demo-kitchen');
  await page.locator('#reset-demo').click(); await expect(page.locator('#findings-title')).toContainText('3 files examined');
  expect(await page.evaluate(() => localStorage.getItem('demo:exif-clock-repair:last-plan'))).toBeNull();
  await page.locator('[data-select="demo-kitchen"]').uncheck();
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/); await expect(page.locator('#findings-title')).toContainText('1 file examined');
  expect(await page.evaluate(() => localStorage.getItem('demo:exif-clock-repair:last-plan'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('exif-clock-repair:last-plan'))).toContain(JSON.stringify(savedRecord.id));
});

test('@claim:sidecar-export demo sidecars download once as a valid directory-preserving ZIP', async ({ page }, testInfo) => {
  await page.goto('/demo'); const event = page.waitForEvent('download'); await page.locator('#export-xmp').click(); const download = await event;
  expect(download.suggestedFilename()).toBe('exif-clock-repair-sidecars.zip'); const archive = testInfo.outputPath('sidecars.zip'); await download.saveAs(archive);
  const listing = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
  expect(listing).toContain('Family archive/1998/1998-kitchen-birthday.xmp'); expect(listing).toContain('Family archive/2003/2003-garden-portrait.xmp'); expect(listing).toContain('exif-clock-repair-ledger.json');
  const ledger = JSON.parse(execFileSync('unzip', ['-p', archive, 'exif-clock-repair-ledger.json'], { encoding: 'utf8' }));
  expect(ledger).toMatchObject({ schema: 'exif-clock-repair/repair-ledger@2' }); expect(ledger.findings).toHaveLength(3); expect(ledger.repairs).toHaveLength(2);
  expect(ledger.repairs.every((repair: { reversible: boolean }) => repair.reversible)).toBe(true);
  expect(execFileSync('unzip', ['-p', archive, 'Family archive/1998/1998-kitchen-birthday.xmp'], { encoding: 'utf8' })).toContain('1998-06-14T13:18:42');
});

test('@claim:offline-reload service worker restores the demo workspace offline after its first visit', async ({ page, context }) => {
  await page.goto('/demo'); await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '')).toContain('/sw.js?v=5');
  await expect.poll(() => page.evaluate(async () => (await caches.open('exif-clock-repair-v5')).keys().then(keys => keys.some(key => key.url.includes('/assets/'))))).toBe(true);
  const cachedBytes = await page.evaluate(async () => { const cache = await caches.open('exif-clock-repair-v5'); const entries = (await cache.keys()).filter(request => request.url.includes('/assets/')); return Promise.all(entries.map(async request => (await (await cache.match(request))!.arrayBuffer()).byteLength)); });
  expect(cachedBytes.length).toBeGreaterThanOrEqual(2); expect(Math.min(...cachedBytes)).toBeGreaterThan(1000); await page.reload(); await expect(page.locator('#findings-title')).toContainText('3 files examined');
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration?.update(); });
  expect(await page.evaluate(() => caches.keys())).toEqual(['exif-clock-repair-v5']);
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#findings-title')).toContainText('3 files examined');
});

test('@claim:local-photo-processing scanning and exports send no photo or plan data to a server', async ({ page }) => {
  await page.goto('/demo'); await expect(page.locator('#findings-title')).toContainText('3 files examined');
  await expect.poll(() => page.locator('.hero-art img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const requests: Array<{ url: string; method: string; type: string; body: string | null }> = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method(), type: request.resourceType(), body: request.postData() }));
  await page.locator('#files').setInputFiles({ name: 'private-family-photo.jpg', mimeType: 'image/jpeg', buffer: exifJpeg({ model: 'Private Camera', created: '2012:07:04 10:15:30' }) });
  await expect(page.locator('#findings-title')).toContainText('1 file examined');
  const jsonDownload = page.waitForEvent('download'); await page.locator('#export-json').click(); await jsonDownload;
  const zipDownload = page.waitForEvent('download'); await page.locator('#export-xmp').click(); await zipDownload;
  expect(requests.every(request => request.method === 'GET' && request.type === 'image' && new URL(request.url).pathname === '/notebook-bench.webp' && request.body === null)).toBe(true);
  expect(JSON.stringify(requests)).not.toContain('private-family-photo'); expect(JSON.stringify(requests)).not.toContain('Private Camera');
});

test('@claim:free-core demo completes the core repair plan without a purchase', async ({ page }) => {
  await page.goto('/demo'); await expect(page.locator('#findings-title')).toContainText('2 sidecars ready');
  await expect(page.locator('text=Buy Archive Support')).toHaveCount(0); await expect(page.getByText(/sign in|create account/i)).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0); await expect(page.locator('.facts')).toContainText('Free to use. No purchase required.');
  expect(await page.context().cookies()).toEqual([]);
});

test('@claim:jpeg-exif-reading reads supported JPEG metadata and reports unsupported formats', async ({ page }) => {
  await page.goto('/demo');
  await page.locator('#files').setInputFiles({ name: 'summer-visit.jpg', mimeType: 'image/jpeg', buffer: exifJpeg() });
  const entry = page.locator('.entry');
  await expect(entry).toContainText('Canon · PowerShot G2');
  await expect(entry).toContainText('2012:07:04 09:15:30');
  await expect(entry).toContainText('original offset -04:00');

  await page.locator('#files').setInputFiles([
    { name: 'scan.png', mimeType: 'image/png', buffer: Buffer.from('not-a-photo') },
    { name: 'scan.heic', mimeType: 'image/heic', buffer: Buffer.from('not-a-photo') },
    { name: 'scan.tiff', mimeType: 'image/tiff', buffer: Buffer.from('not-a-photo') }
  ]);
  await expect(page.locator('#findings-title')).toContainText('3 files examined');
  await expect(page.locator('.entry-main').filter({ hasText: 'Not scanned — JPEG EXIF only' })).toHaveCount(3);
  await expect(page.locator('.entry-result').filter({ hasText: 'No documented capture time' })).toHaveCount(3);
});

test('@claim:conflict-detection finds exact whole-hour and EXIF-field conflicts without rounding', async ({ page }, testInfo) => {
  const exact = writeExifFixture(testInfo.outputPath('exact-eight-hours.jpg'), {}, '2012-07-04T17:15:30Z');
  const conflict = writeExifFixture(testInfo.outputPath('field-conflict.jpg'), { created: '2012:07:04 10:15:30' }, '2012-07-04T09:15:30Z');
  const nearby = writeExifFixture(testInfo.outputPath('nearby-not-whole.jpg'), {}, '2012-07-04T10:35:30Z');
  await page.goto('/demo'); await page.locator('#files').setInputFiles([exact, conflict, nearby]);
  await expect(page.locator('#findings-title')).toContainText('3 files examined · 2 sidecars ready');
  await expect(page.locator('.entry').filter({ hasText: 'exact-eight-hours.jpg' })).toContainText('File date is +8h from capture time');
  await expect(page.locator('.entry').filter({ hasText: 'field-conflict.jpg' })).toContainText('EXIF date fields disagree');
  const nearbyEntry = page.locator('.entry').filter({ hasText: 'nearby-not-whole.jpg' });
  await expect(nearbyEntry).toContainText('No clear repair proposed'); await expect(nearbyEntry.locator('input[type="checkbox"]')).not.toBeChecked();
});

test('@claim:originals-unchanged scan and export leave source bytes unchanged', async ({ page }, testInfo) => {
  const source = writeExifFixture(testInfo.outputPath('source-original.jpg'), {}, '2012-07-04T17:15:30Z');
  const before = sha256(source);
  await page.goto('/demo'); await page.locator('#files').setInputFiles(source); await expect(page.locator('#findings-title')).toContainText('1 sidecar ready');
  const jsonDownload = page.waitForEvent('download'); await page.locator('#export-json').click(); await jsonDownload;
  const zipDownload = page.waitForEvent('download'); await page.locator('#export-xmp').click(); await zipDownload;
  expect(sha256(source)).toBe(before);
});

test('@claim:plan-storage stores structured plan metadata without photo bytes', async ({ page }) => {
  const photo = exifJpeg({ model: 'Storage Check Camera' });
  await page.goto('/demo'); await page.locator('#files').setInputFiles({ name: 'storage-check.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(page.locator('#findings-title')).toContainText('1 file examined');
  const stored = await page.evaluate(async () => ({
    localKeys: Object.keys(localStorage),
    raw: localStorage.getItem('demo:exif-clock-repair:last-plan'),
    sessionCount: sessionStorage.length,
    databaseCount: (await indexedDB.databases()).length,
    cachedUrls: (await Promise.all((await caches.keys()).map(async name => (await caches.open(name)).keys()))).flat().map(request => request.url)
  }));
  expect(stored.localKeys).toEqual(['demo:exif-clock-repair:last-plan']); expect(stored.sessionCount).toBe(0); expect(stored.databaseCount).toBe(0);
  const plan = JSON.parse(stored.raw!); expect(plan).toHaveLength(1);
  expect(Object.keys(plan[0]).sort()).toEqual(['camera', 'candidate', 'dates', 'id', 'issue', 'modified', 'name', 'offset', 'path', 'selected', 'size', 'type'].sort());
  expect(stored.raw).not.toContain(photo.toString('base64')); expect(stored.raw).not.toContain('data:image');
  expect(stored.cachedUrls.some(url => url.includes('storage-check.jpg'))).toBe(false);
  await page.reload(); await expect(page.locator('.entry')).toContainText('storage-check.jpg');
  await page.locator('#reset-demo').click(); expect(await page.evaluate(() => localStorage.getItem('demo:exif-clock-repair:last-plan'))).toBeNull();
});

test('@claim:no-analytics loads only known static resources and creates no tracking state', async ({ page }) => {
  const traffic: Array<{ url: string; method: string; type: string }> = [];
  page.on('request', request => traffic.push({ url: request.url(), method: request.method(), type: request.resourceType() }));
  await page.goto('/demo'); await expect(page.locator('#findings-title')).toContainText('3 files examined');
  await page.locator('[data-select="demo-kitchen"]').uncheck(); await page.locator('#reset-demo').click();
  const jsonDownload = page.waitForEvent('download'); await page.locator('#export-json').click(); await jsonDownload;
  const origin = new URL(page.url()).origin;
  const knownStaticPath = /^(?:\/demo\/?|\/index\.html|\/demo\/index\.html|\/assets\/main-[^/]+\.(?:js|css)|\/notebook-bench\.webp|\/manifest\.webmanifest|\/sw\.js|\/offline\.(?:html|css)|\/legal\.css)$/;
  expect(traffic.every(request => new URL(request.url).origin === origin)).toBe(true);
  expect(traffic.every(request => request.method === 'GET' && knownStaticPath.test(new URL(request.url).pathname))).toBe(true);
  expect(traffic.filter(request => ['xhr', 'fetch', 'eventsource', 'websocket'].includes(request.type))).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});
