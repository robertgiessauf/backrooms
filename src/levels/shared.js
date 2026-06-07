export function createFilledGrid(width, depth, char) {
  return Array.from({ length: depth }, () => Array.from({ length: width }, () => char));
}

export function gridToRows(grid) {
  return grid.map((row) => row.join(""));
}

export function gridKey(c, r) {
  return `${c},${r}`;
}

export function shuffledDirections(rng) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = dirs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  return dirs;
}

export function drawBorder(grid) {
  const depth = grid.length;
  const width = grid[0].length;
  for (let c = 0; c < width; c += 1) {
    grid[0][c] = "#";
    grid[depth - 1][c] = "#";
  }
  for (let r = 0; r < depth; r += 1) {
    grid[r][0] = "#";
    grid[r][width - 1] = "#";
  }
}

export function addExtraOpenings(grid, rng, count) {
  const width = grid[0].length;
  const depth = grid.length;
  for (let i = 0; i < count; i += 1) {
    const c = 2 + Math.floor(rng() * (width - 4));
    const r = 2 + Math.floor(rng() * (depth - 4));
    if (grid[r][c] !== "#") {
      continue;
    }
    const horizontal = grid[r][c - 1] !== "#" && grid[r][c + 1] !== "#";
    const vertical = grid[r - 1][c] !== "#" && grid[r + 1][c] !== "#";
    if (horizontal || vertical || rng() < 0.18) {
      grid[r][c] = ".";
    }
  }
}

export function markArea(grid, centerC, centerR, width, depth, char) {
  const halfW = Math.floor(width * 0.5);
  const halfD = Math.floor(depth * 0.5);
  for (let r = centerR - halfD; r <= centerR + halfD; r += 1) {
    for (let c = centerC - halfW; c <= centerC + halfW; c += 1) {
      if (r > 0 && r < grid.length - 1 && c > 0 && c < grid[0].length - 1) {
        grid[r][c] = char;
      }
    }
  }
}

export function canPlaceArea(grid, centerC, centerR, width, depth) {
  const halfW = Math.floor(width * 0.5);
  const halfD = Math.floor(depth * 0.5);
  return centerC - halfW > 1 && centerC + halfW < grid[0].length - 2 && centerR - halfD > 1 && centerR + halfD < grid.length - 2;
}

export function openNearestNeighbor(grid, c, r, char) {
  if (r > 0 && r < grid.length - 1 && c > 0 && c < grid[0].length - 1) {
    grid[r][c] = char;
  }
}

export function mapDistances(grid, startC, startR) {
  const distances = new Map([[gridKey(startC, startR), 0]]);
  const queue = [{ c: startC, r: startR }];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    const distance = distances.get(gridKey(current.c, current.r));
    for (const [dc, dr] of shuffledDirections(() => 0.5)) {
      const c = current.c + dc;
      const r = current.r + dr;
      const key = gridKey(c, r);
      if (grid[r]?.[c] && grid[r][c] !== "#" && !distances.has(key)) {
        distances.set(key, distance + 1);
        queue.push({ c, r });
      }
    }
  }
  return distances;
}

export function findFarthestOpenCell(grid, distances, predicate = () => true) {
  let best = { c: 1, r: 1, distance: -1 };
  for (let r = 1; r < grid.length - 1; r += 1) {
    for (let c = 1; c < grid[0].length - 1; c += 1) {
      const distance = distances.get(gridKey(c, r));
      if (grid[r][c] !== "#" && distance > best.distance && predicate(c, r)) {
        best = { c, r, distance };
      }
    }
  }
  return best;
}

export function findRouteToStart(grid, distances, end) {
  const route = new Set();
  let current = { c: end.c, r: end.r };
  let distance = distances.get(gridKey(current.c, current.r));
  if (!Number.isFinite(distance)) {
    return route;
  }

  route.add(gridKey(current.c, current.r));
  while (distance > 0) {
    const next = shuffledDirections(() => 0.5)
      .map(([dc, dr]) => ({ c: current.c + dc, r: current.r + dr }))
      .find((cell) => distances.get(gridKey(cell.c, cell.r)) === distance - 1 && grid[cell.r]?.[cell.c] !== "#");
    if (!next) {
      break;
    }
    current = next;
    distance -= 1;
    route.add(gridKey(current.c, current.r));
  }
  return route;
}

