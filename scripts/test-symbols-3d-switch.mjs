// Deterministic regression: one vase at a time, even with concurrent GLB loads.
// Runs without a browser, network or GPU; real WebGL is checked separately.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const file = process.env.GALLERY_SOURCE || 'tools/matriz-vetorial/gallery/symbols-3d-gallery.js';
const source = readFileSync(file, 'utf8').replace(/^import\s+[^\n]+\n/gm, '');
assert.match(source, /const root\s*=\s*document\.querySelector/);
const css = readFileSync(process.env.SYMBOLS_CSS || 'public/manual-symbols.css', 'utf8');
assert.match(css, /\.lm-3d-stage\[data-ready=\"false\"\]\s+\.lm-3d-canvas-wrap canvas\s*\{\s*visibility:\s*hidden\s*\}/,
  'The stale WebGL canvas must stay hidden while the next vase loads');

function harness(autoObserve = true) {
  const pending = [];
  const frames = [];
  const failures = [];
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { return this.set(v.x, v.y, v.z); }
    multiplyScalar(n) { return this.set(this.x * n, this.y * n, this.z * n); }
    toArray() { return [this.x, this.y, this.z]; }
  }
  class Group {
    constructor() { this.children = []; this.position = new Vector3(); this.name = ''; }
    add(node) { this.children.push(node); }
    clear() { this.children.length = 0; }
    updateMatrixWorld() {}
    traverse(fn) { fn(this); for (const child of this.children) fn(child); }
  }
  class Scene extends Group {}
  class Box3 {
    setFromObject(object) { this.object = object; return this; }
    getCenter(out) { return out.set(1, 2, 3); }
    getSize(out) { return out.set(2, 4, 3); }
  }
  class WebGLRenderer {
    setPixelRatio() {}
    setSize() {}
    clear() { frames.push([]); }
    render(scene) {
      const layer = scene.children.find(child => child.name === 'vaso-ativo');
      frames.push(layer?.children.map(child => child.name) ?? []);
    }
  }
  class Light { constructor() { this.position = new Vector3(); } }
  class Camera {
    constructor(fov) { this.fov = fov; this.aspect = 1; this.position = new Vector3(); }
    updateProjectionMatrix() {}
  }
  class Controls {
    constructor() { this.target = new Vector3(); }
    update() {}
  }
  class GLTFLoader {
    load(url, resolve, _progress, reject) {
      const match = url.match(/\/P(\d+)\.glb$/);
      assert.ok(match, 'GLB path must use the numeric approved name');
      pending.push({ number: Number(match[1]), resolve, reject });
    }
  }
  const buttons = Array.from({ length: 9 }, (_, i) => ({
    dataset: { vaso: String(i + 1) }, attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(_name, handler) { this.click = handler; }
  }));
  const fallback = { src: '' };
  const status = { textContent: '' };
  const frame = { getBoundingClientRect: () => ({ width: 640, height: 480 }) };
  const root = {
    dataset: {},
    querySelector(name) {
      return ({ '.lm-3d-canvas-wrap': frame, canvas: {}, '.lm-3d-fallback': fallback,
        '[data-lm-3d-status]': status })[name] ?? null;
    },
    querySelectorAll() { return buttons; },
    getBoundingClientRect() { return { top: 0 }; }
  };
  const document = {
    querySelector(name) { return name === '#lm-vasos3d' ? root : null; },
    visibilityState: 'visible', addEventListener() {}
  };
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe() { if (autoObserve) this.callback([{ isIntersecting: true }]); }
  }
  const window = { devicePixelRatio: 1, innerHeight: 900, addEventListener() {}, IntersectionObserver };
  const THREE = {
    Vector3, Group, Scene, Box3, WebGLRenderer, AmbientLight: Light,
    DirectionalLight: Light, PerspectiveCamera: Camera,
    MeshStandardMaterial: class {}, DoubleSide: 2, SRGBColorSpace: 'srgb'
  };
  vm.runInNewContext(source, {
    THREE, GLTFLoader, OrbitControls: Controls, document, window,
    IntersectionObserver, requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}, console: { error(...messages) { failures.push(messages); } }
  }, { filename: file, timeout: 2500 });
  const complete = number => {
    const index = pending.findIndex(item => item.number === number);
    assert.notEqual(index, -1, 'Pending model: ' + number);
    const { resolve } = pending.splice(index, 1)[0];
    const model = new Group(); model.name = 'P' + number;
    model.add({ isMesh: true, material: null });
    resolve({ scene: model });
    return model;
  };
  const fail = number => {
    const index = pending.findIndex(item => item.number === number);
    assert.notEqual(index, -1, 'Pending model: ' + number);
    pending.splice(index, 1)[0].reject(new Error('Offline fixture: expected failure'));
  };
  const select = number => buttons[number - 1].click();
  const single = number => {
    assert.equal(root.dataset.active, String(number));
    assert.equal(root.dataset.rendered, String(number));
    assert.equal(root.dataset.modelCount, '1');
    assert.equal(root.dataset.ready, 'true');
    assert.equal(buttons[number - 1].attributes['aria-pressed'], 'true');
    assert.ok(frames.every(frame => frame.length <= 1), '3D models overlapped');
  };
  return { root, pending, frames, failures, fallback, status, select, complete, fail, single };
}

// Concurrent loads can complete out of order without ever adding old objects.
const app = harness();
assert.deepEqual(app.pending.map(item => item.number), [1]);
app.select(2); app.select(3);
assert.equal(app.root.dataset.modelCount, '0', 'Clear previous model at selection time');
app.complete(2); app.complete(1);
assert.equal(app.root.dataset.modelCount, '0', 'Stale promises must not display');
app.complete(3); app.single(3);

// Returning to a cached object must preserve its position and single instance.
app.select(1); app.single(1);
app.select(3); app.single(3);
app.select(1); app.single(1);
assert.ok(app.frames.every(frame => frame.length <= 1));

// Selecting a new uncached vase immediately hides and clears the old scene.
app.select(4);
assert.equal(app.root.dataset.modelCount, '0');
assert.equal(app.root.dataset.ready, 'false');
assert.equal(app.root.dataset.rendered, '');
assert.equal(app.fallback.src, '/identidade/vaso_04.svg');
app.complete(4); app.single(4);

// First interaction should fetch only the explicitly selected vase.
const manual = harness(false);
assert.equal(manual.pending.length, 0);
manual.select(7);
assert.deepEqual(manual.pending.map(item => item.number), [7]);
manual.complete(7); manual.single(7);

// Failed loads must not resurrect any previously visible model.
const errorApp = harness();
errorApp.complete(1); errorApp.single(1);
errorApp.select(8); errorApp.fail(8);
assert.equal(errorApp.root.dataset.modelCount, '0');
assert.equal(errorApp.root.dataset.ready, 'false');
errorApp.select(9); errorApp.complete(9); errorApp.single(9);

// A later choice can invalidate an older completion, even after an error.
const quick = harness();
quick.select(8); quick.select(9);
quick.complete(1); quick.complete(9); quick.single(9);
quick.complete(8); quick.single(9);
assert.ok(quick.frames.every(frame => frame.length <= 1));
console.log('REVIEW1 / 3D: 6 regression scenarios passed; one vase per scene.');
