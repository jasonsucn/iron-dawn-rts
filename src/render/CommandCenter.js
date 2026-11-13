import * as T from 'three';
import { group, box, cyl, pipe, antenna, mesh, geometry } from './Parts.js';

// A construction yard reads as a headquarters first: tall command crown behind
// an open fabrication court, framed by two load-bearing wings. All coordinates
// stay inside the existing 10 x 9 footprint (plus the normal foundation lip).
function prism(parent, material, points, bottom, height, bevel = .04) {
  const key = `hq-prism:${JSON.stringify(points)}:${height}:${bevel}`;
  const g = geometry(key, () => {
    const shape = new T.Shape();
    points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
    shape.closePath();
    const result = new T.ExtrudeGeometry(shape, {
      depth: height, steps: 1, bevelEnabled: bevel > 0,
      bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 1
    });
    result.rotateX(-Math.PI / 2);
    return result;
  });
  return mesh(parent, g, material, 0, bottom, 0);
}

function profile(parent, material, points, z, depth) {
  const key = `hq-profile:${JSON.stringify(points)}:${depth}`;
  const g = geometry(key, () => {
    const shape = new T.Shape();
    points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const result = new T.ExtrudeGeometry(shape, {
      depth, steps: 1, bevelEnabled: true, bevelSize: .035,
      bevelThickness: .035, bevelSegments: 1, curveSegments: 6
    });
    result.translate(0, 0, -depth / 2);
    return result;
  });
  return mesh(parent, g, material, 0, 0, z);
}

function towerBand(root, material, x, y, z, radius, height, sides = 8) {
  const band = cyl(root, material, x, y, z, radius, radius, height, sides);
  band.rotation.y = Math.PI / sides;
  return band;
}

function commandSeal(root, m, sov) {
  // Physical inlaid insignia, visible at RTS distance; no text decal required.
  const emblem = group(root, 'command_seal', 0, 4.82, 1.15);
  box(emblem, m.dark, 0, 0, 0, 1.25, .94, .12, .1);
  if (sov) {
    for (const side of [-1, 1]) {
      const chevron = box(emblem, m.brass, side * .24, 0, .08, .16, .72, .07, .015);
      chevron.rotation.z = -side * .42;
    }
    box(emblem, m.light, 0, -.26, .08, .72, .07, .07, .01);
  } else {
    for (const side of [-1, 1]) {
      const wing = box(emblem, m.brass, side * .31, 0, .08, .56, .13, .08, .02);
      wing.rotation.z = side * .4;
    }
    box(emblem, m.light, 0, .08, .09, .12, .6, .07, .01);
  }
}

