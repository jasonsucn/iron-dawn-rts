// factory.js — Vehicle Factory (procedural, three.js r180, Parts.js whitelist only)
// Export: factory(root, faction, m)
//   faction: 'soviet'/'sov'/'ussr'/'red'/true → Soviet build (heavy, riveted, warm glow);
//            anything else (e.g. 'allied'/'allies') → Allied build (slim, clean, cyan glow).
// Animation anchors (required):
//   Group 'crane'      — whole bridge-gantry, game translates it along +x
//   Group 'yard_hoist' — hook block child of crane, game raises/lowers it along y
//   Mesh  'door'       — front gate, game opens/closes it via scale.y
//                        (geometry pivoted at the lintel: scale.y 1 = closed, 0 = rolled up)
// Also: root.userData.smokestacks = [[x,y,z], ...]
import { group, box, cyl, pipe, antenna, foundation } from './Parts.js';

export function factory(root, faction, m) {
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

  foundation(root, m, 11.2, 9.4);

  // ---- twin assembly naves (double-nave hall) ----
  for (const nx of [-3.3, 3.3]) {
    const s = Math.sign(nx);
    box(root, m.body, nx, 2.4, -0.1, 3.2, 4.1, 7.3, 0.22);
    if (sov) {
      for (const k of [-1, 1])                                              // shallow gable, ridge on nave axis
        box(root, m.armor, nx + k * 0.8, 4.72, -0.1, 1.75, 0.22, 7.5, 0.05).rotation.z = -k * 0.2;
      box(root, m.dark, nx, 4.98, -0.1, 0.34, 0.18, 7.5, 0.03);
      for (let i = 0; i < 5; i++)                                           // outer buttress ribs
        box(root, m.armor, nx + s * 1.75, 2.15, -3.1 + i * 1.55, 0.35, 3.6, 0.5, 0.04);
      for (let i = 0; i < 3; i++) {                                         // riveted portholes
        const p = cyl(root, m.glass, nx + s * 1.62, 2.6, -2.0 + i * 2.0, 0.18, 0.18, 0.06, 8);
        p.rotation.z = Math.PI / 2;
      }
      box(root, m.warm, nx + s * 1.64, 3.95, -0.1, 0.05, 0.16, 5.4, 0);
      box(root, m.team, nx, 3.6, 3.58, 2.8, 0.22, 0.06, 0.01);              // warning band over the bay
      for (const wz of [-2.3, 0.4]) {                                       // facade portholes
        const p = cyl(root, m.glass, nx, 2.6, 3.57, 0.24, 0.24, 0.06, 8);
        p.rotation.x = Math.PI / 2;
      }
    } else {
      box(root, m.armor, nx, 4.56, -0.1, 3.5, 0.22, 7.5, 0.05);             // flat roof slab
      for (const [px, pz, w, d] of [[nx, -3.85, 3.5, 0.3], [nx, 3.65, 3.5, 0.3],
                                    [nx - 1.6, -0.1, 0.3, 7.5], [nx + 1.6, -0.1, 0.3, 7.5]])
        box(root, m.body, px, 4.78, pz, w, 0.22, d, 0.03);                  // parapet
      box(root, m.glass, nx, 4.71, -0.1, 0.55, 0.08, 6.6, 0);               // skylight strip
      for (let i = 0; i < 3; i++)
        box(root, m.glass, nx + s * 1.63, 2.5, -2.2 + i * 2.2, 0.06, 0.95, 1.5, 0.02);
      box(root, m.light, nx + s * 1.64, 3.95, -0.1, 0.05, 0.14, 5.6, 0);    // cyan window band
      box(root, m.brass, nx, 4.35, 3.58, 2.6, 0.14, 0.06, 0.01);            // front trim
      for (const wz of [-2.3, 0.4])                                         // facade windows
        box(root, m.glass, nx, 2.5, 3.57, 1.3, 0.9, 0.06, 0.02);
    }
  }

  // ---- central vehicle bay: pillars, header, recess, roll-up gate ----
  for (const px of [-1.3, 1.3]) box(root, m.armor, px, 2.6, 3.5, 0.8, 4.5, 1.0, 0.1);
  box(root, m.body, 0, 5.2, 3.5, 3.4, 0.7, 1.0, 0.08);
  box(root, m.brass, 0, 5.2, 4.01, 3.3, 0.5, 0.06, 0.01);
  box(root, m.dark, 0, 2.1, 3.28, 3.3, 3.5, 0.35, 0.02);                    // dark opening
  const door = box(root, m.armor, 0, 3.82, 3.62, 3.4, 3.4, 0.2, 0.05);      // unique size → safe geometry pivot edit
  door.geometry.translate(0, -1.7, 0);                                      // pivot at lintel: scale.y rolls it up
  door.name = 'door';
  cyl(root, m.dark, 0, 3.98, 3.55, 0.18, 0.18, 3.4, 10).rotation.z = Math.PI / 2;  // roller drum
  for (const px of [-1.72, 1.72]) box(root, m.steel, px, 2.1, 3.66, 0.12, 3.5, 0.22, 0.02);
  if (sov) {
    box(root, m.warm, 0, 4.98, 4.03, 0.5, 0.14, 0.1, 0.01);
    for (const px of [-0.9, 0.9])
      box(root, m.warm, px, 5.2, 4.02, 0.7, 0.14, 0.06, 0.01).rotation.z = px > 0 ? -0.7 : 0.7;
  } else {
    box(root, m.light, 0, 4.98, 4.03, 0.5, 0.14, 0.1, 0.01);
  }

  // ---- rear furnace + flues + stacks ----
  box(root, m.concrete, 0, 0.8, -3.3, 3.0, 0.9, 2.0, 0.06);
  if (sov) {
    cyl(root, m.armor, 0, 2.45, -3.3, 1.15, 1.15, 2.4, 12);
    cyl(root, m.dark, 0, 3.9, -3.3, 0.5, 1.2, 0.5, 12);                     // cone crown
    pipe(root, m.dark, [0, 3.65, -3.3], [0, 4.25, -3.3], 0.26, 10);         // thick flue trunk
    for (const sd of [-1, 1]) {
      pipe(root, m.dark, [0, 4.25, -3.3], [sd * 1.05, 4.25, -3.85], 0.26, 10);
      cyl(root, m.dark, sd * 1.05, 5.35, -3.85, 0.38, 0.46, 2.9, 10);       // twin stacks
      band(root, m.brass, sd * 1.05, 6.0, -3.85, 0.5, 0.12, 10);
      box(root, m.warm, sd * 1.05, 6.7, -3.85, 0.3, 0.12, 0.3, 0);          // stack embers
    }
    for (const [gx, gy] of [[-0.55, 2.9], [0.55, 2.9], [-0.55, 2.0], [0.55, 2.0]])
      box(root, m.warm, gx, gy, -2.12, 0.2, 0.5, 0.06, 0.01);               // furnace glow ports
    for (const gy of [1.9, 3.1]) box(root, m.team, 0, gy, -2.13, 2.0, 0.18, 0.06, 0.01);
    antenna(root, m, 0, 4.16, -3.3, 1.5);
    box(root, m.warm, 0, 5.78, -3.3, 0.16, 0.14, 0.16, 0.01);
    root.userData.smokestacks = [[-1.05, 6.8, -3.85], [1.05, 6.8, -3.85]];
  } else {
    cyl(root, m.armor, 0, 2.3, -3.3, 1.0, 1.0, 2.1, 12);
    cyl(root, m.dark, 0, 3.46, -3.3, 1.05, 1.05, 0.22, 12);
    pipe(root, m.steel, [0, 3.35, -3.3], [0, 3.95, -3.3], 0.18, 8);         // clean flue elbow
    pipe(root, m.steel, [0, 3.95, -3.3], [-0.9, 3.95, -3.85], 0.18, 8);
    cyl(root, m.body, -0.9, 4.95, -3.9, 0.26, 0.34, 3.0, 10);               // single slim stack
    band(root, m.brass, -0.9, 6.25, -3.9, 0.4, 0.12, 10);
    cyl(root, m.dark, -0.9, 6.55, -3.9, 0.3, 0.3, 0.12, 10);
    box(root, m.light, -0.45, 2.3, -2.28, 0.14, 1.2, 0.05, 0.01);           // induction glow slits
    box(root, m.light, 0.45, 2.3, -2.28, 0.14, 1.2, 0.05, 0.01);
    box(root, m.light, 0, 2.3, -2.28, 0.14, 1.4, 0.05, 0.01);
    cyl(root, m.dark, 0.4, 3.75, -3.0, 0.14, 0.14, 0.5, 6);                 // steam vent
    antenna(root, m, 5.15, 6.11, -2.2, 1.5);                                // mast on rear portal beam
    box(root, m.light, 5.15, 7.72, -2.2, 0.16, 0.12, 0.16, 0.01);
    root.userData.smokestacks = [[-0.9, 6.55, -3.9]];
  }

  // ---- gantry runway: end portals + rails along x (crane travels on them) ----
  for (const px of [-5.15, 5.15]) {
    for (const pz of [-4.25, 4.25]) box(root, m.steel, px, 2.95, pz, 0.6, 5.2, 0.6, 0.08);
    box(root, m.armor, px, 5.83, 0, 0.7, 0.55, 9.0, 0.08);
    for (const pz of [-4.25, 4.25]) box(root, m.armor, px, 5.42, pz, 0.75, 0.45, 0.75, 0.05);
    for (let i = 0; i < 5; i++)                                             // ladder on the front leg
      beam(root, m.steel, [px - 0.34, 0.9 + i * 0.75, 4.02], [px - 0.34, 0.9 + i * 0.75, 4.48], 0.03, 4);
  }
  for (const pz of [-4.25, 4.25]) box(root, m.dark, 0, 6.19, pz, 10.9, 0.16, 0.34, 0.02);

  // ---- traveling bridge gantry (anchor: 'crane' moves along x) ----
  const crane = group(root, 'crane', -0.8, 0, 0);
  for (const pz of [-4.25, 4.25]) box(crane, m.armor, 0, 6.5, pz, 1.15, 0.5, 0.8, 0.06);  // end trucks
  box(crane, m.body, 0, 7.0, 0, 1.05, 0.55, 9.1, 0.08);                     // bridge girder
  for (const dx1 of [-0.62, 0.62]) box(crane, m.dark, dx1, 6.86, 0, 1.15, 0.16, 8.9, 0.03);  // lower flanges
  box(crane, m.dark, 0, 6.5, 3.1, 0.75, 0.62, 0.95, 0.05);                  // operator cab
  box(crane, m.glass, 0, 6.5, 3.58, 0.55, 0.3, 0.05, 0.01);
  box(crane, m.armor, 0, 7.5, 0.55, 0.95, 0.45, 1.05, 0.06);                // trolley frame
  for (const dx0 of [-0.28, 0.28])
    cyl(crane, m.dark, dx0, 7.8, 0.55, 0.12, 0.12, 0.75, 8).rotation.z = Math.PI / 2;      // cable drums
  box(crane, m.team, 0, 7.0, -4.1, 1.07, 0.2, 0.7, 0.02);                   // bridge marking

  // ---- hook block (anchor: 'yard_hoist' moves along y) ----
  const hoist = group(crane, 'yard_hoist', 0, 7.275, 0.55);
  for (const dx0 of [-0.13, 0.13]) cyl(hoist, m.steel, dx0, -1.3, 0, sov ? 0.05 : 0.032, sov ? 0.05 : 0.032, 2.6, 6);
  box(hoist, m.steel, 0, -2.81, 0, 0.6, 0.42, 0.6, 0.04);
  pipe(hoist, m.brass, [0, -3.02, 0], [0.16, -3.14, 0], 0.05, 6);
  pipe(hoist, m.brass, [0.16, -3.14, 0], [0.16, -3.38, 0], 0.05, 6);
  if (sov) box(hoist, m.warm, 0, -2.81, 0.32, 0.16, 0.1, 0.06, 0.01);

  // ---- yard clutter + floor markings ----
  if (sov) {
    box(root, m.body, -4.35, 0.725, 3.2, 1.15, 0.75, 0.9, 0.05);
    box(root, m.steel, -4.35, 1.14, 3.2, 1.2, 0.08, 0.95, 0.02);
    box(root, m.steel, -4.3, 0.65, 2.15, 0.8, 0.6, 0.8, 0.04);
    for (const [dx0, dz0] of [[-3.5, 3.3], [-4.3, 2.4]]) {
      cyl(root, m.dark, dx0, 0.8, dz0, 0.32, 0.32, 0.9, 8);
      band(root, m.warm, dx0, 1.05, dz0, 0.33, 0.12, 8);
    }
    cyl(root, m.armor, 4.5, 0.77, 3.9, 0.42, 0.42, 0.3, 10).rotation.z = Math.PI / 2;      // cable reel
    box(root, m.warm, 0, 0.4, 4.2, 3.6, 0.06, 0.3, 0.01);
    for (const px of [-2.6, 2.6]) box(root, m.team, px, 0.38, 4.3, 1.4, 0.05, 0.18, 0.01);
  } else {
    box(root, m.body, -4.35, 0.725, 3.2, 1.15, 0.75, 0.9, 0.05);
    box(root, m.steel, -4.35, 1.14, 3.2, 1.2, 0.08, 0.95, 0.02);
    box(root, m.steel, -4.3, 0.65, 2.15, 0.8, 0.6, 0.8, 0.04);
    cyl(root, m.brass, -3.45, 0.775, 3.45, 0.3, 0.3, 0.85, 8);
    band(root, m.team, -3.45, 1.0, 3.45, 0.31, 0.1, 8);
    for (const px of [-1.2, 1.2]) box(root, m.team, px, 0.38, 4.3, 2.2, 0.05, 0.18, 0.01);
  }
}
