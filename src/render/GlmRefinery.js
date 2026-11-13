// refinery.js — Ore Refinery (procedural, three.js r180, Parts.js whitelist only)
// Export: refinery(root, faction, m)
//   faction: 'soviet'/'sov'/'ussr'/'red'/true → Soviet build (heavy, riveted, warm glow);
//            anything else (e.g. 'allied'/'allies') → Allied build (slim, clean, cyan glow).
// Anchor: root.userData.smokestacks = [[x,y,z], ...]  (dust-stack tips for smoke FX)
// Required parts: ore dump hopper + inclined conveyor/skip-hoist + cyclone settling tower + drum pair.
import { box, cyl, pipe, antenna, foundation } from './Parts.js';

export function refinery(root, faction, m) {
  const sov = faction === true || faction === 1 ||
    (typeof faction === 'string' && /sov|ussr|red/i.test(faction));

  // local helpers, built strictly on the Parts.js whitelist
  const beam = (parent, mat, a, b, r, seg = 8) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-6;
    const s = cyl(parent, mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, r, r, L, seg);
    s.rotation.order = 'YXZ';
    s.rotation.y = Math.atan2(dx, dz);
    s.rotation.x = Math.acos(Math.max(-1, Math.min(1, dy / L)));
    return s;
  };
  const band = (parent, mat, x, y, z, r, h, seg = 12) => cyl(parent, mat, x, y, z, r, r, h, seg);

  foundation(root, m, 10.2, 8.2);

  // ---- ore receiving hopper, front-left apron ----
  const hx = -2.8, hz = 0.6;
  const pit = cyl(root, m.dark, hx, 1.02, hz, 1.5, 0.85, 1.25, 8);
  pit.rotation.y = Math.PI / 8;
  band(root, m.brass, hx, 1.66, hz, 1.6, 0.16, 8);
  cyl(root, m.ore, hx, 1.35, hz, 0.55, 0.98, 0.5, 8);
  if (sov) {
    band(root, m.armor, hx, 1.24, hz, 1.56, 0.12, 8);           // riveted collar
    for (let i = 0; i < 4; i++) {                               // hazard chevrons on the rim
      const a = -0.9 + i * 0.6;
      const ch = box(root, m.warm, hx + 1.62 * Math.cos(a), 1.6, hz + 1.62 * Math.sin(a), 0.5, 0.14, 0.06, 0.01);
      ch.rotation.y = Math.PI / 2 - a;
      ch.rotation.z = i % 2 ? 0.55 : -0.55;
    }
  } else {
    band(root, m.team, hx, 1.02, hz, 1.52, 0.1, 8);             // neat team-colour ring
    for (const a of [-0.6, 0, 0.6])
      box(root, m.steel, hx + 1.72 * Math.cos(a), 0.62, hz + 1.72 * Math.sin(a), 0.18, 0.5, 0.18, 0.02);
  }

  // ---- inclined ore conveyor, climbing from hopper into the cyclone tower ----
  const zc = 0.6, tx = -2.35, ty = 1.85, hx2 = 1.55, hy2 = 4.3;
  const dx = hx2 - tx, dy = hy2 - ty, L = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx), ux = dx / L, uy = dy / L;
  const mx = (tx + hx2) / 2, my = (ty + hy2) / 2;
  if (sov) {
    // open skip-hoist: twin chunky rails + rungs + riding bucket + braced trestle
    for (const sd of [-1, 1]) beam(root, m.steel, [tx, ty, zc + sd * 0.44], [hx2, hy2, zc + sd * 0.44], 0.1, 8);
    for (let i = 0; i < 9; i++) {
      const t = -2.2 + i * 0.55, px = mx + ux * t, py = my + uy * t;
      beam(root, m.steel, [px, py, zc - 0.44], [px, py, zc + 0.44], 0.045, 6);
    }
    const bkt = box(root, m.armor, mx + ux * -0.5, my + uy * -0.5, zc, 0.85, 0.75, 0.8, 0.06);
    bkt.rotation.z = ang;
    const lip = box(root, m.steel, mx + ux * -0.5 - uy * 0.42, my + uy * -0.5 + ux * 0.42, zc, 0.85, 0.12, 0.8, 0.02);
    lip.rotation.z = ang;
    const trestle = [];
    for (const t of [-1.6, 1.4]) {
      const px = mx + ux * t, pyT = my + uy * t - 0.25;
      trestle.push([px, pyT]);
      for (const sd of [-1, 1]) beam(root, m.steel, [px, 0.4, zc + sd * 0.4], [px, pyT, zc + sd * 0.4], 0.12, 8);
    }
    beam(root, m.steel, [trestle[0][0], trestle[0][1], zc - 0.4], [trestle[1][0], trestle[1][1], zc + 0.4], 0.05, 6);
    beam(root, m.steel, [trestle[0][0], trestle[0][1], zc + 0.4], [trestle[1][0], trestle[1][1], zc - 0.4], 0.05, 6);
    pipe(root, m.dark, [hx2, hy2 - 0.02, zc], [2.7, 4.26, -0.72], 0.32, 10);
    band(root, m.brass, 2.28, 4.26, -0.28, 0.42, 0.14, 10);
  } else {
    // enclosed tube conveyor: smooth casing, collars, slim A-trestles
    box(root, m.body, mx, my, zc, L - 0.2, 0.5, 1.1, 0.08).rotation.z = ang;
    box(root, m.light, mx - uy * 0.31, my + ux * 0.31, zc, L - 0.9, 0.07, 0.16, 0).rotation.z = ang;
    for (const t of [-1.65, -0.6, 0.5, 1.55]) {
      const px = mx + ux * t, py = my + uy * t;
      beam(root, m.brass, [px - ux * 0.07, py - uy * 0.07, zc], [px + ux * 0.07, py + uy * 0.07, zc], 0.57, 10);
    }
    for (const t of [-1.5, 1.3]) {
      const px = mx + ux * t, pyT = my + uy * t - 0.3;
      for (const sd of [-1, 1]) beam(root, m.steel, [px, 0.38, zc + sd * 0.52], [px, pyT, zc + sd * 0.52], 0.05, 6);
      beam(root, m.steel, [px, (0.38 + pyT) / 2, zc - 0.52], [px, (0.38 + pyT) / 2, zc + 0.52], 0.04, 6);
    }
    box(root, m.steel, 1.62, 4.42, zc, 0.6, 0.7, 0.9, 0.05).rotation.z = ang * 0.35;
    pipe(root, m.dark, [hx2, hy2 - 0.02, zc], [2.7, 4.26, -0.72], 0.26, 10);
  }

  // ---- cyclone settling tower (rear-right landmark) ----
  const cx0 = 2.7, cz0 = -1.7;
  if (sov) {
    cyl(root, m.armor, cx0, 1.05, cz0, 1.42, 0.8, 1.3, 12);                 // heavy cone base
    cyl(root, m.body, cx0, 3.18, cz0, 1.42, 1.48, 2.95, 12);                // fat riveted drum
    for (const y of [2.15, 3.0, 3.85]) band(root, m.armor, cx0, y, cz0, 1.58, 0.13, 12);
    cyl(root, m.armor, cx0, 4.77, cz0, 1.2, 1.4, 0.28, 12);
    cyl(root, m.dark, cx0, 5.42, cz0, 0.3, 0.42, 1.1, 10);                  // stubby dust stack
    box(root, m.warm, cx0, 5.88, cz0, 0.26, 0.12, 0.26, 0);                 // ember glow
    for (let i = 0; i < 4; i++) {                                           // orange glow ports on the cone
      const a = Math.PI / 4 + i * Math.PI / 2;
      const gp = box(root, m.warm, cx0 + 1.3 * Math.cos(a), 1.3, cz0 + 1.3 * Math.sin(a), 0.2, 0.16, 0.08, 0.01);
      gp.rotation.y = Math.PI / 2 - a;
    }
    pipe(root, m.dark, [1.35, 2.5, cz0], [-0.15, 2.5, cz0], 0.21, 10);      // exposed downcomer crossing the floor
    pipe(root, m.dark, [-0.15, 2.5, cz0], [-0.15, 0.45, cz0], 0.21, 10);
    box(root, m.armor, -0.15, 0.55, cz0, 0.5, 0.35, 0.5, 0.04);
    const a0 = 0.85, r0 = 1.55;                                             // riveted access ladder
    const lx = cx0 + r0 * Math.cos(a0), lz = cz0 + r0 * Math.sin(a0);
    const vx = -Math.sin(a0), vz = Math.cos(a0);
    const r1 = [lx + vx * 0.17, lz + vz * 0.17], r2 = [lx - vx * 0.17, lz - vz * 0.17];
    beam(root, m.steel, [r1[0], 0.45, r1[1]], [r1[0], 4.4, r1[1]], 0.035, 5);
    beam(root, m.steel, [r2[0], 0.45, r2[1]], [r2[0], 4.4, r2[1]], 0.035, 5);
    for (let i = 0; i < 8; i++)
      beam(root, m.steel, [r1[0], 0.7 + i * 0.5, r1[1]], [r2[0], 0.7 + i * 0.5, r2[1]], 0.03, 4);
    root.userData.smokestacks = [[cx0, 5.97, cz0]];
  } else {
    cyl(root, m.armor, cx0, 0.6, cz0, 1.3, 1.3, 0.5, 12);                   // clean plinth
    cyl(root, m.body, cx0, 2.65, cz0, 0.95, 1.1, 3.6, 12);                  // tall slim cyclone
    band(root, m.team, cx0, 1.15, cz0, 1.16, 0.18, 12);
    cyl(root, m.armor, cx0, 4.55, cz0, 1.12, 1.12, 0.26, 12);
    cyl(root, m.dark, cx0, 4.86, cz0, 0.48, 0.48, 0.4, 10);                 // vortex tube
    cyl(root, m.dark, cx0, 5.6, cz0, 0.22, 0.3, 1.2, 8);                    // slim dust stack
    band(root, m.brass, cx0, 5.18, cz0, 0.33, 0.1, 8);
    cyl(root, m.steel, cx0, 3.2, cz0, 1.48, 1.48, 0.07, 12);                // catwalk disc
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2])
      box(root, m.light, cx0 + 1.42 * Math.cos(a), 3.27, cz0 + 1.42 * Math.sin(a), 0.16, 0.1, 0.16, 0.01);
    for (const a of [-0.35, 0, 0.35]) {                                     // slim pipe bundle down the side
      const px = cx0 + 1.05 * Math.cos(a), pz = cz0 + 1.05 * Math.sin(a);
      pipe(root, m.steel, [px, 3.9, pz], [px, 0.5, pz], 0.05, 6);
      band(root, m.brass, px, 2.2, pz, 0.1, 0.08, 6);
    }
    for (const a of [0.7, 1.15, 2.0, 2.45]) {
      const w = box(root, m.glass, cx0 + 0.99 * Math.cos(a), 3.9, cz0 + 0.99 * Math.sin(a), 0.18, 0.5, 0.06, 0.01);
      w.rotation.y = Math.PI / 2 - a;
    }
    root.userData.smokestacks = [[cx0, 6.2, cz0]];
  }

  // ---- settling drum pair (rear-left) ----
  const ax = -1.35, az = -3.0, bx = 0.2, bz = -2.6;
  if (sov) {
    cyl(root, m.body, ax, 1.4, az, 0.72, 0.72, 2.0, 10);
    cyl(root, m.armor, ax, 2.5, az, 0.76, 0.76, 0.2, 10);
    for (const y of [1.0, 1.8]) band(root, m.armor, ax, y, az, 0.78, 0.12, 10);
    box(root, m.warm, ax, 1.6, az + 0.74, 0.1, 1.0, 0.06, 0.01);            // level gauge
    cyl(root, m.body, bx, 1.35, bz, 0.66, 0.66, 1.9, 10);
    cyl(root, m.armor, bx, 2.4, bz, 0.7, 0.7, 0.18, 10);
    pipe(root, m.dark, [ax, 2.62, az], [bx, 2.5, bz], 0.15, 8);
  } else {
    cyl(root, m.body, ax, 1.55, az, 0.58, 0.58, 2.3, 10);
    cyl(root, m.armor, ax, 2.78, az, 0.62, 0.62, 0.18, 10);
    cyl(root, m.dark, ax, 2.95, az, 0.12, 0.12, 0.26, 6);
    cyl(root, m.body, bx, 1.5, bz, 0.52, 0.52, 2.2, 10);
    cyl(root, m.armor, bx, 2.68, bz, 0.56, 0.56, 0.16, 10);
    pipe(root, m.steel, [ax, 2.2, az], [bx, 2.2, bz], 0.07, 6);
    for (let i = 0; i < 5; i++)
      beam(root, m.steel, [ax + 0.64, 0.7 + i * 0.42, az - 0.18], [ax + 0.64, 0.7 + i * 0.42, az + 0.18], 0.03, 4);
  }

  // ---- crew cab, front-right ----
  box(root, m.armor, 2.75, 1.2, 2.6, 2.0, 1.7, 1.5, 0.12);
  box(root, m.body, 2.75, 2.14, 2.6, 2.2, 0.18, 1.7, 0.08);
  box(root, m.glass, 2.75, 1.45, 3.38, 1.7, 0.55, 0.06, 0.02);
  for (const sd of [-1, 1]) box(root, m.glass, 2.75 + sd * 1.03, 1.45, 2.6, 0.06, 0.5, 1.0, 0.02);
  if (sov) {
    for (const sd of [-1, 1]) {
      const p = cyl(root, m.glass, 2.75 + sd * 0.5, 1.45, 3.4, 0.12, 0.12, 0.08, 8);
      p.rotation.x = Math.PI / 2;
    }
    cyl(root, m.dark, 3.4, 2.53, 2.2, 0.12, 0.12, 0.6, 6);                  // exhaust stub
    box(root, m.warm, 2.75, 2.0, 3.38, 1.9, 0.08, 0.05, 0.01);
  } else {
    box(root, m.light, 2.75, 2.0, 3.38, 1.9, 0.08, 0.05, 0.01);
    antenna(root, m, 3.5, 2.23, 2.2, 1.1);
  }

  // ---- apron lamp gantry + team flag ----
  beam(root, m.dark, [-4.6, 0.52, 3.55], [-0.4, 0.52, 3.55], 0.07, 6);
  for (const px of [-4.6, -0.4]) beam(root, m.dark, [px, 0.4, 3.55], [px, 0.52, 3.55], 0.05, 5);
  for (let i = 0; i < 5; i++)
    box(root, i % 2 ? m.team : (sov ? m.warm : m.light), -4.4 + i * 0.95, 0.62, 3.55, 0.34, 0.14, 0.1, 0.01);
  antenna(root, m, -4.55, 0.35, -3.45, 2.1);
  box(root, m.team, sov ? -4.3 : -4.35, sov ? 2.2 : 2.28, -3.45, sov ? 0.75 : 0.55, sov ? 0.5 : 0.4, 0.04, 0.01);
  if (sov) box(root, m.warm, -4.55, 2.5, -3.45, 0.16, 0.12, 0.16, 0.01);
}
