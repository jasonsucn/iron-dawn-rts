import * as T from 'three';
const V=new T.Vector3();
export class Effects{
 constructor(scene){this.scene=scene;this.live=[];this.pool={};this.max=150;this.random=Math.random;}
 take(kind,color){let o=this.pool[kind]?.pop();if(o){o.visible=true;o.material.color.set(color);o.material.opacity=1;o.scale.setScalar(1);this.scene.add(o);}else{const geo=kind==='beam'?new T.CylinderGeometry(.035,.035,1,5):kind==='ring'?new T.TorusGeometry(1,.12,5,28):new T.IcosahedronGeometry(1,1);const mat=new T.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false,side:T.DoubleSide,blending:(kind==='beam'||kind==='flash'||kind==='ring'||kind==='bullet')?T.AdditiveBlending:T.NormalBlending});o=new T.Mesh(geo,mat);this.scene.add(o);}if(this.live.length>=this.max)this.release(0);return o;}
 add(o,ttl,update,kind='shard'){this.live.push({o,age:0,ttl,update,kind});}
 release(i){const [fx]=this.live.splice(i,1);if(!fx)return;fx.o.visible=false;if(fx.o.isLight)fx.o.intensity=0;fx.o.parent?.remove(fx.o);if(!fx.o.isLight)(this.pool[fx.kind]??=[]).push(fx.o);}
 event(type,d){
  if(type==='fire'){
   const distance=Math.hypot(d.tx-d.x,d.tz-d.z);
   if(d.kind==='energy'||d.kind==='beam'){const o=this.take('beam',d.faction==='soviet'?'#ff5847':'#6df8ff');V.set(d.tx-d.x,1.1,d.tz-d.z);const len=V.length();o.position.set((d.x+d.tx)/2,1.8,(d.z+d.tz)/2);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),V.normalize());o.scale.set(1.4,len,1.4);this.add(o,.22,fx=>{fx.o.material.opacity=1-fx.age/fx.ttl;},'beam');
    const glow=this.take('flash',d.faction==='soviet'?'#ff9a70':'#b0ffff');glow.position.set(d.tx,1.6,d.tz);glow.scale.setScalar(.45);this.add(glow,.28,fx=>{fx.o.scale.setScalar(.45+fx.age*3);fx.o.material.opacity=.65*(1-fx.age/fx.ttl);},'flash');
   }
   else {
    const travel=Math.max(.07,Math.min(1.2,distance/Math.max(8,d.speed||60)));
    const o=this.take('bullet',d.kind==='rocket'?'#ff9d49':d.kind==='piercing'?'#ffe4a0':'#eaffdc');
    o.position.set(d.x,1.8,d.z);
    const size=d.kind==='piercing'?.12:d.kind==='rocket'?.1:.045;o.scale.setScalar(size);
    this.add(o,travel,fx=>{
      const t=Math.min(1,fx.age/fx.ttl);
      fx.o.position.lerpVectors(new T.Vector3(d.x,1.8,d.z),new T.Vector3(d.tx,1,d.tz),t);
      fx.o.material.opacity=1;
    },'bullet');
    const muzzle=this.take('flash',d.kind==='rocket'?'#ff9a4a':d.kind==='piercing'?'#ffd984':'#ecffe2');
    muzzle.position.set(d.x,1.7,d.z);muzzle.scale.setScalar(d.kind==='piercing'?.38:.23);
    this.add(muzzle,.12,fx=>{fx.o.material.opacity=Math.max(0,1-fx.age/fx.ttl);fx.o.scale.setScalar((d.kind==='piercing'?.38:.23)*(1+fx.age*2));},'flash');
    if(d.kind==='rocket')for(let i=1;i<=3;i++){const smoke=this.take('smoke','#6c6256');const t=i/4;smoke.position.set(d.x+(d.tx-d.x)*t,.9,d.z+(d.tz-d.z)*t);this.add(smoke,.7+i*.18,fx=>{fx.o.scale.setScalar(.18+fx.age*.32);fx.o.material.opacity=.14*(1-fx.age/fx.ttl);});}
   }
  }
  if(type==='beam')this.event('fire',{...d,kind:'beam',faction:d.faction});
  if(type==='impact'||type==='death')this.burst(d.x,d.z,type==='death'?(d.building?4.2:2.1):d.size||1.1,d.building?'#ffb467':d.kind==='bullet'?'#e6dfaa':'#ff934f');
  if(type==='strikeWarning'){const o=this.take('ring','#ff6953');o.position.set(d.x,.3,d.z);o.scale.setScalar(2);this.add(o,3.2,fx=>{fx.o.scale.setScalar(2+fx.age*1.3);fx.o.material.opacity=.65*(1-fx.age/fx.ttl);});}
  if(type==='supernova')this.supernova(d);
  if(type==='spawn'&&d.entity?.construct)this.burst(d.entity.x,d.entity.z,2,'#b8b08b');
 }
 supernova(d){
  const nuke=d.faction==='soviet',color=nuke?'#ff5e36':'#8ef7ff';
  this.burst(d.x,d.z,11,nuke?'#ff4b2d':'#79edff');
  const flash=this.take('flash',nuke?'#ffe6b6':'#ddffff');flash.position.set(d.x,6,d.z);flash.scale.setScalar(2);this.add(flash,1.2,fx=>{fx.o.scale.setScalar(2+fx.age*17);fx.o.material.opacity=Math.max(0,1-fx.age/fx.ttl);},'flash');
  for(let i=0;i<3;i++){const ring=this.take('ring',color);ring.position.set(d.x,.45+i*.02,d.z);this.add(ring,1.3+i*.35,fx=>{fx.o.scale.setScalar(1+fx.age*(8-i*2));fx.o.material.opacity=.55*(1-fx.age/fx.ttl);},'ring');}
  if(!nuke){
   const beam=this.take('beam','#b9fcff');beam.position.set(d.x,24,d.z);beam.scale.set(9,52,9);this.add(beam,1.1,fx=>{fx.o.material.opacity=.86*(1-fx.age/fx.ttl);fx.o.scale.x=9+fx.age*3;fx.o.scale.z=9+fx.age*3;},'beam');
  }else{
   const stem=this.take('beam','#ffb16d');stem.position.set(d.x,13,d.z);stem.scale.set(5,30,5);this.add(stem,2.2,fx=>{fx.o.material.opacity=.38*(1-fx.age/fx.ttl);fx.o.scale.x=5+fx.age*5;fx.o.scale.z=4+fx.age*4;},'beam');
  }
  for(let i=0;i<34;i++){
   const angle=Math.random()*Math.PI*2,radius=Math.random()*13,size=2+Math.random()*5;
   const smoke=this.take('smoke',nuke&&i%3===0?'#5a4438':'#4e5148');const sx=d.x+Math.cos(angle)*radius*.35,sz=d.z+Math.sin(angle)*radius*.35;const wobble=Math.random()*5;
   smoke.position.set(sx,1+Math.random()*4,sz);const drift=Math.cos(angle)*(2+Math.random()*7),driftZ=Math.sin(angle)*(2+Math.random()*7);const ttl=2.8+Math.random()*3.4;
   this.add(smoke,ttl,fx=>{const t=fx.age;fx.o.position.set(sx+drift*t*.23,1+t*(3.2+Math.sin(t*2+wobble)*.35),sz+driftZ*t*.23);fx.o.scale.setScalar(size*(.3+t*.45));fx.o.material.opacity=Math.max(0,.3*(1-t/fx.ttl));});
  }
  for(let i=0;i<20;i++){
   const o=this.take('shard',i%3===0?'#ffde9d':i%3===1?'#a9937a':'#4d4b42');const angle=Math.random()*Math.PI*2,speed=6+Math.random()*18,scale=.1+Math.random()*.06;o.position.set(d.x,.5,d.z);
   this.add(o,1.2+Math.random()*1.5,fx=>{const t=fx.age;fx.o.position.set(d.x+Math.cos(angle)*speed*t,.5+Math.sin(t*5+i)*6*t-9*t*t,d.z+Math.sin(angle)*speed*t);fx.o.scale.setScalar(scale);fx.o.material.opacity=Math.max(0,1-t/fx.ttl);});
  }
  const light=new T.PointLight(nuke?'#ff7b45':'#8cefff',nuke?350:260,80,2);light.position.set(d.x,7,d.z);light.visible=true;this.scene.add(light);
  this.add(light,1.25,fx=>{fx.o.intensity=(nuke?350:260)*Math.max(0,1-fx.age/fx.ttl);},'light');
 }
 burst(x,z,size,color){
  const flash=this.take('flash','#fff0be');flash.position.set(x,.8,z);this.add(flash,.27,fx=>{fx.o.scale.setScalar(size*(.35+fx.age*2));fx.o.material.opacity=1-fx.age/fx.ttl;});
  const ring=this.take('ring',color);ring.position.set(x,.15,z);this.add(ring,.8,fx=>{fx.o.scale.setScalar(size*(.2+fx.age*1.6));fx.o.material.opacity=.7*(1-fx.age/fx.ttl);});
  for(let i=0;i<5;i++){const c=i%2?'#5a5046':'#f39546',o=this.take('shard',c),a=Math.random()*Math.PI*2,v=1+Math.random()*4;o.position.set(x,.4+Math.random()*.7,z);const start=o.position.clone();this.add(o,.5+Math.random()*.55,fx=>{o.position.set(start.x+Math.cos(a)*v*fx.age,.4+fx.age*(2-fx.age*1.6),start.z+Math.sin(a)*v*fx.age);o.scale.setScalar(size*.12*(1-fx.age/fx.ttl));o.material.opacity=1-fx.age/fx.ttl;});}
  for(let i=0;i<3;i++){const o=this.take('smoke','#554b43'),a=Math.random()*Math.PI*2;o.position.set(x,.5,z);const start=o.position.clone();this.add(o,1.7+i*.3,fx=>{const t=fx.age; o.position.set(start.x+Math.cos(a)*t*1.1,.5+t*2,start.z+Math.sin(a)*t*1.1);o.scale.setScalar(size*(.12+t*.47));o.material.opacity=Math.max(0,.38*(1-t/fx.ttl));});}
 }
 update(dt){for(let i=this.live.length-1;i>=0;i--){const fx=this.live[i];fx.age+=dt;if(fx.age>=fx.ttl){this.release(i);continue;}fx.update?.(fx);}}
 clear(){for(let i=this.live.length-1;i>=0;i--)this.release(i);this.pool=Object.fromEntries(Object.entries(this.pool).map(([k,v])=>{v.forEach(o=>{o.geometry.dispose();o.material.dispose();});return[k,[]];}));}
}
