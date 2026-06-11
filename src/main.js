import * as THREE from "../vendor/three.module.js";
import { LEVELS } from './levels.js';
import { createMaterials, materialFor } from './materials.js';
import { playPickupSound, playUseSound, resumeAudioContext } from './audio.js';
import { addHound as addHoundEntity, loadHoundModel as loadHoundModelEntity, updateHounds as updateHoundEntities } from "./entities/hound.js";
import { addDeathmoths as addDeathmothEntities, loadDeathmothModel as loadDeathmothModelEntity, updateDeathmoths as updateDeathmothEntities } from "./entities/deathmoth.js";
import { prepareSmilerSpawns as prepareSmilerSpawnPoints, updateSmilers as updateSmilerEntities } from "./entities/smiler.js";
import { createAlmondWaterModel, loadAlmondWaterModel } from "./items/almondWater.js";

const mount = document.getElementById("game");
const veil = document.getElementById("veil");
const veilTitle = document.getElementById("veil-title");
const veilCopy = document.getElementById("veil-copy");
const startButton = document.getElementById("start-button");
const menuInventoryButton = document.getElementById("menu-inventory-button");
const levelSelect = document.getElementById("level-select");
const hudLevel = document.getElementById("hud-level");
const hudClass = document.getElementById("hud-class");
const healthFill = document.getElementById("health-fill");
const messageBox = document.getElementById("message");
const inventoryPanel = document.getElementById("inventory");
const inventoryItems = document.getElementById("inventory-items");
const inventoryClose = document.getElementById("inventory-close");
const levelInfoPanel = document.getElementById("level-info");
const introInfoDialog = document.getElementById("intro-info-dialog");
const introInfoClose = document.getElementById("intro-info-close");
const interactionHint = document.getElementById("interaction-hint");
const deathTransition = document.getElementById("death-transition");
const query = new URLSearchParams(window.location.search);

const PLAYER_HEIGHT = 1.68;
const PLAYER_RADIUS = 0.38;
const WALK_SPEED = 4.2;
const RUN_SPEED = 6.2;
const JUMP_MOVE_SPEED = 4.85;
const JUMP_VELOCITY = 5.25;
const GRAVITY = 14.5;
const LOW_OBSTACLE_CLEARANCE = 0.82;
const LOOK_SPEED = 0.0021;
const PICKUP_RANGE = 3.1;
const TORCH_RANGE = 16;
const VISITED_LEVELS_STORAGE_KEY = "backrooms.visitedLevels";
const INVENTORY_STORAGE_KEY = "backrooms.inventory";
const INTRO_INFO_STORAGE_KEY = "backrooms.seenInfoPrompt";
const ITEM_DEFS = {
  torch: { id: "torch", name: "Torch", type: "light" },
  almond_water: { id: "almond_water", name: "Almond Water", type: "consumable", healAmount: 28 },
};
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: query.get("verify") === "1",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.04, 180);
camera.rotation.order = "YXZ";
const raycaster = new THREE.Raycaster();
const cameraDirection = new THREE.Vector3();
const tempVector = new THREE.Vector3();

let scene = new THREE.Scene();
const clock = new THREE.Clock();

const keys = new Set();
const player = {
  position: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  health: 100,
  insideManilaTime: 0,
  portalCooldown: 0,
  stepPhase: 0,
  damageCooldown: 0,
  ended: false,
  verticalOffset: 0,
  verticalVelocity: 0,
  grounded: true,
  jumpQueued: false,
};

const state = {
  levelIndex: 0,
  level: null,
  audio: null,
  messageTimer: 0,
  generationCounter: 0,
  inventory: [],
  equippedItemId: null,
  inventoryOpen: false,
  inventoryOpenedFromMenu: false,
  focusedPickup: null,
  reviveTransitioning: false,
  torchLight: null,
  torchTarget: null,
  visitedLevels: new Set([0]),
  levelInfo: {},
};

const materials = createMaterials();
function loadVisitedLevels() {
  try {
    const raw = localStorage.getItem(VISITED_LEVELS_STORAGE_KEY);
    if (!raw) {
      return new Set([0]);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set([0]);
    }
    const valid = parsed
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < LEVELS.length);
    return new Set([0, ...valid]);
  } catch (error) {
    return new Set([0]);
  }
}

function saveVisitedLevels() {
  const value = [...state.visitedLevels].sort((a, b) => a - b);
  localStorage.setItem(VISITED_LEVELS_STORAGE_KEY, JSON.stringify(value));
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) {
      return { items: [], equippedItemId: null };
    }
    const parsed = JSON.parse(raw);
    const sourceItems = Array.isArray(parsed) ? parsed : parsed.items;
    const itemMap = new Map();
    if (Array.isArray(sourceItems)) {
      for (const source of sourceItems) {
        const id = typeof source === "string" ? source : source?.id;
        if (!ITEM_DEFS[id]) {
          continue;
        }
        const quantity = Math.max(1, Number.parseInt(source?.quantity ?? 1, 10) || 1);
        itemMap.set(id, (itemMap.get(id) || 0) + quantity);
      }
    }
    const items = [...itemMap.entries()].map(([id, quantity]) => ({ ...ITEM_DEFS[id], quantity }));
    const equippedItemId = items.some((item) => item.id === parsed.equippedItemId) ? parsed.equippedItemId : null;
    return { items, equippedItemId };
  } catch (error) {
    return { items: [], equippedItemId: null };
  }
}

function saveInventory() {
  const items = state.inventory
    .filter((item) => ITEM_DEFS[item.id] && (item.quantity ?? 1) > 0)
    .map((item) => ({ id: item.id, quantity: Math.max(1, Number.parseInt(item.quantity ?? 1, 10) || 1) }));
  const equippedItemId = items.some((item) => item.id === state.equippedItemId) ? state.equippedItemId : null;
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify({ version: 2, items, equippedItemId }));
}

function hasInventoryItem(itemId) {
  return state.inventory.some((item) => item.id === itemId && (item.quantity ?? 1) > 0);
}

function addInventoryItem(itemId, quantity = 1) {
  const def = ITEM_DEFS[itemId];
  if (!def) {
    return null;
  }
  const existing = state.inventory.find((item) => item.id === itemId);
  if (existing) {
    existing.quantity = (existing.quantity ?? 1) + quantity;
    return existing;
  }
  const item = { ...def, quantity };
  state.inventory.push(item);
  return item;
}

function removeInventoryItem(itemId, quantity = 1) {
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (!item) {
    return false;
  }
  item.quantity = Math.max(0, (item.quantity ?? 1) - quantity);
  if (item.quantity <= 0) {
    state.inventory = state.inventory.filter((entry) => entry !== item);
    if (state.equippedItemId === itemId) {
      state.equippedItemId = null;
      if (itemId === "torch") {
        setTorchLightEnabled(false);
      }
    }
  }
  return true;
}

Promise.all([loadHoundModelEntity(), loadDeathmothModelEntity(), loadAlmondWaterModel(), loadLevelInfo()]).finally(init);

async function loadLevelInfo() {
  try {
    const response = await fetch("./src/level-info.json", { cache: "no-store" });
    if (response.ok) {
      state.levelInfo = await response.json();
    }
  } catch (error) {
    console.warn("Failed to load level-info.json.", error);
    state.levelInfo = {};
  }
}

function init() {
  state.visitedLevels = loadVisitedLevels();
  const storedInventory = loadInventory();
  state.inventory = storedInventory.items;
  state.equippedItemId = storedInventory.equippedItemId;
  const requestedLevel = Number.parseInt(query.get("level") || "0", 10);
  const bootLevel = Number.isFinite(requestedLevel)
    ? THREE.MathUtils.clamp(requestedLevel, 0, LEVELS.length - 1)
    : 0;
  loadLevel(bootLevel, query.get("autostart") !== "1");
  bindEvents();
  maybeShowIntroInfoDialog();
  animate();
}

function bindEvents() {
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", (event) => {
    resumeAudio();
    if (event.code === "Escape") {
      event.preventDefault();
      handleEscapeKey();
      return;
    }
    if (event.code === "KeyE") {
      event.preventDefault();
      toggleInventory();
      return;
    }
    if (state.inventoryOpen) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      player.jumpQueued = true;
    }
    keys.add(event.code);
    if (event.code === "KeyR" && player.ended) {
      loadLevel(0, true);
      requestLock();
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === renderer.domElement;
    if (state.inventoryOpen) {
      return;
    }
    if (!locked && !player.ended) {
      showVeil(state.level.def.name, "The hum waits behind the pause.", "Resume");
    } else if (locked) {
      hideVeil();
    }
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement || player.ended) {
      return;
    }

    player.yaw -= event.movementX * LOOK_SPEED;
    player.pitch -= event.movementY * LOOK_SPEED;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -1.37, 1.37);
  });

  startButton.addEventListener("click", () => {
    if (player.ended) {
      player.health = 100;
      loadLevel(0);
    }
    resumeAudio();
    requestLock();
  });

  renderer.domElement.addEventListener("click", () => {
    if (!player.ended) {
      resumeAudio();
      if (document.pointerLockElement === renderer.domElement && tryPickupFocusedObject()) {
        return;
      }
      requestLock();
    }
  });

  window.addEventListener("pointerdown", resumeAudio, { passive: true });
  inventoryClose.addEventListener("click", () => closeInventory());
  menuInventoryButton.addEventListener("click", () => {
    hideVeil();
    openInventory(true);
  });
  introInfoClose.addEventListener("click", closeIntroInfoDialog);
}

function handleEscapeKey() {
  if (!introInfoDialog.classList.contains("is-hidden")) {
    closeIntroInfoDialog();
    return;
  }
  if (state.inventoryOpen) {
    closeInventory();
    return;
  }
  if (!veil.classList.contains("is-hidden")) {
    hideVeil();
    requestLock();
  }
}

