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

  scatterCells(grid, rng, "w", 18, (c, r) => {
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
