import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { gsap } from "gsap";
import {
  loadMorphEngine,
  parseSvg,
  canonicalizeTransition,
  interpolateTransition,
  interpolateNativePaths,
  pointsPath,
} from "./vector-engine.tsx";
import { poseAt } from "./timeline.mjs";
import { collapseUnpairedChannels } from "./morph-continuity.mjs";
import { entranceAt, exitAt } from "./entrance.mjs";
import { setLineMorph } from "./line-volume.mjs";
const NS = "http://www.w3.org/2000/svg",
  SPAN = 3.3,
  UNIT = 1000 / SPAN;
gsap.registerPlugin(MorphSVGPlugin);
export class Stage {
  constructor(host, assets, onError) {
    this.host = host;
    this.assets = new Map(assets.map((a) => [a.id, a]));
    this.onError = onError;
    this.models = new Map();
    this.promises = new Map();
    this.profiles = new Map();
    this.bridges = new Map();
    this.entranceBounds = new Map();
    this.instances = new Map();
    this.loader = new GLTFLoader();
    this.style = "silhouette";
    this.geometry = "volume";
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute("aria-label", "Prévia espacial das formas");
    this.overlay = document.createElementNS(NS, "svg");
    this.overlay.setAttribute("viewBox", "0 0 1000 1000");
    this.overlay.setAttribute("aria-label", "Passagens vetoriais do roteiro");
    this.overlay.classList.add("morph-overlay");
    host.append(this.renderer.domElement, this.overlay);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x35313f, 2.4));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-3, 4, 5);
    this.scene.add(light);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.width = width;
    this.height = height;
    this.setSize(width, height);
    this.lastRender?.();
  }
  setSize(width, height) {
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = (-SPAN / 2) * Math.max(1, aspect);
    this.camera.right = -this.camera.left;
    this.camera.top = (SPAN / 2) * Math.max(1, 1 / aspect);
    this.camera.bottom = -this.camera.top;
    this.camera.updateProjectionMatrix();
  }
  async model(id, geometry = this.geometry) {
    const key = id + "@" + geometry;
    if (this.models.has(key)) return this.models.get(key);
    if (this.promises.has(key)) return this.promises.get(key);
    const asset = this.assets.get(id);
    if (!asset) throw new Error(`Forma desconhecida: ${id}`);
    const path = geometry === "volume" && asset.volumeModel ? asset.volumeModel : asset.model;
    const promise = this.loader
      .loadAsync(path)
      .then((gltf) => {
        const object = gltf.scene;
        object.traverse((o) => {
          if (o.isMesh) {
            o.frustumCulled = false;
            o.morphTargetInfluences?.fill(0);
            o.material = new THREE.MeshBasicMaterial({ color: "#181814", side: THREE.DoubleSide });
          }
        });
        this.models.set(key, object);
        return object;
      })
      .catch((error) => {
        this.promises.delete(key);
        throw new Error(`Não foi possível carregar a forma ${id}. Recarregue a página.`);
      });
    this.promises.set(key, promise);
    return promise;
  }
  async profile(id, geometry = this.geometry) {
    const key = id + "@" + geometry;
    if (this.profiles.has(key)) return this.profiles.get(key);
    await loadMorphEngine();
    const a = this.assets.get(id),
      path =
        id === "M"
          ? "./library/M-native-profile.svg"
          : geometry === "volume" && a.kind === "picto"
            ? `./library/${id}-volume-profile.svg`
            : a.profile,
      response = await fetch(path);
    if (!response.ok) throw new Error(`Perfil ${id} indisponível`);
    const parsed = await parseSvg(await response.text(), id);
    this.profiles.set(key, parsed);
    return parsed;
  }
  async prepare(compiled) {
    const geometry = this.geometry;
    const ids = new Set();
    for (const c of compiled.tracks) {
      ids.add(c.startPose.asset);
      for (const s of c.segments) {
        ids.add(s.from.asset);
        ids.add(s.to.asset);
      }
    }
    await Promise.all([...ids].map((id) => this.model(id, geometry)));
    await Promise.all(
      compiled.tracks
        .filter((c) => c.entrance)
        .map((c) => this.prepareEntrance(c.track.startAsset, geometry)),
    );
    await Promise.all(
      compiled.tracks
        .filter((c) => c.exit)
        .map((c) => this.prepareEntrance(c.endPose.asset, geometry)),
    );
    await Promise.all(
      compiled.tracks.flatMap((c) =>
        c.segments
          .filter((s) => s.type === "morph")
          .map((s) => this.bridge(s.from.asset, s.to.asset, geometry)),
      ),
    );
  }
  boundsAt(id, angle = 90, geometry = this.geometry) {
    const model = this.models.get(id + "@" + geometry);
    const clone = model.clone(true);
    clone.rotation.y = THREE.MathUtils.degToRad(angle);
    clone.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(clone, true);
  }
  async prepareEntrance(id, geometry) {
    const key = id + "@" + geometry;
    if (!this.entranceBounds.has(key)) this.entranceBounds.set(key, this.boundsAt(id, 0, geometry));
  }
  entranceLine(track, entrance, phase, color, pose) {
    const bounds = this.entranceBounds.get(pose.asset + "@" + this.geometry);
    if (!bounds || phase.morph >= 0.2) return null;
    const cos = Math.cos(THREE.MathUtils.degToRad(pose.angle));
    const left = 500 + (track.position.x + bounds.min.x * track.scale * cos) * UNIT;
    const right = 500 + (track.position.x + bounds.max.x * track.scale * cos) * UNIT;
    const baseline = 500 - entrance.baseline * UNIT;
    const line = document.createElementNS(NS, "path");
    line.setAttribute("d", `M${left} ${baseline} H${left + (right - left) * phase.line}`);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "1");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.setAttribute("opacity", String(1 - phase.morph * 5));
    return line;
  }
  mappedProfile(asset, box) {
    const svg = document.createElementNS(NS, "svg");
    svg.style.cssText =
      "position:absolute;left:-10000px;top:0;width:1000px;height:1000px;visibility:hidden";
    const group = document.createElementNS(NS, "g");
    svg.append(group);
    document.body.append(svg);
    for (const contour of asset.contours) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", contour);
      group.append(p);
    }
    const bounds = group.getBBox();
    svg.remove();
    const sx = ((box.max.x - box.min.x) * UNIT) / (bounds.width || 1),
      sy = ((box.max.y - box.min.y) * UNIT) / (bounds.height || 1),
      tx = 500 + box.min.x * UNIT - bounds.x * sx,
      ty = 500 - box.max.y * UNIT - bounds.y * sy;
    const contours = asset.contours.map((d) => {
      const raw = MorphSVGPlugin.stringToRawPath(d);
      for (const segment of raw) {
        for (let i = 0; i < segment.length; i += 2) {
          segment[i] = segment[i] * sx + tx;
          segment[i + 1] = segment[i + 1] * sy + ty;
        }
      }
      return MorphSVGPlugin.rawPathToString(raw);
    });
    return { ...asset, contours, viewBox: "0 0 1000 1000" };
  }
  async bridge(from, to, geometry = this.geometry) {
    const key = from + ">" + to + "@" + geometry;
    if (this.bridges.has(key)) return this.bridges.get(key);
    await Promise.all([this.model(from, geometry), this.model(to, geometry)]);
    const [a, b] = await Promise.all([this.profile(from, geometry), this.profile(to, geometry)]);
    const source = this.mappedProfile(a, this.boundsAt(from, 90, geometry)),
      target = this.mappedProfile(b, this.boundsAt(to, 90, geometry));
    const reverse = this.bridges.get(to + ">" + from + "@" + geometry);
    const matrix =
      reverse && [from, to].includes("M")
        ? {
            ...reverse.matrix,
            a: reverse.matrix.b,
            b: reverse.matrix.a,
            groupsA: reverse.matrix.groupsB,
            groupsB: reverse.matrix.groupsA,
            holesA: reverse.matrix.holesB,
            holesB: reverse.matrix.holesA,
            sourceIndices: reverse.matrix.targetIndices,
            targetIndices: reverse.matrix.sourceIndices,
            renderGroups: reverse.matrix.groupsA,
            nativePaths: undefined,
          }
        : collapseUnpairedChannels(
            canonicalizeTransition(source, target, 1400, "raw", 0, true, 1, {}, {}),
          );
    const result = { matrix, source, target };
    this.bridges.set(key, result);
    return result;
  }
  instance(trackId, asset) {
    const key = trackId + ":" + asset + "@" + this.geometry;
    let model = this.instances.get(key);
    if (!model) {
      const original = this.models.get(asset + "@" + this.geometry);
      if (!original) return null;
      model = original.clone(true);
      model.traverse((o) => {
        if (o.isMesh) o.material = o.material.clone();
      });
      this.instances.set(key, model);
      this.scene.add(model);
    }
    return model;
  }
  setMaterial(model, color) {
    model.traverse((o) => {
      if (!o.isMesh) return;
      const shaded = this.style === "shaded";
      if (shaded && !(o.material instanceof THREE.MeshStandardMaterial)) {
        o.material.dispose();
        o.material = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.55,
          metalness: 0.06,
          side: THREE.DoubleSide,
        });
      } else if (!shaded && !(o.material instanceof THREE.MeshBasicMaterial)) {
        o.material.dispose();
        o.material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      }
      o.material.color.set(color);
    });
  }
  resetFrame() {
    for (const m of this.instances.values()) m.visible = false;
    this.overlay.replaceChildren();
  }
  drawPose(track, pose, color, opening) {
    const m = this.instance(track.id, pose.asset);
    if (!m) return;
    m.visible = true;
    m.rotation.y = THREE.MathUtils.degToRad(pose.angle);
    m.position.set(track.position.x, track.position.y, 0);
    m.scale.setScalar(track.scale);
    this.setMaterial(m, color);
    if (opening) {
      const bounds = this.entranceBounds.get(pose.asset + "@" + this.geometry);
      const baseline = (opening.entrance.baseline - track.position.y) / track.scale;
      setLineMorph(m, bounds, baseline, opening.phase.morph);
    } else setLineMorph(m, null, null, 1);
  }
  morphGroup(track, state, color) {
    const key = state.from.asset + ">" + state.to.asset + "@" + this.geometry,
      bridge = this.bridges.get(key);
    if (!bridge) return null;
    const matrix = bridge.matrix,
      paths =
        interpolateNativePaths(matrix, state.q, "linear", [0.45, 0, 0.55, 1], 0) ??
        interpolateTransition(matrix, state.q, "linear", [0.45, 0, 0.55, 1], 0).map((points) =>
          pointsPath([points]),
        );
    const g = document.createElementNS(NS, "g"),
      groups = matrix.renderGroups ?? matrix.groupsA ?? paths.map((_, i) => i);
    g.setAttribute(
      "transform",
      `translate(${track.position.x * UNIT} ${-track.position.y * UNIT}) translate(500 500) scale(${track.scale}) translate(-500 -500)`,
    );
    for (const group of [...new Set(groups)].reverse()) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", paths.filter((_, i) => groups[i] === group).join(" "));
      p.setAttribute("fill", color);
      p.setAttribute("fill-rule", "evenodd");
      g.append(p);
    }
    return g;
  }
  renderProject(compiled, time, color) {
    this.lastRender = () => this.renderProject(compiled, time, color);
    this.resetFrame();
    for (const c of compiled.tracks) {
      const track = c.track;
      const appearing = entranceAt(c.entrance, time);
      const entrance = appearing ?? exitAt(c.exit, time);
      const timing = appearing ? c.entrance : c.exit;
      if (entrance) {
        if (!entrance.hidden) {
          const state = poseAt(c, time);
          const pose = state.pose ?? state.from;
          this.drawPose(track, pose, color, { entrance: timing, phase: entrance });
          const line = this.entranceLine(track, timing, entrance, color, pose);
          if (line) this.overlay.append(line);
        }
        continue;
      }
      const state = poseAt(c, time);
      if (state.type === "morph") {
        if (state.local < 0.001) this.drawPose(track, state.from, color);
        else if (state.local > 0.999) this.drawPose(track, state.to, color);
        else {
          const g = this.morphGroup(track, state, color);
          if (g) this.overlay.append(g);
        }
      } else this.drawPose(track, state.pose, color);
    }
    this.renderer.render(this.scene, this.camera);
  }
  async preview(id, angle, color) {
    await this.model(id);
    this.lastRender = () => this.preview(id, angle, color);
    this.resetFrame();
    this.drawPose(
      { id: "preview", position: { x: 0, y: 0 }, scale: 1 },
      { asset: id, angle },
      color,
    );
    this.renderer.render(this.scene, this.camera);
  }
  async composite(compiled, time, color, background, canvas) {
    this.renderProject(compiled, time, color);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.renderer.domElement, 0, 0, canvas.width, canvas.height);
    if (this.overlay.childElementCount) {
      const markup = `<svg xmlns="${NS}" viewBox="0 0 1000 1000" width="${canvas.width}" height="${canvas.height}">${this.overlay.innerHTML}</svg>`,
        url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }
  destroy() {
    this.observer.disconnect();
    this.renderer.dispose();
  }
}
