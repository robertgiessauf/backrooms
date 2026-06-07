import * as THREE from "../../vendor/three.module.js";
import { GLTFLoader } from "../../vendor/GLTFLoader.js";
import { clone as cloneSkeleton } from "../../vendor/SkeletonUtils.js";

const HOUND_ALERT_RANGE = 20;
const HOUND_ATTACK_RANGE = 1.2;
const HOUND_ATTACK_DAMAGE = 40;
const HOUND_TORCH_STUN_SECONDS = 4.2;
const HOUND_STUN_CRAWL_SPEED = 0.28;

const houndAsset = {
  scene: null,
  animations: [],
  loaded: false,
};

export function loadHoundModel() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      "assets/models/hound_walking.glb",
      (gltf) => {
        houndAsset.scene = gltf.scene;
        houndAsset.animations = gltf.animations || [];
        houndAsset.loaded = true;
        resolve();
      },
      undefined,
      (error) => {
        console.warn("Failed to load hound_walking.glb; using procedural fallback.", error);
        resolve();
      }
    );
  });
}

export function updateHounds(deps, dt) {
  const { state, player, camera, cameraDirection, tempVector, torchRange, distance2D, hitsSolidForRadius, flashMessage, resetCurrentLevel } = deps;
  if (!state.level || state.level.hounds.length === 0 || state.inventoryOpen || player.ended) {
    return;
  }

  for (const hound of state.level.hounds) {
    hound.attackCooldown = Math.max(0, hound.attackCooldown - dt);
    const dx = player.position.x - hound.position.x;
    const dz = player.position.z - hound.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const lit = isHoundLit({ state, player, camera, cameraDirection, tempVector, torchRange }, hound, distance);

    if (lit) {
      hound.freezeTimer = HOUND_TORCH_STUN_SECONDS;
    } else {
      hound.freezeTimer = Math.max(0, hound.freezeTimer - dt);
    }

    if (hound.freezeTimer > 0) {
      hound.mode = "frozen";
      moveHoundToward(hound, player.position.x, player.position.z, HOUND_STUN_CRAWL_SPEED, dt, state, player, hitsSolidForRadius);
      animateHound(hound, dt, true);
      continue;
    }

    if (distance < HOUND_ALERT_RANGE || hound.mode === "hunt") {
      hound.mode = "hunt";
      moveHoundToward(hound, player.position.x, player.position.z, hound.huntSpeed, dt, state, player, hitsSolidForRadius);
      if (distance < HOUND_ATTACK_RANGE && hound.attackCooldown <= 0) {
        player.health = Math.max(0, player.health - HOUND_ATTACK_DAMAGE);
        hound.attackCooldown = 1.2;
        flashMessage("The hound bites hard.");
        if (player.health <= 0) {
          resetCurrentLevel("You wake on the cold concrete.");
          return;
        }
      }
    } else {
      hound.mode = "roam";
      if (!hound.target || distance2D(hound.target, hound.position) < 0.8) {
        hound.target = pickHoundRoamTarget(state, player);
      }
      moveHoundToward(hound, hound.target.x, hound.target.z, hound.roamSpeed, dt, state, player, hitsSolidForRadius);
    }

    animateHound(hound, dt, false);
  }
}

export function addHound(ctx, x, z, materials) {
  if (houndAsset.scene) {
    addModelHound(ctx, x, z);
    return;
  }
  addProceduralHound(ctx, x, z, materials);
}

function isHoundLit(deps, hound, distance) {
  const { state, player, camera, cameraDirection, tempVector, torchRange } = deps;
  if (state.equippedItemId !== "torch" || distance > torchRange * 0.78) {
    return false;
  }

  camera.getWorldDirection(cameraDirection);
  tempVector.set(hound.position.x - player.position.x, 0.15, hound.position.z - player.position.z).normalize();
  return cameraDirection.dot(tempVector) > 0.88;
}

