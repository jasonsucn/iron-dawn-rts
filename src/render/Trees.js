import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainHeight,isWater } from '../core/Map.js';

// ---- 树：三种变体，各自合并成一个几何体，用 InstancedMesh 批量绘制 ----
function tint(geo,color){
  const g=geo.index?geo.toNonIndexed():geo.clone();
  const c=new T.Color(color);
  const n=g.attributes.position.count;
  const arr=new Float32Array(n*3);
  for(let i=0;i<n;i++){arr[i*3]=c.r;arr[i*3+1]=c.g;arr[i*3+2]=c.b;}
  g.setAttribute('color',new T.BufferAttribute(arr,3));
  if(!g.attributes.uv){
    const uv=new Float32Array(n*2);g.setAttribute('uv',new T.BufferAttribute(uv,2));
  }
  return g;
}

function coniferGeometry(seed, low=false){
  let s=seed;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const parts=[];
  parts.push(tint(new T.CylinderGeometry(.10,.20,1.05,6).translate(0,.52,0),'#4a3f31'));
  const tiers=low?[[.95,.78,0,1.35,'#24382d'],[.62,.66,.01,2.15,'#32523d']]:[[1.02,.62,-.04,1.02,'#223a2c'],[.78,.58,-.02,1.62,'#294733'],[.54,.52,.02,2.14,'#315641'],[.30,.42,.01,2.55,'#3b6449']];
  tiers.forEach(([r,h,off,y,color],i)=>{
    const cone=new T.ConeGeometry(r*(.94+rand()*.12),h,7);
    cone.rotateY(rand()*Math.PI*2);
    cone.translate(rand()*.05-.025,y+off*0,rand()*.05-.025);
    parts.push(tint(cone,color));
  });
  for(let i=0;i<(low?0:3);i++){
    const a=rand()*Math.PI*2,rad=.42+rand()*.18,y=.48+rand()*.4;
    const br=new T.CylinderGeometry(.028,.05,.42,4);
    br.rotateZ(Math.PI/1.85);br.rotateY(a);br.translate(Math.cos(a)*rad*.5,y,Math.sin(a)*rad*.5);
    parts.push(tint(br,'#243a2c'));
  }
  return mergeGeometries(parts,false);
}

function broadleafGeometry(seed, low=false){
  let s=seed;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const parts=[];
  parts.push(tint(new T.CylinderGeometry(.11,.22,1.45,6).translate(0,.72,0),'#514433'));
  for(let i=0;i<(low?1:4);i++){
    const a=rand()*Math.PI*2,rad=.34+rand()*.3,y=1.35+rand()*.75,r=.62+rand()*.28;
    const blob=new T.IcosahedronGeometry(r,0);
    blob.scale(1, .82+rand()*.3, 1);
    blob.translate(Math.cos(a)*rad,y,Math.sin(a)*rad);
    parts.push(tint(blob,i%2?'#35513a':'#2c4531'));
  }
  const top=new T.IcosahedronGeometry(.72,0);
  top.scale(1.1,.8,1.1);top.translate(0,2.2,0);
  parts.push(tint(top,'#3d5f42'));
  return mergeGeometries(parts,false);
}

function deadTreeGeometry(seed, low=false){
  let s=seed;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const parts=[];
  parts.push(tint(new T.CylinderGeometry(.07,.17,2.1,6).translate(0,1.05,0),'#4b4236'));
  for(let i=0;i<(low?2:4);i++){
    const a=rand()*Math.PI*2,y=.85+i*.36,len=.55+rand()*.5;
    const br=new T.CylinderGeometry(.028,.062,len,4);
    br.translate(0,len/2,0);
    br.rotateZ(.55+rand()*.35);
    br.rotateY(a);
    br.translate(0,y,0);
    parts.push(tint(br,'#4b4236'));
  }
  return mergeGeometries(parts,false);
}

export function treeVariants(low=false){
  return [coniferGeometry(9137,low),broadleafGeometry(4421,low),deadTreeGeometry(7717,low)];
}

const treeHandles=[];
let treeLowQuality=false;

export function setTreeQuality(low){
  treeLowQuality=!!low;
  for(const handle of treeHandles){
    const next=treeLowQuality?handle.low():handle.full;
    if(handle.mesh.geometry===next)continue;
    handle.mesh.geometry=next;
    handle.mesh.geometry.computeBoundingSphere();
    handle.mesh.geometry.computeBoundingBox();
  }
}

export function trees(scene,seed=1423){
  let s=seed;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const placements=[];
  for(let i=0;i<670;i++){
    const x=rand()*150-75,z=rand()*150-75;
    if(isWater(x,z)||Math.abs(x+z)<6||Math.hypot(x+48,z-44)<22||Math.hypot(x-48,z+44)<22)continue;
    if(rand()<0.06)continue;
    const roll=rand();
    const kind=roll<.58?0:roll<.88?1:2;
    placements.push([x,z,.62+rand()*.7,rand()*Math.PI*2,kind,rand()]);
  }

  const variants=[coniferGeometry(9137),broadleafGeometry(4421),deadTreeGeometry(7717)];
  const lowBuilders=[()=>coniferGeometry(9137,true),()=>broadleafGeometry(4421,true),()=>deadTreeGeometry(7717,true)];
  const buckets=[[],[],[]];
  placements.forEach(p=>buckets[p[4]].push(p));

  const dummy=new T.Object3D(),tintColor=new T.Color();
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,flatShading:true});
  variants.forEach((geometry,index)=>{
    const list=buckets[index];
    if(!list.length||!geometry)return;
    const mesh=new T.InstancedMesh(geometry,material,list.length);
    list.forEach(([x,z,scale,rot,kind,shade],i)=>{
      const y=terrainHeight(x,z);
      dummy.position.set(x,y,z);
      dummy.rotation.set(0,rot,0);
      dummy.scale.setScalar(scale*(kind===1?1.02:1));
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      tintColor.setHSL(.29+shade*.07,.18+shade*.12,.86+shade*.22);
      mesh.setColorAt(i,tintColor);
    });
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.frustumCulled=true;
    scene.add(mesh);
    treeHandles.push({ mesh, full: geometry, low: lowBuilders[index] });
  });
}