export function isProtectedRouteCell(route, c, r, radius = 0) {
  for (let dr = -radius; dr <= radius; dr += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      if (route.has(gridKey(c + dc, r + dr))) {
        return true;
      }
    }
  }
  return false;
}

export function findOpenCellInDistanceBand(grid, distances, minDistance, maxDistance, rng, predicate = () => true) {
  const candidates = [];
  for (let r = 1; r < grid.length - 1; r += 1) {
    for (let c = 1; c < grid[0].length - 1; c += 1) {
      const distance = distances.get(gridKey(c, r));
      if (grid[r][c] !== "#" && distance >= minDistance && distance <= maxDistance && predicate(c, r)) {
        candidates.push({ c, r, distance });
      }
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(rng() * candidates.length)];
}

export function pickFarOpenCells(grid, distances, count, minSpacing, predicate = () => true) {
  const candidates = [];
  let maxDistance = 0;
  for (const distance of distances.values()) {
    maxDistance = Math.max(maxDistance, distance);
  }
  for (let r = 1; r < grid.length - 1; r += 1) {
    for (let c = 1; c < grid[0].length - 1; c += 1) {
      const distance = distances.get(gridKey(c, r));
      if (grid[r][c] !== "#" && distance > maxDistance * 0.48 && predicate(c, r)) {
        candidates.push({ c, r, distance });
      }
    }
  }
  candidates.sort((a, b) => b.distance - a.distance);
  const picked = [];
  for (const candidate of candidates) {
    if (picked.every((cell) => Math.abs(cell.c - candidate.c) + Math.abs(cell.r - candidate.r) >= minSpacing)) {
      picked.push(candidate);
      if (picked.length >= count) {
        break;
      }
    }
  }
  return picked;
}

export function scatterCells(grid, rng, char, count, predicate) {
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 80) {
    attempts += 1;
    const c = 2 + Math.floor(rng() * (grid[0].length - 4));
    const r = 2 + Math.floor(rng() * (grid.length - 4));
    if (predicate(c, r)) {
      grid[r][c] = char;
      placed += 1;
    }
  }
}

export function isOpenForFeature(grid, c, r) {
  if (grid[r][c] !== ".") {
    return false;
  }
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (grid[r + dr]?.[c + dc] === "S" || grid[r + dr]?.[c + dc] === "E") {
        return false;
      }
    }
  }
  return true;
}

export function hasWallNeighbor(grid, c, r) {
  return grid[r - 1]?.[c] === "#" || grid[r]?.[c + 1] === "#" || grid[r + 1]?.[c] === "#" || grid[r]?.[c - 1] === "#";
}

export function addFogPatches(grid, rng, count) {
  for (let i = 0; i < count; i += 1) {
    const c = 6 + Math.floor(rng() * (grid[0].length - 12));
    const r = 5 + Math.floor(rng() * (grid.length - 10));
    const w = 3 + Math.floor(rng() * 4);
    const d = 2 + Math.floor(rng() * 3);
    for (let zr = r; zr < r + d; zr += 1) {
      for (let xc = c; xc < c + w; xc += 1) {
        if (grid[zr]?.[xc] === ".") {
          grid[zr][xc] = "G";
        }
      }
    }
  }
}

export function ensurePath(grid, start, end) {
  let c = start.c;
  let r = start.r;
  while (c !== end.c) {
    grid[r][c] = ".";
    c += c < end.c ? 1 : -1;
  }
  while (r !== end.r) {
    grid[r][c] = ".";
    r += r < end.r ? 1 : -1;
  }
  grid[r][c] = ".";
}

export function carveTunnelCell(grid, carved, c, r) {
  if (r <= 0 || r >= grid.length - 1 || c <= 0 || c >= grid[0].length - 1) {
    return;
  }
  if (grid[r][c] === "#") {
    carved.push({ c, r });
  }
  grid[r][c] = ".";
}
