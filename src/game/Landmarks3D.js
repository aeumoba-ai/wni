import * as THREE from 'three';

function makeMaterials() {
  const std = (color, roughness = 0.58, metalness = 0.05, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

  return {
    white: std('#f8fafc', 0.55),
    cream: std('#f1e6cf', 0.68),
    sand: std('#e4cca0', 0.85),
    terracotta: std('#c25934', 0.65),
    brick: std('#a8462c', 0.72),
    red: std('#dc2626', 0.45),
    crimson: std('#b91c1c', 0.48),
    darkRed: std('#7f1d1d', 0.55),
    orange: std('#f97316', 0.45),
    yellow: std('#facc15', 0.42),
    gold: std('#eab308', 0.3, 0.55),
    bronze: std('#9a7b3c', 0.38, 0.45),
    garudaTeal: std('#2c6b63', 0.42, 0.32),
    green: std('#22c55e', 0.65),
    darkGreen: std('#166534', 0.75),
    emerald: std('#15803d', 0.7),
    teal: std('#14b8a6', 0.42),
    water: std('#0ea5e9', 0.2, 0.15),
    lagoon: std('#06b6d4', 0.18, 0.15),
    blue: std('#2563eb', 0.45),
    skyBlue: std('#38bdf8', 0.35),
    glass: std('#7dd3fc', 0.18, 0.45),
    silver: std('#cbd5e1', 0.35, 0.45),
    steel: std('#64748b', 0.42, 0.4),
    asphalt: std('#334155', 0.85),
    dark: std('#1e242b', 0.6),
    wood: std('#8b5a2b', 0.78),
    darkWood: std('#4f3018', 0.8),
    thatch: std('#c8a45c', 0.88),
    mud: std('#6b5e50', 0.38, 0.08),
    mudDark: std('#4f463c', 0.42),
    stone: std('#78716c', 0.85),
    darkStone: std('#57534e', 0.88),
    ochre: std('#b48349', 0.82),
    sulfur: std('#a5f3fc', 0.25, 0.08),
    purple: std('#a855f7', 0.45),
    lime: std('#65a30d', 0.72),
    blueFire: std('#38bdf8', 0.2, 0.1, { emissive: '#0ea5e9', emissiveIntensity: 0.95 }),
    pink: std('#ec4899', 0.45),
    sirenRed: std('#ef4444', 0.3, 0.1, { emissive: '#ef4444', emissiveIntensity: 0.7 }),
    sirenBlue: std('#3b82f6', 0.3, 0.1, { emissive: '#3b82f6', emissiveIntensity: 0.7 }),
    diamond: std('#67e8f9', 0.12, 0.35, { emissive: '#22d3ee', emissiveIntensity: 0.35 }),
  };
}

let cachedMats = null;
function getMats() {
  if (!cachedMats) cachedMats = makeMaterials();
  return cachedMats;
}

function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(parent, rt, rb, h, seg, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cone(parent, r, h, seg, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  parent.add(m);
  return m;
}

function addMiniPalm(parent, M, x, z, scale = 1) {
  const pg = new THREE.Group();
  pg.position.set(x, 0, z);
  cyl(pg, 0.045 * scale, 0.08 * scale, 0.95 * scale, 6, M.wood, 0, 0.46 * scale, 0, 0.1, 0, 0.12);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const frond = box(pg, 0.55 * scale, 0.04 * scale, 0.16 * scale, M.green, Math.cos(a) * 0.25 * scale, 0.94 * scale, Math.sin(a) * 0.25 * scale);
    frond.rotation.y = -a;
    frond.rotation.z = -0.35;
  }
  parent.add(pg);
}

/**
 * Builds a signature Indonesian 3D miniature representing each Monopoly tile's real-world identity.
 * Returns { group, animations }
 */
export function buildTileLandmark(tile) {
  const M = getMats();
  const g = new THREE.Group();
  const animations = [];
  const kind = tile.landmark;

  switch (kind) {
    // 0. GAPURA MULAI — Iconic Indonesian 17-an red & white Gapura gate
    case 'gapura': {
      box(g, 0.36, 0.24, 0.36, M.red, -0.92, 0.12, 0);
      box(g, 0.36, 0.24, 0.36, M.red, 0.92, 0.12, 0);
      box(g, 0.24, 2.0, 0.24, M.white, -0.92, 1.22, 0);
      box(g, 0.24, 2.0, 0.24, M.white, 0.92, 1.22, 0);
      box(g, 2.26, 0.34, 0.38, M.red, 0, 2.32, 0);
      box(g, 1.65, 0.2, 0.32, M.white, 0, 2.58, 0);
      const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), M.gold);
      emblem.position.set(0, 2.82, 0);
      g.add(emblem);
      animations.push({ type: 'spin', mesh: emblem, speed: 1.8 });
      break;
    }

    // 1, 10, 26. KEBIJAKAN — Policy gavel podium & red-blue toggle card
    case 'switch': {
      box(g, 1.1, 0.14, 0.72, M.white, 0, 0.08, 0);
      box(g, 0.36, 0.16, 0.34, M.red, -0.22, 0.22, 0);
      cyl(g, 0.18, 0.18, 0.12, 12, M.blue, 0.24, 0.2, 0);
      // Tiny wooden judge gavel on top
      cyl(g, 0.035, 0.035, 0.55, 6, M.wood, 0.08, 0.34, 0.2, 0, 0.3, Math.PI / 2);
      cyl(g, 0.09, 0.09, 0.26, 8, M.darkWood, -0.14, 0.34, 0.26, Math.PI / 2, 0, 0);
      break;
    }

    // 2. LUMPUR LAPINDO, PORONG — Mud dike embankment + bubbling mud caldera + tilted sunken roof!
    case 'lapindo': {
      // Retaining earth dike ring (tanggul)
      cyl(g, 0.82, 0.96, 0.32, 14, M.sand, 0, 0.16, 0);
      // Glossy gray-brown mud pool inside dike
      cyl(g, 0.72, 0.72, 0.35, 14, M.mud, 0, 0.18, 0);
      // Bubbling mud domes
      [[-0.24, -0.1, 0.15], [0.2, 0.14, 0.13], [-0.04, 0.24, 0.1]].forEach(([bx, bz, br], i) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(br, 10, 8), M.mudDark);
        b.position.set(bx, 0.36, bz);
        g.add(b);
        animations.push({ type: 'bob', mesh: b, baseY: 0.36, amp: 0.065, speed: 2.6 + i * 0.7, phase: i * 1.9 });
      });
      // Iconic partially submerged tilted house roof peeking out of the mud!
      const roof = cone(g, 0.38, 0.36, 4, M.terracotta, 0.26, 0.4, -0.18, Math.PI / 4);
      roof.rotation.z = -0.32;
      break;
    }

    // 3. PBB — Classical Tax Hall with columns & red pitched roof
    case 'pbb': {
      box(g, 1.96, 0.2, 1.24, M.cream, 0, 0.1, 0);
      box(g, 1.66, 1.02, 0.96, M.white, 0, 0.7, -0.04);
      for (let cx = -0.64; cx <= 0.64; cx += 0.42) {
        cyl(g, 0.075, 0.09, 1.02, 8, M.white, cx, 0.7, 0.48);
      }
      box(g, 1.86, 0.14, 1.16, M.cream, 0, 1.26, 0);
      const pbbRoof = cone(g, 1.18, 0.62, 4, M.red, 0, 1.62, 0, Math.PI / 4);
      pbbRoof.scale.set(1.12, 1, 0.72);
      cyl(g, 0.13, 0.13, 0.06, 12, M.gold, 0, 1.34, 0.54, Math.PI / 2);
      break;
    }

    // 4. PELABUHAN MERAK — Ferry dock + Ro-Ro passenger ferry + orange gantry crane
    case 'port_merak': {
      box(g, 2.1, 0.16, 1.4, M.water, 0, 0.08, 0);
      box(g, 1.05, 0.26, 1.25, M.silver, 0.52, 0.17, 0);
      // Orange port crane
      box(g, 0.18, 1.65, 0.18, M.orange, 0.62, 1.05, -0.15);
      box(g, 1.35, 0.15, 0.16, M.orange, 0.06, 1.82, -0.15);
      box(g, 0.05, 0.55, 0.05, M.dark, -0.45, 1.48, -0.15);
      // Iconic white-and-red Bakauheni-Merak Ro-Ro Ferry docked!
      box(g, 0.62, 0.26, 1.05, M.red, -0.46, 0.24, 0.05);
      box(g, 0.56, 0.34, 0.84, M.white, -0.46, 0.52, 0.02);
      box(g, 0.44, 0.16, 0.34, M.skyBlue, -0.46, 0.76, -0.1);
      break;
    }

    // 5, 19. LOBI ORANG DALAM — Manila dossier folders + executive briefcase + red seal
    case 'folder': {
      box(g, 1.28, 0.2, 0.92, M.sand, -0.1, 0.1, 0);
      box(g, 1.24, 0.18, 0.88, M.thatch, -0.06, 0.28, 0.02, 0, 0.08, 0);
      box(g, 0.22, 0.38, 0.94, M.red, -0.08, 0.2, 0.01);
      // Dark executive leather briefcase leaning beside
      box(g, 0.68, 0.48, 0.22, M.darkWood, 0.52, 0.26, 0.12, 0, -0.25, 0);
      box(g, 0.22, 0.07, 0.06, M.gold, 0.52, 0.53, 0.12, 0, -0.25, 0);
      break;
    }

    // 6. CANGGU, BALI — Iconic Balinese Candi Bentar split brick gate + beach club umbrella & surfboard!
    case 'canggu': {
      // Warm sand & turquoise beach club pool
      box(g, 2.0, 0.12, 1.35, M.sand, 0, 0.06, 0);
      box(g, 0.88, 0.14, 0.65, M.lagoon, 0.46, 0.08, 0.22);
      // Iconic Balinese Split Gate (Candi Bentar) in terracotta brick!
      [-0.78, -0.24].forEach((gx) => {
        box(g, 0.34, 0.32, 0.36, M.brick, gx, 0.26, -0.22);
        box(g, 0.28, 0.34, 0.3, M.terracotta, gx, 0.58, -0.22);
        box(g, 0.22, 0.34, 0.24, M.brick, gx, 0.9, -0.22);
        cone(g, 0.16, 0.34, 4, M.terracotta, gx, 1.24, -0.22, Math.PI / 4);
      });
      // Beach umbrella & bright yellow surfboard!
      cyl(g, 0.03, 0.03, 0.68, 6, M.white, 0.52, 0.42, -0.26);
      cone(g, 0.42, 0.2, 8, M.teal, 0.52, 0.78, -0.26);
      box(g, 0.14, 0.72, 0.04, M.yellow, -0.02, 0.42, 0.36, 0.15, 0.2, -0.22);
      addMiniPalm(g, M, 0.88, -0.42, 0.85);
      break;
    }

    // 7. RUTAN KPK — Iconic white-and-red detention building with prison bars
    case 'jail': {
      box(g, 2.02, 1.38, 1.28, M.white, 0, 0.69, 0);
      box(g, 2.22, 0.38, 1.46, M.red, 0, 1.54, 0);
      box(g, 1.62, 0.84, 0.08, M.dark, 0, 0.66, 0.62);
      for (let bx = -0.72; bx <= 0.72; bx += 0.24) {
        box(g, 0.07, 0.88, 0.12, M.silver, bx, 0.66, 0.66);
      }
      // Orange KPK banner trim on roof
      box(g, 0.9, 0.15, 0.1, M.orange, 0, 1.55, 0.74);
      break;
    }

    // 8. PLN — Twin tall steel SUTET electricity pylons with crossarms & yellow transformer!
    case 'pln': {
      [-0.48, 0.48].forEach((ox) => {
        cone(g, 0.32, 1.85, 4, M.silver, ox, 0.92, -0.1, Math.PI / 4);
        box(g, 0.74, 0.07, 0.08, M.steel, ox, 1.38, -0.1);
        box(g, 0.56, 0.07, 0.08, M.steel, ox, 1.68, -0.1);
      });
      box(g, 1.25, 0.05, 0.05, M.dark, 0, 1.4, -0.1);
      // Yellow PLN transformer box
      box(g, 0.56, 0.44, 0.42, M.yellow, 0, 0.22, 0.36);
      box(g, 0.18, 0.24, 0.05, M.blue, 0, 0.24, 0.58);
      break;
    }

    // 9. PELABUHAN BELAWAN — Container port with colorful shipping containers & gantry crane!
    case 'port_belawan': {
      box(g, 2.1, 0.14, 1.38, M.water, 0, 0.07, 0);
      box(g, 1.95, 0.22, 0.92, M.silver, 0, 0.15, -0.18);
      // Stacked colorful containers (red, blue, orange, green)
      box(g, 0.58, 0.26, 0.3, M.red, -0.52, 0.38, -0.2);
      box(g, 0.58, 0.26, 0.3, M.blue, -0.52, 0.65, -0.2);
      box(g, 0.58, 0.26, 0.3, M.orange, 0.15, 0.38, -0.2);
      box(g, 0.58, 0.26, 0.3, M.green, 0.15, 0.65, -0.2);
      // Gantry crane frame straddling containers
      box(g, 0.12, 1.45, 0.12, M.yellow, 0.72, 0.94, -0.45);
      box(g, 0.12, 1.45, 0.12, M.yellow, 0.72, 0.94, 0.15);
      box(g, 1.75, 0.16, 0.24, M.orange, 0.08, 1.66, -0.15);
      break;
    }

    // 11. TOL TRANS JAWA — Iconic curved blue-white toll gate plaza (Gerbang Tol) with boom barriers!
    case 'tol': {
      // 2-lane dark asphalt toll highway
      box(g, 2.05, 0.12, 1.38, M.asphalt, 0, 0.06, 0);
      // White lane dashed line
      box(g, 0.08, 0.14, 0.45, M.white, 0, 0.07, 0.32);
      // Toll booths
      [-0.78, 0, 0.78].forEach((tx) => {
        box(g, 0.26, 0.72, 0.44, M.white, tx, 0.42, -0.1);
        box(g, 0.28, 0.16, 0.46, M.blue, tx, 0.74, -0.1);
      });
      // Wide signature blue-and-white Jasa Marga canopy roof
      box(g, 2.15, 0.24, 0.88, M.white, 0, 1.02, -0.1);
      box(g, 2.2, 0.16, 0.94, M.blue, 0, 1.18, -0.1);
      // Green overhead highway sign
      box(g, 0.9, 0.24, 0.08, M.emerald, 0, 1.4, 0.32);
      // Red-white barrier arms
      box(g, 0.48, 0.06, 0.06, M.red, -0.4, 0.46, 0.22);
      box(g, 0.48, 0.06, 0.06, M.red, 0.4, 0.46, 0.22);
      break;
    }

    // 12. PAJAK JALAN — Overhead ETLE traffic camera gantry + cones!
    case 'etle': {
      box(g, 1.95, 0.1, 1.25, M.asphalt, 0, 0.05, 0);
      // Silver overhead ETLE gantry
      cyl(g, 0.07, 0.09, 1.45, 8, M.silver, -0.78, 0.75, 0);
      cyl(g, 0.07, 0.09, 1.45, 8, M.silver, 0.78, 0.75, 0);
      box(g, 1.72, 0.12, 0.14, M.silver, 0, 1.44, 0);
      // White ETLE speed camera + flashing amber beacon
      box(g, 0.36, 0.24, 0.32, M.white, -0.22, 1.56, 0.08);
      box(g, 0.18, 0.14, 0.1, M.dark, -0.22, 1.56, 0.25);
      const flash = box(g, 0.22, 0.2, 0.2, M.orange, 0.32, 1.56, 0.04);
      animations.push({ type: 'pulse', mesh: flash, speed: 5.5 });
      // Orange traffic cones
      cone(g, 0.14, 0.34, 8, M.orange, -0.45, 0.22, 0.4);
      cone(g, 0.14, 0.34, 8, M.orange, 0.45, 0.22, 0.4);
      break;
    }

    // 13. BANDARA SOETTA — Iconic Joglo-roofed Soekarno-Hatta Terminal + ATC Tower + Mini Airplane!
    case 'airport': {
      // Runway strip
      box(g, 2.1, 0.1, 1.42, M.asphalt, 0, 0.05, 0);
      // ATC Control Tower
      cyl(g, 0.18, 0.26, 1.45, 10, M.white, -0.66, 0.76, -0.25);
      cyl(g, 0.4, 0.26, 0.34, 10, M.glass, -0.66, 1.58, -0.25);
      cyl(g, 0.44, 0.44, 0.08, 10, M.red, -0.66, 1.78, -0.25);
      // Traditional Javanese-inspired Terminal 1/2 terracotta Joglo pavilion
      box(g, 0.85, 0.42, 0.56, M.cream, 0.32, 0.28, -0.32);
      cone(g, 0.65, 0.36, 4, M.terracotta, 0.32, 0.66, -0.32, Math.PI / 4);
      // Mini Garuda-style passenger jet on tarmac!
      const plane = new THREE.Group();
      plane.position.set(0.32, 0.26, 0.34);
      plane.rotation.y = -0.32;
      cyl(plane, 0.11, 0.11, 1.1, 10, M.white, 0, 0, 0, 0, 0, Math.PI / 2);
      box(plane, 0.24, 0.04, 1.05, M.skyBlue, -0.05, -0.02, 0);
      box(plane, 0.18, 0.3, 0.05, M.blue, -0.46, 0.16, 0);
      g.add(plane);
      break;
    }

    // 14. HALTE TRANSJAKARTA — Signature sky-blue elevated BRT shelter + Blue-White Busway!
    case 'transjakarta': {
      box(g, 2.05, 0.12, 1.32, M.asphalt, 0, 0.06, 0);
      // Elevated concrete boarding platform
      box(g, 1.55, 0.3, 0.56, M.silver, -0.1, 0.2, -0.28);
      // Iconic blue-and-white angled canopy shelter
      box(g, 0.08, 0.7, 0.08, M.steel, -0.7, 0.68, -0.45);
      box(g, 0.08, 0.7, 0.08, M.steel, 0.5, 0.68, -0.45);
      box(g, 1.65, 0.16, 0.74, M.skyBlue, -0.1, 1.04, -0.25, -0.12, 0, 0);
      box(g, 1.68, 0.08, 0.16, M.blue, -0.1, 1.12, 0.06);
      // Boxy Blue-White Bus TransJakarta!
      box(g, 1.32, 0.52, 0.44, M.white, 0.08, 0.38, 0.34);
      box(g, 1.34, 0.2, 0.46, M.blue, 0.08, 0.22, 0.34);
      box(g, 1.08, 0.16, 0.46, M.glass, 0.08, 0.46, 0.34);
      break;
    }

    // 15. KAS NEGARA — Heavy armored black vault with spoked silver vault wheel + gold bars!
    case 'vault': {
      box(g, 1.75, 1.38, 1.25, M.dark, 0, 0.69, -0.08);
      box(g, 1.88, 0.18, 1.36, M.steel, 0, 1.44, -0.08);
      // Vault circular steel door & golden wheel handle
      cyl(g, 0.45, 0.45, 0.12, 16, M.silver, 0, 0.7, 0.56, Math.PI / 2);
      cyl(g, 0.24, 0.24, 0.16, 12, M.gold, 0, 0.7, 0.62, Math.PI / 2);
      // Gold bullion bars stacked on roof
      box(g, 0.42, 0.2, 0.24, M.gold, -0.3, 1.62, -0.05);
      box(g, 0.42, 0.2, 0.24, M.gold, 0.25, 1.62, -0.05);
      box(g, 0.42, 0.2, 0.24, M.yellow, -0.02, 1.82, -0.05);
      break;
    }

    // 16. WARUNG MADURA 24J — Striped awning + glass snack etalase + iconic red-blue Pertamini pump!
    case 'madura': {
      // Main tiled warung kiosk
      box(g, 1.38, 0.96, 0.95, M.cream, -0.18, 0.48, -0.12);
      // Colorful striped roof awning (red / yellow / blue!)
      box(g, 1.54, 0.16, 1.22, M.red, -0.18, 1.04, -0.02, 0.14, 0, 0);
      box(g, 0.52, 0.18, 1.24, M.yellow, -0.18, 1.05, -0.02, 0.14, 0, 0);
      // Glass snack etalase filled with colorful merchandise!
      box(g, 1.02, 0.44, 0.28, M.glass, -0.2, 0.44, 0.42);
      box(g, 0.24, 0.22, 0.18, M.orange, -0.5, 0.44, 0.4);
      box(g, 0.24, 0.22, 0.18, M.green, -0.2, 0.44, 0.4);
      box(g, 0.24, 0.22, 0.18, M.yellow, 0.1, 0.44, 0.4);
      // Iconic Red & Blue PERTAMINI 24-Jam fuel kiosk right in front!
      box(g, 0.4, 0.84, 0.34, M.red, 0.72, 0.42, 0.22);
      box(g, 0.42, 0.26, 0.36, M.blue, 0.72, 0.76, 0.22);
      box(g, 0.24, 0.18, 0.06, M.white, 0.72, 0.52, 0.4);
      break;
    }

    // 17. MALIOBORO, JOGJA — Iconic white Tugu Jogja monument + terracotta Joglo roof + green vintage lamp!
    case 'malioboro': {
      // Terracotta pedestrian paving
      box(g, 2.0, 0.12, 1.35, M.sand, 0, 0.06, 0);
      // Iconic TUGU JOGJA (Tugu Pal Putih) with golden pointed pinnacle!
      box(g, 0.62, 0.26, 0.62, M.white, -0.45, 0.24, 0.05);
      box(g, 0.42, 0.92, 0.42, M.white, -0.45, 0.82, 0.05);
      box(g, 0.46, 0.12, 0.46, M.gold, -0.45, 1.24, 0.05);
      cone(g, 0.16, 0.56, 4, M.gold, -0.45, 1.56, 0.05, Math.PI / 4);
      // Javanese Pendopo Joglo pavilion beside it
      box(g, 0.84, 0.46, 0.7, M.wood, 0.46, 0.32, -0.14);
      const joglo1 = cone(g, 0.64, 0.34, 4, M.terracotta, 0.46, 0.7, -0.14, Math.PI / 4);
      joglo1.scale.set(1.04, 1, 0.84);
      cone(g, 0.34, 0.42, 4, M.brick, 0.46, 1.02, -0.14, Math.PI / 4);
      // Classic green Malioboro antique street lamp
      cyl(g, 0.035, 0.05, 0.78, 6, M.darkGreen, 0.62, 0.45, 0.44);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), M.yellow);
      globe.position.set(0.62, 0.88, 0.44);
      g.add(globe);
      break;
    }

    // 18. BRAGA, BANDUNG — Iconic Gedung Sate / Dutch Art Deco Colonial building + sidewalk cafe umbrella!
    case 'braga': {
      box(g, 2.0, 0.12, 1.32, M.silver, 0, 0.06, 0);
      // Art Deco / Gedung Sate symmetrical white colonial facade
      box(g, 1.65, 0.78, 0.78, M.white, -0.08, 0.48, -0.18);
      box(g, 0.64, 1.12, 0.84, M.cream, -0.08, 0.66, -0.18);
      // Tiered dark roof + signature "Tusuk Sate" pinnacle spire!
      cone(g, 0.52, 0.36, 4, M.dark, -0.08, 1.38, -0.18, Math.PI / 4);
      cyl(g, 0.03, 0.03, 0.55, 6, M.gold, -0.08, 1.76, -0.18);
      // Tiny golden "sate" orbs along spire!
      [1.64, 1.78, 1.92].forEach((sy) => {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), M.gold);
        orb.position.set(-0.08, sy, -0.18);
        g.add(orb);
      });
      // Cute Braga sidewalk cafe umbrella
      cyl(g, 0.03, 0.03, 0.52, 6, M.darkWood, 0.66, 0.32, 0.38);
      cone(g, 0.34, 0.18, 8, M.crimson, 0.66, 0.6, 0.38);
      break;
    }

    // 20. PDAM — Classic elevated blue municipal Water Tower on 4 steel truss legs!
    case 'pdam': {
      // Concrete base & 4 steel legs
      box(g, 1.25, 0.16, 1.25, M.silver, 0, 0.08, 0);
      [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]].forEach(([lx, lz]) => {
        cyl(g, 0.06, 0.08, 1.15, 6, M.steel, lx, 0.66, lz);
      });
      // Giant blue cylindrical water reservoir tank + domed cap
      cyl(g, 0.64, 0.64, 0.88, 16, M.skyBlue, 0, 1.52, 0);
      cyl(g, 0.67, 0.67, 0.12, 16, M.blue, 0, 1.52, 0);
      cone(g, 0.66, 0.34, 16, M.white, 0, 2.12, 0);
      break;
    }

    // 21. PIK 2, JAKARTA — Iconic Pantjoran PIK Crimson & Gold Pagoda + Coastal Water + Palm!
    case 'pik2': {
      // Coastal waterfront base
      box(g, 2.05, 0.12, 1.38, M.lagoon, 0, 0.06, 0);
      box(g, 1.48, 0.2, 1.0, M.cream, -0.16, 0.14, -0.1);
      // Multi-tiered Pantjoran PIK Red & Gold Pagoda!
      box(g, 0.84, 0.45, 0.68, M.crimson, -0.2, 0.46, -0.12);
      const pRoof1 = cone(g, 0.72, 0.25, 4, M.gold, -0.2, 0.8, -0.12, Math.PI / 4);
      pRoof1.scale.set(1.02, 1, 0.84);
      box(g, 0.58, 0.38, 0.5, M.red, -0.2, 1.04, -0.12);
      const pRoof2 = cone(g, 0.54, 0.22, 4, M.gold, -0.2, 1.32, -0.12, Math.PI / 4);
      pRoof2.scale.set(1.02, 1, 0.84);
      box(g, 0.38, 0.3, 0.34, M.crimson, -0.2, 1.52, -0.12);
      cone(g, 0.36, 0.28, 4, M.yellow, -0.2, 1.8, -0.12, Math.PI / 4);
      // Waterfront palm tree
      addMiniPalm(g, M, 0.72, 0.22, 0.9);
      break;
    }

    // 22. SCBD, SUDIRMAN — Trio of sleek glass-and-steel skyscrapers with glowing skybridge!
    case 'scbd': {
      box(g, 2.0, 0.12, 1.35, M.asphalt, 0, 0.06, 0);
      // Left sleek glass tower
      box(g, 0.58, 1.65, 0.58, M.glass, -0.58, 0.92, -0.12);
      box(g, 0.62, 0.1, 0.62, M.steel, -0.58, 1.76, -0.12);
      // Tall center flagship skyscraper (District 8 / Treasury Tower vibe!)
      box(g, 0.68, 2.35, 0.68, M.skyBlue, 0.06, 1.26, -0.18);
      box(g, 0.44, 0.35, 0.44, M.glass, 0.06, 2.55, -0.18);
      cyl(g, 0.025, 0.035, 0.48, 6, M.silver, 0.06, 2.92, -0.18);
      // Right angular dark corporate tower
      box(g, 0.56, 1.38, 0.56, M.blue, 0.68, 0.78, 0.1);
      // Glowing glass skybridge connecting left & center towers!
      box(g, 0.48, 0.18, 0.22, M.white, -0.26, 1.24, -0.15);
      break;
    }

    // 23. OTT KPK! — Police SUV & checkpoint with alternating flashing Red/Blue Sirens!
    case 'siren': {
      box(g, 2.0, 0.12, 1.36, M.asphalt, 0, 0.06, 0);
      // Yellow-black police line posts
      box(g, 1.85, 0.07, 0.05, M.yellow, 0, 0.38, 0.52);
      // Police tactical SUV van
      box(g, 1.36, 0.52, 0.66, M.dark, 0, 0.38, -0.05);
      box(g, 0.88, 0.34, 0.62, M.white, -0.06, 0.78, -0.05);
      // Flashing red & blue roof lightbar!
      const redLamp = box(g, 0.24, 0.18, 0.22, M.sirenRed, -0.18, 1.04, -0.05);
      const blueLamp = box(g, 0.24, 0.18, 0.22, M.sirenBlue, 0.14, 1.04, -0.05);
      animations.push({ type: 'siren', red: redLamp, blue: blueLamp });
      break;
    }

    // 24. SEMINYAK, BALI — Luxury thatched tropical Villa + infinity pool + pink/orange sunset beanbags!
    case 'seminyak': {
      box(g, 2.0, 0.12, 1.38, M.sand, 0, 0.06, 0);
      // White luxury villa with alang-alang thatched hipped roof
      box(g, 0.98, 0.56, 0.68, M.white, -0.36, 0.37, -0.22);
      const semRoof = cone(g, 0.76, 0.5, 4, M.thatch, -0.36, 0.9, -0.22, Math.PI / 4);
      semRoof.scale.set(1.06, 1, 0.76);
      // Shimmering turquoise infinity pool
      box(g, 0.84, 0.16, 0.72, M.lagoon, 0.54, 0.1, 0.12);
      // Iconic Seminyak beach club colorful beanbags!
      const bb1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M.pink);
      bb1.scale.set(1.2, 0.65, 1.2);
      bb1.position.set(-0.55, 0.2, 0.42);
      const bb2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M.orange);
      bb2.scale.set(1.2, 0.65, 1.2);
      bb2.position.set(-0.14, 0.2, 0.46);
      g.add(bb1, bb2);
      addMiniPalm(g, M, 0.76, -0.4, 0.9);
      break;
    }

    // 25. DANAU TOBA, SUMUT — Iconic Batak Rumah Bolon sweeping curved saddle roof beside blue lake!
    case 'toba': {
      // Shimmering Lake Toba blue water + lush Samosir green shore
      box(g, 2.05, 0.12, 1.38, M.water, 0, 0.06, 0);
      box(g, 1.45, 0.2, 0.95, M.green, -0.22, 0.14, -0.14);
      // Iconic Batak Rumah Bolon stilts & timber body
      box(g, 0.85, 0.36, 0.56, M.darkWood, -0.22, 0.42, -0.14);
      // Signature sweeping upturned saddle roof (two tilted angled wings forming the curved Batak peak!)
      box(g, 0.78, 0.52, 0.78, M.darkWood, -0.52, 0.82, -0.14, 0, 0, 0.48);
      box(g, 0.78, 0.52, 0.78, M.darkWood, 0.08, 0.82, -0.14, 0, 0, -0.48);
      // Traditional Red-White-Black Batak Gorga front gable stripe
      box(g, 0.88, 0.12, 0.08, M.red, -0.22, 0.62, 0.18);
      box(g, 0.88, 0.08, 0.08, M.white, -0.22, 0.72, 0.18);
      // Volcanic green hill (Pulau Samosir) in corner
      cone(g, 0.48, 0.72, 7, M.emerald, 0.68, 0.42, -0.28);
      break;
    }

    // 27. KERETA CEPAT WHOOSH — Elevated viaduct + sleek silver-red aerodynamic Whoosh bullet train!
    case 'train': {
      // Elevated white viaduct piers & track deck
      box(g, 0.24, 0.55, 0.36, M.silver, -0.72, 0.28, 0);
      box(g, 0.24, 0.55, 0.36, M.silver, 0.72, 0.28, 0);
      box(g, 2.15, 0.18, 0.62, M.cream, 0, 0.62, 0);
      // Iconic KCIC Whoosh silver-white bullet train with red aerodynamic nose & stripe!
      box(g, 1.55, 0.42, 0.42, M.white, -0.1, 0.92, 0);
      box(g, 1.58, 0.12, 0.44, M.red, -0.1, 0.86, 0);
      box(g, 1.25, 0.12, 0.44, M.dark, -0.12, 1.0, 0);
      // Aerodynamic pointed red-white nose cone
      const nose = cone(g, 0.24, 0.52, 8, M.red, 0.92, 0.9, 0);
      nose.rotation.z = -Math.PI / 2;
      break;
    }

    // 28. PAJAK BARANG MEWAH — Velvet pedestal with giant sparkling diamond & luxury gift box!
    case 'pajak_mewah': {
      cyl(g, 0.55, 0.68, 0.38, 12, M.darkRed, -0.35, 0.19, 0);
      cyl(g, 0.58, 0.58, 0.08, 12, M.gold, -0.35, 0.4, 0);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), M.diamond);
      gem.position.set(-0.35, 0.92, 0);
      g.add(gem);
      animations.push({ type: 'spin', mesh: gem, speed: 1.6 });
      // Luxury boutique box with golden ribbon
      box(g, 0.68, 0.56, 0.58, M.orange, 0.54, 0.28, 0.12);
      box(g, 0.72, 0.12, 0.62, M.gold, 0.54, 0.58, 0.12);
      box(g, 0.12, 0.62, 0.62, M.gold, 0.54, 0.32, 0.12);
      break;
    }

    // 29. RAJA AMPAT, PAPUA — Iconic emerald steep Wayag/Piaynemo karst islands in turquoise lagoon + bobbing boat!
    case 'raja_ampat': {
      // Crystal clear turquoise Papua lagoon
      box(g, 2.1, 0.14, 1.42, M.lagoon, 0, 0.07, 0);
      // Cluster of iconic steep emerald mushroom/dome karst limestone islands!
      const islets = [
        [-0.58, -0.26, 0.36, 0.92],
        [0.06, -0.32, 0.42, 1.15],
        [0.64, -0.18, 0.32, 0.78],
        [-0.32, 0.26, 0.26, 0.58],
      ];
      islets.forEach(([ix, iz, ir, ih]) => {
        // Limestone cliff base
        cyl(g, ir * 0.78, ir * 0.65, ih * 0.35, 10, M.cream, ix, 0.14 + ih * 0.17, iz);
        // Lush emerald domed jungle cap
        const cap = new THREE.Mesh(new THREE.SphereGeometry(ir, 10, 8), M.emerald);
        cap.scale.set(1, ih / (ir * 1.5), 1);
        cap.position.set(ix, 0.14 + ih * 0.58, iz);
        cap.castShadow = true;
        g.add(cap);
      });
      // Tiny wooden boat gently bobbing in the lagoon!
      const boat = new THREE.Group();
      box(boat, 0.46, 0.12, 0.2, M.white, 0, 0, 0);
      box(boat, 0.24, 0.12, 0.18, M.blue, 0.04, 0.1, 0);
      boat.position.set(0.38, 0.2, 0.38);
      boat.rotation.y = 0.4;
      g.add(boat);
      animations.push({ type: 'bob', mesh: boat, baseY: 0.2, amp: 0.05, speed: 2.4, phase: 0.8 });
      break;
    }

    // 30. IKN NUSANTARA — Unmistakable Istana Garuda silhouette (swept bronze/teal Garuda wings over green hills!)
    case 'ikn': {
      // Lush green Kalimantan terraced hillside
      box(g, 2.08, 0.18, 1.4, M.green, 0, 0.09, 0);
      box(g, 1.58, 0.22, 0.95, M.emerald, 0, 0.26, -0.14);
      // Central Istana Negara white palace podium
      box(g, 1.18, 0.44, 0.6, M.white, 0, 0.56, -0.12);
      // Majestic swept-up GARUDA WINGS (patina teal-bronze feathers!)
      [-1, 1].forEach((side) => {
        for (let f = 0; f < 4; f++) {
          const wing = box(
            g,
            0.55 + f * 0.12,
            0.14,
            0.18,
            f % 2 === 0 ? M.garudaTeal : M.bronze,
            side * (0.28 + f * 0.16),
            0.84 + f * 0.24,
            -0.22
          );
          wing.rotation.z = side * (0.34 + f * 0.11);
        }
      });
      // Golden Garuda head crest at center peak
      cone(g, 0.22, 0.55, 4, M.gold, 0, 1.38, -0.18, Math.PI / 4);
      break;
    }

    // 31. MENTENG, JAKARTA — Grand white colonial heritage mansion + manicured hedges + luxury black sedan!
    case 'menteng': {
      // Manicured green estate lawn & paved driveway
      box(g, 2.05, 0.12, 1.38, M.green, 0, 0.06, 0);
      box(g, 0.52, 0.14, 0.68, M.silver, 0.56, 0.07, 0.32);
      // Grand white heritage villa + portico columns
      box(g, 1.45, 0.88, 0.82, M.white, -0.16, 0.54, -0.18);
      for (let cx = -0.68; cx <= 0.36; cx += 0.35) {
        cyl(g, 0.05, 0.055, 0.82, 8, M.cream, cx, 0.52, 0.26);
      }
      // Wide terracotta colonial hipped roof
      const menRoof = cone(g, 1.02, 0.52, 4, M.terracotta, -0.16, 1.22, -0.18, Math.PI / 4);
      menRoof.scale.set(1.12, 1, 0.64);
      // Trimmed garden hedge along front gate
      box(g, 1.05, 0.24, 0.18, M.darkGreen, -0.4, 0.22, 0.52);
      // Sleek black luxury sedan parked in driveway!
      box(g, 0.42, 0.16, 0.24, M.dark, 0.56, 0.22, 0.36);
      box(g, 0.24, 0.13, 0.2, M.steel, 0.56, 0.34, 0.36);
      break;
    }

    // 32. CANDI BOROBUDUR, MAGELANG — Stepped volcanic stone pyramid + central bell stupa & 4 mini stupas!
    case 'borobudur': {
      box(g, 2.0, 0.12, 1.38, M.green, 0, 0.06, 0);
      // 3 stepped volcanic andesite square terraces
      box(g, 1.56, 0.24, 1.18, M.stone, 0, 0.24, -0.04);
      box(g, 1.18, 0.24, 0.9, M.darkStone, 0, 0.48, -0.04);
      box(g, 0.82, 0.22, 0.64, M.stone, 0, 0.71, -0.04);
      // Circular Arupadhatu terrace + iconic grand central bell stupa!
      cyl(g, 0.36, 0.42, 0.16, 12, M.darkStone, 0, 0.88, -0.04);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), M.stone);
      dome.position.set(0, 1.08, -0.04);
      dome.castShadow = true;
      g.add(dome);
      cyl(g, 0.03, 0.06, 0.32, 6, M.darkStone, 0, 1.42, -0.04);
      // 4 surrounding bell stupas
      [[-0.44, -0.34], [0.44, -0.34], [-0.44, 0.26], [0.44, 0.26]].forEach(([sx, sz]) => {
        cone(g, 0.11, 0.28, 8, M.stone, sx, 0.72, sz);
      });
      break;
    }

    // 33. CANDI PRAMBANAN, SLEMAN — Soaring trio of spiky dark volcanic Hindu candi spires!
    case 'prambanan': {
      box(g, 2.0, 0.12, 1.36, M.green, 0, 0.06, 0);
      box(g, 1.82, 0.16, 1.05, M.sand, 0, 0.16, -0.06);
      const buildCandiTower = (cx, cz, h, w) => {
        box(g, w, h * 0.38, w, M.darkStone, cx, 0.24 + h * 0.19, cz);
        box(g, w * 0.74, h * 0.28, w * 0.74, M.stone, cx, 0.24 + h * 0.52, cz);
        cone(g, w * 0.54, h * 0.44, 4, M.darkStone, cx, 0.24 + h * 0.84, cz, Math.PI / 4);
      };
      // Central towering Candi Siwa + flanking Brahma & Wisnu
      buildCandiTower(0, -0.1, 1.85, 0.56);
      buildCandiTower(-0.62, -0.04, 1.38, 0.44);
      buildCandiTower(0.62, -0.04, 1.38, 0.44);
      break;
    }

    // 34. GUNUNG BROMO, JATIM — Sea of sand + smoking volcano caldera + Teletubbies hill + tourist Jeep!
    case 'bromo': {
      // Iconic Lautan Pasir Bromo (sea of volcanic sand)
      box(g, 2.04, 0.12, 1.38, M.ochre, 0, 0.06, 0);
      // Iconic truncated Bromo volcano cone + dark crater rim
      cyl(g, 0.32, 0.66, 0.96, 12, M.mud, -0.26, 0.58, -0.16);
      cyl(g, 0.24, 0.24, 0.08, 12, M.dark, -0.26, 1.04, -0.16);
      // Animated volcanic steam puff rising from Bromo crater!
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), M.white);
      puff.position.set(-0.26, 1.28, -0.16);
      g.add(puff);
      animations.push({ type: 'bob', mesh: puff, baseY: 1.28, amp: 0.12, speed: 2.0, phase: 0.4 });
      // Lush green Bukit Teletubbies hill beside Bromo
      const hill = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), M.green);
      hill.scale.set(1.1, 0.85, 0.9);
      hill.position.set(0.56, 0.34, -0.22);
      g.add(hill);
      // Classic bright red Bromo Hardtop Jeep on the sand!
      box(g, 0.42, 0.18, 0.24, M.red, 0.38, 0.22, 0.38);
      box(g, 0.24, 0.14, 0.22, M.white, 0.34, 0.36, 0.38);
      break;
    }

    // 35. KAWAH IJEN, BANYUWANGI — Dark crater ridges + turquoise acid lake + glowing BLUE FIRE!
    case 'ijen': {
      box(g, 2.02, 0.14, 1.38, M.darkStone, 0, 0.07, 0);
      // Rocky crater ridge
      cone(g, 0.58, 0.86, 7, M.stone, -0.45, 0.5, -0.22);
      cone(g, 0.52, 0.72, 7, M.darkStone, 0.48, 0.42, -0.26);
      // Surreal turquoise sulfuric crater lake
      cyl(g, 0.62, 0.62, 0.14, 14, M.sulfur, 0.04, 0.16, 0.12);
      // Glowing electric BLUE FIRE flames along crater edge!
      [[-0.3, 0.22], [-0.14, 0.3], [-0.36, 0.08]].forEach(([fx, fz], i) => {
        const flame = cone(g, 0.09, 0.32, 6, M.blueFire, fx, 0.36, fz);
        animations.push({ type: 'pulse', mesh: flame, speed: 4.5 + i * 1.1 });
      });
      // Yellow sulfur chunks
      box(g, 0.2, 0.12, 0.16, M.yellow, 0.52, 0.18, 0.34);
      break;
    }

    // 36. KOTA TUA, JAKARTA — Colonial Museum Fatahillah + domed bell tower + colorful sepeda onthel!
    case 'kotatua': {
      box(g, 2.04, 0.12, 1.38, M.silver, 0, 0.06, 0);
      // Museum Fatahillah main symmetrical colonial white building
      box(g, 1.72, 0.82, 0.72, M.white, 0, 0.52, -0.22);
      box(g, 1.78, 0.28, 0.78, M.terracotta, 0, 1.06, -0.22);
      // Central ochre/white Dutch clock cupola
      box(g, 0.34, 0.38, 0.34, M.cream, 0, 1.32, -0.22);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), M.dark);
      dome.position.set(0, 1.56, -0.22);
      g.add(dome);
      // Cute pastel sepeda onthel bikes parked on Taman Fatahillah plaza!
      [[-0.45, M.pink], [0.05, M.yellow], [0.55, M.teal]].forEach(([bx, col]) => {
        box(g, 0.3, 0.14, 0.06, col, bx, 0.24, 0.42);
        cyl(g, 0.08, 0.08, 0.04, 8, M.dark, bx - 0.1, 0.18, 0.42, Math.PI / 2);
        cyl(g, 0.08, 0.08, 0.04, 8, M.dark, bx + 0.1, 0.18, 0.42, Math.PI / 2);
      });
      break;
    }

    // 37. ANCOL, JAKARTA — Sandy waterfront + spinning colorful Bianglala Dufan Ferris wheel!
    case 'ancol': {
      box(g, 2.04, 0.12, 1.38, M.water, 0, 0.06, 0);
      box(g, 1.9, 0.16, 0.9, M.sand, 0, 0.1, -0.2);
      // A-frame support legs for Bianglala
      box(g, 0.1, 1.15, 0.1, M.white, -0.26, 0.65, -0.15, 0, 0, -0.22);
      box(g, 0.1, 1.15, 0.1, M.white, 0.26, 0.65, -0.15, 0, 0, 0.22);
      // Spinning Bianglala Ferris wheel with colorful gondolas!
      const wheel = new THREE.Group();
      wheel.position.set(0, 1.12, -0.15);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 16), M.yellow);
      wheel.add(rim);
      const cabColors = [M.red, M.skyBlue, M.pink, M.green, M.orange, M.purple];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        box(wheel, 0.03, 1.24, 0.03, M.white, 0, 0, 0, 0, 0, a);
        box(wheel, 0.16, 0.16, 0.16, cabColors[i], Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.04);
      }
      g.add(wheel);
      animations.push({ type: 'spinZ', mesh: wheel, speed: 0.9 });
      addMiniPalm(g, M, 0.78, 0.24, 0.8);
      break;
    }

    // 38. JEMBATAN AMPERA, PALEMBANG — Blue Musi River + unmistakable twin tall RED steel bridge towers!
    case 'ampera': {
      box(g, 2.08, 0.14, 1.38, M.water, 0, 0.07, 0);
      // Elevated road deck spanning Sungai Musi
      box(g, 2.06, 0.14, 0.46, M.asphalt, 0, 0.46, 0);
      // Iconic twin tall RED Ampera Bridge towers!
      [-0.56, 0.56].forEach((tx) => {
        box(g, 0.14, 1.48, 0.12, M.red, tx, 0.82, -0.22);
        box(g, 0.14, 1.48, 0.12, M.red, tx, 0.82, 0.22);
        box(g, 0.18, 0.16, 0.56, M.crimson, tx, 1.48, 0);
        box(g, 0.16, 0.1, 0.54, M.red, tx, 1.05, 0);
      });
      // Top connecting red bridge truss beam
      box(g, 1.24, 0.14, 0.42, M.red, 0, 1.42, 0);
      break;
    }

    // 39. JAM GADANG, BUKITTINGGI — White clock tower topped with iconic Minangkabau Gonjong roof!
    case 'jam_gadang': {
      box(g, 1.98, 0.12, 1.34, M.green, 0, 0.06, 0);
      box(g, 1.15, 0.16, 1.0, M.silver, 0, 0.16, 0);
      // Iconic white tapering clock tower shaft
      box(g, 0.66, 0.48, 0.66, M.white, 0, 0.48, 0);
      box(g, 0.56, 0.86, 0.56, M.white, 0, 1.12, 0);
      // Clock face on front & back
      cyl(g, 0.18, 0.18, 0.06, 14, M.cream, 0, 1.28, 0.28, Math.PI / 2);
      cyl(g, 0.12, 0.12, 0.08, 12, M.dark, 0, 1.28, 0.29, Math.PI / 2);
      // Iconic upturned curved Minangkabau GONJONG horn roof!
      box(g, 0.72, 0.14, 0.72, M.darkRed, 0, 1.6, 0);
      cone(g, 0.18, 0.54, 4, M.dark, -0.28, 1.88, 0, Math.PI / 4).rotation.z = 0.42;
      cone(g, 0.18, 0.54, 4, M.dark, 0.28, 1.88, 0, Math.PI / 4).rotation.z = -0.42;
      break;
    }

    // 40. PASAR TERAPUNG, BANJARMASIN — River + colorful wooden klotok boats loaded with fruits!
    case 'pasar_terapung': {
      box(g, 2.06, 0.14, 1.38, M.water, 0, 0.07, 0);
      // Wooden riverbank pier
      box(g, 0.5, 0.22, 1.2, M.wood, -0.76, 0.16, 0);
      const boats = [
        [-0.08, -0.28, 0.25, M.red, M.orange],
        [0.42, 0.18, -0.4, M.green, M.yellow],
        [-0.22, 0.34, 0.55, M.yellow, M.pink],
      ];
      boats.forEach(([bx, bz, ry, c1, c2], i) => {
        const b = new THREE.Group();
        box(b, 0.72, 0.14, 0.28, M.darkWood, 0, 0, 0);
        // Fruit & veggie baskets + traditional vendor conical cap (tanggui/caping)
        box(b, 0.2, 0.14, 0.2, c1, -0.14, 0.12, 0);
        box(b, 0.2, 0.14, 0.2, c2, 0.08, 0.12, 0);
        cone(b, 0.12, 0.1, 8, M.thatch, 0.22, 0.24, 0);
        b.position.set(bx, 0.18, bz);
        b.rotation.y = ry;
        g.add(b);
        animations.push({ type: 'bob', mesh: b, baseY: 0.18, amp: 0.04, speed: 2.2 + i * 0.4, phase: i * 1.5 });
      });
      break;
    }

    // 41. TANA TORAJA, SULSEL — Iconic Rumah Tongkonan dramatic boat-shaped swooping roof!
    case 'toraja': {
      box(g, 2.04, 0.12, 1.38, M.green, 0, 0.06, 0);
      // Wooden stilts & carved red-black Tongkonan house body
      box(g, 0.78, 0.34, 0.56, M.darkWood, 0, 0.32, 0);
      box(g, 0.82, 0.34, 0.58, M.crimson, 0, 0.64, 0);
      box(g, 0.84, 0.08, 0.6, M.gold, 0, 0.74, 0);
      // Dramatic high upturned Tongkonan boat roof wings!
      box(g, 0.9, 0.26, 0.68, M.dark, -0.42, 1.06, 0, 0, 0, 0.62);
      box(g, 0.9, 0.26, 0.68, M.dark, 0.42, 1.06, 0, 0, 0, -0.62);
      box(g, 0.62, 0.2, 0.68, M.darkWood, 0, 0.88, 0);
      // Front pillar holding upturned gable
      cyl(g, 0.05, 0.06, 1.02, 6, M.wood, -0.78, 0.62, 0);
      cyl(g, 0.05, 0.06, 1.02, 6, M.wood, 0.78, 0.62, 0);
      break;
    }

    // 42. PANTAI LOSARI, MAKASSAR — Sunset seafront + colorful Masjid 99 Kubah (orange/red/yellow domes)!
    case 'losari': {
      box(g, 2.06, 0.12, 1.38, M.water, 0, 0.06, 0);
      box(g, 1.88, 0.18, 0.94, M.cream, 0, 0.14, -0.18);
      // Base mosque hall
      box(g, 1.32, 0.44, 0.76, M.white, 0, 0.42, -0.18);
      // Iconic stepped rainbow warm domes (Masjid 99 Kubah!)
      const domes = [
        [0, 0.82, -0.18, 0.32, M.red],
        [-0.42, 0.74, -0.18, 0.22, M.orange],
        [0.42, 0.74, -0.18, 0.22, M.orange],
        [-0.26, 0.72, 0.06, 0.16, M.yellow],
        [0.26, 0.72, 0.06, 0.16, M.yellow],
        [0, 0.72, 0.12, 0.18, M.orange],
      ];
      domes.forEach(([dx, dy, dz, r, mat]) => {
        const d = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        d.position.set(dx, dy, dz);
        d.castShadow = true;
        g.add(d);
      });
      // Golden Losari waterfront sunset balustrade
      box(g, 1.8, 0.14, 0.08, M.orange, 0, 0.28, 0.32);
      break;
    }

    // 43. LABUAN BAJO, NTT — Iconic Pulau Padar twin hills + bobbing traditional Kapal Phinisi!
    case 'labuan_bajo': {
      box(g, 2.08, 0.12, 1.38, M.lagoon, 0, 0.06, 0);
      // Sculpted golden-green Pulau Padar hills
      cone(g, 0.56, 0.94, 7, M.ochre, -0.52, 0.52, -0.22);
      cone(g, 0.42, 0.7, 7, M.lime, -0.12, 0.4, -0.34);
      // Graceful wooden two-masted KAPAL PHINISI sailboat bobbing in bay!
      const ship = new THREE.Group();
      box(ship, 0.82, 0.18, 0.28, M.darkWood, 0, 0, 0);
      cyl(ship, 0.025, 0.03, 0.88, 6, M.wood, -0.12, 0.48, 0);
      cyl(ship, 0.025, 0.03, 0.68, 6, M.wood, 0.18, 0.38, 0);
      // White billowing triangular Phinisi sails!
      cone(ship, 0.22, 0.62, 3, M.white, -0.12, 0.56, 0.02);
      cone(ship, 0.18, 0.48, 3, M.cream, 0.18, 0.46, 0.02);
      ship.position.set(0.42, 0.2, 0.22);
      ship.rotation.y = -0.35;
      g.add(ship);
      animations.push({ type: 'bob', mesh: ship, baseY: 0.2, amp: 0.05, speed: 2.1, phase: 0.5 });
      break;
    }

    // 44. GILI TRAWANGAN, LOMBOK — White sand isle + turquoise sea + iconic wooden Ocean Swing!
    case 'gili': {
      box(g, 2.06, 0.12, 1.38, M.lagoon, 0, 0.06, 0);
      cyl(g, 0.68, 0.78, 0.18, 12, M.sand, -0.38, 0.14, -0.12);
      addMiniPalm(g, M, -0.58, -0.22, 0.95);
      // Cute bamboo beach hut
      box(g, 0.52, 0.34, 0.42, M.wood, -0.12, 0.36, -0.2);
      cone(g, 0.42, 0.3, 4, M.thatch, -0.12, 0.66, -0.2, Math.PI / 4);
      // Iconic Gili Trawangan Wooden OCEAN SWING standing in shallow water!
      cyl(g, 0.035, 0.04, 0.85, 6, M.wood, 0.42, 0.48, 0.22);
      cyl(g, 0.035, 0.04, 0.85, 6, M.wood, 0.88, 0.48, 0.22);
      box(g, 0.58, 0.07, 0.07, M.wood, 0.65, 0.9, 0.22);
      box(g, 0.26, 0.05, 0.12, M.cream, 0.65, 0.38, 0.22);
      break;
    }

    // 45. UBUD, BALI — Lush stepped Tegalalang Rice Terraces + tiered Balinese Meru shrine!
    case 'ubud': {
      // Stepped curved-feel lush green rice paddies climbing uphill
      box(g, 2.04, 0.16, 1.38, M.lime, 0, 0.08, 0);
      box(g, 1.84, 0.22, 1.05, M.green, 0, 0.24, -0.14);
      box(g, 1.56, 0.24, 0.72, M.emerald, 0, 0.44, -0.28);
      box(g, 1.18, 0.24, 0.44, M.darkGreen, 0, 0.64, -0.4);
      // Tiered Balinese Pura Meru pagoda on the ridge
      box(g, 0.32, 0.3, 0.32, M.brick, -0.35, 0.88, -0.4);
      cone(g, 0.28, 0.22, 4, M.dark, -0.35, 1.12, -0.4, Math.PI / 4);
      cone(g, 0.2, 0.22, 4, M.dark, -0.35, 1.32, -0.4, Math.PI / 4);
      addMiniPalm(g, M, 0.66, 0.18, 0.9);
      break;
    }

    // 46. LAWANG SEWU, SEMARANG — Iconic red-brick & cream Dutch colonial building + twin domed towers!
    case 'lawang_sewu': {
      box(g, 2.04, 0.12, 1.36, M.green, 0, 0.06, 0);
      // Cream-and-brick long gallery with dark arched windows ("thousand doors")
      box(g, 1.72, 0.76, 0.72, M.cream, 0, 0.48, -0.12);
      box(g, 1.78, 0.26, 0.78, M.terracotta, 0, 0.98, -0.12);
      for (let wx = -0.6; wx <= 0.6; wx += 0.24) {
        box(g, 0.1, 0.42, 0.05, M.brick, wx, 0.44, 0.25);
      }
      // Signature twin domed corner towers of Lawang Sewu!
      [-0.78, 0.78].forEach((tx) => {
        box(g, 0.36, 1.12, 0.42, M.cream, tx, 0.66, -0.06);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.dark);
        cap.position.set(tx, 1.32, -0.06);
        g.add(cap);
        cyl(g, 0.02, 0.03, 0.28, 6, M.gold, tx, 1.58, -0.06);
      });
      break;
    }

    // 47. TUGU PAHLAWAN, SURABAYA — Tall slender fluted white inverted-nail monument + Sura & Baya!
    case 'surabaya': {
      box(g, 2.0, 0.12, 1.36, M.green, 0, 0.06, 0);
      // Stepped plaza base + soaring white Tugu Pahlawan obelisk
      cyl(g, 0.5, 0.62, 0.2, 10, M.silver, -0.3, 0.18, -0.12);
      cyl(g, 0.08, 0.28, 1.85, 10, M.white, -0.3, 1.18, -0.12);
      // Iconic Surabaya Sura (blue shark) & Baya (green crocodile) twisting statue!
      cyl(g, 0.24, 0.28, 0.18, 10, M.cream, 0.54, 0.18, 0.2);
      box(g, 0.18, 0.66, 0.18, M.emerald, 0.46, 0.56, 0.2, 0, 0, -0.22);
      box(g, 0.18, 0.64, 0.18, M.skyBlue, 0.62, 0.56, 0.2, 0, 0, 0.22);
      break;
    }

    // 48. MASJID BAITURRAHMAN, ACEH — Gleaming white mosque with jet-black domes + giant courtyard umbrellas!
    case 'aceh': {
      box(g, 2.06, 0.12, 1.38, M.cream, 0, 0.06, 0);
      // Gleaming white mosque hall
      box(g, 1.48, 0.64, 0.84, M.white, -0.1, 0.42, -0.18);
      // Unmistakable jet-black Baiturrahman domes!
      const mainDome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), M.dark);
      mainDome.position.set(-0.1, 0.86, -0.18);
      g.add(mainDome);
      [-0.54, 0.34].forEach((dx) => {
        const sd = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), M.dark);
        sd.position.set(dx, 0.8, -0.18);
        g.add(sd);
      });
      // Tall white minaret
      cyl(g, 0.08, 0.12, 1.48, 8, M.white, 0.78, 0.82, -0.32);
      cone(g, 0.11, 0.22, 8, M.dark, 0.78, 1.64, -0.32);
      // Iconic white Nabawi-style electric courtyard umbrellas!
      [-0.45, 0.25].forEach((ux) => {
        cyl(g, 0.025, 0.025, 0.42, 6, M.silver, ux, 0.3, 0.42);
        cone(g, 0.24, 0.12, 8, M.white, ux, 0.52, 0.42);
      });
      break;
    }

    // 49. DANAU KELIMUTU, FLORES — Volcanic mountain with 3 unmistakable TRI-COLORED crater lakes!
    case 'kelimutu': {
      box(g, 2.06, 0.16, 1.38, M.emerald, 0, 0.08, 0);
      // Mountain plateau ridges
      cyl(g, 0.78, 0.98, 0.46, 12, M.darkStone, 0, 0.34, -0.05);
      // The 3 iconic differently colored volcanic lakes of Kelimutu!
      cyl(g, 0.28, 0.28, 0.08, 12, M.lagoon, -0.38, 0.58, -0.12); // Tiwu Nuwa Muri Koo Fai (turquoise)
      cyl(g, 0.26, 0.26, 0.08, 12, M.green, 0.28, 0.58, -0.18);   // Tiwu Ata Polo (emerald green)
      cyl(g, 0.24, 0.24, 0.08, 12, M.darkRed, 0.04, 0.58, 0.28);  // Tiwu Ata Mbupu (dark crimson/black)
      break;
    }

    // 50. BUNAKEN, MANADO — Crystal clear marine park + vibrant coral reef + glass-bottom boat!
    case 'bunaken': {
      box(g, 2.06, 0.14, 1.38, M.water, 0, 0.07, 0);
      // Colorful tropical coral formations peeking above turquoise shoal
      [[-0.58, -0.22, M.pink], [-0.28, -0.32, M.orange], [0.05, -0.18, M.purple], [-0.46, 0.18, M.yellow], [0.58, -0.26, M.teal]].forEach(([cx, cz, mat]) => {
        const coral = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), mat);
        coral.position.set(cx, 0.24, cz);
        g.add(coral);
      });
      // Glass-bottom snorkeling boat gently bobbing!
      const boat = new THREE.Group();
      box(boat, 0.68, 0.16, 0.3, M.white, 0, 0, 0);
      box(boat, 0.42, 0.04, 0.26, M.blue, 0, 0.32, 0);
      cyl(boat, 0.02, 0.02, 0.26, 6, M.silver, -0.18, 0.18, 0);
      cyl(boat, 0.02, 0.02, 0.26, 6, M.silver, 0.18, 0.18, 0);
      boat.position.set(0.32, 0.22, 0.32);
      boat.rotation.y = 0.25;
      g.add(boat);
      animations.push({ type: 'bob', mesh: boat, baseY: 0.22, amp: 0.05, speed: 2.3, phase: 1.1 });
      break;
    }

    // 51. KAWAH PUTIH, CIWIDEY — Milky white-turquoise volcanic lake + wooden photo jetty + white cantigi trees!
    case 'kawah_putih': {
      box(g, 2.04, 0.14, 1.38, M.cream, 0, 0.07, 0);
      cyl(g, 0.72, 0.72, 0.16, 14, M.sulfur, 0.12, 0.1, 0.06);
      // Iconic wooden boardwalk jetty extending into milky lake!
      box(g, 0.92, 0.08, 0.24, M.wood, -0.3, 0.22, 0.18, 0, -0.2, 0);
      // Pale twisted Cantigi mountain trees on misty rim
      [-0.74, -0.52, 0.76].forEach((tx, i) => {
        cyl(g, 0.03, 0.05, 0.65 + i * 0.08, 6, M.silver, tx, 0.42, -0.35 + (i % 2) * 0.25, 0.1, 0, (i - 1) * 0.2);
      });
      cone(g, 0.42, 0.56, 7, M.stone, 0.62, 0.34, -0.32);
      break;
    }

    // 52. PARANGTRITIS, BANTUL — Rolling golden sand dunes + southern ocean foam + beach umbrellas!
    case 'parangtritis': {
      box(g, 2.06, 0.12, 1.38, M.sand, 0, 0.06, 0);
      box(g, 2.06, 0.14, 0.48, M.water, 0, 0.07, 0.45);
      box(g, 2.04, 0.15, 0.1, M.white, 0, 0.08, 0.22); // ocean wave foam!
      // Golden Gumuk Pasir sand dune mounds
      const dune = new THREE.Mesh(new THREE.SphereGeometry(0.56, 10, 8), M.ochre);
      dune.scale.set(1.3, 0.55, 0.85);
      dune.position.set(-0.32, 0.22, -0.28);
      g.add(dune);
      // Colorful Yogyakarta coastal umbrellas
      cyl(g, 0.025, 0.025, 0.5, 6, M.wood, 0.46, 0.32, -0.05);
      cone(g, 0.32, 0.16, 8, M.red, 0.46, 0.58, -0.05);
      cyl(g, 0.025, 0.025, 0.46, 6, M.wood, -0.08, 0.3, 0.04);
      cone(g, 0.28, 0.15, 8, M.blue, -0.08, 0.54, 0.04);
      break;
    }

    // 53. DIENG PLATEAU, WONOSOBO — Ancient stone Candi Arjuna + Telaga Warna mountain lake!
    case 'dieng': {
      box(g, 2.04, 0.14, 1.38, M.emerald, 0, 0.07, 0);
      // Ancient stepped gray Candi Arjuna
      box(g, 0.68, 0.2, 0.68, M.stone, -0.45, 0.22, -0.14);
      box(g, 0.46, 0.56, 0.46, M.darkStone, -0.45, 0.6, -0.14);
      cone(g, 0.36, 0.46, 4, M.stone, -0.45, 1.08, -0.14, Math.PI / 4);
      // Telaga Warna shimmering green-blue highland lake
      cyl(g, 0.52, 0.52, 0.16, 14, M.teal, 0.45, 0.1, 0.12);
      // Highland misty mountain backdrop
      cone(g, 0.46, 0.72, 7, M.darkGreen, 0.52, 0.42, -0.34);
      break;
    }

    // 54. WAKATOBI, SULTRA — Coral atoll lagoon + Suku Bajo stilted overwater village!
    case 'wakatobi': {
      box(g, 2.06, 0.12, 1.38, M.lagoon, 0, 0.06, 0);
      // Wooden connecting pier on stilts
      box(g, 1.56, 0.08, 0.22, M.wood, 0, 0.28, 0.18);
      // Twin stilted wooden Suku Bajo overwater houses
      [-0.48, 0.48].forEach((hx) => {
        cyl(g, 0.03, 0.03, 0.32, 6, M.darkWood, hx - 0.18, 0.18, -0.18);
        cyl(g, 0.03, 0.03, 0.32, 6, M.darkWood, hx + 0.18, 0.18, -0.18);
        box(g, 0.58, 0.34, 0.48, M.wood, hx, 0.48, -0.18);
        cone(g, 0.44, 0.32, 4, M.thatch, hx, 0.8, -0.18, Math.PI / 4);
      });
      break;
    }

    // 55. DANAU SENTANI, PAPUA — Deep blue lake + iconic circular thatched Rumah Adat HONAI Papua!
    case 'sentani': {
      box(g, 2.06, 0.12, 1.38, M.water, 0, 0.06, 0);
      cyl(g, 0.72, 0.84, 0.22, 12, M.green, -0.26, 0.15, -0.06);
      // Iconic cylindrical wooden walls + domed mushroom thatched roof (Honai Papua!)
      cyl(g, 0.36, 0.38, 0.44, 12, M.wood, -0.28, 0.46, -0.04);
      const honaiRoof = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M.thatch);
      honaiRoof.position.set(-0.28, 0.66, -0.04);
      honaiRoof.castShadow = true;
      g.add(honaiRoof);
      // Smaller twin Honai + Cycloop mountain hill
      cyl(g, 0.22, 0.24, 0.3, 10, M.wood, 0.32, 0.36, 0.16);
      cone(g, 0.3, 0.28, 10, M.thatch, 0.32, 0.62, 0.16);
      cone(g, 0.48, 0.82, 7, M.emerald, 0.62, 0.46, -0.3);
      break;
    }

    // 56. STASIUN GAMBIR — Classic green-white Gambir Station + blue-orange KAI Executive Train!
    case 'gambir': {
      box(g, 2.06, 0.12, 1.38, M.asphalt, 0, 0.06, 0);
      // Classic green-trimmed white Gambir terminal facade
      box(g, 1.66, 0.68, 0.64, M.white, 0, 0.44, -0.26);
      box(g, 1.76, 0.26, 0.72, M.darkGreen, 0, 0.9, -0.26);
      box(g, 0.74, 0.32, 0.68, M.green, 0, 1.14, -0.26);
      // KAI Executive Locomotive (white + orange/blue livery stripes!)
      box(g, 1.56, 0.38, 0.38, M.white, 0, 0.32, 0.34);
      box(g, 1.58, 0.12, 0.4, M.orange, 0, 0.26, 0.34);
      box(g, 1.58, 0.08, 0.4, M.blue, 0, 0.38, 0.34);
      break;
    }

    // 57. MRT JAKARTA — Elevated concrete skyway + curved blue-white Ratangga train!
    case 'mrt': {
      // Elevated MRT viaduct columns & concrete beam
      box(g, 0.24, 0.56, 0.38, M.silver, -0.68, 0.28, 0);
      box(g, 0.24, 0.56, 0.38, M.silver, 0.68, 0.28, 0);
      box(g, 2.06, 0.18, 0.66, M.silver, 0, 0.64, 0);
      // Sleek blue & white MRT Ratangga train
      box(g, 1.64, 0.42, 0.42, M.white, 0, 0.94, 0.02);
      box(g, 1.66, 0.16, 0.44, M.skyBlue, 0, 0.84, 0.02);
      box(g, 1.32, 0.14, 0.44, M.dark, 0, 1.02, 0.02);
      // Modern green MRT canopy edge
      box(g, 1.3, 0.08, 0.24, M.emerald, 0, 1.32, -0.22);
      break;
    }

    // 58. PERTAMINA — Iconic Red-White-Blue SPBU "Pasti Pas" canopy + fuel dispensers + totem sign!
    case 'pertamina': {
      box(g, 2.06, 0.12, 1.38, M.asphalt, 0, 0.06, 0);
      // Red-white-blue Pertamina fuel canopy on twin columns
      box(g, 0.14, 0.86, 0.14, M.white, -0.52, 0.5, -0.1);
      box(g, 0.14, 0.86, 0.14, M.white, 0.32, 0.5, -0.1);
      box(g, 1.46, 0.24, 0.92, M.red, -0.1, 1.04, -0.1);
      box(g, 1.48, 0.08, 0.94, M.white, -0.1, 0.92, -0.1);
      // Twin fuel pump dispensers
      box(g, 0.22, 0.44, 0.26, M.white, -0.32, 0.32, 0.04);
      box(g, 0.22, 0.44, 0.26, M.blue, 0.12, 0.32, 0.04);
      // Iconic Pertamina P-colors totem sign on right!
      box(g, 0.22, 1.38, 0.16, M.red, 0.82, 0.76, 0.15);
      box(g, 0.24, 0.26, 0.18, M.blue, 0.82, 1.12, 0.15);
      box(g, 0.24, 0.24, 0.18, M.green, 0.82, 0.84, 0.15);
      break;
    }

    // 59. TELKOM INDIHOME — Tall Red-and-White BTS Tower + blinking beacon + white satellite dish!
    case 'telkom': {
      box(g, 1.88, 0.12, 1.28, M.silver, 0, 0.06, 0);
      // Tall striped Red & White Telkom BTS tower!
      cyl(g, 0.24, 0.32, 0.5, 4, M.red, -0.25, 0.36, -0.1, 0, Math.PI / 4);
      cyl(g, 0.17, 0.24, 0.5, 4, M.white, -0.25, 0.86, -0.1, 0, Math.PI / 4);
      cyl(g, 0.1, 0.17, 0.5, 4, M.red, -0.25, 1.36, -0.1, 0, Math.PI / 4);
      cyl(g, 0.04, 0.1, 0.4, 4, M.white, -0.25, 1.8, -0.1, 0, Math.PI / 4);
      // Blinking red aircraft warning beacon at top!
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), M.sirenRed);
      beacon.position.set(-0.25, 2.06, -0.1);
      g.add(beacon);
      animations.push({ type: 'pulse', mesh: beacon, speed: 4.0 });
      // White satellite dish + server cabin
      box(g, 0.58, 0.42, 0.48, M.white, 0.48, 0.32, 0.12);
      box(g, 0.6, 0.1, 0.5, M.red, 0.48, 0.56, 0.12);
      cyl(g, 0.24, 0.05, 0.16, 12, M.cream, 0.48, 0.78, 0.12, 0.6, 0.3, 0);
      break;
    }

    default: {
      box(g, 0.9, 0.12, 0.35, M.wood, 0, 0.3, 0);
      break;
    }
  }

  return { group: g, animations };
}

