import {
  addExtraOpenings,
  carveTunnelCell,
  createFilledGrid,
  findFarthestOpenCell,
  gridKey,
  gridToRows,
  isOpenForFeature,
  mapDistances,
  scatterCells,
  shuffledDirections,
} from "./shared.js";
import * as THREE from "../../vendor/three.module.js";

export const LEVEL6_PULSE_ON_SECONDS = 2.2;
export const LEVEL6_PULSE_OFF_SECONDS = 2.8;

export function createLevel6Map(rng) {
  const width = 93;
  const depth = 73;
  const grid = createFilledGrid(width, depth, "#");
  const carved = [];
  const start = { c: 3, r: 3 };
  let current = { ...start };
  carveTunnelCell(grid, carved, current.c, current.r);

  for (let segment = 0; segment < 82; segment += 1) {
    const directions = shuffledDirections(rng);
    const [dc, dr] = directions[0];
    const length = 4 + Math.floor(rng() * 10);
    for (let step = 0; step < length; step += 1) {
      current = {
        c: Math.max(2, Math.min(width - 3, current.c + dc)),
        r: Math.max(2, Math.min(depth - 3, current.r + dr)),
      };
      carveTunnelCell(grid, carved, current.c, current.r);
      if (rng() < 0.18) {
        carveTunnelCell(grid, carved, current.c + (dr !== 0 ? 1 : 0), current.r + (dc !== 0 ? 1 : 0));
      }
    }

    if (segment % 6 === 0 && carved.length > 0) {
      const branchStart = carved[Math.floor(rng() * carved.length)];
      carveLevel6Branch(grid, carved, branchStart, rng);
    }
  }

  addExtraOpenings(grid, rng, 38);
  const distances = mapDistances(grid, start.c, start.r);
  const exit = findFarthestOpenCell(grid, distances);

  scatterCells(grid, rng, "w", 30, (c, r) => {
    const distance = distances.get(gridKey(c, r)) || 0;
    return distance > 24 && isOpenForFeature(grid, c, r);
  });

  grid[start.r][start.c] = "S";
  grid[exit.r][exit.c] = "E";
  return gridToRows(grid);
}

function carveLevel6Branch(grid, carved, start, rng) {
  let current = { ...start };
  const directions = shuffledDirections(rng);
  const [dc, dr] = directions[0];
  const length = 6 + Math.floor(rng() * 12);
  for (let i = 0; i < length; i += 1) {
    current = {
      c: Math.max(2, Math.min(grid[0].length - 3, current.c + dc)),
      r: Math.max(2, Math.min(grid.length - 3, current.r + dr)),
    };
    carveTunnelCell(grid, carved, current.c, current.r);
  }
}

export const level6Hooks = {
  featureHandlers: {
    w({ ctx, x, z, tile, materials }) {
      addLevel6WireTrap(ctx, x, z, tile, materials);
    },
  },
  afterBuild({ ctx, rows, width, depth, cellCenter, charAt, tile, height, materials }) {
    ctx.wireTraps ||= [];
    resetLevel6PulseMaterials(materials);
    addLevel6DarknessDetails(ctx, rows, width, depth, cellCenter, charAt, tile, height, materials);
  },
  update({ state, player, scene, materials, distance2D, playerHeight }, dt) {
    updateLevel6Darkness({ state, player, scene, materials, distance2D, playerHeight }, dt);
  },
  updateZones({ level, player, clock, distance2D, THREE, flashMessage, resetCurrentLevel }, dt) {
    return updateLevel6WireTraps({ level, player, clock, distance2D, THREE, flashMessage, resetCurrentLevel }, dt);
  },
};

