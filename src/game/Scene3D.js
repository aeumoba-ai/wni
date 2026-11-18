import * as THREE from 'three';
import { BOARD_TILES, DEFAULT_BOARD_SEED, TOTAL_TILES, JAIL_TILE_ID, formatShortRupiah } from '../../shared/boardData.js';
import { getCharacterById } from '../../shared/characters.js';
import { AmbientLife } from './AmbientLife.js';
import { soundEngine } from './SoundEngine.js';
import { buildTileLandmark, buildUpgradeStructure } from './Landmarks3D.js';
import { DEFAULT_GRAPHICS_SETTINGS, getEffectiveGraphicsSettings } from './GraphicsSettings.js';

const R_IN = 12.2;
const R_OUT = 18.0;
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

function makeTileTexture(tile, ownerInfo = null, pixel = false) {
  const canvas = document.createElement('canvas');
  // In pixel mode the whole board is painted on a tiny canvas and magnified
  // with nearest-neighbour filtering → every tile becomes real pixel art.
  const scale = pixel ? 0.42 : 1;
  canvas.width = Math.round(280 * scale);
  canvas.height = Math.round(420 * scale);
  const ctx = canvas.getContext('2d');
  if (pixel) {
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
  }

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

  const outline = pixel ? 4 : 7;
  const fontSize = (lines.length >= 3 ? 27 : lines[0].length > 10 ? 29 : 34) * (pixel ? 1.15 : 1);
  const startY = 264 - (lines.length - 1) * 18;
  lines.forEach((ln, idx) => {
    drawOutlinedText(
      ctx,
      ln,
      140,
      startY + idx * (fontSize + 5),
      `400 ${fontSize}px "Lilita One", "Baloo 2", sans-serif`,
      '#ffffff',
      '#1e150e',
      outline
    );
  });

  // Price or action text below title (dark clean font or red for tax, matching gameplay-3.jpg!)
  const bottomText = tile.price ? formatShortRupiah(tile.price) : tile.subtitle || '';
  if (bottomText && !ownerInfo) {
    ctx.font = '800 27px "Baloo 2", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = tile.type === 'tax' ? '#b91c1c' : '#3a2e25';
    ctx.fillText(bottomText, 140, 356);
  } else if (bottomText && ownerInfo) {
    ctx.font = '800 23px "Baloo 2", "Plus Jakarta Sans", sans-serif';
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
      388,
      `800 ${pixel ? 27 : 23}px "Plus Jakarta Sans", sans-serif`,
      '#ffffff',
      '#172026',
      pixel ? 3 : 4
    );
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (pixel) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  } else {
    tex.anisotropy = 4;
  }
  return tex;
}

function makeDiceFaceTexture(value, pixel = false) {
  const canvas = document.createElement('canvas');
  const dScale = pixel ? 0.34 : 1;
  canvas.width = Math.round(128 * dScale);
  canvas.height = Math.round(128 * dScale);
  const ctx = canvas.getContext('2d');
  if (pixel) ctx.scale(dScale, dScale);

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
  if (pixel) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
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

function makeBuildingWindowTexture(baseHex, pixel = false) {
  // Fasad gedung Indonesia: lantai toko di bawah (kanopi bergaris + kaca gelap
  // + papan nama), lantai atas dengan jendela berbingkai, AC tempel, balkon
  // kecil dan jemuran. Cukup detail untuk dilihat dekat, tetap 1 tekstur.
  const W = 256;
  const H = 512;
  const canvas = document.createElement('canvas');
  const fScale = pixel ? 0.2 : 1;
  canvas.width = Math.round(W * fScale);
  canvas.height = Math.round(H * fScale);
  const ctx = canvas.getContext('2d');
  if (pixel) ctx.scale(fScale, fScale);
  ctx.imageSmoothingEnabled = !pixel;

  const shade = (hex, amount) => {
    const c = new THREE.Color(hex);
    c.offsetHSL(0, 0, amount);
    return `#${c.getHexString()}`;
  };

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);

  // ---- plint / lantai dasar (toko) ----
  const shopTop = H - 104;
  ctx.fillStyle = shade(baseHex, -0.12);
  ctx.fillRect(0, shopTop, W, 104);
  // kaca toko
  ctx.fillStyle = '#2f4858';
  ctx.fillRect(10, shopTop + 32, W - 20, 62);
  ctx.fillStyle = 'rgba(140,215,235,0.55)';
  ctx.fillRect(16, shopTop + 38, (W - 32) * 0.42, 50);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(20, shopTop + 42, 10, 42);
  // tiang & pintu
  ctx.fillStyle = shade(baseHex, -0.2);
  for (let x = 4; x < W; x += 44) ctx.fillRect(x, shopTop + 28, 8, 68);
  // kanopi bergaris (awning)
  const stripes = ['#dc2626', '#f8fafc'];
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = stripes[i % 2];
    const x = 6 + i * 25;
    ctx.beginPath();
    ctx.moveTo(x, shopTop + 4);
    ctx.lineTo(x + 24, shopTop + 4);
    ctx.lineTo(x + 20, shopTop + 26);
    ctx.lineTo(x + 4, shopTop + 26);
    ctx.closePath();
    ctx.fill();
  }
  // papan nama toko
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(60, shopTop + 6, 96, 12);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(66, shopTop + 9, 84, 5);

  // ---- lantai atas: jendela berbingkai ----
  const floorH = 64;
  let floor = 0;
  for (let y = 26; y < shopTop - 12; y += floorH, floor++) {
    // garis lantai (slab)
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(0, y - 6, W, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, y - 1, W, 2);
    for (let x = 14; x < W - 30; x += 60) {
      const lit = ((x * 7 + y * 13) % 11) > 6;
      // bingkai jendela
      ctx.fillStyle = shade(baseHex, 0.16);
      ctx.fillRect(x - 3, y - 3, 34, 42);
      // kaca
      ctx.fillStyle = lit ? '#f6e2a8' : '#6ea6c9';
      ctx.fillRect(x, y, 28, 36);
      // pantulan & kusen
      ctx.fillStyle = lit ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + 2, y + 2, 10, 32);
      ctx.fillStyle = 'rgba(15,23,42,0.35)';
      ctx.fillRect(x + 13, y, 2, 36);
      // ambang
      ctx.fillStyle = shade(baseHex, -0.16);
      ctx.fillRect(x - 4, y + 38, 36, 4);
      // AC tempel di sebagian jendela
      if ((x + y) % 3 === 0) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x + 20, y + 24, 14, 10);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 22, y + 26, 10, 6);
      }
    }
    // balkon tipis pada lantai genap
    if (floor % 2 === 1) {
      ctx.fillStyle = 'rgba(226,232,240,0.75)';
      ctx.fillRect(8, y + 42, W - 16, 5);
      ctx.fillStyle = 'rgba(15,23,42,0.18)';
      ctx.fillRect(8, y + 47, W - 16, 2);
    }
  }

  // ---- atap: parapet + tangki air ----
  ctx.fillStyle = shade(baseHex, -0.06);
  ctx.fillRect(0, 0, W, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 16, W, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (pixel) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  } else {
    tex.anisotropy = 4;
  }
  return tex;
}

/** Tiny deterministic PRNG so the city (and its rooftop clutter) is stable. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft radial glow (dipakai untuk halo lampu taman & genangan cahayanya). */
function makeGlowTexture(pixel = false) {
  const size = pixel ? 32 : 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,236,178,0.72)');
  g.addColorStop(0.7, 'rgba(255,214,120,0.26)');
  g.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (pixel) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  return tex;
}

export class Scene3D {
  constructor(container, onSelectTile = null, onCinematicChange = null) {
    this.container = container;
    this.onSelectTile = onSelectTile;
    this.onCinematicChange = onCinematicChange;
    this.mode = 'lobby';
    this.disposed = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#8bc8ea');
    // Fog reaches far out so the outer districts read as distance, not as a wall.
    this.scene.fog = new THREE.Fog('#9cd0ee', 150, 620);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 1400);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.graphicsSettings = DEFAULT_GRAPHICS_SETTINGS;
    this.graphics = getEffectiveGraphicsSettings(this.graphicsSettings);
    this.pixelStyle = false;
    this.pixelMaterialDefaults = new WeakMap();
    this.lastGame = null;
    this.sunLight = null;
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

    // Temporary cinematic mode: hides obstructing UI + follows the moving pawn,
    // then restores the EXACT camera the player had (never a hard reset).
    this.cinematic = null;
    this._cinematicNotified = false;
    this.isCompactViewport = false;