export function commandCenter(root, faction, m) {
  const sov = faction === 'soviet';
  const plinth = [[-3.9,-4.5],[3.9,-4.5],[5,-3.4],[5,3.25],[3.8,4.5],[-3.8,4.5],[-5,3.25],[-5,-3.4]];
  prism(root, m.concrete, plinth, .06, .36, .055);
  prism(root, m.dark, plinth.map(([x,z]) => [x*.97,z*.97]), .45, .18, .025);

  // Three broad entrance steps and an inset fabrication pad, rather than a
  // box-shaped hangar. The court remains visibly open below the portal.
  for (let i=0;i<3;i++) {
    box(root,m.concrete,0,.13+i*.14,4.13-i*.38,4.9-i*.25,.15,.7,.035);
  }
  prism(root,m.steel,[[-2.25,-.2],[2.25,-.2],[2.55,2.8],[1.95,3.65],[-1.95,3.65],[-2.55,2.8]],.65,.09,.015);
  for(const x of [-1.75,1.75]) {
    box(root,m.dark,x,.76,1.75,.16,.07,3.35,.015);
    box(root,m.brass,x,.8,1.75,.045,.03,3.25,0);
  }
  for(let i=0;i<6;i++) {
    box(root,i%2?m.dark:m.brass,-1.7+i*.68,.8,3.52,.4,.035,.24,.01).rotation.y=.45;
  }

  // Low swept shoulders leave the tower and the gantry as the silhouette.
  for(const side of [-1,1]) {
    const shoulder=[[2.62,-3.42],[4.12,-3.65],[4.75,-2.8],[4.75,2.75],[4.12,3.55],[2.72,2.7]].map(([x,z])=>[x*side,z]);
    prism(root,m.body,shoulder,.68,1.58,.07);
    prism(root,m.armor,shoulder.map(([x,z])=>[x,z-.04]),2.34,.2,.045);
    const fin=box(root,m.armor,side*4.36,1.32,3.02,.68,1.4,.95,.08);
    fin.rotation.x=-.22;
    box(root,m.team,side*4.62,1.8,.28,.1,.22,2.95,.025);
    for(let i=0;i<6;i++) {
      box(root,m.dark,side*3.52,2.6,-2.5+i*.34,.83,.08,.15,.015);
    }
    // Rear power packs and armoured exhaust shrouds give the back a purpose.
    cyl(root,m.dark,side*3.5,1.33,-3.25,.55,.62,1.24,12);
    cyl(root,m.steel,side*3.5,2.04,-3.25,.64,.64,.14,12);
    pipe(root,m.brass,[side*3.5,1.4,-3.35],[side*2.1,1.4,-3.5],.09);
    box(root,m.warm,side*4.24,.94,3.69,.24,.2,.05,.02);
    box(root,m.light,side*4.2,2.58,2.46,.18,.12,.3,.02);
    for(let i=0;i<3;i++) {
      box(root,m.steel,side*4.82,.93+i*.32,-.7,.06,.09,1.4,.01);
    }
  }

  const tz=-1.14;
  // Splayed octagonal citadel and a continuous panoramic command bridge.
  const lower=cyl(root,m.body,0,2.45,tz,2.42,3.0,3.55,8);
  lower.rotation.y=Math.PI/8;
  towerBand(root,m.armor,0,1.02,tz,2.94,.28);
  towerBand(root,m.dark,0,3.96,tz,2.5,.25);
  towerBand(root,m.glass,0,4.34,tz,2.49,.57);
  towerBand(root,m.armor,0,4.76,tz,2.83,.24);
  towerBand(root,m.body,0,5.14,tz,2.26,.58);
  towerBand(root,m.armor,0,5.49,tz,2.5,.16);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4+Math.PI/8;
    const x=Math.sin(a),z=Math.cos(a);
    pipe(root,m.steel,[x*2.92,.95,tz+z*2.92],[x*2.39,3.78,tz+z*2.39],.1);
    const mullion=box(root,m.steel,x*2.48,4.34,tz+z*2.48,.09,.64,.13,.012);
    mullion.rotation.y=a;
    const slit=box(root,m.light,x*2.5,4.22,tz+z*2.5,.62,.065,.045,.01);
    slit.rotation.y=a;
  }
  // Front command vault and a pronounced threshold.
  box(root,m.dark,0,1.74,1.51,2.2,1.95,.12,.18);
  for(const side of [-1,1]) {
    const leaf=box(root,m.steel,side*.47,1.76,1.59,.86,1.66,.09,.06);
    leaf.rotation.z=side*.045;
    box(root,m.light,side*.94,1.77,1.66,.045,1.53,.045,.008);
  }
  commandSeal(root,m,sov);

  // Fixed portal. Moving mechanisms are separate children with unique names.
  for(const side of [-1,1]) {
    const rib=sov
      ? [[3.78,.7],[4.52,.7],[4.52,4.8],[3.62,6.65],[2.5,6.65],[3.28,4.5]]
      : [[3.9,.7],[4.55,.7],[4.33,3.35],[3.92,5.22],[2.63,6.42],[2.2,6.08],[3.32,4.83],[3.69,3.05]];
    profile(root,m.armor,rib.map(([x,y])=>[x*side,y]),1.9,.54);
    pipe(root,m.brass,[side*4.06,1.15,1.53],[side*3.57,4.6,1.53],.075);
    box(root,m.dark,side*4.06,1.23,1.93,.9,.7,.82,.1);
    box(root,m.team,side*4.1,1.5,2.37,.63,.18,.05,.015);
  }
  const top=sov?6.52:6.3;
  box(root,m.dark,0,top,1.9,5.8,.44,.62,.12);
  box(root,m.armor,0,top+.3,1.9,5.68,.16,.86,.055);
  box(root,m.brass,0,top-.3,1.53,5.72,.085,.1,.01);
  for(let i=0;i<7;i++)box(root,m.steel,-2.35+i*.78,top,2.23,.12,.33,.06,.01);
  box(root,m.team,0,top+.41,1.9,2.2,.05,.6,.02);

  const trolley=group(root,'yard_trolley',0,top-.44,1.9);
  root.userData.crane=trolley;
  box(trolley,m.brass,0,0,0,.88,.35,.82,.075);
  for(const side of [-1,1])cyl(trolley,m.dark,side*.36,.12,0,.16,.16,.82,10).rotation.x=Math.PI/2;
  const hoist=group(trolley,'yard_hoist',0,0,0);
  root.userData.hoist=hoist;
  for(const x of [-.19,.19])pipe(hoist,m.dark,[x,-.08,0],[x,-1.28,0],.025);
  box(hoist,m.steel,0,-1.36,0,.57,.24,.4,.06);
  box(hoist,m.light,0,-1.4,.23,.3,.07,.05,.012);
  pipe(hoist,m.brass,[0,-1.48,0],[0,-1.78,0],.055);
  pipe(hoist,m.brass,[0,-1.78,0],[.2,-1.85,0],.055);

  // Faction crowns share no moving structure with the headquarters itself.
  if(sov) {
    towerBand(root,m.dark,0,5.74,tz,1.9,.35,6);
    towerBand(root,m.body,0,6.09,tz,1.52,.4,6);
    for(const side of [-1,1]) {
      profile(root,m.armor,[[side*.5,5.7],[side*1.28,5.7],[side*.93,8.7],[side*.6,9.05]],tz,.7);
      box(root,m.team,side*.77,7.34,tz+.4,.14,1.5,.07,.02);
    }
    box(root,m.dark,0,7.08,tz,.6,2.3,.62,.06);
    box(root,m.light,0,8.32,tz,.28,.16,.3,.025);
    for(const side of [-1,1]) {
      box(root,m.armor,side*2.03,5.97,tz,.45,1,.72,.04);
      box(root,m.brass,side*2.03,6.32,tz+.4,.21,.21,.07,.015);
    }
  } else {
    towerBand(root,m.dark,0,5.78,tz,1.67,.38);
    for(const side of [-1,1]) {
      profile(root,m.armor,[[side*.52,5.7],[side*1.24,5.7],[side*1.0,7.6],[side*.5,8.65],[side*.35,8.48]],tz,.56);
      pipe(root,m.light,[side*.71,6.2,tz+.31],[side*.64,7.72,tz+.31],.037);
    }
    const halo=cyl(root,m.steel,0,7.15,tz,1.0,1.0,.12,24);
    halo.scale.z=.48;
    box(root,m.dark,0,6.65,tz,.36,1.5,.4,.045);
    box(root,m.light,0,7.51,tz,.19,.2,.2,.02);
  }

  // Rear communication stack and segmented heat sinks read from every angle.
  antenna(root,m,-2.12,4.97,-2.2,3.18);
  antenna(root,m,2.12,4.97,-2.2,2.25);
  for(const side of [-1,1]) {
    const backFin=box(root,m.armor,side*1.45,2.32,-3.52,.24,2.6,.46,.04);
    backFin.rotation.x=.13;
    for(let i=0;i<5;i++)box(root,m.steel,side*.98,1.5+i*.32,-3.75,.5,.1,.13,.01);
    box(root,m.team,side*1.45,2.4,-3.8,.12,.76,.04,.01);
  }
  const comm=group(root,'yard_comms',2.45,5.55,-1.95);
  pipe(comm,m.dark,[0,0,0],[0,.74,0],.065);
  const panel=box(comm,m.armor,0,.78,0,.85,.46,.11,.06);
  panel.rotation.x=-.3;
  box(comm,m.light,0,.77,.08,.58,.055,.05,.01);
}
