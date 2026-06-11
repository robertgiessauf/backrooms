import {
  addExtraOpenings,
  canPlaceArea,
  createFilledGrid,
  drawBorder,
  findFarthestOpenCell,
  findRouteToStart,
  gridKey,
  gridToRows,
  hasWallNeighbor,
  isOpenForFeature,
  isProtectedRouteCell,
  mapDistances,
  markArea,
  pickFarOpenCells,
  scatterCells,
} from "./shared.js";
import * as THREE from "../../vendor/three.module.js";

export function createLevel4Map(rng) {
  const width = 91;
  const depth = 61;
  const grid = createFilledGrid(width, depth, "#");
  drawBorder(grid);

  const start = { c: 4, r: 4 };
  for (let r = 3; r < depth - 3; r += 6) {
    for (let c = 2; c < width - 2; c += 1) {
      grid[r][c] = ".";
    }
  }
  for (let c = 4; c < width - 4; c += 8) {
    for (let r = 2; r < depth - 2; r += 1) {
      grid[r][c] = ".";
    }
  }

  for (let r = 6; r < depth - 6; r += 6) {
    for (let c = 8; c < width - 8; c += 8) {
      if (rng() < 0.72) {
        const w = 3 + Math.floor(rng() * 2) * 2;
        const d = 3 + Math.floor(rng() * 2) * 2;
        markArea(grid, c + Math.floor((rng() - 0.5) * 3), r + Math.floor((rng() - 0.5) * 3), w, d, ".");
        grid[r][c - 1] = ".";
        grid[r][c + 1] = ".";
      }
    }
  }

  addExtraOpenings(grid, rng, 95);
  grid[start.r][start.c] = "S";
  const distances = mapDistances(grid, start.c, start.r);
  const exits = pickFarOpenCells(grid, distances, 3, 22, (c, r) => canPlaceArea(grid, c, r, 3, 3));
  if (exits.length === 0) {
    exits.push(findFarthestOpenCell(grid, distances));
  }
  for (const exit of exits) {
    grid[exit.r][exit.c] = "E";
  }

  const reservedRoute = findRouteToStart(grid, distances, exits[0]);
  const officeFeature = (c, r) => isOpenForFeature(grid, c, r) && !isProtectedRouteCell(reservedRoute, c, r, 1);
  scatterCells(grid, rng, "A", 26, officeFeature);
  scatterCells(grid, rng, "U", 14, officeFeature);
  scatterCells(grid, rng, "R", 48, officeFeature);
  scatterCells(grid, rng, "D", 34, officeFeature);
  scatterCells(grid, rng, "H", 2, (c, r) => officeFeature(c, r) && (distances.get(gridKey(c, r)) || 0) > 32);

  scatterCells(grid, rng, "Q", 18, (c, r) => {
    if (!officeFeature(c, r) || !hasWallNeighbor(grid, c, r)) {
      return false;
    }
    return c < 7 || c > width - 8 || r < 7 || r > depth - 8 || rng() < 0.18;
  });

  grid[start.r][start.c] = "S";
  return gridToRows(grid);
}

export const level4Hooks = {
  featureHandlers: {
    Q({ ctx, x, z, tile, height, c, r, charAt, materials, addWindowTrim }) {
      addTrapWindow(ctx, x, z, tile, height, c, r, charAt, materials, addWindowTrim);
    },
  },
  afterBuild({ ctx, rows, width, depth, cellCenter, charAt, tile, height, materials, addWindowTrim }) {
    addLevel4OfficeDetails(ctx, rows, width, depth, cellCenter, charAt, tile, height, materials, addWindowTrim);
  },
};

function addLevel4OfficeDetails(ctx, rows, width, depth, cellCenter, charAt, tile, height, materials, addWindowTrim) {
  for (let r = 1; r < depth - 1; r += 1) {
    for (let c = 1; c < width - 1; c += 1) {
      if (charAt(c, r) === "#" || charAt(c, r) === "Q") {
        continue;
      }
      if ((charAt(c, r - 1) === "#" || charAt(c + 1, r) === "#" || charAt(c, r + 1) === "#" || charAt(c - 1, r) === "#") && ctx.rng() < 0.1) {
        const center = cellCenter(c, r);
        addBlackedWindow(ctx, center.x, center.z, tile, height, c, r, charAt, materials, addWindowTrim);
      }
    }
  }
}

function addTrapWindow(ctx, x, z, tile, height, c, r, charAt, materials, addWindowTrim) {
  const wall = getWindowWall(c, r, charAt);
  if (!wall) {
    return;
  }
  const alongX = wall === "north" || wall === "south";
  const side = wall === "north" || wall === "west" ? -1 : 1;
  const offset = tile * 0.5 - 0.115;
  const panelW = tile * 0.72;
  const panelH = 0.9;
  const panelD = 0.025;
  const wx = x + (!alongX ? side * offset : 0);
  const wz = z + (alongX ? side * offset : 0);
  const wy = height * 0.56;
  const window = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? panelW : panelD, panelH, alongX ? panelD : panelW),
    materials.trapWindow.clone()
  );
  window.position.set(wx, wy, wz);
  ctx.group.add(window);

  addWindowTrim(ctx, wx, wy, wz, alongX, panelW, panelH, panelD, materials.officeTrim);
  ctx.windowTraps.push({ x: window.position.x, z: window.position.z, radius: tile * 0.92, damage: 34, mesh: window, phase: ctx.rng() * Math.PI * 2 });
}

function addBlackedWindow(ctx, x, z, tile, height, c, r, charAt, materials, addWindowTrim) {
  const wall = getWindowWall(c, r, charAt);
  if (!wall) {
    return;
  }
  const alongX = wall === "north" || wall === "south";
  const side = wall === "north" || wall === "west" ? -1 : 1;
  const offset = tile * 0.5 - 0.115;
  const panelW = tile * 0.62;
  const panelH = 0.64;
  const panelD = 0.025;
  const wx = x + (!alongX ? side * offset : 0);
  const wz = z + (alongX ? side * offset : 0);
  const wy = height * 0.58;
  const window = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? panelW : panelD, panelH, alongX ? panelD : panelW),
    materials.blackedWindow
  );
  window.position.set(wx, wy, wz);
  ctx.group.add(window);

  addWindowTrim(ctx, wx, wy, wz, alongX, panelW, panelH, panelD, materials.officeTrim);
}

function getWindowWall(c, r, charAt) {
  if (charAt(c, r - 1) === "#") return "north";
  if (charAt(c + 1, r) === "#") return "east";
  if (charAt(c, r + 1) === "#") return "south";
  if (charAt(c - 1, r) === "#") return "west";
  return null;
}