function maybeShowIntroInfoDialog() {
  if (localStorage.getItem(INTRO_INFO_STORAGE_KEY) === "1") {
    return;
  }
  introInfoDialog.classList.remove("is-hidden");
}

function closeIntroInfoDialog() {
  localStorage.setItem(INTRO_INFO_STORAGE_KEY, "1");
  introInfoDialog.classList.add("is-hidden");
}

function requestLock() {
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
}

function showVeil(title, copy, buttonText) {
  veilTitle.textContent = title;
  veilCopy.textContent = copy;
  startButton.textContent = buttonText;
  renderLevelSelect();
  veil.classList.remove("is-hidden");
}

function hideVeil() {
  veil.classList.add("is-hidden");
}

function renderLevelSelect() {
  levelSelect.innerHTML = "";
  const visited = [...state.visitedLevels].sort((a, b) => a - b);
  if (visited.length <= 1) {
    return;
  }

  for (const index of visited) {
    const level = LEVELS[index];
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = level.name;
    button.addEventListener("click", () => {
      player.health = 100;
      loadLevel(index);
      resumeAudio();
      requestLock();
    });
    levelSelect.appendChild(button);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
}

function update(dt) {
  if (!state.level) {
    return;
  }

  player.portalCooldown = Math.max(0, player.portalCooldown - dt);
  player.damageCooldown = Math.max(0, player.damageCooldown - dt);
  updateMovement(dt);
  updateJumpPhysics(dt);
  updateZones(dt);
  updateLevelHook(dt);
  updateTorch();
  updateHoundEntities(
    { state, player, camera, cameraDirection, tempVector, torchRange: TORCH_RANGE, distance2D, hitsSolidForRadius, flashMessage, resetCurrentLevel },
    dt
  );
  updateSmilerEntities(
    { state, player, camera, materials, distance2D, hasClearPath2D, levelHasEntity, resetCurrentLevel, torchRange: TORCH_RANGE },
    dt
  );
  updateDeathmothEntities(
    { state, player, playerHeight: PLAYER_HEIGHT, distance2D, hasClearPath2D, hitsSolidForRadius, flashMessage, resetCurrentLevel },
    dt
  );
  updateLights(dt);
  updateAudio(dt);
  updateHud(dt);

  camera.position.copy(player.position);
  camera.position.y = PLAYER_HEIGHT + player.verticalOffset + Math.sin(player.stepPhase) * 0.035;
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  updateInteractionHint();
}

function updateMovement(dt) {
  if (document.pointerLockElement !== renderer.domElement || player.ended) {
    return;
  }

  if (player.jumpQueued && player.grounded) {
    player.verticalVelocity = JUMP_VELOCITY;
    player.grounded = false;
  }
  player.jumpQueued = false;

  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const intent = new THREE.Vector3();

  if (keys.has("KeyW") || keys.has("ArrowUp")) intent.add(forward);
  if (keys.has("KeyS") || keys.has("ArrowDown")) intent.sub(forward);
  if (keys.has("KeyD") || keys.has("ArrowRight")) intent.add(right);
  if (keys.has("KeyA") || keys.has("ArrowLeft")) intent.sub(right);

  if (intent.lengthSq() === 0) {
    player.stepPhase *= 0.86;
    return;
  }

  intent.normalize();
  const baseSpeed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? RUN_SPEED : player.grounded ? WALK_SPEED : JUMP_MOVE_SPEED;
  const speed = baseSpeed * getMovementMultiplier();
  const delta = intent.multiplyScalar(speed * dt);

  moveAxis(delta.x, 0);
  moveAxis(0, delta.z);
  player.stepPhase += speed * dt * 4.2;
}

function getMovementMultiplier() {
  const hook = state.level?.def?.hooks?.movementMultiplier;
  return hook ? hook(createLevelRuntimeApi(state.level)) : 1;
}

function updateJumpPhysics(dt) {
  if (player.grounded && player.verticalOffset <= 0 && player.verticalVelocity <= 0) {
    player.verticalOffset = 0;
    return;
  }

  player.verticalVelocity -= GRAVITY * dt;
  player.verticalOffset += player.verticalVelocity * dt;
  if (player.verticalOffset <= 0) {
    player.verticalOffset = 0;
    player.verticalVelocity = 0;
    player.grounded = true;
  }
}

function moveAxis(dx, dz) {
  if (dx === 0 && dz === 0) {
    return;
  }

  const nextX = player.position.x + dx;
  const nextZ = player.position.z + dz;
  if (!hitsSolid(nextX, nextZ)) {
    player.position.x = nextX;
    player.position.z = nextZ;
  }
}

function hitsSolid(x, z) {
  for (const box of state.level.colliders) {
    if (canClearCollider(box)) {
      continue;
    }
    const cx = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const cz = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    const distanceSq = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    if (distanceSq < PLAYER_RADIUS * PLAYER_RADIUS) {
      return true;
    }
  }
  return false;
}

function canClearCollider(box) {
  const maxY = box.maxY ?? Number.POSITIVE_INFINITY;
  return box.lowObstacle === true && maxY <= LOW_OBSTACLE_CLEARANCE && player.verticalOffset > maxY - 0.08;
}

function isInsideZone(zone, x, z) {
  return Math.abs(x - zone.x) <= zone.w * 0.5 && Math.abs(z - zone.z) <= zone.d * 0.5;
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function updateZones(dt) {
  const level = state.level;
  const inManila = level.manilaZones.some((zone) => isInsideZone(zone, player.position.x, player.position.z));
  if (inManila) {
    player.insideManilaTime = Math.min(player.insideManilaTime + dt, level.manilaExitSeconds || 7);
    if (player.insideManilaTime >= (level.manilaExitSeconds || 7)) {
      flashMessage("The room dims into concrete.");
      loadLevel(1);
      return;
    }
  } else {
    player.insideManilaTime = Math.max(0, player.insideManilaTime - dt * 0.75);
  }

  if (level.portals.length > 1 && player.portalCooldown <= 0) {
    for (const portal of level.portals) {
      if (distance2D(portal, player.position) < portal.radius) {
        const target = level.portals.find((candidate) => candidate !== portal) || portal;
        player.position.set(target.x + target.exitOffset.x, PLAYER_HEIGHT, target.z + target.exitOffset.z);
        player.yaw += Math.PI * 0.5;
        player.portalCooldown = 2.3;
        flashMessage("The hallway folds back on itself.");
        break;
      }
    }
  }

  let insideFog = false;
  for (const zone of level.fogZones) {
    if (isInsideZone(zone, player.position.x, player.position.z)) {
      insideFog = true;
      break;
    }
  }

  const targetFar = insideFog ? 13 : level.defaultFogFar;
  const targetNear = insideFog ? 2.6 : level.defaultFogNear;
  scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, targetFar, 0.06);
  scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, targetNear, 0.06);

  for (const hazard of level.hazards) {
    const dist = distance2D(hazard, player.position);
    const active = dist < hazard.radius;
    hazard.mouth.visible = active;
    if (active) {
      hazard.mouth.rotation.y += dt * 4;
      if (player.damageCooldown <= 0) {
        player.health = Math.max(0, player.health - hazard.damage);
        player.damageCooldown = 1.15;
        const push = new THREE.Vector3(player.position.x - hazard.x, 0, player.position.z - hazard.z);
        if (push.lengthSq() > 0.001) {
          push.normalize().multiplyScalar(1.4);
          player.position.x += push.x;
          player.position.z += push.z;
        }
        flashMessage("The puddle opens.");
        if (player.health <= 0) {
          resetCurrentLevel();
        }
      }
    }
  }

  for (const fume of level.fumeZones) {
    const active = Math.sin(clock.elapsedTime * fume.rate + fume.phase) > 0.18;
    fume.mesh.visible = active;
    fume.mesh.material.opacity = active ? 0.1 + Math.sin(clock.elapsedTime * 5 + fume.phase) * 0.035 : 0;
    if (active && isInsideZone(fume, player.position.x, player.position.z) && player.damageCooldown <= 0) {
      player.health = Math.max(0, player.health - fume.damage);
      player.damageCooldown = 0.9;
      flashMessage("Hot fumes pour from the pipes.");
      if (player.health <= 0) {
        resetCurrentLevel();
        return;
      }
    }
  }

  for (const heat of level.heatZones) {
    const cycle = (clock.elapsedTime + heat.phase) % (heat.hotSeconds + heat.coolSeconds);
    const heating = cycle < heat.hotSeconds;
    heat.mesh.visible = heating;
    heat.mesh.material.opacity = heating ? 0.42 + Math.sin(clock.elapsedTime * 6.5 + heat.phase) * 0.12 : 0;
    if (heat.light) {
      heat.light.intensity = heating ? 0.85 + Math.sin(clock.elapsedTime * 6.5 + heat.phase) * 0.22 : 0;
    }
    if (!isInsideZone(heat, player.position.x, player.position.z)) {
      heat.playerTime = 0;
      continue;
    }
    heat.playerTime = heating ? heat.playerTime + dt : 0;
    if (heat.playerTime > heat.warningSeconds && player.damageCooldown <= 0) {
      player.health = Math.max(0, player.health - heat.damage);
      player.damageCooldown = 0.8;
      flashMessage("The ceiling heat sears the air.");
      if (player.health <= 0) {
        resetCurrentLevel();
        return;
      }
    }
  }

  for (const trap of level.windowTraps) {
    const distance = distance2D(trap, player.position);
    trap.mesh.material.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 2.7 + trap.phase) * 0.22;
    if (distance < trap.radius && player.damageCooldown <= 0) {
      player.health = Math.max(0, player.health - trap.damage);
      player.damageCooldown = 0.7;
      const pull = new THREE.Vector3(trap.x - player.position.x, 0, trap.z - player.position.z);
      if (pull.lengthSq() > 0.001) {
        pull.normalize().multiplyScalar(0.34);
        player.position.x += pull.x;
        player.position.z += pull.z;
      }
      flashMessage("The window pulls at you.");
      if (player.health <= 0) {
        resetCurrentLevel();
        return;
      }
    }
  }

  if (level.def.hooks?.updateZones?.(createLevelRuntimeApi(level), dt)) {
    return;
  }

  for (const zone of level.exitZones) {
    if (isInsideZone(zone, player.position.x, player.position.z)) {
      if (state.levelIndex < LEVELS.length - 1) {
        flashMessage(state.level.def.theme === "level3" ? "The elevator doors close." : "The exit narrows into maintenance tunnels.");
        loadLevel(state.levelIndex + 1);
      } else {
        if (state.level.def.theme === "level3") {
          flashMessage("The elevator hums toward Level 4.");
        }
        completeCurrentBuild();
      }
      break;
    }
  }
}

