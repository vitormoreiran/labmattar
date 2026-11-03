import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { WebGLMorphtargets } from "three/src/renderers/webgl/WebGLMorphtargets.js";
import { setLineMorph } from "../src/line-volume.mjs";

test("native meshes unfold from a line while turning, and restore their exact vertices", async () => {
  for (const id of ["P8", "P3", "P4", "P2", "P9", "P5"]) {
    const bytes = await readFile(new URL(`../static/models/dense/${id}.glb`, import.meta.url));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const { scene: model } = await new GLTFLoader().parseAsync(buffer, "");
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model, true);
    const samples = [];
    model.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const count = mesh.geometry.attributes.position.count;
      for (const index of [0, Math.floor(count / 3), count - 1]) {
        const point = mesh.getVertexPosition(index, new THREE.Vector3());
        samples.push({
          mesh,
          index,
          local: point.clone(),
          root: point.applyMatrix4(mesh.matrixWorld),
        });
      }
    });
    setLineMorph(model, bounds, -1, 0);
    const gpuTargets = WebGLMorphtargets({}, { maxTextureSize: 4096 }, {});
    model.traverse((mesh) => {
      if (mesh.isMesh)
        gpuTargets.update(mesh, mesh.geometry, {
          getUniforms: () => ({ setValue: () => {} }),
        });
    });
    const inverse = model.matrixWorld.clone().invert();
    for (const sample of samples) {
      const p = sample.mesh
        .getVertexPosition(sample.index, new THREE.Vector3())
        .applyMatrix4(sample.mesh.matrixWorld)
        .applyMatrix4(inverse);
      assert.ok(Math.abs(p.y + 1) < 1e-5, id + ": starts on baseline");
      assert.ok(Math.abs(p.z) < 1e-5, id + ": starts as a line");
      sample.line = p;
    }
    model.rotation.y = Math.PI / 4;
    setLineMorph(model, bounds, -1, 0.5);
    const rotatedInverse = model.matrixWorld.clone().invert();
    for (const sample of samples) {
      const p = sample.mesh
        .getVertexPosition(sample.index, new THREE.Vector3())
        .applyMatrix4(sample.mesh.matrixWorld)
        .applyMatrix4(rotatedInverse);
      assert.ok(
        p.distanceTo(sample.root.clone().add(sample.line).multiplyScalar(0.5)) < 1e-5,
        id + ": native 3D turn during deformation",
      );
    }
    setLineMorph(model, null, null, 1);
    for (const sample of samples) {
      const p = sample.mesh.getVertexPosition(sample.index, new THREE.Vector3());
      assert.ok(p.distanceTo(sample.local) < 1e-8, id + ": exact native endpoint");
    }
    assert.deepEqual(model.scale.toArray(), [1, 1, 1]);
  }
});

test("meshes without an entrance retain their original shared geometry", () => {
  const model = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  model.add(mesh);
  const geometry = mesh.geometry;
  setLineMorph(model, null, null, 1);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.morphTargetInfluences, undefined);
});
