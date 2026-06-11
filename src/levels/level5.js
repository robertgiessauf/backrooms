import {
  addExtraOpenings,
  createFilledGrid,
  drawBorder,
  ensurePath,
  findRouteToStart,
  gridKey,
  gridToRows,
  hasWallNeighbor,
  isOpenForFeature,
  isProtectedRouteCell,
  markArea,
  mapDistances,
  scatterCells,
} from "./shared.js";
import * as THREE from "../../vendor/three.module.js";

export function createLevel5Map(rng) {
  const width = 113;
  const depth = 75;
  const grid = createFilledGrid(width, depth, "#");
  drawBorder(grid);

  const start = { c: 12, r: 37 };
  const exit = { c: width - 8, r: 37 };

  carveRoom(grid, 13, 37, 17, 17);
  carveRoom(grid, 55, 37, 25, 19);
  carveRoom(grid, 88, 37, 19, 17);
  markArea(grid, 55, 37, 5, 7, "m");

  carveHorizontalHall(grid, 5, width - 7, 37, 5);
  for (const c of [29, 55, 80]) {
    carveVerticalHall(grid, c, 10, depth - 11, 5);
  }

  for (let c = 22; c <= 101; c += 10) {
    addSideRoomPair(grid, c, 37, 8, rng);
  }
  for (const c of [29, 55, 80]) {
    for (let r = 16; r <= 58; r += 12) {
      addCrossHallRooms(grid, c, r, rng);
    }
  }

  ensurePath(grid, start, exit);
  addExtraOpenings(grid, rng, 26);

  grid[start.r][start.c] = "S";
  grid[exit.r][exit.c] = "E";

  const distances = mapDistances(grid, start.c, start.r);
  const reservedRoute = findRouteToStart(grid, distances, exit);
  const hotelFeature = (c, r) => isOpenForFeature(grid, c, r) && !isProtectedRouteCell(reservedRoute, c, r, 1);

  placeDoorRows(grid, rng);
  scatterCells(grid, rng, "Z", 72, hotelFeature);
  scatterCells(grid, rng, "I", 74, (c, r) => hotelFeature(c, r) && hasWallNeighbor(grid, c, r));
  scatterCells(grid, rng, "J", 8, hotelFeature);
  scatterCells(grid, rng, "A", 16, hotelFeature);
  scatterCells(grid, rng, "u", 36, hotelFeature);
  scatterCells(grid, rng, "o", 24, (c, r) => hotelFeature(c, r) && isLobbyCell(c, r));
  scatterCells(grid, rng, "D", 14, hotelFeature);
  scatterCells(grid, rng, "H", 3, (c, r) => hotelFeature(c, r) && (distances.get(gridKey(c, r)) || 0) > 38);

  grid[start.r][start.c] = "S";
  grid[exit.r][exit.c] = "E";
  return gridToRows(grid);
}

function carveRoom(grid, centerC, centerR, width, depth) {
  const halfW = Math.floor(width * 0.5);
  const halfD = Math.floor(depth * 0.5);
  for (let r = centerR - halfD; r <= centerR + halfD; r += 1) {
    for (let c = centerC - halfW; c <= centerC + halfW; c += 1) {
      if (r > 1 && r < grid.length - 2 && c > 1 && c < grid[0].length - 2) {
        grid[r][c] = ".";
      }
    }
  }
}

function carveHorizontalHall(grid, c1, c2, centerR, width) {
  const half = Math.floor(width * 0.5);
  for (let r = centerR - half; r <= centerR + half; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      grid[r][c] = ".";
    }
  }
}

function carveVerticalHall(grid, centerC, r1, r2, width) {
  const half = Math.floor(width * 0.5);
  for (let r = r1; r <= r2; r += 1) {
    for (let c = centerC - half; c <= centerC + half; c += 1) {
      grid[r][c] = ".";
    }
  }
}

function addSideRoomPair(grid, c, hallR, depth, rng) {
  const roomW = 5 + Math.floor(rng() * 2) * 2;
  carveRoom(grid, c, hallR - depth, roomW, 7);
  carveRoom(grid, c, hallR + depth, roomW, 7);
  for (let r = hallR - depth + 3; r <= hallR - 3; r += 1) {
    grid[r][c] = ".";
  }
  for (let r = hallR + 3; r <= hallR + depth - 3; r += 1) {
    grid[r][c] = ".";
  }
  grid[hallR - 3][c] = "L";
  grid[hallR + 3][c] = "L";
}

function addCrossHallRooms(grid, hallC, r, rng) {
  const roomD = 5 + Math.floor(rng() * 2) * 2;
  carveRoom(grid, hallC - 8, r, 7, roomD);
  carveRoom(grid, hallC + 8, r, 7, roomD);
  for (let c = hallC - 5; c <= hallC - 3; c += 1) {
    grid[r][c] = ".";
  }
  for (let c = hallC + 3; c <= hallC + 5; c += 1) {
    grid[r][c] = ".";
  }
  grid[r][hallC - 3] = "L";
  grid[r][hallC + 3] = "L";
}

