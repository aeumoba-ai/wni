import * as THREE from 'three';

/* ============================================================================
   AMBIENT LIFE — "Aktivitas warga sekitar peta"
   ----------------------------------------------------------------------------
   A light-weight, seeded simulation of Indonesian street life that plays
   around the board: ojol, angkot, bajaj, becak, warung, tukang bakso, ibu-ibu
   belanja, anak sekolah, satpam, petugas kebersihan, kurir paket, penjual
   balon, tukang parkir, halte, lampu lalu lintas, baliho, dan lain-lain.

   Rules requested by the design brief:
   • Density stays moderate ("cukup sedikit padat") and never overwhelms the
     board — the counts are capped and scaled by the graphics preset.
   • Behaviour follows normal Indonesian daily life: left-hand traffic, angkot
     stopping at the halte, ojol weaving past, pedestrians strolling the park
     footpath, vendors opening stalls, people queuing at the traffic light.
   • Each match is seeded from the game's board seed, so the mood of the city
     is randomised per game and slowly cycles between
     SEPI → CUKUP RAMAI → RAMAI → SEPI ...  (never the same rhythm twice).
   • Lots of activity archetypes, plus detailed map decoration (zebra cross,
     lane markings, curbs, utility poles & wires, billboards, benches, bins,
     planters, umbul-umbul, parked motorcycles, halte, poskamling).
   ========================================================================== */

const ROAD_CENTER = 32;
const ROAD_HALF_LEN = 62; // asphalt runs to ±68; keep wrap just inside it
const ROAD_END = 68;
const LANE_SHIFT = 1.5;
const PARK_HALF = 21.5;
const WALK_SIDEWALK_HALF = 36.4; // centre line of the shop-front pavement
const PAVEMENT_SPAN = [40, 64]; // stretches of pavement that no junction cuts through
const SIDEWALK_HALF = 36.4; // shop-front pavement, outside the asphalt (28.6…35.4)
const BOARD_CLEAR = 20.4; // the board itself + its ring of landmarks is sacred
const FLYOVER_Y = 8.3;
const FLYOVER_Z = -40;

export const ACTIVITY_LEVELS = {
  sepi: { key: 'sepi', label: 'Sepi', vehicles: 4, walkers: 7, stalls: 2, speed: 0.92 },
  cukup: { key: 'cukup', label: 'Cukup Ramai', vehicles: 8, walkers: 14, stalls: 4, speed: 1 },
  ramai: { key: 'ramai', label: 'Ramai', vehicles: 12, walkers: 21, stalls: 5, speed: 1.12 },
};

const LEVEL_WEIGHTS = [
  ['sepi', 0.28],
  ['cukup', 0.42],
  ['ramai', 0.3],
];

/* ============================== JAM KOTA (WAKTU JUALAN) =====================
   The city now has its own clock. A full day (24 jam) passes in DAY_SECONDS
   seconds, starting in the early morning, so a single match sees the pasar
   pagi, the siang crowd, the sore snacks and the night grills — and the
   vendors standing on the pavement keep changing with it. */

export const DAY_SECONDS = 300; // 5 real minutes = 1 hari di kota
export const DAY_START_HOUR = 6; // mulai pagi, saat pasar baru buka

/* Every vendor has its own selling hours (jam buka, jam tutup). Windows that
   cross midnight simply close later than 24 (e.g. martabak 17 → 25). */
const STALL_HOURS = {
  warung: [0, 24], // warung bu Tini buka 24 jam
  gorengan: [5.5, 20],
  bensin: [5, 19],
  halte: [4, 24], // halte is permanent map furniture, always staffed
  cilok: [9, 17],
  kelapa: [8, 18],
  tukangcendol: [10, 19],
  es: [9, 17],
  siomay: [11, 20],
  bakso: [10, 21],
  balon: [15, 19],
  sate: [16, 23],
  jagung: [16, 23],
  tahubulat: [14, 22],
  martabak: [17, 25],
};

/* Street traffic is not the same at 6 pagi and 8 malam: delman and gerobak
   start early, box trucks only run in daylight, ojol runs nearly all day. */
const VEHICLE_HOURS = {
  gerobak: [5, 17],
  tukangsayur: [4.5, 12],
  delman: [5.5, 19],
  sepeda: [5, 19],
  becak: [5, 23],
  becakbarang: [6, 19],
  bajaj: [6, 23],
  angkot: [4.5, 24],
  bus: [4.5, 25], // bus malam tetap jalan
  truk: [5, 25],
  boxtruck: [6, 22],
  elf: [5, 23],
  pickup: [5, 24],
  sedan: [4.5, 26],
  vespa: [5.5, 24],
  motor: [4.5, 26],
  ojol: [4.5, 26],
  martabak: [16, 25],
};

/* People keep office hours too (jam kerja), so the pavement mix shifts. */
const ROLE_HOURS = {
  anaksekolah: [6, 14],
  anak: [6.5, 19],
  jogging: [4.5, 9],
  tukangpos: [7, 16],
  kurir: [7, 21],
  petugas: [5, 16],
  pedagang: [4.5, 22.5],
  tukangsayur: [4.5, 11],
  tukangbangunan: [7, 17],
  penjualkoran: [5.5, 17],
  pengamen: [9, 25],
  fotografer: [8, 21],
  pasangan: [17, 23],
  polisi: [5, 24],
  ojol: [5, 24],
  satpam: [17, 31], // shift malam
  ibu: [6, 21],
  warga: [5.5, 23.5],
  tukangparkir: [6, 22],
  nenek: [6, 18],
};

/** Is `hour` inside a [open, close) window? Windows may run past midnight,
    either by closing at a number > 24 (e.g. satpam 17 → 31 = 07 pagi) or by
    wrapping (e.g. martabak 17 → 25 = 01 dini hari). */
function inHours(hour, window) {
  if (!window) return true;
  const [open, closeRaw] = window;
  const close = closeRaw > 24 ? closeRaw - 24 : closeRaw;
  if (close === open) return true; // buka 24 jam
  if (closeRaw > 24 || close < open) return hour >= open || hour < close;
  return hour >= open && hour < close;
}

const willOpen = (table, key, hour) => inHours(hour, table[key]);

/* ------------------------------------------------------------------ utils */

function seedFromString(input) {
  const str = String(input ?? 'konoha');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
const between = (rand, min, max) => min + rand() * (max - min);

/* ---------------------------------------------------- shared geometry pool */

function createUnitGeometries() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(0.5, 10, 8),
    sphereLow: new THREE.SphereGeometry(0.5, 8, 6),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    cyl10: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    cone: new THREE.ConeGeometry(0.5, 1, 8),
  };
}

/* --------------------------------------------------------------- palettes */

const SHIRT_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#475569'];
const VEHICLE_COLORS = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#f97316', '#f8fafc', '#0ea5e9', '#a855f7'];
const ANGKOT_COLORS = ['#1d4ed8', '#0e7490', '#c2410c'];
const SKIN_TONES = ['#f2c39b', '#e0a678', '#c98a5b', '#a86b41'];

/* ================================================================= class */

export class AmbientLife {
  constructor(scene, { compact = false, solids = null } = {}) {
    this.scene = scene;
    this.compact = compact;
    this.citySolids = Array.isArray(solids) ? solids : [];
    this.blockers = [];
    this.group = new THREE.Group();
    this.group.name = 'ambient-life';
    this.scene.add(this.group);

    this.geo = createUnitGeometries();
    this.matCache = new Map();

    this.rng = mulberry32(seedFromString('konoha'));
    this.seedKey = null;
    this.quality = 1;
    this._qualityKey = null;

    this.vehicles = [];
    this.walkers = [];
    this.stalls = [];
    this.idleAnims = [];
    this.lanes = [];
    this.trafficLights = [];
    this.time = 0;

    this.blockers = [];
    this.currentLevel = ACTIVITY_LEVELS.cukup;
    this.levelKey = 'cukup';
    this.moodDwell = between(this.rng, 26, 44);
    // Jam kota: mulai pagi, satu hari penuh dalam DAY_SECONDS detik nyata.
    this.hour = DAY_START_HOUR;
    this.dayLength = DAY_SECONDS;
    this.hourTick = -1;
    this.lights = { x: 'green', z: 'red' };

    this.shadow = !compact;

    this.buildAll('konoha');
  }

  /* ------------------------------------------------------------- helpers */

