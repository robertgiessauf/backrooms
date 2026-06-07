import * as THREE from '../vendor/three.module.js';

export function materialFor(materials, def, part) {
  if (def.theme === "level0") {
    return {
      wall: materials.wallpaper,
      floor: materials.carpet,
      ceiling: materials.dropCeiling,
    }[part];
  }

  if (def.theme === "level2") {
    return {
      wall: materials.tunnelWall,
      floor: materials.tunnelFloor,
      ceiling: materials.tunnelCeiling,
    }[part];
  }

  if (def.theme === "level3") {
    return {
      wall: materials.level3Brick,
      floor: materials.level3Floor,
      ceiling: materials.level3Ceiling,
    }[part];
  }

  if (def.theme === "level4") {
    return {
      wall: materials.officeWall,
      floor: materials.officeFloor,
      ceiling: materials.officeCeiling,
    }[part];
  }

  if (def.theme === "level5") {
    return {
      wall: materials.hotelWall,
      floor: materials.hotelFloor,
      ceiling: materials.hotelCeiling,
    }[part];
  }

  if (def.theme === "level6") {
    return {
      wall: materials.darkConcrete,
      floor: materials.darkFloor,
      ceiling: materials.darkCeiling,
    }[part];
  }

  return {
    wall: materials.concreteWall,
    floor: materials.garageFloor,
    ceiling: materials.garageCeiling,
  }[part];
}

