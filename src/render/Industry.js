import * as T from 'three';
import { box,cyl,pipe,sphere,antenna,foundation,mesh } from './Parts.js';
import { commandCenter } from './CommandCenter.js';
import { refinery as glmRefinery } from './GlmRefinery.js';
import { factory as glmFactory } from './GlmFactory.js';

function ring(parent, material, x, y, z, radius, tube, segments=28){
  const torus=mesh(parent,new T.TorusGeometry(radius,tube,8,segments),material,x,y,z);
  torus.rotation.x=Math.PI/2;
  return torus;
}

function cone(parent, material, x, y, z, radius, height, sides=8, rotation=0){
  const o=mesh(parent,new T.ConeGeometry(radius,height,sides),material,x,y,z);
  o.rotation.y=rotation;
  return o;
}

function beam(parent,material,a,b,r=.1){
  return pipe(parent,material,a,b,r);
}

function powerStation(root,sov,m){
  foundation(root,m,7,7);
  // An open tri-pylon power harp around a luminous transformer core.
  cyl(root,m.dark,0,.58,0,2.85,3.05,.32,10);
  cyl(root,m.concrete,0,.82,0,2.65,2.82,.22,10);
  const core=cyl(root,m.body,0,2.05,-.15,1.38,1.78,2.35,10);
  core.rotation.y=Math.PI/10;
  cyl(root,m.armor,0,3.2,-.15,1.42,1.58,.34,10);
  ring(root,m.brass,0,2.65,-.15,1.58,.075,12);
  ring(root,m.team,0,1.56,-.15,1.64,.09,12);
  cyl(root,m.light,0,3.72,-.15,.67,.88,.62,10);
  sphere(root,m.warm,0,4.13,-.15,.35);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4, x=Math.sin(a), z=Math.cos(a);
    beam(root,m.steel,[x*2.5,.9,z*2.5],[x*1.36,3.15-.18*(i%2),z*1.36],.105);
    const insulator=cyl(root,m.dark,x*2.42,1.35,z*2.42,.23,.26,.72,8);
    insulator.rotation.z=x*.24;
    ring(root,m.brass,x*2.42,1.53,z*2.42,.31,.04,12);
  }
  // Twin flared exhaust towers are the power station's skyline signature.
  const stackXs=sov?[-2.15,2.15]:[-2.3,2.3];
  for(let i=0;i<stackXs.length;i++){
    const x=stackXs[i], z=sov?-.95:-1.25;
    cyl(root,m.concrete,x,2.65,z,.72,.96,3.8,8);
    cyl(root,m.body,x,4.53,z,.82,.68,.42,8);
    cyl(root,m.dark,x,4.78,z,.65,.65,.11,10);
    ring(root,sov?m.brass:m.steel,x,4.58,z,.87,.065,12);
    for(let k=0;k<5;k++){
      const fin=box(root,k%2?m.dark:m.steel,x+(k-2)*.12,2.6,z+.78,.075,2.35,.08,.012);
      fin.rotation.z=(k-2)*.045;
    }
    if(sov){
      cyl(root,m.brass,x,4.96,z,.53,.55,.16,12);
      sphere(root,m.light,x,5.36,z,.25);
    }else{
      cyl(root,m.light,x,4.96,z,.46,.48,.09,12);
      box(root,m.team,x,5.13,z,.22,.045,.7,.012);
    }
  }
  // Distinct allied lightning crown vs Soviet warning-fin crossbar.
  beam(root,m.brass,[-2.3,5.38,-1.25],[2.3,5.38,-1.25],.095);
  for(const side of [-1,1]){
    const mast=antenna(root,m,side*2.45,4.98,1.4,sov?1.5:2.15);
    mast.rotation.z=side*.08;
  }
  if(sov){
    for(let i=0;i<3;i++){
      const fin=box(root,m.team,0,3.05,2.9-i*.75,4.5,.08,.12,.015);
      fin.rotation.x=-.08;
    }
  }else{
    for(const side of [-1,1]){
      const fork=beam(root,m.steel,[side*.4,4.45,1.55],[side*1.85,5.55,1.1],.065);
      box(root,m.light,side*1.83,5.57,1.1,.22,.12,.24,.025);
    }
  }
  root.userData.smokestacks=stackXs.map((x,i)=>[x,5.15,sov?-.95:-1.25]);
}