  mat(color, opts = {}) {
    const key = `${color}|${opts.roughness ?? 0.72}|${opts.metalness ?? 0}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}|${opts.transparent ? 1 : 0}`;
    if (this.matCache.has(key)) return this.matCache.get(key);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.72,
      metalness: opts.metalness ?? 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      transparent: Boolean(opts.transparent),
      opacity: opts.opacity ?? 1,
    });
    this.matCache.set(key, material);
    return material;
  }

  /** Adds a scaled unit-box mesh to `parent`. */
  box(parent, color, w, h, d, x = 0, y = 0, z = 0, opts = {}) {
    const mesh = new THREE.Mesh(this.geo.box, opts.material || this.mat(color, opts));
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    if (this.shadow && !opts.noShadow) mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  sphere(parent, color, radius, x = 0, y = 0, z = 0, opts = {}) {
    const geo = opts.lowPoly ? this.geo.sphereLow : this.geo.sphere;
    const mesh = new THREE.Mesh(geo, opts.material || this.mat(color, opts));
    mesh.scale.setScalar(radius * 2);
    mesh.position.set(x, y, z);
    if (opts.sx || opts.sy || opts.sz) mesh.scale.set(radius * 2 * (opts.sx || 1), radius * 2 * (opts.sy || 1), radius * 2 * (opts.sz || 1));
    if (this.shadow && !opts.noShadow) mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  cylinder(parent, color, radius, height, x = 0, y = 0, z = 0, opts = {}) {
    const mesh = new THREE.Mesh(opts.round ? this.geo.cyl10 : this.geo.cyl, opts.material || this.mat(color, opts));
    mesh.scale.set(radius * 2, height, radius * 2);
    mesh.position.set(x, y, z);
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    if (this.shadow && !opts.noShadow) mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  cone(parent, color, radius, height, x = 0, y = 0, z = 0, opts = {}) {
    const mesh = new THREE.Mesh(this.geo.cone, opts.material || this.mat(color, opts));
    mesh.scale.set(radius * 2, height, radius * 2);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  addAnim(kind, mesh, opts = {}) {
    this.idleAnims.push({ kind, mesh, ...opts });
    return mesh;
  }


  /* ------------------------------------------------------- PLACEMENT LOGIC */
  /* Keeps every prop (warung, halte, bangku, tiang, baliho, motor parkir…)
     clear of the board, the roads, the park footpath, the streetscape that
     Scene3D built (trees, lamps, monuments, buildings) and of every other
     prop that was already placed. Guarantees nothing intersects nothing. */

  /** World position of a pavement stroller. */
  patrolPosition(w, u = w.u) {
    const clamped = Math.max(w.patrolRange[0], Math.min(w.patrolRange[1], u));
    const off = w.lateral;
    if (w.patrolAxis === 'x') {
      return { x: clamped, z: w.patrolFixed + off, rot: w.dir > 0 ? 0 : Math.PI };
    }
    return { x: w.patrolFixed + off, z: clamped, rot: w.dir > 0 ? -Math.PI / 2 : Math.PI / 2 };
  }

  isOnRoadOrPath(x, z, r) {
    const ax = Math.abs(x);
    const az = Math.abs(z);
    // asphalt ring roads (±32 on both axes, 6.8 wide)
    if (Math.abs(ax - ROAD_CENTER) < 3.4 + r && az < 78) return true;
    if (Math.abs(az - ROAD_CENTER) < 3.4 + r && ax < 78) return true;
    // cream park footpath that rings the board
    if (Math.abs(ax - PARK_HALF) < 1.3 + r && az < 24) return true;
    if (Math.abs(az - PARK_HALF) < 1.3 + r && ax < 24) return true;
    return false;
  }

  overlapsCitySolid(x, z, r, h, y0 = 0) {
    for (const s of this.citySolids) {
      if (!s) continue;
      const sy0 = s.y0 ?? 0;
      if (sy0 >= y0 + h || s.h <= y0) continue; // separated vertically
      if (Math.abs(x - s.x) < s.hw + r && Math.abs(z - s.z) < s.hd + r) return true;
    }
    return false;
  }

  overlapsProp(x, z, r) {
    for (const b of this.blockers) {
      const dx = x - b.x;
      const dz = z - b.z;
      if (dx * dx + dz * dz < (r + b.r) * (r + b.r)) return true;
    }
    return false;
  }

  canPlace(x, z, r, h) {
    if (Math.hypot(x, z) - r < BOARD_CLEAR) return false; // never over the board
    if (this.isOnRoadOrPath(x, z, 0.3)) return false; // the base may not stand on asphalt
    if (this.overlapsCitySolid(x, z, r, h)) return false;
    if (this.overlapsProp(x, z, r)) return false;
    return true;
  }

  /** Deterministic spiral search: nearest free spot around the wanted anchor. */
  findSpot(x, z, r, h) {
    if (this.canPlace(x, z, r, h)) return { x, z };
    for (let ring = 1; ring <= 16; ring++) {
      const step = ring * 0.85;
      const steps = 12 + ring * 4;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2 + ring * 0.7;
        const cx = x + Math.cos(a) * step;
        const cz = z + Math.sin(a) * step;
        if (this.canPlace(cx, cz, r, h)) return { x: cx, z: cz };
      }
    }
    return null;
  }

  registerProp(x, z, r, h, physR = r, walkable = false) {
    this.blockers.push({ x, z, r, h, physR, walkable });
  }

  /** Places a prop group at (or near) the wanted anchor and registers it. */
  placeProp(group, x, z, r, h, { faceBoard = true, y = 0, physR = null, walkable = false } = {}) {
    const spot = this.findSpot(x, z, r, h);
    if (!spot) {
      group.visible = false;
      group.userData.unplaced = true;
      return null;
    }
    const physical = physR === null ? Math.min(r, 1.0) : physR;
    group.position.set(spot.x, y, spot.z);
    if (faceBoard) group.rotation.y = Math.atan2(-spot.x, -spot.z);
    this.registerProp(spot.x, spot.z, r, h, physical, walkable);
    group.userData.solid = { x: spot.x, z: spot.z, r, h, physR: physical, walkable };
    return spot;
  }

  /* ------------------------------------------------------------ lifecycle */

  setQuality(graphics) {
    const detail = graphics?.detail ?? 1;
    const effects = graphics?.effects ?? 1;
    const next = Math.max(0.55, Math.min(1.4, 0.72 * detail * 0.5 + 0.55 * effects));
    const key = Math.round(next * 4) / 4;
    if (key === this._qualityKey) return;
    this._qualityKey = key;
    this.quality = key;
    this.buildAll(this.seedKey || 'konoha');
  }

  /** Re-seed the whole city activity (called once per new match). */
  setSeed(seed) {
    const key = String(seed ?? 'konoha');
    if (key === this.seedKey) return;
    this.buildAll(key);
  }

  clear() {
    this.group.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m && m.userData?.localMaterial) m.dispose();
        if (m && m.map && m.userData?.localTexture) m.map.dispose();
      }
    });
    this.group.clear();
    for (const m of this.matCache.values()) m.dispose();
    this.matCache.clear();
    this.vehicles = [];
    this.walkers = [];
    this.stalls = [];
    this.idleAnims = [];
    this.lanes = [];
    this.trafficLights = [];
    this.blockers = [];
  }

  /** Solids that belong to the base scene (trees, lamps, buildings…) — supplied
      by Scene3D so the ambient props can be placed without overlapping them. */
  setCitySolids(list) {
    this.citySolids = Array.isArray(list) ? list : [];
    this.blockers = [];
    this.buildAll(this.seedKey || 'konoha');
  }

  buildAll(seedKey) {
    this.seedKey = seedKey;
    this.clear();
    this.rng = mulberry32(seedFromString(seedKey));
    this.buildRoadDecor();
    this.buildTrafficLights();
    this.buildStreetFurniture();
    this.buildBillboards();
    this.buildLandmarksAndPlayground();
    this.buildStalls();
    this.buildLanesAndVehicles();
    this.buildWalkers();

    // Base mood is randomised for every match, then it keeps mutating over time.
    this.levelKey = this.rollLevel();
    this.currentLevel = ACTIVITY_LEVELS[this.levelKey];
    this.moodDwell = between(this.rng, 24, 40);
    // Jam jualan: only the vendors open at this hour take a spot.
    this.applySchedule();
  }

  rollLevel(exclude = null) {
    let total = 0;
    for (const [key, w] of LEVEL_WEIGHTS) if (key !== exclude) total += w;
    let roll = this.rng() * total;
    for (const [key, w] of LEVEL_WEIGHTS) {
      if (key === exclude) continue;
      roll -= w;
      if (roll <= 0) return key;
    }
    return 'cukup';
  }

  applyLevel() {
    const q = this.quality;
    const budget = {
      vehicles: Math.max(2, Math.round(this.currentLevel.vehicles * q)),
      walkers: Math.max(3, Math.round(this.currentLevel.walkers * q)),
      stalls: Math.max(1, Math.round(this.currentLevel.stalls * q)),
    };
    this.budget = budget;

    this.vehicles.forEach((v, i) => {
      const wantActive = i < budget.vehicles;
      if (wantActive) {
        if (!v.active) this.spawnVehicle(v);
        v.retiring = false;
      } else if (v.active) {
        // Finish the current trip before disappearing, instead of blinking out
        // in the middle of the road when the city becomes quieter.
        v.retiring = true;
      }
    });
    // Two gates: the mood of the city decides how many people are out, the
    // clock decides which professions are working. We count the on-duty people
    // first and then take as many as the budget allows, so the pavement is never
    // left empty just because the working shift sits late in the roster.
    const onDuty = this.walkers.filter((w) => w.scheduleOpen !== false);
    const allow = new Set(onDuty.slice(0, budget.walkers));
    this.walkers.forEach((w) => {
      w.targetScale = allow.has(w) ? 1 : 0;
    });
    // The halte (bus stop) is permanent map furniture; the street stalls open
    // and close in a seeded random order, so every match has a different market.
    const permanent = this.stalls.filter((s) => s.permanent);
    const openable = this.stalls.filter((s) => !s.permanent).sort((a, b) => a.order - b.order);
    const slots = Math.max(0, budget.stalls - permanent.length);
    permanent.forEach((s) => {
      s.targetScale = 1;
    });
    // Only vendors whose jam jualan has started may take a slot; the rest are
    // closed (gerobak ditutup, tikar digulung) until their hour comes round.
    // A vendor never opens his lapak on top of someone: if a pedestrian happens
    // to be standing on the spot, the stall waits for the next check.
    const crowdFree = (s) => {
      if (this.time < 0.5) return true;
      const { x, z } = s.group.position;
      const r = (s.footRadius || 1) + 0.55;
      return !this.walkers.some((w) => {
        if (w.targetScale <= 0) return false;
        const dx = w.group.position.x - x;
        const dz = w.group.position.z - z;
        return dx * dx + dz * dz < r * r;
      });
    };
    const inSeason = openable.filter((s) => s.scheduleOpen !== false && (s.targetScale > 0 || crowdFree(s)));
    openable.forEach((s) => {
      s.targetScale = 0;
    });
    inSeason.forEach((s, i) => {
      s.targetScale = i < slots ? 1 : 0;
    });
  }

  /* ------------------------------------------------------------ JAM KOTA */

  /** Advance the city clock; re-check who is open for business every half hour. */
  updateClock(dt) {
    if (!this.dayLength || this.dayLength <= 0) return;
    this.hour = (this.hour + (dt / this.dayLength) * 24) % 24;
    const tick = Math.floor(this.hour * 2);
    if (tick === this.hourTick) return;
    this.hourTick = tick;
    this.applySchedule();
  }

  /** Jump straight to a given hour (also used by QA / debug). */
  setHour(hour) {
    this.hour = ((hour % 24) + 24) % 24;
    this.hourTick = -1;
    this.applySchedule();
  }

  /** Label waktu untuk UI ("Pagi", "Siang", …). */
  get dayPhase() {
    const h = this.hour;
    if (h < 4.5) return 'Malam';
    if (h < 10) return 'Pagi';
    if (h < 15) return 'Siang';
    if (h < 18) return 'Sore';
    if (h < 21) return 'Petang';
    return 'Malam';
  }

  /** Recompute which stalls / vendors / street activities are "in season". */
  applySchedule() {
    const h = this.hour;
    for (const s of this.stalls) {
      s.scheduleOpen = s.permanent ? true : willOpen(STALL_HOURS, s.kind, h);
      if (s.sign) s.sign.visible = s.scheduleOpen;
    }
    for (const w of this.walkers) {
      w.scheduleOpen = willOpen(ROLE_HOURS, w.role, h);
    }
    // A closed kind is replaced the next time a vehicle leaves the map edge.
    for (const v of this.vehicles) {
      v.kindOpen = willOpen(VEHICLE_HOURS, v.kind, h);
    }
    this.applyLevel();
  }

  updateMood(dt) {
    this.moodDwell -= dt;
    if (this.moodDwell > 0) return;
    const next = this.rollLevel(this.levelKey);
    this.levelKey = next;
    this.currentLevel = ACTIVITY_LEVELS[next];
    this.moodDwell = between(this.rng, 22, 46);
    this.applyLevel();
  }

  /* ================================================================ ROADS */

  buildRoadDecor() {
    const g = this.group;
    const road = ROAD_CENTER;

    // Paved sidewalks along the four roads (cream, like the park footpath).
    const walkMat = this.mat('#efeada', { roughness: 0.9 });
    const PAVE_FROM = ROAD_CENTER + 3.4; // asphalt edge
    const PAVE_TO = 68;
    const segLen = PAVE_TO - PAVE_FROM; // 32.6
    for (const sign of [-1, 1]) {
      for (const dirSeg of [-1, 1]) {
        const cSeg = dirSeg * (PAVE_FROM + segLen / 2);
        this.box(g, '', segLen, 0.14, 2.1, cSeg, 0.07, sign * SIDEWALK_HALF, { material: walkMat, noShadow: true });
        this.box(g, '', 2.1, 0.14, segLen, sign * SIDEWALK_HALF, 0.07, cSeg, { material: walkMat, noShadow: true });
        // kerb stone between asphalt and pavement
        this.box(g, '#d8d2c2', segLen, 0.18, 0.3, cSeg, 0.09, sign * (SIDEWALK_HALF - 1.05), { noShadow: true });
        this.box(g, '#d8d2c2', 0.3, 0.18, segLen, sign * (SIDEWALK_HALF - 1.05), 0.09, cSeg, { noShadow: true });
      }
    }

    // Dashed centre lines (instanced — one draw call for the whole map).
    const dashGeo = new THREE.BoxGeometry(1, 0.02, 0.16);
    const dashMat = this.mat('#f8fafc', { roughness: 0.6 });
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, 4 * 17 * 2);
    dashes.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dummy = new THREE.Object3D();
    let di = 0;
    for (const sign of [-1, 1]) {
      for (let i = -8; i <= 8; i++) {
        // horizontal roads
        dummy.position.set(i * 7.6, 0.1, sign * road - 0.0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        dashes.setMatrixAt(di++, dummy.matrix);
        // vertical roads
        dummy.position.set(sign * road, 0.1, i * 7.6);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        dashes.setMatrixAt(di++, dummy.matrix);
      }
    }
    dashes.count = di;
    dashes.instanceMatrix.needsUpdate = true;
    g.add(dashes);

    // Zebra crossings just outside every junction (bars parallel to traffic).
    const zebraGeo = new THREE.BoxGeometry(3.4, 0.02, 0.55);
    const zebra = new THREE.InstancedMesh(zebraGeo, dashMat, 4 * 2 * 6);
    let zi = 0;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          // crossing the east-west road
          dummy.position.set(sx * (ROAD_CENTER + 5.2), 0.11, sz * ROAD_CENTER + (i - 2.5) * 1.12);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          zebra.setMatrixAt(zi++, dummy.matrix);
          // crossing the north-south road
          dummy.position.set(sx * ROAD_CENTER + (i - 2.5) * 1.12, 0.11, sz * (ROAD_CENTER + 5.2));
          dummy.rotation.set(0, Math.PI / 2, 0);
          dummy.updateMatrix();
          zebra.setMatrixAt(zi++, dummy.matrix);
        }
      }
    }
    zebra.count = zi;
    zebra.instanceMatrix.needsUpdate = true;
    g.add(zebra);

    // Simple road name plates on the corners.
    for (const [sx, sz] of [[1, 1], [-1, -1]]) {
      const sign = new THREE.Group();
      this.cylinder(sign, '#94a3b8', 0.07, 3.2, 0, 1.6, 0);
      this.box(sign, '#1e40af', 2.4, 0.55, 0.08, 0, 3.1, 0);
      g.add(sign);
      this.placeProp(sign, sx * 41, sz * 37.2, 1.3, 3.4, { physR: 1.1 });
    }
  }

  buildTrafficLights() {
    const g = this.group;
    const corners = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    for (const [sx, sz] of corners) {
      const group = new THREE.Group();
      g.add(group);
      const spot = this.placeProp(group, sx * (ROAD_CENTER + 4.4), sz * (ROAD_CENTER + 4.4), 0.6, 4.8, { faceBoard: false, physR: 0.3 });
      if (spot) group.rotation.y = Math.atan2(-spot.x, -spot.z);
      this.cylinder(group, '#334155', 0.13, 4.2, 0, 2.1, 0);
      this.box(group, '#1f2937', 0.42, 1.25, 0.42, 0, 4.4, 0);

      const lamps = {};
      const lampDefs = [
        ['red', '#ef4444', 4.75],
        ['yellow', '#facc15', 4.4],
        ['green', '#22c55e', 4.05],
      ];
      for (const [key, color, y] of lampDefs) {
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.05,
          roughness: 0.5,
        });
        mat.userData.localMaterial = true;
        const bulb = new THREE.Mesh(this.geo.sphereLow, mat);
        bulb.scale.setScalar(0.26);
        bulb.position.set(0, y, 0.23);
        group.add(bulb);
        lamps[key] = mat;
      }
      this.trafficLights.push({ group, lamps, corner: [sx, sz] });
    }
  }

  /* ======================================================= STREET FURNISH */

  buildStreetFurniture() {
    const g = this.group;
    const rand = this.rng;

    // Utility poles + overhead cables along the ring roads (very Indonesian).
    const poleMat = this.mat('#8a8f98', { roughness: 0.8 });
    const wireMat = this.mat('#2f3238', { roughness: 0.9 });
    const poleTops = [];
    for (let i = -2; i <= 2; i++) {
      for (const sz of [-1, 1]) {
        const pole = new THREE.Group();
        this.cylinder(pole, '', 0.14, 6.4, 0, 3.2, 0, { material: poleMat });
        this.box(pole, '#5b6068', 1.5, 0.12, 0.12, 0, 5.7, 0);
        this.box(pole, '#5b6068', 1.1, 0.12, 0.12, 0, 5.0, 0);
        this.box(pole, '#94a3b8', 0.26, 0.26, 0.26, 0, 6.5, 0);
        g.add(pole);
        const spot = this.placeProp(pole, i * 24, sz * (SIDEWALK_HALF + 0.75), 0.75, 6.6, { faceBoard: false, physR: 0.2 });
        if (spot && i < 2) poleTops.push({ ...spot, sz });
      }
    }
    // Overhead cables hang between neighbouring poles (never through a building).
    for (const top of poleTops) {
      const next = poleTops.find((o) => o !== top && o.sz === top.sz && Math.abs(o.x - top.x - 24) < 1.5);
      if (!next) continue;
      const len = next.x - top.x;
      for (const dy of [0, -0.34]) {
        const wire = new THREE.Mesh(this.geo.box, wireMat);
        wire.scale.set(len, 0.045, 0.045);
        wire.position.set(top.x + len / 2, 5.66 + dy, (top.z + next.z) / 2);
        g.add(wire);
      }
    }

    // Park benches, bins & planters around the footpath.
    const benchMat = this.mat('#a1662f', { roughness: 0.85 });
    const benchPlaces = [
      [-18, 24.4, 0],
      [-6, 24.4, 0],
      [6, 24.4, 0],
      [18, 24.4, 0],
      [-18, -24.4, Math.PI],
      [18, -24.4, Math.PI],
      [-24.4, 8, Math.PI / 2],
      [24.4, -8, -Math.PI / 2],
    ];
    for (const [bx, bz, ry] of benchPlaces) {
      const bench = new THREE.Group();
      this.box(bench, '', 2.1, 0.12, 0.6, 0, 0.52, 0, { material: benchMat });
      this.box(bench, '', 2.1, 0.5, 0.12, 0, 0.78, -0.28, { material: benchMat });
      this.box(bench, '#6b7280', 0.12, 0.5, 0.12, -0.85, 0.26, 0.18);
      this.box(bench, '#6b7280', 0.12, 0.5, 0.12, 0.85, 0.26, 0.18);
      g.add(bench);
      const spot = this.placeProp(bench, bx, bz, 1.15, 1.0, { faceBoard: false, physR: 1.0 });
      if (spot) bench.rotation.y = ry;
    }

    for (const [bx, bz] of [[-25.2, 12], [25.2, 12], [-25.2, -12], [25.2, -12]]) {
      const bin = new THREE.Group();
      this.cylinder(bin, '#166534', 0.34, 0.86, 0, 0.43, 0);
      this.cylinder(bin, '#14532d', 0.38, 0.1, 0, 0.9, 0);
      g.add(bin);
      this.placeProp(bin, bx, bz, 0.5, 0.95, { faceBoard: false, physR: 0.36 });
    }

    // Planter boxes with colourful flowers around the monument side.
    const flowerColors = ['#f472b6', '#fbbf24', '#f87171', '#c084fc', '#facc15'];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const planter = new THREE.Group();
      this.box(planter, '#b45309', 1.8, 0.4, 0.8, 0, 0.2, 0);
      // low green hedge, then the flowers on top
      for (let f = 0; f < 3; f++) {
        const ox = (f - 1) * 0.5;
        this.sphere(planter, '#166534', 0.17, ox, 0.42, 0, { noShadow: true, sy: 0.7 });
        this.sphere(planter, pick(rand, flowerColors), 0.1, ox, 0.56, 0, { noShadow: true });
      }
      g.add(planter);
      const spot = this.placeProp(planter, Math.cos(angle) * 24.2, Math.sin(angle) * 24.2, 1.0, 0.65, { faceBoard: false, physR: 0.9 });
      if (spot) planter.rotation.y = -angle;
    }

    // Umbul-umbul / flags near the palace, waving with the idle animation list.
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Group();
      this.cylinder(post, '#cbd5e1', 0.05, 3.4, 0, 1.7, 0, { noShadow: true });
      const flag = new THREE.Mesh(this.geo.box, this.mat(i % 2 ? '#f97316' : '#dc2626', { roughness: 0.6 }));
      flag.scale.set(1.1, 0.7, 0.06);
      flag.position.set(0.55, 3.0, 0);
      g.add(post);
      post.add(flag);
      const spot = this.placeProp(post, -10 + i * 4, -23.2, 0.7, 3.5, { faceBoard: false, physR: 0.45 });
      if (spot) this.addAnim('flag', flag, { phase: i * 0.7, speed: 2.4 + (i % 3) * 0.4 });
    }

    // Parked motorcycles cluster (dekat warung) + a parked angkot at the halte.
    const parkingSpots = [
      [23.2, 15.6, 0.5],
      [24.5, 16.4, 0.62],
      [25.8, 15.4, 0.42],
      [-23.4, -16.0, 2.3],
    ];
    for (const [px, pz, ry] of parkingSpots) {
      const bike = this.buildMotorcycle(false, true);
      g.add(bike);
      const spot = this.placeProp(bike, px, pz, 0.85, 1.0, { faceBoard: false, physR: 0.7 });
      if (spot) bike.rotation.y = ry + Math.PI / 2;
    }
  }

  /** Pos ronda, tugu kampung, gapura gang, ayunan taman, papan nama gang… */
  buildLandmarksAndPlayground() {
    const g = this.group;
    const rand = this.rng;

    // 1. Pos ronda (neighbourhood watch hut) with a warm lamp inside
    for (const [sx, sz] of [[-1, 1], [1, -1]]) {
      const pos = new THREE.Group();
      this.box(pos, '#a16207', 1.7, 0.12, 1.7, 0, 0.06, 0); // raised wooden floor
      for (const px of [-0.75, 0.75]) {
        for (const pz of [-0.75, 0.75]) {
          this.box(pos, '#78350f', 0.12, 2.45, 0.12, px, 1.23, pz); // corner posts
        }
      }
      this.box(pos, '#7c2d12', 1.7, 1.5, 0.1, 0, 0.82, -0.8); // back wall
      this.box(pos, '#7c2d12', 0.1, 1.5, 1.5, -0.8, 0.82, 0); // side wall
      this.box(pos, '#fef3c7', 0.7, 0.5, 0.05, 0.1, 1.15, -0.74); // poster
      this.box(pos, '#78350f', 1.74, 0.1, 1.74, 0, 2.42, 0); // roof underside
      this.box(pos, '#92400e', 1.92, 0.12, 1.92, 0, 2.52, 0, { rotY: 0.06 }); // roof
      this.box(pos, '#fbbf24', 0.2, 0.2, 0.2, 0.3, 2.2, 0, { emissive: '#fbbf24', emissiveIntensity: 0.8 });
      this.box(pos, '#57534e', 0.9, 0.16, 0.36, -0.1, 0.5, 0.15); // bench inside
      this.box(pos, '#dc2626', 0.5, 0.3, 0.05, 0, 1.6, 0.8); // signboard
      g.add(pos);
      this.placeProp(pos, sx * 25.5, sz * 17, 1.3, 2.62);
    }

    // 2. Tugu kampung (small neighbourhood monument)
    const tugu = new THREE.Group();
    this.box(tugu, '#e5e7eb', 1.5, 0.5, 1.5, 0, 0.25, 0);
    this.box(tugu, '#d1d5db', 1.0, 0.4, 1.0, 0, 0.7, 0);
    this.cylinder(tugu, '#f3f4f6', 0.28, 2.6, 0, 2.2, 0, { round: true });
    this.sphere(tugu, '#eab308', 0.24, 0, 3.6, 0, { lowPoly: true });
    g.add(tugu);
    this.placeProp(tugu, -18.5, -25.2, 1.0, 3.9);

    // 3. Gapura gang (neighbourhood gate) — two posts + banner across
    const gate = new THREE.Group();
    for (const px of [-1.6, 1.6]) {
      this.box(gate, '#f8fafc', 0.26, 2.9, 0.26, px, 1.45, 0);
      this.box(gate, '#dc2626', 0.34, 0.2, 0.34, px, 2.9, 0);
    }
    this.box(gate, '#dc2626', 3.5, 0.5, 0.16, 0, 2.55, 0);
    this.box(gate, '#f8fafc', 2.4, 0.14, 0.18, 0, 2.32, 0);
    g.add(gate);
    this.placeProp(gate, 21.5, 25.2, 1.0, 3.1, { faceBoard: false });

    // 4. Papan nama gang / RT sign
    for (const [sx, sz] of [[-1, -1], [1, 1]]) {
      const board = new THREE.Group();
      this.cylinder(board, '#94a3b8', 0.06, 2.4, 0, 1.2, 0);
      this.box(board, '#065f46', 1.5, 0.5, 0.06, 0, 2.2, 0);
      this.box(board, '#f8fafc', 1.2, 0.1, 0.08, 0, 2.06, 0);
      g.add(board);
      this.placeProp(board, sx * 27.5, sz * 24.5, 0.9, 2.5, { faceBoard: false, physR: 0.5 });
    }

    // 5. Playground: small swing set + slide in the park corner
    const play = new THREE.Group();
    for (const px of [-1.1, 1.1]) this.box(play, '#0ea5e9', 0.12, 1.9, 0.12, px, 0.95, 0, { rotZ: px > 0 ? -0.12 : 0.12 });
    this.box(play, '#0ea5e9', 2.4, 0.14, 0.14, 0, 1.9, 0);
    for (const px of [-0.45, 0.45]) {
      this.box(play, '#64748b', 0.03, 0.7, 0.03, px, 1.5, 0);
      this.box(play, '#facc15', 0.34, 0.06, 0.22, px, 1.12, 0);
    }
    this.box(play, '#22c55e', 0.9, 0.1, 0.5, 2.0, 0.9, 0, { rotZ: -0.45 });
    this.box(play, '#16a34a', 0.9, 0.1, 0.5, 2.0, 0.55, 0, { rotZ: -0.9 });
    g.add(play);
    this.placeProp(play, -24.5, 17.5, 2.0, 2.1);

    // 6. Small fish pond / taman bunga at the other corner
    const pond = new THREE.Group();
    this.cylinder(pond, '#1d4ed8', 1.5, 0.12, 0, 0.06, 0, { round: true });
    this.cylinder(pond, '#93c5fd', 1.15, 0.1, 0, 0.1, 0, { round: true, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.box(pond, '#9ca3af', 0.5, 0.24, 0.4, Math.cos(a) * 1.55, 0.12, Math.sin(a) * 1.55, { rotY: -a });
      this.sphere(pond, pick(rand, ['#f472b6', '#fbbf24', '#f87171']), 0.1, Math.cos(a) * 1.55, 0.3, Math.sin(a) * 1.55, { noShadow: true });
    }
    g.add(pond);
    this.placeProp(pond, 24.5, -17.5, 2.1, 0.5);

    // 7. Overhead banner strings across the park footpath corners ("17-an" style)
    for (const [sx, sz] of [[-1, 1], [1, -1]]) {
      const bunting = new THREE.Group();
      this.cylinder(bunting, '#94a3b8', 0.05, 2.6, -1.6, 1.3, 0, { noShadow: true });
      this.cylinder(bunting, '#94a3b8', 0.05, 2.6, 1.6, 1.3, 0, { noShadow: true });
      for (let i = 0; i < 7; i++) {
        const flag = new THREE.Mesh(this.geo.box, this.mat(i % 2 ? '#ef4444' : '#f8fafc', { roughness: 0.6 }));
        flag.scale.set(0.28, 0.34, 0.03);
        flag.position.set(-1.4 + i * 0.46, 2.45 - Math.sin((i / 6) * Math.PI) * 0.18, 0);
        bunting.add(flag);
        this.addAnim('flag', flag, { phase: i * 0.5, speed: 2.2 });
      }
      g.add(bunting);
      this.placeProp(bunting, sx * 25.5, sz * 25.5, 1.8, 2.7, { faceBoard: false, physR: 1.2 });
    }
  }

  buildBillboards() {
    const rand = this.rng;
    const ads = [
      { lines: ['SATE PADANG'], bg: '#b91c1c', fg: '#fef3c7', sub: 'PEDAS MANTAP' },
      { lines: ['ES KELAPA'], bg: '#0f766e', fg: '#ecfeff', sub: 'SEGAR ALAMI' },
      { lines: ['BATIK'], bg: '#7c2d12', fg: '#fde68a', sub: 'NUSANTARA' },
      { lines: ['KOPI TUBRUK'], bg: '#422006', fg: '#fbbf24', sub: 'SETIAP HARI' },
      { lines: ['BAKSO PAK KUMIS'], bg: '#1e3a8a', fg: '#fef9c3', sub: 'SEJAK 1987' },
      { lines: ['SERVIS MOTOR'], bg: '#111827', fg: '#f8fafc', sub: 'BUKA 07.00' },
      { lines: ['LAUNDRY KILOAN'], bg: '#0ea5e9', fg: '#f0f9ff', sub: '2 HARI JADI' },
      { lines: ['LES BAHASA'], bg: '#7c3aed', fg: '#f5f3ff', sub: 'DAFTAR SEKARANG' },
      { lines: ['CAT TEMBOK'], bg: '#c2410c', fg: '#fff7ed', sub: 'SEMUA WARNA' },
      { lines: ['KUE BASAH'], bg: '#be123c', fg: '#ffe4e6', sub: 'PESAN HARI INI' },
    ];
    // 2–4 billboards per match, placed on the map corners and never overlapping.
    const spotPool = [
      [-52, 36.5, 0],
      [52, -36.5, Math.PI],
      [-36.5, -52, Math.PI / 2],
      [36.5, 52, -Math.PI / 2],
      [-56, -36.5, 0],
      [56, 36.5, Math.PI],
    ];
    const shuffledSpots = spotPool
      .map((spot) => ({ spot, order: rand() }))
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.spot);
    const spots = shuffledSpots.slice(0, 2 + Math.floor(rand() * 3));
    const adBag = ads.map((ad) => ({ ad, order: rand() })).sort((a, b) => a.order - b.order).map((entry) => entry.ad);
    for (let i = 0; i < spots.length; i++) {
      const [bx, bz, ry] = spots[i];
      const ad = adBag[i % adBag.length];
      const group = new THREE.Group();
      this.box(group, '#475569', 0.28, 7.2, 0.28, -2.4, 3.6, 0);
      this.box(group, '#475569', 0.28, 7.2, 0.28, 2.4, 3.6, 0);
      this.box(group, '#f8fafc', 6.0, 3.1, 0.22, 0, 6.0, 0);
      const tex = makeAdTexture(ad.lines, ad.bg, ad.fg, ad.sub);
      const adMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
      adMat.userData.localMaterial = true;
      adMat.userData.localTexture = true;
      const board = new THREE.Mesh(this.geo.box, adMat);
      board.scale.set(5.7, 2.8, 0.08);
      board.position.set(0, 6.0, 0.15);
      group.add(board);
      this.group.add(group);
      const spot = this.placeProp(group, bx, bz, 3.1, 7.6, { faceBoard: false, physR: 3.0, walkable: true });
      if (spot) group.rotation.y = ry;
    }
  }

  /* ---------------------------------------------------------------- halte */

  buildHalte(x, z, ry) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = ry;
    this.box(group, '#0ea5e9', 4.2, 0.16, 1.9, 0, 3.0, 0);
    for (const px of [-1.9, 1.9]) {
      this.box(group, '#475569', 0.14, 3.0, 0.14, px, 1.5, 0.8);
      this.box(group, '#475569', 0.14, 3.0, 0.14, px, 1.5, -0.8);
    }
    this.box(group, '#94a3b8', 3.6, 0.1, 0.5, 0, 0.62, -0.6);
    this.box(group, '#94a3b8', 3.6, 0.5, 0.1, 0, 0.9, -0.85);
    this.box(group, '#facc15', 1.5, 0.45, 0.08, 0, 2.55, -0.95);
    return group;
  }

  /* ============================================================ VEHICLES */

  buildLanesAndVehicles() {
    const rand = this.rng;
    const laneDefs = [
      { axis: 'x', coord: ROAD_CENTER - LANE_SHIFT, dir: 1, y: 0.1, lightAxis: 'x' },
      { axis: 'x', coord: ROAD_CENTER + LANE_SHIFT, dir: -1, y: 0.1, lightAxis: 'x' },
      // Driving on the left, Indonesian style: facing +x the left side is -z.
      { axis: 'x', coord: -ROAD_CENTER - LANE_SHIFT, dir: 1, y: 0.1, lightAxis: 'x' },
      { axis: 'x', coord: -ROAD_CENTER + LANE_SHIFT, dir: -1, y: 0.1, lightAxis: 'x' },
      // Facing +z the left side is +x.
      { axis: 'z', coord: ROAD_CENTER + LANE_SHIFT, dir: 1, y: 0.1, lightAxis: 'z' },
      { axis: 'z', coord: ROAD_CENTER - LANE_SHIFT, dir: -1, y: 0.1, lightAxis: 'z' },
      { axis: 'z', coord: -ROAD_CENTER + LANE_SHIFT, dir: 1, y: 0.1, lightAxis: 'z' },
      { axis: 'z', coord: -ROAD_CENTER - LANE_SHIFT, dir: -1, y: 0.1, lightAxis: 'z' },
      { axis: 'x', coord: FLYOVER_Z - 1.1, dir: 1, y: FLYOVER_Y, lightAxis: null },
      { axis: 'x', coord: FLYOVER_Z + 1.1, dir: -1, y: FLYOVER_Y, lightAxis: null },
    ];
    this.lanes = laneDefs.map((def) => ({ ...def, vehicles: [] }));

    // Build a pool of the most common Indonesian street vehicles.
    const maxVehicles = Math.max(6, Math.round(ACTIVITY_LEVELS.ramai.vehicles * 1.5));
    for (let i = 0; i < maxVehicles; i++) {
      const lane = this.lanes[i % this.lanes.length];
      const kind = this.rollVehicleKind(lane, rand, i);
      const { group, length } = this.buildVehicle(kind, rand);
      group.scale.setScalar(1.3);
      group.visible = false;
      this.group.add(group);
      const vehicle = {
        kind,
        group,
        length: length * 1.3,
        lane,
        pos: between(rand, -ROAD_HALF_LEN, ROAD_HALF_LEN),
        speed: this.vehicleSpeed(kind) * between(rand, 0.9, 1.12),
        baseSpeed: 0,
        active: false,
        bobPhase: rand() * Math.PI * 2,
        stopTimer: 0,
      };
      vehicle.baseSpeed = vehicle.speed;
      lane.vehicles.push(vehicle);
      this.vehicles.push(vehicle);
    }
  }

  rollVehicleKind(lane, rand, index) {
    // The slow "street life" vehicles live in the kerb lane, fast traffic in the
    // inner lane, so the mix feels like a real Indonesian road.
    const kerbLane = Math.abs(lane.coord) > ROAD_CENTER;
    const openNow = (k) => willOpen(VEHICLE_HOURS, k, this.hour);
    const slowAll = ['becak', 'delman', 'gerobak', 'sepeda', 'bajaj', 'angkot', 'martabak', 'tukangsayur'];
    const fastAll = ['motor', 'ojol', 'vespa', 'sedan', 'elf', 'pickup', 'boxtruck', 'truk', 'bus', 'angkot'];
    // Only vehicles that actually operate at this hour may appear (no delman
    // at midnight, no box truck before dawn), with a safe fallback.
    const slow = slowAll.filter(openNow);
    const fast = fastAll.filter(openNow);
    if (lane.lightAxis === null) {
      const toll = ['bus', 'truk', 'boxtruck', 'sedan', 'elf'].filter(openNow);
      return pick(rand, toll.length ? toll : ['sedan']);
    }
    if (kerbLane && rand() < 0.5 && slow.length) return pick(rand, slow);
    return pick(rand, fast.length ? fast : slow.length ? slow : ['sedan']);
  }

  /** Swap a vehicle for one that is open for business at the current hour.
      Called when it leaves the map edge, so it never pops in mid-road. */
  retuneVehicleKind(vehicle) {
    if (vehicle.kindOpen !== false) return;
    const want = this.rollVehicleKind(vehicle.lane, this.rng, 0);
    const built = want === vehicle.kind ? null : this.buildVehicle(want, this.rng);
    if (!built) {
      // Same kind came up again — keep the model, just refresh its state.
      vehicle.kindOpen = willOpen(VEHICLE_HOURS, vehicle.kind, this.hour);
      return;
    }
    const visible = vehicle.group.visible;
    this.group.remove(vehicle.group);
    built.group.scale.setScalar(1.3);
    built.group.visible = visible;
    this.group.add(built.group);
    vehicle.kind = want;
    vehicle.group = built.group;
    vehicle.length = built.length * 1.3;
    vehicle.halfSum = undefined;
    vehicle.speed = this.vehicleSpeed(want) * between(this.rng, 0.9, 1.12);
    vehicle.baseSpeed = vehicle.speed;
    vehicle.kindOpen = true;
    this.placeVehicle(vehicle);
  }

  vehicleSpeed(kind) {
    switch (kind) {
      case 'vespa':
        return 11.2;
      case 'elf':
        return 9.6;
      case 'boxtruck':
        return 7.8;
      case 'delman':
        return 3.8;
      case 'gerobak':
        return 2.4;
      case 'sepeda':
        return 4.4;
      case 'martabak':
        return 3.4;
      case 'tukangsayur':
        return 3.0;
      case 'motor':
        return 13.5;
      case 'ojol':
        return 14.5;
      case 'sedan':
        return 10.5;
      case 'angkot':
        return 8.4;
      case 'bajaj':
        return 7.6;
      case 'pickup':
        return 9.2;
      case 'truk':
        return 7.0;
      case 'bus':
        return 6.8;
      case 'becak':
        return 3.2;
      case 'becakbarang':
        return 2.6;
      default:
        return 9;
    }
  }

  buildVehicle(kind, rand) {
    const color = pick(rand, VEHICLE_COLORS);
    switch (kind) {
      case 'motor':
        return { group: this.buildMotorcycle(false), length: 1.9 };
      case 'ojol':
        return { group: this.buildMotorcycle(true), length: 1.9 };
      case 'angkot':
        return { group: this.buildAngkot(pick(rand, ANGKOT_COLORS)), length: 2.6 };
      case 'bajaj':
        return { group: this.buildBajaj(), length: 1.8 };
      case 'pickup':
        return { group: this.buildPickup(color), length: 2.4 };
      case 'truk':
        return { group: this.buildTruck(color), length: 3.2 };
      case 'bus':
        return { group: this.buildBus(color), length: 3.8 };
      case 'becak':
        return { group: this.buildBecak(), length: 2.1 };
      case 'becakbarang':
        return { group: this.buildBecak(true), length: 2.3 };
      case 'delman':
        return { group: this.buildDelman(), length: 5.2 };
      case 'gerobak':
        return { group: this.buildPushCart('sayur'), length: 2.2 };
      case 'tukangsayur':
        return { group: this.buildPushCart('keliling'), length: 2.2 };
      case 'martabak':
        return { group: this.buildPushCart('martabak'), length: 2.4 };
      case 'sepeda':
        return { group: this.buildBicycle(), length: 1.9 };
      case 'vespa':
        return { group: this.buildScooter(), length: 1.8 };
      case 'elf':
        return { group: this.buildElf(color), length: 3.4 };
      case 'boxtruck':
        return { group: this.buildBoxTruck(color), length: 3.6 };
      default:
        return { group: this.buildSedan(color), length: 2.3 };
    }
  }

  addWheels(group, positions, radius = 0.27, width = 0.16, color = '#1f2937') {
    for (const [wx, wz] of positions) {
      this.cylinder(group, color, radius, width, wx, radius, wz, { rotX: Math.PI / 2, noShadow: true, roughness: 0.9 });
    }
  }

  buildMotorcycle(isOjol, parked = false) {
    const g = new THREE.Group();
    const jacket = isOjol ? '#16a34a' : pick(this.rng, SHIRT_COLORS);
    this.addWheels(g, [[0.58, 0], [-0.58, 0]], 0.23, 0.1);
    this.box(g, '#334155', 1.3, 0.1, 0.16, 0, 0.44, 0); // frame
    this.box(g, '#1f2937', 0.42, 0.18, 0.26, 0.16, 0.55, 0); // tank
    this.box(g, '#0f172a', 0.46, 0.1, 0.26, -0.3, 0.62, 0); // saddle
    this.box(g, '#475569', 0.06, 0.36, 0.06, 0.56, 0.66, 0); // fork
    this.box(g, '#475569', 0.06, 0.06, 0.5, 0.58, 0.84, 0); // handlebar
    if (!parked) {
      this.box(g, jacket, 0.32, 0.46, 0.32, -0.14, 0.94, 0); // rider
      this.sphere(g, pick(this.rng, SKIN_TONES), 0.135, -0.1, 1.24, 0, { lowPoly: true });
      this.box(g, isOjol ? '#15803d' : '#0f172a', 0.26, 0.18, 0.28, -0.1, 1.36, 0); // helmet
      if (isOjol) this.box(g, '#22c55e', 0.4, 0.4, 0.36, -0.66, 0.88, 0); // delivery box
    }
    return g;
  }

  buildAngkot(color) {
    const g = new THREE.Group();
    this.addWheels(g, [[0.85, 0.45], [0.85, -0.45], [-0.85, 0.45], [-0.85, -0.45]], 0.3);
    this.box(g, color, 2.5, 0.85, 0.98, 0, 0.8, 0);
    this.box(g, '#e2e8f0', 1.9, 0.34, 1.0, 0.05, 1.14, 0);
    this.box(g, '#f8fafc', 2.52, 0.16, 1.0, 0, 1.34, 0);
    this.box(g, '#0f172a', 0.1, 0.3, 0.9, 1.2, 0.85, 0);
    this.box(g, '#facc15', 0.9, 0.22, 0.22, -0.2, 1.5, 0);
    return g;
  }

  buildBajaj() {
    const g = new THREE.Group();
    this.addWheels(g, [[0.7, 0]], 0.26);
    this.addWheels(g, [[-0.55, 0.52], [-0.55, -0.52]], 0.26);
    this.box(g, '#ea580c', 1.15, 0.8, 0.92, 0, 0.75, 0);
    this.box(g, '#1f2937', 0.72, 0.42, 0.94, 0.2, 1.1, 0);
    this.box(g, '#f97316', 1.25, 0.1, 1.0, 0, 1.42, 0);
    return g;
  }

  buildSedan(color) {
    const g = new THREE.Group();
    this.addWheels(g, [[0.72, 0.48], [0.72, -0.48], [-0.72, 0.48], [-0.72, -0.48]], 0.26);
    this.box(g, color, 2.1, 0.5, 0.92, 0, 0.6, 0);
    this.box(g, '#dbeafe', 1.1, 0.44, 0.84, -0.1, 1.02, 0);
    this.box(g, color, 1.14, 0.16, 0.86, -0.1, 1.26, 0);
    return g;
  }

  buildPickup(color) {
    const g = new THREE.Group();
    this.addWheels(g, [[0.8, 0.46], [0.8, -0.46], [-0.8, 0.46], [-0.8, -0.46]], 0.27);
    this.box(g, color, 2.35, 0.42, 0.96, 0, 0.62, 0);
    this.box(g, '#dbeafe', 0.8, 0.5, 0.9, 0.6, 1.05, 0);
    this.box(g, color, 1.1, 0.34, 0.9, -0.5, 0.95, 0);
    this.box(g, '#a16207', 0.32, 0.3, 0.32, -0.55, 1.24, 0.2);
    this.box(g, '#a16207', 0.32, 0.3, 0.32, -0.35, 1.24, -0.2);
    return g;
  }

  buildTruck(color) {
    const g = new THREE.Group();
    this.addWheels(g, [[0.95, 0.5], [0.95, -0.5], [-0.85, 0.5], [-0.85, -0.5], [-1.35, 0.5], [-1.35, -0.5]], 0.31);
    this.box(g, color, 1.0, 0.85, 1.02, 0.95, 0.85, 0);
    this.box(g, '#dbeafe', 0.62, 0.42, 0.96, 1.12, 1.2, 0);
    this.box(g, '#e2e8f0', 1.85, 1.15, 1.05, -0.55, 1.12, 0);
    this.box(g, '#94a3b8', 1.9, 0.1, 1.08, -0.55, 1.72, 0);
    return g;
  }

  buildBus(color) {
    const g = new THREE.Group();
    this.addWheels(g, [[1.3, 0.52], [1.3, -0.52], [-1.3, 0.52], [-1.3, -0.52]], 0.33);
    this.box(g, color, 3.8, 1.15, 1.08, 0, 1.0, 0);
    this.box(g, '#e0f2fe', 3.1, 0.5, 1.1, 0, 1.32, 0);
    this.box(g, '#f8fafc', 3.82, 0.2, 1.1, 0, 1.62, 0);
    this.box(g, '#0f172a', 0.12, 0.7, 0.95, 1.89, 1.05, 0);
    return g;
  }

  buildDelman() {
    const g = new THREE.Group();
    // horse
    const horse = new THREE.Group();
    this.box(horse, '#8b5e34', 1.5, 0.62, 0.55, 0, 1.0, 0);
    this.box(horse, '#7c5228', 0.42, 0.5, 0.44, 0.72, 1.36, 0, { rotZ: -0.35 });
    this.box(horse, '#6b4423', 0.3, 0.3, 0.34, 0.95, 1.58, 0);
    for (const wz of [-0.2, 0.2]) {
      this.box(horse, '#6b4423', 0.12, 0.72, 0.12, 0.6, 0.36, wz);
      this.box(horse, '#6b4423', 0.12, 0.72, 0.12, -0.55, 0.36, wz);
    }
    this.box(horse, '#4b2e14', 0.16, 0.5, 0.16, -0.78, 1.1, 0, { rotZ: 0.5 });
    g.add(horse);
    // cart
    this.addWheels(g, [[0.2, 0.52], [0.2, -0.52]], 0.34, 0.1, '#5b4636');
    this.box(g, '#b45309', 1.5, 0.18, 1.05, -0.85, 0.72, 0);
    this.box(g, '#92400e', 1.5, 0.3, 0.1, -0.85, 0.9, 0.5);
    this.box(g, '#92400e', 1.5, 0.3, 0.1, -0.85, 0.9, -0.5);
    this.box(g, '#facc15', 1.7, 0.1, 1.15, -0.85, 1.95, 0);
    for (const px of [-1.6, -0.1]) {
      for (const pz of [-0.48, 0.48]) this.box(g, '#78350f', 0.07, 1.2, 0.07, px, 1.35, pz);
    }
    this.box(g, pick(this.rng, SHIRT_COLORS), 0.32, 0.44, 0.32, -0.5, 1.05, 0);
    this.sphere(g, pick(this.rng, SKIN_TONES), 0.13, -0.5, 1.34, 0, { lowPoly: true });
    this.box(g, '#eab308', 0.34, 0.12, 0.34, -0.5, 1.48, 0); // caping
    return g;
  }

  buildPushCart(kind) {
    const g = new THREE.Group();
    // gerobak (cart body) + pushcart wheels
    this.box(g, '#a16207', 1.35, 0.62, 0.85, -0.2, 0.62, 0);
    this.box(g, '#f5f5f4', 1.38, 0.08, 0.88, -0.2, 0.95, 0);
    for (const wz of [-0.44, 0.44]) this.cylinder(g, '#1f2937', 0.26, 0.12, -0.15, 0.26, wz, { rotX: Math.PI / 2 });
    this.box(g, '#52525b', 0.06, 0.06, 0.62, 0.75, 0.72, 0);
    if (kind === 'sayur') {
      // vegetables piled on the cart
      const veg = ['#16a34a', '#65a30d', '#f97316', '#dc2626', '#22d3ee'];
      for (let i = 0; i < 8; i++) {
        this.sphere(g, veg[i % veg.length], 0.13, -0.6 + (i % 4) * 0.34, 1.02 + (i > 3 ? 0.1 : 0), (i % 2 ? 0.18 : -0.18), { lowPoly: true, noShadow: true });
      }
    } else if (kind === 'martabak') {
      this.box(g, '#e7e5e4', 0.9, 0.1, 0.7, -0.2, 1.02, 0); // griddle
      this.cylinder(g, '#7c2d12', 0.22, 0.16, 0.3, 1.05, 0.2);
      const ember = this.box(g, '#f97316', 0.5, 0.06, 0.5, -0.2, 0.99, 0, { emissive: '#f97316', emissiveIntensity: 0.7 });
      this.addAnim('flicker', ember, { speed: 5 });
      this.box(g, '#fbbf24', 1.4, 0.08, 0.9, -0.2, 2.0, 0); // canopy
      for (const px of [-0.85, 0.45]) {
        for (const pz of [-0.4, 0.4]) this.box(g, '#78716c', 0.06, 1.0, 0.06, px, 1.5, pz);
      }
    } else {
      this.box(g, '#22c55e', 1.1, 0.3, 0.7, -0.2, 1.08, 0); // baskets of greens
    }
    // the vendor pushing it
    this.box(g, pick(this.rng, SHIRT_COLORS), 0.3, 0.46, 0.3, 0.98, 0.95, 0);
    this.sphere(g, pick(this.rng, SKIN_TONES), 0.13, 0.98, 1.24, 0, { lowPoly: true });
    this.box(g, pick(this.rng, ['#0f172a', '#eab308', '#f8fafc']), 0.28, 0.14, 0.3, 0.98, 1.36, 0);
    return g;
  }

  buildBicycle() {
    const g = new THREE.Group();
    this.addWheels(g, [[0.55, 0], [-0.55, 0]], 0.3, 0.06, '#1f2937');
    this.box(g, '#38bdf8', 0.9, 0.06, 0.08, 0, 0.55, 0);
    this.box(g, '#38bdf8', 0.07, 0.42, 0.07, 0.45, 0.72, 0, { rotZ: -0.2 });
    this.box(g, '#334155', 0.05, 0.05, 0.42, 0.55, 0.95, 0);
    this.box(g, '#1e293b', 0.3, 0.08, 0.24, -0.35, 0.72, 0);
    this.box(g, pick(this.rng, SHIRT_COLORS), 0.3, 0.44, 0.3, -0.25, 1.0, 0);
    this.sphere(g, pick(this.rng, SKIN_TONES), 0.13, -0.2, 1.3, 0, { lowPoly: true });
    this.box(g, '#f8fafc', 0.26, 0.14, 0.28, -0.2, 1.42, 0);
    return g;
  }

  buildScooter() {
    const g = new THREE.Group();
    const body = pick(this.rng, ['#f8fafc', '#0ea5e9', '#ef4444', '#a855f7', '#22c55e']);
    this.addWheels(g, [[0.6, 0], [-0.55, 0]], 0.22, 0.12);
    this.box(g, body, 0.95, 0.4, 0.36, -0.05, 0.5, 0); // vespa-ish body
    this.box(g, body, 0.5, 0.3, 0.34, 0.35, 0.72, 0);
    this.box(g, '#0f172a', 0.42, 0.1, 0.3, -0.3, 0.74, 0);
    this.box(g, '#94a3b8', 0.05, 0.3, 0.05, 0.55, 0.9, 0);
    this.box(g, '#94a3b8', 0.05, 0.05, 0.55, 0.58, 1.02, 0);
    this.box(g, pick(this.rng, SHIRT_COLORS), 0.3, 0.44, 0.3, -0.15, 0.98, 0);
    this.sphere(g, pick(this.rng, SKIN_TONES), 0.13, -0.1, 1.28, 0, { lowPoly: true });
    this.box(g, '#f8fafc', 0.28, 0.2, 0.3, -0.1, 1.42, 0);
    return g;
  }

  buildElf(color) {
    const g = new THREE.Group();
    this.addWheels(g, [[1.1, 0.5], [1.1, -0.5], [-1.1, 0.5], [-1.1, -0.5]], 0.27);
    this.box(g, color, 3.1, 1.05, 1.0, 0, 0.92, 0);
    this.box(g, '#e0f2fe', 2.6, 0.4, 1.02, -0.1, 1.18, 0);
    this.box(g, '#f8fafc', 3.12, 0.16, 1.02, 0, 1.44, 0);
    this.box(g, '#dbeafe', 0.5, 0.52, 0.98, 1.5, 1.02, 0);
    this.box(g, '#0f172a', 0.06, 0.24, 0.8, 1.55, 1.2, 0);
    this.box(g, '#1f2937', 0.9, 0.16, 0.98, -1.4, 0.64, 0);
    return g;
  }

  buildBoxTruck(color) {
    const g = new THREE.Group();
    this.addWheels(g, [[1.2, 0.52], [1.2, -0.52], [-1.2, 0.52], [-1.2, -0.52]], 0.3);
    this.box(g, color, 1.1, 0.9, 1.02, 1.15, 0.88, 0);
    this.box(g, '#dbeafe', 0.66, 0.44, 0.96, 1.3, 1.24, 0);
    this.box(g, '#f1f5f9', 2.5, 1.5, 1.12, -0.55, 1.3, 0); // box body
    this.box(g, '#cbd5e1', 2.52, 0.1, 1.14, -0.55, 2.08, 0);
    this.box(g, '#ef4444', 0.08, 0.34, 0.8, -1.78, 1.36, 0);
    return g;
  }

  buildBecak(withCargo = false) {
    const g = new THREE.Group();
    const color = pick(this.rng, ['#dc2626', '#16a34a', '#2563eb']);
    this.addWheels(g, [[0.6, 0]], 0.24);
    this.addWheels(g, [[-0.45, 0.52], [-0.45, -0.52]], 0.24);
    this.box(g, color, 0.95, 0.5, 0.95, -0.5, 0.62, 0);
    this.box(g, '#fef3c7', 0.75, 0.55, 0.8, -0.55, 0.95, 0);
    this.box(g, '#0f172a', 0.9, 0.08, 0.98, -0.5, 1.22, 0);
    this.box(g, '#334155', 0.5, 0.08, 0.1, 0.3, 0.95, 0);
    if (withCargo) {
      // becak barang: cardboard boxes & sacks piled on the passenger seat
      this.box(g, '#c8a165', 0.7, 0.5, 0.7, -0.55, 1.28, 0);
      this.box(g, '#a16207', 0.55, 0.36, 0.55, -0.5, 1.7, 0.1, { rotY: 0.4 });
      this.box(g, '#78716c', 0.5, 0.24, 0.5, -0.62, 1.12, -0.28, { rotY: -0.3 });
    }
    this.box(g, pick(this.rng, SHIRT_COLORS), 0.3, 0.45, 0.3, 0.5, 0.85, 0);
    this.sphere(g, pick(this.rng, SKIN_TONES), 0.13, 0.5, 1.14, 0, { lowPoly: true });
    return g;
  }

  laneSlotFree(lane, pos, self, extra = 2.2) {
    return !lane.vehicles.some((other) => {
      if (other === self || !other.active) return false;
      return Math.abs(other.pos - pos) < (other.length + self.length) / 2 + extra;
    });
  }

  spawnVehicle(vehicle) {
    const lane = vehicle.lane;
    const entry = lane.dir > 0 ? -ROAD_END - between(this.rng, 0, 8) : ROAD_END + between(this.rng, 0, 8);
    // Pick the first entry slot that is not already taken by another vehicle.
    let chosen = entry;
    for (let attempt = 0; attempt < 14; attempt++) {
      const candidate = lane.dir > 0 ? entry - attempt * 4.5 : entry + attempt * 4.5;
      if (this.laneSlotFree(lane, candidate, vehicle, 2.4)) {
        chosen = candidate;
        break;
      }
    }
    vehicle.pos = chosen;
    vehicle.speed = vehicle.baseSpeed;
    vehicle.active = true;
    vehicle.retiring = false;
    vehicle.waitingToWrap = false;
    vehicle.gap = Infinity;
    vehicle.group.visible = true;
    this.placeVehicle(vehicle);
  }

  placeVehicle(vehicle) {
    const lane = vehicle.lane;
    if (lane.axis === 'x') {
      vehicle.group.position.set(vehicle.pos, lane.y, lane.coord);
      vehicle.group.rotation.y = lane.dir > 0 ? 0 : Math.PI;
    } else {
      vehicle.group.position.set(lane.coord, lane.y, vehicle.pos);
      vehicle.group.rotation.y = lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
  }

  /* ============================================================== WALKERS */

  /** Ground-level occupancy test for pedestrians: other props, trees, lamps,
      monuments, buildings and fellow walkers. */
  /** Is (x, z) inside a prop (bin, pole, warung, tree…)? */
  blockedByProp(x, z, radius) {
    for (const b of this.blockers) {
      if (b.walkable) continue; // open shelters: people walk underneath
      if (b.h !== undefined && b.h < 0.35) continue;
      const dx = x - b.x;
      const dz = z - b.z;
      const min = radius + (b.physR ?? b.r);
      if (dx * dx + dz * dz < min * min) return true;
    }
    return false;
  }

  walkBlocked(x, z, self, radius) {
    if (this.blockedByProp(x, z, radius)) return true;
    for (const other of this.walkers) {
      if (other === self || !other.group.visible) continue;
      const dx = x - other.group.position.x;
      const dz = z - other.group.position.z;
      const min = radius + 0.52;
      if (dx * dx + dz * dz < min * min) return true;
    }
    return false;
  }

  buildWalkers() {
    const rand = this.rng;
    const baseRoles = [
      'warga',
      'ibu',
      'anak',
      'ojol',
      'satpam',
      'petugas',
      'pedagang',
      'kurir',
      'jogging',
      'fotografer',
      'pasangan',
      'tukangparkir',
      'pengamen',
      'penjualkoran',
      'tukangbangunan',
      'nenek',
      'polisi',
      'tukangpos',
      'tukangsayur',
      'anaksekolah',
    ];
    // Shuffle the pool with the match seed, then keep only part of it, so every
    // match shows its own mix of professions (some appear twice, others not at
    // all) instead of the same full roster in an infinite loop.
    for (let i = baseRoles.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [baseRoles[i], baseRoles[j]] = [baseRoles[j], baseRoles[i]];
    }
    const rosterCount = 11 + Math.floor(rand() * 5); // 11..15 professions per match
    const roles = baseRoles.slice(0, Math.min(rosterCount, baseRoles.length));
    // Every match needs someone who is still out at 2 pagi, otherwise the city
    // would look abandoned in the small hours.
    const nightShift = ['satpam', 'ojol', 'polisi', 'pengamen'];
    if (!roles.some((r) => nightShift.includes(r))) roles[roles.length - 1] = 'satpam';
    const maxWalkers = Math.max(8, Math.round(ACTIVITY_LEVELS.ramai.walkers * 1.7));
    // Who strolls the park footpath and who walks along the shop fronts.
    const parkSlots = [];
    const pavementSlots = [];
    for (let i = 0; i < maxWalkers; i++) {
      const role = roles[i % roles.length];
      if (role === 'fotografer' || i % 3 !== 0) parkSlots.push(i);
      else pavementSlots.push(i);
    }
    let parkIndex = 0;
    let pavementIndex = 0;

    for (let i = 0; i < maxWalkers; i++) {
      const role = roles[i % roles.length];
      const isPark = role === 'fotografer' || i % 3 !== 0;
      const half = isPark ? PARK_HALF : WALK_SIDEWALK_HALF;
      const lateralLimit = isPark ? 0.75 : 0.62;
      const lateral = isPark ? between(rand, -0.75, 0.75) : between(rand, -0.5, 0.5);

      // Park walkers roam the promenade ring; pavement walkers patrol one shop front.
      const slot = isPark ? parkIndex++ : pavementIndex++;
      const slotCount = isPark ? parkSlots.length : pavementSlots.length;
      const perimeter = 8 * half;
      const segIndex = slot % 8;
      const patrolAxis = segIndex % 2 === 0 ? 'x' : 'z';
      const patrolSign = segIndex < 4 ? 1 : -1;
      const patrolFixed = patrolSign * WALK_SIDEWALK_HALF;
      const patrolEnd = (segIndex % 4) < 2 ? 1 : -1;
      const patrolRange = [
        patrolEnd > 0 ? PAVEMENT_SPAN[0] : -PAVEMENT_SPAN[1],
        patrolEnd > 0 ? PAVEMENT_SPAN[1] : -PAVEMENT_SPAN[0],
      ];

      // Spawn clear of every prop AND of the neighbours already standing there:
      // nudge along the route until the spot is free.
      let startT = (slot / Math.max(1, slotCount)) * perimeter + between(rand, -0.6, 0.6);
      let startU = between(rand, patrolRange[0] + 1.5, patrolRange[1] - 1.5);
      const radius = 0.3;
      const spotFree = (px, pz) => {
        if (this.blockedByProp(px, pz, radius + 0.12)) return false;
        for (const other of this.walkers) {
          const dx = px - other.group.position.x;
          const dz = pz - other.group.position.z;
          if (dx * dx + dz * dz < 0.72 * 0.72) return false;
        }
        return true;
      };
      let spot = null;
      for (let attempt = 0; attempt < 40; attempt++) {
        const probe = isPark ? ringPosition(half, startT, lateral) : this.patrolPosition({
          patrolAxis,
          patrolFixed,
          lateral,
          dir: 1,
          patrolRange,
        }, startU);
        if (spotFree(probe.x, probe.z)) {
          spot = probe;
          break;
        }
        if (isPark) startT += 1.6;
        else startU = patrolRange[0] + ((startU - patrolRange[0] + 2.2) % (patrolRange[1] - patrolRange[0]));
      }
      if (!spot) {
        spot = isPark ? ringPosition(half, startT, lateral) : this.patrolPosition({
          patrolAxis,
          patrolFixed,
          lateral,
          dir: 1,
          patrolRange,
        }, startU);
      }

      const { group, legs, scale: personScale } = this.buildPerson(role, rand);
      group.visible = false;
      group.scale.setScalar(0.001);
      group.position.set(spot.x, 0.09, spot.z);
      this.group.add(group);

      const base = {
        group,
        legs,
        role,
        baseScale: personScale,
        half,
        lateral,
        lateralLimit,
        scale: 0.001,
        targetScale: 0,
        bobPhase: rand() * Math.PI * 2,
        wait: 0,
        blockedFor: 0,
        sideStep: rand() > 0.5 ? 0.55 : -0.55,
        dir: rand() > 0.5 ? 1 : -1,
      };

      if (role === 'fotografer') {
        this.walkers.push({
          ...base,
          mode: 'idle',
          patrol: false,
          t: startT,
          speed: 0.35,
          pause: between(rand, 0, 3),
        });
        continue;
      }

      this.walkers.push({
        ...base,
        mode: 'path',
        patrol: !isPark,
        t: startT,
        u: startU,
        patrolAxis,
        patrolFixed,
        patrolRange,
        speed: between(rand, 0.9, 1.7) * (role === 'anak' ? 1.2 : 1),
        pause: between(rand, 0, 2.5),
      });
    }
  }

  buildPerson(role, rand) {
    const g = new THREE.Group();
    const legs = [];
    const skin = pick(rand, SKIN_TONES);
    let shirt = pick(rand, SHIRT_COLORS);
    let pants = '#1f2937';
    let scale = 1;

    switch (role) {
      case 'ibu':
        shirt = pick(rand, ['#f472b6', '#fbbf24', '#a855f7', '#34d399']);
        break;
      case 'anak':
        shirt = pick(rand, ['#f8fafc', '#38bdf8', '#facc15']);
        scale = 0.74;
        break;
      case 'ojol':
        shirt = '#16a34a';
        break;
      case 'satpam':
        shirt = '#1e3a8a';
        pants = '#1e293b';
        break;
      case 'petugas':
        shirt = '#f97316';
        pants = '#334155';
        break;
      case 'pedagang':
        shirt = '#a16207';
        break;
      case 'kurir':
        shirt = '#dc2626';
        break;
      case 'jogging':
        shirt = '#22d3ee';
        pants = '#0f172a';
        break;
      case 'fotografer':
        shirt = '#fbbf24';
        break;
      case 'tukangparkir':
        shirt = '#ea580c';
        pants = '#1e293b';
        break;
      case 'pengamen':
        shirt = '#7c3aed';
        break;
      case 'penjualkoran':
        shirt = '#0ea5e9';
        break;
      case 'tukangbangunan':
        shirt = '#f59e0b';
        pants = '#57534e';
        break;
      case 'nenek':
        shirt = '#a78bfa';
        pants = '#3f3f46';
        scale = 0.92;
        break;
      case 'polisi':
        shirt = '#1c4ed8';
        pants = '#1e293b';
        break;
      case 'tukangpos':
        shirt = '#f97316';
        pants = '#1e3a8a';
        break;
      case 'tukangsayur':
        shirt = '#65a30d';
        break;
      case 'anaksekolah':
        shirt = '#f8fafc';
        pants = '#1d4ed8';
        scale = 0.76;
        break;
      default:
        break;
    }

    // Legs (animated while walking)
    for (const lz of [-0.1, 0.1]) {
      const leg = this.box(g, pants, 0.16, 0.56, 0.16, 0, 0.28, lz);
      legs.push(leg);
    }
    // Body + head
    this.box(g, shirt, 0.36, 0.5, 0.28, 0, 0.82, 0);
    this.sphere(g, skin, 0.145, 0, 1.2, 0, { lowPoly: true });
    // Arms
    const armL = this.box(g, shirt, 0.1, 0.44, 0.1, 0, 0.84, 0.21);
    const armR = this.box(g, shirt, 0.1, 0.44, 0.1, 0, 0.84, -0.21);

    switch (role) {
      case 'ibu':
        this.box(g, '#0f172a', 0.34, 0.18, 0.3, 0, 1.3, 0);
        this.box(g, '#e11d48', 0.26, 0.3, 0.2, 0.24, 0.66, 0.16);
        break;
      case 'anak':
        this.box(g, '#f59e0b', 0.3, 0.34, 0.18, -0.22, 0.86, 0);
        break;
      case 'ojol':
        this.box(g, '#15803d', 0.3, 0.18, 0.28, 0, 1.32, 0);
        this.box(g, '#22c55e', 0.3, 0.32, 0.24, -0.24, 0.9, 0);
        break;
      case 'satpam':
        this.box(g, '#0f172a', 0.32, 0.12, 0.3, 0, 1.32, 0);
        this.box(g, '#facc15', 0.08, 0.2, 0.08, 0.16, 0.92, 0.16);
        break;
      case 'petugas':
        this.box(g, '#fef08a', 0.38, 0.26, 0.3, 0, 0.9, 0);
        this.box(g, '#78350f', 0.05, 0.9, 0.05, 0.26, 0.75, 0);
        this.box(g, '#a16207', 0.3, 0.06, 0.34, 0.26, 0.32, 0);
        break;
      case 'pedagang':
        this.box(g, '#78716c', 0.5, 0.12, 0.34, 0, 1.42, 0);
        this.box(g, '#65a30d', 0.18, 0.14, 0.24, 0.06, 1.56, 0);
        break;
      case 'kurir':
        this.box(g, '#f8fafc', 0.34, 0.3, 0.3, 0.3, 0.9, 0);
        break;
      case 'jogging':
        armL.rotation.z = 0.6;
        armR.rotation.z = -0.6;
        break;
      case 'fotografer':
        this.box(g, '#0f172a', 0.16, 0.12, 0.12, 0.26, 0.98, 0);
        break;
      case 'tukangparkir':
        // high-vis vest + whistle hand, waving traffic into a parking spot
        this.box(g, '#fef08a', 0.38, 0.24, 0.3, 0, 0.9, 0);
        this.box(g, '#f8fafc', 0.09, 0.09, 0.09, 0.02, 1.3, 0.14);
        armR.rotation.z = -0.9;
        break;
      case 'pengamen':
        // street busker with an acoustic guitar
        this.box(g, '#a16207', 0.1, 0.6, 0.36, 0.24, 0.86, 0.02, { rotZ: 0.32 });
        this.box(g, '#3f2a12', 0.34, 0.1, 0.42, 0.34, 0.6, 0.02);
        this.sphere(g, '#f8fafc', 0.11, 0.42, 0.94, 0.02, { lowPoly: true, noShadow: true });
        armL.rotation.z = 0.7;
        break;
      case 'penjualkoran':
        this.box(g, '#f1f5f9', 0.34, 0.16, 0.24, 0.2, 0.98, 0);
        this.box(g, '#cbd5e1', 0.34, 0.04, 0.24, 0.2, 1.07, 0);
        break;
      case 'tukangbangunan':
        // yellow hard hat + a sack of cement on the shoulder
        this.box(g, '#facc15', 0.34, 0.16, 0.34, 0, 1.34, 0);
        this.box(g, '#e7e5e4', 0.3, 0.26, 0.24, -0.26, 1.12, 0);
        armL.rotation.z = 0.5;
        break;
      case 'nenek':
        // headscarf, walking stick, shopping bag
        this.box(g, '#fdf2f8', 0.4, 0.24, 0.32, 0, 1.26, 0);
        this.box(g, '#92400e', 0.05, 0.9, 0.05, 0.26, 0.48, 0.1);
        this.box(g, '#dc2626', 0.22, 0.28, 0.16, -0.26, 0.55, 0.12);
        break;
      case 'polisi':
        // traffic police: white cap, reflective vest, whistle arm up
        this.box(g, '#f8fafc', 0.34, 0.12, 0.34, 0, 1.34, 0);
        this.box(g, '#fef08a', 0.4, 0.28, 0.32, 0, 0.9, 0);
        this.box(g, '#f8fafc', 0.09, 0.09, 0.09, 0.02, 1.3, 0.16);
        armR.rotation.z = -1.15;
        break;
      case 'tukangpos':
        // postal bag across the body
        this.box(g, '#1d4ed8', 0.26, 0.36, 0.18, -0.24, 0.78, 0.06);
        this.box(g, '#f8fafc', 0.3, 0.12, 0.22, 0.05, 1.0, 0.16);
        break;
      case 'tukangsayur':
        // bamboo pikulan (shoulder pole) with two baskets
        this.box(g, '#a16207', 0.06, 0.06, 1.5, 0.16, 1.28, 0);
        this.box(g, '#78716c', 0.3, 0.24, 0.3, 0.16, 1.06, 0.68);
        this.box(g, '#78716c', 0.3, 0.24, 0.3, 0.16, 1.06, -0.68);
        this.sphere(g, '#16a34a', 0.18, 0.16, 1.18, 0.68, { lowPoly: true, noShadow: true });
        this.sphere(g, '#65a30d', 0.18, 0.16, 1.18, -0.68, { lowPoly: true, noShadow: true });
        armR.rotation.z = -1.4;
        break;
      case 'anaksekolah':
        // school uniform with a backpack
        this.box(g, '#dc2626', 0.3, 0.3, 0.18, -0.24, 0.9, 0);
        this.box(g, '#1d4ed8', 0.3, 0.12, 0.2, 0.02, 1.24, 0.1);
        break;
      default:
        break;
    }

    return { group: g, legs, scale };
  }

  /* ================================================================ STALLS */

  buildStalls() {
    const rand = this.rng;
    const kinds = [
      'warung',
      'bakso',
      'gorengan',
      'es',
      'balon',
      'sate',
      'bensin',
      'halte',
      'martabak',
      'cilok',
      'tahubulat',
      'kelapa',
      'jagung',
      'siomay',
      'tukangcendol',
    ];
    const maxStalls = kinds.length; // every stall is pre-built, opened per mood
    // Anchored to match `kinds` order: kaki-lima around the park footpath,
    // and the halte on the shop-front pavement next to the asphalt.
    const anchors = [
      [24.6, 9],
      [24.6, -9],
      [-24.6, 9],
      [-24.6, -9],
      [9, 24.6],
      [-9, 24.6],
      [26.6, 21.5],
      [37.2, -20],
      [-26.6, -21.5],
      [21.5, -26.6],
      [-21.5, 26.6],
      [26.6, -21.5],
      [-26.6, 21.5],
      [20.5, 26.8],
      [-20.5, -26.8],
    ];
    for (let i = 0; i < maxStalls; i++) {
      const kind = kinds[i % kinds.length];
      const [ax, az] = anchors[i % anchors.length];
      const group = this.buildStall(kind, rand);
      group.visible = false;
      group.scale.setScalar(0.001);
      this.group.add(group);
      const STALL_FOOTPRINT = {
        warung: 1.9,
        bakso: 1.1,
        gorengan: 1.3,
        es: 1.5,
        balon: 1.0,
        sate: 1.7,
        bensin: 1.1,
        halte: 2.3,
        martabak: 1.7,
        cilok: 1.1,
        tahubulat: 1.2,
        kelapa: 1.3,
        jagung: 1.4,
        siomay: 1.2,
        tukangcendol: 1.3,
      };
      const foot = STALL_FOOTPRINT[kind] ?? 1.3;
      this.placeProp(group, ax, az, foot, 2.8, {
        physR: Math.max(0.6, foot - 0.25),
        walkable: kind === 'halte', // pedestrians pass under the shelter roof
      });
      this.stalls.push({
        group,
        kind,
        scale: 0.001,
        targetScale: 0,
        anchor: [ax, az],
        order: rand(),
        permanent: kind === 'halte',
        footRadius: Math.max(0.6, foot - 0.25),
      });
    }
  }

  buildStall(kind, rand) {
    const g = new THREE.Group();
    switch (kind) {
      case 'warung': {
        const tarp = pick(rand, ['#f97316', '#0ea5e9', '#dc2626']);
        this.box(g, tarp, 3.2, 0.1, 2.2, 0, 2.25, 0);
        for (const px of [-1.5, 1.5]) {
          for (const pz of [-1.0, 1.0]) this.box(g, '#7c2d12', 0.09, 2.2, 0.09, px, 1.1, pz);
        }
        this.box(g, '#a16207', 2.4, 0.16, 1.0, 0, 0.86, 0.2);
        this.box(g, '#fef3c7', 0.3, 0.22, 0.3, -0.5, 1.05, 0.2);
        this.box(g, '#ef4444', 0.26, 0.2, 0.26, 0.1, 1.04, 0.2);
        for (const sx of [-0.9, 0.9]) this.box(g, '#b45309', 0.4, 0.44, 0.4, sx, 0.22, -0.9);
        const vendor = this.buildPerson('pedagang', rand).group;
        vendor.position.set(0.9, 0, 0.55);
        vendor.rotation.y = Math.PI;
        g.add(vendor);
        break;
      }
      case 'bakso': {
        this.box(g, '#e2e8f0', 1.4, 0.7, 0.8, 0, 0.7, 0);
        this.box(g, '#b91c1c', 1.42, 0.12, 0.82, 0, 1.05, 0);
        this.cylinder(g, '#94a3b8', 0.28, 0.3, 0.2, 1.1, 0);
        this.cylinder(g, '#cbd5e1', 0.24, 0.06, 0.2, 1.27, 0);
        for (const wx of [-0.45, 0.45]) this.cylinder(g, '#1f2937', 0.26, 0.12, wx, 0.26, 0.34, { rotX: Math.PI / 2 });
        for (let i = 0; i < 3; i++) {
          const puff = this.sphere(g, '#f8fafc', 0.16, 0.2, 1.3 + i * 0.22, 0, { noShadow: true, transparent: true, opacity: 0.55 });
          this.addAnim('puff', puff, { baseY: puff.position.y, phase: i * 0.9, speed: 1.1 });
        }
        break;
      }
      case 'gorengan': {
        this.box(g, '#a16207', 1.8, 0.75, 0.9, 0, 0.7, 0);
        this.box(g, '#fbbf24', 1.9, 0.1, 1.0, 0, 1.1, 0);
        this.cylinder(g, '#374151', 0.3, 0.24, 0.4, 1.0, 0);
        const vendor = this.buildPerson('pedagang', rand).group;
        vendor.position.set(-0.5, 0, 0.6);
        vendor.rotation.y = Math.PI;
        g.add(vendor);
        break;
      }
      case 'es': {
        this.box(g, '#f8fafc', 1.4, 0.8, 0.9, 0, 0.72, 0);
        this.box(g, '#0ea5e9', 1.42, 0.14, 0.92, 0, 1.14, 0);
        this.cylinder(g, '#94a3b8', 0.04, 2.2, 0, 1.5, 0);
        const umbrella = this.cone(g, pick(rand, ['#ef4444', '#22c55e', '#a855f7']), 1.35, 0.55, 0, 2.6, 0);
        this.addAnim('spin', umbrella, { speed: 0.35 });
        break;
      }
      case 'balon': {
        this.box(g, '#a16207', 0.6, 0.9, 0.5, 0, 0.45, 0);
        const colors = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ec4899', '#f97316'];
        for (let i = 0; i < 6; i++) {
          const balloon = this.sphere(g, colors[i], 0.22, (i - 2.5) * 0.24, 2.0 + (i % 3) * 0.28, (i % 2 ? 1 : -1) * 0.16, { noShadow: true });
          this.box(g, '#64748b', 0.012, 1.1, 0.012, (i - 2.5) * 0.24, 1.45 + (i % 3) * 0.14, (i % 2 ? 1 : -1) * 0.16, { noShadow: true });
          this.addAnim('bob', balloon, { baseY: balloon.position.y, phase: i * 0.8, speed: 1.4, amp: 0.08 });
        }
        break;
      }
      case 'sate': {
        this.box(g, '#7c2d12', 2.0, 0.6, 0.8, 0, 0.6, 0);
        this.box(g, '#1f2937', 1.4, 0.16, 0.5, 0, 1.0, 0);
        const ember = this.box(g, '#f97316', 1.2, 0.08, 0.4, 0, 1.02, 0, { emissive: '#f97316', emissiveIntensity: 0.8 });
        this.addAnim('flicker', ember, { speed: 6 });
        for (let i = 0; i < 3; i++) {
          const puff = this.sphere(g, '#e2e8f0', 0.18, 0, 1.25 + i * 0.25, 0, { noShadow: true, transparent: true, opacity: 0.45 });
          this.addAnim('puff', puff, { baseY: puff.position.y, phase: i, speed: 0.9 });
        }
        const vendor = this.buildPerson('pedagang', rand).group;
        vendor.position.set(-1.2, 0, 0.3);
        vendor.rotation.y = Math.PI / 2;
        g.add(vendor);
        break;
      }
      case 'bensin': {
        this.box(g, '#7c2d12', 1.6, 0.8, 0.5, 0, 0.4, 0);
        for (let i = 0; i < 6; i++) {
          this.cylinder(g, i % 2 ? '#f59e0b' : '#fbbf24', 0.11, 0.5, -0.55 + (i % 3) * 0.55, 1.05, (i > 2 ? 0.28 : -0.28));
        }
        this.box(g, '#f8fafc', 0.7, 0.4, 0.06, 0, 1.5, -0.2);
        break;
      }
      case 'martabak': {
        // martabak manis cart with a hot plate and striped canopy
        this.box(g, '#a16207', 1.6, 0.7, 0.9, 0, 0.62, 0);
        this.box(g, '#78716c', 1.5, 0.08, 0.8, 0, 1.02, 0);
        this.cylinder(g, '#facc15', 0.16, 0.1, 0.5, 1.12, 0.2);
        const ember = this.box(g, '#f97316', 0.9, 0.06, 0.5, -0.2, 1.04, 0, { emissive: '#f97316', emissiveIntensity: 0.7 });
        this.addAnim('flicker', ember, { speed: 5 });
        this.box(g, '#dc2626', 1.9, 0.1, 1.2, 0, 2.15, 0);
        for (const px of [-0.8, 0.8]) {
          for (const pz of [-0.5, 0.5]) this.box(g, '#78716c', 0.06, 1.15, 0.06, px, 1.58, pz);
        }
        const vendor = this.buildPerson('pedagang', rand).group;
        vendor.position.set(-0.15, 0, 0.62);
        vendor.rotation.y = Math.PI;
        g.add(vendor);
        break;
      }
      case 'cilok': {
        this.box(g, '#0ea5e9', 1.1, 0.6, 0.7, 0, 0.62, 0);
        this.box(g, '#e2e8f0', 1.16, 0.08, 0.76, 0, 0.96, 0);
        for (let i = 0; i < 5; i++) {
          this.sphere(g, i % 2 ? '#f8fafc' : '#fbbf24', 0.1, -0.3 + i * 0.15, 1.03, 0.12, { lowPoly: true, noShadow: true });
        }
        this.cylinder(g, '#b91c1c', 0.16, 0.24, 0.34, 1.08, -0.15);
        break;
      }
      case 'tahubulat': {
        // the classic tahu bulat drum cart
        this.box(g, '#1f2937', 1.2, 0.55, 0.8, 0, 0.55, 0);
        this.cylinder(g, '#f59e0b', 0.34, 0.5, 0.1, 1.05, 0, { round: true });
        this.sphere(g, '#fde68a', 0.16, -0.3, 1.06, 0.2, { lowPoly: true, noShadow: true });
        this.sphere(g, '#fde68a', 0.16, -0.3, 1.06, -0.2, { lowPoly: true, noShadow: true });
        for (const wz of [-0.42, 0.42]) this.cylinder(g, '#111827', 0.22, 0.1, -0.3, 0.22, wz, { rotX: Math.PI / 2 });
        break;
      }
      case 'kelapa': {
        // es kelapa muda stand: young coconuts & a chopping block
        this.box(g, '#166534', 1.2, 0.62, 0.8, 0, 0.6, 0);
        for (let i = 0; i < 4; i++) {
          this.sphere(g, '#15803d', 0.18, -0.35 + (i % 2) * 0.3, 1.02 + (i > 1 ? 0.24 : 0), i > 1 ? 0.18 : -0.18, { lowPoly: true });
        }
        this.cylinder(g, '#a3a3a3', 0.2, 0.1, 0.4, 1.03, 0.1);
        this.cone(g, pick(rand, ['#22c55e', '#0ea5e9', '#ef4444']), 1.1, 0.4, 0, 2.1, 0);
        const vendor = this.buildPerson('pedagang', rand).group;
        vendor.position.set(-0.55, 0, 0.55);
        vendor.rotation.y = Math.PI;
        g.add(vendor);
        break;
      }
      case 'jagung': {
        // jagung bakar grill with glowing embers
        this.box(g, '#7c2d12', 1.7, 0.55, 0.8, 0, 0.55, 0);
        const ember = this.box(g, '#f97316', 1.3, 0.08, 0.5, 0, 0.88, 0, { emissive: '#f97316', emissiveIntensity: 0.85 });
        this.addAnim('flicker', ember, { speed: 7 });
        for (let i = 0; i < 4; i++) {
          this.box(g, '#facc15', 0.5, 0.08, 0.12, -0.5 + i * 0.34, 0.95, 0, { rotY: 0.1 * i });
        }
        for (let i = 0; i < 3; i++) {
          const smoke = this.sphere(g, '#e2e8f0', 0.16, 0, 1.1 + i * 0.24, 0, { noShadow: true, transparent: true, opacity: 0.4 });
          this.addAnim('puff', smoke, { baseY: smoke.position.y, phase: i * 0.8, speed: 0.9 });
        }
        break;
      }
      case 'siomay': {
        this.box(g, '#b91c1c', 1.1, 0.62, 0.8, 0, 0.6, 0);
        this.box(g, '#f8fafc', 1.16, 0.08, 0.86, 0, 0.98, 0);
        for (let i = 0; i < 3; i++) {
          this.cylinder(g, '#fef3c7', 0.2, 0.1, -0.3 + i * 0.3, 1.05, 0, { round: true });
          this.sphere(g, '#fde68a', 0.09, -0.3 + i * 0.3, 1.12, 0, { lowPoly: true, noShadow: true });
        }
        this.cylinder(g, '#7c2d12', 0.14, 0.2, 0.42, 1.06, -0.2);
        const steam = this.sphere(g, '#f1f5f9', 0.14, 0, 1.34, 0, { noShadow: true, transparent: true, opacity: 0.45 });
        this.addAnim('puff', steam, { baseY: steam.position.y, phase: 0.3, speed: 0.7 });
        break;
      }
      case 'tukangcendol': {
        // cendol cart with a big glass jar & hanging sign
        this.box(g, '#0f766e', 1.2, 0.66, 0.85, 0, 0.62, 0);
        this.cylinder(g, '#e0f2fe', 0.28, 0.5, 0.25, 1.12, 0, { round: true });
        this.cylinder(g, '#a3e635', 0.22, 0.3, 0.25, 1.02, 0, { round: true });
        this.box(g, '#f8fafc', 0.8, 0.3, 0.06, 0, 1.75, 0);
        this.cylinder(g, '#78716c', 0.04, 0.7, -0.4, 1.6, -0.3);
        this.cylinder(g, '#78716c', 0.04, 0.7, 0.4, 1.6, -0.3);
        break;
      }
      case 'halte':
      default: {
        g.add(this.buildHalte(0, 0, 0));
        const waiting = this.buildPerson('warga', rand).group;
        waiting.position.set(-0.8, 0, 0.4);
        waiting.rotation.y = Math.PI;
        g.add(waiting);
        break;
      }
    }
    return g;
  }

  /* ================================================================ UPDATE */

  update(dt) {
    this.time += dt;
    this.updateClock(dt);
    this.updateMood(dt);

    const speedScale = this.currentLevel.speed;
    this.updateTrafficLights();

    // vehicles that were queued off-map may re-enter now
    for (const v of this.vehicles) {
      if (!v.waitingToWrap || !v.active) continue;
      const lane = v.lane;
      const target = v.pos > 0 ? -ROAD_END : ROAD_END;
      if (this.laneSlotFree(lane, target, v, 1.5)) {
        v.pos = target;
        v.group.visible = true;
        v.waitingToWrap = false;
      }
    }

    // ---- vehicles
    for (const lane of this.lanes) {
      const list = lane.vehicles.filter((v) => v.active);
      for (const v of list) {
        let target = v.baseSpeed * speedScale;

        // Red light: brake smoothly and never cross the stop line.
        let stopRoom = Infinity;
        if (lane.lightAxis && this.lights[lane.lightAxis] !== 'green') {
          const dist = this.distanceToNextStop(v.pos, lane.dir);
          // Stop with the front bumper behind the line, so no car ever noses
          // into the junction while the cross traffic has green.
          const frontClear = v.length / 2 + 0.5;
          if (dist > 0) {
            stopRoom = Math.max(0, dist - frontClear);
            if (dist < frontClear + 7) target *= Math.max(0, (dist - frontClear) / 7) * 0.9;
          }
        }

        // Keep a safe distance from the vehicle ahead (no overlapping).
        let gap = Infinity;
        let aheadLength = v.length;
        for (const other of list) {
          if (other === v) continue;
          const loop = ROAD_END * 2;
          const rel = (((other.pos - v.pos) * lane.dir) % loop + loop) % loop;
          if (rel > 0.3 && rel < gap) {
            gap = rel;
            aheadLength = other.length;
          }
        }
        const halfSum = (v.length + aheadLength) / 2;
        const safe = halfSum + 2.2;
        v.gap = gap;
        v.halfSum = halfSum;
        if (gap < safe) target *= Math.max(0.02, (gap - halfSum - 0.6) / (safe - halfSum));

        // Angkot & becak pause now and then, like real street life.
        if (v.stopTimer > 0) {
          v.stopTimer -= dt;
          target = 0;
        } else if (v.kind === 'angkot' && this.rng() < 0.0015) {
          v.stopTimer = 1.6;
        }

        let step = lane.dir * target * dt;
        // Never move closer than a car length to the vehicle ahead…
        if (Number.isFinite(gap)) {
          const room = Math.max(0, gap - (v.halfSum || v.length) - 0.6);
          if (Math.abs(step) > room) step = Math.sign(step) * room;
        }
        // …and never roll past a red light into the junction.
        if (Number.isFinite(stopRoom) && Math.abs(step) > stopRoom) step = Math.sign(step) * stopRoom;
        v.pos += step;

        // Wrap at the map edge; retired vehicles simply leave for good.
        if (v.pos > ROAD_END || v.pos < -ROAD_END) {
          if (v.retiring) {
            v.active = false;
            v.retiring = false;
            v.group.visible = false;
            continue;
          }
          const target = v.pos > ROAD_END ? -ROAD_END : ROAD_END;
          // Out of sight at the map edge: an out-of-season vehicle is quietly
          // replaced by one that is open at this hour of the city clock.
          this.retuneVehicleKind(v);
          // Only re-enter when the other end of the lane is clear.
          if (this.laneSlotFree(lane, target, v, 1.5)) {
            v.pos = target;
          } else {
            v.pos = v.pos > ROAD_END ? ROAD_END + 0.5 : -ROAD_END - 0.5;
            v.group.visible = false;
            v.waitingToWrap = true;
          }
        }

        this.placeVehicle(v);
      }
    }

    // ---- walkers
    const bob = this.time;
    for (const w of this.walkers) {
      // smooth appear / disappear when the mood changes
      if (w.scale !== w.targetScale) {
        const step = dt * 1.6;
        w.scale += Math.sign(w.targetScale - w.scale) * Math.min(step, Math.abs(w.targetScale - w.scale));
        if (w.scale < 0.02) w.group.visible = false;
        else {
          w.group.visible = true;
          w.group.scale.setScalar(w.scale * (w.baseScale || 1));
        }
      }
      if (!w.group.visible) continue;

      const walking = w.pause <= 0 && w.wait <= 0;
      if (w.pause > 0) w.pause -= dt;
      if (w.wait > 0) w.wait -= dt;

      if (walking) {
        const walkerRadius = 0.3 * (w.baseScale || 1);
        if (w.patrol) {
          const nextU = w.u + w.dir * w.speed * speedScale * dt;
          const probe = this.patrolPosition(w, nextU);
          if (!this.walkBlocked(probe.x, probe.z, w, walkerRadius)) {
            w.u = nextU;
            w.blockedFor = 0;
          } else if (!this.walkBlocked(
            this.patrolPosition({ ...w, lateral: w.lateral + (w.sideStep || 0.5) * 0.6 }).x,
            this.patrolPosition({ ...w, lateral: w.lateral + (w.sideStep || 0.5) * 0.6 }).z,
            w,
            walkerRadius,
          )) {
            // slip past on the outer/inner edge of the pavement
            w.lateral = Math.max(-w.lateralLimit, Math.min(w.lateralLimit, w.lateral + (w.sideStep || 0.5) * 0.35));
            w.blockedFor = 0;
          } else {
            w.blockedFor = (w.blockedFor || 0) + dt;
            if (w.blockedFor > 1.1) {
              w.dir = -w.dir; // turn around — no dead ends
              w.blockedFor = 0;
              w.sideStep = -(w.sideStep || 0.5);
            }
          }
          if (w.u <= w.patrolRange[0]) w.dir = 1;
          if (w.u >= w.patrolRange[1]) w.dir = -1;
        } else {
          const stepDist = w.dir * w.speed * speedScale * dt;
          const lookAhead = Math.sign(stepDist) * (0.6 + Math.abs(stepDist));
          const ahead = ringPosition(w.half, w.t + lookAhead, w.lateral);
          if (!this.walkBlocked(ahead.x, ahead.z, w, walkerRadius)) {
            w.t += stepDist;
            w.blockedFor = 0;
          } else {
            const limit = w.lateralLimit ?? 0.75;
            const wantLateral = Math.max(-limit, Math.min(limit, w.lateral + (w.sideStep || 0.55) * 0.5));
            const shifted = ringPosition(w.half, w.t, wantLateral);
            if (wantLateral !== w.lateral && !this.walkBlocked(shifted.x, shifted.z, w, walkerRadius)) {
              w.lateral = wantLateral;
              w.blockedFor = 0;
            } else {
              w.blockedFor = (w.blockedFor || 0) + dt;
              if (w.blockedFor > 1.1) {
                w.dir = -w.dir; // walk the other way instead of pushing through
                w.blockedFor = 0;
                w.sideStep = -(w.sideStep || 0.55);
              }
            }
          }
        }
      }

      const pos = w.patrol ? this.patrolPosition(w) : ringPosition(w.half, w.t, w.lateral);
      const groundY = Math.abs(pos.x) > PARK_HALF + 1 || Math.abs(pos.z) > PARK_HALF + 1 ? 0.1 : 0.09;
      const bobY = walking ? Math.abs(Math.sin(bob * 7 + w.bobPhase)) * 0.045 : 0;
      w.group.position.set(pos.x, groundY + bobY, pos.z);
      w.group.rotation.y = pos.rot;

      if (walking) {
        const swing = Math.sin(bob * 8 + w.bobPhase) * 0.55;
        if (w.legs[0]) w.legs[0].rotation.z = swing;
        if (w.legs[1]) w.legs[1].rotation.z = -swing;
      } else {
        if (w.legs[0]) w.legs[0].rotation.z *= 0.9;
        if (w.legs[1]) w.legs[1].rotation.z *= 0.9;
        if (w.pause < -3) {
          // Look around, then continue walking.
          w.dir = this.rng() > 0.5 ? 1 : -1;
        }
      }

      if (w.pause <= 0 && this.rng() < 0.0009) w.pause = between(this.rng, 1.4, 3.6);
    }

    // ---- keep pedestrians a shoulder apart -------------------------------
    // Walkers that meet head-on on the same stretch can drift into each other
    // even with the look-ahead check (both dodge the same way). Nudge them
    // apart along the width of their path instead of letting them clip.
    const MIN_WALK_SEP = 0.78;
    for (let i = 0; i < this.walkers.length; i++) {
      const a = this.walkers[i];
      if (!a.group.visible) continue;
      for (let j = i + 1; j < this.walkers.length; j++) {
        const b = this.walkers[j];
        if (!b.group.visible || a.half !== b.half || Boolean(a.patrol) !== Boolean(b.patrol)) continue;
        const ax = a.group.position.x;
        const az = a.group.position.z;
        const dx = b.group.position.x - ax;
        const dz = b.group.position.z - az;
        const d = Math.hypot(dx, dz);
        if (d >= MIN_WALK_SEP || d < 1e-4) continue;
        const limitA = a.lateralLimit ?? 0.75;
        const limitB = b.lateralLimit ?? 0.75;
        const sign = a.lateral === b.lateral ? (i < j ? 1 : -1) : Math.sign(a.lateral - b.lateral) || 1;
        const push = Math.min(0.06, (MIN_WALK_SEP - d) * 0.35 + 0.01) * sign;
        const tryLateral = (w, want, limit) => {
          const cand = Math.max(-limit, Math.min(limit, want));
          const pos = w.patrol ? this.patrolPosition({ ...w, lateral: cand }) : ringPosition(w.half, w.t, cand);
          if (!this.blockedByProp(pos.x, pos.z, 0.3 * (w.baseScale || 1))) return { cand, pos };
          return null;
        };
        const signA = tryLateral(a, a.lateral + push, limitA);
        const signB = tryLateral(b, b.lateral - push, limitB);
        const newA = signA ? signA.cand : a.lateral;
        const newB = signB ? signB.cand : b.lateral;
        // Only sidestep if the new spot is actually free — never shove a
        // pedestrian into a bin, a pole or a warung.
        if (newA !== a.lateral) {
          const pa = a.patrol ? this.patrolPosition({ ...a, lateral: newA }) : ringPosition(a.half, a.t, newA);
          if (!this.blockedByProp(pa.x, pa.z, 0.3 * (a.baseScale || 1))) {
            a.lateral = newA;
            a.group.position.set(pa.x, a.group.position.y, pa.z);
            a.group.rotation.y = pa.rot;
          }
        }
        if (newB !== b.lateral) {
          const pb = b.patrol ? this.patrolPosition({ ...b, lateral: newB }) : ringPosition(b.half, b.t, newB);
          if (!this.blockedByProp(pb.x, pb.z, 0.3 * (b.baseScale || 1))) {
            b.lateral = newB;
            b.group.position.set(pb.x, b.group.position.y, pb.z);
            b.group.rotation.y = pb.rot;
          }
        }
      }
    }

    // ---- stalls (soft open / close as the mood shifts)
    for (const s of this.stalls) {
      if (s.scale !== s.targetScale) {
        const step = dt * 2.2;
        s.scale += Math.sign(s.targetScale - s.scale) * Math.min(step, Math.abs(s.targetScale - s.scale));
        if (s.scale < 0.03) s.group.visible = false;
        else {
          s.group.visible = true;
          s.group.scale.setScalar(s.scale);
        }
      }
    }

    // ---- small idle animations (flags, steam, balloons, umbrellas...)
    for (const anim of this.idleAnims) {
      const mesh = anim.mesh;
      if (!mesh) continue;
      switch (anim.kind) {
        case 'flag':
          mesh.rotation.y = Math.sin(this.time * (anim.speed || 2.4) + (anim.phase || 0)) * 0.22;
          break;
        case 'spin':
          mesh.rotation.y = this.time * (anim.speed || 1);
          break;
        case 'bob':
          mesh.position.y = (anim.baseY || 0) + Math.sin(this.time * (anim.speed || 1.2) + (anim.phase || 0)) * (anim.amp || 0.1);
          break;
        case 'puff': {
          const t = (this.time * (anim.speed || 1) + (anim.phase || 0)) % 1;
          mesh.position.y = (anim.baseY || 1) + t * 0.8;
          mesh.scale.setScalar(0.05 + 0.3 * (1 - t));
          break;
        }
        case 'flicker': {
          const f = 0.6 + Math.abs(Math.sin(this.time * (anim.speed || 5))) * 0.5;
          mesh.material.emissiveIntensity = 0.4 + f * 0.4;
          break;
        }
        default:
          break;
      }
    }
  }

  /** Distance from the vehicle centre to the next stop line. Lines sit just
      outside the junction box (asphalt is ROAD_CENTER ± 3.4), never in it. */
  distanceToNextStop(pos, dir) {
    let best = Infinity;
    // Each direction has its own pair of lines on the approach side of a junction.
    const stops = dir > 0
      ? [-(ROAD_CENTER + 3.4), ROAD_CENTER - 3.4]
      : [ROAD_CENTER + 3.4, -(ROAD_CENTER - 3.4)];
    for (const stop of stops) {
      const d = (stop - pos) * dir;
      if (d > -1 && d < best) best = d;
    }
    return best;
  }

  updateTrafficLights() {
    const cycle = this.time % 24;
    let phase;
    // 9 s green + 2 s yellow + 1 s all-red per axis: slow becak/bajaj always
    // clear the junction before the cross traffic gets its green.
    if (cycle < 9) phase = { x: 'green', z: 'red' };
    else if (cycle < 11) phase = { x: 'yellow', z: 'red' };
    else if (cycle < 12) phase = { x: 'red', z: 'red' };
    else if (cycle < 21) phase = { x: 'red', z: 'green' };
    else if (cycle < 23) phase = { x: 'red', z: 'yellow' };
    else phase = { x: 'red', z: 'red' };
    this.lights = phase;

    const setLamp = (mat, on, color) => {
      if (!mat) return;
      mat.emissiveIntensity = on ? 1.4 : 0.04;
      mat.color.set(on ? color : '#3f3f46');
    };
    for (const tl of this.trafficLights) {
      // Each corner shows the state of the axis that runs in front of it.
      const axis = tl.corner[0] === tl.corner[1] ? 'x' : 'z';
      const state = phase[axis];
      setLamp(tl.lamps.red, state === 'red', '#ef4444');
      setLamp(tl.lamps.yellow, state === 'yellow', '#facc15');
      setLamp(tl.lamps.green, state === 'green', '#22c55e');
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    for (const key of Object.keys(this.geo)) {
      this.geo[key]?.dispose?.();
    }
  }
}

/* -------------------------------------------------------------- utilities */

function ringPosition(half, dist, lateral = 0) {
  const side = 2 * half;
  const perimeter = side * 4;
  let d = ((dist % perimeter) + perimeter) % perimeter;
  const idx = Math.floor(d / side);
  const f = d - idx * side;
  let x = 0;
  let z = 0;
  let rot = 0;
  switch (idx) {
    case 0:
      x = -half + f;
      z = -half;
      rot = 0;
      break;
    case 1:
      x = half;
      z = -half + f;
      rot = -Math.PI / 2;
      break;
    case 2:
      x = half - f;
      z = half;
      rot = Math.PI;
      break;
    default:
      x = -half;
      z = half - f;
      rot = Math.PI / 2;
      break;
  }
  // push sideways outwards so walkers don't share a single line
  if (idx === 0) z -= lateral;
  else if (idx === 1) x += lateral;
  else if (idx === 2) z += lateral;
  else x -= lateral;
  return { x, z, rot };
}

function makeAdTexture(lines, bg, fg, sub) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, canvas.height - 46, canvas.width, 46);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shrink the headline until it fits inside the board.
  let size = 76;
  const font = (px) => `bold ${px}px "Baloo 2", system-ui, sans-serif`;
  ctx.font = font(size);
  const title = lines[0] || 'WARUNG';
  const maxW = canvas.width - 36;
  while (ctx.measureText(title).width > maxW && size > 26) {
    size -= 4;
    ctx.font = font(size);
  }
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 22);
  if (sub) {
    let subSize = 38;
    ctx.font = `bold ${subSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    while (ctx.measureText(sub).width > maxW && subSize > 18) {
      subSize -= 2;
      ctx.font = `bold ${subSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    }
    ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 62);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
