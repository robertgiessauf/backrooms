import {
  addExtraOpenings,
  canPlaceArea,
  createFilledGrid,
  findFarthestOpenCell,
  findOpenCellInDistanceBand,
  gridKey,
  gridToRows,
  mapDistances,
  markArea,
  openNearestNeighbor,
  shuffledDirections,
} from "./shared.js";

export function createLevel0Map(rng) {
  const width = 67;
  const depth = 49;
  const grid = createFilledGrid(width, depth, "#");
  const start = { c: 3, r: 3 };
  grid[start.r][start.c] = ".";

  const stack = [start];
  const visited = new Set([gridKey(start.c, start.r)]);
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = shuffledDirections(rng)
      .map(([dc, dr]) => ({ c: current.c + dc * 2, r: current.r + dr * 2, dc, dr }))
      .filter((next) => next.c > 0 && next.c < width - 1 && next.r > 0 && next.r < depth - 1 && !visited.has(gridKey(next.c, next.r)));

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[0];
    grid[current.r + next.dr][current.c + next.dc] = ".";
    grid[next.r][next.c] = ".";
    visited.add(gridKey(next.c, next.r));
    stack.push({ c: next.c, r: next.r });
  }

  addLevel0Rooms(grid, rng, 26);
  addExtraOpenings(grid, rng, 58);

  const distances = mapDistances(grid, start.c, start.r);
  const manilaCenter =
    findOpenCellInDistanceBand(grid, distances, 50, 82, rng, (c, r) => canPlaceManilaArea(grid, distances, c, r)) ||
    findFarthestOpenCell(grid, distances, (c, r) => canPlaceManilaArea(grid, distances, c, r));
  markArea(grid, manilaCenter.c, manilaCenter.r, 5, 4, "M");
  openNearestNeighbor(grid, manilaCenter.c - 3, manilaCenter.r, ".");

  const foldCells = pickFoldCells(grid, distances, manilaCenter, rng);
  for (const cell of foldCells) {
    grid[cell.r][cell.c] = "P";
  }

  grid[start.r][start.c] = "S";
  return gridToRows(grid);
}

function addLevel0Rooms(grid, rng, count) {
  for (let i = 0; i < count; i += 1) {
    const w = 3 + Math.floor(rng() * 4) * 2;
    const d = 3 + Math.floor(rng() * 3) * 2;
    const c = 3 + Math.floor(rng() * ((grid[0].length - 8) / 2)) * 2;
    const r = 3 + Math.floor(rng() * ((grid.length - 8) / 2)) * 2;
    markArea(grid, c, r, w, d, ".");
  }
}

function canPlaceManilaArea(grid, distances, centerC, centerR) {
  const width = 5;
  const depth = 4;
  if (!canPlaceArea(grid, centerC, centerR, width, depth)) {
    return false;
  }

  const halfW = Math.floor(width * 0.5);
  const halfD = Math.floor(depth * 0.5);
  for (let r = centerR - halfD - 1; r <= centerR + halfD + 1; r += 1) {
    for (let c = centerC - halfW - 1; c <= centerC + halfW + 1; c += 1) {
      const insideRoom = r >= centerR - halfD && r <= centerR + halfD && c >= centerC - halfW && c <= centerC + halfW;
      if (!insideRoom && grid[r]?.[c] !== "#") {
        const distance = distances.get(gridKey(c, r));
        if (!Number.isFinite(distance) || distance < 42) {
          return false;
        }
      }
    }
  }

  return true;
}

function pickFoldCells(grid, distances, manilaCenter, rng) {
  const candidates = [];
  for (let r = 3; r < grid.length - 3; r += 1) {
    for (let c = 3; c < grid[0].length - 3; c += 1) {
      const distance = distances.get(gridKey(c, r)) || 0;
      const farFromManila = Math.abs(c - manilaCenter.c) + Math.abs(r - manilaCenter.r) > 12;
      if (grid[r][c] === "." && distance > 35 && farFromManila) {
        candidates.push({ c, r, distance });
      }
    }
  }
  candidates.sort((a, b) => b.distance - a.distance);
  if (candidates.length < 2) {
    return [];
  }
  const first = candidates[Math.floor(rng() * Math.min(16, candidates.length))];
  const second = candidates.find((cell) => Math.abs(cell.c - first.c) + Math.abs(cell.r - first.r) > 28) || candidates[candidates.length - 1];
  return [first, second];
}
