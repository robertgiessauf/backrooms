import * as THREE from "../../vendor/three.module.js";
import {
  addExtraOpenings,
  canPlaceArea,
  carveTunnelCell,
  createFilledGrid,
  findFarthestOpenCell,
  findRouteToStart,
  gridKey,
  gridToRows,
  isOpenForFeature,
  isProtectedRouteCell,
  mapDistances,
  markArea,
  pickFarOpenCells,
  scatterCells,
  shuffledDirections,
} from "./shared.js";

export function createLevel3Map(rng) {
  const width = 125;
  const depth = 87;
  const grid = createFilledGrid(width, depth, "#");
  const carved = [];
  const start = { c: 5, r: 5 };
  let current = { ...start };
  carveTunnelCell(grid, carved, current.c, current.r);

  const directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];

  for (let segment = 0; segment < 92; segment += 1) {
    const [dc, dr] = directions[Math.floor(rng() * directions.length)];
    const length = 5 + Math.floor(rng() * 11);
    for (let step = 0; step < length; step += 1) {
      current = {
        c: THREE.MathUtils.clamp(current.c + dc, 2, width - 3),
        r: THREE.MathUtils.clamp(current.r + dr, 2, depth - 3),
      };
      carveTunnelCell(grid, carved, current.c, current.r);
      if (rng() < 0.42) {
        carveTunnelCell(grid, carved, current.c + (dr !== 0 ? 1 : 0), current.r + (dc !== 0 ? 1 : 0));
      }
    }

    if (segment % 5 === 0 && carved.length > 0) {
      const branchStart = carved[Math.floor(rng() * carved.length)];
      carveLevel3Branch(grid, carved, branchStart, rng);
    }
    if (segment % 9 === 0 && carved.length > 0) {
      const room = carved[Math.floor(rng() * carved.length)];
      markArea(grid, room.c, room.r, 3 + Math.floor(rng() * 3) * 2, 3 + Math.floor(rng() * 2) * 2, ".");
    }
  }

  addExtraOpenings(grid, rng, 70);
  const distances = mapDistances(grid, start.c, start.r);
  const elevators = pickFarOpenCells(grid, distances, 5, 24, (c, r) => canPlaceArea(grid, c, r, 3, 3));
  if (elevators.length === 0) {
    elevators.push(findFarthestOpenCell(grid, distances));
  }
  for (const elevator of elevators) {
    grid[elevator.r][elevator.c] = "E";
  }
  const reservedRoute = elevators.length > 0 ? findRouteToStart(grid, distances, elevators[0]) : new Set();
  const offRouteFeature = (c, r) => isOpenForFeature(grid, c, r) && !isProtectedRouteCell(reservedRoute, c, r, 1);

  scatterCells(grid, rng, "Y", 88, offRouteFeature);
  scatterCells(grid, rng, "N", 38, offRouteFeature);
  scatterCells(grid, rng, "V", 24, offRouteFeature);
  scatterCells(grid, rng, "K", 10, offRouteFeature);
  scatterCells(grid, rng, "D", 46, offRouteFeature);
  scatterCells(grid, rng, "H", 7, (c, r) => offRouteFeature(c, r) && (distances.get(gridKey(c, r)) || 0) > 34);

  grid[start.r][start.c] = "S";
  return gridToRows(grid);
}

function carveLevel3Branch(grid, carved, start, rng) {
  let current = { ...start };
  const directions = shuffledDirections(rng);
  const [dc, dr] = directions[0];
  const length = 8 + Math.floor(rng() * 14);
  for (let i = 0; i < length; i += 1) {
    current = {
      c: THREE.MathUtils.clamp(current.c + dc, 2, grid[0].length - 3),
      r: THREE.MathUtils.clamp(current.r + dr, 2, grid.length - 3),
    };
    carveTunnelCell(grid, carved, current.c, current.r);
  }
}
