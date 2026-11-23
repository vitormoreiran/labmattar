import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// The index is the approved, numeric object name (1..9) in the source GLB.
// The existing optimized dense assets preserve that one-to-one mapping.
const root = document.querySelector("#lm-vasos3d");
if (root) {
  const frame = root.querySelector(".lm-3d-canvas-wrap");
  const canvas = root.querySelector("canvas");
  const placeholder = root.querySelector(".lm-3d-fallback");
  const status = root.querySelector("[data-lm-3d-status]");
  const buttons = [...root.querySelectorAll("[data-vaso]")];
  const assetRoot = root.dataset.assetRoot || "/motion/matriz/models/dense";
  const cache = new Map();
  let active = 1, ticket = 0, ready = false, visible = false, frameId = null;
  let renderer, scene, camera, controls, loader, vesselLayer;
  const announce = (message) => { status.textContent = message; };
  const label = (n) => String(n).padStart(2, "0");

  function size() {
    if (!renderer) return;
    const bounds = frame.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function draw() {
    frameId = null;
    if (!visible || !renderer) return;
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(draw);
  }
  function toggleDrawing(show) {
    visible = show;
    if (!show && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    if (show && renderer && frameId === null) frameId = requestAnimationFrame(draw);
  }

  function fit(object) {
    // Cached objects return to their source pose before measuring and
    // centering. Otherwise choosing 01 -> 02 -> 01 shifts 01 repeatedly.
    object.position.set(0, 0, 0);
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    const dimensions = bounds.getSize(new THREE.Vector3());
    object.position.copy(center).multiplyScalar(-1);
    const fov = (camera.fov * Math.PI) / 180;
    const horizontal = dimensions.x / Math.max(camera.aspect, 0.1);
    const distance = Math.max(dimensions.y, horizontal, dimensions.z) / (2 * Math.tan(fov / 2)) * 1.55;
    camera.position.set(distance * 0.18, distance * 0.06, distance);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = distance * 15;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = distance * 0.65;
    controls.maxDistance = distance * 2.5;
    controls.update();
  }

  function clearVessel() {
    // Clear only the model layer; preserve the camera and approved lighting.
    // Empty immediately, rather than keeping the old 3D on screen beneath
    // the selected vase's temporary 2D silhouette.
    if (vesselLayer) vesselLayer.clear();
    root.dataset.modelCount = "0";
    root.dataset.rendered = "";
    if (renderer) renderer.clear();
  }

  function choose(number) {
    if (!Number.isInteger(number) || number < 1 || number > 9) return;
    active = number;
    const token = ++ticket;
    root.dataset.active = String(number);
    buttons.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.vaso) === number)));
    placeholder.src = "/identidade/vaso_" + label(number) + ".svg";
    root.dataset.ready = "false";
    clearVessel();
    announce("CARREGANDO VASO " + label(number) + "...");
    if (!renderer) return;
    const apply = (object) => {
      // Out-of-order GLB responses must never reintroduce a previous vase.
      if (token !== ticket) return;
      vesselLayer.clear();
      fit(object);
      vesselLayer.add(object);
      // Render the single model BEFORE unveiling the WebGL surface.
      controls.update();
      renderer.render(scene, camera);
      root.dataset.modelCount = String(vesselLayer.children.length);
      root.dataset.rendered = String(number);
      root.dataset.ready = "true";
      announce("VASO " + label(number) + " / ARRASTE PARA GIRAR · ROLE PARA APROXIMAR");
    };
    if (cache.has(number)) return apply(cache.get(number));
    loader.load(
      assetRoot + "/P" + number + ".glb",
      gltf => {
        const object = gltf.scene;
        object.traverse(child => {
          if (!child.isMesh) return;
          child.material = new THREE.MeshStandardMaterial({
            color: 0x181818, metalness: 0.1, roughness: 0.62,
            side: THREE.DoubleSide
          });
        });
        cache.set(number, object);
        apply(object);
      },
      undefined,
      error => {
        console.error("LABMATTAR 3D / failed asset " + number, error);
        if (token === ticket) {
          root.dataset.ready = "false";
          announce("PRÉVIA 3D INDISPONÍVEL PARA O VASO " + label(number));
        }
      }
    );
  }

  function setup() {
    if (ready) return;
    ready = true;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      vesselLayer = new THREE.Group();
      vesselLayer.name = "vaso-ativo";
      scene.add(vesselLayer);
      renderer.autoClear = true;
      scene.add(new THREE.AmbientLight(0xffffff, 2.1));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
      keyLight.position.set(3, 6, 7);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 1.15);
      fillLight.position.set(-4, 1, -3);
      scene.add(fillLight);
      camera = new THREE.PerspectiveCamera(38, 1, 0.01, 200);
      controls = new OrbitControls(camera, canvas);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.autoRotate = false;
      loader = new GLTFLoader();
      size();
      if ("ResizeObserver" in window) new ResizeObserver(size).observe(frame);
      else window.addEventListener("resize", size);
      choose(active);
      toggleDrawing(true);
    } catch (error) {
      console.error("LABMATTAR 3D / WebGL unavailable", error);
      announce("VISUALIZAÇÃO 3D INDISPONÍVEL NESTE NAVEGADOR");
      root.dataset.ready = "false";
    }
  }

  buttons.forEach(button => button.addEventListener("click", () => {
    const number = Number(button.dataset.vaso);
    if (!ready) {
      // setup() already invokes choose(active): avoid fetching P1 and the
      // requested model simultaneously on the first direct interaction.
      active = number;
      setup();
    } else choose(number);
  }));
  if ("IntersectionObserver" in window) {
    const watcher = new IntersectionObserver(entries => {
      const shown = entries.some(entry => entry.isIntersecting);
      if (shown && !ready) setup();
      else if (ready) toggleDrawing(shown && document.visibilityState !== "hidden");
    }, { rootMargin: "240px 0px" });
    watcher.observe(root);
  } else setup();
  document.addEventListener("visibilitychange", () => {
    if (ready) toggleDrawing(document.visibilityState !== "hidden" && root.getBoundingClientRect().top < window.innerHeight);
  });
}
