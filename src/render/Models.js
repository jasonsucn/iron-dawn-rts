import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DEFS } from '../data/definitions.js';
import { palette,optimize } from './Parts.js';
import { vehicle } from './Vehicles.js';
import { rifle as glmRifle } from './GlmRifle.js';
import { rocket as glmRocket } from './GlmRocket.js';
import { advanced as glmAdvanced } from './GlmAdvanced.js';
import { harvester as glmHarvester } from './GlmHarvester.js';
import { mcv as glmMcv } from './GlmMcv.js';
import { industry } from './Industry.js';
import { strategic } from './Strategic.js';
const templates=new Map();
let tankTemplate=null;
let sovietKitTemplate=null;

export function registerTankModel(scene){
  tankTemplate=scene;
}

export function registerSovietKitModel(scene){
  sovietKitTemplate=scene;
}

function materialList(mesh){return Array.isArray(mesh.material)?mesh.material:[mesh.material];}

let trackTextureSource=null;
function makeTrackTexture(){
  if(!trackTextureSource){
    const canvas=document.createElement('canvas');
    canvas.width=128;
    canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#777164';
    ctx.fillRect(0,0,128,128);
    for(let i=0;i<8;i++){
      ctx.fillStyle=i%2?'#3d3b34':'#a09988';
      ctx.fillRect(0,i*16,128,7);
      ctx.fillStyle='rgba(12,11,9,.35)';
      ctx.fillRect(0,i*16+7,128,2);
    }
    for(let i=0;i<80;i++){
      ctx.fillStyle=`rgba(24,20,14,${.04+Math.random()*.14})`;
      ctx.fillRect(Math.random()*128,Math.random()*128,1+Math.random()*3,1+Math.random()*6);
    }
    trackTextureSource=new T.CanvasTexture(canvas);
    trackTextureSource.wrapS=T.RepeatWrapping;
    trackTextureSource.wrapT=T.RepeatWrapping;
    trackTextureSource.repeat.set(2.6,1);
    trackTextureSource.colorSpace=T.SRGBColorSpace;
    trackTextureSource.needsUpdate=true;
  }
  return trackTextureSource.clone();
}

