// Derive a compact Gmail GIF from the approved film, using the same ink
// extraction as the Laboratory. No source project, geometry or timing is edited.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.EMAIL_BROWSER_MODULE || 'playwright');
const system = JSON.parse(await fs.readFile(path.join(root, 'design/identity-system.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'content/motion.json'), 'utf8'));
const motion = catalog.items.find(item => item.id === 'mattar-rhythm');
assert.equal(motion.status, 'approved');
const source = await fs.readFile(path.join(root, 'public', motion.video));
assert.equal(createHash('sha256').update(source).digest('hex'), motion.sha256, 'Approved video changed');
const base = process.env.EMAIL_BASE_URL || 'http://127.0.0.1:8775';
const width = 320, height = 100, fps = 20;
const crop = { x: 220, y: 202, width: 640, height: 200 };
const paper = system.colors.base.paper;
const browser = await chromium.launch({ headless: true, ...(process.env.EMAIL_BROWSER_EXECUTABLE ? { executablePath: process.env.EMAIL_BROWSER_EXECUTABLE } : {}) });
let rendered;
try {
  const response = await fetch(base + motion.video);
  assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), motion.sha256, 'Preview serves a different video');
  const page = await browser.newPage();
  await page.goto(base + '/assinatura-email.html', { waitUntil: 'domcontentloaded' });
  rendered = await page.evaluate(async ({ motion, width, height, fps, crop, paper }) => {
    const { motionInkPixels } = await import('/lab-motion-ink.mjs');
    const video = document.createElement('video');
    video.muted = true; video.preload = 'auto'; video.src = motion.video;
    await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = () => reject(Error('Cannot decode approved video')); });
    const ink = document.createElement('canvas'); ink.width = video.videoWidth; ink.height = video.videoHeight;
    const context = ink.getContext('2d', { willReadFrequently: true });
    const frame = document.createElement('canvas'); frame.width = width; frame.height = height;
    const target = frame.getContext('2d');
    const frames = [], bounds = { left: ink.width, top: ink.height, right: 0, bottom: 0 };
    for (let index = 0; index < Math.round(motion.duration * fps); index++) {
      const time = index / fps;
      if (Math.abs(video.currentTime - time) > 0.00001) {
        const sought = new Promise((resolve, reject) => { video.onseeked = resolve; video.onerror = reject; });
        video.currentTime = time; await sought;
      }
      context.clearRect(0, 0, ink.width, ink.height); context.drawImage(video, 0, 0);
      const image = context.getImageData(0, 0, ink.width, ink.height); motionInkPixels(image.data);
      // Detect clipping across the whole cycle, rather than guessing from a poster.
      for (let y = 0; y < ink.height; y++) for (let x = 0; x < ink.width; x++) {
        if (image.data[(y * ink.width + x) * 4 + 3] < 128) continue;
        bounds.left = Math.min(bounds.left, x); bounds.top = Math.min(bounds.top, y);
        bounds.right = Math.max(bounds.right, x); bounds.bottom = Math.max(bounds.bottom, y);
      }
      context.putImageData(image, 0, 0);
      target.fillStyle = paper; target.fillRect(0, 0, width, height);
      target.drawImage(ink, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
      frames.push(frame.toDataURL('image/png').split(',')[1]);
    }
    video.removeAttribute('src'); video.load();
    return { frames, bounds };
  }, { motion, width, height, fps, crop, paper });
} finally { await browser.close(); }
assert.ok(rendered.bounds.left > crop.x && rendered.bounds.right < crop.x + crop.width && rendered.bounds.top > crop.y && rendered.bounds.bottom < crop.y + crop.height, 'Crop clips the approved motion');
const directory = path.join(root, 'public/identidade/email'); await fs.mkdir(directory, { recursive: true });
const raw = [];
for (const frame of rendered.frames) raw.push(await sharp(Buffer.from(frame, 'base64')).removeAlpha().raw().toBuffer());
const destination = path.join(directory, 'mattar-onda.gif');
await sharp(Buffer.concat(raw), { raw: { width, height: height * raw.length, pageHeight: height, channels: 3 } })
  .gif({ colours: 64, dither: 0, effort: 10, loop: 3, delay: raw.map(() => 1000 / fps), keepDuplicateFrames: true }).toFile(destination);
await fs.writeFile(path.join(directory, 'mattar-onda-poster.png'), Buffer.from(rendered.frames[0], 'base64'));
const bytes = await fs.readFile(destination), encoded = await sharp(bytes, { animated: true }).metadata();
assert.equal(encoded.pageHeight, height); assert.equal(encoded.width, width);
assert.ok(encoded.pages > 1); assert.equal(encoded.delay.reduce((a, b) => a + b, 0), Math.round(motion.duration * 1000));
const evidence = { source: motion.video, sourceSha256: motion.sha256, projectHash: motion.projectHash,
  sourceDuration: motion.duration, sampledFps: fps, sampledFrames: raw.length, crop, sourceInkBounds: rendered.bounds,
  paper, inkRenderer: '/lab-motion-ink.mjs', gif: '/identidade/email/mattar-onda.gif', poster: '/identidade/email/mattar-onda-poster.png',
  width, height, bytes: bytes.length, gifSha256: createHash('sha256').update(bytes).digest('hex'),
  frames: encoded.pages, durationMs: encoded.delay.reduce((a, b) => a + b, 0), iterations: encoded.loop,
  sourceUnchanged: true, firstFrame: 'MATTAR', lastFrame: 'MATTAR' };
await fs.writeFile(path.join(root, 'content/email-signature-motion.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
