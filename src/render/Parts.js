import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const geometries=new Map(), palettes=new Map();
export function geometry(key,make){if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);}
export function palette(faction){
  if(palettes.has(faction))return palettes.get(faction);
  const s=faction==='soviet';
  const mat=(color,metalness=.52,roughness=.52)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const m={
   body:mat(s?'#62382f':'#4c6670'),
   armor:mat(s?'#9a5d49':'#a9b4a6',.45,.5),
   dark:mat('#172526',.68),
   steel:mat('#849596',.82,.32),
   rubber:mat('#111c1c',.03,.96),
   concrete:mat('#6b7164',.05,.96),
   brass:mat('#c6a05c',.72,.38),
   team:mat(s?'#e2553b':'#32c3d6',.35,.4),
   glass:mat('#0e3540',.6,.2),
   ore:mat('#efb33d',.6,.35)
  };
  m.light=new T.MeshStandardMaterial({color:s?'#ff7842':'#85f6ff',emissive:s?'#f44512':'#27cfeb',emissiveIntensity:2,roughness:.25});
  m.warm=new T.MeshStandardMaterial({color:'#ffdfa3',emissive:'#ff9a35',emissiveIntensity:2});
  m.ore.emissive=new T.Color('#a46108');m.ore.emissiveIntensity=.6;
  palettes.set(faction,m);return m;
}
export function group(parent,name,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
export function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export function box(parent,m,x,y,z,w,h,d,r=.08){return mesh(parent,geometry(`b${w},${h},${d},${r}`,()=>r?new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/4,h/4,d/4)):new T.BoxGeometry(w,h,d)),m,x,y,z);}
export function cyl(parent,m,x,y,z,rt,rb,h,n=12){return mesh(parent,geometry(`c${rt},${rb},${h},${n}`,()=>new T.CylinderGeometry(rt,rb,h,n)),m,x,y,z);}
export function sphere(parent,m,x,y,z,r=1){return mesh(parent,geometry(`s${r}`,()=>new T.IcosahedronGeometry(r,1)),m,x,y,z);}
export function pipe(parent,m,a,b,r=.12){const start=new T.Vector3(...a),end=new T.Vector3(...b),diff=end.clone().sub(start);const o=cyl(parent,m,...start.clone().add(end).multiplyScalar(.5).toArray(),r,r,diff.length(),8);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.normalize());return o;}
export function stripe(parent,m,x,y,z,w,d){box(parent,m,x,y,z,w,.045,d,0);}
export function antenna(parent,m,x,y,z,h=2){cyl(parent,m.dark,x,y+h/2,z,.035,.055,h,6);sphere(parent,m.light,x,y+h,z,.09);}
export function vents(parent,m,x,y,z,count=6){for(let i=0;i<count;i++)box(parent,m.dark,x+i*.23,y,z,.11,.035,.65,0);}
export function foundation(root,m,w,d){box(root,m.concrete,0,.15,0,w+.5,.4,d+.5,.16);box(root,m.dark,0,.42,0,w,.16,d,.05);for(const x of [-1,1])for(const z of [-1,1])box(root,m.brass,x*(w/2-.35),.52,z*(d/2-.35),.4,.07,.4,0);}
export function windows(root,m,x,y,z,n=4,step=.6){for(let i=0;i<n;i++)box(root,m.light,x+i*step,y,z,.35,.32,.06,.01);}
export function optimize(root){
  for(const child of [...root.children])if(child.isGroup)optimize(child);
  const batches=new Map();
  for(const o of root.children)if(o.isMesh&&!Array.isArray(o.material)){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o);}
  for(const [mat,items] of batches){if(items.length<2)continue;const gs=items.map(o=>{o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrix);});const merged=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(!merged)continue;const combined=new T.Mesh(merged,mat);combined.castShadow=true;combined.receiveShadow=true;root.add(combined);items.forEach(o=>root.remove(o));}
  return root;
}
