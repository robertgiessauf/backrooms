import * as THREE from "../../vendor/three.module.js";

const SMILER_MAX_ACTIVE = 2;
const SMILER_SPAWN_MIN_RANGE = 15;
const SMILER_TRIGGER_RANGE = 6.8;
const SMILER_ATTACK_RANGE = 1.05;
const SMILER_RUSH_SPEED = 12.5;

export function updateSmilers(deps, dt) {
  const { state, player, camera, materials, distance2D, hasClearPath2D, levelHasEntity, resetCurrentLevel, torchRange } = deps;
  if (!state.level || !levelHasEntity(state.level.def, "smiler") || state.inventoryOpen || player.ended) {
    return;
  }

  for (let i = state.level.smilers.length - 1; i >= 0; i -= 1) {
    const smiler = state.level.smilers[i];
    smiler.age += dt;
    smiler.animation += dt;

    const distance = distance2D(smiler.position, player.position);
    const lit = state.equippedItemId === "torch" && distance <= torchRange * 0.95;
    const inTriggerRange = distance < SMILER_TRIGGER_RANGE && hasClearPath2D(player.position.x, player.position.z, smiler.position.x, smiler.position.z, -0.06);

    if (lit || inTriggerRange) {
      smiler.mode = "rush";
    }

    if (smiler.mode === "rush") {
      moveSmilerToward(smiler, player.position.x, player.position.z, SMILER_RUSH_SPEED, dt);
      const nextDistance = distance2D(smiler.position, player.position);
      animateSmiler(smiler, nextDistance, camera);
      if (nextDistance < SMILER_ATTACK_RANGE) {
        player.health = 0;
        resetCurrentLevel("The smile reaches you from the dark.");
        return;
      }
      continue;
    }

    animateSmiler(smiler, distance, camera);

    if (smiler.age >= smiler.lifetime) {
      removeSmiler(state.level, smiler);
    }
  }

  state.level.smilerSpawnTimer -= dt;
  if (state.level.smilerSpawnTimer <= 0) {
    if (state.level.smilers.length < SMILER_MAX_ACTIVE) {
      spawnSmiler(state, player, materials, distance2D);
    }
    state.level.smilerSpawnTimer = 6 + state.level.rng() * 12;
  }
}

export function prepareSmilerSpawns(ctx, rows, width, depth, cellCenter, charAt, tile, deps) {
  const { distance2D } = deps;
  const minLightDistance = ctx.def.tile * 4.1;
  const minStartDistance = ctx.def.tile * 7;
  ctx.smilerSpawnPoints = [];

  for (let r = 1; r < depth - 1; r += 1) {
    for (let c = 1; c < width - 1; c += 1) {
      const ch = charAt(c, r);
      if (ch === "#" || ch === "S" || ch === "E") {
        continue;
      }
      const center = cellCenter(c, r);
      if (distance2D(center, ctx.start) < minStartDistance || ctx.exitZones.some((zone) => distance2D(center, zone) < ctx.def.tile * 4)) {
        continue;
      }
      for (const side of getWallFaceAnchors(center, c, r, charAt, tile)) {
        if (ctx.flickerLights.every((light) => distance2D(side, light) > minLightDistance)) {
          ctx.smilerSpawnPoints.push(side);
        }
      }
    }
  }

  if (ctx.smilerSpawnPoints.length < 10) {
    ctx.smilerSpawnPoints = [];
    for (let r = 1; r < depth - 1; r += 1) {
      for (let c = 1; c < width - 1; c += 1) {
        const ch = charAt(c, r);
        if (ch === "#" || ch === "S" || ch === "E") {
          continue;
        }
        const center = cellCenter(c, r);
        if (distance2D(center, ctx.start) < minStartDistance) {
          continue;
        }
        for (const side of getWallFaceAnchors(center, c, r, charAt, tile)) {
          if (ctx.flickerLights.every((light) => distance2D(side, light) > ctx.def.tile * 2.7)) {
            ctx.smilerSpawnPoints.push(side);
          }
        }
      }
    }
  }

  ctx.smilerSpawnTimer = 5 + ctx.rng() * 8;
}

function spawnSmiler(state, player, materials, distance2D) {
  const level = state.level;
  if (!level.smilerSpawnPoints.length) {
    return;
  }

  const candidates = level.smilerSpawnPoints.filter((point) => {
    const distance = distance2D(point, player.position);
    return distance >= SMILER_SPAWN_MIN_RANGE && distance < 62;
  });
  const pool = candidates.length > 0 ? candidates : level.smilerSpawnPoints.filter((point) => distance2D(point, player.position) >= SMILER_SPAWN_MIN_RANGE);
  if (!pool.length) {
    return;
  }

  const point = pool[Math.floor(level.rng() * pool.length)];
  const smiler = createSmiler(point.x, point.z, point.rotationY, 10 + level.rng() * 20, level.rng, materials);
  level.smilers.push(smiler);
  level.group.add(smiler.group);
}