export function createMaterials() {
  const wallpaper = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawWallpaper),
    roughness: 0.96,
    metalness: 0,
  });
  wallpaper.map.wrapS = THREE.RepeatWrapping;
  wallpaper.map.wrapT = THREE.RepeatWrapping;
  wallpaper.map.repeat.set(1.2, 1.2);

  const manilaWall = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawManila),
    roughness: 0.9,
    metalness: 0,
  });
  manilaWall.map.wrapS = THREE.RepeatWrapping;
  manilaWall.map.wrapT = THREE.RepeatWrapping;

  const carpet = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawCarpet),
    roughness: 1,
    metalness: 0,
  });
  carpet.map.wrapS = THREE.RepeatWrapping;
  carpet.map.wrapT = THREE.RepeatWrapping;
  carpet.map.repeat.set(1.4, 1.4);

  const concreteWall = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawConcrete),
    roughness: 0.88,
    metalness: 0,
  });
  concreteWall.map.wrapS = THREE.RepeatWrapping;
  concreteWall.map.wrapT = THREE.RepeatWrapping;

  const garageFloor = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawGarageFloor),
    roughness: 0.72,
    metalness: 0.02,
  });
  garageFloor.map.wrapS = THREE.RepeatWrapping;
  garageFloor.map.wrapT = THREE.RepeatWrapping;
  garageFloor.map.repeat.set(1.7, 1.7);

  const tunnelWall = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawTunnelWall),
    roughness: 0.96,
    metalness: 0,
  });
  tunnelWall.map.wrapS = THREE.RepeatWrapping;
  tunnelWall.map.wrapT = THREE.RepeatWrapping;

  const tunnelFloor = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawTunnelFloor),
    roughness: 0.9,
    metalness: 0.02,
  });
  tunnelFloor.map.wrapS = THREE.RepeatWrapping;
  tunnelFloor.map.wrapT = THREE.RepeatWrapping;
  tunnelFloor.map.repeat.set(1.25, 1.25);

  const level3Brick = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawLevel3Brick),
    roughness: 0.98,
    metalness: 0,
  });
  level3Brick.map.wrapS = THREE.RepeatWrapping;
  level3Brick.map.wrapT = THREE.RepeatWrapping;
  level3Brick.map.repeat.set(1.1, 1.1);

  const level3Floor = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawLevel3Floor),
    roughness: 0.92,
    metalness: 0.01,
  });
  level3Floor.map.wrapS = THREE.RepeatWrapping;
  level3Floor.map.wrapT = THREE.RepeatWrapping;
  level3Floor.map.repeat.set(1.45, 1.45);

  const officeWall = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawOfficeWall),
    roughness: 0.86,
    metalness: 0,
  });
  officeWall.map.wrapS = THREE.RepeatWrapping;
  officeWall.map.wrapT = THREE.RepeatWrapping;
  officeWall.map.repeat.set(1.1, 1.1);

  const officeFloor = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawOfficeFloor),
    roughness: 0.92,
    metalness: 0,
  });
  officeFloor.map.wrapS = THREE.RepeatWrapping;
  officeFloor.map.wrapT = THREE.RepeatWrapping;
  officeFloor.map.repeat.set(1.2, 1.2);

  const hotelWall = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawHotelWall),
    roughness: 0.78,
    metalness: 0,
  });
  hotelWall.map.wrapS = THREE.RepeatWrapping;
  hotelWall.map.wrapT = THREE.RepeatWrapping;
  hotelWall.map.repeat.set(1.08, 1.08);

  const hotelFloor = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 256, drawHotelFloor),
    roughness: 0.68,
    metalness: 0,
  });
  hotelFloor.map.wrapS = THREE.RepeatWrapping;
  hotelFloor.map.wrapT = THREE.RepeatWrapping;
  hotelFloor.map.repeat.set(1.25, 1.25);

  return {
    wallpaper,
    manilaWall,
    carpet,
    manilaCarpet: new THREE.MeshStandardMaterial({ color: 0x8b8055, roughness: 1 }),
    dropCeiling: new THREE.MeshStandardMaterial({ color: 0xb7ad7a, roughness: 0.94 }),
    fixture: new THREE.MeshStandardMaterial({ color: 0xbec6bd, roughness: 0.42, metalness: 0.2 }),
    yellowLight: new THREE.MeshStandardMaterial({ color: 0xffefad, emissive: 0xffe18a, emissiveIntensity: 1.8 }),
    whiteLight: new THREE.MeshStandardMaterial({ color: 0xeef6ff, emissive: 0xdfefff, emissiveIntensity: 1.35 }),
    orangeFixture: new THREE.MeshStandardMaterial({ color: 0x8f7654, roughness: 0.6, metalness: 0.15 }),
    orangeLight: new THREE.MeshStandardMaterial({ color: 0xffad57, emissive: 0xff8f2e, emissiveIntensity: 1.2 }),
    softStain: new THREE.MeshStandardMaterial({ color: 0x6b6242, transparent: true, opacity: 0.28, roughness: 1 }),
    concreteWall,
    garageFloor,
    garageCeiling: new THREE.MeshStandardMaterial({ color: 0x7c817b, roughness: 0.88 }),
    tunnelWall,
    tunnelFloor,
    tunnelCeiling: new THREE.MeshStandardMaterial({ color: 0x3e3a35, roughness: 0.94 }),
    level3Brick,
    level3Floor,
    level3Ceiling: new THREE.MeshStandardMaterial({ color: 0x363432, roughness: 0.72, metalness: 0.28 }),
    officeWall,
    officeFloor,
    officeCeiling: new THREE.MeshStandardMaterial({ color: 0xc2c3b8, roughness: 0.9 }),
    officeTrim: new THREE.MeshStandardMaterial({ color: 0xb7b5a6, roughness: 0.74 }),
    blackedWindow: new THREE.MeshStandardMaterial({ color: 0x020303, roughness: 0.4, metalness: 0.05 }),
    trapWindow: new THREE.MeshStandardMaterial({ color: 0x101b24, emissive: 0x0d2538, emissiveIntensity: 0.65, roughness: 0.18, metalness: 0.02 }),
    officeDesk: new THREE.MeshStandardMaterial({ color: 0x6b5b48, roughness: 0.78, metalness: 0.02 }),
    officeChair: new THREE.MeshStandardMaterial({ color: 0x22272b, roughness: 0.64, metalness: 0.04 }),
    waterCooler: new THREE.MeshStandardMaterial({ color: 0xd8ddd9, roughness: 0.58, metalness: 0.03 }),
    waterJug: new THREE.MeshStandardMaterial({ color: 0x9ec7d9, transparent: true, opacity: 0.56, roughness: 0.14 }),
    vendingMachine: new THREE.MeshStandardMaterial({ color: 0x27343a, roughness: 0.5, metalness: 0.12 }),
    almondWater: new THREE.MeshStandardMaterial({ color: 0xd7c184, emissive: 0x2f2412, emissiveIntensity: 0.08, roughness: 0.46, metalness: 0.02 }),
    hotelWall,
    hotelFloor,
    hotelCeiling: new THREE.MeshStandardMaterial({ color: 0x493128, roughness: 0.82 }),
    hotelWood: new THREE.MeshStandardMaterial({ color: 0x4c2618, roughness: 0.58, metalness: 0.02 }),
    hotelGold: new THREE.MeshStandardMaterial({ color: 0xb88934, roughness: 0.34, metalness: 0.5 }),
    hotelFabric: new THREE.MeshStandardMaterial({ color: 0x6f1e1b, roughness: 0.86, metalness: 0 }),
    hotelPainting: new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: 0.78, metalness: 0 }),
    hotelSpeaker: new THREE.MeshStandardMaterial({ color: 0x211714, roughness: 0.7, metalness: 0.08 }),
    darkConcrete: new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 1, metalness: 0 }),
    darkFloor: new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 1, metalness: 0 }),
    darkCeiling: new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0 }),
    echoLine: new THREE.MeshBasicMaterial({ color: 0x6f8ca1, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    darkWire: new THREE.MeshBasicMaterial({ color: 0x19242c, transparent: true, opacity: 0.18, depthWrite: false }),
    waveHint: new THREE.MeshBasicMaterial({ color: 0x5e8db8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
    copperPipe: new THREE.MeshStandardMaterial({ color: 0x8c5831, roughness: 0.58, metalness: 0.48 }),
    fume: new THREE.MeshBasicMaterial({ color: 0x9a9d8f, transparent: true, opacity: 0.18, depthWrite: false }),
    heatCeiling: new THREE.MeshStandardMaterial({ color: 0xff8b38, emissive: 0xff4d12, emissiveIntensity: 0.75, transparent: true, opacity: 0.72, roughness: 0.42 }),
    elevatorDoor: new THREE.MeshStandardMaterial({ color: 0x363836, roughness: 0.48, metalness: 0.55 }),
    elevatorPanel: new THREE.MeshStandardMaterial({ color: 0x171817, roughness: 0.36, metalness: 0.42 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x4a4944, roughness: 0.64, metalness: 0.38 }),
    pipeDark: new THREE.MeshStandardMaterial({ color: 0x242725, roughness: 0.72, metalness: 0.42 }),
    valve: new THREE.MeshStandardMaterial({ color: 0x6c2f27, roughness: 0.58, metalness: 0.28 }),
    machine: new THREE.MeshStandardMaterial({ color: 0x2f3331, roughness: 0.74, metalness: 0.18 }),
    machinePanel: new THREE.MeshStandardMaterial({ color: 0x111513, roughness: 0.6, metalness: 0.16 }),
    machineLight: new THREE.MeshStandardMaterial({ color: 0xc2a24e, emissive: 0x7f5d1f, emissiveIntensity: 0.25, roughness: 0.42 }),
    trolley: new THREE.MeshStandardMaterial({ color: 0x333735, roughness: 0.52, metalness: 0.35 }),
    barrel: new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.62, metalness: 0.12 }),
    woodCrate: new THREE.MeshStandardMaterial({ color: 0x6b4d31, roughness: 0.9 }),
    cardboard: new THREE.MeshStandardMaterial({ color: 0x76634a, roughness: 0.95 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xc7bda1, roughness: 1 }),
    toolMetal: new THREE.MeshStandardMaterial({ color: 0x5b5f5d, roughness: 0.45, metalness: 0.55 }),
    glassShard: new THREE.MeshStandardMaterial({ color: 0xa9c2c5, transparent: true, opacity: 0.38, roughness: 0.08 }),
    concretePillar: new THREE.MeshStandardMaterial({ map: concreteWall.map, color: 0xb0b2aa, roughness: 0.86 }),
    pillarStripe: new THREE.MeshStandardMaterial({ color: 0xd4bb52, roughness: 0.62 }),
    parkingLine: new THREE.MeshStandardMaterial({ color: 0xe3d67b, roughness: 0.8 }),
    torchBody: new THREE.MeshStandardMaterial({ color: 0x242728, roughness: 0.46, metalness: 0.18 }),
    torchHead: new THREE.MeshStandardMaterial({ color: 0x3b3f40, roughness: 0.38, metalness: 0.32 }),
    torchLens: new THREE.MeshStandardMaterial({ color: 0xfff1bd, emissive: 0xf0d67a, emissiveIntensity: 0.55, roughness: 0.2 }),
    houndSkin: new THREE.MeshStandardMaterial({ color: 0xa88480, roughness: 0.92, metalness: 0 }),
    houndRib: new THREE.MeshStandardMaterial({ color: 0x7a5d5a, roughness: 0.95 }),
    houndBruise: new THREE.MeshStandardMaterial({ color: 0x5b3d42, roughness: 0.98 }),
    houndHair: new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 1 }),
    houndMouth: new THREE.MeshStandardMaterial({ color: 0x120708, roughness: 0.8 }),
    houndEye: new THREE.MeshStandardMaterial({ color: 0x8f0f12, emissive: 0x5f0507, emissiveIntensity: 0.8, roughness: 0.35 }),
    houndClaw: new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.42, metalness: 0.08 }),
    carRed: new THREE.MeshStandardMaterial({ color: 0x9b2d2a, roughness: 0.55, metalness: 0.08 }),
    carBlue: new THREE.MeshStandardMaterial({ color: 0x2d527d, roughness: 0.55, metalness: 0.08 }),
    carWhite: new THREE.MeshStandardMaterial({ color: 0xd6d8d2, roughness: 0.48, metalness: 0.06 }),
    carBlack: new THREE.MeshStandardMaterial({ color: 0x111312, roughness: 0.5, metalness: 0.1 }),
    carGlass: new THREE.MeshStandardMaterial({ color: 0x26343a, roughness: 0.22, metalness: 0.05, transparent: true, opacity: 0.72 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x080909, roughness: 0.82 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xaeb3ad, roughness: 0.36, metalness: 0.45 }),
    bumper: new THREE.MeshStandardMaterial({ color: 0x1f2220, roughness: 0.44, metalness: 0.2 }),
    grille: new THREE.MeshStandardMaterial({ color: 0x050606, roughness: 0.52, metalness: 0.25 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xf4efd7, emissive: 0xd7c47f, emissiveIntensity: 0.25, roughness: 0.22 }),
    tailLight: new THREE.MeshStandardMaterial({ color: 0xa42a24, emissive: 0x7c110e, emissiveIntensity: 0.2, roughness: 0.3 }),
    wheelArch: new THREE.MeshStandardMaterial({ color: 0x101211, roughness: 0.7 }),
    water: new THREE.MeshStandardMaterial({ color: 0x293846, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.64 }),
    falsePuddle: new THREE.MeshStandardMaterial({ color: 0x17202b, roughness: 0.08, metalness: 0.01, transparent: true, opacity: 0.72 }),
    teeth: new THREE.MeshStandardMaterial({ color: 0xe9e5cf, roughness: 0.66 }),
    smilerShadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    smilerGlow: new THREE.MeshBasicMaterial({ color: 0xfff7df, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    smilerRedGlow: new THREE.MeshBasicMaterial({ color: 0xff1d16, transparent: true, opacity: 0.54, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    smilerGreenGlow: new THREE.MeshBasicMaterial({ color: 0x27ff54, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    smilerBlueGlow: new THREE.MeshBasicMaterial({ color: 0x24b8ff, transparent: true, opacity: 0.46, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    deathmothWing: new THREE.MeshStandardMaterial({ map: canvasTexture(256, 256, drawDeathmothWing), color: 0x8b6a3f, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, roughness: 0.82, metalness: 0 }),
    deathmothBody: new THREE.MeshStandardMaterial({ color: 0x4b3324, roughness: 0.95, metalness: 0 }),
    deathmothFur: new THREE.MeshStandardMaterial({ color: 0x9a7c50, roughness: 1, metalness: 0 }),
    deathmothEye: new THREE.MeshStandardMaterial({ color: 0x241511, emissive: 0x5a2616, emissiveIntensity: 0.2, roughness: 0.6 }),
    fogVolume: new THREE.MeshStandardMaterial({ color: 0xdfe5de, transparent: true, opacity: 0.09, depthWrite: false }),
    exitDoor: new THREE.MeshStandardMaterial({ color: 0x1f2a24, roughness: 0.76, metalness: 0.04 }),
    stair: new THREE.MeshStandardMaterial({ color: 0x575b57, roughness: 0.82 }),
    exitSign: new THREE.MeshStandardMaterial({ color: 0x56c276, emissive: 0x1f8f44, emissiveIntensity: 0.9 }),
  };
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawWallpaper(ctx, w, h) {
  ctx.fillStyle = "#d3bd55";
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 18) {
    ctx.fillStyle = x % 36 === 0 ? "rgba(255,244,145,0.2)" : "rgba(78,70,25,0.12)";
    ctx.fillRect(x, 0, 4, h);
  }
  for (let y = 0; y < h; y += 28) {
    ctx.fillStyle = "rgba(76,65,26,0.12)";
    ctx.fillRect(0, y, w, 2);
  }
  for (let i = 0; i < 120; i += 1) {
    const x = (i * 47) % w;
    const y = (i * 83) % h;
    ctx.fillStyle = i % 3 === 0 ? "rgba(85,74,28,0.14)" : "rgba(255,242,142,0.11)";
    ctx.fillRect(x, y, 2 + (i % 5), 1 + (i % 4));
  }
}

function drawManila(ctx, w, h) {
  ctx.fillStyle = "#c4a45e";
  ctx.fillRect(0, 0, w, h);
  for (let y = 12; y < h; y += 24) {
    for (let x = 10; x < w; x += 24) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(76,54,28,0.22)";
      ctx.arc(x + ((y / 24) % 2) * 10, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(255,220,130,0.16)";
  ctx.fillRect(0, 0, w, h);
}

function drawCarpet(ctx, w, h) {
  ctx.fillStyle = "#7c7049";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 600; i += 1) {
    const x = (i * 29) % w;
    const y = (i * 71) % h;
    const shade = 75 + (i % 38);
    ctx.fillStyle = `rgba(${shade},${shade - 6},${shade - 28},0.26)`;
    ctx.fillRect(x, y, 1 + (i % 4), 1);
  }
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = "rgba(45,42,30,0.09)";
    ctx.beginPath();
    ctx.ellipse((i * 53) % w, (i * 91) % h, 10 + (i % 6) * 4, 4 + (i % 4), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawConcrete(ctx, w, h) {
  ctx.fillStyle = "#8c908a";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 520; i += 1) {
    const v = 112 + (i % 42);
    ctx.fillStyle = `rgba(${v},${v + 1},${v - 2},0.32)`;
    ctx.fillRect((i * 37) % w, (i * 61) % h, 2, 2);
  }
  ctx.strokeStyle = "rgba(62,64,61,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.48);
  ctx.lineTo(w, h * 0.52);
  ctx.moveTo(w * 0.46, 0);
  ctx.lineTo(w * 0.53, h);
  ctx.stroke();
}

function drawGarageFloor(ctx, w, h) {
  drawConcrete(ctx, w, h);
  ctx.fillStyle = "rgba(28,31,29,0.16)";
  for (let i = 0; i < 26; i += 1) {
    ctx.beginPath();
    ctx.ellipse((i * 41) % w, (i * 97) % h, 10 + (i % 7) * 2, 3 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTunnelWall(ctx, w, h) {
  ctx.fillStyle = "#5a5148";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    ctx.fillStyle = "rgba(42,34,30,0.24)";
    ctx.fillRect(0, y, w, 2);
  }
  for (let y = 0; y < h; y += 32) {
    const offset = (y / 32) % 2 === 0 ? 0 : 28;
    for (let x = -offset; x < w; x += 56) {
      ctx.fillStyle = "rgba(31,27,25,0.22)";
      ctx.fillRect(x, y, 2, 32);
      ctx.fillStyle = "rgba(113,96,78,0.11)";
      ctx.fillRect(x + 3, y + 3, 48, 20);
    }
  }
  for (let i = 0; i < 520; i += 1) {
    const v = 66 + (i % 45);
    ctx.fillStyle = `rgba(${v},${v - 5},${v - 9},0.2)`;
    ctx.fillRect((i * 29) % w, (i * 73) % h, 1 + (i % 3), 1);
  }
}

function drawTunnelFloor(ctx, w, h) {
  ctx.fillStyle = "#4a4741";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i += 1) {
    const v = 45 + (i % 48);
    ctx.fillStyle = `rgba(${v},${v},${v - 4},0.26)`;
    ctx.fillRect((i * 41) % w, (i * 83) % h, 2 + (i % 4), 1);
  }
  for (let i = 0; i < 22; i += 1) {
    ctx.fillStyle = "rgba(25,23,21,0.22)";
    ctx.beginPath();
    ctx.ellipse((i * 61) % w, (i * 97) % h, 8 + (i % 8) * 3, 3 + (i % 4), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLevel3Brick(ctx, w, h) {
  ctx.fillStyle = "#4a3327";
  ctx.fillRect(0, 0, w, h);
  const brickH = 28;
  const brickW = 58;
  for (let y = 0; y < h + brickH; y += brickH) {
    const offset = (Math.floor(y / brickH) % 2) * (brickW * 0.5);
    for (let x = -offset; x < w + brickW; x += brickW) {
      const v = 66 + ((x + y) % 34);
      ctx.fillStyle = `rgba(${v + 22},${v + 2},${v - 12},0.38)`;
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
      ctx.strokeStyle = "rgba(30,22,18,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, brickW, brickH);
    }
  }
  for (let i = 0; i < 520; i += 1) {
    const v = 48 + (i % 55);
    ctx.fillStyle = `rgba(${v},${v - 7},${v - 14},0.32)`;
    ctx.fillRect((i * 41) % w, (i * 67) % h, 1 + (i % 4), 1 + (i % 3));
  }
}

function drawLevel3Floor(ctx, w, h) {
  ctx.fillStyle = "#5c5b56";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    for (let x = 0; x < w; x += 32) {
      ctx.fillStyle = "rgba(116,116,110,0.22)";
      ctx.fillRect(x + 1, y + 1, 30, 30);
      ctx.strokeStyle = "rgba(36,35,33,0.45)";
      ctx.strokeRect(x, y, 32, 32);
    }
  }
  for (let i = 0; i < 620; i += 1) {
    const v = 75 + (i % 44);
    ctx.fillStyle = `rgba(${v},${v},${v - 4},0.24)`;
    ctx.fillRect((i * 29) % w, (i * 91) % h, 1 + (i % 3), 1);
  }
}

function drawOfficeWall(ctx, w, h) {
  ctx.fillStyle = "#c9c7b8";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 42) {
    ctx.fillStyle = "rgba(118,115,96,0.12)";
    ctx.fillRect(0, y, w, 2);
  }
  ctx.fillStyle = "rgba(87,83,70,0.18)";
  ctx.fillRect(0, h * 0.72, w, 5);
  for (let i = 0; i < 460; i += 1) {
    const v = 172 + (i % 36);
    ctx.fillStyle = `rgba(${v},${v},${v - 12},0.16)`;
    ctx.fillRect((i * 37) % w, (i * 83) % h, 1 + (i % 3), 1);
  }
  for (let i = 0; i < 16; i += 1) {
    ctx.fillStyle = "rgba(95,90,72,0.08)";
    ctx.beginPath();
    ctx.ellipse((i * 59) % w, (i * 101) % h, 14 + (i % 5) * 4, 5 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOfficeFloor(ctx, w, h) {
  ctx.fillStyle = "#777669";
  ctx.fillRect(0, 0, w, h);
  const tile = 32;
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      const shade = 112 + ((x + y) % 28);
      ctx.fillStyle = `rgba(${shade},${shade},${shade - 10},0.32)`;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      ctx.strokeStyle = "rgba(54,54,48,0.28)";
      ctx.strokeRect(x, y, tile, tile);
    }
  }
  for (let i = 0; i < 520; i += 1) {
    const v = 72 + (i % 50);
    ctx.fillStyle = `rgba(${v},${v},${v - 5},0.18)`;
    ctx.fillRect((i * 29) % w, (i * 71) % h, 2 + (i % 4), 1);
  }
}

function drawHotelWall(ctx, w, h) {
  ctx.fillStyle = "#4b1715";
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 28) {
    ctx.fillStyle = "rgba(184,132,47,0.22)";
    ctx.fillRect(x, 0, 3, h);
    ctx.fillStyle = "rgba(89,30,25,0.38)";
    ctx.fillRect(x + 8, 0, 8, h);
  }
  for (let y = 12; y < h; y += 34) {
    ctx.strokeStyle = "rgba(210,163,68,0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const py = y + Math.sin(x * 0.12) * 4;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 36; i += 1) {
    const x = (i * 53) % w;
    const y = (i * 79) % h;
    ctx.fillStyle = "rgba(17,9,8,0.18)";
    ctx.beginPath();
    ctx.ellipse(x, y, 5 + (i % 4), 9 + (i % 5), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHotelFloor(ctx, w, h) {
  ctx.fillStyle = "#2f1b13";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 26) {
    const shade = 48 + (y % 34);
    ctx.fillStyle = `rgba(${shade + 18},${shade - 2},${shade - 14},0.7)`;
    ctx.fillRect(0, y, w, 24);
    ctx.strokeStyle = "rgba(18,10,7,0.42)";
    ctx.strokeRect(0, y, w, 24);
  }
  for (let x = 0; x < w; x += 18) {
    ctx.fillStyle = "rgba(111,76,36,0.18)";
    ctx.fillRect(x, 0, 2, h);
  }
  for (let i = 0; i < 260; i += 1) {
    const v = 54 + (i % 40);
    ctx.fillStyle = `rgba(${v + 18},${v},${v - 16},0.2)`;
    ctx.fillRect((i * 41) % w, (i * 67) % h, 4 + (i % 6), 1);
  }
}

function drawDeathmothWing(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const wing = new Path2D();
  wing.moveTo(w * 0.08, h * 0.58);
  wing.bezierCurveTo(w * 0.18, h * 0.14, w * 0.62, h * 0.04, w * 0.9, h * 0.28);
  wing.bezierCurveTo(w * 0.78, h * 0.44, w * 0.72, h * 0.74, w * 0.48, h * 0.9);
  wing.bezierCurveTo(w * 0.26, h * 0.82, w * 0.14, h * 0.72, w * 0.08, h * 0.58);
  wing.closePath();

  const gradient = ctx.createRadialGradient(w * 0.42, h * 0.46, 8, w * 0.42, h * 0.46, w * 0.62);
  gradient.addColorStop(0, "rgba(173,122,54,0.92)");
  gradient.addColorStop(0.48, "rgba(102,60,31,0.82)");
  gradient.addColorStop(1, "rgba(35,23,17,0.78)");
  ctx.fillStyle = gradient;
  ctx.fill(wing);

  ctx.save();
  ctx.clip(wing);
  ctx.strokeStyle = "rgba(38,24,17,0.58)";
  ctx.lineWidth = 5;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.moveTo(w * 0.11, h * 0.58);
    ctx.quadraticCurveTo(w * (0.28 + i * 0.06), h * (0.32 + Math.sin(i) * 0.1), w * (0.68 + i * 0.025), h * (0.2 + i * 0.07));
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(221,178,83,0.34)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 36; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 43) % w, (i * 71) % h, 2 + (i % 4), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
