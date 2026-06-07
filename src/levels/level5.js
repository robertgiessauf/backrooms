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
  mapDistances,
  scatterCells,
} from "./shared.js";

export function createLevel5Map(rng) {
  const width = 107;
  const depth = 69;
  const grid = createFilledGrid(width, depth, "#");
  drawBorder(grid);

  const start = { c: 4, r: 5 };
  const exit = { c: width - 5, r: depth - 6 };

  for (let r = 5; r < depth - 7; r += 8) {
    for (let c = 2; c < 72; c += 1) {
      grid[r][c] = ".";
    }
  }
  for (let c = 4; c < 72; c += 10) {
    for (let r = 3; r < depth - 5; r += 1) {
      grid[r][c] = ".";
    }
  }

  for (let r = 8; r < depth - 10; r += 8) {
    for (let c = 11; c < 66; c += 10) {
      if (rng() < 0.72) {
        const roomW = 3 + Math.floor(rng() * 2) * 2;
        const roomD = 3 + Math.floor(rng() * 2) * 2;
        carveRoom(grid, c, r + Math.floor((rng() - 0.5) * 3), roomW, roomD);
        grid[r - 3][c] = ".";
      }
    }
  }

  for (let r = 3; r < depth - 3; r += 5) {
    for (let c = 72; c < width - 3; c += 1) {
      grid[r][c] = ".";
    }
  }
  for (let c = 75; c < width - 4; c += 7) {
    for (let r = 3; r < depth - 3; r += 1) {
      grid[r][c] = ".";
    }
  }
  for (let r = 9; r < depth - 8; r += 10) {
    for (let c = 80; c < width - 8; c += 12) {
      carveRoom(grid, c, r, 5, 5);
    }
  }

  for (let r = 4; r < depth - 4; r += 1) {
    grid[r][71] = ".";
    grid[r][72] = ".";
  }
  addExtraOpenings(grid, rng, 82);
  ensurePath(grid, start, exit);

  grid[start.r][start.c] = "S";
  grid[exit.r][exit.c] = "E";

  const distances = mapDistances(grid, start.c, start.r);
  const reservedRoute = findRouteToStart(grid, distances, exit);
  const hotelFeature = (c, r) => c < 72 && isOpenForFeature(grid, c, r) && !isProtectedRouteCell(reservedRoute, c, r, 1);
  const boilerFeature = (c, r) => c >= 72 && isOpenForFeature(grid, c, r) && !isProtectedRouteCell(reservedRoute, c, r, 1);

  scatterCells(grid, rng, "Z", 58, hotelFeature);
  scatterCells(grid, rng, "I", 42, (c, r) => hotelFeature(c, r) && hasWallNeighbor(grid, c, r));
  scatterCells(grid, rng, "L", 46, (c, r) => hotelFeature(c, r) && hasWallNeighbor(grid, c, r));
  scatterCells(grid, rng, "J", 10, hotelFeature);
  scatterCells(grid, rng, "A", 14, hotelFeature);
  scatterCells(grid, rng, "Y", 70, boilerFeature);
  scatterCells(grid, rng, "N", 22, boilerFeature);
  scatterCells(grid, rng, "V", 18, boilerFeature);
  scatterCells(grid, rng, "B", 14, boilerFeature);
  scatterCells(grid, rng, "D", 30, (c, r) => isOpenForFeature(grid, c, r) && !isProtectedRouteCell(reservedRoute, c, r, 1));
  scatterCells(grid, rng, "H", 3, (c, r) => isOpenForFeature(grid, c, r) && (distances.get(gridKey(c, r)) || 0) > 36);

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
