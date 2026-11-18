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
const SIDEWALK_HALF = 36.4; // shop-front pavement, outside the asphalt (28.6…35.4)
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
  constructor(scene, { compact = false } = {}) {
    this.scene = scene;
    this.compact = compact;
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

    this.currentLevel = ACTIVITY_LEVELS.cukup;
    this.levelKey = 'cukup';
    this.moodDwell = between(this.rng, 26, 44);
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
  }

  buildAll(seedKey) {
    this.seedKey = seedKey;
    this.clear();
    this.rng = mulberry32(seedFromString(seedKey));
    this.buildRoadDecor();
    this.buildTrafficLights();
    this.buildStreetFurniture();
    this.buildBillboards();
    this.buildLanesAndVehicles();
    this.buildWalkers();
    this.buildStalls();

    // Base mood is randomised for every match, then it keeps mutating over time.
    this.levelKey = this.rollLevel();
    this.currentLevel = ACTIVITY_LEVELS[this.levelKey];
    this.moodDwell = between(this.rng, 24, 40);
    this.applyLevel();
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
    this.walkers.forEach((w, i) => {
      w.targetScale = i < budget.walkers ? 1 : 0;
    });
    // The halte (bus stop) is permanent map furniture; the street stalls open
    // and close in a seeded random order, so every match has a different market.
    const permanent = this.stalls.filter((s) => s.permanent);
    const openable = this.stalls.filter((s) => !s.permanent).sort((a, b) => a.order - b.order);
    const slots = Math.max(0, budget.stalls - permanent.length);
    permanent.forEach((s) => {
      s.targetScale = 1;
    });
    openable.forEach((s, i) => {
      s.targetScale = i < slots ? 1 : 0;
    });
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
    for (const sign of [-1, 1]) {
      this.box(g, '', 136, 0.14, 2.1, 0, 0.07, sign * SIDEWALK_HALF, { material: walkMat, noShadow: true });
      this.box(g, '', 2.1, 0.14, 136, sign * SIDEWALK_HALF, 0.07, 0, { material: walkMat, noShadow: true });
      // kerb stone between asphalt and pavement
      this.box(g, '#d8d2c2', 136, 0.18, 0.3, 0, 0.09, sign * (SIDEWALK_HALF - 1.05), { noShadow: true });
      this.box(g, '#d8d2c2', 0.3, 0.18, 136, sign * (SIDEWALK_HALF - 1.05), 0.09, 0, { noShadow: true });
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
      const px = sx * 41;
      const pz = sz * 37.2;
      this.cylinder(g, '#94a3b8', 0.07, 3.2, px, 1.6, pz);
      this.box(g, '#1e40af', 2.4, 0.55, 0.08, px, 3.1, pz);
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
      group.position.set(sx * (ROAD_CENTER + 4.3), 0, sz * (ROAD_CENTER + 4.3));
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
      g.add(group);
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
    for (let i = -2; i <= 2; i++) {
      for (const sz of [-1, 1]) {
        const x = i * 24;
        const z = sz * (SIDEWALK_HALF + 0.75);
        this.cylinder(g, '', 0.14, 6.4, x, 3.2, z, { material: poleMat });
        this.box(g, '#5b6068', 1.5, 0.12, 0.12, x, 5.7, z);
        this.box(g, '#5b6068', 1.1, 0.12, 0.12, x, 5.0, z);
        if (i < 2) {
          for (const dy of [0, -0.34]) {
            const wire = new THREE.Mesh(this.geo.box, wireMat);
            wire.scale.set(24, 0.045, 0.045);
            wire.position.set(x + 12, 5.66 + dy, z);
            g.add(wire);
          }
        }
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
      bench.position.set(bx, 0, bz);
      bench.rotation.y = ry;
      this.box(bench, '', 2.1, 0.12, 0.6, 0, 0.52, 0, { material: benchMat });
      this.box(bench, '', 2.1, 0.5, 0.12, 0, 0.78, -0.28, { material: benchMat });
      this.box(bench, '#6b7280', 0.12, 0.5, 0.12, -0.85, 0.26, 0.18);
      this.box(bench, '#6b7280', 0.12, 0.5, 0.12, 0.85, 0.26, 0.18);
      g.add(bench);
    }

    for (const [bx, bz] of [[-24.5, 12], [24.5, 12], [-24.5, -12], [24.5, -12]]) {
      this.cylinder(g, '#166534', 0.34, 0.86, bx, 0.43, bz);
      this.cylinder(g, '#14532d', 0.38, 0.1, bx, 0.9, bz);
    }

    // Planter boxes with colourful flowers around the monument side.
    const flowerColors = ['#f472b6', '#fbbf24', '#f87171', '#c084fc', '#facc15'];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const px = Math.cos(angle) * 24.2;
      const pz = Math.sin(angle) * 24.2;
      this.box(g, '#b45309', 1.8, 0.4, 0.8, px, 0.2, pz, { rotY: -angle });
      // low green hedge, then the flowers on top
      for (let f = 0; f < 3; f++) {
        const ox = (f - 1) * 0.5;
        this.sphere(g, '#166534', 0.17, px + ox, 0.42, pz, { noShadow: true, sy: 0.7 });
        this.sphere(g, pick(rand, flowerColors), 0.1, px + ox, 0.56, pz, { noShadow: true });
      }
    }

    // Umbul-umbul / flags near the palace, waving with the idle animation list.
    for (let i = 0; i < 6; i++) {
      const fx = -10 + i * 4;
      const fz = -23.2;
      this.cylinder(g, '#cbd5e1', 0.05, 3.4, fx, 1.7, fz, { noShadow: true });
      const flag = new THREE.Mesh(this.geo.box, this.mat(i % 2 ? '#f97316' : '#dc2626', { roughness: 0.6 }));
      flag.scale.set(1.1, 0.7, 0.06);
      flag.position.set(fx + 0.55, 3.0, fz);
      flag.userData.localMaterial = false;
      g.add(flag);
      this.addAnim('flag', flag, { phase: i * 0.7, speed: 2.4 + (i % 3) * 0.4 });
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
      bike.position.set(px, 0, pz);
      bike.rotation.y = ry + Math.PI / 2;
      g.add(bike);
    }
  }

  buildBillboards() {
    const rand = this.rng;
    const ads = [
      { lines: ['SATE PADANG'], bg: '#b91c1c', fg: '#fef3c7', sub: 'PEDAS MANTAP' },
      { lines: ['ES KELAPA'], bg: '#0f766e', fg: '#ecfeff', sub: 'SEGAR ALAMI' },
      { lines: ['BATIK'], bg: '#7c2d12', fg: '#fde68a', sub: 'NUSANTARA' },
      { lines: ['KOPI TUBRUK'], bg: '#422006', fg: '#fbbf24', sub: 'SETIAP HARI' },
    ];
    const spots = [
      [-52, 36.5, 0],
      [52, -36.5, Math.PI],
      [-36.5, -52, Math.PI / 2],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [bx, bz, ry] = spots[i];
      const ad = ads[Math.floor(rand() * ads.length) % ads.length];
      const group = new THREE.Group();
      group.position.set(bx, 0, bz);
      group.rotation.y = ry;
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
    const options = ['motor', 'motor', 'ojol', 'sedan', 'angkot', 'bajaj', 'pickup', 'motor', 'becak', 'truk', 'bus'];
    if (lane.lightAxis === null) return index % 3 === 0 ? 'bus' : index % 3 === 1 ? 'truk' : 'sedan';
    return pick(rand, options);
  }

  vehicleSpeed(kind) {
    switch (kind) {
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

  buildBecak() {
    const g = new THREE.Group();
    const color = pick(this.rng, ['#dc2626', '#16a34a', '#2563eb']);
    this.addWheels(g, [[0.6, 0]], 0.24);
    this.addWheels(g, [[-0.45, 0.52], [-0.45, -0.52]], 0.24);
    this.box(g, color, 0.95, 0.5, 0.95, -0.5, 0.62, 0);
    this.box(g, '#fef3c7', 0.75, 0.55, 0.8, -0.55, 0.95, 0);
    this.box(g, '#0f172a', 0.9, 0.08, 0.98, -0.5, 1.22, 0);
    this.box(g, '#334155', 0.5, 0.08, 0.1, 0.3, 0.95, 0);
    this.box(g, pick(this.rng, SHIRT_COLORS), 0.3, 0.45, 0.3, 0.5, 0.85, 0);
    this.sphere(g, pick(this.rng, SKIN_TONES), 0.13, 0.5, 1.14, 0, { lowPoly: true });
    return g;
  }

  spawnVehicle(vehicle) {
    const lane = vehicle.lane;
    // Enter from the edge of the map in the direction of travel.
    vehicle.pos = lane.dir > 0 ? -ROAD_END - between(this.rng, 0, 10) : ROAD_END + between(this.rng, 0, 10);
    vehicle.speed = vehicle.baseSpeed;
    vehicle.active = true;
    vehicle.retiring = false;
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

  buildWalkers() {
    const rand = this.rng;
    const maxWalkers = Math.max(8, Math.round(ACTIVITY_LEVELS.ramai.walkers * 1.35));
    const roles = [
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
      'warga',
      'ibu',
      'anak',
    ];
    for (let i = 0; i < maxWalkers; i++) {
      const role = roles[i % roles.length];
      const isPark = i % 3 !== 0;
      const half = isPark ? PARK_HALF : SIDEWALK_HALF;
      const { group, legs, scale: personScale } = this.buildPerson(role, rand);
      group.visible = false;
      group.scale.setScalar(0.001);
      this.group.add(group);

      if (role === 'fotografer') {
        // Tourist posing near the monuments, walking slowly back & forth.
        this.walkers.push({
          group,
          legs,
          role,
          baseScale: personScale,
          mode: 'idle',
          t: between(rand, 0, Math.PI * 2),
          speed: 0.35,
          half,
          lateral: between(rand, -1.0, 1.0),
          dir: rand() > 0.5 ? 1 : -1,
          pause: between(rand, 0, 3),
          scale: 0.001,
          targetScale: 0,
          bobPhase: rand() * Math.PI * 2,
        });
        continue;
      }

      this.walkers.push({
        group,
        legs,
        role,
        baseScale: personScale,
        mode: 'path',
        t: between(rand, 0, 4) * half,
        speed: between(rand, 0.9, 1.7) * (role === 'anak' ? 1.2 : 1),
        half,
        lateral: between(rand, -0.75, 0.75),
        dir: rand() > 0.5 ? 1 : -1,
        pause: between(rand, 0, 2.5),
        scale: 0.001,
        targetScale: 0,
        bobPhase: rand() * Math.PI * 2,
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
      default:
        break;
    }

    return { group: g, legs, scale };
  }

  /* ================================================================ STALLS */

  buildStalls() {
    const rand = this.rng;
    const kinds = ['warung', 'bakso', 'gorengan', 'es', 'balon', 'sate', 'bensin', 'halte'];
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
      [35.2, -20],
    ];
    for (let i = 0; i < maxStalls; i++) {
      const kind = kinds[i % kinds.length];
      const [ax, az] = anchors[i % anchors.length];
      const group = this.buildStall(kind, rand);
      group.position.set(ax, 0, az);
      // Face the board
      group.rotation.y = Math.atan2(-ax, -az);
      group.visible = false;
      group.scale.setScalar(0.001);
      this.group.add(group);
      this.stalls.push({
        group,
        kind,
        scale: 0.001,
        targetScale: 0,
        anchor: [ax, az],
        order: rand(),
        permanent: kind === 'halte',
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
    this.updateMood(dt);

    const speedScale = this.currentLevel.speed;
    this.updateTrafficLights();

    // ---- vehicles
    for (const lane of this.lanes) {
      const list = lane.vehicles.filter((v) => v.active);
      for (const v of list) {
        let target = v.baseSpeed * speedScale;

        // Red light: brake smoothly before the intersection stop line.
        if (lane.lightAxis && this.lights[lane.lightAxis] !== 'green') {
          const dist = this.distanceToNextStop(v.pos, lane.dir);
          if (dist > 0 && dist < 6) target *= Math.max(0, (dist - 0.6) / 6) * 0.95;
        }

        // Keep a safe distance from the vehicle ahead (no overlapping).
        let gap = Infinity;
        for (const other of list) {
          if (other === v) continue;
          const loop = ROAD_END * 2;
          const rel = (((other.pos - v.pos) * lane.dir) % loop + loop) % loop;
          if (rel > 0.3 && rel < gap) gap = rel;
        }
        const safe = v.length + 1.6;
        if (gap < safe) target *= Math.max(0.02, gap / safe);

        // Angkot & becak pause now and then, like real street life.
        if (v.stopTimer > 0) {
          v.stopTimer -= dt;
          target = 0;
        } else if (v.kind === 'angkot' && this.rng() < 0.0015) {
          v.stopTimer = 1.6;
        }

        v.pos += lane.dir * target * dt;

        // Wrap at the map edge; retired vehicles simply leave for good.
        if (v.pos > ROAD_END || v.pos < -ROAD_END) {
          if (v.retiring) {
            v.active = false;
            v.retiring = false;
            v.group.visible = false;
            continue;
          }
          if (v.pos > ROAD_END) v.pos = -ROAD_END;
          else v.pos = ROAD_END;
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

      const walking = w.pause <= 0;
      if (w.pause > 0) {
        w.pause -= dt;
      } else {
        w.t += w.dir * w.speed * speedScale * dt;
      }

      const pos = ringPosition(w.half, w.t, w.lateral);
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

  distanceToNextStop(pos, dir) {
    let best = Infinity;
    for (const stop of [-ROAD_CENTER, ROAD_CENTER]) {
      const d = (stop - pos) * dir;
      if (d > -1 && d < best) best = d;
    }
    return best;
  }

  updateTrafficLights() {
    const cycle = this.time % 24;
    let phase;
    if (cycle < 10) phase = { x: 'green', z: 'red' };
    else if (cycle < 12) phase = { x: 'yellow', z: 'red' };
    else if (cycle < 22) phase = { x: 'red', z: 'green' };
    else phase = { x: 'red', z: 'yellow' };
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