function updateLevel6Darkness({ state, player, scene, materials, distance2D, playerHeight }) {
  const pulseCycle = LEVEL6_PULSE_ON_SECONDS + LEVEL6_PULSE_OFF_SECONDS;
  const pulseWindow = LEVEL6_PULSE_ON_SECONDS;
  const cycle = performance.now() * 0.001 % pulseCycle;
  const pulse = cycle < pulseWindow ? Math.sin((cycle / pulseWindow) * Math.PI) : 0;
  const level = state.level;

  if (level.darkEchoLight) {
    level.darkEchoLight.position.set(player.position.x, playerHeight + player.verticalOffset * 0.55, player.position.z);
    level.darkEchoLight.intensity = 0.16 + pulse * 3.4;
  }
  if (level.darkEchoAmbient) {
    level.darkEchoAmbient.intensity = pulse * 1.8;
  }
  setLevel6PulseVisibility(materials, pulse);
  scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, 0.35, 0.18);
  scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, level.defaultFogFar + pulse * 28, 0.22);
}

function updateLevel6WireTraps({ level, player, clock, distance2D, THREE, flashMessage, resetCurrentLevel }, dt) {
  for (const wire of level.wireTraps || []) {
    wire.cooldown = Math.max(0, (wire.cooldown || 0) - dt);
    wire.mesh.material.opacity = 0.13 + Math.sin(clock.elapsedTime * 1.7 + wire.phase) * 0.035;
    if (distance2D(wire, player.position) < wire.radius && wire.cooldown <= 0 && player.damageCooldown <= 0) {
      player.health = Math.max(0, player.health - wire.damage);
      player.damageCooldown = 0.85;
      wire.cooldown = 2.6;
      const push = new THREE.Vector3(player.position.x - wire.x, 0, player.position.z - wire.z);
      if (push.lengthSq() > 0.001) {
        push.normalize().multiplyScalar(0.52);
        player.position.x += push.x;
        player.position.z += push.z;
      }
      flashMessage("Something catches your legs in the dark.");
      if (player.health <= 0) {
        resetCurrentLevel();
        return true;
      }
    }
  }
  return false;
}

function setLevel6PulseVisibility(materials, pulse) {
  materials.darkConcrete.color.set(0x090b0c).lerp(new THREE.Color(0x55646c), pulse);
  materials.darkFloor.color.set(0x050606).lerp(new THREE.Color(0x323d42), pulse);
  materials.darkCeiling.color.set(0x030304).lerp(new THREE.Color(0x252b30), pulse);
}

function resetLevel6PulseMaterials(materials) {
  setLevel6PulseVisibility(materials, 0);
}

function addLevel6DarknessDetails(ctx, rows, width, depth, cellCenter, charAt, tile, height, materials) {
  ctx.darkEchoLight = new THREE.PointLight(0x7fb6d6, 0, tile * 10.5, 1.35);
  ctx.darkEchoLight.castShadow = false;
  ctx.group.add(ctx.darkEchoLight);
  ctx.darkEchoAmbient = new THREE.AmbientLight(0x6b91aa, 0);
  ctx.group.add(ctx.darkEchoAmbient);
}

function addLevel6WireTrap(ctx, x, z, tile, materials) {
  ctx.wireTraps ||= [];
  const material = materials.darkWire.clone();
  const group = new THREE.Group();
  group.position.set(x, 0.048, z);
  group.rotation.y = Math.floor(ctx.rng() * 4) * Math.PI * 0.5 + (ctx.rng() - 0.5) * 0.3;

  for (let i = 0; i < 3; i += 1) {
    const wire = new THREE.Mesh(new THREE.BoxGeometry(tile * (0.58 + ctx.rng() * 0.18), 0.012, 0.018), material);
    wire.position.set(0, i * 0.018, (i - 1) * 0.09);
    wire.rotation.y = (ctx.rng() - 0.5) * 0.18;
    group.add(wire);
  }

  ctx.group.add(group);
  ctx.wireTraps.push({
    x,
    z,
    radius: tile * 0.48,
    damage: 19,
    mesh: group.children[0],
    phase: ctx.rng() * Math.PI * 2,
    cooldown: 0,
  });
}