let surfaceTextureSource=null;
function makeSurfaceTexture(){
  if(!surfaceTextureSource){
    const canvas=document.createElement('canvas');
    canvas.width=256;
    canvas.height=256;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#d2cdc0';
    ctx.fillRect(0,0,256,256);
    ctx.strokeStyle='rgba(58,51,40,.16)';
    ctx.lineWidth=1;
    for(let x=0;x<=256;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
    for(let y=0;y<=256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
    for(let i=0;i<240;i++){
      const dark=Math.random()<.65;
      ctx.fillStyle=dark?`rgba(34,29,22,${.02+Math.random()*.1})`:`rgba(255,252,235,${.02+Math.random()*.09})`;
      ctx.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*18,1+Math.random()*2);
    }
    for(let i=0;i<50;i++){
      ctx.fillStyle=`rgba(22,19,14,${.04+Math.random()*.12})`;
      ctx.fillRect(Math.random()*256,Math.random()*256,1,3+Math.random()*18);
    }
    surfaceTextureSource=new T.CanvasTexture(canvas);
    surfaceTextureSource.wrapS=T.RepeatWrapping;
    surfaceTextureSource.wrapT=T.RepeatWrapping;
    surfaceTextureSource.repeat.set(2,2);
    surfaceTextureSource.colorSpace=T.SRGBColorSpace;
    surfaceTextureSource.needsUpdate=true;
  }
  return surfaceTextureSource;
}

function prepareTank(root,faction,kitTemplate){
  root.name='tank';
  const remove=[];
  const variants=new Map();
  const trackTexture=makeTrackTexture();
  const surfaceTexture=makeSurfaceTexture();
  const surfaceVariants=new Map();
  let trackMaterial=null;
  const variant=(mat,color)=>{
    const key=`${mat.uuid}/${color}`;
    if(!variants.has(key)){
      const copy=mat.clone();
      copy.color.set(color);
      variants.set(key,copy);
    }
    return variants.get(key);
  };
  root.traverse(o=>{
    if(o.name==='preview_ground')remove.push(o);
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    if(faction==='soviet'){
      const mats=materialList(o);
      const tinted=mats.map(mat=>{
        if(!mat)return mat;
        if(mat.name?.includes('tank_body'))return variant(mat,'#552b24');
        if(mat.name?.includes('tank_armor'))return variant(mat,'#82513d');
        return mat;
      });
      if(tinted.some((mat,index)=>mat!==mats[index]))o.material=Array.isArray(o.material)?tinted:tinted[0];
    }
    for(const mat of materialList(o)){
      if(!mat)continue;
      if(mat.name?.includes('tank_body')||mat.name?.includes('tank_armor')){
        if(!surfaceVariants.has(mat)){
          const copy=mat.clone();
          copy.map=surfaceTexture;
          copy.needsUpdate=true;
          surfaceVariants.set(mat,copy);
        }
        o.material=Array.isArray(o.material)?o.material.map(m=>m===mat?surfaceVariants.get(mat):m):surfaceVariants.get(mat);
        continue;
      }
      if(mat.name?.includes('tank_rubber')){
        if(!trackMaterial){
          trackMaterial=mat.clone();
          trackMaterial.map=trackTexture;
          trackMaterial.color.set('#9c9588');
          trackMaterial.roughness=.9;
          trackMaterial.metalness=.08;
          trackMaterial.needsUpdate=true;
        }
        o.material=Array.isArray(o.material)?o.material.map(m=>m===mat?trackMaterial:m):trackMaterial;
        continue;
      }
      if(o.name.includes('team_stripe')){
        const tint=mat.clone();
        tint.color.set(faction==='soviet'?'#e2553b':'#32c3d6');
        o.material=Array.isArray(o.material)?o.material.map(m=>m===mat?tint:m):tint;
      }
      if(o.name.includes('glow')){
        const glow=mat.clone();
        const color=faction==='soviet'?'#ff9a62':'#86f7ff';
        glow.color.set(color);
        glow.emissive.set(color);
        glow.emissiveIntensity=1.4;
        glow.toneMapped=false;
        o.material=Array.isArray(o.material)?o.material.map(m=>m===mat?glow:m):glow;
      }
    }
  });
  for(const o of remove)o.parent?.remove(o);

  const body=new T.Group();
  const turret=new T.Group();
  const barrel=new T.Group();
  body.name='body';
  turret.name='turret';
  barrel.name='barrel';
  turret.position.set(0,1.58,.03);
  barrel.position.set(0,.43,.85);
  root.add(body);
  body.add(turret);
  turret.add(barrel);
  root.updateMatrixWorld(true);
  const meshes=[];
  root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const mesh of meshes){
    const name=mesh.name||'';
    const target=name.startsWith('barrel_')?barrel:name.startsWith('turret_')?turret:body;
    target.attach(mesh);
  }
  for(const child of [...body.children]){
    if(child.name?.startsWith('wheel_')||child.name==='hull_skirt_l'||child.name==='hull_skirt_r'||child.name==='team_stripe_skirt_l'||child.name==='team_stripe_skirt_r')body.remove(child);
  }
  if(kitTemplate){
    let kit=null;
    try{ kit=kitTemplate.clone(true); }catch(error){ console.warn('Soviet tank kit clone failed', error); }
    if(kit?.traverse){
      const preview=kit.getObjectByName('kit_preview_ground');
      preview?.parent?.remove(preview);
      const kitMeshes=[];
      kit.traverse(o=>{if(o.isMesh)kitMeshes.push(o);});
      for(const mesh of kitMeshes){
        if(!mesh.parent)continue;
        const target=mesh.name.startsWith('kit_turret_')?turret:body;
        target.attach(mesh);
      }
    }
  }
  batchTankGroup(body);
  batchTankGroup(turret);
  batchTankGroup(barrel);
  return trackTexture;
}

function batchTankGroup(group){
  const meshes=group.children.filter(child=>child.isMesh);
  const batches=new Map();
  for(const mesh of meshes){
    if(mesh.name.includes('team_stripe')||mesh.name.includes('glow'))continue;
    const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
    if(!material)continue;
    if(!batches.has(material))batches.set(material,{objects:[],geometries:[]});
    mesh.updateMatrix();
    const batch=batches.get(material);
    batch.objects.push(mesh);
    batch.geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));
  }
  for(const [material,batch] of batches){
    const merged=mergeGeometries(batch.geometries,false);
    batch.geometries.forEach(g=>g.dispose());
    if(!merged)continue;
    const mesh=new T.Mesh(merged,material);
    mesh.castShadow=true;mesh.receiveShadow=true;
    batch.objects.forEach(o=>group.remove(o));
    group.add(mesh);
  }
}

