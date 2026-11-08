import * as T from 'three';
import { terrainHeight,isWater } from '../core/Map.js';
function groundTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');const img=ctx.createImageData(256,256);
 let seed=99173;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4;const broad=Math.sin(x*.055+Math.sin(y*.031))*Math.cos(y*.047)*7;
  const grain=(rand()-.5)*18;const speck=rand()>.986?42:0;const v=Math.max(120,Math.min(255,205+broad+grain+speck));
  img.data[i]=v;img.data[i+1]=v;img.data[i+2]=v*.94;img.data[i+3]=255;
 }
 ctx.putImageData(img,0,0);
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(12,12);tex.anisotropy=4;tex.colorSpace=T.SRGBColorSpace;return tex;
}
function groundGeometry(){
 const n=180,positions=[],colors=[],indices=[];const base=new T.Color('#43563f'),mud=new T.Color('#796247'),rock=new T.Color('#656b60'),water=new T.Color('#2d505a');
 for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){
  const wx=-80+x*160/n,wz=-80+z*160/n,y=terrainHeight(wx,wz);positions.push(wx,y,wz);
  const noise=Math.sin(wx*.7+Math.sin(wz*.8))*Math.cos(wz*.43)*.045,road=Math.abs(wx+wz)<3.1||Math.abs(wx-wz-18)<2.2,wet=isWater(wx,wz);
  const c=wet?water.clone():road?mud.clone():Math.abs(y)>.8?rock.clone():base.clone();c.offsetHSL(noise,noise*.4,noise*1.4);colors.push(c.r,c.g,c.b);
  if(x<n&&z<n){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function grass(scene){
 let seed=77123;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const placements=[];for(let i=0;i<6000;i++){
  const x=rand()*148-74,z=rand()*148-74;
  if(isWater(x,z)||Math.abs(x+z)<4.6||Math.abs(x-z-18)<3.3)continue;
  if(Math.hypot(x+48,z-44)<12||Math.hypot(x-48,z+44)<12)continue;
  if(Math.hypot(x,z)<2.5)continue;
  placements.push([x,z,.55+rand()*1.15,rand()*Math.PI*2,rand()]);
 }
 const geo=new T.ConeGeometry(.11,.58,3,1,false);geo.translate(0,.29,0);
 const mat=new T.MeshStandardMaterial({color:'#7d8750',roughness:1,metalness:0,side:T.DoubleSide});
 const mesh=new T.InstancedMesh(geo,mat,placements.length);const dummy=new T.Object3D(),color=new T.Color();
 placements.forEach(([x,z,s,r,tone],i)=>{
  dummy.position.set(x,terrainHeight(x,z),z);dummy.rotation.set(0,r,(rand()-.5)*.25);dummy.scale.set(.6+s*.6,s,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  color.setHSL(.16+tone*.055,.22+tone*.1,.26+tone*.11);mesh.setColorAt(i,color);
 });
 mesh.receiveShadow=true;mesh.frustumCulled=true;scene.add(mesh);
}
function dust(scene){
 let seed=3819;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const positions=new Float32Array(240*3);
 for(let i=0;i<240;i++){positions[i*3]=rand()*120-60;positions[i*3+1]=1+rand()*16;positions[i*3+2]=rand()*120-60;}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));
 const mat=new T.PointsMaterial({color:'#ffd9a0',size:.085,transparent:true,opacity:.36,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true});
 const points=new T.Points(geo,mat);points.frustumCulled=false;scene.add(points);
}
function trees(scene,seed=1423){
 let s=seed;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const placements=[];for(let i=0;i<670;i++){
  const x=rand()*150-75,z=rand()*150-75;
  if(isWater(x,z)||Math.abs(x+z)<6||Math.hypot(x+48,z-44)<22||Math.hypot(x-48,z+44)<22)continue;
  if(Math.random()<0.06)continue;placements.push([x,z,.7+rand()*.85,rand()*Math.PI*2]);
 }
 const trunk=new T.InstancedMesh(new T.CylinderGeometry(.12,.22,1.4,6),new T.MeshStandardMaterial({color:'#4a3f31',roughness:1}),placements.length);
 const crown=new T.InstancedMesh(new T.ConeGeometry(1,2.7,7),new T.MeshStandardMaterial({color:'#2c4237',roughness:.95}),placements.length);
 const brass=new T.Object3D(),pale=new T.Color();
 placements.forEach(([x,z,scale,rot],i)=>{const y=terrainHeight(x,z);brass.position.set(x,y+.7*scale,z);brass.rotation.set(0,rot,0);brass.scale.setScalar(scale);brass.updateMatrix();trunk.setMatrixAt(i,brass.matrix);crown.setMatrixAt(i,brass.matrix);crown.setColorAt(i,pale.setHSL(.28+rand()*.09,.22,.16+rand()*.09));brass.position.y+=1.6*scale;brass.scale.setScalar(1.13*scale);brass.updateMatrix();crown.setMatrixAt(i,brass.matrix);});
 trunk.castShadow=true;crown.castShadow=true;scene.add(trunk,crown);
}
function oreVisuals(scene,map){
 const geo=new T.OctahedronGeometry(1,0),mat=new T.MeshStandardMaterial({color:'#efb33d',emissive:'#9e640d',emissiveIntensity:.9,metalness:.55,roughness:.28}),crystals=new T.InstancedMesh(geo,mat,map.ore.length*3),o=new T.Object3D();let k=0;
 for(const ore of map.ore)for(let j=0;j<3;j++){const x=ore.x+(j-1)*.65,z=ore.z+Math.sin(j*3+ore.id)*.5;y: {const y=terrainHeight(x,z);o.position.set(x,y+.6+j*.06,z);o.rotation.set(.1,j*1.4,.14);const size=.34+((ore.id+j)%3)*.12;o.scale.set(size,size*(1.2+j*.13),size);o.updateMatrix();crystals.setMatrixAt(k++,o.matrix);}}
 crystals.count=k;crystals.castShadow=true;scene.add(crystals);
 const patches=new T.InstancedMesh(new T.CircleGeometry(1,10),new T.MeshBasicMaterial({color:'#b48d40',transparent:true,opacity:.17,depthWrite:false}),map.fields.length);
 map.fields.forEach(([x,z],i)=>{o.position.set(x,terrainHeight(x,z)+.025,z);o.rotation.set(-Math.PI/2,0,0);o.scale.set(9,8,1);o.updateMatrix();patches.setMatrixAt(i,o.matrix);});scene.add(patches);
}
function rocks(scene,map){
 const geo=new T.DodecahedronGeometry(1,0),mat=new T.MeshStandardMaterial({color:'#62665e',roughness:.95});const mesh=new T.InstancedMesh(geo,mat,map.rocks.length),o=new T.Object3D();
 map.rocks.forEach((r,i)=>{o.position.set(r.x,terrainHeight(r.x,r.z)+r.height*.25,r.z);o.scale.set(r.radius*.9,r.height,r.radius);o.rotation.set(.13*i,.7*i,.08*i);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=true;scene.add(mesh);
}
export function buildTerrain(scene,map){
 const ground=new T.Mesh(groundGeometry(),new T.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:.015,map:groundTexture()}));ground.receiveShadow=true;scene.add(ground);
 const waterGeom=new T.BufferGeometry(),p=[],idx=[];const segments=400;
 for(let i=0;i<=segments;i++){const z=-80+i*160/segments;const river=Math.sin(z*.055)*6;for(const side of [-1,1])p.push(river+side*4.3,terrainHeight(river,z)+.05,z);if(i<segments){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
 waterGeom.setAttribute('position',new T.Float32BufferAttribute(p,3));waterGeom.setIndex(idx);waterGeom.computeVertexNormals();const water=new T.Mesh(waterGeom,new T.MeshPhysicalMaterial({color:'#3d6f79',metalness:.32,roughness:.18,transparent:true,opacity:.82,side:T.DoubleSide,clearcoat:.9,clearcoatRoughness:.22}));water.receiveShadow=true;scene.add(water);
 trees(scene);oreVisuals(scene,map);rocks(scene,map);grass(scene);dust(scene);
 const boundary=new T.Mesh(new T.RingGeometry(75.7,77,96),new T.MeshBasicMaterial({color:'#a57747',transparent:true,opacity:.4,side:T.DoubleSide}));boundary.rotation.x=-Math.PI/2;boundary.position.y=-.1;scene.add(boundary);
 const sun=new T.Mesh(new T.SphereGeometry(8,24,16),new T.MeshBasicMaterial({color:'#ffc77c'}));sun.position.set(-54,43,-105);scene.add(sun);
 const haze=new T.Mesh(new T.SphereGeometry(11,20,12),new T.MeshBasicMaterial({color:'#ed9260',transparent:true,opacity:.12,side:T.BackSide,depthWrite:false}));haze.position.copy(sun.position);scene.add(haze);
 return {ground,water,sun};
}