    this.currentBoard = BOARD_TILES;
    this.currentBoardSeed = DEFAULT_BOARD_SEED;
    this.currentAmbientSeed = undefined;
    this.smoothAnimation = false; // Default OFF (animasi standar); toggleable in Settings!
    this.tileMeshes = new Map();
    this.tileGlowMeshes = new Map();
    this.tileOwnersHash = new Map();
    this.upgradeGroups = new Map();
    this.landmarkAnims = [];
    this.pawns = new Map();
    this.flagMesh = null;
    this.dice = [];
    this.diceAnim = null;
    this.particles = [];
    this.buildingSprings = [];
    this.cameraCutscene = null;
    this.screenShake = 0;
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);
    this.clock = new THREE.Clock();

    this.setupLights();
    this.buildCityEnvironment();
    this.buildCircularBoard();
    this.buildDice();
    this.bindControls();

    this.onResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.onResize);
    this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this.onResize) : null;
    this.resizeObserver?.observe(container);
    this.handleResize();

    // Living Indonesian city around the board (vehicles, pedestrians, stalls…).
    this.ambient = new AmbientLife(this.scene, { compact: this.isCompactViewport, solids: this.citySolids });
    this.ambient.setQuality(this.graphics);
    if (import.meta.env?.DEV) {
      window.__scene3d = this; // dev-only debugging hook
      window.__THREE = THREE;
    }

    // Re-render all 40 3D tile textures crisp once the self-hosted theme fonts finish loading!
    if (typeof document !== 'undefined' && document.fonts?.load) {
      Promise.all([
        document.fonts.load('400 34px "Lilita One"'),
        document.fonts.load('800 27px "Baloo 2"'),
        document.fonts.load('800 23px "Plus Jakarta Sans"'),
        document.fonts.ready,
      ])
        .then(() => {
          if (!this.disposed) this.refreshAllTileFonts();
        })
        .catch(() => {
          // Fallback system fonts are already acceptable if a font fails to load.
        });
    }

    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);
  }

  refreshAllTileFonts() {
    for (const tile of this.currentBoard) {
      const mesh = this.tileMeshes.get(tile.id);
      if (!mesh) continue;
      const hash = this.tileOwnersHash.get(tile.id);
      let ownerInfo = null;
      if (hash && hash !== 'none') {
        // Hash format: `${owner.id}:${owner.name}:${hexColor}:${level}`.
        // Parse from the right so names containing ':' stay intact.
        const match = /^([^:]+):(.+):(#[0-9a-fA-F]{3,8}):(\d+)$/.exec(hash);
        if (match) ownerInfo = { name: match[2], color: match[3] };
      }
      const oldMap = mesh.material.map;
      mesh.material.map = makeTileTexture(tile, ownerInfo, this.pixelStyle);
      mesh.material.needsUpdate = true;
      if (oldMap) oldMap.dispose();
    }
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight('#d6efff', '#59ad42', 0.96);
    this.scene.add(hemi);
    this.hemiLight = hemi;

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
    this.sunLight = sun;
    this.scene.add(sun);
  }

  buildCityEnvironment() {
    // Everything built here is registered as a solid so the ambient city props
    // (warung, halte, bangku, tiang, baliho…) can never be placed on top of it.
    const solids = [];
    this.citySolids = solids;
    const solid = (x, z, hw, hd, h, y0 = 0) => solids.push({ x, z, hw, hd, h, y0 });

    // Lush vibrant green lawn (matching gameplay-1 & gameplay-2!)
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(720, 720),
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
      solid(x, -40, 0.75, 1.0, 7.8);
    }

    // Black street lamps with round cream globes around the park walkway (gameplay-2.jpg!)
    // Setiap lampu taman punya jam nyala sendiri + halo dan genangan cahaya, jadi
    // sore hari lampu menyala satu per satu seperti lampu jalan sungguhan.
    const poleMat = new THREE.MeshStandardMaterial({ color: '#2b323b', roughness: 0.55 });
    const glowTex = makeGlowTexture(this.pixelStyle);
    this.lampGlowTexture = glowTex;
    this.parkLamps = [];
    const lampSpots = [];
    for (let p = -18; p <= 18; p += 6) {
      for (const [lx, lz] of [
        [p, 22.8],
        [p, -22.8],
        [22.8, p],
        [-22.8, p],
      ]) {
        if (Math.abs(lx) > 21 && Math.abs(lz) > 21) continue;
        lampSpots.push([lx, lz]);
      }
    }
    // urutan nyala mengikuti keliling taman (seperti satu sirkuit lampu jalan)
    lampSpots
      .map(([x, z], i) => ({ x, z, i, angle: (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2) }))
      .sort((a, b) => a.angle - b.angle)
      .forEach((spot, order) => {
        const { x: lx, z: lz } = spot;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.4, 6), poleMat);
        pole.position.set(lx, 1.7, lz);
        pole.castShadow = true;
        this.scene.add(pole);

        const bulbMat = new THREE.MeshStandardMaterial({
          color: '#fffde7',
          emissive: '#ffe9a3',
          emissiveIntensity: 0,
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), bulbMat);
        bulb.position.set(lx, 3.5, lz);
        this.scene.add(bulb);

        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: '#ffe6a8',
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        halo.scale.set(2.6, 2.6, 1);
        halo.position.set(lx, 3.5, lz);
        this.scene.add(halo);

        const pool = new THREE.Mesh(
          new THREE.CircleGeometry(2.9, 20),
          new THREE.MeshBasicMaterial({
            map: glowTex,
            color: '#ffdf9c',
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(lx, 0.09, lz);
        this.scene.add(pool);

        // beberapa lampu terdekat papan juga benar-benar menerangi jalan
        // (dibatasi 4 buah supaya HP tetap ringan)
        let light = null;
        if (!this.isCompactViewport && this.parkLamps.length % 7 === 0 && this.parkLamps.filter((l) => l.light).length < 4) {
          light = new THREE.PointLight('#ffd79a', 0, 16, 2);
          light.position.set(lx, 3.4, lz);
          this.scene.add(light);
        }

        this.parkLamps.push({
          x: lx,
          z: lz,
          bulbMat,
          halo,
          pool,
          light,
          level: 0,
          // satu per satu: 17.55 → 18.35, dengan jitter kecil tiap lampu
          onAt: 17.55 + (order / Math.max(1, lampSpots.length - 1)) * 0.8 + (spot.i % 3) * 0.03,
          offAt: 5.4 + (order / Math.max(1, lampSpots.length - 1)) * 0.7,
          flicker: 0,
          on: false,
        });
        solid(lx, lz, 0.24, 0.24, 3.8);
      });

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
      // solid trunk up to the crown…
      solid(x, z, 0.42 * scale, 0.42 * scale, 1.9 * scale);
      // …and the leafy crown above head height (only tall things must avoid it)
      const crownR = (type === 'pine' ? 1.5 : 1.65) * scale;
      solid(x, z, crownR, crownR, (type === 'pine' ? 5.5 : 4.6) * scale, 1.15 * scale);
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
    solid(-22, -26.5, 3.4, 3.4, 2.3);
    solid(-22, -26.5, 1.5, 1.5, 21.6, 2.3);

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
    solid(0, -26.8, 6.9, 3.0, 4.7);

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
    solid(21.5, -26.5, 4.25, 3.3, 4.2);
    solid(21.5, -26.5, 2.8, 2.8, 6.6, 3.8);

    // Dense crisp low-poly Indonesian city buildings surrounding the park
    const bColors = ['#ece9e1', '#e0e7ec', '#f2e8da', '#e2eae2', '#eae4eb'];
    const buildingTextures = bColors.map((c) => makeBuildingWindowTexture(c, this.pixelStyle));
    this.cityFacades = bColors.map((c, i) => ({ color: c, material: null, index: i }));
    const roofMat = new THREE.MeshStandardMaterial({ color: '#d5dde5', roughness: 0.82 });

    const citySpots = [];
    const cityDetail = []; // per-building details, drawn later as instanced meshes
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
      const slot = i % this.cityFacades.length;
      if (!this.cityFacades[slot].material) this.cityFacades[slot].material = sideMat;
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [
        sideMat,
        sideMat,
        roofMat,
        roofMat,
        sideMat,
        sideMat,
      ]);
      const bpx = bx + ((i % 3) - 1) * 0.7;
      const bpz = bz + (((i + 1) % 3) - 1) * 0.7;
      b.position.set(bpx, bh / 2, bpz);
      b.castShadow = true;
      b.receiveShadow = true;
      this.scene.add(b);
      solid(bpx, bpz, bw / 2, bd / 2, bh);
      cityDetail.push({ x: bpx, z: bpz, y: bh, w: bw, d: bd, h: bh, i });
    });

    // Detail atap & fasad supaya bangunan terlihat seperti ruko Indonesia asli:
    // tandon air, AC tempel, kanopi toko bergaris, antena, dan tangga atap.
    this.buildCityDetails(cityDetail);
    this.buildCityWindows(cityDetail);

    // Kota luar: kampung, kawasan industri, rice fields, bukit & jalan tol yang
    // membuat peta terasa sangat luas (radius ±300) tanpa membebani render.
    this.buildOuterCity();
  }

  /** Jendela gedung kota: SATU InstancedMesh berisi semua jendela, masing-masing
      punya jam nyala/mati sendiri. Sore hari jendela menyala berkelompok per
      gedung (seperti rumah tangga sungguhan), sebagian tetap gelap. */
  buildCityWindows(buildings) {
    if (!buildings.length) return;
    const rand = seededRandom(31337);
    const COLS = [14, 74, 134, 194]; // posisi kolom pada tekstur fasad 256 px
    const FLOORS = [26, 90, 154, 218, 282, 346];
    const warm = ['#ffe6a3', '#ffd98a', '#fff3c4', '#ffcf7a', '#ffdcb0', '#dfe9ff'];
    const items = [];

    for (const b of buildings) {
      const faces = [
        { nx: 1, nz: 0, width: b.d, rot: Math.PI / 2, ox: b.w / 2 },
        { nx: -1, nz: 0, width: b.d, rot: -Math.PI / 2, ox: b.w / 2 },
        { nx: 0, nz: 1, width: b.w, rot: 0, ox: b.d / 2 },
        { nx: 0, nz: -1, width: b.w, rot: Math.PI, ox: b.d / 2 },
      ];
      // satu gedung ≈ satu rumah tangga: jam nyalanya berdekatan
      const base = 17.2 + rand() * 4.2;
      const offAt = 5.1 + rand() * 1.5;
      const density = 0.42 + rand() * 0.46;
      for (const f of faces) {
        for (let c = 0; c < COLS.length; c++) {
          for (let r = 0; r < FLOORS.length; r++) {
            if (rand() > density) continue;
            const u = (COLS[c] + 14) / 256;
            const v = (FLOORS[r] + 18) / 512;
            const y = b.h * (1 - v);
            if (y < 2.6) continue; // lantai toko punya lampu sendiri
            const neverLit = rand() < 0.2;
            const along = (u - 0.5) * f.width;
            items.push({
              x: b.x + f.nx * (f.ox + 0.05) + (f.nz !== 0 ? along : 0),
              z: b.z + f.nz * (f.ox + 0.05) + (f.nx !== 0 ? along : 0),
              y,
              rot: f.rot,
              sx: (28 / 256) * f.width * 0.8,
              sy: (36 / 512) * b.h * 0.8,
              color: warm[Math.floor(rand() * warm.length)],
              // ±20% jendela memang dibiarkan gelap semalaman (kamar kosong)
              ...(neverLit
                ? { onAt: Infinity, offAt: -1 }
                : { onAt: base + rand() * 0.6, offAt: offAt + rand() * 0.45 }),
              on: false,
            });
          }
        }
      }
    }
    if (!items.length) return;

    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      items.length,
    );
    mesh.name = 'cityWindows';
    mesh.frustumCulled = false;
    const dummy = new THREE.Object3D();
    items.forEach((w, i) => {
      w.index = i;
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, w.rot, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(w.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);

    this.cityWindows = {
      mesh,
      items,
      dummy,
      byOn: [...items].sort((a, b) => a.onAt - b.onAt),
      byOff: [...items].sort((a, b) => a.offAt - b.offAt),
      onPtr: 0,
      offPtr: 0,
      lastHour: -1,
      dirty: false,
    };
    this.syncCityWindows(0, true);
  }

  /** Nyalakan/matikan jendela sesuai jam kota (hanya yang berubah, bukan semua). */
  syncCityWindows(hour, force = false) {
    const st = this.cityWindows;
    if (!st) return;
    const apply = (w, on) => {
      if (w.on === on) return;
      w.on = on;
      const d = st.dummy;
      d.position.set(w.x, w.y, w.z);
      d.rotation.set(0, w.rot, 0);
      if (on) d.scale.set(w.sx, w.sy, 1);
      else d.scale.set(0, 0, 0);
      d.updateMatrix();
      st.mesh.setMatrixAt(w.index, d.matrix);
      st.dirty = true;
    };
    const backwards = hour < st.lastHour - 0.0005;
    if (force || backwards) {
      st.onPtr = 0;
      st.offPtr = 0;
      for (const w of st.items) apply(w, hour >= w.onAt || hour < w.offAt);
      while (st.onPtr < st.byOn.length && st.byOn[st.onPtr].onAt <= hour) st.onPtr += 1;
      while (st.offPtr < st.byOff.length && st.byOff[st.offPtr].offAt <= hour) st.offPtr += 1;
    } else {
      while (st.onPtr < st.byOn.length && st.byOn[st.onPtr].onAt <= hour) {
        apply(st.byOn[st.onPtr], true);
        st.onPtr += 1;
      }
      while (st.offPtr < st.byOff.length && st.byOff[st.offPtr].offAt <= hour) {
        apply(st.byOff[st.offPtr], false);
        st.offPtr += 1;
      }
    }
    st.lastHour = hour;
    if (st.dirty) {
      st.mesh.instanceMatrix.needsUpdate = true;
      st.dirty = false;
    }
  }

  /** Lampu taman menyala satu per satu (dengan kedipan singkat) + genangan cahaya. */
  updateCityLights(hour, dt) {
    this.syncCityWindows(hour);
    const lamps = this.parkLamps;
    if (!lamps?.length) return;
    for (const lamp of lamps) {
      const shouldOn = hour >= lamp.onAt || hour < lamp.offAt;
      if (shouldOn !== lamp.on) {
        lamp.on = shouldOn;
        lamp.flicker = shouldOn ? 0.85 + Math.random() * 0.5 : 0;
      }
      const target = lamp.on ? 1 : 0;
      const speed = lamp.on ? 1.6 : 3.2;
      lamp.level += Math.max(-speed * dt, Math.min(speed * dt, target - lamp.level));
      let flick = 1;
      if (lamp.flicker > 0) {
        lamp.flicker = Math.max(0, lamp.flicker - dt);
        flick = 0.2 + 0.8 * Math.abs(Math.sin(lamp.flicker * 24));
      }
      const lv = Math.max(0, lamp.level) * flick;
      lamp.bulbMat.emissiveIntensity = lv * 3.4;
      lamp.halo.material.opacity = lv * 0.6;
      lamp.pool.material.opacity = lv * 0.4;
      lamp.halo.visible = lv > 0.01;
      lamp.pool.visible = lv > 0.01;
      if (lamp.light) lamp.light.intensity = lv * 2.2;
    }
  }

  /** Rooftop tanks, AC units, shop awnings and antennas for the core buildings.
      Everything is instanced: the whole set costs five draw calls. */
  buildCityDetails(buildings) {
    if (!buildings.length) return;
    const group = new THREE.Group();
    group.name = 'cityDetails';
    this.scene.add(group);
    this.cityDetails = group;
    const dummy = new THREE.Object3D();
    const rand = seededRandom(778899);
    const tankColors = ['#f97316', '#e2e8f0', '#cbd5e1', '#38bdf8', '#facc15'];
    const awningColors = ['#dc2626', '#0ea5e9', '#16a34a', '#f59e0b', '#7c3aed', '#f8fafc'];

    const tanks = [];
    const roofAc = [];
    const wallAc = [];
    const awnings = [];
    const antennas = [];

    for (const b of buildings) {
      const toCenter = Math.atan2(-b.x, -b.z); // arah menghadap taman
      // tandon air di atap
      if (rand() > 0.22) {
        tanks.push({
          x: b.x + (rand() - 0.5) * b.w * 0.45,
          y: b.h + 0.62,
          z: b.z + (rand() - 0.5) * b.d * 0.45,
          color: tankColors[Math.floor(rand() * tankColors.length)],
          r: 0.42 + rand() * 0.2,
        });
      }
      // AC/ kondensor di atap & di fasad
      const roofUnits = rand() > 0.5 ? 2 : 1;
      for (let k = 0; k < roofUnits; k++) {
        roofAc.push({
          x: b.x + (rand() - 0.5) * b.w * 0.7,
          y: b.h + 0.18,
          z: b.z + (rand() - 0.5) * b.d * 0.7,
          yaw: rand() > 0.5 ? 0 : Math.PI / 2,
        });
      }
      for (let k = 0; k < 2; k++) {
        const level = 0.35 + rand() * 0.45;
        const push = Math.max(b.w, b.d) / 2;
        wallAc.push({
          x: b.x + Math.sin(toCenter) * (push + 0.12) + (rand() - 0.5) * 0.9,
          y: b.h * level,
          z: b.z + Math.cos(toCenter) * (push + 0.12) + (rand() - 0.5) * 0.9,
          yaw: toCenter,
        });
      }
      // kanopi toko menghadap taman
      awnings.push({
        x: b.x + Math.sin(toCenter) * (b.w / 2 + 0.55),
        y: 3.15,
        z: b.z + Math.cos(toCenter) * (b.w / 2 + 0.55),
        yaw: toCenter,
        w: b.w * 0.78,
        color: awningColors[Math.floor(rand() * awningColors.length)],
      });
      // antena TV
      if (rand() > 0.62) {
        antennas.push({
          x: b.x + (rand() - 0.5) * b.w * 0.5,
          y: b.h + 1.35,
          z: b.z + (rand() - 0.5) * b.d * 0.5,
        });
      }
    }

    const instanced = (items, geo, mat, apply) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((item, i) => {
        apply(item, dummy);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
      return mesh;
    };

    // tandon air (tabung)
    const tankMesh = instanced(
      tanks,
      new THREE.CylinderGeometry(0.55, 0.55, 1.25, 10),
      new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      (t, d) => {
        d.position.set(t.x, t.y, t.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(t.r / 0.55, 1, t.r / 0.55);
      },
    );
    if (tankMesh) tanks.forEach((t, i) => tankMesh.setColorAt(i, new THREE.Color(t.color)));

    // AC atap (kotak)
    instanced(
      roofAc,
      new THREE.BoxGeometry(0.9, 0.5, 0.7),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.65 }),
      (u, d) => {
        d.position.set(u.x, u.y, u.z);
        d.rotation.set(0, u.yaw, 0);
        d.scale.set(1, 1, 1);
      },
    );

    // AC tempel di fasad
    instanced(
      wallAc,
      new THREE.BoxGeometry(0.62, 0.42, 0.34),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.6 }),
      (u, d) => {
        d.position.set(u.x, u.y, u.z);
        d.rotation.set(0, u.yaw, 0);
        d.scale.set(1, 1, 1);
      },
    );

    // kanopi toko (miring sedikit)
    const awningMesh = instanced(
      awnings,
      new THREE.BoxGeometry(1, 0.1, 1.15),
      new THREE.MeshStandardMaterial({ roughness: 0.75 }),
      (a, d) => {
        d.position.set(a.x, a.y, a.z);
        d.rotation.set(0.17, a.yaw, 0);
        d.scale.set(a.w, 1, 1);
      },
    );
    if (awningMesh) awnings.forEach((a, i) => awningMesh.setColorAt(i, new THREE.Color(a.color)));
    // Kanopi toko disimpan supaya bisa disembunyikan bila ada props yang menabraknya.
    this.cityAwnings = awningMesh;
    this.cityAwningItems = awnings;
    this.awningSignature = '';

    // antena TV
    instanced(
      antennas,
      new THREE.CylinderGeometry(0.035, 0.05, 2.7, 4),
      new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.5, metalness: 0.3 }),
      (a, d) => {
        d.position.set(a.x, a.y, a.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
      },
    );
  }

  /* ====================== KOTA LUAR (PETA TERASA SANGAT LUAS) ==============
     Everything past the core neighbourhood is built from a handful of
     InstancedMesh objects (1 draw call each) so the extra width costs almost
     nothing: street grid + hundreds of buildings, a distant CBD, a toll road
     on pillars, sawah patches, tree lines and far hills on the horizon. */

  buildOuterCity() {
    const rand = seededRandom(20261118);
    const g = new THREE.Group();
    g.name = 'outerCity';
    this.scene.add(g);
    this.outerCity = g;

    const streetMat = new THREE.MeshStandardMaterial({ color: '#3b424e', roughness: 0.95 });
    const paintMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.9 });

    // --- 1. Outer street grid (a real city keeps going past our crossroads) --
    const streets = [];
    for (let r = 70; r <= 320; r += 37) streets.push(r, -r);
    const stripLen = 700;
    for (const x of streets) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(8, 0.06, stripLen), streetMat);
      road.position.set(x, 0.035, 0);
      road.receiveShadow = false;
      g.add(road);
    }
    for (const z of streets) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(stripLen, 0.06, 8), streetMat);
      road.position.set(0, 0.033, z);
      road.receiveShadow = false;
      g.add(road);
    }
    // A light centre line on the two nearest avenues to give the streets scale.
    for (const x of [70, -70, 144, -144]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, stripLen - 40), paintMat);
      line.position.set(x, 0.07, 0);
      g.add(line);
    }

    // --- 2. Hundreds of district buildings around the core -------------------
    // Three bands so the city reads like a real one from above: kampung houses
    // close to the park, mid-rise neighbourhoods around them, and a taller
    // outer city that melts into the fog.
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    // Satu tekstur jendela dipakai bersama semua gedung luar (instanced → 1 draw call).
    const bodyMat = new THREE.MeshStandardMaterial({
      map: makeBuildingWindowTexture('#efeee8', this.pixelStyle),
      roughness: 0.78,
      metalness: 0,
    });
    bodyMat.userData.outerFacade = true;
    const roofMatOuter = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const bands = [
      {
        // kampung: 1–2 lantai, atap tanah liat, warna hangat
        min: 56, max: 118, skip: 0.16, cols: 3,
        h: [3.4, 6.8], w: [3.6, 5.6],
        body: ['#f3e6d0', '#f6efdc', '#e8ddc6', '#efe4d3', '#dfe6d5', '#f7e2c8'],
        roof: ['#b4593c', '#c96a45', '#a34f37', '#c9a06a', '#8f4a36'],
      },
      {
        // perumahan & ruko: 2–5 lantai
        min: 118, max: 196, skip: 0.2, cols: 3,
        h: [7, 17], w: [4.4, 7.4],
        body: ['#ece9e1', '#e0e7ec', '#f2e8da', '#e2eae2', '#eae4eb', '#dfe7f2'],
        roof: ['#c9d3dc', '#b7c2cc', '#9fb0bc', '#d5c3ae'],
      },
      {
        // kota luar: 6–16 lantai, makin jauh makin tinggi
        min: 196, max: 330, skip: 0.3, cols: 3,
        h: [16, 38], w: [5.5, 9.5],
        body: ['#dbe3ec', '#cfd9e6', '#e3e8ef', '#d6dfe9', '#c8d4e2'],
        roof: ['#aebbcb', '#9aa9bb', '#bcc7d4'],
      },
    ];
    const spots = [];
    const pads = [];
    for (let gx = -320; gx <= 320; gx += 27) {
      for (let gz = -320; gz <= 320; gz += 27) {
        const cellR = Math.hypot(gx, gz);
        if (cellR < 58) continue; // the core neighbourhood is built by hand
        const band = bands.find((b) => cellR >= b.min && cellR < b.max);
        if (!band) continue;
        const cols = rand() > 0.42 ? band.cols : Math.max(2, band.cols - 1);
        const cell = 21;
        // Perkerasan blok: kawasan yang sudah dibangun bukan rumput kosong.
        if (band.min >= 118) {
          pads.push({
            x: gx, z: gz, w: cell + 5, d: cell + 5,
            color: rand() > 0.5 ? '#b9bdc2' : '#c6c0b3',
          });
        }
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < cols; j++) {
            if (rand() < band.skip) continue; // yards, gardens, empty plots
            const bx = gx + (i - (cols - 1) / 2) * (cell / cols + 1.4) + (rand() - 0.5) * 1.6;
            const bz = gz + (j - (cols - 1) / 2) * (cell / cols + 1.4) + (rand() - 0.5) * 1.6;
            const r = Math.hypot(bx, bz);
            if (r < 58) continue;
            // keep the avenue grid clear so the streets stay visible
            if (Math.abs(bx - Math.round(bx / 37) * 37) < 7) continue;
            if (Math.abs(bz - Math.round(bz / 37) * 37) < 7) continue;
            const t = Math.min(1, (r - band.min) / (band.max - band.min));
            const w = band.w[0] + rand() * (band.w[1] - band.w[0]);
            const d = band.w[0] + rand() * (band.w[1] - band.w[0]);
            const h = band.h[0] + rand() * (band.h[1] - band.h[0]) * (0.6 + t * 0.8);
            spots.push({
              x: bx, z: bz, w, d, h: Math.max(2.4, h),
              color: band.body[Math.floor(rand() * band.body.length)],
              roof: band.roof[Math.floor(rand() * band.roof.length)],
            });
          }
        }
      }
    }
    const bodies = new THREE.InstancedMesh(boxGeo, bodyMat, spots.length);
    const roofs = new THREE.InstancedMesh(boxGeo, roofMatOuter, spots.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach((b, i) => {
      m.makeScale(b.w, b.h, b.d).setPosition(b.x, b.h / 2, b.z);
      bodies.setMatrixAt(i, m);
      bodies.setColorAt(i, c.set(b.color));
      m.makeScale(b.w * 1.08, 0.45, b.d * 1.08).setPosition(b.x, b.h + 0.22, b.z);
      roofs.setMatrixAt(i, m);
      roofs.setColorAt(i, c.set(b.roof));
    });
    bodies.instanceMatrix.needsUpdate = true;
    roofs.instanceMatrix.needsUpdate = true;
    bodies.frustumCulled = false;
    roofs.frustumCulled = false;
    g.add(bodies, roofs);

    if (pads.length) {
      const padMesh = new THREE.InstancedMesh(
        boxGeo,
        new THREE.MeshStandardMaterial({ roughness: 0.95 }),
        pads.length,
      );
      pads.forEach((p, i) => {
        m.makeScale(p.w, 0.05, p.d).setPosition(p.x, 0.045, p.z);
        padMesh.setMatrixAt(i, m);
        padMesh.setColorAt(i, c.set(p.color));
      });
      padMesh.instanceMatrix.needsUpdate = true;
      padMesh.frustumCulled = false;
      g.add(padMesh);
    }

    // --- 3. Distant CBD: a cluster of towers on one horizon ----------------
    const towers = [];
    for (let i = 0; i < 34; i++) {
      const a = -0.75 + rand() * 0.7;
      const dist = 210 + rand() * 90;
      const w = 8 + rand() * 8;
      const h = 34 + rand() * 62;
      towers.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, w, h });
    }
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    const towerMesh = new THREE.InstancedMesh(
      towerGeo,
      new THREE.MeshStandardMaterial({ color: '#cfd9e6', roughness: 0.55, metalness: 0.15 }),
      towers.length,
    );
    towers.forEach((t, i) => {
      m.makeScale(t.w, t.h, t.w * 0.9).setPosition(t.x, t.h / 2, t.z);
      towerMesh.setMatrixAt(i, m);
    });
    towerMesh.instanceMatrix.needsUpdate = true;
    towerMesh.frustumCulled = false;
    g.add(towerMesh);

    // --- 4. Toll road on pillars crossing the outskirts ---------------------
    const tollMat = new THREE.MeshStandardMaterial({ color: '#e6e3da', roughness: 0.82 });
    const tollDeck = new THREE.Mesh(new THREE.BoxGeometry(700, 1.0, 7), tollMat);
    tollDeck.position.set(0, 12.5, -168);
    g.add(tollDeck);
    for (const dz of [-3.1, 3.1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(700, 0.55, 0.35), tollMat);
      rail.position.set(0, 13.2, -168 + dz);
      g.add(rail);
    }
    const pillarGeo = new THREE.BoxGeometry(1.6, 12, 2.2);
    const pillars = new THREE.InstancedMesh(pillarGeo, tollMat, 30);
    for (let i = 0; i < 30; i++) {
      m.makeTranslation(-290 + i * 20, 6, -168);
      pillars.setMatrixAt(i, m);
    }
    pillars.instanceMatrix.needsUpdate = true;
    pillars.frustumCulled = false;
    g.add(pillars);

    // --- 5. Rice fields & open land (sawah) in between ----------------------
    const fieldMats = ['#7fbf4f', '#93cf62', '#6fb447', '#a8d873'].map(
      (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }),
    );
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const dist = 120 + rand() * 220;
      const fx = Math.cos(a) * dist;
      const fz = Math.sin(a) * dist;
      const w = 22 + rand() * 34;
      const d = 18 + rand() * 30;
      const field = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fieldMats[i % fieldMats.length]);
      field.rotation.x = -Math.PI / 2;
      field.rotation.z = (rand() - 0.5) * 0.5;
      field.position.set(fx, 0.02, fz);
      g.add(field);
    }

    // --- 6. Tree lines along the far streets -------------------------------
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.4, 5);
    const crownGeo = new THREE.SphereGeometry(1, 6, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#784824', roughness: 0.9 });
    const treePositions = [];
    for (let i = 0; i < 300; i++) {
      const a = rand() * Math.PI * 2;
      const dist = 72 + rand() * 240;
      const tx = Math.cos(a) * dist;
      const tz = Math.sin(a) * dist;
      // Keep the asphalt and the immediate park untouched.
      const nearStreet = (v) => Math.abs(v - Math.round(v / 37) * 37) < 7;
      if (nearStreet(tx) || nearStreet(tz)) continue;
      treePositions.push([tx, tz, 1.6 + rand() * 1.5, rand()]);
    }
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const crowns = new THREE.InstancedMesh(
      crownGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      treePositions.length,
    );
    const crownColors = ['#2d993e', '#4db844', '#1f7c37', '#3aa14a'];
    treePositions.forEach(([tx, tz, s, r], i) => {
      m.makeScale(s, s, s).setPosition(tx, s * 1.2, tz);
      trunks.setMatrixAt(i, m);
      m.makeScale(s * 1.5, s * 1.35, s * 1.5).setPosition(tx, s * 2.6, tz);
      crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, c.set(crownColors[Math.floor(r * crownColors.length)]));
    });
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    trunks.frustumCulled = false;
    crowns.frustumCulled = false;
    g.add(trunks, crowns);

    // --- 7. Danau/waduk + landmark jauh (menambah kesan luas) ---------------
    const waterMat = new THREE.MeshStandardMaterial({ color: '#2f7fb5', roughness: 0.35, metalness: 0.1 });
    const lake = new THREE.Mesh(new THREE.CircleGeometry(52, 26), waterMat);
    lake.rotation.x = -Math.PI / 2;
    lake.scale.set(1.5, 0.85, 1);
    lake.position.set(196, 0.05, 138);
    g.add(lake);
    const lakeBank = new THREE.Mesh(
      new THREE.CircleGeometry(56, 26),
      new THREE.MeshStandardMaterial({ color: '#c8b892', roughness: 0.95 }),
    );
    lakeBank.rotation.x = -Math.PI / 2;
    lakeBank.scale.set(1.52, 0.86, 1);
    lakeBank.position.set(196, 0.04, 138);
    g.add(lakeBank);

    const farLandMats = {
      white: new THREE.MeshStandardMaterial({ color: '#f1f3f4', roughness: 0.6 }),
      silver: new THREE.MeshStandardMaterial({ color: '#c3ccd4', roughness: 0.5, metalness: 0.2 }),
      green: new THREE.MeshStandardMaterial({ color: '#2f7f4f', roughness: 0.7 }),
      gold: new THREE.MeshStandardMaterial({ color: '#d9b04a', roughness: 0.45, metalness: 0.35 }),
      red: new THREE.MeshStandardMaterial({ color: '#b23b2e', roughness: 0.7 }),
    };
    // Stadion (cincin besar) di barat daya
    const stadium = new THREE.Mesh(new THREE.CylinderGeometry(38, 40, 13, 24, 1, true), farLandMats.silver);
    stadium.position.set(-196, 6.5, 158);
    g.add(stadium);
    const stadiumField = new THREE.Mesh(new THREE.CircleGeometry(33, 24), new THREE.MeshStandardMaterial({ color: '#3f9b4f', roughness: 0.9 }));
    stadiumField.rotation.x = -Math.PI / 2;
    stadiumField.position.set(-196, 0.06, 158);
    g.add(stadiumField);
    // Menara TV + kubah masjid raya + menara air, jauh di timur laut
    const tvTower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.4, 96, 8), farLandMats.silver);
    tvTower.position.set(238, 48, -196);
    g.add(tvTower);
    const tvPod = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 4, 12), farLandMats.white);
    tvPod.position.set(238, 74, -196);
    g.add(tvPod);
    const domeBase = new THREE.Mesh(new THREE.BoxGeometry(44, 16, 44), farLandMats.white);
    domeBase.position.set(-172, 8, -206);
    g.add(domeBase);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(19, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), farLandMats.green);
    dome.position.set(-172, 16, -206);
    g.add(dome);
    for (const [mx, mz] of [[-152, -186], [-192, -186]]) {
      const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 40, 8), farLandMats.white);
      minaret.position.set(mx, 20, mz);
      g.add(minaret);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7, 8), farLandMats.gold);
      cap.position.set(mx, 43, mz);
      g.add(cap);
    }
    // Menara air kampung (warna cerah, jadi penanda arah)
    for (const [wx, wz] of [[-120, 96], [132, -92], [96, 214]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.0, 26, 6), farLandMats.silver);
      leg.position.set(wx, 13, wz);
      g.add(leg);
      const tank = new THREE.Mesh(new THREE.SphereGeometry(6.4, 10, 8), farLandMats.red);
      tank.position.set(wx, 29, wz);
      g.add(tank);
    }

    // --- 8. Hills on the horizon -------------------------------------------
    const hillMats = ['#6f9a7d', '#7fa88c', '#6a8f9c'].map(
      (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 1 }),
    );
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.35;
      const dist = 430 + (i % 3) * 40;
      const radius = 70 + ((i * 37) % 60);
      const height = 42 + ((i * 23) % 46);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), hillMats[i % hillMats.length]);
      hill.position.set(Math.cos(a) * dist, height / 2 - 6, Math.sin(a) * dist);
      hill.rotation.y = a;
      g.add(hill);
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
    buildDeckRaft(-3.8, '#2452b3', '#facc15');
    buildDeckRaft(3.8, '#d9a76a', '#dc2626');

    // Dynamic 40-tile container (rebuilt cleanly whenever a new game randomizes the Indonesian board!)
    const angleStep = (Math.PI * 2) / TOTAL_TILES;
    this.tileSectorGeo = createTileSectorGeometry(R_IN + 0.1, R_OUT + 0.06, angleStep * 0.968, 5);
    this.tileGlowGeo = createOwnerGlowBorderGeometry(R_IN + 0.15, R_OUT - 0.04, angleStep * 0.93, 0.5);
    this.dynamicTilesGroup = new THREE.Group();
    boardGroup.add(this.dynamicTilesGroup);

    this.populateBoardTiles(this.currentBoard, this.currentBoardSeed);
  }

  populateBoardTiles(boardTiles, boardSeed) {
    // Cleanly dispose previous tile textures & clear dynamic group
    for (const mesh of this.tileMeshes.values()) {
      if (mesh.material?.map) mesh.material.map.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    for (const glow of this.tileGlowMeshes.values()) {
      if (glow.material) glow.material.dispose();
    }
    while (this.dynamicTilesGroup.children.length > 0) {
      this.dynamicTilesGroup.remove(this.dynamicTilesGroup.children[0]);
    }
    this.tileMeshes.clear();
    this.tileGlowMeshes.clear();
    this.tileOwnersHash.clear();
    this.upgradeGroups.clear();
    this.landmarkAnims = [];

    this.currentBoard = boardTiles;
    this.currentBoardSeed = boardSeed;

    for (const tile of boardTiles) {
      const tex = makeTileTexture(tile, null, this.pixelStyle);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.76 });
      const mesh = new THREE.Mesh(this.tileSectorGeo, mat);
      const angle = tileAngle(tile.id);
      mesh.position.y = BOARD_Y + 0.04;
      mesh.rotation.y = -angle;
      mesh.receiveShadow = true;
      mesh.userData = { tileId: tile.id };
      this.dynamicTilesGroup.add(mesh);
      this.tileMeshes.set(tile.id, mesh);

      // Translucent neon owner aura box
      const glowMat = new THREE.MeshBasicMaterial({
        color: '#2dd4bf',
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(this.tileGlowGeo, glowMat);
      glowMesh.position.y = BOARD_Y + 0.56;
      glowMesh.rotation.y = -angle;
      glowMesh.visible = false;
      this.dynamicTilesGroup.add(glowMesh);
      this.tileGlowMeshes.set(tile.id, glowMesh);

      // Add bespoke Indonesian 3D landmark miniature
      this.addLandmarkOrDefaultProp(this.dynamicTilesGroup, tile, angle);

      // Upgrade buildings container
      const upGroup = new THREE.Group();
      const pos = tileWorldPos(tile.id, R_IN + 1.55);
      upGroup.position.set(pos.x, BOARD_Y + 0.06, pos.z);
      upGroup.rotation.y = -angle + Math.PI / 2;
      upGroup.scale.setScalar(0.86);
      this.dynamicTilesGroup.add(upGroup);
      this.upgradeGroups.set(tile.id, upGroup);
    }
  }

  /**
   * Fits a landmark / building inside its own tile wedge.
   * The prop is centred on its tile, then shrunk until its footprint stays
   * inside the 9° sector, so two neighbouring props can never intersect.
   */
  fitTileProp(container, content, tileId) {
    while (container.children.length > 0) container.remove(container.children[0]);
    content.position.set(0, 0, 0);
    content.rotation.set(0, 0, 0);
    content.scale.setScalar(1);

    const inner = new THREE.Group();
    inner.add(content);
    inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    const size = new THREE.Vector3();
    box.getSize(size);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    inner.position.set(-cx, 0, -cz); // centre the footprint on the tile
    container.add(inner);

    const radius = R_IN + 1.55;
    const halfArc = (Math.PI / TOTAL_TILES) * 0.9; // usable half of the wedge
    const maxRadial = R_OUT - R_IN - 0.8;
    let fit = 0.86;
    for (let i = 0; i < 5; i++) {
      const radialHalf = (size.z * fit) / 2;
      const innerRadius = Math.max(R_IN + 0.25, radius - radialHalf);
      const maxTangential = 2 * Math.tan(halfArc) * innerRadius;
      fit = Math.min(
        0.86,
        maxTangential / Math.max(0.001, size.x),
        maxRadial / Math.max(0.001, size.z),
      );
    }
    container.userData.fitScale = fit;
    container.scale.setScalar(fit);
    const a = tileAngle(tileId);
    container.position.set(Math.cos(a) * radius, BOARD_Y + 0.06, Math.sin(a) * radius);
    container.rotation.y = -a + Math.PI / 2;
    container.updateMatrixWorld(true);
    return fit;
  }

  addLandmarkOrDefaultProp(parent, tile, angle) {
    const { group, animations } = buildTileLandmark(tile);
    const container = new THREE.Group();
    parent.add(container);
    this.fitTileProp(container, group, tile.id);
    void angle;
    if (animations && animations.length > 0) {
      this.landmarkAnims.push(...animations);
    }
  }

  /** Aturan "tidak ada objek bertumpuk": kanopi toko yang menabrak props kota
      (tiang lampu, pohon, baliho, warung…) disembunyikan. Dipanggil berkala
      dengan tanda-tangan jumlah props supaya tidak dihitung tiap frame. */
  refreshAwningClearance(force = false) {
    const mesh = this.cityAwnings;
    const items = this.cityAwningItems;
    if (!mesh || !items?.length) return;
    const props = (this.ambient?.group?.children || [])
      .filter((child) => child.userData?.solid && !child.userData?.unplaced)
      .map((child) => child.userData.solid);
    const signature = `${props.length}:${items.length}:${this.ambient?.propsVersion || 0}`;
    if (!force && signature === this.awningSignature) return;
    this.awningSignature = signature;
    const dummy = new THREE.Object3D();
    let hidden = 0;
    items.forEach((a, i) => {
      const halfDepth = 0.62;
      const blocked = props.some((p) => {
        if ((p.y0 ?? 0) > a.y + 0.25) return false;
        if ((p.h ?? 0) < a.y - 0.55) return false;
        const rad = (p.r ?? 0) * 0.7;
        const dx = p.x - a.x;
        const dz = p.z - a.z;
        const along = dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw);
        const across = dx * Math.cos(a.yaw) - dz * Math.sin(a.yaw);
        return Math.abs(across) < a.w / 2 + rad && Math.abs(along) < halfDepth + rad;
      });
      if (blocked) hidden += 1;
      const sc = blocked ? 0.0001 : 1;
      dummy.position.set(a.x, a.y, a.z);
      dummy.rotation.set(0.17, a.yaw, 0);
      dummy.scale.set(a.w * sc, sc, sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.awningsHidden = hidden;
  }

  buildDice() {
    const faceValues = [3, 4, 1, 6, 2, 5];
    const mats = faceValues.map((v) => {
      const mat = new THREE.MeshStandardMaterial({ map: makeDiceFaceTexture(v, this.pixelStyle), roughness: 0.32 });
      mat.userData.diceValue = v;
      return mat;
    });
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);

    [-0.95, 0.95].forEach((xOffset) => {
      const die = new THREE.Mesh(geo, mats);
      die.position.set(xOffset, BOARD_Y + 0.62, 0.75);
      die.castShadow = true;
      die.materials = mats;
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
    // IMPORTANT: App re-runs this on EVERY room state update (chat, timer, etc.).
    // Only reset the camera on an actual lobby <-> game transition, otherwise the
    // player's manually rotated/zoomed camera would be wiped constantly.
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'game') {
      this.resetCamera();
    } else {
      this.orbit.desiredPhi = 0.85;
      this.orbit.desiredRadius = 45;
      this.orbit.desiredTarget.set(0, 1.5, 0);
    }
    // A pending cinematic snapshot from the other mode is stale — re-baseline it.
    if (this.cinematic) {
      this.cinematic.snapshot = this.captureCameraSnapshot();
      this.cinematic.snapshotMode = mode;
    }
  }

  // ==================== TEMPORARY CINEMATIC PRESENTATION MODE ====================
  captureCameraSnapshot() {
    const o = this.orbit;
    return {
      theta: o.theta,
      phi: o.phi,
      radius: o.radius,
      target: o.target.clone(),
      desiredTheta: o.desiredTheta,
      desiredPhi: o.desiredPhi,
      desiredRadius: o.desiredRadius,
      desiredTarget: o.desiredTarget.clone(),
      userControlledUntil: o.userControlledUntil,
    };
  }

  isCinematic() {
    return Boolean(this.cinematic && this.cinematic.entries.size > 0);
  }

  beginCinematic(key, opts = {}) {
    if (this.disposed) return;
    const now = performance.now();
    const duration = Math.max(450, Math.min(9000, opts.duration || 1800));
    if (!this.cinematic) {
      this.cinematic = {
        snapshot: this.captureCameraSnapshot(),
        snapshotMode: this.mode,
        entries: new Map(),
        userOverride: false,
      };
    }
    const prev = this.cinematic.entries.get(key);
    if (prev?.timer) clearTimeout(prev.timer);
    // Wall-clock safety timer: requestAnimationFrame pauses in background tabs,
    // so this guarantees the UI is never left hidden forever.
    const timer = setTimeout(() => this.endCinematic(key), duration + 180);
    this.cinematic.entries.set(key, {
      expiresAt: now + duration,
      timer,
      kind: opts.kind || 'animation',
      focus: opts.focus || null,
    });
    this.notifyCinematic();
  }

  endCinematic(key) {
    const c = this.cinematic;
    if (!c) return;
    const entry = c.entries.get(key);
    if (entry?.timer) clearTimeout(entry.timer);
    c.entries.delete(key);
    if (c.entries.size === 0) this.finishCinematic();
    else this.notifyCinematic();
  }

  finishCinematic() {
    const c = this.cinematic;
    if (!c) return;
    for (const entry of c.entries.values()) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this.cinematic = null;
    // Any scripted camera move ends together with the presentation.
    this.cameraCutscene = null;
    if (!c.userOverride && this.mode === 'game' && c.snapshotMode === this.mode) {
      const s = c.snapshot;
      const o = this.orbit;
      // Restore the EXACT previous desired camera state (angle, zoom & target).
      // The existing damping then glides back — no resetCamera(), no jump.
      o.desiredTheta = s.desiredTheta;
      o.desiredPhi = s.desiredPhi;
      o.desiredRadius = s.desiredRadius;
      o.desiredTarget.copy(s.desiredTarget);
      o.userControlledUntil = s.userControlledUntil;
    }
    this.notifyCinematic();
  }

  notifyCinematic() {
    const active = this.isCinematic();
    if (active === this._cinematicNotified) return;
    this._cinematicNotified = active;
    try {
      this.onCinematicChange?.(active);
    } catch {
      // React unmount race — ignore.
    }
  }

  getCinematicFocus() {
    const c = this.cinematic;
    if (!c || c.userOverride) return null;
    let chosen = null;
    for (const entry of c.entries.values()) {
      if (!entry.focus) continue;
      if (entry.focus.kind === 'pawn') return entry.focus; // pawn motion wins
      chosen = entry.focus;
    }
    return chosen;
  }

  setGraphicsSettings(settings) {
    const next = settings || DEFAULT_GRAPHICS_SETTINGS;
    const previous = this.graphics || getEffectiveGraphicsSettings(DEFAULT_GRAPHICS_SETTINGS);
    this.graphicsSettings = next;
    this.graphics = getEffectiveGraphicsSettings(next);
    this.pixelStyle = this.graphics.visualStyle === 'pixel';
    this.ambient?.setQuality(this.graphics);
    this.applyPixelVisualStyle();
    this.updateRenderResolution();
    this.renderer.shadowMap.enabled = Boolean(this.graphics.shadows);
    this.renderer.shadowMap.type = this.graphics.mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (this.sunLight) {
      const shadowSize = this.graphics.mobile
        ? this.isCompactViewport
          ? 1024
          : 1536
        : this.isCompactViewport
        ? this.graphics.preset === 'high'
          ? 1536
          : 1024
        : this.graphics.preset === 'high'
          ? 3072
          : this.graphics.preset === 'low'
            ? 1024
            : 2048;
      this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
      this.sunLight.shadow.needsUpdate = true;
    }
    this.applyMobileMode();

    // Rebuild owned upgrade structures when the user changes building height/detail.
    const structuresChanged =
      Math.abs(previous.buildingHeight - this.graphics.buildingHeight) > 0.001 ||
      Math.abs(previous.detail - this.graphics.detail) > 0.001;
    if (structuresChanged && this.lastGame?.properties) {
      for (const tile of this.currentBoard) {
        const prop = this.lastGame.properties[tile.id];
        const owner = prop && this.lastGame.players.find((p) => p.id === prop.ownerId);
        const ownerColor = owner ? getCharacterById(owner.characterId).color : '#eab308';
        this.rebuildUpgradeBuilding(tile.id, prop?.level || 0, ownerColor);
      }
      // Rebuilt structures inherit the current faceted-vs-standard material style.
      this.applyPixelVisualStyle();
    }
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
  }

  applyPixelVisualStyle() {
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.style.imageRendering = this.pixelStyle ? 'pixelated' : 'auto';
      canvas.classList.toggle('pixelated-scene-canvas', this.pixelStyle);
    }
    if (this.renderer) {
      this.renderer.toneMapping = this.pixelStyle ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = this.pixelStyle ? 1 : 1.08;
      // Pixel art memakai bayangan keras tanpa gradasi.
      this.renderer.shadowMap.type = this.pixelStyle ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (!this.scene) return;
    // Posterise every colour so nothing keeps a smooth 24-bit gradient: the
    // whole scene (gedung, papan, pion, karakter, perabot jalan) berubah total.
    if (!this.pixelColorDefaults) this.pixelColorDefaults = new WeakMap();
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      this.applyPixelMaterialTone(object);
    });
    this.reskinTexturesForStyle();
  }

  /** Faceted + posterised materials for one object (or a whole subtree). */
  applyPixelMaterialTone(object) {
    if (!object) return;
    if (!this.pixelColorDefaults) this.pixelColorDefaults = new WeakMap();
    const steps = 7;
    const visit = (mesh) => {
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!material) continue;
        if ('flatShading' in material) {
          if (!this.pixelMaterialDefaults.has(material)) {
            this.pixelMaterialDefaults.set(material, Boolean(material.flatShading));
          }
          const nextFlat = this.pixelStyle ? true : this.pixelMaterialDefaults.get(material);
          if (material.flatShading !== nextFlat) {
            material.flatShading = nextFlat;
            material.needsUpdate = true;
          }
        }
        if (!material.color) continue;
        if (!this.pixelColorDefaults.has(material)) {
          this.pixelColorDefaults.set(material, material.color.clone());
        }
        const original = this.pixelColorDefaults.get(material);
        if (this.pixelStyle) {
          const q = (v) => Math.round(v * steps) / steps;
          material.color.setRGB(q(original.r), q(original.g), q(original.b));
        } else {
          material.color.copy(original);
        }
        material.needsUpdate = true;
      }
    };
    if (object.isMesh) visit(object);
    else object.traverse(visit);
  }

  /** Re-draw every canvas texture (papan, fasad, dadu, baliho) in the new style. */
  reskinTexturesForStyle() {
    const pixel = this.pixelStyle;
    if (this.cityFacades) {
      for (const entry of this.cityFacades) {
        if (!entry.material) continue;
        const oldMap = entry.material.map;
        entry.material.map = makeBuildingWindowTexture(entry.color, pixel);
        entry.material.needsUpdate = true;
        if (oldMap) oldMap.dispose();
      }
    }
    if (this.outerCity) {
      // The instanced districts share one material → refresh it exactly once.
      const seen = new Set();
      for (const child of this.outerCity.children) {
        if (!child.isMesh) continue;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (!mat?.map || !mat.userData?.outerFacade || seen.has(mat)) continue;
          seen.add(mat);
          const oldMap = mat.map;
          mat.map = makeBuildingWindowTexture('#efeee8', pixel);
          mat.needsUpdate = true;
          if (oldMap) oldMap.dispose();
        }
      }
    }
    if (this.parkLamps?.length) {
      const glow = makeGlowTexture(pixel);
      const old = this.lampGlowTexture;
      for (const lamp of this.parkLamps) {
        lamp.halo.material.map = glow;
        lamp.halo.material.needsUpdate = true;
        lamp.pool.material.map = glow;
        lamp.pool.material.needsUpdate = true;
      }
      this.lampGlowTexture = glow;
      if (old) old.dispose();
    }
    if (this.dice?.length) {
      for (const die of this.dice) {
        for (const mat of die.materials || []) {
          if (!mat?.userData?.diceValue) continue;
          const oldMap = mat.map;
          mat.map = makeDiceFaceTexture(mat.userData.diceValue, pixel);
          mat.needsUpdate = true;
          if (oldMap) oldMap.dispose();
        }
      }
    }
    if (this.tileMeshes?.size) this.refreshAllTileFonts();
    this.ambient?.setPixelStyle?.(pixel);
  }

  updateRenderResolution() {
    if (!this.renderer) return;
    const deviceRatio = window.devicePixelRatio || 1;
    const qualityRatio = deviceRatio * (this.graphics?.resolution || 1);
    if (this.pixelStyle) {
      // Render the world to a deliberately small buffer, then nearest-neighbour
      // upscale it. Keep UI DOM layers crisp above the WebGL canvas.
      const cap = this.isCompactViewport ? 0.85 : 1.0;
      this.renderer.setPixelRatio(Math.max(0.4, Math.min(qualityRatio * 0.55, cap)));
    } else {
      // Mode Android: piksel tetap tajam di layar HP (dpr 2-3 tidak berguna),
      // jadi cukup 1.35× perangkat dengan lantai 0.9 supaya teks tetap jelas.
      const cap = this.graphics?.mobile ? 1.35 : this.isCompactViewport ? 1.35 : 1.8;
      const floor = this.graphics?.mobile ? 0.9 : 0.65;
      this.renderer.setPixelRatio(Math.max(floor, Math.min(qualityRatio, cap)) * (this.dynamicScale || 1));
    }
    this.basePixelRatio = this.renderer.getPixelRatio();
  }

  /** Mode hemat khusus HP/Android: pemangkasan biaya render yang tidak
      mengubah tampilan (bayangan diperbarui lebih jarang, lampu titik mati,
      resolusi adaptif mengikuti FPS). Kualitas & ketajaman tetap. */
  applyMobileMode() {
    const mobile = Boolean(this.graphics?.mobile);
    this.mobileMode = mobile;
    this.dynamicScale = 1;
    // lampu titik mahal di GPU HP → matikan, halo & genangan cahaya tetap ada
    for (const lamp of this.parkLamps || []) {
      if (lamp.light) lamp.light.visible = !mobile;
    }
    // bayangan: cukup diperbarui 15×/detik (adegan hampir statis)
    this.shadowFrameSkip = mobile ? 4 : 0;
    this.shadowFrame = 0;
    if (this.renderer) {
      this.renderer.shadowMap.autoUpdate = !mobile;
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (this.sunLight?.shadow) {
      this.sunLight.shadow.autoUpdate = !mobile;
      this.sunLight.shadow.needsUpdate = true;
    }
    this.updateRenderResolution();
  }

  /** Resolusi adaptif: kalau HP mulai berat, buffer diturunkan sedikit
      (maksimal 25%) lalu dinaikkan lagi begitu FPS kembali normal. */
  updateAdaptiveResolution(dt) {
    if (!this.mobileMode || !this.renderer) return;
    this._fpsSamples = (this._fpsSamples || 0) + 1;
    this._fpsTime = (this._fpsTime || 0) + dt;
    this._fpsAccum = (this._fpsAccum || 0) + dt;
    if (this._fpsTime < 1.2) return;
    const fps = this._fpsSamples / this._fpsTime;
    this._fpsSamples = 0;
    this._fpsTime = 0;
    const prev = this.dynamicScale;
    if (fps < 46) this.dynamicScale = Math.max(0.75, this.dynamicScale - 0.06);
    else if (fps > 57) this.dynamicScale = Math.min(1, this.dynamicScale + 0.04);
    if (Math.abs(prev - this.dynamicScale) > 0.001) this.updateRenderResolution();
  }

  setSmoothAnimation(enabled) {
    this.smoothAnimation = Boolean(enabled);
    if (!this.smoothAnimation) {
      this.cameraCutscene = null;
      this.screenShake = 0;
      this.finishCinematic();
      this.clearParticles();
      for (const pawn of this.pawns.values()) {
        pawn.group.scale.set(1, 1, 1);
      }
      for (const s of this.buildingSprings) {
        s.group.scale.set(1, 1, 1);
      }
      this.buildingSprings = [];
    }
  }

  clearParticles() {
    for (const p of this.particles) {
      this.fxGroup.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
    }
    this.particles = [];
  }

  spawnBurst(origin, kind = 'sparkles', accentHex = '#facc15') {
    if (!this.smoothAnimation || this.disposed) return;

    const palette =
      kind === 'confetti'
        ? ['#facc15', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#f97316']
        : kind === 'siren'
          ? ['#ef4444', '#2563eb', '#ffffff']
          : kind === 'coins'
            ? ['#facc15', '#f59e0b', '#fef08a']
            : [accentHex, '#fef08a', '#ffffff'];

    const baseCount = kind === 'confetti' || kind === 'coins' ? 38 : kind === 'step' ? 6 : 18;
    const count = Math.max(2, Math.round(baseCount * (this.graphics?.effects || 1)));
    const now = performance.now();

    for (let i = 0; i < count; i++) {
      const col = palette[i % palette.length];
      let geo;
      const detailSegments = this.graphics?.detail >= 1.35 ? 16 : this.graphics?.detail >= 1 ? 12 : 8;
      if (kind === 'coins') {
        geo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, detailSegments);
      } else if (kind === 'confetti') {
        geo = new THREE.BoxGeometry(0.24, 0.05, 0.34);
      } else if (kind === 'step') {
        geo = new THREE.SphereGeometry(0.14, detailSegments, Math.max(4, detailSegments - 2));
      } else {
        geo = new THREE.OctahedronGeometry(0.18, this.graphics?.detail >= 1.5 ? 1 : 0);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: kind === 'step' ? 0.15 : 0.45,
        roughness: 0.3,
        metalness: kind === 'coins' ? 0.65 : 0.15,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);
      mesh.position.y += kind === 'step' ? 0.15 : 0.9;

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const horizSpeed =
        kind === 'step'
          ? 1.8 + Math.random() * 1.4
          : kind === 'confetti' || kind === 'coins'
            ? 3.2 + Math.random() * 5.8
            : 2.2 + Math.random() * 3.8;
      const upSpeed =
        kind === 'step'
          ? 1.5 + Math.random() * 1.2
          : kind === 'confetti' || kind === 'coins'
            ? 8.5 + Math.random() * 6.5
            : 4.5 + Math.random() * 4.2;

      this.fxGroup.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(angle) * horizSpeed, upSpeed, Math.sin(angle) * horizSpeed),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        gravity: kind === 'confetti' ? 7.5 : 15.5,
        born: now,
        life: kind === 'step' ? 420 : kind === 'confetti' || kind === 'coins' ? 1900 : 1050,
      });
    }
  }

  playCutsceneCamera(kind, tileId = null, accent = '#facc15') {
    if (!this.smoothAnimation || this.disposed) return;
    const now = performance.now();

    if (kind === 'game_start') {
      this.cameraCutscene = {
        kind,
        start: now,
        duration: 2100,
        startTheta: this.orbit.theta - Math.PI * 0.65,
        endTheta: Math.PI / 2,
        startPhi: 0.46,
        endPhi: 0.78,
        startRadius: 56,
        endRadius: 40,
        target: new THREE.Vector3(0, 1.5, 0.8),
      };
      this.spawnBurst(new THREE.Vector3(0, BOARD_Y + 2.2, 0), 'confetti', '#facc15');
      return;
    }

    if (kind === 'jackpot' || kind === 'victory') {
      this.cameraCutscene = {
        kind,
        start: now,
        duration: kind === 'victory' ? 2800 : 2100,
        startTheta: this.orbit.theta,
        endTheta: this.orbit.theta + Math.PI * 0.75,
        startPhi: 0.76,
        endPhi: 0.62,
        startRadius: 34,
        endRadius: 28,
        target: new THREE.Vector3(0, 2.2, 0),
      };
      this.spawnBurst(new THREE.Vector3(0, BOARD_Y + 2.0, 0), 'coins', '#facc15');
      this.spawnBurst(new THREE.Vector3(0, BOARD_Y + 3.2, 0), 'confetti', '#facc15');
      return;
    }

    if (kind === 'jail_ott') {
      const pos = tileWorldPos(typeof tileId === 'number' ? tileId : 10, R_MID);
      const a = tileAngle(typeof tileId === 'number' ? tileId : 10);
      this.cameraCutscene = {
        kind,
        start: now,
        duration: 1850,
        startTheta: this.orbit.theta,
        endTheta: a + 0.25,
        startPhi: this.orbit.phi,
        endPhi: 0.86,
        startRadius: this.orbit.radius,
        endRadius: 23,
        target: new THREE.Vector3(pos.x * 0.68, 1.8, pos.z * 0.68),
      };
      this.screenShake = 0.55;
      this.spawnBurst(pos, 'siren', '#ef4444');
      return;
    }

    if (kind === 'buy_property' || kind === 'upgrade_property') {
      const tid = typeof tileId === 'number' ? tileId : 0;
      const pos = tileWorldPos(tid, R_MID);
      const a = tileAngle(tid);
      this.cameraCutscene = {
        kind,
        start: now,
        duration: 1450,
        startTheta: this.orbit.theta,
        endTheta: a + 0.18,
        startPhi: this.orbit.phi,
        endPhi: 0.84,
        startRadius: this.orbit.radius,
        endRadius: 25,
        target: new THREE.Vector3(pos.x * 0.62, 1.7, pos.z * 0.62),
      };
      this.spawnBurst(pos, kind === 'upgrade_property' ? 'coins' : 'sparkles', accent);
      return;
    }

    if (kind === 'dice_double') {
      this.screenShake = 0.35;
      this.spawnBurst(new THREE.Vector3(0, BOARD_Y + 0.8, 0.7), 'coins', '#f59e0b');
      return;
    }

    if (kind === 'bankrupt') {
      this.screenShake = 0.75;
      this.spawnBurst(new THREE.Vector3(0, BOARD_Y + 1.5, 0), 'siren', '#dc2626');
      return;
    }

    if (kind === 'card_draw' || kind === 'trade_deal') {
      const origin = typeof tileId === 'number' ? tileWorldPos(tileId, R_MID) : new THREE.Vector3(0, BOARD_Y + 1.2, 0);
      this.spawnBurst(origin, 'sparkles', accent);
    }
  }

  resetCamera() {
    this.orbit.desiredTheta = Math.PI / 2;
    this.orbit.desiredPhi = 0.78;
    this.orbit.desiredRadius = 42;
    this.orbit.desiredTarget.set(0, 1.3, 1.2);
    this.orbit.userControlledUntil = 0;
  }

  focusTile(tileId) {
    if (this.cinematic && !this.cinematic.userOverride) return;
    if (Date.now() < this.orbit.userControlledUntil) return;
    const pos = tileWorldPos(tileId, R_MID);
    this.orbit.desiredTarget.set(pos.x * 0.44, 1.4, pos.z * 0.44);
    this.orbit.desiredRadius = 33;
    this.orbit.desiredPhi = 0.72;
  }

  syncGameState(game) {
    this.lastGame = game;
    if (!game) {
      for (const p of this.pawns.values()) {
        this.scene.remove(p.group);
      }
      this.pawns.clear();
      for (const tile of this.currentBoard) {
        if (this.tileOwnersHash.get(tile.id) && this.tileOwnersHash.get(tile.id) !== 'none') {
          this.tileOwnersHash.set(tile.id, 'none');
          const mesh = this.tileMeshes.get(tile.id);
          if (mesh) {
            const oldMap = mesh.material.map;
            mesh.material.map = makeTileTexture(tile, null, this.pixelStyle);
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

    // 0. If this game uses a new randomized Indonesian board, rebuild the 40 board tiles & 3D landmarks!
    if (Array.isArray(game.board) && game.board.length > 0 && game.boardSeed !== this.currentBoardSeed) {
      this.populateBoardTiles(game.board, game.boardSeed);
    }
    // Every match gets its own rhythm (sepi / cukup ramai / ramai) and its own
    // mix of vehicles, pedestrians, stalls and street decor.
    if (game.boardSeed !== undefined && game.boardSeed !== this.currentAmbientSeed) {
      this.currentAmbientSeed = game.boardSeed;
      this.ambient?.setSeed(game.boardSeed);
    }

    const activeBoard = this.currentBoard;

    // 1. Update tiles, owner glowing pads & 3D buildings
    for (const tile of activeBoard) {
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
            owner ? { name: owner.name, color: ownerChar.color } : null,
            this.pixelStyle
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
        if (this.pixelStyle) this.applyPixelMaterialTone(built.group); // pion & karakter ikut pixel
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
    // Quality sliders can rebuild while dragging; dispose old model resources to
    // avoid a GPU-memory leak after repeated custom graphics changes.
    for (const spring of this.buildingSprings) {
      if (spring.group === group) spring.group.scale.setScalar(group.userData.fitScale || 0.86);
    }
    this.buildingSprings = this.buildingSprings.filter((spring) => spring.group !== group);
    while (group.children.length > 0) {
      const child = group.children[0];
      child.traverse?.((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material?.dispose?.());
        else object.material?.dispose?.();
      });
      group.remove(child);
    }
    if (level <= 0) return;
    this.fitTileProp(
      group,
      buildUpgradeStructure(level, ownerColor, {
        heightScale: this.graphics?.buildingHeight || 1,
        detail: this.graphics?.detail || 1,
      }),
      tileId,
    );
    // Pixel mode: fresh building materials must match the posterised look too.
    if (this.pixelStyle) this.applyPixelMaterialTone(group);
    if (this.smoothAnimation) {
      group.scale.set(1.15, 0.05, 1.15);
      this.buildingSprings.push({
        group,
        start: performance.now(),
        duration: 620,
      });
      this.spawnBurst(tileWorldPos(tileId, R_MID), 'sparkles', ownerColor);
    } else {
      group.scale.setScalar(group.userData.fitScale || 0.86);
    }
  }

  animateDiceAndMove({ playerId, dice, fromPos, steps, toPos, toJail }) {
    soundEngine.playDice();

    this.diceAnim = {
      startTime: performance.now(),
      duration: this.smoothAnimation ? 920 : 860,
      values: dice,
      landBurstDone: false,
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

    const hopDuration = this.smoothAnimation ? 200 : 185;
    const stepCount = Math.max(1, Number(steps) || 0);
    // Dice settle starts the pawn after 880ms. Keep UI hidden through the last
    // hop plus a short camera-restoration tail, not an arbitrary extra delay.
    const presentationMs = Math.min(
      6800,
      toJail ? 1500 : 880 + stepCount * hopDuration + 420
    );
    this.beginCinematic('pawn_move', {
      duration: presentationMs,
      kind: 'pawn_move',
      focus: {
        kind: 'pawn',
        playerId,
        tileId: toJail ? JAIL_TILE_ID : toPos,
        radius: this.isCompactViewport ? 32 : 26.5,
        strength: this.isCompactViewport ? 0.52 : 0.66,
        phi: this.isCompactViewport ? 0.82 : 0.76,
      },
    });

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
    }
  }

  teleportPawn(playerId, toPos) {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    this.beginCinematic('pawn_teleport', {
      duration: 1300,
      kind: 'pawn_teleport',
      focus: {
        kind: 'tile',
        tileId: toPos,
        radius: this.isCompactViewport ? 32 : 27,
        strength: this.isCompactViewport ? 0.52 : 0.64,
        phi: this.isCompactViewport ? 0.82 : 0.76,
      },
    });
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
    const pointers = new Map();
    let downX = 0;
    let downY = 0;
    let dragDist = 0;
    let pinch = null;
    let gestureWasPinch = false;

    const markUserOverride = () => {
      if (this.cinematic) this.cinematic.userOverride = true;
      // If the player deliberately takes over camera control during a cutscene,
      // never let the scripted camera continue fighting their gesture.
      this.cameraCutscene = null;
    };
    const clampRadius = (r) => Math.max(20, Math.min(115, r));

    const onDown = (e) => {
      if (this.mode !== 'game') return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        this.orbit.dragging = true;
        this.orbit.lastX = e.clientX;
        this.orbit.lastY = e.clientY;
        downX = e.clientX;
        downY = e.clientY;
        dragDist = 0;
        gestureWasPinch = false;
        try {
          el.setPointerCapture?.(e.pointerId);
        } catch {
          // Ignore capture failures on older browsers.
        }
      } else if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        pinch = {
          dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          radius: this.orbit.desiredRadius,
        };
        gestureWasPinch = true;
        this.orbit.dragging = false;
        markUserOverride();
      }
    };

    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two-finger pinch zoom (mobile / tablet) — no mouse wheel needed.
      if (pointers.size >= 2 && pinch) {
        const [a, b] = Array.from(pointers.values());
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        this.orbit.desiredRadius = clampRadius(pinch.radius * (pinch.dist / dist));
        this.orbit.userControlledUntil = Date.now() + 6000;
        markUserOverride();
        return;
      }

      if (!this.orbit.dragging) return;
      const dx = e.clientX - this.orbit.lastX;
      const dy = e.clientY - this.orbit.lastY;
      this.orbit.lastX = e.clientX;
      this.orbit.lastY = e.clientY;
      dragDist += Math.hypot(dx, dy);
      // Only a real drag (not a tap) takes the camera back from the cinematic.
      if (dragDist > 8) markUserOverride();
      this.orbit.desiredTheta += dx * 0.0065;
      this.orbit.desiredPhi = Math.max(0.32, Math.min(1.22, this.orbit.desiredPhi - dy * 0.0055));
      this.orbit.userControlledUntil = Date.now() + 6000;
    };

    const onUp = (e) => {
      const hadPointer = pointers.has(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      const wasDragging = this.orbit.dragging;
      if (pointers.size === 0) this.orbit.dragging = false;

      if (
        hadPointer &&
        wasDragging &&
        pointers.size === 0 &&
        !gestureWasPinch &&
        dragDist < 8 &&
        this.mode === 'game' &&
        this.onSelectTile
      ) {
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
      if (pointers.size === 0) gestureWasPinch = false;
    };

    const onWheel = (e) => {
      if (this.mode !== 'game') return;
      e.preventDefault();
      this.orbit.desiredRadius = clampRadius(this.orbit.desiredRadius + e.deltaY * 0.025);
      this.orbit.userControlledUntil = Date.now() + 6000;
      markUserOverride();
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    this._cleanupControls = () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      pointers.clear();
    };
  }

  handleResize() {
    if (!this.container || this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Portrait phones need a wider FOV so the whole 40-tile board stays visible
    // without touching orbit state (so camera restore stays pixel-exact).
    const aspect = w / Math.max(1, h);
    this.isCompactViewport = aspect < 0.95;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.72 ? 54 : aspect < 0.95 ? 47 : 40;
    this.camera.updateProjectionMatrix();
    // Cap DPR on phones for smooth 60fps WebGL instead of overheating the GPU.
    this.updateRenderResolution();
    this.renderer.setSize(w, h);
  }

  /* ================== WAKTU KOTA: WARNA LANGIT & CAHAYA ====================
     The city clock (6 pagi → 5 pagi) also tints the sky, the fog and the sun so
     the player can feel the pasar pagi, the siang heat, the sore golden hour
     and the malam lights. Nilai dijaga tetap terang supaya papan tetap jelas. */

  static DAY_PALETTE = [
    // jam, langit, kabut, warna matahari, intensitas, hemisphere, hemi intensity
    { h: 0, sky: '#243450', fog: '#2c3f60', sun: '#8fa8d8', sunI: 0.5, hemiSky: '#5a6f9c', hemiGround: '#22331f', hemiI: 0.62 },
    { h: 4.6, sky: '#3d4f74', fog: '#52628a', sun: '#b9a6c8', sunI: 0.66, hemiSky: '#8fa2c4', hemiGround: '#2e4430', hemiI: 0.72 },
    { h: 6.2, sky: '#e9b48f', fog: '#f0c5a3', sun: '#ffd9a8', sunI: 1.02, hemiSky: '#ffe2c4', hemiGround: '#4e8a3a', hemiI: 0.86 },
    { h: 9, sky: '#8bc8ea', fog: '#9cd0ee', sun: '#fff9eb', sunI: 1.38, hemiSky: '#d6efff', hemiGround: '#59ad42', hemiI: 0.96 },
    { h: 15.5, sky: '#8bc8ea', fog: '#a3d2ea', sun: '#fff6e0', sunI: 1.32, hemiSky: '#dcf0ff', hemiGround: '#5cb045', hemiI: 0.95 },
    { h: 17.6, sky: '#f0a978', fog: '#f6bc90', sun: '#ffcf94', sunI: 1.14, hemiSky: '#ffe0bb', hemiGround: '#4f8b3b', hemiI: 0.9 },
    { h: 19.2, sky: '#5c6a96', fog: '#6a7aa6', sun: '#c9b6d8', sunI: 0.72, hemiSky: '#a9b6d6', hemiGround: '#31462c', hemiI: 0.74 },
    { h: 21.5, sky: '#2b3c5c', fog: '#33456a', sun: '#93aada', sunI: 0.54, hemiSky: '#63779f', hemiGround: '#25361f', hemiI: 0.66 },
    { h: 24, sky: '#243450', fog: '#2c3f60', sun: '#8fa8d8', sunI: 0.5, hemiSky: '#5a6f9c', hemiGround: '#22331f', hemiI: 0.62 },
  ];

  applyTimeOfDay(hour = 9) {
    if (this._lastHour !== undefined && Math.abs(this._lastHour - hour) < 0.02) return;
    this._lastHour = hour;
    const pal = Scene3D.DAY_PALETTE;
    let a = pal[0];
    let b = pal[pal.length - 1];
    for (let i = 0; i < pal.length - 1; i++) {
      if (hour >= pal[i].h && hour <= pal[i + 1].h) {
        a = pal[i];
        b = pal[i + 1];
        break;
      }
    }
    const t = b.h === a.h ? 0 : (hour - a.h) / (b.h - a.h);
    const lerp = (x, y) => x + (y - x) * t;
    if (!this._skyA) {
      this._skyA = new THREE.Color();
      this._skyB = new THREE.Color();
    }
    const mix = (ka, kb, target) => target.copy(this._skyA.set(ka)).lerp(this._skyB.set(kb), t);
    mix(a.sky, b.sky, this.scene.background);
    if (this.scene.fog) mix(a.fog, b.fog, this.scene.fog.color);
    if (this.hemiLight) {
      mix(a.hemiSky, b.hemiSky, this.hemiLight.color);
      mix(a.hemiGround, b.hemiGround, this.hemiLight.groundColor);
      this.hemiLight.intensity = lerp(a.hemiI, b.hemiI);
    }
    if (this.sunLight) {
      mix(a.sun, b.sun, this.sunLight.color);
      this.sunLight.intensity = lerp(a.sunI, b.sunI);
      // the sun climbs and sets: a slight arc keeps the shadows alive
      const dayT = Math.max(0, Math.min(1, (hour - 5.4) / 13.2));
      this.sunLight.position.set(22 - dayT * 40, 30 + Math.sin(dayT * Math.PI) * 30, 30 - dayT * 55);
    }
  }

  animate() {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    const now = performance.now();

    if (this.mobileMode) {
      this.shadowFrame = (this.shadowFrame || 0) + 1;
      if (this.shadowFrameSkip && this.shadowFrame % this.shadowFrameSkip === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }
      this.updateAdaptiveResolution(dt);
    }

    if (this.ambient) {
      this.ambient.update(dt);
      this.applyTimeOfDay(this.ambient.hour);
      // Kanopi toko dicek berkala (murah: hanya bila jumlah props berubah).
      this.awningTick = (this.awningTick || 0) + 1;
      if (this.awningTick % 40 === 0) this.refreshAwningClearance();
      // Lampu gedung & lampu taman: sore hari menyala satu per satu.
      this.updateCityLights(this.ambient.hour, dt);
    }

    if (this.flagMesh) {
      this.flagMesh.rotation.y = Math.sin(elapsed * 4.2) * 0.16;
    }

    // Subtle ambient life animations on bespoke Indonesian tile landmarks!
    for (const anim of this.landmarkAnims) {
      if (anim.type === 'spin') {
        anim.mesh.rotation.y = elapsed * anim.speed;
      } else if (anim.type === 'spinZ') {
        anim.mesh.rotation.z = elapsed * anim.speed;
      } else if (anim.type === 'bob') {
        anim.mesh.position.y = anim.baseY + Math.sin(elapsed * anim.speed + anim.phase) * anim.amp;
      } else if (anim.type === 'pulse') {
        const s = 0.85 + Math.abs(Math.sin(elapsed * anim.speed)) * 0.3;
        anim.mesh.scale.setScalar(s);
      } else if (anim.type === 'siren') {
        const redOn = Math.floor(elapsed * 5.5) % 2 === 0;
        anim.red.scale.setScalar(redOn ? 1.2 : 0.8);
        anim.blue.scale.setScalar(redOn ? 0.8 : 1.2);
      }
    }

    if (this.diceAnim) {
      const rawT = Math.min(1, (now - this.diceAnim.startTime) / this.diceAnim.duration);
      const t = this.pixelStyle && rawT < 1 ? Math.floor(rawT * 12) / 12 : rawT;
      const easeOut = 1 - Math.pow(1 - t, 3);
      const bounceHeight = this.smoothAnimation ? 5.2 : 4.2;
      const bounce = Math.abs(Math.sin(t * Math.PI * 2.5)) * (1 - t) * bounceHeight;

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
        if (this.smoothAnimation && !this.diceAnim.landBurstDone) {
          this.diceAnim.landBurstDone = true;
          this.screenShake = Math.max(this.screenShake, 0.22);
          this.spawnBurst(new THREE.Vector3(0, BOARD_Y + 0.5, 0.65), 'sparkles', '#fde047');
        }
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
            duration: this.smoothAnimation ? 200 : 185,
            from: fromVec,
            to: toVec,
            tileId: next.tileId,
          };
          soundEngine.playHop(next.stepIdx);
          if (
            this.smoothAnimation &&
            !this.isCinematic() &&
            Date.now() >= this.orbit.userControlledUntil &&
            !this.cameraCutscene
          ) {
            this.focusTile(next.tileId);
          }
        }
      }

      if (pawn.currentHop) {
        const h = pawn.currentHop;
        const rawP = Math.min(1, (now - h.start) / h.duration);
        let p = this.smoothAnimation
          ? rawP < 0.5
            ? 2 * rawP * rawP
            : 1 - Math.pow(-2 * rawP + 2, 2) / 2
          : rawP;
        if (this.pixelStyle && rawP < 1) p = Math.floor(p * 8) / 8;

        pawn.group.position.lerpVectors(h.from, h.to, p);
        const arcH = this.smoothAnimation ? 1.95 : 1.55;
        const arcP = this.pixelStyle && rawP < 1 ? Math.floor(rawP * 8) / 8 : rawP;
        pawn.group.position.y = BOARD_Y + Math.sin(arcP * Math.PI) * arcH;

        const targetYaw = -tileAngle(h.tileId) + Math.PI / 2;
        if (this.smoothAnimation && !this.pixelStyle) {
          // Standard style keeps the smooth shortest-angle squash-and-stretch.
          let diff = targetYaw - pawn.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          pawn.group.rotation.y += diff * Math.min(1, dt * 16);

          const stretch = Math.sin(rawP * Math.PI);
          const sy = rawP < 0.14 || rawP > 0.86 ? 0.86 : 1 + stretch * 0.22;
          const sxz = 1 / Math.sqrt(sy);
          pawn.group.scale.set(sxz, sy, sxz);
        } else if (this.pixelStyle && this.smoothAnimation) {
          // Retro animation uses chunky pose changes rather than continuous springs.
          pawn.group.rotation.y = p >= 1 ? targetYaw : pawn.group.rotation.y;
          const pose = rawP < 0.18 || rawP > 0.82 ? 0.9 : 1.08;
          pawn.group.scale.set(1 / Math.sqrt(pose), pose, 1 / Math.sqrt(pose));
        } else {
          pawn.group.rotation.y = targetYaw;
          pawn.group.scale.set(1, 1, 1);
        }

        if (rawP >= 1) {
          pawn.tileId = h.tileId;
          pawn.currentHop = null;
          if (this.smoothAnimation) {
            pawn.group.scale.set(1.12, 0.84, 1.12);
            this.spawnBurst(h.to, 'step', '#f5e6c8');
          }
        }
      } else if (pawn.restPos) {
        const lerpRate = this.smoothAnimation ? 1 - Math.exp(-dt * 9.5) : Math.min(1, dt * 8);
        pawn.group.position.lerp(pawn.restPos, lerpRate);
        if (this.smoothAnimation) {
          // Gentle spring settle back to (1,1,1) + lively breathing bob for active player!
          const sRate = 1 - Math.exp(-dt * 11);
          let breath = pawn.indicator.visible ? Math.sin(elapsed * 4.2) * 0.035 : 0;
          if (this.pixelStyle) breath = Math.round(breath * 3) / 3;
          if (this.pixelStyle) {
            pawn.group.scale.set(1 - breath * 0.5, 1 + breath, 1 - breath * 0.5);
          } else {
            pawn.group.scale.x += (1 - breath * 0.5 - pawn.group.scale.x) * sRate;
            pawn.group.scale.y += (1 + breath - pawn.group.scale.y) * sRate;
            pawn.group.scale.z += (1 - breath * 0.5 - pawn.group.scale.z) * sRate;
          }
          if (typeof pawn.restAngle === 'number') {
            let diff = pawn.restAngle - pawn.group.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            pawn.group.rotation.y += diff * lerpRate;
          }
        } else {
          pawn.group.scale.set(1, 1, 1);
          if (typeof pawn.restAngle === 'number') {
            pawn.group.rotation.y = pawn.restAngle;
          }
        }
      }
    }

    // Update 3D building construction elastic springs (Smooth Animation ON only)
    if (this.buildingSprings.length > 0) {
      for (let i = this.buildingSprings.length - 1; i >= 0; i--) {
        const s = this.buildingSprings[i];
        const rawT = Math.min(1, (now - s.start) / s.duration);
        const t = this.pixelStyle && rawT < 1 ? Math.floor(rawT * 8) / 8 : rawT;
        // easeOutBack spring overshoot
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        const sy = Math.max(0.05, eased);
        const sxz = 1 + (1 - t) * 0.14 * Math.cos(t * Math.PI * 2);
        const base = s.group.userData.fitScale || 1;
        s.group.scale.set(sxz * base, sy * base, sxz * base);
        if (t >= 1) {
          s.group.scale.setScalar(base);
          this.buildingSprings.splice(i, 1);
        }
      }
    }

    // Update 3D FX particles (coins, confetti, sparkles, siren flashes, step dust)
    if (this.particles.length > 0) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        const age = now - pt.born;
        if (age >= pt.life) {
          this.fxGroup.remove(pt.mesh);
          pt.mesh.geometry.dispose();
          pt.mesh.material.dispose();
          this.particles.splice(i, 1);
          continue;
        }
        const frac = age / pt.life;
        pt.vel.y -= pt.gravity * dt;
        pt.mesh.position.addScaledVector(pt.vel, dt);
        if (pt.mesh.position.y < BOARD_Y + 0.12) {
          pt.mesh.position.y = BOARD_Y + 0.12;
          pt.vel.y *= -0.35;
          pt.vel.x *= 0.72;
          pt.vel.z *= 0.72;
        }
        pt.mesh.rotation.x += pt.rotVel.x * dt;
        pt.mesh.rotation.y += pt.rotVel.y * dt;
        pt.mesh.rotation.z += pt.rotVel.z * dt;
        const fade = 1 - Math.pow(frac, 1.8);
        pt.mesh.material.opacity = this.pixelStyle ? Math.round(fade * 4) / 4 : fade;
      }
    }

    if (this.mode === 'lobby') {
      this.orbit.desiredTheta = Math.PI / 2 + Math.sin(elapsed * 0.14) * 0.42;
      this.orbit.desiredPhi = 0.92;
      this.orbit.desiredRadius = 42;
      this.orbit.desiredTarget.set(0, 2.0, -2);
    } else if (this.smoothAnimation && this.cameraCutscene && !this.orbit.dragging) {
      const cs = this.cameraCutscene;
      const t = Math.min(1, (now - cs.start) / cs.duration);
      const ease = 1 - Math.pow(1 - t, 3);
      this.orbit.desiredTheta = cs.startTheta + (cs.endTheta - cs.startTheta) * ease;
      this.orbit.desiredPhi = cs.startPhi + (cs.endPhi - cs.startPhi) * ease;
      this.orbit.desiredRadius = cs.startRadius + (cs.endRadius - cs.startRadius) * ease;
      this.orbit.desiredTarget.copy(cs.target);
      if (t >= 1) {
        this.cameraCutscene = null;
      }
    } else if (this.cinematic && !this.cinematic.userOverride && !this.orbit.dragging) {
      const focus = this.getCinematicFocus();
      if (focus) {
        let pos = null;
        if (focus.playerId) {
          const pawn = this.pawns.get(focus.playerId);
          if (pawn) pos = pawn.group.position;
        }
        if (!pos && typeof focus.tileId === 'number') {
          pos = tileWorldPos(focus.tileId, R_MID);
        }
        if (pos) {
          const o = this.orbit;
          const k = focus.strength ?? 0.66;
          o.desiredTarget.set(pos.x * k, 1.5, pos.z * k);
          o.desiredRadius = focus.radius ?? 26.5;
          o.desiredPhi = focus.phi ?? 0.76;
          // Aim the camera from outside the pawn's angle, using the shortest
          // rotation so the board never spins the long way around.
          let desired = Math.atan2(pos.z, pos.x) + 0.2;
          while (desired - o.theta > Math.PI) desired -= Math.PI * 2;
          while (desired - o.theta < -Math.PI) desired += Math.PI * 2;
          o.desiredTheta = desired;
        }
      }
    }

    const damp = this.smoothAnimation ? 1 - Math.exp(-dt * 4.8) : Math.min(1, dt * 6);
    this.orbit.theta += (this.orbit.desiredTheta - this.orbit.theta) * damp;
    this.orbit.phi += (this.orbit.desiredPhi - this.orbit.phi) * damp;
    this.orbit.radius += (this.orbit.desiredRadius - this.orbit.radius) * damp;
    this.orbit.target.lerp(this.orbit.desiredTarget, damp);

    let shakeX = 0;
    let shakeY = 0;
    if (this.smoothAnimation && this.screenShake > 0.005) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= Math.exp(-dt * 9.5);
    } else {
      this.screenShake = 0;
    }

    const sinPhi = Math.sin(this.orbit.phi);
    this.camera.position.set(
      this.orbit.target.x + this.orbit.radius * sinPhi * Math.cos(this.orbit.theta) + shakeX,
      this.orbit.target.y + this.orbit.radius * Math.cos(this.orbit.phi) + shakeY,
      this.orbit.target.z + this.orbit.radius * sinPhi * Math.sin(this.orbit.theta)
    );
    this.camera.lookAt(this.orbit.target);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.ambient?.dispose();
    this.ambient = null;
    this.clearParticles();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    if (this.cinematic) {
      for (const entry of this.cinematic.entries.values()) {
        if (entry.timer) clearTimeout(entry.timer);
      }
      this.cinematic = null;
    }
    if (this._cleanupControls) this._cleanupControls();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