/**
 * Builds upgrade structures (Level 1 Ruko, Level 2 Hotel/Gedung, Level 3 Prestige Crown Tower)
 * positioned cleanly in the upper-right corner of the tile so the signature Indonesian landmark stays visible!
 */
export function buildUpgradeStructure(level, ownerColor, options = {}) {
  const g = new THREE.Group();
  if (level <= 0) return g;

  const heightScale = Math.max(0.85, Math.min(1.8, Number(options.heightScale) || 1));
  const detail = Math.max(0.5, Math.min(1.8, Number(options.detail) || 1));
  const wallMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.58 });
  const accentMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.42 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.48, roughness: 0.32 });

  // Place upgrades offset slightly to the side/back so they complement the iconic place diorama!
  if (level === 1) {
    // Cozy owner-colored pavilion / Ruko corner
    box(g, 0.52, 0.62, 0.48, wallMat, 0.76, 0.31, -0.46);
    box(g, 0.58, 0.16, 0.54, accentMat, 0.76, 0.68, -0.46);
  } else if (level === 2) {
    // Twin boutique commercial buildings flanking the landmark
    box(g, 0.54, 1.15, 0.48, wallMat, 0.78, 0.58, -0.46);
    box(g, 0.6, 0.16, 0.54, accentMat, 0.78, 1.2, -0.46);
    box(g, 0.48, 0.8, 0.44, wallMat, -0.8, 0.4, -0.46);
    box(g, 0.54, 0.15, 0.5, accentMat, -0.8, 0.85, -0.46);
  } else if (level >= 3) {
    // Grand Prestige Sultan Tower + Golden Crown behind the landmark!
    box(g, 0.58, 1.85, 0.52, wallMat, 0.78, 0.92, -0.48);
    box(g, 0.64, 0.18, 0.58, accentMat, 0.78, 1.9, -0.48);
    cone(g, 0.42, 0.44, 4, accentMat, 0.78, 2.2, -0.48, Math.PI / 4);
    box(g, 0.5, 1.1, 0.44, wallMat, -0.8, 0.55, -0.46);
    box(g, 0.56, 0.16, 0.5, accentMat, -0.8, 1.16, -0.46);
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), goldMat);
    crown.position.set(0.78, 2.64, -0.48);
    g.add(crown);
  }

  // High/custom quality adds facade glazing, roof trim and rooftop detail so
  // upgrades feel like miniature Indonesian city blocks rather than flat blocks.
  if (detail >= 1.12) {
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#38bdf8',
      emissiveIntensity: Math.min(0.5, (detail - 0.8) * 0.22),
      roughness: 0.18,
      metalness: 0.28,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.36, metalness: 0.2 });
    const floors = level === 1 ? 1 : level === 2 ? 2 : 3;
    const windowW = detail >= 1.5 ? 0.105 : 0.085;
    for (let floor = 0; floor < floors; floor++) {
      const y = 0.24 + floor * 0.39 * heightScale;
      box(g, windowW, 0.105, 0.035, glassMat, 0.62, y, -0.205);
      box(g, windowW, 0.105, 0.035, glassMat, 0.88, y, -0.205);
      if (detail >= 1.35) {
        box(g, 0.035, 0.105, windowW, glassMat, 0.525, y, -0.46);
        box(g, 0.035, 0.105, windowW, glassMat, 1.015, y, -0.46);
      }
    }
    box(g, 0.7, 0.045, 0.68, trimMat, 0.76, level === 1 ? 0.78 : level === 2 ? 1.32 : 2.08, -0.46);
    if (level >= 2 && detail >= 1.4) {
      // Tiny lit roof sign/antenna on the premium tower.
      box(g, 0.09, 0.38, 0.09, goldMat, 0.78, 2.35, -0.48);
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, detail >= 1.65 ? 1 : 0), goldMat);
      beacon.position.set(0.78, 2.57, -0.48);
      g.add(beacon);
    }
  }

  // Scale the internal architecture, not the outer animated group; spring
  // animations can therefore still freely animate the whole structure.
  g.scale.y = heightScale;
  return g;
}
