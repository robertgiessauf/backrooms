import * as THREE from "../../vendor/three.module.js";
import {
  createFilledGrid,
  drawBorder,
  gridToRows,
  markArea,
  scatterCells,
} from "./shared.js";

const ENTRANCE_SAFE_SECONDS = 2.5;
const COLD_DAMAGE_SECONDS = 11;

export function createLevel7Map(rng) {
  const width = 91;
  const depth = 87;
  const grid = createFilledGrid(width, depth, "#");
  drawBorder(grid);

  for (let r = 17; r < depth - 1; r += 1) {
    for (let c = 1; c < width - 1; c += 1) {
      grid[r][c] = ".";
    }
  }

  const roomLeft = 39;
  const roomRight = 51;
  const roomTop = 4;
  const roomBottom = 14;
  for (let r = roomTop; r <= roomBottom; r += 1) {
    for (let c = roomLeft; c <= roomRight; c += 1) {
      grid[r][c] = ".";
    }
  }
  for (let r = roomBottom + 1; r <= 17; r += 1) {
    for (let c = 43; c <= 47; c += 1) {
      grid[r][c] = ".";
    }
  }

  const start = { c: 45, r: 8 };
  const exit = { c: 16, r: 66 };
  grid[start.r][start.c] = "S";
  grid[exit.r][exit.c] = "E";

  const canPlaceOceanFeature = (c, r) => r > 22 && r < depth - 4 && grid[r][c] === "." && Math.abs(c - exit.c) + Math.abs(r - exit.r) > 9;
  for (let i = 0; i < 11; i += 1) {
    const c = 7 + Math.floor(rng() * (width - 14));
    const r = 25 + Math.floor(rng() * (depth - 34));
    if (Math.abs(c - exit.c) + Math.abs(r - exit.r) < 12) {
      continue;
    }
    markArea(grid, c, r, 2 + Math.floor(rng() * 2) * 2, 2 + Math.floor(rng() * 2) * 2, "i");
  }

  scatterCells(grid, rng, "b", 32, canPlaceOceanFeature);
  scatterCells(grid, rng, "D", 24, canPlaceOceanFeature);

  const pipeRing = [
    [-2, -2], [0, -3], [2, -2],
    [-3, 0], [3, 0],
    [-2, 2], [0, 3], [2, 2],
  ];
  for (const [dc, dr] of pipeRing) {
    grid[exit.r + dr][exit.c + dc] = "p";
  }

  return gridToRows(grid);
}

export const level7Hooks = {
  featureHandlers: {
    i({ ctx, x, z, tile, materials }) {
      addIslandRock(ctx, x, z, tile, materials);
    },
    p({ ctx, x, z, tile, height, materials }) {
      addPipeMarker(ctx, x, z, tile, height, materials);
    },
    b({ ctx, x, z, tile, materials }) {
      addBonePile(ctx, x, z, tile, materials);
    },
    E({ ctx, x, z, tile, materials }) {
      addExitPlatform(ctx, x, z, tile, materials);
    },
  },
  afterBuild({ ctx, rows, width, depth, cellCenter, charAt, tile, height, materials }) {
    addLevel7OceanDetails(ctx, rows, width, depth, cellCenter, charAt, tile, height, materials);
  },
  movementMultiplier({ level, player }) {
    return isLevel7InOpenWater(level, player.position.x, player.position.z) ? 0.58 : 1;
  },
  updateZones({ level, player, flashMessage, resetCurrentLevel }, dt) {
    return updateLevel7Cold({ level, player, flashMessage, resetCurrentLevel }, dt);
  },
};

function addLevel7OceanDetails(ctx, rows, width, depth, cellCenter, charAt, tile, height, materials) {
  ctx.level7 = {
    coldSeconds: 0,
    safeSeconds: ENTRANCE_SAFE_SECONDS,
    messageCooldown: 0,
    waterZones: [],
    safeZones: [],
  };

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let r = 1; r < depth - 1; r += 1) {
    for (let c = 1; c < width - 1; c += 1) {
      if (charAt(c, r) === "#") {
        continue;
      }
      const center = cellCenter(c, r);
      minX = Math.min(minX, center.x);
      maxX = Math.max(maxX, center.x);
      minZ = Math.min(minZ, center.z);
      maxZ = Math.max(maxZ, center.z);
      if (r >= 15) {
        ctx.level7.waterZones.push({ x: center.x, z: center.z, w: tile, d: tile });
      }
      if (charAt(c, r) === "i" || charAt(c, r) === "E") {
        ctx.level7.safeZones.push({ x: center.x, z: center.z, radius: tile * 1.25 });
      }
    }
  }

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(maxX - minX + tile, maxZ - minZ + tile, 1, 1),
    materials.level7Water
  );
  water.rotation.x = -Math.PI * 0.5;
  water.position.set((minX + maxX) * 0.5, 0.035, (minZ + maxZ) * 0.5);
  ctx.group.add(water);
  ctx.level7.water = water;

  addEntranceRoomProps(ctx, ctx.start.x, ctx.start.z, tile, height, materials);

  const dim = new THREE.HemisphereLight(0xe4ece8, 0x8ca2a9, 0.72);
  ctx.group.add(dim);
}

