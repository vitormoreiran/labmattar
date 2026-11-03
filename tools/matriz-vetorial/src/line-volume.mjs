import * as THREE from "three";

const morphs = new WeakMap();

// A degenerate line and the native mesh share the same vertex topology.
// Three's morph target interpolates the geometry while the normal 3D turn
// continues on the parent. Neither the track scale nor its pivot changes.
export function setLineMorph(model, bounds, baseline, progress = 1) {
  model.updateMatrixWorld(true);
  const inverseRoot = model.matrixWorld.clone().invert();
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    let cached = morphs.get(mesh);
    if (!cached && progress >= 1) return;
    if (!cached || (progress < 1 && cached.baseline !== baseline)) {
      const original = cached?.original ?? mesh.geometry;
      cached?.geometry.dispose();
      const geometry = original.clone();
      const positions = original.getAttribute("position");
      const line = new Float32Array(positions.count * 3);
      const toRoot = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld);
      const toLocal = toRoot.clone().invert();
      const center = (bounds.min.x + bounds.max.x) / 2;
      const radius = Math.max(1e-8, (bounds.max.x - bounds.min.x) / 2);
      const point = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(toRoot);
        const x = Math.max(-1, Math.min(1, (point.x - center) / radius));
        point.set(center + radius * Math.sin((x * Math.PI) / 2), baseline, 0);
        point.applyMatrix4(toLocal).toArray(line, i * 3);
      }
      geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(line, 3)];
      delete geometry.morphAttributes.normal;
      delete geometry.morphAttributes.color;
      geometry.morphTargetsRelative = false;
      mesh.geometry = geometry;
      mesh.updateMorphTargets();
      cached = { original, geometry, baseline };
      morphs.set(mesh, cached);
    }
    mesh.morphTargetInfluences[0] = 1 - progress;
  });
}
