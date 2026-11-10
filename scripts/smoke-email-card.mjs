import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const origin = new URL(process.env.EMAIL_URL || '/assinatura-email.html', process.env.COMPOSITION_URL || 'http://127.0.0.1:8765').href;
const output = path.resolve(process.env.EMAIL_OUTPUT || 'email-card-proof');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.EMAIL_BROWSER_EXECUTABLE ? { executablePath: process.env.EMAIL_BROWSER_EXECUTABLE } : {}) });
const errors = [], report = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.waitForSelector('#previewStage[data-ready=true] canvas');
  assert.equal(await page.title(), 'Cartão MATTAR — LABMATTAR');
  assert.equal(await page.locator('[data-color-key]').count(), 24);
  for (const [key, value] of Object.entries({ paper: '#F7F6F2', ink: '#181818', accent: '#E22E24' })) {
    assert.equal(await page.locator('[data-color-key=' + key + '][aria-pressed=true]').getAttribute('data-color-value'), value);
  }
  // Placeholders are visible, but exporting them as a person's signature is blocked.
  await page.locator('#downloadPNG').click();
  assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
  const data = { name: 'Maria Clara de Oliveira', role: 'Produção e projetos', email: 'maria@exemplo.com', phone: '+55 11 99999-9999' };
  for (const [key, value] of Object.entries(data)) await page.locator('#' + key).fill(value);
  await page.waitForTimeout(100);
  for (const format of ['card', 'email']) {
    await page.locator('button[data-format=' + format + ']').click();
    const pending = page.waitForEvent('download');
    await page.locator('#downloadPNG').click();
    const file = path.join(output, format + '.png'); await (await pending).saveAs(file);
    const png = await fs.readFile(file);
    assert.equal(png.readUInt32BE(16), format === 'card' ? 960 : 480);
    assert.equal(png.readUInt32BE(20), format === 'card' ? 560 : 100);
    report.push({ format, pngBytes: png.length });
  }
  // Independent brand inks reach the actual downloaded bitmap.
  await page.locator('[data-color-key=paper][data-color-value="#5B463E"]').click();
  await page.locator('[data-color-key=ink][data-color-value="#FFFFFF"]').click();
  await page.locator('[data-color-key=accent][data-color-value="#8FD81B"]').click();
  const pending = page.waitForEvent('download', { timeout: 120000 });
  await page.locator('#downloadMotion').click();
  const gifFile = path.join(output, 'personalized.gif'); await (await pending).saveAs(gifFile);
  const gif = await fs.readFile(gifFile);
  assert.equal(gif.subarray(0, 6).toString(), 'GIF89a');
  assert.equal(gif.readUInt16LE(6), 480); assert.equal(gif.readUInt16LE(8), 100);
  assert.ok(gif.length < 1024 * 1024, 'Email GIF exceeds one megabyte');
  const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', gifFile], { encoding: 'utf8' }));
  assert.equal(Number(probe.format.duration), 10.8);
  assert.ok(Number(probe.streams[0].nb_read_frames) > 50);
  const htmlPending = page.waitForEvent('download'); await page.locator('#downloadHTML').click();
  const htmlFile = path.join(output, 'contact.html'); await (await htmlPending).saveAs(htmlFile);
  const html = await fs.readFile(htmlFile, 'utf8'); assert.ok(html.includes('data:image/png;base64,')); assert.ok(html.includes('mailto:maria@exemplo.com'));
  const contactPending = page.waitForEvent('download'); await page.locator('#downloadContact').click();
  const contactFile = path.join(output, 'contact.vcf'); await (await contactPending).saveAs(contactFile);
  assert.match(await fs.readFile(contactFile, 'utf8'), /FN:Maria Clara de Oliveira/);
  await page.locator('#resetColors').click();
  assert.equal(await page.locator('[data-color-key=paper][aria-pressed=true]').getAttribute('data-color-value'), '#F7F6F2');
  assert.equal(await page.locator('#name').inputValue(), data.name);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, 'viewport-' + width + '.png'), fullPage: true });
  }
  await page.goto(pathToFileURL(htmlFile).href);
  await page.waitForFunction(() => document.querySelector('img')?.complete);
  assert.ok(await page.locator('img').evaluate(image => image.naturalWidth > 0));
  assert.deepEqual(errors, []);
  const result = { status: 'passed', formats: report, gifBytes: gif.length, duration: 10.8, viewports: [1440, 390, 320], errors };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally { await browser.close(); }