function updateLevelHook(dt) {
  const hook = state.level?.def?.hooks?.update;
  if (!hook) {
    return;
  }
  hook(createLevelRuntimeApi(state.level), dt);
}

function updateLights(dt) {
  const time = clock.elapsedTime;
  for (const fixture of state.level.flickerLights) {
    fixture.mesh.material.emissiveIntensity =
      fixture.baseIntensity + Math.sin(time * fixture.rate + fixture.phase) * fixture.variance;
    if (fixture.light) {
      fixture.light.intensity =
        fixture.lightBase + Math.sin(time * fixture.rate * 0.91 + fixture.phase) * fixture.lightVariance;
    }
  }

  for (const fan of state.level.fans) {
    fan.rotation.y += dt * 2.4;
  }
}

function updateAudio() {
  if (!state.audio) {
    return;
  }

  const hum = state.level.def.hum;
  const now = state.audio.ctx.currentTime;
  const nearby = getNearbyLightAudio();

  state.audio.base.frequency.setTargetAtTime(hum.base, now, 0.05);
  state.audio.buzz.frequency.setTargetAtTime(hum.buzz, now, 0.05);
  state.audio.lightBuzz.frequency.setTargetAtTime(hum.buzz, now, 0.05);
  state.audio.gain.gain.setTargetAtTime(hum.volume * 0.02, now, 0.18);
  state.audio.lightGain.gain.setTargetAtTime(hum.volume * nearby.amount * 0.62, now, 0.08);

  if (state.audio.lightPan) {
    state.audio.lightPan.pan.setTargetAtTime(nearby.pan, now, 0.08);
  }
}

function getNearbyLightAudio() {
  let amount = 0;
  let weightedPan = 0;
  const yawRightX = Math.cos(player.yaw);
  const yawRightZ = -Math.sin(player.yaw);

  for (const fixture of state.level.flickerLights) {
    const dx = fixture.x - player.position.x;
    const dz = fixture.z - player.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const radius = fixture.audioRadius || state.level.def.tile * 4.6;
    const proximity = THREE.MathUtils.clamp(1 - distance / radius, 0, 1);
    if (proximity <= 0) {
      continue;
    }

    const contribution = proximity * proximity * proximity * fixture.audioWeight;
    const pan = distance > 0.001 ? ((dx / distance) * yawRightX + (dz / distance) * yawRightZ) : 0;
    amount += contribution;
    weightedPan += pan * contribution;
  }

  if (amount <= 0) {
    return { amount: 0, pan: 0 };
  }

  return {
    amount: THREE.MathUtils.clamp(amount, 0, 1),
    pan: THREE.MathUtils.clamp(weightedPan / amount, -0.85, 0.85),
  };
}

function updateHud(dt) {
  if (!state.level) {
    return;
  }
  hudLevel.textContent = state.level.def.id;
  hudClass.textContent = state.level.def.classificationLabel;
  healthFill.style.width = `${player.health}%`;
  document.querySelector(".hud")?.classList.toggle("is-visible", state.inventoryOpen);

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) {
      messageBox.classList.remove("is-visible");
    }
  }
}

function flashMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.add("is-visible");
  state.messageTimer = 3.2;
}

function toggleInventory() {
  if (state.inventoryOpen) {
    closeInventory();
  } else {
    openInventory();
  }
}

function openInventory(fromMenu = false) {
  state.inventoryOpen = true;
  state.inventoryOpenedFromMenu = fromMenu;
  keys.clear();
  document.exitPointerLock?.();
  inventoryPanel.classList.add("is-open");
  renderInventory();
  updateHud(0);
}

function closeInventory(relock = true) {
  const returnToMenu = state.inventoryOpenedFromMenu;
  state.inventoryOpen = false;
  state.inventoryOpenedFromMenu = false;
  inventoryPanel.classList.remove("is-open");
  updateHud(0);
  if (returnToMenu && state.level && !player.ended) {
    showVeil(state.level.def.name, "The hum waits behind the pause.", "Resume");
  } else if (relock && !player.ended) {
    requestLock();
  }
}

function renderInventory() {
  renderLevelInfo();
  inventoryItems.innerHTML = "";
  if (state.equippedItemId) {
    const equipped = state.inventory.find((item) => item.id === state.equippedItemId);
    const row = document.createElement("div");
    row.className = "inventory-item inventory-equipped";
    const label = document.createElement("strong");
    label.textContent = equipped ? `Equipped: ${equipped.name}` : "Equipped item";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Unequip";
    button.addEventListener("click", unequipItem);
    row.append(label, button);
    inventoryItems.appendChild(row);
  }

  if (state.inventory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "inventory-empty";
    empty.textContent = "Empty";
    inventoryItems.appendChild(empty);
    return;
  }

  for (const item of state.inventory) {
    const row = document.createElement("div");
    row.className = "inventory-item";
    const label = document.createElement("strong");
    label.textContent = (item.quantity ?? 1) > 1 ? `${item.name} x${item.quantity}` : item.name;
    const button = document.createElement("button");
    button.type = "button";
    if (item.type === "consumable") {
      button.textContent = "Use";
      button.addEventListener("click", () => useItem(item.id));
    } else {
      button.textContent = state.equippedItemId === item.id ? "Equipped" : "Equip";
      button.addEventListener("click", () => equipItem(item.id));
    }
    row.append(label, button);
    inventoryItems.appendChild(row);
  }
}

function renderLevelInfo() {
  levelInfoPanel.innerHTML = "";
  const levelId = state.level?.def?.id || String(state.levelIndex);
  const info = state.levelInfo[levelId] || {
    title: `Level ${levelId}`,
    sections: [{ heading: "Info", text: "No info has been written for this level yet." }],
  };

  const title = document.createElement("h3");
  title.textContent = info.title || `Level ${levelId}`;
  levelInfoPanel.appendChild(title);

  for (const section of info.sections || []) {
    const heading = document.createElement("h4");
    heading.textContent = section.heading || "Info";
    levelInfoPanel.appendChild(heading);

    if (section.text) {
      const paragraph = document.createElement("p");
      paragraph.textContent = section.text;
      levelInfoPanel.appendChild(paragraph);
    }

    if (Array.isArray(section.items) && section.items.length > 0) {
      const list = document.createElement("ul");
      for (const item of section.items) {
        const entry = document.createElement("li");
        entry.textContent = item;
        list.appendChild(entry);
      }
      levelInfoPanel.appendChild(list);
    }
  }
}

function unequipItem() {
  state.equippedItemId = null;
  setTorchLightEnabled(false);
  saveInventory();
  renderInventory();
}

function equipItem(itemId) {
  if (!hasInventoryItem(itemId)) {
    return;
  }
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (item?.type === "consumable") {
    useItem(itemId);
    return;
  }
  state.equippedItemId = itemId;
  if (itemId === "torch") {
    ensureTorchLight();
    setTorchLightEnabled(true);
  }
  saveInventory();
  renderInventory();
}

function useItem(itemId) {
  resumeAudio();
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (!item || item.type !== "consumable") {
    return;
  }
  if (item.healAmount) {
    if (player.health >= 100) {
      flashMessage("Health is already full.");
      return;
    }
    player.health = Math.min(100, player.health + item.healAmount);
    removeInventoryItem(itemId, 1);
    saveInventory();
    renderInventory();
    updateHud(0);
    playUseSound(state.audio);
    flashMessage(`${item.name} restored health.`);
  }
}

function tryPickupFocusedObject() {
  const pickup = getFocusedPickup();
  if (!pickup || pickup.collected) {
    return false;
  }

  pickup.collected = true;
  state.level.group.remove(pickup.group);
  if (ITEM_DEFS[pickup.id]) {
    addInventoryItem(pickup.id, pickup.quantity ?? 1);
    saveInventory();
  }
  playPickupSound(state.audio);
  flashMessage(pickup.id === "torch" ? "Torch picked up. Open inventory with E." : `${pickup.name} picked up.`);
  renderInventory();
  updateInteractionHint();
  return true;
}

function updateInteractionHint() {
  const pickup = getFocusedPickup();
  state.focusedPickup = pickup;
  if (!interactionHint) {
    return;
  }

  const canShow = pickup && document.pointerLockElement === renderer.domElement && !state.inventoryOpen && !player.ended;
  interactionHint.classList.toggle("is-visible", Boolean(canShow));
  if (canShow) {
    interactionHint.textContent = `Click to pick up ${pickup.name}`;
  }
}