function removeSmiler(level, smiler) {
  const index = level.smilers.indexOf(smiler);
  if (index >= 0) {
    level.smilers.splice(index, 1);
  }
  level.group.remove(smiler.group);
}

function moveSmilerToward(smiler, x, z, speed, dt) {
  const dx = x - smiler.position.x;
  const dz = z - smiler.position.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.001) {
    return;
  }

  const step = Math.min(speed * dt, length);
  smiler.position.x += (dx / length) * step;
  smiler.position.z += (dz / length) * step;
  smiler.group.position.copy(smiler.position);
}

function animateSmiler(smiler, distance, camera) {
  smiler.face.scale.setScalar(smiler.mode === "rush" ? 1.04 : 1);
  if (smiler.mode === "rush") {
    smiler.group.lookAt(camera.position.x, smiler.group.position.y, camera.position.z);
  } else {
    smiler.group.rotation.y = smiler.wallRotationY;
  }
  smiler.shadow.material.opacity = smiler.mode === "rush" ? 0.58 : 0.46;
  smiler.group.position.y = smiler.eyeHeight + Math.sin(smiler.animation * 0.35) * 0.025 + THREE.MathUtils.clamp((18 - distance) * 0.006, 0, 0.09);
}

function createSmiler(x, z, rotationY, lifetime, rng, materials) {
  const group = new THREE.Group();
  const eyeHeight = 1.58;
  group.position.set(x, eyeHeight, z);
  group.rotation.y = rotationY;

  const face = new THREE.Group();
  group.add(face);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 36), materials.smilerShadow.clone());
  shadow.scale.set(1.1, 0.92, 1);
  face.add(shadow);

  for (let i = 0; i < 18; i += 1) {
    const haze = new THREE.Mesh(new THREE.CircleGeometry(0.12 + rng() * 0.28, 14), materials.smilerShadow.clone());
    haze.material.opacity = 0.18 + rng() * 0.18;
    haze.position.set((rng() - 0.5) * 2.05, (rng() - 0.5) * 1.35, -0.015 - i * 0.0005);
    haze.scale.set(1.2 + rng() * 1.7, 0.8 + rng() * 1.2, 1);
    face.add(haze);
  }

  addSmilerEye(face, -0.39, 0.28, materials);
  addSmilerEye(face, 0.39, 0.28, materials);
  addSmilerMouth(face, materials);

  return {
    group,
    face,
    shadow,
    position: new THREE.Vector3(x, eyeHeight, z),
    eyeHeight,
    wallRotationY: rotationY,
    age: 0,
    lifetime,
    animation: rng() * Math.PI * 2,
    mode: "watch",
  };
}

function addSmilerEye(face, x, y, materials) {
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.14, 18), materials.smilerGlow);
  eye.position.set(x, y, 0.03);
  eye.scale.set(0.8, 1.25, 1);
  face.add(eye);

  const red = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), materials.smilerRedGlow);
  red.position.set(x - 0.045, y + 0.015, 0.025);
  red.scale.copy(eye.scale);
  face.add(red);

  const blue = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), materials.smilerBlueGlow);
  blue.position.set(x + 0.04, y - 0.01, 0.02);
  blue.scale.copy(eye.scale);
  face.add(blue);
}

function addSmilerMouth(face, materials) {
  const points = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    points.push(new THREE.Vector3((t - 0.5) * 1.35, -0.13 - Math.sin(t * Math.PI) * 0.36, 0.035));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  face.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.035, 8, false), materials.smilerGlow));

  const red = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.038, 8, false), materials.smilerRedGlow);
  red.position.set(-0.035, 0.025, -0.003);
  face.add(red);

  const blue = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.038, 8, false), materials.smilerBlueGlow);
  blue.position.set(0.035, -0.02, -0.006);
  face.add(blue);

  const green = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.03, 8, false), materials.smilerGreenGlow);
  green.position.set(0.015, 0, -0.009);
  face.add(green);

  for (let i = 0; i < 15; i += 1) {
    const t = (i + 0.5) / 15;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18 + Math.sin(t * Math.PI) * 0.08, 4), materials.smilerGlow);
    tooth.position.set((t - 0.5) * 1.22, -0.15 - Math.sin(t * Math.PI) * 0.32, 0.06);
    tooth.rotation.z = (t - 0.5) * 0.72;
    tooth.rotation.x = Math.PI;
    face.add(tooth);
  }
}

function getWallFaceAnchors(center, c, r, charAt, tile) {
  const sides = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];
  const anchors = [];
  for (const side of sides) {
    if (charAt(c + side.dc, r + side.dr) !== "#") {
      continue;
    }
    const x = center.x + side.dc * (tile * 0.5 - 0.14);
    const z = center.z + side.dr * (tile * 0.5 - 0.14);
    const inwardX = -side.dc;
    const inwardZ = -side.dr;
    anchors.push({ x, z, rotationY: Math.atan2(inwardX, inwardZ) });
  }
  return anchors;
}
