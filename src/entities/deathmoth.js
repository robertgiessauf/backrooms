import * as THREE from "../../vendor/three.module.js";
import { GLTFLoader } from "../../vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/SkeletonUtils.js";

const DEATHMOTH_COUNT = 7;
const DEATHMOTH_CONTACT_RANGE = 0.24;
const DEATHMOTH_DAMAGE = 24;
const DEATHMOTH_LIGHT_ATTRACT_RANGE = 24;

const deathmothAsset = {
  scene: null,
  animations: [],
  loaded: false,
};

export function loadDeathmothModel() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      "assets/models/deathmoth_flying.glb",
      (gltf) => {
        deathmothAsset.scene = gltf.scene;
        deathmothAsset.animations = gltf.animations || [];
        deathmothAsset.loaded = true;
        resolve();
      },
      undefined,
      (error) => {
        console.warn("Failed to load deathmoth_flying.glb; using procedural fallback.", error);
        resolve();
      }
    );
  });
}

export function updateDeathmoths(deps, dt) {
  const { state, player, playerHeight, distance2D, hasClearPath2D, hitsSolidForRadius, flashMessage, resetCurrentLevel } = deps;
  if (!state.level || !levelHasEntity(state.level.def, "deathmoth") || state.inventoryOpen || player.ended) {
    return;
  }

  const torchOn = state.equippedItemId === "torch";
  for (const moth of state.level.deathmoths) {
    moth.animation += dt;
    moth.damageCooldown = Math.max(0, moth.damageCooldown - dt);

    const distance = distance2D(moth.position, player.position);
    const attracted =
      torchOn &&
      distance < DEATHMOTH_LIGHT_ATTRACT_RANGE &&
      hasClearPath2D(player.position.x, player.position.z, moth.position.x, moth.position.z, 0.08);

    if (attracted) {
      moveDeathmothToward(moth, player.position.x, playerHeight + 0.15, player.position.z, moth.attractedSpeed, dt, state, hitsSolidForRadius);
    } else {
      if (!moth.target || distance3D(moth.position, moth.target) < 0.8) {
        moth.target = pickDeathmothTarget(state, moth);
      }
      moveDeathmothToward(moth, moth.target.x, moth.target.y, moth.target.z, moth.roamSpeed, dt, state, hitsSolidForRadius);
    }

    animateDeathmoth(moth, attracted, dt);

    const verticalDistance = Math.abs(moth.position.y - playerHeight);
    if (distance < DEATHMOTH_CONTACT_RANGE && verticalDistance < 1.0 && moth.damageCooldown <= 0) {
      player.health = Math.max(0, player.health - DEATHMOTH_DAMAGE);
      moth.damageCooldown = 0.85;
      flashMessage("The moth burns against your skin.");
      if (player.health <= 0) {
        resetCurrentLevel("The wings fade into the tunnel dark.");
        return;
      }
    }
  }
}

export function addDeathmoths(ctx, deps) {
  const { materials, distance2D } = deps;
  const candidates = ctx.walkables.filter((point) => {
    if (distance2D(point, ctx.start) < ctx.def.tile * 8) {
      return false;
    }
    if (ctx.exitZones.some((zone) => distance2D(point, zone) < ctx.def.tile * 4)) {
      return false;
    }
    return !pointHitsCollider(ctx, point.x, point.z, 0.7);
  });
  const pool = candidates.length > 0 ? candidates : ctx.walkables;
  const count = Math.min(ctx.def.deathmothCount ?? DEATHMOTH_COUNT, pool.length);

  for (let i = 0; i < count; i += 1) {
    const point = pool[Math.floor(ctx.rng() * pool.length)];
    const y = 1.15 + ctx.rng() * Math.max(0.55, ctx.def.ceiling - 1.75);
    const moth = createDeathmoth(ctx, point.x, y, point.z, materials);
    moth.target = pickInitialDeathmothTarget(ctx, moth.position);
    ctx.group.add(moth.group);
    ctx.deathmoths.push(moth);
  }
}

function levelHasEntity(def, entityId) {
  return Array.isArray(def.entities) && def.entities.includes(entityId);
}

function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = (a.y || 0) - (b.y || 0);
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function moveDeathmothToward(moth, x, y, z, speed, dt, state, hitsSolidForRadius) {
  const dx = x - moth.position.x;
  const dy = y - moth.position.y;
  const dz = z - moth.position.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length < 0.001) {
    return;
  }

  const step = Math.min(speed * dt, length);
  const nextX = moth.position.x + (dx / length) * step;
  const nextY = THREE.MathUtils.clamp(moth.position.y + (dy / length) * step, 0.95, state.level.def.ceiling - 0.45);
  const nextZ = moth.position.z + (dz / length) * step;

  if (!hitsSolidForRadius(nextX, nextZ, 0.24)) {
    moth.position.set(nextX, nextY, nextZ);
    moth.group.position.copy(moth.position);
    moth.group.rotation.y = Math.atan2(dx, dz);
  } else {
    moth.target = null;
  }
}

function animateDeathmoth(moth, attracted, dt) {
  if (moth.modelBased) {
    if (moth.mixer) {
      moth.mixer.timeScale = attracted ? 1.55 : 1.0;
      moth.mixer.update(dt);
    }
    moth.group.position.y = moth.position.y + Math.sin(moth.animation * 4.2 + moth.phase) * 0.08;
    moth.modelRoot.rotation.x = Math.sin(moth.animation * 5.5) * 0.055;
    moth.modelRoot.rotation.z = Math.sin(moth.animation * 3.2 + moth.phase) * 0.045;
    return;
  }

  const wing = Math.sin(moth.animation * (attracted ? 18 : 12)) * (attracted ? 0.82 : 0.58);
  moth.leftWing.rotation.y = -0.48 - Math.abs(wing);
  moth.rightWing.rotation.y = 0.48 + Math.abs(wing);
  moth.leftLowerWing.rotation.y = -0.38 - Math.abs(wing) * 0.72;
  moth.rightLowerWing.rotation.y = 0.38 + Math.abs(wing) * 0.72;
  moth.group.position.y = moth.position.y + Math.sin(moth.animation * 4.2 + moth.phase) * 0.08;
  moth.body.rotation.x = Math.sin(moth.animation * 5.5) * 0.08;
}