function getFocusedPickup() {
  if (!state.level || state.level.pickupMeshes.length === 0 || state.inventoryOpen || player.ended) {
    return null;
  }

  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  raycaster.far = PICKUP_RANGE;
  const hits = raycaster.intersectObjects(state.level.pickupMeshes, true);
  for (const hit of hits) {
    const pickup = findPickupFromObject(hit.object);
    if (pickup && !pickup.collected) {
      return pickup;
    }
  }
  return null;
}

function findPickupFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData.pickup) {
      return current.userData.pickup;
    }
    current = current.parent;
  }
  return null;
}

function ensureTorchLight() {
  if (state.torchLight || !scene) {
    return;
  }

  state.torchTarget = new THREE.Object3D();
  state.torchLight = new THREE.SpotLight(0xfff1bd, 3.4, TORCH_RANGE, 0.28, 0.45, 1.2);
  state.torchLight.castShadow = false;
  state.torchLight.target = state.torchTarget;
  scene.add(state.torchLight);
  scene.add(state.torchTarget);
  setTorchLightEnabled(state.equippedItemId === "torch");
}

function updateTorch() {
  if (state.level?.def?.theme === "level6") {
    setTorchLightEnabled(false);
    return;
  }

  if (state.equippedItemId !== "torch" || !state.torchLight || !state.torchTarget) {
    setTorchLightEnabled(false);
    return;
  }

  setTorchLightEnabled(true);
  camera.getWorldDirection(cameraDirection);
  state.torchLight.position.set(
    player.position.x + cameraDirection.x * 0.28,
    PLAYER_HEIGHT + player.verticalOffset - 0.18 + player.pitch * 0.08,
    player.position.z + cameraDirection.z * 0.28
  );
  state.torchTarget.position.set(
    state.torchLight.position.x + cameraDirection.x * TORCH_RANGE,
    state.torchLight.position.y + cameraDirection.y * TORCH_RANGE,
    state.torchLight.position.z + cameraDirection.z * TORCH_RANGE
  );
}

function setTorchLightEnabled(enabled) {
  if (state.torchLight) {
    state.torchLight.visible = enabled;
  }
  if (state.torchTarget) {
    state.torchTarget.visible = enabled;
  }
}

function levelHasEntity(def, entityId) {
  return Array.isArray(def.entities) && def.entities.includes(entityId);
}

function hitsSolidForRadius(x, z, radius) {
  for (const box of state.level.colliders) {
    const cx = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const cz = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    const distanceSq = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    if (distanceSq < radius * radius) {
      return true;
    }
  }
  return false;
}

function hasClearPath2D(fromX, fromZ, toX, toZ, padding = 0) {
  for (const box of state.level.colliders) {
    if (segmentIntersectsBox2D(fromX, fromZ, toX, toZ, box, padding)) {
      return false;
    }
  }
  return true;
}

function segmentIntersectsBox2D(fromX, fromZ, toX, toZ, box, padding = 0) {
  const minX = box.minX - padding;
  const maxX = box.maxX + padding;
  const minZ = box.minZ - padding;
  const maxZ = box.maxZ + padding;
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  let tMin = 0;
  let tMax = 1;

  if (!clipSegmentAxis(fromX, dx, minX, maxX, (nextMin, nextMax) => {
    tMin = nextMin;
    tMax = nextMax;
  }, tMin, tMax)) {
    return false;
  }

  return clipSegmentAxis(fromZ, dz, minZ, maxZ, (nextMin, nextMax) => {
    tMin = nextMin;
    tMax = nextMax;
  }, tMin, tMax);
}

function clipSegmentAxis(origin, delta, min, max, commit, tMin, tMax) {
  if (Math.abs(delta) < 0.0001) {
    return origin >= min && origin <= max;
  }

  let a = (min - origin) / delta;
  let b = (max - origin) / delta;
  if (a > b) {
    [a, b] = [b, a];
  }

  const nextMin = Math.max(tMin, a);
  const nextMax = Math.min(tMax, b);
  if (nextMin > nextMax) {
    return false;
  }
  commit(nextMin, nextMax);
  return true;
}

function loadLevel(index, initial = false) {
  const def = LEVELS[index];
  const generationSeed = hashString(`${def.id}:${Date.now()}:${Math.random()}:${state.generationCounter}`);
  state.generationCounter += 1;
  const mapRng = mulberry32(generationSeed);
  const runtimeDef = {
    ...def,
    seed: generationSeed,
    map: typeof def.createMap === "function" ? def.createMap(mapRng) : def.map,
  };
  state.levelIndex = index;
  state.visitedLevels.add(index);
  saveVisitedLevels();
  player.ended = false;
  player.health = Math.max(player.health, 65);
  player.insideManilaTime = 0;
  player.portalCooldown = 0;
  player.damageCooldown = 0;
  player.verticalOffset = 0;
  player.verticalVelocity = 0;
  player.grounded = true;
  player.jumpQueued = false;
  state.torchLight = null;
  state.torchTarget = null;
  closeInventory(false);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(runtimeDef.fog.color);
  scene.fog = new THREE.Fog(runtimeDef.fog.color, runtimeDef.fog.near, runtimeDef.fog.far);

  const world = buildLevel(runtimeDef);
  state.level = world;
  scene.add(world.group);

  applyLevelLighting(runtimeDef);

  player.position.copy(world.start);
  player.yaw = runtimeDef.startFacing;
  player.pitch = 0;
  camera.position.copy(player.position);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  if (state.equippedItemId === "torch") {
    ensureTorchLight();
  }

  if (initial) {
    showVeil("Level 0", "Yellow walls, wet carpet, and a sound that never stops.", "Enter");
  } else {
    hideVeil();
  }
}

function applyLevelLighting(def) {
  const profile = def.lightingProfile || {};
  const ambientIntensity = profile.ambientIntensity ?? def.ambientIntensity ?? 0.42;
  const hemi = new THREE.HemisphereLight(profile.sky ?? def.ambient, profile.ground ?? 0x11140f, ambientIntensity);
  scene.add(hemi);

  scene.add(new THREE.AmbientLight(profile.baseFillColor ?? def.ambient, profile.baseFillIntensity ?? 0.16));

  if (profile.fill) {
    scene.add(new THREE.AmbientLight(profile.fill.color, profile.fill.intensity));
  }

  if (profile.directional) {
    const light = new THREE.DirectionalLight(profile.directional.color, profile.directional.intensity);
    const position = profile.directional.position || { x: -9, y: 14, z: 8 };
    light.position.set(position.x, position.y, position.z);
    light.castShadow = Boolean(profile.directional.castShadow);
    scene.add(light);
  }

  renderer.toneMappingExposure = profile.exposure ?? 1.18;
}

function resetCurrentLevel(text) {
  if (state.reviveTransitioning) {
    return;
  }

  const levelIndex = state.levelIndex;
  const reviveMessage = state.level?.def?.reviveMessage || text || "You wake where the level first found you.";
  state.reviveTransitioning = true;
  player.ended = true;
  state.focusedPickup = null;
  interactionHint?.classList.remove("is-visible");
  deathTransition?.classList.add("is-active");

  window.setTimeout(() => {
    player.health = 100;
    loadLevel(levelIndex);
    player.ended = true;
    flashMessage(reviveMessage);

    window.setTimeout(() => {
      deathTransition?.classList.remove("is-active");
      state.reviveTransitioning = false;
      player.ended = false;
    }, 180);
  }, 420);
}

function completeCurrentBuild() {
  if (player.ended) {
    return;
  }
  player.ended = true;
  document.exitPointerLock?.();
  showVeil("End of Build", "The next documented exit is beyond this build.", "Restart");
  flashMessage("Current build complete.");
}

