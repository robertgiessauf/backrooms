import * as THREE from '../vendor/three.module.js';

export const LEVELS = [
  {
    id: "0",
    name: "Level 0",
    classification: 1,
    classificationLabel: "1",
    startFacing: Math.PI * 0.5,
    ceiling: 3.15,
    tile: 3.1,
    fog: { color: 0xa99745, near: 18, far: 58 },
    ambient: 0xe1ca77,
    hum: { base: 66, buzz: 118, volume: 0.075 },
    createMap: createLevel0Map,
    theme: "level0",
  },
  {
    id: "1",
    name: "Level 1",
    classification: 2,
    classificationLabel: "2",
    startFacing: Math.PI,
    ceiling: 3.55,
    tile: 3.35,
    fog: { color: 0x9ca19b, near: 11, far: 48 },
    ambient: 0xaeb6a8,
    hum: { base: 57, buzz: 126, volume: 0.055 },
    createMap: createLevel1Map,
    theme: "level1",
    entities: ["hound"],
  },
  {
    id: "2",
    name: "Level 2",
    classification: 3,
    classificationLabel: "3",
    startFacing: Math.PI * 0.25,
    ceiling: 2.85,
    tile: 2.45,
    fog: { color: 0x59514a, near: 8, far: 34 },
    ambient: 0xb8ab9c,
    ambientIntensity: 0.6,
    hum: { base: 48, buzz: 104, volume: 0.062 },
    createMap: createLevel2Map,
    theme: "level2",
    entities: ["smiler", "deathmoth"],
  },
  {
    id: "3",
    name: "Level 3",
    classification: 4,
    classificationLabel: "4",
    startFacing: Math.PI * 0.5,
    ceiling: 2.75,
    tile: 2.35,
    fog: { color: 0x2c2823, near: 7, far: 31 },
    ambient: 0x6f5948,
    ambientIntensity: 0.34,
    hum: { base: 42, buzz: 94, volume: 0.095 },
    createMap: createLevel3Map,
    theme: "level3",
    entities: ["smiler"],
  },
];

function createLevel0Map(rng) {
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

function createLevel1Map(rng) {
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

function createLevel2Map(rng) {
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

function createLevel3Map(rng) {
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

function carveTunnelCell(grid, carved, c, r) {
  if (r <= 0 || r >= grid.length - 1 || c <= 0 || c >= grid[0].length - 1) {
    return;
  }
  if (grid[r][c] === "#") {
    carved.push({ c, r });
  }
  grid[r][c] = ".";
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

function createFilledGrid(width, depth, char) {
  return Array.from({ length: depth }, () => Array.from({ length: width }, () => char));
}

function gridToRows(grid) {
  return grid.map((row) => row.join(""));
}

function gridKey(c, r) {
  return `${c},${r}`;
}

function shuffledDirections(rng) {
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

function drawBorder(grid) {
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

function addLevel0Rooms(grid, rng, count) {
  for (let i = 0; i < count; i += 1) {
    const w = 3 + Math.floor(rng() * 4) * 2;
    const d = 3 + Math.floor(rng() * 3) * 2;
    const c = 3 + Math.floor(rng() * ((grid[0].length - 8) / 2)) * 2;
    const r = 3 + Math.floor(rng() * ((grid.length - 8) / 2)) * 2;
    markArea(grid, c, r, w, d, ".");
  }
}

function addExtraOpenings(grid, rng, count) {
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

function markArea(grid, centerC, centerR, width, depth, char) {
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

function canPlaceArea(grid, centerC, centerR, width, depth) {
  const halfW = Math.floor(width * 0.5);
  const halfD = Math.floor(depth * 0.5);
  return centerC - halfW > 1 && centerC + halfW < grid[0].length - 2 && centerR - halfD > 1 && centerR + halfD < grid.length - 2;
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

function openNearestNeighbor(grid, c, r, char) {
  if (r > 0 && r < grid.length - 1 && c > 0 && c < grid[0].length - 1) {
    grid[r][c] = char;
  }
}

function mapDistances(grid, startC, startR) {
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

function findFarthestOpenCell(grid, distances, predicate = () => true) {
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

function findRouteToStart(grid, distances, end) {
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

function isProtectedRouteCell(route, c, r, radius = 0) {
  for (let dr = -radius; dr <= radius; dr += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      if (route.has(gridKey(c + dc, r + dr))) {
        return true;
      }
    }
  }
  return false;
}

function findOpenCellInDistanceBand(grid, distances, minDistance, maxDistance, rng, predicate = () => true) {
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

function pickFarOpenCells(grid, distances, count, minSpacing, predicate = () => true) {
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

function scatterCells(grid, rng, char, count, predicate) {
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

function isOpenForFeature(grid, c, r) {
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

function addFogPatches(grid, rng, count) {
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

function ensurePath(grid, start, end) {
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