function placeDoorRows(grid, rng) {
  for (let r = 2; r < grid.length - 2; r += 1) {
    for (let c = 2; c < grid[0].length - 2; c += 1) {
      if (grid[r][c] !== "." || !hasWallNeighbor(grid, c, r)) {
        continue;
      }
      const nearMainHall = r >= 31 && r <= 43 && c > 16 && c < grid[0].length - 8;
      const nearCrossHall = [29, 55, 80].some((hallC) => Math.abs(c - hallC) <= 4);
      if ((nearMainHall || nearCrossHall) && rng() < 0.18) {
        grid[r][c] = "L";
      }
    }
  }
}

function isLobbyCell(c, r) {
  return (
    (c >= 8 && c <= 19 && r >= 30 && r <= 44) ||
    (c >= 45 && c <= 65 && r >= 29 && r <= 45) ||
    (c >= 81 && c <= 95 && r >= 31 && r <= 43)
  );
}

export const level5Hooks = {
  featureHandlers: {
    u({ ctx, x, z, tile, materials }) {
      addPottedPlant(ctx, x, z, tile, materials);
    },
    o({ ctx, x, z, tile, materials }) {
      addMarbleColumn(ctx, x, z, tile, materials);
    },
    m({ ctx, x, z, tile, materials }) {
      addLobbyTable(ctx, x, z, tile, materials);
    },
  },
  afterBuild({ ctx, rows, width, depth, cellCenter, charAt, height, tile, materials, addChandelier }) {
    addLevel5HotelDetails(ctx, rows, width, depth, cellCenter, charAt, height, tile, materials, addChandelier);
  },
};

function addLevel5HotelDetails(ctx, rows, width, depth, cellCenter, charAt, height, tile, materials, addChandelier) {
  for (let r = 3; r < depth - 3; r += 8) {
    for (let c = 6; c < width - 6; c += 12) {
      if (charAt(c, r) === "#") {
        continue;
      }
      const center = cellCenter(c, r);
      addChandelier(ctx, center.x, center.z, height);
    }
  }

  for (let r = 4; r < depth - 4; r += 6) {
    for (let c = 4; c < width - 4; c += 8) {
      if (charAt(c, r) === "#" || !hasWallNeighborFromRows(c, r, charAt)) {
        continue;
      }
      const center = cellCenter(c, r);
      addWallPanel(ctx, center.x, center.z, tile, height, c, r, charAt, materials);
    }
  }
}

function addPottedPlant(ctx, x, z, tile, materials) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.38, 16), materials.hotelWood);
  pot.position.y = 0.19;
  group.add(pot);
  for (let i = 0; i < 9; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 7), materials.plantLeaf);
    leaf.position.set((ctx.rng() - 0.5) * 0.24, 0.56, (ctx.rng() - 0.5) * 0.24);
    leaf.rotation.x = (ctx.rng() - 0.5) * 0.8;
    leaf.rotation.z = (ctx.rng() - 0.5) * 0.8;
    group.add(leaf);
  }
  ctx.group.add(group);
}

function addMarbleColumn(ctx, x, z, tile, materials) {
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 2.75, 18), materials.hotelMarble);
  column.position.set(x, 1.38, z);
  column.castShadow = true;
  column.receiveShadow = true;
  ctx.group.add(column);
  ctx.colliders.push({ minX: x - 0.32, maxX: x + 0.32, minZ: z - 0.32, maxZ: z + 0.32, minY: 0, maxY: 2.8 });
}

function addLobbyTable(ctx, x, z, tile, materials) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(tile * 0.34, tile * 0.34, 0.12, 24), materials.hotelWood);
  top.position.set(x, 0.56, z);
  top.castShadow = true;
  ctx.group.add(top);
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(tile * 0.38, tile * 0.42, 0.22, 24), materials.hotelFabric);
  cloth.position.set(x, 0.42, z);
  ctx.group.add(cloth);
  ctx.colliders.push({ minX: x - tile * 0.38, maxX: x + tile * 0.38, minZ: z - tile * 0.38, maxZ: z + tile * 0.38, minY: 0, maxY: 0.68, lowObstacle: true });
}

function addWallPanel(ctx, x, z, tile, height, c, r, charAt, materials) {
  const wall = getWall(c, r, charAt);
  if (!wall) {
    return;
  }
  const alongX = wall === "north" || wall === "south";
  const side = wall === "north" || wall === "west" ? -1 : 1;
  const offset = tile * 0.5 - 0.12;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? tile * 0.5 : 0.035, 1.08, alongX ? 0.035 : tile * 0.5),
    materials.hotelRedPanel
  );
  panel.position.set(x + (!alongX ? side * offset : 0), height * 0.48, z + (alongX ? side * offset : 0));
  ctx.group.add(panel);

  const sconce = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 8),
    materials.hotelGold
  );
  sconce.position.set(panel.position.x, height * 0.62, panel.position.z);
  ctx.group.add(sconce);
}

function hasWallNeighborFromRows(c, r, charAt) {
  return charAt(c, r - 1) === "#" || charAt(c + 1, r) === "#" || charAt(c, r + 1) === "#" || charAt(c - 1, r) === "#";
}

function getWall(c, r, charAt) {
  if (charAt(c, r - 1) === "#") return "north";
  if (charAt(c + 1, r) === "#") return "east";
  if (charAt(c, r + 1) === "#") return "south";
  if (charAt(c - 1, r) === "#") return "west";
  return null;
}