function buildLevel(def) {
  const ctx = {
    def,
    group: new THREE.Group(),
    colliders: [],
    hazards: [],
    fumeZones: [],
    heatZones: [],
    windowTraps: [],
    fogZones: [],
    exitZones: [],
    manilaZones: [],
    portals: [],
    pickups: [],
    pickupMeshes: [],
    hounds: [],
    smilers: [],
    smilerSpawnPoints: [],
    smilerSpawnTimer: 4,
    deathmoths: [],
    walkables: [],
    flickerLights: [],
    fans: [],
    start: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
    defaultFogNear: def.fog.near,
    defaultFogFar: def.fog.far,
    manilaExitSeconds: def.id === "0" ? 7 : 0,
    rng: mulberry32(def.seed || hashString(def.id + def.theme)),
  };

  const rows = def.map;
  const width = Math.max(...rows.map((row) => row.length));
  const depth = rows.length;
  const tile = def.tile;
  const height = def.ceiling;
  const originX = -width * tile * 0.5;
  const originZ = -depth * tile * 0.5;

  const charAt = (c, r) => (r < 0 || r >= depth || c < 0 || c >= rows[r].length ? "#" : rows[r][c]);
  const isOpen = (c, r) => charAt(c, r) !== "#";
  const cellCenter = (c, r) => ({
    x: originX + c * tile + tile * 0.5,
    z: originZ + r * tile + tile * 0.5,
  });

  for (let r = 0; r < depth; r += 1) {
    for (let c = 0; c < width; c += 1) {
      const ch = charAt(c, r);
      if (ch === "#") {
        continue;
      }
      const center = cellCenter(c, r);
      ctx.walkables.push({ x: center.x, z: center.z });
      addFloorCeiling(ctx, def, center.x, center.z, tile, height, ch);
      addCellFeature(ctx, def, ch, center.x, center.z, tile, height, c, r, charAt);

      if (ch === "S") {
        ctx.start.set(center.x, PLAYER_HEIGHT, center.z);
      }
      if (ch === "M") {
        ctx.manilaZones.push({ x: center.x, z: center.z, w: tile, d: tile });
      }
      if (ch === "G") {
        ctx.fogZones.push({ x: center.x, z: center.z, w: tile * 1.05, d: tile * 1.05 });
      }
      if (ch === "E") {
        ctx.exitZones.push({ x: center.x, z: center.z, w: tile * 0.92, d: tile * 0.92 });
        if (def.theme === "level3") {
          addElevatorExit(ctx, center.x, center.z, tile, height);
        } else {
          addExitStairwell(ctx, center.x, center.z, tile, height);
        }
      }
      if (ch === "P") {
        const marker = addSpatialFold(ctx, center.x, center.z, tile);
        ctx.portals.push({
          x: center.x,
          z: center.z,
          radius: tile * 0.52,
          exitOffset: marker.exitOffset,
        });
      }
    }
  }

  for (let r = 0; r < depth; r += 1) {
    for (let c = 0; c < width; c += 1) {
      const ch = charAt(c, r);
      if (ch === "#") {
        continue;
      }
      const center = cellCenter(c, r);
      const wallMaterial = ch === "M" ? materials.manilaWall : materialFor(materials, def, "wall");
      if (!isOpen(c, r - 1)) {
        addWall(ctx, center.x, center.z - tile * 0.5, tile, 0.18, height, wallMaterial, "north");
      }
      if (!isOpen(c, r + 1)) {
        addWall(ctx, center.x, center.z + tile * 0.5, tile, 0.18, height, wallMaterial, "south");
      }
      if (!isOpen(c - 1, r)) {
        addWall(ctx, center.x - tile * 0.5, center.z, 0.18, tile, height, wallMaterial, "west");
      }
      if (!isOpen(c + 1, r)) {
        addWall(ctx, center.x + tile * 0.5, center.z, 0.18, tile, height, wallMaterial, "east");
      }
    }
  }

  addLighting(ctx, def, rows, width, depth, cellCenter, charAt);
  def.hooks?.afterBuild?.(createLevelBuildApi(ctx, rows, width, depth, cellCenter, charAt, tile, height));

  if (levelHasEntity(def, "smiler")) {
    prepareSmilerSpawnPoints(ctx, rows, width, depth, cellCenter, charAt, tile, { distance2D });
  }
  if (levelHasEntity(def, "deathmoth")) {
    addDeathmothEntities(ctx, { materials, distance2D });
  }

  return ctx;
}

function createLevelBuildApi(ctx, rows, width, depth, cellCenter, charAt, tile, height) {
  return {
    THREE,
    ctx,
    rows,
    width,
    depth,
    cellCenter,
    charAt,
    tile,
    height,
    materials,
    hasInventoryItem,
    addTorchPickup,
    addGarageLines,
    addManilaLight,
    addChandelier,
    addWindowTrim,
  };
}

function createLevelRuntimeApi(level) {
  return {
    THREE,
    state,
    level,
    player,
    playerHeight: PLAYER_HEIGHT,
    scene,
    clock,
    materials,
    distance2D,
    flashMessage,
    resetCurrentLevel,
  };
}

function addFloorCeiling(ctx, def, x, z, tile, height, ch) {
  const floorMat = ch === "M" ? materials.manilaCarpet : materialFor(materials, def, "floor");
  const ceilingMat = materialFor(materials, def, "ceiling");
  addBox(ctx, x, -0.055, z, tile + 0.025, 0.11, tile + 0.025, floorMat, false);
  addBox(ctx, x, height + 0.035, z, tile + 0.02, 0.08, tile + 0.02, ceilingMat, false);
}

function addCellFeature(ctx, def, ch, x, z, tile, height, c, r, charAt) {
  const levelFeatureHandler = def.hooks?.featureHandlers?.[ch];
  if (levelFeatureHandler) {
    levelFeatureHandler({ ctx, def, ch, x, z, tile, height, c, r, charAt, materials, THREE, addWindowTrim });
    return;
  }

  if (def.theme === "level0") {
    if (ch === "M") {
      addManilaAmbience(ctx, x, z, tile, height);
    }
    return;
  }

  if (ch === "A") {
    addAlmondWaterPickup(ctx, x, z);
  } else if (ch === "U") {
    addSupplyStation(ctx, x, z, tile, height);
  } else if (ch === "R") {
    addOfficeFurniture(ctx, x, z, tile);
  } else if (ch === "O") {
    addPillar(ctx, x, z, height);
  } else if (ch === "C") {
    addCar(ctx, x, z, tile, ctx.rng() > 0.5 ? 0 : Math.PI * 0.5);
  } else if (ch === "W") {
    addPuddle(ctx, x, z, tile, false);
  } else if (ch === "F") {
    addPuddle(ctx, x, z, tile, true);
  } else if (ch === "G") {
    addFogVolume(ctx, x, z, tile, height);
  } else if (ch === "H") {
    addHoundEntity(ctx, x, z, materials);
  } else if (ch === "Y") {
    addPipeCluster(ctx, x, z, tile, height, c, r, charAt);
  } else if (ch === "N") {
    addMachineBlock(ctx, x, z, tile, height);
  } else if (ch === "V") {
    addFumeVent(ctx, x, z, tile, height, c, r, charAt);
  } else if (ch === "K") {
    addHeatCeilingZone(ctx, x, z, tile, height);
  } else if (ch === "T") {
    addTrolley(ctx, x, z, tile);
  } else if (ch === "B") {
    addBarrel(ctx, x, z);
  } else if (ch === "X") {
    addCrates(ctx, x, z, tile);
  } else if (ch === "D") {
    addDebris(ctx, x, z, tile);
  } else if (ch === "Z") {
    addHotelFurniture(ctx, x, z, tile);
  } else if (ch === "I") {
    addHotelPainting(ctx, x, z, tile, height, c, r, charAt);
  } else if (ch === "L") {
    addHotelDoor(ctx, x, z, tile, height, c, r, charAt);
  } else if (ch === "J") {
    addGramophone(ctx, x, z, tile);
  }
}

function addWall(ctx, x, z, w, d, height, material, side) {
  const mesh = addBox(ctx, x, height * 0.5, z, w, height, d, material, true);
  return mesh;
}

function addBox(ctx, x, y, z, w, h, d, material, solid = true) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = solid;
  mesh.receiveShadow = true;
  ctx.group.add(mesh);

  if (solid) {
    ctx.colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      minY: y - h * 0.5,
      maxY: y + h * 0.5,
    });
  }
  return mesh;
}

function addLighting(ctx, def, rows, width, depth, cellCenter, charAt) {
  const lighting = def.lighting || {};
  const maxPointLights = lighting.maxPointLights ?? 22;
  let pointLights = 0;

  for (let r = 1; r < depth - 1; r += 1) {
    for (let c = 1; c < width - 1; c += 1) {
      const ch = charAt(c, r);
      if (ch === "#") {
        continue;
      }
      const center = cellCenter(c, r);
      const manila = ch === "M";
      const shouldLight = lighting.shouldLight?.({ ctx, r, c, ch, manila }) || false;
      if (!shouldLight) {
        continue;
      }

      const fixture = addFluorescent(ctx, center.x, center.z, def.ceiling - 0.08, def.theme, manila);
      if (pointLights < maxPointLights) {
        const light = new THREE.PointLight(manila ? 0xffa646 : lighting.color ?? 0xddeeff, manila ? 1.25 : lighting.intensity ?? 0.72, def.tile * 4.4, 1.6);
        light.position.set(center.x, def.ceiling - 0.45, center.z);
        light.castShadow = false;
        ctx.group.add(light);
        fixture.light = light;
        fixture.lightBase = light.intensity;
        fixture.lightVariance = manila ? 0.06 : 0.12;
        pointLights += 1;
      }
      ctx.flickerLights.push(fixture);
    }
  }
}

function addFluorescent(ctx, x, z, y, theme, manila = false) {
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(manila ? 1.05 : 1.6, 0.08, manila ? 1.05 : 0.22),
    manila ? materials.orangeFixture : materials.fixture
  );
  shell.position.set(x, y, z);
  shell.receiveShadow = false;
  ctx.group.add(shell);

  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(manila ? 0.82 : 1.34, 0.035, manila ? 0.82 : 0.12),
    manila ? materials.orangeLight : theme === "level0" ? materials.yellowLight : materials.whiteLight
  );
  glow.position.set(x, y - 0.06, z);
  ctx.group.add(glow);

  return {
    mesh: glow,
    x,
    z,
    baseIntensity: manila ? 1.2 : theme === "level0" ? 1.8 : 1.35,
    variance: manila ? 0.08 : 0.22,
    rate: 4 + ctx.rng() * 10,
    phase: ctx.rng() * Math.PI * 2,
    audioRadius: ctx.def.tile * (manila ? 3.4 : 4.6),
    audioWeight: manila ? 0.7 : 1,
    light: null,
    lightBase: 0,
    lightVariance: 0,
  };
}

function addManilaAmbience(ctx, x, z, tile, height) {
  if (ctx.rng() > 0.16) {
    return;
  }

  const rug = new THREE.Mesh(new THREE.CircleGeometry(tile * 0.32, 28), materials.softStain);
  rug.rotation.x = -Math.PI * 0.5;
  rug.position.set(x + (ctx.rng() - 0.5) * tile * 0.2, 0.012, z + (ctx.rng() - 0.5) * tile * 0.2);
  ctx.group.add(rug);
}

