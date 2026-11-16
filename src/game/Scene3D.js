import * as THREE from 'three';
import { BOARD_TILES, TOTAL_TILES, formatShortRupiah } from '../../shared/boardData.js';
import { getCharacterById } from '../../shared/characters.js';
import { soundEngine } from './SoundEngine.js';

const R_IN = 10.7;
const R_OUT = 16.3;
const R_MID = (R_IN + R_OUT) / 2;
const BOARD_Y = 1.65;
const START_ANGLE = Math.PI * 0.22; // Bottom-right, matching gameplay-2.jpg & gameplay-3.jpg!

function tileAngle(tileId) {
  return START_ANGLE + (tileId / TOTAL_TILES) * Math.PI * 2;
}

function tileWorldPos(tileId, radius = R_MID, angleOffset = 0) {
  const a = tileAngle(tileId) + angleOffset;
  return new THREE.Vector3(Math.cos(a) * radius, BOARD_Y, Math.sin(a) * radius);
}

function createTileSectorGeometry(rIn, rOut, angleSpan, segments = 6) {
  const half = angleSpan / 2;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = -half + t * angleSpan;
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    // inner vertex (v = 1 -> top of canvas), u = 1 - t so text reads L->R upright!
    positions.push(ca * rIn, 0, sa * rIn);
    normals.push(0, 1, 0);
    uvs.push(1 - t, 1);

    // outer vertex (v = 0 -> bottom of canvas)
    positions.push(ca * rOut, 0, sa * rOut);
    normals.push(0, 1, 0);
    uvs.push(1 - t, 0);
  }

  for (let i = 0; i < segments; i++) {
    const p0 = i * 2;
    const p1 = p0 + 1;
    const p2 = p0 + 2;
    const p3 = p0 + 3;
    indices.push(p0, p2, p1);
    indices.push(p1, p2, p3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function createOwnerGlowBorderGeometry(rIn, rOut, angleSpan, height = 0.45) {
  const half = angleSpan / 2;
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(-half) * rIn, Math.sin(-half) * rIn);
  shape.lineTo(Math.cos(-half) * rOut, Math.sin(-half) * rOut);
  shape.lineTo(Math.cos(half) * rOut, Math.sin(half) * rOut);
  shape.lineTo(Math.cos(half) * rIn, Math.sin(half) * rIn);
  shape.closePath();

  const extrude = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  extrude.rotateX(Math.PI / 2);
  return extrude;
}

function drawOutlinedText(ctx, text, x, y, font, fill = '#ffffff', stroke = '#1c1510', lineWidth = 7) {
  ctx.font = font;
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function makeTileTexture(tile, ownerInfo = null) {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');

  // Tile surface matching gameplay-3.jpg (warm ivory / beige for special, teal-tinted when owned)
  let baseFill = '#efeadf';
  if (tile.type === 'lobby') baseFill = '#d7be98';
  else if (tile.type === 'policy') baseFill = '#eef2f5';
  else if (tile.type === 'jail') baseFill = '#ebe6dc';
  else if (tile.type === 'transport') baseFill = '#e2e9ee';
  else if (tile.type === 'property') baseFill = '#ede6d8';

  ctx.fillStyle = baseFill;
  ctx.fillRect(0, 0, 280, 420);

  if (ownerInfo) {
    ctx.fillStyle = `${ownerInfo.color}40`;
    ctx.fillRect(0, 0, 280, 420);
  }

  // Outer frame border
  ctx.strokeStyle = ownerInfo ? ownerInfo.color : '#8b7e6b';
  ctx.lineWidth = ownerInfo ? 16 : 6;
  ctx.strokeRect(4, 4, 272, 412);

  // Inner subtle zone for 3D prop (top/inner half of tile)
  if (tile.type === 'property') {
    // Crisp top color bar along inner ring (matching gameplay-3.jpg!)
    ctx.fillStyle = tile.color || '#64748b';
    ctx.fillRect(10, 10, 260, 40);
    ctx.strokeStyle = '#251a12';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 260, 40);
    // Warm sand inner patch
    ctx.fillStyle = '#d2c2a3';
    ctx.fillRect(14, 54, 252, 130);
  } else if (tile.type === 'transport') {
    ctx.fillStyle = '#4f6d82';
    ctx.fillRect(10, 10, 260, 165);
  } else if (tile.type === 'tax') {
    ctx.fillStyle = '#d9d2c5';
    ctx.fillRect(10, 10, 260, 155);
  } else if (tile.type === 'policy') {
    // Draw the crisp white card switch icon seen on KEBIJAKAN tiles in gameplay-3.jpg!
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.fillRect(68, 72, 144, 96);
    ctx.strokeRect(68, 72, 144, 96);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(92, 112, 34, 14);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(172, 120, 16, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = tile.color || '#334155';
    ctx.fillRect(10, 10, 260, 26);
  }

  // Signature Black-Outlined Bold White Cartoon Tile Title (exact look of gameplay-3.jpg!)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = tile.shortName.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length <= 13) {
      line = (line + ' ' + w).trim();
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);

  const fontSize = lines.length >= 3 ? 25 : lines[0].length > 10 ? 27 : 32;
  const startY = 264 - (lines.length - 1) * 18;
  lines.forEach((ln, idx) => {
    drawOutlinedText(
      ctx,
      ln,
      140,
      startY + idx * (fontSize + 5),
      `900 ${fontSize}px Fredoka, Nunito, sans-serif`,
      '#ffffff',
      '#1e150e',
      7
    );
  });

  // Price or action text below title (dark clean font or red for tax, matching gameplay-3.jpg!)
  const bottomText = tile.price ? formatShortRupiah(tile.price) : tile.subtitle || '';
  if (bottomText && !ownerInfo) {
    ctx.font = '800 26px Nunito, sans-serif';
    ctx.fillStyle = tile.type === 'tax' ? '#b91c1c' : '#3a2e25';
    ctx.fillText(bottomText, 140, 355);
  } else if (bottomText && ownerInfo) {
    ctx.font = '800 22px Nunito, sans-serif';
    ctx.fillStyle = '#251a12';
    ctx.fillText(bottomText, 140, 332);
  }

  // Bright Owner Strip at bottom (exact look of Bot Yanti cyan strip in gameplay-3.jpg!)
  if (ownerInfo) {
    ctx.fillStyle = ownerInfo.color;
    ctx.fillRect(10, 362, 260, 48);
    drawOutlinedText(
      ctx,
      ownerInfo.name.slice(0, 14),
      140,
      387,
      '900 24px Nunito, sans-serif',
      '#ffffff',
      '#172026',
      4
    );
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeDiceFaceTexture(value) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fcfbf7';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#c8bfb0';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 120, 120);

  const pip = (x, y, red = false) => {
    ctx.beginPath();
    ctx.arc(x, y, red ? 15 : 12, 0, Math.PI * 2);
    ctx.fillStyle = red ? '#dc2626' : '#1f2937';
    ctx.fill();
  };

  const c = 64;
  const l = 34;
  const r = 94;
  if (value === 1) pip(c, c, true);
  if (value === 2) {
    pip(l, l);
    pip(r, r);
  }
  if (value === 3) {
    pip(l, l);
    pip(c, c);
    pip(r, r);
  }
  if (value === 4) {
    pip(l, l);
    pip(r, l);
    pip(l, r);
    pip(r, r);
  }
  if (value === 5) {
    pip(l, l);
    pip(r, l);
    pip(c, c);
    pip(l, r);
    pip(r, r);
  }
  if (value === 6) {
    pip(l, l);
    pip(r, l);
    pip(l, c);
    pip(r, c);
    pip(l, r);
    pip(r, r);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const DICE_TOP_ROTATIONS = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
};

function makeBuildingWindowTexture(baseHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 256);

  // Subtle floor bands
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < 256; y += 24) {
    ctx.fillRect(0, y, 128, 3);
  }

  for (let y = 10; y < 246; y += 24) {
    for (let x = 10; x < 118; x += 22) {
      const lit = Math.random() > 0.22;
      ctx.fillStyle = lit ? '#6ea6c9' : '#e5d8b8';
      ctx.fillRect(x, y, 14, 14);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Scene3D {
  constructor(container, onSelectTile = null) {
    this.container = container;
    this.onSelectTile = onSelectTile;
    this.mode = 'lobby';
    this.disposed = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#8bc8ea');
    this.scene.fog = new THREE.Fog('#9cd0ee', 66, 145);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 230);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.orbit = {
      theta: Math.PI / 2,
      phi: 0.78,
      radius: 40,
      target: new THREE.Vector3(0, 1.3, 0.5),
      desiredTheta: Math.PI / 2,
      desiredPhi: 0.78,
      desiredRadius: 40,
      desiredTarget: new THREE.Vector3(0, 1.3, 0.5),
      dragging: false,
      lastX: 0,
      lastY: 0,
      userControlledUntil: 0,
    };

    this.tileMeshes = new Map();
    this.tileGlowMeshes = new Map();
    this.tileOwnersHash = new Map();
    this.upgradeGroups = new Map();
    this.defaultProps = new Map();
    this.pawns = new Map();
    this.cars = [];
    this.flagMesh = null;
    this.dice = [];
    this.diceAnim = null;
    this.clock = new THREE.Clock();

    this.setupLights();
    this.buildCityEnvironment();
    this.buildCircularBoard();
    this.buildDice();
    this.bindControls();

    this.onResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight('#d6efff', '#59ad42', 0.96);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff9eb', 1.38);
    sun.position.set(22, 48, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 140;
    const d = 40;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  buildCityEnvironment() {
    // Lush vibrant green lawn (matching gameplay-1 & gameplay-2!)
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(190, 190),
      new THREE.MeshStandardMaterial({ color: '#6ec44a', roughness: 0.9 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // Inner bright green park lawn square framed by cream footpath (exact gameplay-2 silhouette!)
    const walkMat = new THREE.MeshStandardMaterial({ color: '#efead9', roughness: 0.88 });
    const parkHalf = 21.5;
    const walkW = 2.6;
    const walks = [
      [0, parkHalf, parkHalf * 2 + walkW, walkW],
      [0, -parkHalf, parkHalf * 2 + walkW, walkW],
      [parkHalf, 0, walkW, parkHalf * 2],
      [-parkHalf, 0, walkW, parkHalf * 2],
    ];
    for (const [x, z, w, h] of walks) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, h), walkMat);
      m.position.set(x, 0.07, z);
      m.receiveShadow = true;
      this.scene.add(m);
    }

    // Perimeter asphalt roads with crosswalk bands
    const roadMat = new THREE.MeshStandardMaterial({ color: '#39404b', roughness: 0.95 });
    const roadOffset = 32;
    const roadW = 6.8;
    const roads = [
      [0, roadOffset, 136, roadW],
      [0, -roadOffset, 136, roadW],
      [roadOffset, 0, roadW, 136],
      [-roadOffset, 0, roadW, 136],
    ];
    for (const [x, z, w, h] of roads) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, h), roadMat);
      r.position.set(x, 0.04, z);
      r.receiveShadow = true;
      this.scene.add(r);
    }

    // Elevated white concrete toll flyover wrapping the back & sides (exact look of gameplay-1 & gameplay-2!)
    const flyMat = new THREE.MeshStandardMaterial({ color: '#e6e3da', roughness: 0.82 });
    const flyRailMat = new THREE.MeshStandardMaterial({ color: '#c4c0b5', roughness: 0.85 });
    const flyDeck = new THREE.Mesh(new THREE.BoxGeometry(132, 0.95, 5.4), flyMat);
    flyDeck.position.set(0, 7.8, -40);
    flyDeck.castShadow = true;
    this.scene.add(flyDeck);
    [-2.5, 2.5].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(132, 0.5, 0.3), flyRailMat);
      rail.position.set(0, 8.45, -40 + rz);
      this.scene.add(rail);
    });
    for (let x = -56; x <= 56; x += 12) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 7.8, 1.8), flyMat);
      pillar.position.set(x, 3.9, -40);
      pillar.castShadow = true;
      this.scene.add(pillar);
    }

    // Black street lamps with round cream globes around the park walkway (gameplay-2.jpg!)
    const poleMat = new THREE.MeshStandardMaterial({ color: '#2b323b', roughness: 0.55 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fffde7', emissive: '#fef08a', emissiveIntensity: 0.35 });
    for (let p = -18; p <= 18; p += 6) {
      const spots = [
        [p, 22.8],
        [p, -22.8],
        [22.8, p],
        [-22.8, p],
      ];
      for (const [lx, lz] of spots) {
        if (Math.abs(lx) > 21 && Math.abs(lz) > 21) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.4, 6), poleMat);
        pole.position.set(lx, 1.7, lz);
        this.scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), bulbMat);
        bulb.position.set(lx, 3.5, lz);
        this.scene.add(bulb);
      }
    }

    // Multi-tone low-poly round & pine trees (exact palette of gameplay-1 & gameplay-2!)
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#784824', roughness: 0.9 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: '#2d993e', roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: '#4db844', roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: '#1f7c37', roughness: 0.8 }),
    ];

    const addTree = (x, z, type, scale = 1) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.34 * scale, 1.9 * scale, 7), trunkMat);
      trunk.position.y = 0.95 * scale;
      trunk.castShadow = true;
      g.add(trunk);

      const mat = leafMats[Math.floor(Math.abs(x * 7 + z * 13)) % leafMats.length];
      if (type === 'pine') {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5 * scale, 4.1 * scale, 8), mat);
        cone.position.y = 3.4 * scale;
        cone.castShadow = true;
        g.add(cone);
      } else {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.65 * scale, 12, 10), mat);
        crown.position.y = 2.8 * scale;
        crown.castShadow = true;
        g.add(crown);
      }
      g.position.set(x, 0, z);
      this.scene.add(g);
    };

    const treeCoords = [
      [-25, 14], [-26, 6], [-25, -4], [-26, -13], [-27, 21],
      [25, 15], [26, 6], [25, -4], [26, -13], [27, 21],
      [-17, 25], [-8, 26], [8, 25], [17, 26],
      [-15, -24], [-9, -23.5], [9, -23.5], [15, -24],
      [-28, -20], [28, -20], [-20, 20], [20, 20],
    ];
    treeCoords.forEach(([tx, tz], i) => {
      addTree(tx, tz, i % 2 === 0 ? 'round' : 'pine', 0.9 + (i % 4) * 0.22);
    });

    // === ICONIC INDONESIAN LANDMARKS AT BACK OF PARK (EXACT POSITIONS FROM GAMEPLAY-2.JPG!) ===
    const marbleMat = new THREE.MeshStandardMaterial({ color: '#f5f3ec', roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.3 });

    // 1. MONAS (top-left)
    const monas = new THREE.Group();
    const monasBase = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.3, 6.8), marbleMat);
    monasBase.position.y = 1.15;
    monasBase.castShadow = true;
    monas.add(monasBase);
    const monasCup = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.2, 1.9, 4), marbleMat);
    monasCup.rotation.y = Math.PI / 4;
    monasCup.position.y = 3.1;
    monas.add(monasCup);
    const monasShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.45, 15, 4), marbleMat);
    monasShaft.rotation.y = Math.PI / 4;
    monasShaft.position.y = 11.2;
    monasShaft.castShadow = true;
    monas.add(monasShaft);
    const monasFlame = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.0, 6), goldMat);
    monasFlame.position.y = 20.1;
    monas.add(monasFlame);
    monas.position.set(-22, 0, -26.5);
    this.scene.add(monas);

    // 2. ISTANA NEGARA + Merah-Putih Flag (top-center)
    const istana = new THREE.Group();
    const palaceBody = new THREE.Mesh(new THREE.BoxGeometry(13, 4.1, 5.4), marbleMat);
    palaceBody.position.y = 2.05;
    palaceBody.castShadow = true;
    istana.add(palaceBody);
    const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.55, 6.0), new THREE.MeshStandardMaterial({ color: '#e6e1d5' }));
    roofTrim.position.y = 4.35;
    istana.add(roofTrim);
    for (let px = -5; px <= 5; px += 2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.9, 8), marbleMat);
      col.position.set(px, 1.95, 2.9);
      istana.add(col);
    }
    const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.4, 6), poleMat);
    flagpole.position.set(0, 6.6, 1.5);
    istana.add(flagpole);
    const flagGroup = new THREE.Group();
    const redBand = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.58, 0.08), new THREE.MeshStandardMaterial({ color: '#dc2626' }));
    redBand.position.set(1.15, 0.29, 0);
    const whiteBand = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.58, 0.08), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
    whiteBand.position.set(1.15, -0.29, 0);
    flagGroup.add(redBand, whiteBand);
    flagGroup.position.set(0, 9.1, 1.5);
    this.flagMesh = flagGroup;
    istana.add(flagGroup);
    istana.position.set(0, 0, -26.8);
    this.scene.add(istana);

    // 3. MASJID ISTIQLAL (top-right green dome)
    const mosque = new THREE.Group();
    const mosqueBase = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.8, 6.6), marbleMat);
    mosqueBase.position.y = 1.9;
    mosqueBase.castShadow = true;
    mosque.add(mosqueBase);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#1ea34a', roughness: 0.42 })
    );
    dome.position.y = 3.8;
    dome.castShadow = true;
    mosque.add(dome);
    mosque.position.set(21.5, 0, -26.5);
    this.scene.add(mosque);

    // Dense crisp low-poly Indonesian city buildings surrounding the park
    const bColors = ['#ece9e1', '#e0e7ec', '#f2e8da', '#e2eae2', '#eae4eb'];
    const buildingTextures = bColors.map((c) => makeBuildingWindowTexture(c));
    const roofMat = new THREE.MeshStandardMaterial({ color: '#d5dde5', roughness: 0.82 });

    const citySpots = [];
    for (let x = -54; x <= 54; x += 8.2) {
      citySpots.push([x, -49], [x, -58], [x, 42]);
    }
    for (let z = -36; z <= 36; z += 8.2) {
      citySpots.push([-40, z], [40, z], [-50, z], [50, z]);
    }
    citySpots.forEach(([bx, bz], i) => {
      const bw = 4.5 + ((i * 17) % 3) * 1.1;
      const bd = 4.5 + ((i * 11) % 3) * 1.0;
      const bh = 7 + ((i * 29) % 14);
      const tex = buildingTextures[i % buildingTextures.length];
      const sideMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [
        sideMat,
        sideMat,
        roofMat,
        roofMat,
        sideMat,
        sideMat,
      ]);
      b.position.set(bx + ((i % 3) - 1) * 0.7, bh / 2, bz + (((i + 1) % 3) - 1) * 0.7);
      b.castShadow = true;
      b.receiveShadow = true;
      this.scene.add(b);
    });

    // Animated tiny colorful cars cruising along roads & flyover
    const carColors = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#f97316', '#f8fafc'];
    for (let i = 0; i < 18; i++) {
      const car = new THREE.Group();
      const col = carColors[i % carColors.length];
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.55, 0.92),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })
      );
      body.position.y = 0.35;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.44, 0.8),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.3 })
      );
      cabin.position.set(-0.08, 0.78, 0);
      car.add(body, cabin);

      const onFlyover = i < 7;
      const lane = onFlyover
        ? { axis: 'x', fixed: -40 + (i % 2 === 0 ? -1.1 : 1.1), y: 8.35, dir: i % 2 === 0 ? 1 : -1 }
        : i < 13
          ? { axis: 'x', fixed: -32 + (i % 2 === 0 ? -1.2 : 1.2), y: 0.12, dir: i % 2 === 0 ? 1 : -1 }
          : { axis: 'z', fixed: (i % 2 === 0 ? -32 : 32) + 1.2, y: 0.12, dir: i % 2 === 0 ? 1 : -1 };

      const startPos = -56 + i * 6.8;
      if (lane.axis === 'x') {
        car.position.set(startPos, lane.y, lane.fixed);
        car.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      } else {
        car.position.set(lane.fixed, lane.y, startPos);
        car.rotation.y = lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      this.scene.add(car);
      this.cars.push({ mesh: car, lane, speed: 5.2 + (i % 4) * 1.9 });
    }
  }

  buildCircularBoard() {
    const boardGroup = new THREE.Group();
    this.scene.add(boardGroup);

    // Thick dark wood circular base matching gameplay-2 & gameplay-3
    const woodMat = new THREE.MeshStandardMaterial({ color: '#513019', roughness: 0.74 });
    const baseOuter = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT + 0.58, R_OUT + 0.88, BOARD_Y, 72), woodMat);
    baseOuter.position.y = BOARD_Y / 2 - 0.02;
    baseOuter.castShadow = true;
    baseOuter.receiveShadow = true;
    boardGroup.add(baseOuter);

    // Brass rivets around wooden rim
    const studMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.55, roughness: 0.35 });
    const studGeo = new THREE.SphereGeometry(0.16, 8, 8);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const stud = new THREE.Mesh(studGeo, studMat);
      stud.position.set(Math.cos(a) * (R_OUT + 0.68), BOARD_Y * 0.52, Math.sin(a) * (R_OUT + 0.68));
      boardGroup.add(stud);
    }

    // Center ocean turquoise pool (exact shade from gameplay-2 & gameplay-3!)
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0e6f95',
      roughness: 0.24,
      metalness: 0.16,
    });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(R_IN + 0.14, R_IN + 0.14, 0.25, 64), waterMat);
    water.position.y = BOARD_Y - 0.08;
    water.receiveShadow = true;
    boardGroup.add(water);

    // Inner dark blue stone rim
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(R_IN + 0.05, 0.16, 10, 64),
      new THREE.MeshStandardMaterial({ color: '#1b3556', roughness: 0.55 })
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.y = BOARD_Y + 0.02;
    boardGroup.add(lip);

    // Two floating card rafts in the pool (Left = Blue Kebijakan stack, Right = Tan/Red-seal Lobi stack!)
    const buildDeckRaft = (x, cardColor, sealColor) => {
      const g = new THREE.Group();
      const raft = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.22, 2.1),
        new THREE.MeshStandardMaterial({ color: '#9c6b3d', roughness: 0.85 })
      );
      g.add(raft);
      for (let i = 0; i < 6; i++) {
        const card = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 0.11, 1.42),
          new THREE.MeshStandardMaterial({ color: cardColor, roughness: 0.5 })
        );
        card.position.y = 0.18 + i * 0.12;
        card.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.025;
        card.castShadow = true;
        g.add(card);
      }
      const seal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.06, 14),
        new THREE.MeshStandardMaterial({ color: sealColor, roughness: 0.4 })
      );
      seal.position.y = 0.86;
      g.add(seal);
      g.position.set(x, BOARD_Y + 0.12, -0.35);
      boardGroup.add(g);
    };
    buildDeckRaft(-3.4, '#2452b3', '#facc15');
    buildDeckRaft(3.4, '#d9a76a', '#dc2626');

    // 32 Circular Tiles
    const angleStep = (Math.PI * 2) / TOTAL_TILES;
    const tileGeo = createTileSectorGeometry(R_IN + 0.1, R_OUT + 0.06, angleStep * 0.968, 5);
    const glowGeo = createOwnerGlowBorderGeometry(R_IN + 0.15, R_OUT - 0.04, angleStep * 0.93, 0.5);

    for (const tile of BOARD_TILES) {
      const tex = makeTileTexture(tile, null);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.76 });
      const mesh = new THREE.Mesh(tileGeo, mat);
      const angle = tileAngle(tile.id);
      mesh.position.y = BOARD_Y + 0.04;
      mesh.rotation.y = -angle;
      mesh.receiveShadow = true;
      mesh.userData = { tileId: tile.id };
      boardGroup.add(mesh);
      this.tileMeshes.set(tile.id, mesh);

      // Translucent neon owner aura box (hidden until bought — exact effect of Bot Yanti tile in gameplay-3!)
      const glowMat = new THREE.MeshBasicMaterial({
        color: '#2dd4bf',
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.y = BOARD_Y + 0.56;
      glowMesh.rotation.y = -angle;
      glowMesh.visible = false;
      boardGroup.add(glowMesh);
      this.tileGlowMeshes.set(tile.id, glowMesh);

      // Add 3D landmark / default bench prop on tile
      this.addLandmarkOrDefaultProp(boardGroup, tile, angle);

      // Upgrade buildings container
      const upGroup = new THREE.Group();
      const pos = tileWorldPos(tile.id, R_IN + 1.55);
      upGroup.position.set(pos.x, BOARD_Y + 0.06, pos.z);
      upGroup.rotation.y = -angle + Math.PI / 2;
      boardGroup.add(upGroup);
      this.upgradeGroups.set(tile.id, upGroup);
    }
  }

  addLandmarkOrDefaultProp(parent, tile, angle) {
    const g = new THREE.Group();
    const pos = tileWorldPos(tile.id, R_IN + 1.65);
    g.position.set(pos.x, BOARD_Y + 0.06, pos.z);
    g.rotation.y = -angle + Math.PI / 2;

    const redMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.58 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#1e242b', roughness: 0.55 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.45 });
    const blueMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.45 });
    const tealMat = new THREE.MeshStandardMaterial({ color: '#0d9488', roughness: 0.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#9c6b3d', roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.45, roughness: 0.35 });

    if (tile.landmark === 'gapura') {
      // Iconic tall Indonesian red-and-white Gapura gate (gameplay-2.jpg!)
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.35, 0.32), whiteMat);
      p1.position.set(-1.12, 1.17, 0);
      const p2 = p1.clone();
      p2.position.x = 1.12;
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.48, 0.46), redMat);
      top.position.y = 2.4;
      p1.castShadow = p2.castShadow = top.castShadow = true;
      g.add(p1, p2, top);
    } else if (tile.landmark === 'jail') {
      // Iconic RUTAN KPK: white prison building, flat red roof, black vertical bars (gameplay-3.jpg!)
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.45, 1.45), whiteMat);
      body.position.y = 0.72;
      body.castShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.45, 1.72), redMat);
      roof.position.y = 1.62;
      roof.castShadow = true;
      g.add(body, roof);
      for (let bx = -0.82; bx <= 0.82; bx += 0.27) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.88, 0.08), darkMat);
        bar.position.set(bx, 0.65, 0.75);
        g.add(bar);
      }
    } else if (tile.landmark === 'pbb') {
      // Iconic PBB Hall with white columns & bright red roof (gameplay-3.jpg!)
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, 1.35), whiteMat);
      base.position.y = 0.11;
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.1), whiteMat);
      body.position.y = 0.7;
      for (let cx = -0.7; cx <= 0.7; cx += 0.46) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.1, 8), whiteMat);
        col.position.set(cx, 0.7, 0.6);
        g.add(col);
      }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.72, 4), redMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 1.55;
      g.add(base, body, roof);
    } else if (tile.landmark === 'port') {
      // Pelabuhan Merak / Belawan: blue dock + orange port crane (gameplay-3.jpg!)
      const dock = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.24, 1.35), blueMat);
      dock.position.y = 0.12;
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.9, 0.22), orangeMat);
      mast.position.set(0.46, 1.0, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.2), orangeMat);
      arm.position.set(-0.18, 1.9, 0);
      g.add(dock, mast, arm);
    } else if (tile.landmark === 'pln') {
      // PLN twin silver electricity towers (gameplay-3.jpg!)
      const silver = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.4, roughness: 0.45 });
      [-0.42, 0.42].forEach((ox) => {
        const tower = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.85, 4), silver);
        tower.position.set(ox, 0.92, 0);
        g.add(tower);
      });
      const wire = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06), darkMat);
      wire.position.y = 1.45;
      g.add(wire);
    } else if (tile.landmark === 'pdam') {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.1, 8), whiteMat);
      leg.position.y = 0.55;
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.85, 12), blueMat);
      tank.position.y = 1.4;
      g.add(leg, tank);
    } else if (tile.landmark === 'folder') {
      // Lobi Orang Dalam stacked cardboard dossier box (gameplay-3.jpg!)
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.26, 0.96), woodMat);
      box.position.y = 0.14;
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.98), new THREE.MeshStandardMaterial({ color: '#f4d3a1' }));
      tape.position.y = 0.15;
      g.add(box, tape);
    } else if (tile.landmark === 'vault') {
      // Kas Negara imposing dark vault cube + golden bar (top-left black landmark in gameplay-2!)
      const vault = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.5, 1.4), darkMat);
      vault.position.y = 0.75;
      vault.castShadow = true;
      const gold = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 0.6), goldMat);
      gold.position.y = 1.62;
      g.add(vault, gold);
    } else if (tile.landmark === 'airport') {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 1.55, 8), whiteMat);
      tower.position.set(-0.42, 0.78, 0);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.34, 0.35, 8), blueMat);
      cap.position.set(-0.42, 1.6, 0);
      const plane = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.34), whiteMat);
      plane.position.set(0.45, 0.32, 0.1);
      g.add(tower, cap, plane);
    } else if (tile.landmark === 'train') {
      const train = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.48, 0.52), whiteMat);
      train.position.y = 0.28;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.14, 0.54), redMat);
      stripe.position.y = 0.28;
      g.add(train, stripe);
    } else if (tile.landmark === 'toll') {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.85, 0.25), whiteMat);
      post.position.set(-0.55, 0.42, 0);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.12), redMat);
      bar.position.set(0.1, 0.65, 0);
      g.add(post, bar);
    } else if (tile.landmark === 'siren') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.1, 1.1), whiteMat);
      body.position.y = 0.55;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.34, 1.3), redMat);
      roof.position.y = 1.25;
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.36, 10),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.7 })
      );
      beacon.position.y = 1.6;
      g.add(body, roof, beacon);
    } else if (tile.type === 'property') {
      // Cute miniature wooden bench + signpost prop (seen on Canggu, Lumpur Lapindo, etc. in gameplay-3!)
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.36), tile.group === 'teal' ? tealMat : woodMat);
      seat.position.set(0, 0.34, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.08), tile.group === 'teal' ? tealMat : woodMat);
      back.position.set(0, 0.52, -0.15);
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.3), darkMat);
      leg1.position.set(-0.36, 0.17, 0);
      const leg2 = leg1.clone();
      leg2.position.x = 0.36;
      g.add(seat, back, leg1, leg2);
      this.defaultProps.set(tile.id, g);
    } else {
      return;
    }

    parent.add(g);
  }

  buildDice() {
    const faceValues = [3, 4, 1, 6, 2, 5];
    const mats = faceValues.map((v) => new THREE.MeshStandardMaterial({ map: makeDiceFaceTexture(v), roughness: 0.32 }));
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);

    [-0.95, 0.95].forEach((xOffset) => {
      const die = new THREE.Mesh(geo, mats);
      die.position.set(xOffset, BOARD_Y + 0.62, 0.75);
      die.castShadow = true;
      this.scene.add(die);
      this.dice.push(die);
    });
  }

  createPawnMesh(characterId, isCurrent = false) {
    const char = getCharacterById(characterId);
    const group = new THREE.Group();

    // Thick glossy colored base pad (exact look of red & teal circular discs in gameplay-3.jpg!)
    const baseRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.96, 1.04, 0.22, 22),
      new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.5 })
    );
    baseRim.position.y = 0.11;
    const baseTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.88, 0.28, 22),
      new THREE.MeshStandardMaterial({ color: char.color, roughness: 0.35 })
    );
    baseTop.position.y = 0.15;
    baseTop.castShadow = true;
    group.add(baseRim, baseTop);

    // Cute stubby legs
    const legMat = new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.7 });
    [-0.16, 0.16].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.36, 8), legMat);
      leg.position.set(lx, 0.42, 0);
      group.add(leg);
    });

    // Chibi torso + cute little arms
    const shirtMat = new THREE.MeshStandardMaterial({ color: char.shirtColor, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.78, 12), shirtMat);
    body.position.y = 0.92;
    body.castShadow = true;
    group.add(body);

    [-0.42, 0.42].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8), shirtMat);
      arm.position.set(ax, 0.94, 0.04);
      arm.rotation.z = ax < 0 ? 0.35 : -0.35;
      group.add(arm);
    });

    // Big adorable chibi head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 14),
      new THREE.MeshStandardMaterial({ color: char.skinColor, roughness: 0.55 })
    );
    head.position.y = 1.66;
    head.castShadow = true;
    group.add(head);

    // Cute dot eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#111827' });
    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
      eye.position.set(ex, 1.68, 0.46);
      group.add(eye);
    });

    // Character-specific Indonesian headgear
    const hatMat = new THREE.MeshStandardMaterial({ color: char.hatColor, roughness: 0.5 });
    if (char.hatType === 'peaked_cap') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.48, 0.3, 14), hatMat);
      crown.position.y = 2.12;
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 0.38), new THREE.MeshStandardMaterial({ color: '#1f2937' }));
      brim.position.set(0, 1.98, 0.4);
      const badge = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: '#facc15' }));
      badge.position.set(0, 2.1, 0.5);
      group.add(crown, brim, badge);
    } else if (char.hatType === 'helmet_green' || char.hatType === 'ojol_helmet') {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hatMat);
      helmet.position.y = 1.72;
      group.add(helmet);
      if (char.hatType === 'ojol_helmet') {
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.15, 0.25), new THREE.MeshStandardMaterial({ color: '#111827' }));
        visor.position.set(0, 1.84, 0.46);
        group.add(visor);
      }
    } else if (char.hatType === 'hair_bun') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.51, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hatMat);
      hair.position.y = 1.72;
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), hatMat);
      bun.position.set(0, 2.24, -0.14);
      group.add(hair, bun);
    } else if (char.hatType === 'peci') {
      const peci = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.47, 0.36, 14), hatMat);
      peci.position.y = 2.12;
      group.add(peci);
    } else if (char.hatType === 'hijab') {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.56, 14, 12), hatMat);
      hood.position.set(0, 1.66, -0.06);
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.58, 12), hatMat);
      drape.position.y = 1.18;
      group.add(hood, drape);
    } else if (char.hatType === 'caping') {
      const caping = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.48, 14), hatMat);
      caping.position.y = 2.2;
      group.add(caping);
    } else if (char.hatType === 'glasses_hair') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hatMat);
      hair.position.y = 1.74;
      const frameMat = new THREE.MeshStandardMaterial({ color: '#111827' });
      [-0.17, 0.17].forEach((gx) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 6, 12), frameMat);
        ring.position.set(gx, 1.68, 0.49);
        group.add(ring);
      });
      group.add(hair);
    } else if (char.hatType === 'orange_cap') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hatMat);
      cap.position.y = 1.74;
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.4), hatMat);
      brim.position.set(0, 1.88, 0.4);
      group.add(cap, brim);
    } else {
      const hair = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.45, 7), hatMat);
      hair.position.y = 2.16;
      group.add(hair);
    }

    // Floating golden diamond above active pawn (exact match to gameplay-3.jpg!)
    const indicator = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#eab308', emissiveIntensity: 0.5 })
    );
    indicator.position.y = 3.05;
    indicator.visible = isCurrent;
    group.add(indicator);

    return { group, indicator, baseColor: char.color };
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'game') {
      this.resetCamera();
    } else {
      this.orbit.desiredPhi = 0.85;
      this.orbit.desiredRadius = 42;
      this.orbit.desiredTarget.set(0, 1.5, 0);
    }
  }

  resetCamera() {
    this.orbit.desiredTheta = Math.PI / 2;
    this.orbit.desiredPhi = 0.78;
    this.orbit.desiredRadius = 39;
    this.orbit.desiredTarget.set(0, 1.3, 1.2);
    this.orbit.userControlledUntil = 0;
  }

  focusTile(tileId) {
    if (Date.now() < this.orbit.userControlledUntil) return;
    const pos = tileWorldPos(tileId, R_MID);
    this.orbit.desiredTarget.set(pos.x * 0.44, 1.4, pos.z * 0.44);
    this.orbit.desiredRadius = 31;
    this.orbit.desiredPhi = 0.72;
  }

  syncGameState(game) {
    if (!game) {
      for (const p of this.pawns.values()) {
        this.scene.remove(p.group);
      }
      this.pawns.clear();
      for (const tile of BOARD_TILES) {
        if (this.tileOwnersHash.get(tile.id) && this.tileOwnersHash.get(tile.id) !== 'none') {
          this.tileOwnersHash.set(tile.id, 'none');
          const mesh = this.tileMeshes.get(tile.id);
          if (mesh) {
            const oldMap = mesh.material.map;
            mesh.material.map = makeTileTexture(tile, null);
            mesh.material.needsUpdate = true;
            if (oldMap) oldMap.dispose();
          }
          const glow = this.tileGlowMeshes.get(tile.id);
          if (glow) glow.visible = false;
          this.rebuildUpgradeBuilding(tile.id, 0, '#eab308');
        }
      }
      return;
    }

    // 1. Update tiles, owner glowing pads & 3D buildings
    for (const tile of BOARD_TILES) {
      const prop = game.properties?.[tile.id] || null;
      const owner = prop ? game.players.find((pl) => pl.id === prop.ownerId) : null;
      const ownerChar = owner ? getCharacterById(owner.characterId) : null;
      const hash = prop && owner ? `${owner.id}:${owner.name}:${ownerChar.color}:${prop.level}` : 'none';

      if (this.tileOwnersHash.get(tile.id) !== hash) {
        this.tileOwnersHash.set(tile.id, hash);
        const mesh = this.tileMeshes.get(tile.id);
        if (mesh) {
          const oldMap = mesh.material.map;
          mesh.material.map = makeTileTexture(
            tile,
            owner ? { name: owner.name, color: ownerChar.color } : null
          );
          mesh.material.needsUpdate = true;
          if (oldMap) oldMap.dispose();
        }
        const glow = this.tileGlowMeshes.get(tile.id);
        if (glow) {
          glow.visible = Boolean(owner);
          if (ownerChar) glow.material.color.set(ownerChar.color);
        }
        this.rebuildUpgradeBuilding(tile.id, prop?.level || 0, ownerChar?.color || '#eab308');
      }
    }

    // 2. Sync pawns
    const activeIds = new Set(game.players.map((p) => p.id));
    for (const [pid, pawn] of this.pawns.entries()) {
      if (!activeIds.has(pid)) {
        this.scene.remove(pawn.group);
        this.pawns.delete(pid);
      }
    }

    const tileBuckets = new Map();
    for (const pl of game.players) {
      if (pl.bankrupt) continue;
      if (!tileBuckets.has(pl.position)) tileBuckets.set(pl.position, []);
      tileBuckets.get(pl.position).push(pl.id);
    }

    for (const pl of game.players) {
      let pawn = this.pawns.get(pl.id);
      const isCurrent = game.currentPlayerId === pl.id && !pl.bankrupt;

      if (!pawn) {
        const built = this.createPawnMesh(pl.characterId, isCurrent);
        this.scene.add(built.group);
        const initPos = tileWorldPos(pl.position, R_MID);
        built.group.position.copy(initPos);
        pawn = {
          ...built,
          tileId: pl.position,
          hopQueue: [],
          currentHop: null,
        };
        this.pawns.set(pl.id, pawn);
      }

      pawn.group.visible = !pl.bankrupt;
      pawn.indicator.visible = isCurrent;

      const bucket = tileBuckets.get(pl.position) || [pl.id];
      const idx = bucket.indexOf(pl.id);
      const count = bucket.length;
      const radialOffset = count > 1 ? ((idx % 2) - 0.5) * 1.15 : 0.2;
      const angularOffset = count > 2 ? (Math.floor(idx / 2) - 0.5) * 0.07 : count === 2 ? (idx - 0.5) * 0.06 : 0;
      const restPos = tileWorldPos(pl.position, R_MID + radialOffset, angularOffset);
      pawn.restPos = restPos;
      pawn.restAngle = -tileAngle(pl.position) + Math.PI / 2;

      if (pawn.hopQueue.length === 0 && !pawn.currentHop && pawn.tileId !== pl.position) {
        pawn.tileId = pl.position;
        pawn.group.position.copy(restPos);
        pawn.group.rotation.y = pawn.restAngle;
      }
    }
  }

  rebuildUpgradeBuilding(tileId, level, ownerColor) {
    const group = this.upgradeGroups.get(tileId);
    if (!group) return;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    const defProp = this.defaultProps.get(tileId);
    if (defProp) defProp.visible = level <= 0;
    if (level <= 0) return;

    const wallMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.42 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.45, roughness: 0.35 });

    if (level === 1) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 0.85), wallMat);
      body.position.y = 0.48;
      body.castShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.25, 1.0), roofMat);
      roof.position.y = 1.05;
      group.add(body, roof);
    } else if (level === 2) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.72, 0.95), wallMat);
      body.position.y = 0.86;
      body.castShadow = true;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.24, 1.02), roofMat);
      stripe.position.y = 1.76;
      group.add(body, stripe);
    } else if (level >= 3) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.55, 1.0), wallMat);
      body.position.y = 1.28;
      body.castShadow = true;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.96, 0.68, 4), roofMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = 2.86;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), goldMat);
      star.position.y = 3.38;
      group.add(body, cap, star);
    }
  }

  animateDiceAndMove({ playerId, dice, fromPos, steps, toPos, toJail }) {
    soundEngine.playDice();

    this.diceAnim = {
      startTime: performance.now(),
      duration: 860,
      values: dice,
      startPos: this.dice.map((_, i) => new THREE.Vector3(i === 0 ? -1.4 : 1.4, BOARD_Y + 0.62, 0.8)),
      endPos: [
        new THREE.Vector3(-0.95 + (Math.random() - 0.5) * 0.35, BOARD_Y + 0.58, 0.65 + (Math.random() - 0.5) * 0.35),
        new THREE.Vector3(0.95 + (Math.random() - 0.5) * 0.35, BOARD_Y + 0.58, 0.65 + (Math.random() - 0.5) * 0.35),
      ],
      spinSpeeds: [
        new THREE.Vector3(12 + Math.random() * 6, 10 + Math.random() * 6, 14 + Math.random() * 5),
        new THREE.Vector3(14 + Math.random() * 5, 12 + Math.random() * 6, 11 + Math.random() * 6),
      ],
    };

    const pawn = this.pawns.get(playerId);
    if (!pawn) return;

    if (toJail) {
      setTimeout(() => {
        if (!this.disposed) this.teleportPawn(playerId, toPos);
      }, 900);
      return;
    }

    if (steps > 0) {
      pawn.hopQueue = [];
      for (let s = 1; s <= steps; s++) {
        pawn.hopQueue.push({
          tileId: (fromPos + s) % TOTAL_TILES,
          stepIdx: s - 1,
          delayUntil: s === 1 ? performance.now() + 880 : 0,
        });
      }
      this.focusTile(toPos);
    }
  }

  teleportPawn(playerId, toPos) {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    pawn.hopQueue = [];
    pawn.currentHop = null;
    pawn.tileId = toPos;
    const dest = tileWorldPos(toPos, R_MID);
    pawn.group.position.copy(dest);
    pawn.group.rotation.y = -tileAngle(toPos) + Math.PI / 2;
    this.focusTile(toPos);
  }

  bindControls() {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    let downX = 0;
    let downY = 0;

    const onDown = (e) => {
      if (this.mode !== 'game') return;
      this.orbit.dragging = true;
      this.orbit.lastX = e.clientX;
      this.orbit.lastY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
    };
    const onMove = (e) => {
      if (!this.orbit.dragging) return;
      const dx = e.clientX - this.orbit.lastX;
      const dy = e.clientY - this.orbit.lastY;
      this.orbit.lastX = e.clientX;
      this.orbit.lastY = e.clientY;
      this.orbit.desiredTheta += dx * 0.0065;
      this.orbit.desiredPhi = Math.max(0.32, Math.min(1.22, this.orbit.desiredPhi - dy * 0.0055));
      this.orbit.userControlledUntil = Date.now() + 6000;
    };
    const onUp = (e) => {
      const wasDragging = this.orbit.dragging;
      this.orbit.dragging = false;
      if (wasDragging && this.mode === 'game' && this.onSelectTile) {
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist < 6) {
          const rect = el.getBoundingClientRect();
          this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          this.raycaster.setFromCamera(this.pointer, this.camera);
          const hits = this.raycaster.intersectObjects(Array.from(this.tileMeshes.values()), false);
          if (hits.length > 0 && hits[0].object?.userData?.tileId !== undefined) {
            this.onSelectTile(hits[0].object.userData.tileId);
          } else {
            this.onSelectTile(null);
          }
        }
      }
    };
    const onWheel = (e) => {
      if (this.mode !== 'game') return;
      e.preventDefault();
      this.orbit.desiredRadius = Math.max(20, Math.min(54, this.orbit.desiredRadius + e.deltaY * 0.025));
      this.orbit.userControlledUntil = Date.now() + 6000;
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    this._cleanupControls = () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }

  handleResize() {
    if (!this.container || this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    const now = performance.now();

    for (const c of this.cars) {
      if (c.lane.axis === 'x') {
        c.mesh.position.x += c.lane.dir * c.speed * dt;
        if (c.mesh.position.x > 62) c.mesh.position.x = -62;
        if (c.mesh.position.x < -62) c.mesh.position.x = 62;
      } else {
        c.mesh.position.z += c.lane.dir * c.speed * dt;
        if (c.mesh.position.z > 62) c.mesh.position.z = -62;
        if (c.mesh.position.z < -62) c.mesh.position.z = 62;
      }
    }

    if (this.flagMesh) {
      this.flagMesh.rotation.y = Math.sin(elapsed * 4.2) * 0.16;
    }

    if (this.diceAnim) {
      const t = Math.min(1, (now - this.diceAnim.startTime) / this.diceAnim.duration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const bounce = Math.abs(Math.sin(t * Math.PI * 2.5)) * (1 - t) * 4.2;

      this.dice.forEach((die, i) => {
        const s = this.diceAnim.startPos[i];
        const e = this.diceAnim.endPos[i];
        die.position.lerpVectors(s, e, easeOut);
        die.position.y = BOARD_Y + 0.58 + bounce;

        const targetEuler = DICE_TOP_ROTATIONS[this.diceAnim.values[i]] || DICE_TOP_ROTATIONS[1];
        if (t < 0.85) {
          const sp = this.diceAnim.spinSpeeds[i];
          die.rotation.set(sp.x * t * 1.4, sp.y * t * 1.4, sp.z * t * 1.4);
        } else {
          const k = (t - 0.85) / 0.15;
          die.rotation.x += (targetEuler.x - die.rotation.x) * k;
          die.rotation.y += (targetEuler.y - die.rotation.y) * k;
          die.rotation.z += (targetEuler.z - die.rotation.z) * k;
        }
      });

      if (t >= 1) {
        this.dice.forEach((die, i) => {
          const targetEuler = DICE_TOP_ROTATIONS[this.diceAnim.values[i]] || DICE_TOP_ROTATIONS[1];
          die.rotation.copy(targetEuler);
          die.position.y = BOARD_Y + 0.58;
        });
        this.diceAnim = null;
      }
    }

    for (const pawn of this.pawns.values()) {
      if (pawn.indicator.visible) {
        pawn.indicator.rotation.y = elapsed * 2.6;
        pawn.indicator.position.y = 3.05 + Math.sin(elapsed * 4.5) * 0.2;
      }

      if (!pawn.currentHop && pawn.hopQueue.length > 0) {
        const next = pawn.hopQueue[0];
        if (!next.delayUntil || now >= next.delayUntil) {
          pawn.hopQueue.shift();
          const fromVec = pawn.group.position.clone();
          const toVec = tileWorldPos(next.tileId, R_MID);
          pawn.currentHop = {
            start: now,
            duration: 185,
            from: fromVec,
            to: toVec,
            tileId: next.tileId,
          };
          soundEngine.playHop(next.stepIdx);
        }
      }

      if (pawn.currentHop) {
        const h = pawn.currentHop;
        const p = Math.min(1, (now - h.start) / h.duration);
        pawn.group.position.lerpVectors(h.from, h.to, p);
        pawn.group.position.y = BOARD_Y + Math.sin(p * Math.PI) * 1.55;
        pawn.group.rotation.y = -tileAngle(h.tileId) + Math.PI / 2;
        if (p >= 1) {
          pawn.tileId = h.tileId;
          pawn.currentHop = null;
        }
      } else if (pawn.restPos) {
        pawn.group.position.lerp(pawn.restPos, Math.min(1, dt * 8));
        if (typeof pawn.restAngle === 'number') {
          pawn.group.rotation.y = pawn.restAngle;
        }
      }
    }

    if (this.mode === 'lobby') {
      this.orbit.desiredTheta = Math.PI / 2 + Math.sin(elapsed * 0.14) * 0.42;
      this.orbit.desiredPhi = 0.92;
      this.orbit.desiredRadius = 42;
      this.orbit.desiredTarget.set(0, 2.0, -2);
    }

    const damp = Math.min(1, dt * 6);
    this.orbit.theta += (this.orbit.desiredTheta - this.orbit.theta) * damp;
    this.orbit.phi += (this.orbit.desiredPhi - this.orbit.phi) * damp;
    this.orbit.radius += (this.orbit.desiredRadius - this.orbit.radius) * damp;
    this.orbit.target.lerp(this.orbit.desiredTarget, damp);

    const sinPhi = Math.sin(this.orbit.phi);
    this.camera.position.set(
      this.orbit.target.x + this.orbit.radius * sinPhi * Math.cos(this.orbit.theta),
      this.orbit.target.y + this.orbit.radius * Math.cos(this.orbit.phi),
      this.orbit.target.z + this.orbit.radius * sinPhi * Math.sin(this.orbit.theta)
    );
    this.camera.lookAt(this.orbit.target);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    if (this._cleanupControls) this._cleanupControls();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
