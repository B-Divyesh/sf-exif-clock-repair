import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

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
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toHaveAttribute('href', '/demo');
  await expect(page.locator('.facts')).toContainText('Photos stay on this device.');
  await expect(page.locator('.facts')).toContainText('Works offline after first visit.');
  await expect(page.locator('.facts')).toContainText('Free to use. No purchase required.');
});

test('site routes have release metadata, shared legal structure, a real 404, and no fallback CSP error', async ({ page }) => {
  const errors: string[] = []; page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/'); await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://exif-clock-repair.sociobot.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /social-card/); await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  for (const route of ['/privacy/', '/terms/']) { await page.goto(route); await expect(page.locator('header')).toHaveCount(1); await expect(page.locator('footer')).toHaveCount(1); await expect(page.locator('h1')).toHaveCount(1); await expect(page.locator('main')).toHaveCount(1); }
  const notFound = await page.goto('/does-not-exist'); expect([200, 404]).toContain(notFound?.status()); await expect(page.locator('h1')).toContainText('not in the notebook'); errors.length = 0;
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
});

test('@claim:sidecar-export demo sidecars download once as a valid directory-preserving ZIP', async ({ page }, testInfo) => {
  await page.goto('/demo'); const event = page.waitForEvent('download'); await page.locator('#export-xmp').click(); const download = await event;
  expect(download.suggestedFilename()).toBe('exif-clock-repair-sidecars.zip'); const archive = testInfo.outputPath('sidecars.zip'); await download.saveAs(archive);
  const listing = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
  expect(listing).toContain('Family archive/1998/1998-kitchen-birthday.xmp'); expect(listing).toContain('Family archive/2003/2003-garden-portrait.xmp'); expect(listing).toContain('exif-clock-repair-ledger.json');
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

test('@claim:local-photo-processing demo workflow sends no photo data off-origin', async ({ page }) => {
  const origins = new Set<string>(); page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto('/demo'); await expect(page.locator('#findings-title')).toContainText('3 files examined');
  await page.locator('#export-json').click(); await page.locator('#export-xmp').click();
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('@claim:free-core demo completes the core repair plan without a purchase', async ({ page }) => {
  await page.goto('/demo'); await expect(page.locator('#findings-title')).toContainText('2 sidecars ready');
  await expect(page.locator('text=Buy Archive Support')).toHaveCount(0); await expect(page.locator('.facts')).toContainText('Free to use. No purchase required.');
});