function addTankMotion(root,faction){
  const body=root.userData.body;
  if(!body)return;
  const wheelGeometries=[];
  const tire=new T.CylinderGeometry(.33,.33,.22,16);
  tire.rotateZ(Math.PI/2);
  wheelGeometries.push(tire);
  const hub=new T.CylinderGeometry(.13,.13,.245,12);
  hub.rotateZ(Math.PI/2);
  wheelGeometries.push(hub);
  wheelGeometries.push(new T.BoxGeometry(.245,.55,.06));
  wheelGeometries.push(new T.BoxGeometry(.245,.06,.55));
  const wheelGeometry=mergeGeometries(wheelGeometries,false)||new T.CylinderGeometry(.33,.33,.22,16);
  wheelGeometries.forEach(g=>g.dispose());
  const wheelMaterial=new T.MeshStandardMaterial({
    color:faction==='soviet'?'#6b493d':'#526166',
    metalness:.55,
    roughness:.48
  });
  const linkMaterial=new T.MeshStandardMaterial({
    color:'#303735',
    metalness:.68,
    roughness:.48
  });
  const wheelZ=[-1.35,-.68,0,.68,1.35];
  const wheelL=new T.InstancedMesh(wheelGeometry,wheelMaterial,5);
  const wheelR=new T.InstancedMesh(wheelGeometry,wheelMaterial,5);
  const linkGeometry=new T.BoxGeometry(.64,.07,.23);
  const linksL=new T.InstancedMesh(linkGeometry,linkMaterial,18);
  const linksR=new T.InstancedMesh(linkGeometry,linkMaterial,18);
  for(const mesh of [wheelL,wheelR,linksL,linksR]){
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.frustumCulled=false;
    body.add(mesh);
  }
  root.userData.trackMotion={wheelL,wheelR,linksL,linksR,phase:0,spin:0,wheelZ};
  updateTankMotion(root.userData.trackMotion);
}

const TANK_LOOP_L=1.8;
const TANK_LOOP_H=.38;
const TANK_LOOP_CY=.42;
const TANK_LOOP_PERIMETER=4*TANK_LOOP_L+4*TANK_LOOP_H;
const TANK_LINK_COUNT=18;
const wheelAxis=new T.Vector3(1,0,0);