function moveHoundToward(hound, x, z, speed, dt, state, player, hitsSolidForRadius) {
  const dx = x - hound.position.x;
  const dz = z - hound.position.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.001) {
    return;
  }

  const step = Math.min(speed * dt, length);
  const nx = dx / length;
  const nz = dz / length;
  const nextX = hound.position.x + nx * step;
  const nextZ = hound.position.z + nz * step;

  if (!hitsSolidForRadius(nextX, nextZ, 0.46)) {
    hound.position.set(nextX, 0, nextZ);
    hound.group.position.copy(hound.position);
    hound.group.rotation.y = Math.atan2(nx, nz);
  } else {
    hound.target = pickHoundRoamTarget(state, player);
  }
}

function pickHoundRoamTarget(state, player) {
  if (!state.level.walkables.length) {
    return { x: player.position.x, z: player.position.z };
  }
  const index = Math.floor(state.level.rng() * state.level.walkables.length);
  return state.level.walkables[index];
}

function animateHound(hound, dt, frozen) {
  if (hound.modelBased) {
    setHoundAnimation(hound, frozen ? "frozen" : hound.mode);
    if (hound.mixer) {
      hound.mixer.timeScale = frozen ? 0.12 : hound.mode === "hunt" ? 1.35 : 0.82;
      hound.mixer.update(dt);
    }
    hound.animation += dt * (frozen ? 1.2 : hound.mode === "hunt" ? 7.5 : 3.8);
    if (!hound.mixer) {
      const crawl = Math.sin(hound.animation);
      hound.modelRoot.position.y = Math.abs(crawl) * (frozen ? 0.01 : 0.045);
      hound.modelRoot.rotation.x = frozen ? -0.04 : -0.08 + crawl * 0.035;
      hound.modelRoot.rotation.z = frozen ? 0 : Math.sin(hound.animation * 0.5) * 0.025;
    }
    return;
  }

  hound.animation += dt * (frozen ? 1.8 : hound.mode === "hunt" ? 9 : 4.5);
  const stride = Math.sin(hound.animation) * (frozen ? 0.025 : 0.18);
  hound.body.position.y = 0.88 + Math.abs(stride) * 0.08;
  for (let i = 0; i < hound.legs.length; i += 1) {
    hound.legs[i].rotation.x = (i % 2 === 0 ? stride : -stride) + hound.legBaseRotations[i];
  }
  hound.head.rotation.x = frozen ? -0.22 : -0.1 + Math.sin(hound.animation * 0.7) * 0.08;
}

function addModelHound(ctx, x, z) {
  const group = new THREE.Group();
  const model = cloneSkeleton(houndAsset.scene);
  const mixer = houndAsset.animations.length > 0 ? new THREE.AnimationMixer(model) : null;
  const actions = new Map();

  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material) {
        object.material = normalizeHoundModelMaterial(object.material);
      }
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 0.62 / Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  model.rotation.y = 0;

  group.add(model);
  group.position.set(x, 0, z);
  group.rotation.y = ctx.rng() * Math.PI * 2;
  ctx.group.add(group);

  for (const clip of houndAsset.animations) {
    const action = mixer.clipAction(clip);
    actions.set(clip.name.toLowerCase(), action);
  }

  const hound = {
    group,
    modelRoot: model,
    mixer,
    actions,
    activeAction: null,
    body: null,
    head: null,
    legs: [],
    legBaseRotations: [],
    position: new THREE.Vector3(x, 0, z),
    target: null,
    mode: "roam",
    roamSpeed: 1.25,
    huntSpeed: 6.25,
    attackCooldown: 0,
    freezeTimer: 0,
    animation: ctx.rng() * Math.PI * 2,
    modelBased: true,
  };
  setHoundAnimation(hound, "roam");
  hound.target = pickInitialHoundTarget(ctx, hound.position);
  ctx.hounds.push(hound);
}

