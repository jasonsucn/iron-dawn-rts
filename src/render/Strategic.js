import * as T from 'three';
import { group,box,cyl,pipe,sphere,antenna,foundation,mesh } from './Parts.js';

function beam(parent,material,a,b,r=.1){return pipe(parent,material,a,b,r);}
function ring(parent,material,x,y,z,radius,tube,segments=24){
  const o=mesh(parent,new T.TorusGeometry(radius,tube,8,segments),material,x,y,z);
  o.rotation.x=Math.PI/2;
  return o;
}
function cone(parent,material,x,y,z,radius,height,sides=8){
  return mesh(parent,new T.ConeGeometry(radius,height,sides),material,x,y,z);
}

export function strategic(root,type,faction,m){
  const sov=faction==='soviet';
  if(type==='radar'){
    foundation(root,m,7.3,7.3);
    // Octagonal command tower: deliberately different from the box buildings.
    cyl(root,m.concrete,0,1.05,0,3.25,3.4,1.9,8);
    cyl(root,m.body,0,2.35,0,2.65,3.0,1.1,8);
    cyl(root,m.armor,0,2.98,0,2.82,2.7,.2,8);
    cyl(root,m.team,0,2.58,0,2.86,2.86,.07,8);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      const buttress=box(root,m.armor,Math.sin(a)*2.48,1.5,Math.cos(a)*2.48,.72,2.3,.34,.05);
      buttress.rotation.y=a;
      buttress.rotation.x=.1;
    }
    // Asymmetric forward control blister.
    box(root,m.body,0,2.1,2.4,2.1,.9,.8,.14);
    box(root,m.armor,0,2.58,2.52,2.5,.18,.95,.08);
    box(root,m.glass,0,2.18,2.84,1.6,.44,.04,.01);
    // Rounded generator annex and cable runs.
    cyl(root,m.steel,2.65,.9,1.55,.62,.7,1.7,8);
    cyl(root,m.dark,2.65,1.82,1.55,.7,.7,.12,8);
    pipe(root,m.brass,[2.65,1.5,1.55],[1.65,2.55,.95],.08);
    pipe(root,m.dark,[2.2,.75,2.15],[2.8,.75,2.15],.06);
    // Static mast below the rotating assembly.
    cyl(root,m.dark,0,3.4,0,.5,.72,.85,8);
    cyl(root,m.steel,0,3.82,0,.72,.56,.16,8);
    const radar=group(root,'radar_head',0,4.05,0);
    root.userData.radar=radar;
    if(sov){
      // Soviet slotted-waveguide array.
      cyl(radar,m.dark,0,.1,0,.42,.58,.46,8);
      for(const x of [-1.5,1.5])pipe(radar,m.steel,[x,0,0],[x,2.05,-.15],.08);
      const frame=group(radar,'array',0,1.25,0);
      frame.rotation.x=.2;
      box(frame,m.dark,0,0,0,3.7,.18,2.05,.05);
      for(let i=0;i<7;i++){
        const x=-1.62+i*.54;
        box(frame,m.steel,x,.08,.02,.07,2.15,.1,0);
      }
      for(let j=0;j<5;j++)box(frame,m.brass,0,-.82+j*.41,.03,3.45,.05,.08,0);
      box(frame,m.team,0,1.12,.12,3.4,.08,.06,.01);
      box(radar,m.light,0,2.45,.05,.42,.12,.08,.02);
      for(const x of [-1.9,1.9])box(radar,m.light,x,.2,0,.16,.2,.1,.02);
    }else{
      // Allied parabolic dish on a rotating pedestal.
      const dish=group(radar,'dish',0,1.05,0);
      dish.rotation.x=.58;
      const g=new T.SphereGeometry(1.9,20,12,0,Math.PI*2,0,1.12);
      g.rotateX(Math.PI);
      const mesh=new T.Mesh(g,m.armor);
      mesh.castShadow=true;
      mesh.receiveShadow=true;
      dish.add(mesh);
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2;
        pipe(dish,m.steel,[Math.cos(a)*1.62,-.92,Math.sin(a)*1.62],[0,-2.55,0],.055);
      }
      sphere(dish,m.light,0,-2.55,0,.16);
      box(radar,m.steel,0,.36,-.6,1.1,.18,.9,.04);
      box(radar,m.team,0,.5,-.6,.62,.06,.5,.02);
    }
    antenna(root,m,-3.05,2.75,-2.2,3.1);
    box(root,m.light,-2.1,3.16,-1.55,.22,.14,.22,.03);
    box(root,m.light,2.15,3.16,-1.55,.22,.14,.22,.03);
  }
  if(type==='defense'){
    foundation(root,m,4.4,4.4);
    // Both variants share a low octagonal bunker footprint but have utterly
    // different silhouettes above it: allied crystal tripod vs Soviet coil cage.
    const base=cyl(root,m.dark,0,.64,0,1.75,1.95,.56,8);base.rotation.y=Math.PI/8;
    const collar=cyl(root,m.concrete,0,1.02,0,1.42,1.62,.3,8);collar.rotation.y=Math.PI/8;
    const turret=group(root,'turret',0,1.14,0);root.userData.turret=turret;
    if(sov){
      const lower=cyl(turret,m.body,0,.78,0,1.02,1.27,1.28,8);lower.rotation.y=Math.PI/8;
      const crown=cyl(turret,m.dark,0,1.48,0,1.24,1.24,.2,12);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3, x=Math.sin(a), z=Math.cos(a);
        beam(turret,m.steel,[x*1.2,1.25,z*1.2],[x*.94,3.38,z*.94],.085);
        cyl(turret,m.brass,x*.82,.84+i*.27,z*.82,.71-i*.07,.71-i*.07,.12,16);
      }
      cyl(turret,m.dark,0,2.12,0,.45,.55,.34,12);
      const coil=cyl(turret,m.team,0,2.52,0,.55,.55,.18,16);
      ring(turret,m.brass,0,2.51,0,.62,.055,16);
      cyl(turret,m.steel,0,3.08,0,.15,.25,1.05,10);
      sphere(turret,m.light,0,3.67,0,.38);
      for(const side of [-1,1]){
        const fin=box(turret,m.armor,side*.62,2.0,.66,.34,1.1,.15,.04);fin.rotation.z=side*.24;
        box(turret,m.light,side*.7,1.65,.77,.12,.2,.09,.015);
      }
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2;
        beam(root,m.team,[Math.sin(a)*1.8,.75,Math.cos(a)*1.8],[Math.sin(a)*.68,2.15,Math.cos(a)*.68],.11);
      }
    }else{
      const foot=cyl(turret,m.armor,0,.24,0,1.32,1.48,.42,6);foot.rotation.y=Math.PI/6;
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3+.25, x=Math.sin(a), z=Math.cos(a);
        beam(turret,m.steel,[x*1.35,.28,z*1.35],[x*.53,2.15,z*.53],.13);
        const mirror=box(turret,m.glass,x*.95,1.48,z*.95,.95,1.0,.18,.07);
        mirror.rotation.y=a;mirror.rotation.x=-.32;
        box(turret,m.team,x*.95,1.48,z*.95,1.0,.08,.24,.02).rotation.y=a;
      }
      const crystal=new T.Mesh(new T.OctahedronGeometry(.88,0),m.light);
      crystal.name='prism_crystal';crystal.position.set(0,2.5,0);crystal.castShadow=true;turret.add(crystal);
      const cap=cyl(turret,m.dark,0,3.12,0,.52,.62,.18,8);
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3;
        beam(turret,m.brass,[Math.sin(a)*.75,2.95,Math.cos(a)*.75],[0,3.47,0],.045);
      }
      sphere(turret,m.light,0,3.48,0,.16);
    }
  }
  if(type==='super'){
    foundation(root,m,9,9);
    // Distinct strategic silhouette: allied orbital mirror petals, Soviet
    // buried silo bunker with a tall launch spine and radial blast doors.
    const plinth=cyl(root,m.dark,0,.62,0,4.0,4.25,.52,12);plinth.rotation.y=Math.PI/12;
    cyl(root,m.concrete,0,.94,0,3.8,3.95,.2,12);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6, x=Math.sin(a), z=Math.cos(a);
      const stripe=box(root,m.brass,x*3.58,1.08,z*3.58,.22,.055,.62,.02);stripe.rotation.y=a;
    }
    const array=group(root,'array',0,1.1,0);root.userData.radar=array;
    if(sov){
      // Heavy missile silo: concentric armored doors around a central launch mast.
      const bunker=cyl(root,m.body,0,1.52,0,3.12,3.36,.92,10);bunker.rotation.y=Math.PI/10;
      ring(root,m.team,0,1.99,0,3.0,.11,12);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3, x=Math.sin(a), z=Math.cos(a);
        const rib=box(root,m.armor,x*2.42,1.84,z*2.42,.76,.78,.48,.06);rib.rotation.y=a;
        box(root,m.light,x*2.55,1.96,z*2.55,.16,.3,.12,.02);
      }
      // The slowly turning crown is a targeting ring, not the whole bunker.
      const crown=group(array,'soviet_target_crown',0,2.18,0);
      ring(crown,m.steel,0,0,0,1.35,.13,24);
      ring(crown,m.brass,0,.06,0,.9,.055,20);
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2;
        beam(crown,m.steel,[Math.sin(a)*.9,0,Math.cos(a)*.9],[Math.sin(a)*1.35,.38,Math.cos(a)*1.35],.055);
      }
      const silo=cyl(root,m.dark,0,3.38,-.3,1.12,1.48,3.95,8);silo.rotation.y=Math.PI/8;
      cyl(root,m.armor,0,5.4,-.3,.9,1.25,.28,8);
      cyl(root,m.team,0,5.56,-.3,.75,.75,.1,10);
      const missile=group(root,'missile',0,5.55,-.3);
      cone(missile,m.light,0,1.75,0,.34,2.8,8);
      cyl(missile,m.steel,0,.52,0,.34,.34,2.0,8);
      for(const side of [-1,1]){
        const fin=box(missile,m.team,side*.34,.18,0,.48,.72,.12,.035);fin.rotation.z=side*.35;
      }
      for(let i=0;i<4;i++){
        const a=i*Math.PI/2;
        beam(root,m.brass,[Math.sin(a)*3.7,1.3,Math.cos(a)*3.7],[Math.sin(a)*2.7,2.1,Math.cos(a)*2.7],.07);
      }
    }else{
      // Three huge heliostat leaves orbit an elevated energy gyroscope.
      const core=cyl(root,m.body,0,1.55,0,1.42,1.8,1.18,8);core.rotation.y=Math.PI/8;
      ring(root,m.steel,0,2.15,0,1.78,.12,24);
      const gyroscope=group(array,'mirror_orbit',0,1.74,0);
      ring(gyroscope,m.brass,0,0,0,1.1,.07,24);
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3, x=Math.sin(a), z=Math.cos(a);
        beam(gyroscope,m.steel,[x*.8,.2,z*.8],[x*2.5,2.25,z*2.5],.2);
        const panel=box(gyroscope,m.glass,x*2.3,2.5,z*2.3,2.75,1.72,.19,.14);
        panel.rotation.y=a;panel.rotation.x=-.55;
        const rim=box(gyroscope,m.light,x*2.3,2.54,z*2.3,2.45,.085,.23,.025);
        rim.rotation.y=a;rim.rotation.x=-.55;
        beam(gyroscope,m.brass,[x*1.25,.45,z*1.25],[x*2.15,2.34,z*2.15],.07);
      }
      const emitter=cyl(root,m.dark,0,3.0,0,.65,.95,.3,8);
      cyl(root,m.light,0,3.8,0,.04,.62,1.42,8);
      ring(root,m.team,0,3.48,0,.72,.085,18);
      sphere(root,m.light,0,4.55,0,.28);
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3;
        cyl(root,m.brass,Math.sin(a)*1.25,1.48,Math.cos(a)*1.25,.35,.42,1.0,8);
      }
    }
  }
}