function updateTankMotion(motion){
  if(!motion)return;
  const matrix=new T.Matrix4();
  const position=new T.Vector3();
  const quaternion=new T.Quaternion();
  const scale=new T.Vector3(1,1,1);
  quaternion.setFromAxisAngle(wheelAxis,motion.spin);
  for(const [mesh,side] of [[motion.wheelL,-1],[motion.wheelR,1]]){
    for(let i=0;i<motion.wheelZ.length;i++){
      position.set(side*1.28,.42,motion.wheelZ[i]);
      matrix.compose(position,quaternion,scale);
      mesh.setMatrixAt(i,matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  for(const [mesh,side] of [[motion.linksL,-1],[motion.linksR,1]]){
    for(let i=0;i<TANK_LINK_COUNT;i++){
      const raw=((motion.phase+i/TANK_LINK_COUNT)%1+TANK_LINK_COUNT)%1;
      let s=raw*TANK_LOOP_PERIMETER;
      let y,z,angle;
      if(s<2*TANK_LOOP_L){z=-TANK_LOOP_L+s;y=TANK_LOOP_CY+TANK_LOOP_H;angle=0;}
      else if(s<2*TANK_LOOP_L+2*TANK_LOOP_H){z=TANK_LOOP_L;y=TANK_LOOP_CY+TANK_LOOP_H-(s-2*TANK_LOOP_L);angle=Math.PI/2;}
      else if(s<4*TANK_LOOP_L+2*TANK_LOOP_H){z=TANK_LOOP_L-(s-(2*TANK_LOOP_L+2*TANK_LOOP_H));y=TANK_LOOP_CY-TANK_LOOP_H;angle=0;}
      else {z=-TANK_LOOP_L;y=TANK_LOOP_CY-TANK_LOOP_H+(s-(4*TANK_LOOP_L+2*TANK_LOOP_H));angle=Math.PI/2;}
      position.set(side*1.25,y,z);
      quaternion.setFromAxisAngle(wheelAxis,angle);
      matrix.compose(position,quaternion,scale);
      mesh.setMatrixAt(i,matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
}

function addTankLodProxy(root,faction){
  const geometries=[];
  const box=(w,h,d,x,y,z)=>{
    const g=new T.BoxGeometry(w,h,d);
    g.applyMatrix4(new T.Matrix4().makeTranslation(x,y,z));
    geometries.push(g);
  };
  const barrel=new T.CylinderGeometry(.11,.12,2.5,8);
  barrel.applyMatrix4(new T.Matrix4().makeRotationX(Math.PI/2));
  barrel.applyMatrix4(new T.Matrix4().makeTranslation(0,2.02,1.9));
  geometries.push(barrel);
  box(2.5,.85,3.5,0,.95,.15);
  box(.6,.72,3.9,-1.25,.42,0);
  box(.6,.72,3.9,1.25,.42,0);
  box(2.05,.6,2.15,0,1.83,-.05);
  box(.7,.28,1.7,0,1.55,.2);
  const merged=mergeGeometries(geometries,false);
  geometries.forEach(g=>g.dispose());
  if(!merged)return;
  const material=new T.MeshStandardMaterial({
    color:faction==='soviet'?'#5b3027':'#3b4e51',
    roughness:.72,
    metalness:.32,
    flatShading:true
  });
  const proxy=new T.Mesh(merged,material);
  proxy.name='lod_proxy';
  proxy.castShadow=true;
  proxy.receiveShadow=true;
  proxy.visible=false;
  root.add(proxy);
  root.userData.lodProxy=proxy;
}

function resolveParts(root){  const first=name=>root.getObjectByName(name);
  root.userData={body:first('body'),turret:first('turret'),barrel:first('barrel'),cargo:first('cargo'),arm:first('harvest'),radar:first('radar_head')||first('array'),door:first('door'),crane:first('crane')||first('yard_trolley'),hoist:first('yard_hoist'),tracks:[],legs:[],arms:[]};
  root.traverse(o=>{if(o.name.startsWith('tread'))root.userData.tracks.push(o);if(o.name==='leg')root.userData.legs.push(o);if(o.name==='arm')root.userData.arms.push(o);});
}
export function makeModel(type,faction='allied'){
  const key=`${faction}/${type}`;
  if(type==='tank'&&tankTemplate){
    const root=tankTemplate.clone(true);
    const trackTexture=prepareTank(root,faction,faction==='soviet'?sovietKitTemplate:null);
    resolveParts(root);
    root.userData.trackTexture=trackTexture;
    addTankMotion(root,faction);
    addTankLodProxy(root,faction);
    return root;
  }
  if(!templates.has(key)){
    const root=new T.Group(),m=palette(faction);root.name=type;
    if(DEFS[type].building){industry(root,type,faction,m);strategic(root,type,faction,m);}else if(type==='rifle')glmRifle(root,faction,m);else if(type==='rocket')glmRocket(root,faction,m);
    else if(type==='advanced'){glmAdvanced(root,faction,m);}
    else if(type==='harvester'){glmHarvester(root,faction,m);}
    else if(type==='mcv'){glmMcv(root,faction,m);}
    else vehicle(root,type,faction,m);
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
  if(p.crane)p.crane.position.x=Math.sin(time*.34)*1.65;
  if(p.hoist)p.hoist.position.y=-.12-Math.max(0,Math.sin(time*.62))*.42;
  if(p.door)p.door.scale.y=T.MathUtils.damp(p.door.scale.y,e.door>0?.12:1,8,dt);
  if(p.trackTexture&&e.moving)p.trackTexture.offset.x=(p.trackTexture.offset.x-dt*.68)%1;
  if(p.trackMotion&&e.moving){
    p.trackMotion.phase=(p.trackMotion.phase+dt*.82)%1;
    p.trackMotion.spin+=dt*6;
    updateTankMotion(p.trackMotion);
  }
}
export function modelMetrics(type){return DEFS[type].building?{height:type==='yard'?9.2:7,radius:DEFS[type].radius}:{height:DEFS[type].armor==='infantry'?2.3:3.4,radius:2.7};}
