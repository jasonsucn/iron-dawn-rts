import * as T from 'three';
import { DEFS } from '../data/definitions.js';
import { palette,optimize } from './Parts.js';
import { vehicle,infantry } from './Vehicles.js';
import { industry } from './Industry.js';
import { strategic } from './Strategic.js';
const templates=new Map();
function resolveParts(root){
  const first=name=>root.getObjectByName(name);
  root.userData={body:first('body'),turret:first('turret'),barrel:first('barrel'),cargo:first('cargo'),arm:first('harvest'),radar:first('radar')||first('array'),door:first('door'),crane:first('crane'),tracks:[],legs:[],arms:[]};
  root.traverse(o=>{if(o.name.startsWith('tread'))root.userData.tracks.push(o);if(o.name==='leg')root.userData.legs.push(o);if(o.name==='arm')root.userData.arms.push(o);});
}
export function makeModel(type,faction='allied'){
  const key=`${faction}/${type}`;
  if(!templates.has(key)){
    const root=new T.Group(),m=palette(faction);root.name=type;
    if(DEFS[type].building){industry(root,type,faction,m);strategic(root,type,faction,m);}else if(DEFS[type].armor==='infantry')infantry(root,type,faction,m);else vehicle(root,type,faction,m);
    optimize(root);root.userData={};templates.set(key,root);
  }
  const root=templates.get(key).clone(true);resolveParts(root);return root;
}
export function animateModel(root,e,time,dt){
  const p=root.userData,walk=e.moving?Math.sin(time*11+e.id)*.7:0;
  if(!e.def.building){root.rotation.y=e.angle;
    if(p.body){p.body.position.y=e.moving?Math.sin(time*12+e.id)*.045:0;p.body.rotation.z=e.moving?Math.sin(time*7+e.id)*.018:0;}
    if(p.turret)p.turret.rotation.y=e.turret-e.angle;
  }else if(p.turret)p.turret.rotation.y=e.turret;
  if(p.barrel)p.barrel.position.z=.85-e.recoil*.4;
  p.legs.forEach((o,i)=>o.rotation.x=walk*(i?1:-1));
  p.arms.forEach((o,i)=>o.rotation.x=walk*(i?-1:1)*.4);
  p.tracks.forEach(o=>o.position.z=e.moving?(time*2% .48):0);
  if(p.cargo)p.cargo.scale.y=Math.max(.04,e.cargo/700);
  if(p.arm)p.arm.rotation.x=e.harvesting?-.1+Math.sin(time*9)*.16:.2;
  if(p.radar)p.radar.rotation.y=time*(e.type==='super'?.12:.48);
  if(p.crane)p.crane.rotation.y=Math.sin(time*.25)*.14;
  if(p.door)p.door.scale.y=T.MathUtils.damp(p.door.scale.y,e.door>0?.12:1,8,dt);
}
export function modelMetrics(type){return DEFS[type].building?{height:7,radius:DEFS[type].radius}:{height:DEFS[type].armor==='infantry'?2.3:3.4,radius:2.7};}