function addManilaLight(ctx) {
  const xs = ctx.manilaZones.map((zone) => zone.x);
  const zs = ctx.manilaZones.map((zone) => zone.z);
  const x = (Math.min(...xs) + Math.max(...xs)) * 0.5;
  const z = (Math.min(...zs) + Math.max(...zs)) * 0.5;
  const fixture = addFluorescent(ctx, x, z, ctx.def.ceiling - 0.08, ctx.def.theme, true);
  const light = new THREE.PointLight(0xff9a3d, 1.05, ctx.def.tile * 4.2, 1.7);
  light.position.set(x, ctx.def.ceiling - 0.35, z);
  ctx.group.add(light);
  fixture.light = light;
  fixture.lightBase = light.intensity;
  fixture.lightVariance = 0.04;
  ctx.flickerLights.push(fixture);
}

function addSpatialFold(ctx, x, z, tile) {
  return {
    exitOffset: new THREE.Vector3((ctx.rng() - 0.5) * tile * 0.45, 0, (ctx.rng() - 0.5) * tile * 0.45),
  };
}

function addPipeCluster(ctx, x, z, tile, height, c, r, charAt) {
  const runs = getPipeWallRuns(c, r, charAt, tile);
  if (runs.length === 0) {
    return;
  }
  runs.sort((a, b) => b.cells - a.cells);
  const run = runs[Math.floor(ctx.rng() * Math.min(2, runs.length))];
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  for (let i = 0; i < 5; i += 1) {
    const radius = 0.055 + i * 0.009 + ctx.rng() * 0.008;
    const length = tile * Math.max(0.68, run.cells - 0.28 - ctx.rng() * 0.12);
    const pipeMaterial = ctx.def.theme === "level3" ? materials.copperPipe : i % 2 === 0 ? materials.pipe : materials.pipeDark;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), pipeMaterial);
    pipe.rotation.z = run.alongX ? Math.PI * 0.5 : 0;
    pipe.rotation.x = run.alongX ? 0 : Math.PI * 0.5;
    const wallOffset = run.side * (tile * 0.5 - radius - 0.035);
    const heightOffset = height - 0.48 - i * 0.13;
    pipe.position.set(
      run.alongX ? run.centerOffset : wallOffset,
      heightOffset,
      run.alongX ? wallOffset : run.centerOffset
    );
    pipe.castShadow = true;
    group.add(pipe);
  }

  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.026, 8, 20), materials.valve);
  valve.position.set(run.alongX ? run.centerOffset - tile * 0.22 : run.side * (tile * 0.5 - 0.08), height - 0.78, run.alongX ? run.side * (tile * 0.5 - 0.08) : run.centerOffset - tile * 0.22);
  valve.rotation.y = run.alongX ? Math.PI * 0.5 : 0;
  group.add(valve);
  ctx.group.add(group);
}

function addFumeVent(ctx, x, z, tile, height, c, r, charAt) {
  addPipeCluster(ctx, x, z, tile, height, c, r, charAt);

  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 12), materials.copperPipe);
  vent.position.set(x, height - 0.82, z);
  vent.rotation.x = Math.PI * 0.5;
  vent.castShadow = true;
  ctx.group.add(vent);

  const fume = new THREE.Mesh(new THREE.CylinderGeometry(tile * 0.34, tile * 0.52, height * 0.62, 18, 1, true), materials.fume.clone());
  fume.position.set(x, height * 0.42, z);
  fume.visible = false;
  ctx.group.add(fume);
  ctx.fumeZones.push({
    x,
    z,
    w: tile * 0.92,
    d: tile * 0.92,
    damage: 11,
    mesh: fume,
    phase: ctx.rng() * Math.PI * 2,
    rate: 0.5 + ctx.rng() * 0.32,
  });
}

function addHeatCeilingZone(ctx, x, z, tile, height) {
  const zoneW = tile * (3 + Math.floor(ctx.rng() * 3));
  const zoneD = tile * (4 + Math.floor(ctx.rng() * 3));
  const panel = new THREE.Mesh(new THREE.BoxGeometry(zoneW, 0.035, zoneD), materials.heatCeiling.clone());
  panel.position.set(x, height - 0.045, z);
  panel.visible = false;
  ctx.group.add(panel);
  const light = new THREE.PointLight(0xff6b21, 0, Math.max(zoneW, zoneD) * 0.92, 1.8);
  light.position.set(x, height - 0.35, z);
  ctx.group.add(light);
  ctx.heatZones.push({
    x,
    z,
    w: zoneW,
    d: zoneD,
    mesh: panel,
    light,
    hotSeconds: 60 + ctx.rng() * 30,
    coolSeconds: 18 + ctx.rng() * 24,
    phase: ctx.rng() * 90,
    warningSeconds: 2.6,
    playerTime: 0,
    damage: 16,
  });
}

function getPipeWallRuns(c, r, charAt, tile) {
  const sides = [
    { normalDc: 0, normalDr: -1, alongX: true, side: -1 },
    { normalDc: 0, normalDr: 1, alongX: true, side: 1 },
    { normalDc: -1, normalDr: 0, alongX: false, side: -1 },
    { normalDc: 1, normalDr: 0, alongX: false, side: 1 },
  ];
  const runs = [];

  for (const side of sides) {
    const axisDc = side.alongX ? 1 : 0;
    const axisDr = side.alongX ? 0 : 1;
    if (!isPipeWallCell(c, r, side, charAt)) {
      continue;
    }
    const negative = countPipeRunCells(c, r, -axisDc, -axisDr, side, charAt);
    const positive = countPipeRunCells(c, r, axisDc, axisDr, side, charAt);
    runs.push({
      ...side,
      cells: 1 + negative + positive,
      centerOffset: (positive - negative) * 0.5 * tile,
    });
  }

  return runs.filter((run) => run.cells >= 1);
}

function countPipeRunCells(c, r, dc, dr, side, charAt) {
  let count = 0;
  for (let step = 1; step <= 3; step += 1) {
    const nextC = c + dc * step;
    const nextR = r + dr * step;
    if (!isPipeWallCell(nextC, nextR, side, charAt)) {
      break;
    }
    count += 1;
  }
  return count;
}

function isPipeWallCell(c, r, side, charAt) {
  if (charAt(c, r) === "#") {
    return false;
  }
  if (charAt(c + side.normalDc, r + side.normalDr) !== "#") {
    return false;
  }
  return charAt(c - side.normalDc, r - side.normalDr) === "#";
}

function addMachineBlock(ctx, x, z, tile, height) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ctx.rng() > 0.5 ? 0 : Math.PI * 0.5;

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.34, height * 0.72, tile * 0.72), materials.machine);
  cabinet.position.set(tile * 0.24, height * 0.36, 0);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  group.add(cabinet);

  for (let i = 0; i < 4; i += 1) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.22), i === 0 ? materials.machineLight : materials.machinePanel);
    panel.position.set(tile * 0.42, 0.8 + i * 0.28, -0.24 + (i % 2) * 0.48);
    group.add(panel);
  }

  ctx.group.add(group);
  ctx.colliders.push({
    minX: x - tile * 0.38,
    maxX: x + tile * 0.38,
    minZ: z - tile * 0.38,
    maxZ: z + tile * 0.38,
    minY: 0,
    maxY: height * 0.72,
  });
}

function addTrolley(ctx, x, z, tile) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ctx.rng() * Math.PI;

  const bed = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.68, 0.08, tile * 0.42), materials.trolley);
  bed.position.y = 0.28;
  group.add(bed);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, 18), materials.trolley);
  handle.scale.z = 0.35;
  handle.position.set(-tile * 0.4, 0.55, 0);
  handle.rotation.y = Math.PI * 0.5;
  group.add(handle);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), materials.tire);
      wheel.rotation.z = Math.PI * 0.5;
      wheel.position.set(sx * tile * 0.25, 0.12, sz * tile * 0.16);
      group.add(wheel);
    }
  }

  ctx.group.add(group);
  ctx.colliders.push({
    minX: x - tile * 0.36,
    maxX: x + tile * 0.36,
    minZ: z - tile * 0.24,
    maxZ: z + tile * 0.24,
    minY: 0,
    maxY: 0.62,
    lowObstacle: true,
  });
}

function addBarrel(ctx, x, z) {
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.72, 18), materials.barrel);
  barrel.position.set(x, 0.36, z);
  barrel.rotation.y = Math.random() * Math.PI;
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  ctx.group.add(barrel);
  ctx.colliders.push({ minX: x - 0.28, maxX: x + 0.28, minZ: z - 0.28, maxZ: z + 0.28, minY: 0, maxY: 0.72, lowObstacle: true });
}

function addCrates(ctx, x, z, tile) {
  const count = 1 + Math.floor(ctx.rng() * 3);
  for (let i = 0; i < count; i += 1) {
    const size = 0.34 + ctx.rng() * 0.18;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), ctx.rng() > 0.5 ? materials.woodCrate : materials.cardboard);
    crate.position.set(x + (ctx.rng() - 0.5) * tile * 0.34, size * 0.5, z + (ctx.rng() - 0.5) * tile * 0.34);
    crate.rotation.y = ctx.rng() * Math.PI;
    crate.castShadow = true;
    crate.receiveShadow = true;
    ctx.group.add(crate);
    ctx.colliders.push({
      minX: crate.position.x - size * 0.5,
      maxX: crate.position.x + size * 0.5,
      minZ: crate.position.z - size * 0.5,
      maxZ: crate.position.z + size * 0.5,
      minY: 0,
      maxY: size,
      lowObstacle: true,
    });
  }
}

function addDebris(ctx, x, z, tile) {
  const count = 3 + Math.floor(ctx.rng() * 5);
  for (let i = 0; i < count; i += 1) {
    const material = i % 3 === 0 ? materials.paper : i % 3 === 1 ? materials.toolMetal : materials.glassShard;
    const piece = new THREE.Mesh(new THREE.BoxGeometry(0.08 + ctx.rng() * 0.22, 0.012, 0.04 + ctx.rng() * 0.16), material);
    piece.position.set(x + (ctx.rng() - 0.5) * tile * 0.72, 0.018, z + (ctx.rng() - 0.5) * tile * 0.72);
    piece.rotation.y = ctx.rng() * Math.PI;
    ctx.group.add(piece);
  }
}

