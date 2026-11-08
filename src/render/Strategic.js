import * as T from 'three';
import { group,box,cyl,pipe,sphere,antenna,foundation } from './Parts.js';
export function strategic(root,type,faction,m){
  const sov=faction==='soviet';
  if(type==='radar'){
    foundation(root,m,7,7);box(root,m.body,0,1.7,0,6.2,2.5,5.8,.22);box(root,m.armor,0,3.1,0,6.5,.35,6.1,.12);
    box(root,m.team,0,2.3,2.95,5,.3,.08,.02);for(let i=0;i<3;i++)box(root,m.light,-1.8+i*1.8,1.6,3,.8,.5,.05,.02);
    cyl(root,m.dark,0,3.65,0,.7,1.1,1,12);
    const radar=group(root,'radar',0,4.3,0);root.userData.radar=radar;
    if(sov){
      for(const x of [-2.4,2.4])pipe(radar,m.steel,[x,0,0],[x,2,0],.1);
      for(let j=0;j<6;j++)pipe(radar,m.brass,[-2.5,j*.35,0],[2.5,j*.35,0],.08);
      for(let j=0;j<8;j++)pipe(radar,m.dark,[-2.45+j*.7,0,0],[-2.45+j*.7,2,0],.055);
      sphere(radar,m.light,0,1,.1,.22);
    }else{
      const dish=group(radar,'dish',0,1,0);dish.rotation.x=.6;
      const g=new T.SphereGeometry(2.3,18,10,0,Math.PI*2,0,1.05);g.rotateX(Math.PI);const mesh=new T.Mesh(g,m.armor);dish.add(mesh);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;pipe(dish,m.steel,[Math.cos(a)*1.95,-1.15,Math.sin(a)*1.95],[0,-3,0],.06);}
      sphere(dish,m.light,0,-2.95,0,.2);
    }
    antenna(root,m,-2.6,3.3,-2.5,2.3);
  }
  if(type==='defense'){
    foundation(root,m,4,4);cyl(root,m.dark,0,.8,0,1.5,1.7,.7,8);cyl(root,m.body,0,2.2,0,.7,1.2,2.4,8);
    const turret=group(root,'turret',0,3.4,0);root.userData.turret=turret;
    if(sov){
      cyl(turret,m.steel,0,1,0,.25,.35,2.2,10);
      for(let i=0;i<5;i++)cyl(turret,m.brass,0,.2+i*.38,0,1-i*.1,1-i*.1,.17,14);
      sphere(turret,m.light,0,2.1,0,.53);for(let i=0;i<4;i++){const a=i*Math.PI/2;pipe(root,m.team,[Math.sin(a)*1.5,.8,Math.cos(a)*1.5],[Math.sin(a)*.7,3,Math.cos(a)*.7],.12);}
    }else{
      cyl(turret,m.armor,0,0,0,1.2,.8,.35,8);
      for(const x of [-.75,.75])pipe(turret,m.armor,[x,0,0],[x,1.7,0],.17);
      const prism=cyl(turret,m.light,0,1.1,0,.01,.5,1.7,4);prism.rotation.z=Math.PI;
      box(turret,m.team,0,.3,.7,.65,.4,.15,.04);
    }
  }
  if(type==='super'){
    foundation(root,m,9,9);cyl(root,m.dark,0,.8,0,3.9,4.1,.7,16);cyl(root,m.concrete,0,1.2,0,3.65,3.65,.2,16);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;box(root,m.brass,Math.sin(a)*3.5,1.34,Math.cos(a)*3.5,.3,.06,.65,.02).rotation.y=a;}
    const array=group(root,'array',0,1.35,0);root.userData.radar=array;
    if(sov){
      for(const x of [-1,1]){const hatch=box(array,m.body,x*1.55,.15,0,3,.32,6,.12);hatch.rotation.z=x*.12;}
      cyl(root,m.steel,0,1.6,0,.52,.7,1.2,12);cyl(root,m.armor,0,2.55,0,.02,.52,.8,12);
      box(root,m.team,-3,1.7,-3,1.3,1.3,1.3,.12);antenna(root,m,3,1.4,-3,4);
      for(const x of [-3.6,3.6])box(root,m.light,x,1.6,2.9,.15,.3,.15,.02);
    }else{
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const p=group(array,'mirror',Math.sin(a)*2.2,0,Math.cos(a)*2.2);p.rotation.y=a;
        pipe(p,m.steel,[0,0,0],[0,3,0],.2);const panel=box(p,m.glass,0,3,0,2.8,1.6,.22,.12);panel.rotation.x=-.65;box(p,m.light,0,3,.18,2.5,.09,.12,.02);}
      cyl(root,m.body,0,2.9,0,.65,1.1,3,8);cyl(root,m.light,0,4.6,0,.01,.7,1.2,6);
      for(let i=0;i<3;i++)cyl(root,m.brass,0,3.2+i*.5,0,1.1,1.1,.12,14);
    }
  }
}
