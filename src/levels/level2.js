import * as THREE from "../../vendor/three.module.js";
import {
  addExtraOpenings,
  carveTunnelCell,
  createFilledGrid,
  findFarthestOpenCell,
  findRouteToStart,
  gridToRows,
  isOpenForFeature,
  isProtectedRouteCell,
  mapDistances,
  scatterCells,
  shuffledDirections,
} from "./shared.js";

export function createLevel2Map(rng) {
  const width = 87;
  const depth = 57;
  const grid = createFilledGrid(width, depth, "#");
  const carved = [];
  const start = { c: 3, r: 3 };
  let current = { ...start };
  carveTunnelCell(grid, carved, current.c, current.r);

  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [0, -1],
    [-1, 0],
  ];

  for (let segment = 0; segment < 46; segment += 1) {
    const [dc, dr] = directions[Math.floor(rng() * directions.length)];
    const length = 3 + Math.floor(rng() * 6);
    for (let step = 0; step < length; step += 1) {
      const next = {
        c: THREE.MathUtils.clamp(current.c + dc, 2, width - 3),
        r: THREE.MathUtils.clamp(current.r + dr, 2, depth - 3),
      };
      if (dc !== 0 && dr !== 0) {
        carveTunnelCell(grid, carved, next.c, current.r);
      }
      carveTunnelCell(grid, carved, next.c, next.r);
      current = next;
    }

    if (segment % 4 === 0 && carved.length > 0) {
      const branchStart = carved[Math.floor(rng() * carved.length)];
      carveLevel2Branch(grid, carved, branchStart, rng);
    }
  }

  addExtraOpenings(grid, rng, 45);
  const distances = mapDistances(grid, start.c, start.r);
  const exit = findFarthestOpenCell(grid, distances);
  const reservedRoute = findRouteToStart(grid, distances, exit);
  const offRouteFeature = (c, r) => isOpenForFeature(grid, c, r) && !isProtectedRouteCell(reservedRoute, c, r, 1);

  scatterCells(grid, rng, "Y", 96, offRouteFeature);
  scatterCells(grid, rng, "N", 24, offRouteFeature);
  scatterCells(grid, rng, "T", 9, offRouteFeature);
  scatterCells(grid, rng, "B", 12, offRouteFeature);
  scatterCells(grid, rng, "X", 18, offRouteFeature);
  scatterCells(grid, rng, "D", 30, offRouteFeature);

  grid[start.r][start.c] = "S";
  grid[exit.r][exit.c] = "E";
  return gridToRows(grid);
}

function carveLevel2Branch(grid, carved, start, rng) {
  let current = { ...start };
  const directions = shuffledDirections(rng);
  const [dc, dr] = directions[0];
  const length = 4 + Math.floor(rng() * 8);
  for (let i = 0; i < length; i += 1) {
    current = {
      c: THREE.MathUtils.clamp(current.c + dc, 2, grid[0].length - 3),
      r: THREE.MathUtils.clamp(current.r + dr, 2, grid.length - 3),
    };
    carveTunnelCell(grid, carved, current.c, current.r);
  }
}