function pickDeathmothTarget(state, moth) {
  const level = state.level;
  if (!level.walkables.length) {
    return { x: moth.position.x, y: moth.position.y, z: moth.position.z };
  }
  const point = level.walkables[Math.floor(level.rng() * level.walkables.length)];
  return {
    x: point.x,
    y: 1.15 + level.rng() * Math.max(0.55, level.def.ceiling - 1.75),
    z: point.z,
  };
}

function pointHitsCollider(ctx, x, z, radius) {
  for (const box of ctx.colliders) {
    const cx = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const cz = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    const distanceSq = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    if (distanceSq < radius * radius) {
      return true;
    }
  }
  return false;
}

function pickInitialDeathmothTarget(ctx, position) {
  if (!ctx.walkables.length) {
    return { x: position.x, y: position.y, z: position.z };
  }
  const point = ctx.walkables[Math.floor(ctx.rng() * ctx.walkables.length)];
  return {
    x: point.x,
    y: 1.15 + ctx.rng() * Math.max(0.55, ctx.def.ceiling - 1.75),
    z: point.z,
  };
}

function createDeathmoth(ctx, x, y, z, materials) {
  if (deathmothAsset.scene) {
    return createModelDeathmoth(ctx, x, y, z);
  }
  return createProceduralDeathmoth(ctx, x, y, z, materials);
}

function createModelDeathmoth(ctx, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ctx.rng() * Math.PI * 2;

  const model = cloneSkeleton(deathmothAsset.scene);
  const mixer = deathmothAsset.animations.length > 0 ? new THREE.AnimationMixer(model) : null;
  const actions = [];

  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material) {
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => normalizeDeathmothModelMaterial(material))
          : normalizeDeathmothModelMaterial(object.material);
      }
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const targetSize = 0.025 + ctx.rng() * 0.008;
  const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

  group.add(model);

  if (mixer) {
    for (const clip of deathmothAsset.animations) {
      const action = mixer.clipAction(clip);
      action.reset().play();
      actions.push(action);
    }
  }

  return {
    group,
    modelRoot: model,
    mixer,
    actions,
    position: new THREE.Vector3(x, y, z),
    target: null,
    roamSpeed: 1.55,
    attractedSpeed: 5.4,
    damageCooldown: 0,
    animation: ctx.rng() * Math.PI * 2,
    phase: ctx.rng() * Math.PI * 2,
    modelBased: true,
  };
}

function normalizeDeathmothModelMaterial(sourceMaterial) {
  const material = sourceMaterial.clone();
  material.side = sourceMaterial.side ?? THREE.DoubleSide;
  if (!material.map) {
    material.color?.set(0x8b6a3f);
  }
  material.emissiveIntensity = material.emissiveMap ? 0.06 : 0;
  material.roughness = Math.max(material.roughness ?? 0.78, 0.62);
  material.metalness = 0;
  material.envMapIntensity = 0.08;
  material.toneMapped = true;
  if (material.specularColor) {
    material.specularColor.set(0x333333);
  }
  if ("specularIntensity" in material) {
    material.specularIntensity = 0.07;
  }
  material.needsUpdate = true;
  return material;
}

function createProceduralDeathmoth(ctx, x, y, z, materials) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ctx.rng() * Math.PI * 2;
  const scale = 0.68 + ctx.rng() * 0.18;
  group.scale.setScalar(scale);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.62, 5, 8), materials.deathmothBody);
  body.rotation.x = Math.PI * 0.5;
  body.castShadow = true;
  group.add(body);

  const leftWing = createDeathmothWing(-1, 0.055, 0.018, 0.03, 0.96, 0.54, -0.22, materials);
  const rightWing = createDeathmothWing(1, -0.055, 0.018, 0.03, 0.96, 0.54, 0.22, materials);
  const leftLowerWing = createDeathmothWing(-1, 0.026, -0.018, -0.22, 0.7, 0.4, -0.72, materials);
  const rightLowerWing = createDeathmothWing(1, -0.026, -0.018, -0.22, 0.7, 0.4, 0.72, materials);
  group.add(leftWing, rightWing, leftLowerWing, rightLowerWing);

  return {
    group,
    body,
    leftWing,
    rightWing,
    leftLowerWing,
    rightLowerWing,
    position: new THREE.Vector3(x, y, z),
    target: null,
    roamSpeed: 1.55,
    attractedSpeed: 5.4,
    damageCooldown: 0,
    animation: ctx.rng() * Math.PI * 2,
    phase: ctx.rng() * Math.PI * 2,
    modelBased: false,
  };
}

function createDeathmothWing(side, pivotX, pivotY, pivotZ, width, height, rotationZ, materials) {
  const root = new THREE.Group();
  root.position.set(pivotX, pivotY, pivotZ);
  root.rotation.z = rotationZ;

  const wing = new THREE.Mesh(new THREE.PlaneGeometry(width, height), materials.deathmothWing);
  wing.position.x = side * width * 0.5;
  wing.rotation.x = -0.12;
  wing.rotation.z = side < 0 ? Math.PI : 0;
  root.add(wing);
  return root;
}