function addTorchPickup(ctx, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.08, z);
  group.rotation.y = ctx.rng() * Math.PI;
  group.rotation.z = -0.18;

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.72, 14), materials.torchBody);
  handle.rotation.z = Math.PI * 0.5;
  handle.castShadow = true;
  group.add(handle);

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.2, 14), materials.torchHead);
  head.rotation.z = Math.PI * 0.5;
  head.position.x = 0.44;
  head.castShadow = true;
  group.add(head);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.105, 18), materials.torchLens);
  lens.rotation.y = Math.PI * 0.5;
  lens.position.x = 0.55;
  group.add(lens);

  const pickup = {
    id: "torch",
    name: "Torch",
    type: "light",
    group,
    collected: false,
  };
  group.userData.pickup = pickup;
  for (const child of group.children) {
    child.userData.pickup = pickup;
  }
  ctx.group.add(group);
  ctx.pickups.push(pickup);
  ctx.pickupMeshes.push(group);
}

function addAlmondWaterPickup(ctx, x, z) {
  const group = createAlmondWaterModel(ctx, materials);
  group.position.set(x, 0.02, z);
  group.rotation.y = ctx.rng() * Math.PI * 2;

  const pickup = {
    id: "almond_water",
    name: "Almond Water",
    type: "consumable",
    quantity: 1,
    group,
    collected: false,
  };
  group.userData.pickup = pickup;
  group.traverse((child) => {
    child.userData.pickup = pickup;
  });
  ctx.group.add(group);
  ctx.pickups.push(pickup);
  ctx.pickupMeshes.push(group);
}

function addSupplyStation(ctx, x, z, tile, height) {
  if (ctx.rng() < 0.52) {
    addWaterCooler(ctx, x, z, tile);
  } else {
    addVendingMachine(ctx, x, z, tile, height);
  }
  if (ctx.rng() < 0.25) {
    addAlmondWaterPickup(ctx, x + (ctx.rng() - 0.5) * tile * 0.55, z + (ctx.rng() - 0.5) * tile * 0.55);
  }
}

function addWaterCooler(ctx, x, z, tile) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.floor(ctx.rng() * 4) * Math.PI * 0.5;

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.92, 0.38), materials.waterCooler);
  base.position.y = 0.46;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 18), materials.waterJug);
  jug.position.y = 1.1;
  jug.castShadow = true;
  group.add(jug);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.06), materials.machinePanel);
  tray.position.set(0, 0.66, -0.22);
  group.add(tray);

  ctx.group.add(group);
  ctx.colliders.push({ minX: x - 0.32, maxX: x + 0.32, minZ: z - 0.32, maxZ: z + 0.32, minY: 0, maxY: 1.34 });
}

function addVendingMachine(ctx, x, z, tile, height) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.floor(ctx.rng() * 4) * Math.PI * 0.5;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.82, 0.42), materials.vendingMachine);
  body.position.y = 0.91;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.18, 0.035), materials.blackedWindow);
  panel.position.set(-0.12, 1.02, -0.23);
  group.add(panel);

  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.04), materials.exitSign);
  glow.position.set(-0.12, 1.58, -0.255);
  group.add(glow);

  const buttons = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.04), materials.machinePanel);
  buttons.position.set(0.29, 1.04, -0.255);
  group.add(buttons);

  ctx.group.add(group);
  ctx.colliders.push({ minX: x - 0.48, maxX: x + 0.48, minZ: z - 0.34, maxZ: z + 0.34, minY: 0, maxY: Math.min(height, 1.9) });
}

function addOfficeFurniture(ctx, x, z, tile) {
  if (ctx.rng() < 0.46) {
    return;
  }
  const angle = Math.floor(ctx.rng() * 4) * Math.PI * 0.5;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = angle;

  const desk = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.62, 0.12, tile * 0.34), materials.officeDesk);
  desk.position.y = 0.68;
  desk.castShadow = true;
  desk.receiveShadow = true;
  group.add(desk);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.06), materials.officeDesk);
      leg.position.set(sx * tile * 0.25, 0.34, sz * tile * 0.12);
      leg.castShadow = true;
      group.add(leg);
    }
  }

  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.36), materials.officeChair);
  chair.position.set(0, 0.38, tile * 0.36);
  chair.castShadow = true;
  group.add(chair);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.08), materials.officeChair);
  back.position.set(0, 0.68, tile * 0.52);
  back.castShadow = true;
  group.add(back);

  ctx.group.add(group);
  ctx.colliders.push({ minX: x - tile * 0.34, maxX: x + tile * 0.34, minZ: z - tile * 0.25, maxZ: z + tile * 0.25, minY: 0, maxY: LOW_OBSTACLE_CLEARANCE, lowObstacle: true });
}

function getWindowWall(c, r, charAt) {
  if (charAt(c, r - 1) === "#") return "north";
  if (charAt(c + 1, r) === "#") return "east";
  if (charAt(c, r + 1) === "#") return "south";
  if (charAt(c - 1, r) === "#") return "west";
  return null;
}

function addWindowTrim(ctx, x, y, z, alongX, panelW, panelH, panelD, material) {
  const trimDepth = panelD + 0.018;
  const trim = 0.045;
  const parts = alongX
    ? [
        [panelW + trim * 2, trim, trimDepth, 0, panelH * 0.5 + trim * 0.5, 0],
        [panelW + trim * 2, trim, trimDepth, 0, -panelH * 0.5 - trim * 0.5, 0],
        [trim, panelH + trim * 2, trimDepth, -panelW * 0.5 - trim * 0.5, 0, 0],
        [trim, panelH + trim * 2, trimDepth, panelW * 0.5 + trim * 0.5, 0, 0],
      ]
    : [
        [trimDepth, trim, panelW + trim * 2, 0, panelH * 0.5 + trim * 0.5, 0],
        [trimDepth, trim, panelW + trim * 2, 0, -panelH * 0.5 - trim * 0.5, 0],
        [trimDepth, panelH + trim * 2, trim, 0, 0, -panelW * 0.5 - trim * 0.5],
        [trimDepth, panelH + trim * 2, trim, 0, 0, panelW * 0.5 + trim * 0.5],
      ];
  for (const [w, h, d, dx, dy, dz] of parts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x + dx, y + dy, z + dz);
    mesh.receiveShadow = true;
    ctx.group.add(mesh);
  }
}

function addHotelFurniture(ctx, x, z, tile) {
  if (ctx.rng() < 0.48) {
    addHotelSofa(ctx, x, z, tile);
  } else {
    addHotelCabinet(ctx, x, z, tile);
  }
}

function addHotelSofa(ctx, x, z, tile) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.floor(ctx.rng() * 4) * Math.PI * 0.5;

  const base = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.72, 0.22, tile * 0.32), materials.hotelFabric);
  base.position.y = 0.34;
  base.castShadow = true;
  group.add(base);

  const back = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.76, 0.54, 0.16), materials.hotelFabric);
  back.position.set(0, 0.62, tile * 0.2);
  back.castShadow = true;
  group.add(back);

  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, tile * 0.36), materials.hotelWood);
    arm.position.set(sx * tile * 0.42, 0.46, 0);
    arm.castShadow = true;
    group.add(arm);
  }

  ctx.group.add(group);
  ctx.colliders.push({ minX: x - tile * 0.44, maxX: x + tile * 0.44, minZ: z - tile * 0.28, maxZ: z + tile * 0.28, minY: 0, maxY: LOW_OBSTACLE_CLEARANCE, lowObstacle: true });
}

function addHotelCabinet(ctx, x, z, tile) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.floor(ctx.rng() * 4) * Math.PI * 0.5;

  const body = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.46, 1.25, tile * 0.28), materials.hotelWood);
  body.position.y = 0.64;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  for (let i = 0; i < 3; i += 1) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), materials.hotelGold);
    knob.position.set(tile * 0.11, 0.34 + i * 0.28, -tile * 0.15);
    group.add(knob);
  }

  ctx.group.add(group);
  ctx.colliders.push({ minX: x - tile * 0.28, maxX: x + tile * 0.28, minZ: z - tile * 0.22, maxZ: z + tile * 0.22, minY: 0, maxY: LOW_OBSTACLE_CLEARANCE, lowObstacle: true });
}

function addHotelDoor(ctx, x, z, tile, height, c, r, charAt) {
  const wall = getWindowWall(c, r, charAt);
  if (!wall) {
    return;
  }
  const alongX = wall === "north" || wall === "south";
  const side = wall === "north" || wall === "west" ? -1 : 1;
  const offset = tile * 0.5 - 0.115;
  const dx = !alongX ? side * offset : 0;
  const dz = alongX ? side * offset : 0;
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? tile * 0.48 : 0.04, height * 0.72, alongX ? 0.04 : tile * 0.48),
    materials.hotelWood
  );
  door.position.set(x + dx, height * 0.36, z + dz);
  door.receiveShadow = true;
  ctx.group.add(door);

  const placard = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? 0.24 : 0.035, 0.12, alongX ? 0.035 : 0.24),
    materials.hotelGold
  );
  placard.position.set(x + dx, 1.72, z + dz);
  ctx.group.add(placard);
}

