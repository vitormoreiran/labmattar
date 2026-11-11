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
const models = [
  { id: 'm-horizontal', width: 360, height: 180 },
  { id: 'm-compacto', width: 320, height: 160 },
  { id: 'mattar-faixa', width: 360, height: 180 },
  { id: 'm-linha', width: 360, height: 180 }
];
const data = { name: 'Joana Oliveira', role: 'Comunicação e projetos', email: 'joana@labmattar.com', phone: '+55 11 99999-9999' };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.waitForSelector('#previewStage[data-ready=true] canvas');
  assert.equal(await page.title(), 'Cartão MATTAR — LABMATTAR');
  assert.equal(await page.locator('button[data-composition]').count(), 4);
  assert.equal(await page.locator('[data-color-key]').count(), 24);
  await page.locator('#downloadPNG').click();
  assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
  for (const [key, value] of Object.entries(data)) await page.locator('#' + key).fill(value);
  const select = async id => {
    await page.locator('button[data-composition=' + id + ']').click();
    await page.waitForFunction(id => document.querySelector('#previewStage').dataset.composition === id, id);
  };
  const download = async (button, filename, timeout = 30000) => {
    const pending = page.waitForEvent('download', { timeout });
    await page.locator(button).click();
    const item = await pending;
    const file = path.join(output, filename); await item.saveAs(file); return file;
  };
  for (const model of models) {
    await select(model.id);
    assert.equal(await page.locator('button[data-composition][aria-pressed=true]').count(), 1);
    assert.equal(await page.locator('#togglePreview').isHidden(), model.id === 'mattar-faixa');
    const file = await download('#downloadPNG', model.id + '.png');
    const png = await fs.readFile(file);
    assert.equal(png.readUInt32BE(16), model.width); assert.equal(png.readUInt32BE(20), model.height);
    const alta = await fs.readFile(await download('#downloadPNGHigh', model.id + '-alta.png'));
    assert.equal(alta.readUInt32BE(16), model.width * 2); assert.equal(alta.readUInt32BE(20), model.height * 2);
    // Compare the live raster against the exact Joana thumbnail reviewed in chat.
    const fidelity = await page.evaluate(async ({ id, data }) => {
      const reference = new Image(); reference.src = document.querySelector('button[data-composition="' + id + '"] img').src.replace('.png', '@2x.png'); await reference.decode();
      const live = document.querySelector('#cardMount canvas');
      const test = document.createElement('canvas'); test.width = reference.naturalWidth; test.height = reference.naturalHeight;
      const ctx = test.getContext('2d'); ctx.drawImage(reference, 0, 0);
      const a = ctx.getImageData(0, 0, test.width, test.height).data;
      const b = live.getContext('2d').getImageData(0, 0, live.width, live.height).data;
      if (a.length !== b.length) throw Error('Dimensões diferentes da referência.');
      let different = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 16) different++;
      // DOM and Canvas rasterize glyph edges differently, especially across
      // Windows and Linux. Compare visible bounds and ink coverage per field,
      // rather than requiring identical antialiasing pixels.
      const { createCard } = await import('/email-card.mjs?v=modelos-20261111');
      const card = await createCard(data, { format: 'email', composition: id, density: 2 });
      const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
      const regions = card.layout.fields.filter(f => f.label).map(f => ({
        id: f.key + ':' + f.y, x: f.align === 'right' ? f.x - f.maxWidth : f.x, y: f.y, width: f.maxWidth, height: f.size * 1.12,
        foreground: card.colors[f.color], background: f.color === 'paper' ? card.colors.accent : card.colors.paper
      }));
      regions.push({ id: 'mark', ...card.layout.mark, foreground: card.layout.mark.family === 'mattar' ? card.colors.paper : card.colors.accent,
        background: card.layout.mark.family === 'mattar' ? card.colors.accent : card.colors.paper });
      const checks = regions.map(region => {
        const bg = rgb(region.background), fg = rgb(region.foreground), delta = bg.map((value, i) => value - fg[i]);
        const divisor = delta.reduce((sum, value) => sum + value * value, 0);
        const scan = pixels => {
          let mass = 0, left = live.width, top = live.height, right = -1, bottom = -1;
          for (let y = Math.max(0, Math.floor(region.y * 2) - 2); y < Math.min(live.height, Math.ceil((region.y + region.height) * 2) + 2); y++) {
            for (let x = Math.max(0, Math.floor(region.x * 2) - 2); x < Math.min(live.width, Math.ceil((region.x + region.width) * 2) + 2); x++) {
              const index = (y * live.width + x) * 4;
              const alpha = Math.max(0, Math.min(1, delta.reduce((sum, value, channel) => sum + (bg[channel] - pixels[index + channel]) * value, 0) / divisor));
              mass += alpha;
              if (alpha > .2) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
            }
          }
          return { mass, bounds: [left, top, right, bottom] };
        };
        const referenceInk = scan(a), liveInk = scan(b);
        return { id: region.id, massRatio: liveInk.mass / referenceInk.mass,
          boundError: Math.max(...liveInk.bounds.map((value, i) => Math.abs(value - referenceInk.bounds[i]))) };
      });
      return { width: live.width, height: live.height, pixelMismatch: different / (live.width * live.height), checks };
    }, { id: model.id, data });
    for (const check of fidelity.checks) {
      assert.ok(check.massRatio > .8 && check.massRatio < 1.2, model.id + '/' + check.id + ': cobertura de tinta ' + check.massRatio);
      assert.ok(check.boundError <= 2, model.id + '/' + check.id + ': posição difere ' + check.boundError + ' pixels em 2×');
    }
    await page.locator('#cardMount').screenshot({ path: path.join(output, model.id + '-preview.png') });
    report.push({ composition: model.id, width: model.width, height: model.height, pngBytes: png.length, altaBytes: alta.length, fidelity });
  }
  // Long names require the intended two-line layout, without shrinking the font.
  await select('m-horizontal');
  await page.locator('#name').fill('Maria Clara de Oliveira');
  await page.waitForFunction(() => document.querySelector('#nameError').textContent.length > 0);
  await select('m-compacto');
  await page.waitForFunction(() => document.querySelector('#nameError').textContent === '');
  await page.locator('#name').fill(data.name);
  await page.waitForFunction(() => document.querySelector('#nameError').textContent === '');
  // The pre-existing digital card stays available and exports at its own size.
  await page.locator('button[data-format=card]').click();
  await page.waitForFunction(() => document.querySelector('#previewStage').dataset.composition === 'card');
  const digital = await fs.readFile(await download('#downloadPNG', 'card.png'));
  assert.equal(digital.readUInt32BE(16), 960); assert.equal(digital.readUInt32BE(20), 560);
  await page.locator('button[data-format=email]').click();
  await select('m-compacto');
  for (const [key, value] of Object.entries({ paper: '#5B463E', ink: '#FFFFFF', accent: '#8FD81B' })) await page.locator('[data-color-key=' + key + '][data-color-value="' + value + '"]').click();
  await page.waitForFunction(() => document.querySelector('#cardMount canvas').getContext('2d').getImageData(0, 0, 1, 1).data[0] === 91);
  const gifFile = await download('#downloadMotion', 'personalized.gif', 180000);
  const gif = await fs.readFile(gifFile);
  assert.equal(gif.subarray(0, 6).toString(), 'GIF89a');
  assert.equal(gif.readUInt16LE(6), 320); assert.equal(gif.readUInt16LE(8), 160);
  assert.ok(gif.length < 1024 * 1024, 'Email GIF exceeds one megabyte');
  let mediaProbe = null;
  if (process.env.EMAIL_SKIP_MEDIA_PROBE !== '1') {
    const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', gifFile], { encoding: 'utf8' }));
    assert.equal(Number(probe.format.duration), 10.8); assert.ok(Number(probe.streams[0].nb_read_frames) > 50);
    mediaProbe = { duration: Number(probe.format.duration), frames: Number(probe.streams[0].nb_read_frames) };
  }
  const htmlFile = await download('#downloadHTML', 'contact.html');
  const html = await fs.readFile(htmlFile, 'utf8');
  assert.ok(html.includes('data:image/png;base64,')); assert.ok(html.includes('mailto:joana@labmattar.com')); assert.ok(html.includes('width="320" height="160"'));
  const contactFile = await download('#downloadContact', 'contact.vcf');
  assert.match(await fs.readFile(contactFile, 'utf8'), /FN:Joana Oliveira/);
  await page.locator('#resetColors').click();
  assert.equal(await page.locator('[data-color-key=paper][aria-pressed=true]').getAttribute('data-color-value'), '#F7F6F2');
  assert.equal(await page.locator('#name').inputValue(), data.name);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const model of models) {
      await select(model.id);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const ratio = await page.locator('#cardMount canvas').evaluate(c => { const r = c.getBoundingClientRect(); return Math.abs(r.width / r.height - c.width / c.height); });
      assert.ok(ratio < .005, 'Prévia distorcida em ' + width + '/' + model.id);
    }
    await page.screenshot({ path: path.join(output, 'viewport-' + width + '.png'), fullPage: true });
  }
  await page.reload();
  await page.waitForSelector('#previewStage[data-composition=m-linha] canvas');
  assert.equal(await page.locator('[data-color-key=paper][aria-pressed=true]').getAttribute('data-color-value'), '#FFFFFF');
  await page.goto(pathToFileURL(htmlFile).href);
  await page.waitForFunction(() => document.querySelector('img')?.complete);
  assert.ok(await page.locator('img').evaluate(image => image.naturalWidth > 0));
  assert.deepEqual(errors, []);
  const result = { status: 'passed', compositions: report, legacyCard: true, gifBytes: gif.length, mediaProbe, viewports: [1440, 390, 320], errors };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally { await browser.close(); }