function barracks(root,sov,m){
  foundation(root,m,7,7);
  // Three folded-roof barrack pods and an open drill apron create a compound,
  // not another rectangular warehouse.
  const pod=(x,z,w,d,h,rotation=0)=>{
    const body=box(root,m.body,x,.72+h*.38,z,w,h*.76,d,.12);
    body.rotation.y=rotation;
    const roof=cone(root,m.armor,x,.72+h*.76,z,Math.max(w,d)*.72,h*.72,5,rotation+Math.PI/5);
    roof.scale.set(w/Math.max(w,d),1,d/Math.max(w,d));
    return {body,roof};
  };
  pod(-1.62,-1.65,3.1,3.4,2.65,sov?-.08:.12);
  pod(1.7,-1.48,2.8,3.55,2.9,sov?.1:-.08);
  // A low command bunk and separate covered assembly porch.
  const command=cyl(root,m.concrete,0,1.0,1.55,1.72,1.95,1.5,8);
  command.rotation.y=Math.PI/8;
  const cap=cyl(root,m.body,0,2.25,1.55,1.72,1.72,.28,8);
  cap.rotation.y=Math.PI/8;
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const x=Math.sin(a),z=Math.cos(a);
    box(root,m.glass,x*1.75,1.62,1.55+z*1.75,.38,.32,.07,.025).rotation.y=a;
  }
  // Three distinct canvas/armor roof ridges carry the barracks silhouette.
  for(const [x,z,w,d] of [[-1.62,-1.65,3.1,3.4],[1.7,-1.48,2.8,3.55]]){
    const ridge=beam(root,m.steel,[x-w*.5,3.55,z-d*.5],[x+w*.5,3.55,z-d*.5],.08);
    box(root,m.team,x,3.62,z-d*.5,w*.58,.07,.09,.01);
  }
  // Front muster arch with floodlights and a central personnel lock.
  for(const side of [-1,1]){
    const post=cyl(root,m.dark,side*2.42,1.6,3.38,.18,.24,2.25,8);
    post.rotation.z=side*.12;
    beam(root,m.armor,[side*2.42,2.6,3.38],[side*1.65,3.8,3.25],.18);
    box(root,m.light,side*2.42,2.65,3.51,.3,.18,.08,.02);
    box(root,m.concrete,side*2.1,.62,3.18,.9,.45,1.2,.16);
    for(let j=0;j<3;j++)box(root,m.dark,side*(1.9+j*.3),.88,3.72-j*.38,.48,.12,.28,.04);
  }
  const canopy=box(root,m.dark,0,3.72,3.16,3.7,.22,1.2,.12);
  canopy.rotation.x=-.08;
  box(root,m.team,0,3.83,3.18,2.45,.08,.08,.02);
  box(root,m.glass,0,1.46,3.47,1.35,.72,.06,.035);
  for(const side of [-1,1]){
    antenna(root,m,side*2.55,2.35,-2.7,2.25);
    cyl(root,m.brass,side*3.0,1.25,-.8,.22,.3,.5,8);
  }
  if(sov){
    // Armoured ridge plates and a large red command star.
    for(let i=0;i<4;i++){
      const plate=box(root,m.armor,0,3.25+i*.13,-2.35+i*.52,5.1-i*.45,.18,.44,.025);
      plate.rotation.z=(i%2?-.1:.1);
    }
    const crest=box(root,m.team,0,2.64,-2.4,.74,.65,.08,.04);
    crest.rotation.z=Math.PI/4;
  }else{
    // Allied signal fin and pale radial identification mark.
    const fin=box(root,m.armor,0,4.15,-1.9,.22,.88,.3,.035);
    fin.rotation.z=.1;
    box(root,m.light,0,4.57,-1.92,.28,.12,.12,.02);
  }
}

export function industry(root,type,faction,m){
  const sov=faction==='soviet';
  if(type==='yard')commandCenter(root,faction,m);
  if(type==='power')powerStation(root,sov,m);
  if(type==='refinery')glmRefinery(root,faction,m);
  if(type==='barracks')barracks(root,sov,m);
  if(type==='factory')glmFactory(root,faction,m);
}