function addHotelPainting(ctx, x, z, tile, height, c, r, charAt) {
  const wall = getWindowWall(c, r, charAt);
  if (!wall) {
    return;
  }
  const alongX = wall === "north" || wall === "south";
  const side = wall === "north" || wall === "west" ? -1 : 1;
  const offset = tile * 0.5 - 0.112;
  const px = x + (!alongX ? side * offset : 0);
  const pz = z + (alongX ? side * offset : 0);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? tile * 0.34 : 0.035, 0.54, alongX ? 0.035 : tile * 0.34),
    materials.hotelGold
  );
  frame.position.set(px, height * 0.57, pz);
  ctx.group.add(frame);

  const inset = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? tile * 0.25 : 0.04, 0.4, alongX ? 0.04 : tile * 0.25),
    materials.hotelPainting
  );
  inset.position.set(px, height * 0.57, pz);
  ctx.group.add(inset);
}

function addGramophone(ctx, x, z, tile) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ctx.rng() * Math.PI * 2;

  const table = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.36, 0.12, tile * 0.28), materials.hotelWood);
  table.position.y = 0.5;
  table.castShadow = true;
  group.add(table);

  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 18, 1, true), materials.hotelGold);
  horn.position.set(0, 0.86, 0.02);
  horn.rotation.x = Math.PI * 0.5;
  horn.castShadow = true;
  group.add(horn);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16), materials.hotelSpeaker);
  base.position.y = 0.62;
  group.add(base);

  ctx.group.add(group);
  ctx.colliders.push({ minX: x - tile * 0.22, maxX: x + tile * 0.22, minZ: z - tile * 0.2, maxZ: z + tile * 0.2, minY: 0, maxY: LOW_OBSTACLE_CLEARANCE, lowObstacle: true });
}

function addChandelier(ctx, x, z, height) {
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), materials.hotelGold);
  chain.position.set(x, height - 0.34, z);
  ctx.group.add(chain);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 24), materials.hotelGold);
  ring.position.set(x, height - 0.62, z);
  ring.rotation.x = Math.PI * 0.5;
  ctx.group.add(ring);

  const light = new THREE.PointLight(0xffb05d, 0.36, 5.5, 1.7);
  light.position.set(x, height - 0.72, z);
  ctx.group.add(light);
}

function addPillar(ctx, x, z, height) {
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, height, 16), materials.concretePillar);
  pillar.position.set(x, height * 0.5, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  ctx.group.add(pillar);
  ctx.colliders.push({ minX: x - 0.55, maxX: x + 0.55, minZ: z - 0.55, maxZ: z + 0.55, minY: 0, maxY: height });

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.435, 0.445, 0.12, 16), materials.pillarStripe);
  band.position.set(x, 1.45, z);
  ctx.group.add(band);
}

function addCar(ctx, x, z, tile, rotation) {
  const colors = [materials.carRed, materials.carBlue, materials.carWhite, materials.carBlack];
  const bodyMaterial = colors[Math.floor(ctxRandomColor(x, z) * colors.length)];
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  const parts = [
    { geometry: new THREE.BoxGeometry(tile * 0.82, 0.34, tile * 1.2), material: bodyMaterial, position: [0, 0.42, 0] },
    { geometry: new THREE.BoxGeometry(tile * 0.72, 0.24, tile * 0.42), material: bodyMaterial, position: [0, 0.66, -tile * 0.37] },
    { geometry: new THREE.BoxGeometry(tile * 0.76, 0.22, tile * 0.34), material: bodyMaterial, position: [0, 0.63, tile * 0.44] },
    { geometry: new THREE.BoxGeometry(tile * 0.58, 0.38, tile * 0.46), material: materials.carGlass, position: [0, 0.96, -tile * 0.04] },
    { geometry: new THREE.BoxGeometry(tile * 0.5, 0.06, tile * 0.18), material: bodyMaterial, position: [0, 1.18, -tile * 0.04] },
    { geometry: new THREE.BoxGeometry(tile * 0.84, 0.12, tile * 0.08), material: materials.bumper, position: [0, 0.43, -tile * 0.64] },
    { geometry: new THREE.BoxGeometry(tile * 0.84, 0.12, tile * 0.08), material: materials.bumper, position: [0, 0.43, tile * 0.64] },
    { geometry: new THREE.BoxGeometry(tile * 0.34, 0.12, 0.035), material: materials.grille, position: [0, 0.57, -tile * 0.67] },
    { geometry: new THREE.BoxGeometry(tile * 0.18, 0.075, 0.035), material: materials.headlight, position: [-tile * 0.26, 0.6, -tile * 0.675] },
    { geometry: new THREE.BoxGeometry(tile * 0.18, 0.075, 0.035), material: materials.headlight, position: [tile * 0.26, 0.6, -tile * 0.675] },
    { geometry: new THREE.BoxGeometry(tile * 0.14, 0.075, 0.035), material: materials.tailLight, position: [-tile * 0.28, 0.58, tile * 0.675] },
    { geometry: new THREE.BoxGeometry(tile * 0.14, 0.075, 0.035), material: materials.tailLight, position: [tile * 0.28, 0.58, tile * 0.675] },
    { geometry: new THREE.BoxGeometry(0.045, 0.11, tile * 0.16), material: bodyMaterial, position: [-tile * 0.47, 0.88, -tile * 0.18] },
    { geometry: new THREE.BoxGeometry(0.045, 0.11, tile * 0.16), material: bodyMaterial, position: [tile * 0.47, 0.88, -tile * 0.18] },
  ];

  for (const part of parts) {
    const mesh = new THREE.Mesh(part.geometry, part.material);
    mesh.position.set(...part.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  for (const sx of [-1, 1]) {
    const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, tile * 0.28), materials.carGlass);
    sideWindow.position.set(sx * tile * 0.305, 0.98, -tile * 0.04);
    group.add(sideWindow);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 20), materials.tire);
      wheel.rotation.z = Math.PI * 0.5;
      wheel.position.set(sx * tile * 0.43, 0.27, sz * tile * 0.42);
      group.add(wheel);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.19, 16), materials.rim);
      rim.rotation.z = Math.PI * 0.5;
      rim.position.copy(wheel.position);
      group.add(rim);

      const arch = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.08, 0.12, tile * 0.32), materials.wheelArch);
      arch.position.set(sx * tile * 0.43, 0.52, sz * tile * 0.42);
      group.add(arch);
    }
  }

  ctx.group.add(group);

  const halfW = rotation === 0 ? tile * 0.42 : tile * 0.62;
  const halfD = rotation === 0 ? tile * 0.62 : tile * 0.42;
  ctx.colliders.push({ minX: x - halfW, maxX: x + halfW, minZ: z - halfD, maxZ: z + halfD, minY: 0, maxY: 1.18 });
}

function addPuddle(ctx, x, z, tile, falsePuddle) {
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(tile * 0.42, 40), falsePuddle ? materials.falsePuddle : materials.water);
  puddle.rotation.x = -Math.PI * 0.5;
  puddle.scale.set(1.26, 0.62, 1);
  puddle.position.set(x, 0.024, z);
  ctx.group.add(puddle);

  if (!falsePuddle) {
    return;
  }

  const mouth = new THREE.Group();
  mouth.position.set(x, 0.06, z);
  mouth.visible = false;
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.38, 4), materials.teeth);
    tooth.position.set(Math.cos(angle) * tile * 0.34, 0.12, Math.sin(angle) * tile * 0.34);
    tooth.rotation.z = Math.PI;
    tooth.rotation.y = -angle;
    mouth.add(tooth);
  }
  ctx.group.add(mouth);
  ctx.hazards.push({ x, z, radius: tile * 0.42, damage: 38, mouth });
}

function addFogVolume(ctx, x, z, tile, height) {
  const volume = new THREE.Mesh(new THREE.BoxGeometry(tile, height * 0.55, tile), materials.fogVolume);
  volume.position.set(x, height * 0.28, z);
  ctx.group.add(volume);
}

function addExitStairwell(ctx, x, z, tile, height) {
  const frame = addBox(ctx, x, height * 0.5, z + tile * 0.37, tile * 0.78, height * 0.96, 0.18, materials.exitDoor, false);
  frame.receiveShadow = true;
  for (let i = 0; i < 5; i += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.72, 0.13, 0.34), materials.stair);
    step.position.set(x, 0.08 + i * 0.16, z - tile * 0.2 - i * 0.28);
    step.receiveShadow = true;
    ctx.group.add(step);
  }
  const sign = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.52, 0.22, 0.04), materials.exitSign);
  sign.position.set(x, height - 0.58, z + tile * 0.26);
  ctx.group.add(sign);
}

function addElevatorExit(ctx, x, z, tile, height) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const back = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.9, height * 0.94, 0.12), materials.elevatorDoor);
  back.position.set(0, height * 0.47, tile * 0.38);
  back.receiveShadow = true;
  group.add(back);

  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.035, height * 0.72, 0.02), materials.elevatorPanel);
  seam.position.set(0, height * 0.48, tile * 0.31);
  group.add(seam);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.03), materials.elevatorPanel);
  panel.position.set(tile * 0.37, 1.25, tile * 0.3);
  group.add(panel);

  const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.035), materials.exitSign);
  indicator.position.set(0, height - 0.42, tile * 0.29);
  group.add(indicator);

  ctx.group.add(group);
}

function addGarageLines(ctx, rows, width, depth, cellCenter, charAt, tile) {
  for (let r = 1; r < depth - 1; r += 2) {
    for (let c = 1; c < width - 1; c += 4) {
      if (charAt(c, r) === "#") {
        continue;
      }
      const center = cellCenter(c, r);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, tile * 0.76), materials.parkingLine);
      line.position.set(center.x - tile * 0.48, 0.018, center.z);
      ctx.group.add(line);
    }
  }
}

function resumeAudio() {
  state.audio = resumeAudioContext(state.audio);
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ctxRandomColor(x, z) {
  return mulberry32(hashString(`${Math.round(x * 7)}:${Math.round(z * 7)}`))();
}