function addProceduralHound(ctx, x, z, materials) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ctx.rng() * Math.PI * 2;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), materials.houndSkin);
  body.scale.set(0.82, 0.44, 1.55);
  body.position.set(0, 0.86, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), materials.houndSkin);
  head.scale.set(0.82, 0.72, 1.1);
  head.position.set(0, 0.92, 1.05);
  head.castShadow = true;
  group.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.34), materials.houndMouth);
  jaw.position.set(0, 0.75, 1.31);
  group.add(jaw);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), materials.houndEye);
    eye.position.set(sx * 0.13, 0.96, 1.35);
    group.add(eye);
  }

  const legs = [];
  const legBaseRotations = [];
  const legPositions = [
    [-0.42, 0.43, 0.64, -0.35],
    [0.42, 0.43, 0.64, -0.35],
    [-0.42, 0.43, -0.66, 0.35],
    [0.42, 0.43, -0.66, 0.35],
  ];
  for (const [lx, ly, lz, baseRot] of legPositions) {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.052, 0.92, 8), materials.houndSkin);
    upper.position.set(lx, ly, lz);
    upper.rotation.x = baseRot;
    upper.castShadow = true;
    group.add(upper);
    legs.push(upper);
    legBaseRotations.push(baseRot);
  }

  for (let i = 0; i < 34; i += 1) {
    const strand = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.58 + ctx.rng() * 0.58, 0.016), materials.houndHair);
    strand.position.set((ctx.rng() - 0.5) * 0.62, 0.82 - ctx.rng() * 0.22, 0.88 + ctx.rng() * 0.5);
    strand.rotation.x = 0.4 + ctx.rng() * 0.42;
    strand.rotation.z = (ctx.rng() - 0.5) * 0.22;
    group.add(strand);
  }

  ctx.group.add(group);
  const hound = {
    group,
    body,
    head,
    legs,
    legBaseRotations,
    position: new THREE.Vector3(x, 0, z),
    target: null,
    mode: "roam",
    roamSpeed: 1.25,
    huntSpeed: 6.25,
    attackCooldown: 0,
    freezeTimer: 0,
    animation: ctx.rng() * Math.PI * 2,
  };
  hound.target = pickInitialHoundTarget(ctx, hound.position);
  ctx.hounds.push(hound);
}

function normalizeHoundModelMaterial(sourceMaterial) {
  const material = sourceMaterial.clone();
  material.side = sourceMaterial.side ?? THREE.FrontSide;
  if (!material.map) {
    material.color?.set(0x777777);
  }
  material.emissiveIntensity = material.emissiveMap ? 0.08 : 0;
  material.metalness = 0;
  material.roughness = Math.max(material.roughness ?? 0.86, 0.72);
  material.envMapIntensity = 0;
  material.toneMapped = true;
  if (material.specularColor) {
    material.specularColor.set(0x333333);
  }
  if ("specularIntensity" in material) {
    material.specularIntensity = 0.08;
  }
  material.needsUpdate = true;
  return material;
}

function setHoundAnimation(hound, mode) {
  if (!hound.mixer || !hound.actions?.size) {
    return;
  }

  const candidates = {
    frozen: ["idle", "stun", "freeze", "default"],
    hunt: ["run", "crawl", "walk", "take", "baselayer", "attack", "idle"],
    roam: ["walk", "crawl", "take", "baselayer", "idle", "default"],
  }[mode] || ["idle"];

  let next = null;
  for (const candidate of candidates) {
    next = [...hound.actions.entries()].find(([name]) => name.includes(candidate))?.[1] || null;
    if (next) {
      break;
    }
  }
  next ||= [...hound.actions.values()][0];
  if (!next || next === hound.activeAction) {
    return;
  }

  next.reset().fadeIn(0.18).play();
  if (hound.activeAction) {
    hound.activeAction.fadeOut(0.18);
  }
  hound.activeAction = next;
}

function pickInitialHoundTarget(ctx, position) {
  if (!ctx.walkables.length) {
    return { x: position.x, z: position.z };
  }
  return ctx.walkables[Math.floor(ctx.rng() * ctx.walkables.length)];
}