function updateLevel7Cold({ level, player, flashMessage, resetCurrentLevel }, dt) {
  const data = level.level7;
  if (!data) {
    return false;
  }
  data.messageCooldown = Math.max(0, data.messageCooldown - dt);
  data.safeSeconds = Math.max(0, data.safeSeconds - dt);

  if (!isLevel7InOpenWater(level, player.position.x, player.position.z)) {
    data.coldSeconds = Math.max(0, data.coldSeconds - dt * 1.8);
    return false;
  }

  data.coldSeconds += dt;
  if (data.coldSeconds > 4 && data.messageCooldown <= 0) {
    flashMessage("The ocean drains heat from your body.");
    data.messageCooldown = 7;
  }
  if (data.coldSeconds >= COLD_DAMAGE_SECONDS && player.damageCooldown <= 0) {
    player.health = Math.max(0, player.health - 9);
    player.damageCooldown = 1.2;
    data.coldSeconds = COLD_DAMAGE_SECONDS * 0.72;
    if (player.health <= 0) {
      resetCurrentLevel();
      return true;
    }
  }
  return false;
}

function isLevel7InOpenWater(level, x, z) {
  const data = level.level7;
  if (!data || data.safeSeconds > 0) {
    return false;
  }
  const inWater = data.waterZones.some((zone) => Math.abs(x - zone.x) <= zone.w * 0.5 && Math.abs(z - zone.z) <= zone.d * 0.5);
  if (!inWater) {
    return false;
  }
  return !data.safeZones.some((zone) => {
    const dx = x - zone.x;
    const dz = z - zone.z;
    return dx * dx + dz * dz < zone.radius * zone.radius;
  });
}

function addEntranceRoomProps(ctx, x, z, tile, height, materials) {
  const table = new THREE.Mesh(new THREE.BoxGeometry(tile * 0.44, 0.12, tile * 0.32), materials.hotelWood);
  table.position.set(x - tile * 0.85, 0.48, z - tile * 0.58);
  table.castShadow = true;
  ctx.group.add(table);
  ctx.colliders.push({ minX: table.position.x - tile * 0.24, maxX: table.position.x + tile * 0.24, minZ: table.position.z - tile * 0.18, maxZ: table.position.z + tile * 0.18, minY: 0, maxY: 0.56, lowObstacle: true });

  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.64, 0.48), materials.officeChair);
  chair.position.set(x + tile * 0.72, 0.32, z - tile * 0.42);
  chair.castShadow = true;
  ctx.group.add(chair);
  ctx.colliders.push({ minX: chair.position.x - 0.28, maxX: chair.position.x + 0.28, minZ: chair.position.z - 0.28, maxZ: chair.position.z + 0.28, minY: 0, maxY: 0.68, lowObstacle: true });

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.65, tile * 1.3), materials.hotelWood);
  shelf.position.set(x - tile * 1.75, 0.82, z + tile * 0.2);
  shelf.castShadow = true;
  ctx.group.add(shelf);
  ctx.colliders.push({ minX: shelf.position.x - 0.22, maxX: shelf.position.x + 0.22, minZ: shelf.position.z - tile * 0.68, maxZ: shelf.position.z + tile * 0.68, minY: 0, maxY: 1.72 });

  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.045, 0.16), materials.whiteLight);
  lamp.position.set(x, height - 0.13, z);
  ctx.group.add(lamp);
  const light = new THREE.PointLight(0xbfd6e8, 0.9, tile * 4, 1.5);
  light.position.set(x, height - 0.42, z);
  ctx.group.add(light);
}

function addIslandRock(ctx, x, z, tile, materials) {
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(tile * (0.38 + ctx.rng() * 0.18), tile * (0.56 + ctx.rng() * 0.18), 0.42 + ctx.rng() * 0.42, 9), materials.level7Rock);
  rock.position.set(x, 0.17, z);
  rock.rotation.y = ctx.rng() * Math.PI;
  rock.castShadow = true;
  rock.receiveShadow = true;
  ctx.group.add(rock);
}

function addPipeMarker(ctx, x, z, tile, height, materials) {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, tile * 1.15, 14), materials.pipeDark);
  pipe.rotation.z = Math.PI * 0.5;
  pipe.position.set(x, 0.22, z);
  pipe.castShadow = true;
  ctx.group.add(pipe);
}

function addExitPlatform(ctx, x, z, tile, materials) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(tile * 0.82, tile * 0.94, 0.32, 24), materials.level7Rock);
  base.position.set(x, 0.09, z);
  base.receiveShadow = true;
  ctx.group.add(base);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(tile * 0.74, 0.055, 8, 28), materials.pipeDark);
  ring.position.set(x, 0.34, z);
  ring.rotation.x = Math.PI * 0.5;
  ctx.group.add(ring);
}

function addBonePile(ctx, x, z, tile, materials) {
  const group = new THREE.Group();
  group.position.set(x, 0.08, z);
  group.rotation.y = ctx.rng() * Math.PI * 2;
  for (let i = 0; i < 4; i += 1) {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42 + ctx.rng() * 0.32, 8), materials.bone);
    bone.rotation.z = Math.PI * 0.5;
    bone.rotation.y = ctx.rng() * Math.PI;
    bone.position.set((ctx.rng() - 0.5) * tile * 0.42, 0, (ctx.rng() - 0.5) * tile * 0.42);
    group.add(bone);
  }
  ctx.group.add(group);
}
