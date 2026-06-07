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
