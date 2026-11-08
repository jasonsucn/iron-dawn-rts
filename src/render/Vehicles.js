import * as T from 'three';
import { group,box,cyl,pipe,sphere,antenna,vents,stripe } from './Parts.js';
export function vehicle(root,type,faction,m){
  const sov=faction==='soviet',heavy=type==='advanced'&&sov,utility=type==='harvester'||type==='mcv',wide=heavy?1.2:type==='mcv'?1.22:1;
  const body=group(root,'body');root.userData.body=body;
  for(const side of [-1,1]){
    const track=group(body,`track${side}`,side*1.17*wide,.6,0);
    box(track,m.rubber,0,0,0,.66,1.05,3.7,.22);
    for(let j=0;j<5;j++){const wheel=cyl(track,m.steel,side*.35,-.02,-1.37+j*.68,.34,.34,.08,10);wheel.rotation.z=Math.PI/2;cyl(track,m.dark,side*.4,-.02,-1.37+j*.68,.17,.17,.1,8).rotation.z=Math.PI/2;}
    for(let j=0;j<13;j++){box(track,m.dark,0,.54,-1.7+j*.28,.71,.09,.1,.015);box(track,m.steel,side*.36,0,-1.7+j*.28,.04,.62,.09,.01);}
    box(body,m.armor,side*1.2*wide,1.2,0,.8,.2,3.85,.1);
    const tread=group(body,`tread${side}`,side*1.17*wide,1.16,0);
    for(let j=0;j<7;j++)box(tread,m.steel,0,0,-1.45+j*.48,.55,.03,.08,0);
    (root.userData.tracks??=[]).push(tread);
  }
  box(body,m.body,0,1.1,0,2.45*wide,.75,3.5,.24);
  const nose=box(body,m.armor,0,1.32,1.43,2.25*wide,.4,.8,.13);nose.rotation.x=-.28;
  stripe(body,m.team,0,1.54,1.57,.6,.6);
  box(body,m.dark,0,1.55,-1.25,1.6,.12,.9,.04);vents(body,m,-.68,1.63,-1.25,7);
  for(const side of [-1,1]){box(body,m.light,side*.92*wide,1.27,1.83,.3,.18,.1,.035);box(body,m.team,side*1.52*wide,1.16,.2,.035,.16,1.4,0);pipe(body,m.dark,[side*.9,1.1,-1.6],[side*.9,1.9,-1.7],.13);}
  antenna(body,m,.9*wide,1.6,-1,1.4);
  if(type==='harvester'){
    box(body,m.dark,0,1.9,-.55,2.05,.9,2.15,.16);
    for(const side of [-1,1])box(body,m.brass,side*1.03,2,-.5,.11,.7,2.15,.04);
    const cargo=group(body,'cargo',0,1.6,-.55);root.userData.cargo=cargo;
    for(let i=0;i<14;i++)sphere(cargo,m.ore,Math.sin(i*7)*.75,.45+(i%3)*.19,Math.cos(i*4)*.75,.27);
    box(body,m.armor,-.5,1.95,1.1,1,1,1,.15);box(body,m.glass,-.5,2.1,1.62,.72,.5,.04,.02);
    const arm=group(body,'harvest',.7,1.6,1.3);root.userData.arm=arm;
    pipe(arm,m.brass,[0,0,0],[0,.6,1.3],.17);pipe(arm,m.steel,[0,.6,1.3],[0,-.8,1.9],.12);
    cyl(arm,m.dark,0,-.75,1.9,.6,.25,.6,8);cyl(arm,m.light,0,-1,1.9,.3,.05,.4,6);
  }else if(type==='mcv'){
    box(body,m.armor,0,2,0,2.4,1.4,3,.22);box(body,m.glass,0,2.18,1.54,1.9,.55,.06,.03);
    for(const side of [-1,1]){pipe(body,m.brass,[side*.9,2.8,-1.1],[side*.9,2.8,1],.16);cyl(body,m.dark,side*.95,2.4,-1.4,.27,.27,1.1,8);}
    box(body,m.team,0,2.74,0,1,.08,1.5,.03);antenna(body,m,0,2.8,-.7,1.8);
  }else{
    const turret=group(body,'turret',0,1.58,.03);root.userData.turret=turret;
    cyl(turret,m.dark,0,0,0,1,1.1,.18,16);
    box(turret,m.armor,0,.4,0,heavy?2.45:1.95,.8,sov?1.9:2.1,.26);
    box(turret,m.team,0,.82,-.1,.48,.05,1.1,.02);
    cyl(turret,m.dark,-.38,.9,-.5,.32,.38,.15,12);box(turret,m.light,.65,.5,.87,.26,.19,.08,.02);
    const barrel=group(turret,'barrel',0,.43,.85);root.userData.barrel=barrel;
    if(type==='advanced'&&!sov){
      pipe(barrel,m.steel,[0,0,0],[0,.2,1.9],.17);
      for(const side of [-1,1])pipe(barrel,m.armor,[side*.4,0,0],[side*.27,.2,1.8],.14);
      const crystal=cyl(barrel,m.light,0,.24,1.7,.02,.38,.9,4);crystal.rotation.x=Math.PI/2;
    }else for(const x of heavy?[-.46,.46]:[0]){
      const gun=cyl(barrel,m.steel,x,0,1.18,.12,.17,2.4,10);gun.rotation.x=Math.PI/2;
      box(barrel,m.dark,x,0,2.4,.32,.27,.47,.07);box(barrel,m.brass,x,.06,.4,.38,.3,.65,.06);
    }
    antenna(turret,m,-.7,.7,-.7,1.3);
    if(heavy)for(const side of [-1,1])for(let j=0;j<3;j++)box(turret,m.dark,side*1.28,.5,-.6+j*.4,.35,.4,.24,.03);
  }
  if(sov){for(const side of [-1,1])box(body,m.brass,side*1.35*wide,1.3,-.4,.08,.12,2.2,.02);}
}
export function infantry(root,type,faction,m){
  const body=group(root,'body');root.userData.body=body;
  box(body,m.body,0,1.16,0,.6,.72,.39,.12);box(body,m.armor,0,1.2,.22,.5,.55,.13,.07);
  box(body,m.dark,0,1.18,-.3,.45,.57,.25,.07);sphere(body,m.armor,0,1.84,0,.3);
  cyl(body,m.dark,0,1.96,0,.32,.36,.25,10);box(body,m.light,0,1.85,.26,.34,.09,.06,.02);
  root.userData.legs=[];root.userData.arms=[];
  for(const side of [-1,1]){
    const leg=group(body,'leg',side*.18,.88,0);box(leg,m.body,0,-.32,0,.23,.68,.24,.06);box(leg,m.rubber,0,-.7,.08,.27,.19,.4,.05);root.userData.legs.push(leg);
    const arm=group(body,'arm',side*.41,1.5,0);box(arm,m.armor,0,-.17,.1,.22,.44,.25,.06);box(arm,m.body,0,-.34,.3,.21,.21,.5,.06);root.userData.arms.push(arm);
  }
  const gun=group(body,'turret',.28,1.18,.48);root.userData.turret=gun;
  if(type==='rocket'){const launcher=cyl(gun,m.dark,.05,.28,.05,.18,.18,1.15,8);launcher.rotation.x=Math.PI/2;box(gun,m.team,.05,.48,0,.3,.09,.7,.02);}
  else {box(gun,m.dark,0,0,.22,.14,.19,.8,.025);pipe(gun,m.steel,[0,0,.45],[0,0,.95],.045);}
}
