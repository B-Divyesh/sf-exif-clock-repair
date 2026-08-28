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
  for (let i = 0; i < 5 && !(await page.locator('#folder-trigger').evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
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

test('license return is stored, stripped, and verified without blocking free use', async ({ page }) => {
  let verificationCalls = 0; await page.route('https://api.sociobot.in/**', route => { verificationCalls++; return route.fulfill({ json: { valid: true, reason: 'ok', expires_at: null }, headers: { 'access-control-allow-origin': '*' } }); });
  await page.goto('/?license=test-token'); await expect(page).toHaveURL('/');
  await expect(page.locator('#license-status')).toContainText('active');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:exif-clock-repair'))).toBe('test-token');
  await page.reload(); await expect(page.locator('#license-status')).toContainText('active'); expect(verificationCalls).toBe(1);
});

test('sidecars download once as a valid directory-preserving ZIP', async ({ page }, testInfo) => {
  const second = { ...savedRecord, id: 'saved-2', path: 'second-album/IMG_0001.jpg' };
  await page.addInitScript(records => localStorage.setItem('exif-clock-repair:last-plan', JSON.stringify(records)), [savedRecord, second]);
  await page.goto('/'); const event = page.waitForEvent('download'); await page.locator('#export-xmp').click(); const download = await event;
  expect(download.suggestedFilename()).toBe('exif-clock-repair-sidecars.zip'); const archive = testInfo.outputPath('sidecars.zip'); await download.saveAs(archive);
  const listing = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
  expect(listing).toContain('album/IMG_0001.xmp'); expect(listing).toContain('second-album/IMG_0001.xmp'); expect(listing).toContain('exif-clock-repair-ledger.json');
});

test('service worker restores the local workspace offline', async ({ page, context }) => {
  await page.addInitScript(record => localStorage.setItem('exif-clock-repair:last-plan', JSON.stringify([record])), savedRecord);
  await page.goto('/'); await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '')).toContain('/sw.js?v=4');
  await expect.poll(() => page.evaluate(async () => (await caches.open('exif-clock-repair-v4')).keys().then(keys => keys.some(key => key.url.includes('/assets/index-'))))).toBe(true);
  const cachedBytes = await page.evaluate(async () => { const cache = await caches.open('exif-clock-repair-v4'); const entries = (await cache.keys()).filter(request => request.url.includes('/assets/')); return Promise.all(entries.map(async request => (await (await cache.match(request))!.arrayBuffer()).byteLength)); });
  expect(cachedBytes.length).toBeGreaterThanOrEqual(2); expect(Math.min(...cachedBytes)).toBeGreaterThan(1000); await page.reload(); await expect(page.locator('#findings-title')).toContainText('1 file examined');
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration?.update(); });
  expect(await page.evaluate(() => caches.keys())).toEqual(['exif-clock-repair-v4']);
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#findings-title')).toContainText('1 file examined');
});
