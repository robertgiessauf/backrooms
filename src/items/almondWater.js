import * as THREE from "../../vendor/three.module.js";
import { GLTFLoader } from "../../vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/SkeletonUtils.js";

const almondWaterAsset = {
  scene: null,
  loaded: false,
};

export function loadAlmondWaterModel() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      "assets/models/almond_water.glb",
      (gltf) => {
        almondWaterAsset.scene = gltf.scene;
        almondWaterAsset.loaded = true;
        resolve();
      },
      undefined,
      (error) => {
        console.warn("Failed to load almond_water.glb; using procedural fallback.", error);
        resolve();
      }
    );
  });
}

export function createAlmondWaterModel(ctx, materials) {
  if (almondWaterAsset.scene) {
    return createModelPickup(ctx);
  }
  return createFallbackPickup(materials);
}

function createModelPickup(ctx) {
  const group = new THREE.Group();
  const model = cloneSkeleton(almondWaterAsset.scene);

  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material) {
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => normalizeModelMaterial(material))
          : normalizeModelMaterial(object.material);
      }
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const targetHeight = 0.48;
  const scale = targetHeight / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  model.rotation.y = ctx.rng() * Math.PI * 2;
  group.add(model);
  return group;
}

function normalizeModelMaterial(sourceMaterial) {
  const material = sourceMaterial.clone();
  material.roughness = Math.max(material.roughness ?? 0.45, 0.38);
  material.metalness = Math.min(material.metalness ?? 0, 0.18);
  material.envMapIntensity = 0.12;
  material.toneMapped = true;
  material.needsUpdate = true;
  return material;
}

function createFallbackPickup(materials) {
  const group = new THREE.Group();

  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.32, 14), materials.almondWater);
  bottle.castShadow = true;
  bottle.position.y = 0.16;
  group.add(bottle);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 12), materials.waterJug);
  neck.position.y = 0.4;
  group.add(neck);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.035, 12), materials.torchHead);
  cap.position.y = 0.5;
  group.add(cap);

  return group;
}
