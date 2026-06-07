import {
  addFogPatches,
  createFilledGrid,
  drawBorder,
  ensurePath,
  gridToRows,
  isOpenForFeature,
  scatterCells,
} from "./shared.js";

export function createLevel1Map(rng) {
  const width = 72;
  const depth = 38;
  const grid = createFilledGrid(width, depth, ".");
  drawBorder(grid);

  grid[2][2] = "S";
  grid[depth - 3][width - 3] = "E";

  for (let c = 8; c < width - 8; c += 12) {
    for (let r = 5; r < depth - 5; r += 8) {
      grid[r][c] = "O";
    }
  }

  for (let r = 7; r < depth - 7; r += 10) {
    const gapStart = 6 + Math.floor(rng() * (width - 18));
    for (let c = 4; c < width - 4; c += 1) {
      if (Math.abs(c - gapStart) > 3 && rng() > 0.08) {
        grid[r][c] = "#";
      }
    }
  }

  scatterCells(grid, rng, "W", 12, (c, r) => isOpenForFeature(grid, c, r));
  scatterCells(grid, rng, "F", 5, (c, r) => isOpenForFeature(grid, c, r));
  addFogPatches(grid, rng, 6);
  ensurePath(grid, { c: 2, r: 2 }, { c: width - 3, r: depth - 3 });
  scatterCells(grid, rng, "H", 4, (c, r) => isOpenForFeature(grid, c, r) && Math.abs(c - 2) + Math.abs(r - 2) > 18);

  grid[2][2] = "S";
  grid[depth - 3][width - 3] = "E";
  return gridToRows(grid);
}
