import { group,box,cyl,pipe,sphere,antenna,vents,foundation,windows } from './Parts.js';
export function industry(root,type,faction,m){
  const sov=faction==='soviet';
  if(type==='yard'){
    foundation(root,m,10,9);box(root,m.body,-1,2.1,0,7,3.2,6.8,.3);
    box(root,m.armor,-1,3.84,0,7.4,.35,7.2,.13);
    box(root,m.dark,-1,1.5,3.45,4,2.25,.12,.02);
    for(let i=0;i<8;i++)box(root,m.steel,-1,.6+i*.27,3.55,3.8,.07,.07,0);
    box(root,m.team,-1,3.2,3.51,5,.42,.08,.02);windows(root,m,-3.2,2.8,-3.44,6,.85);
    box(root,m.concrete,3,2,0,2.5,3.1,5,.14);box(root,m.armor,3,4,.3,2.7,1.5,3.5,.16);
    windows(root,m,2.1,4.1,2.1,3,.7);antenna(root,m,3.7,4.8,0,2.8);
    const crane=group(root,'crane',-1,4.1,-1);root.userData.crane=crane;
    for(const x of [-.4,.4])pipe(crane,m.brass,[x,0,0],[x,2.6,0],.15);
    pipe(crane,m.brass,[-3,2.5,0],[4.6,2.5,0],.17);pipe(crane,m.brass,[-3,3.2,0],[4.6,3.2,0],.12);
    for(let i=-3;i<4;i++)pipe(crane,m.brass,[i,2.5,0],[i+1,3.2,0],.06);
    pipe(crane,m.dark,[3.6,2.5,0],[3.6,.2,0],.035);box(crane,m.dark,3.6,.15,0,.35,.35,.3,.04);
    vents(root,m,-3.5,4.06,0,9);box(root,m.light,-1,4.07,2.6,1,.05,.23,.02);
  }
  if(type==='power'){
    foundation(root,m,7,7);box(root,m.body,0,1.2,0,6.3,1.5,5.5,.22);
    for(const x of [-1.65,1.65]){
      cyl(root,m.concrete,x,2.4,0,1.05,1.35,3.4,12);cyl(root,m.armor,x,4.1,0,1.3,1.02,.38,12);
      cyl(root,m.dark,x,4.29,0,.97,.97,.08,12);cyl(root,m.light,x,4.3,0,.58,.65,.1,12);
      pipe(root,m.brass,[x,.7,2.3],[x,2.6,2.3],.22);pipe(root,m.brass,[x,2.6,2.3],[x,2.6,1],.22);
      if(sov){cyl(root,m.steel,x,4.8,0,.18,.24,1.1,8);for(let i=0;i<4;i++)cyl(root,m.brass,x,4.5+i*.24,0,.6,.6,.1,12);sphere(root,m.light,x,5.45,0,.32);}
    }
    box(root,m.team,0,1.6,2.8,4,.4,.1,.02);windows(root,m,-1.6,1,2.83,5,.8);
    root.userData.smokestacks=[[-1.65,4.5,0],[1.65,4.5,0]];
  }
  if(type==='refinery'){
    foundation(root,m,10,8);box(root,m.body,-1.5,1.8,0,5.5,2.7,6.5,.2);
    box(root,m.armor,-1.5,3.2,0,5.8,.35,6.8,.12);windows(root,m,-3.6,2.2,3.3,5,.85);
    for(const z of [-1.8,1.4]){cyl(root,m.steel,3,2.7,z,1.28,1.28,4.4,14);cyl(root,m.team,3,2.8,z,1.3,1.3,.45,14);cyl(root,m.armor,3,5,z,.02,1.35,.65,14);}
    pipe(root,m.brass,[3,4,-1.8],[0,4,-1.8],.19);pipe(root,m.brass,[0,4,-1.8],[0,2.5,-1.8],.19);
    box(root,m.dark,-1,1,3.9,3.3,1,1.4,.08);box(root,m.rubber,-1,.62,5.2,2.7,.22,2.8,.03);
    for(let i=0;i<8;i++)box(root,m.brass,-1,.76,4.1+i*.36,2.6,.06,.1,0);
    for(const x of [-2.7,.7])box(root,m.light,x,1.15,4.2,.18,.4,.18,.02);
    cyl(root,m.dark,-2.4,4.2,-1.8,.3,.4,2,10);cyl(root,m.brass,-2.4,5.22,-1.8,.43,.43,.15,10);
    root.userData.smokestacks=[[-2.4,5.5,-1.8]];
  }
  if(type==='barracks'){
    foundation(root,m,7,7);box(root,m.body,0,1.8,0,6.2,2.6,5.8,.25);
    const roof=box(root,m.armor,0,3.22,0,6.5,.5,6.2,.22);roof.rotation.z=sov?0:.04;
    box(root,m.team,0,2.8,3,5.4,.32,.08,.02);box(root,m.dark,0,1.5,3,1.4,2.1,.15,.03);
    windows(root,m,-2.1,2.2,3.02,2,.7);windows(root,m,1.4,2.2,3.02,2,.7);
    box(root,m.armor,0,2.7,3.5,2.1,.15,1,.06);antenna(root,m,-2,3.5,-1.5,3);
    for(const s of [-1,1])for(let j=0;j<4;j++)box(root,m.concrete,s*(2+j*.15),.8,3.6-j*.55,.9,.55,.48,.19);
    for(let i=0;i<3;i++)box(root,m.dark,1.8,3.6,-1+i*.65,1,.2,.48,.08);
    pipe(root,m.steel,[2.7,.5,-2.5],[2.7,5,-2.5],.05);box(root,m.team,3.2,4.6,-2.5,.95,.6,.05,.02);
  }
  if(type==='factory'){
    foundation(root,m,11,9);box(root,m.body,0,2.6,-.4,10,4.2,7.7,.32);
    box(root,m.armor,0,4.88,-.4,10.5,.4,8.2,.15);
    box(root,m.dark,0,2.3,3.5,5.2,3.5,.1,.03);
    const door=group(root,'door',0,.55,3.62);root.userData.door=door;
    for(let i=0;i<12;i++)box(door,m.steel,0,.14+i*.27,0,4.9,.23,.13,.02);
    box(root,m.team,0,4.4,3.62,8,.4,.12,.02);windows(root,m,-4.2,3.5,3.65,2,.65);windows(root,m,3.4,3.5,3.65,2,.65);
    for(const x of [-3.2,3.2]){
      pipe(root,m.brass,[x,.6,4.1],[x,6,4.1],.18);box(root,m.dark,x,5.8,4.1,.5,.4,.55,.03);
      box(root,m.light,x,4.8,4.2,.5,.2,.15,.02);
    }
    pipe(root,m.brass,[-3.3,5.9,4.1],[3.3,5.9,4.1],.25);box(root,m.dark,0,5.4,4.1,.6,.8,.6,.06);
    for(const x of [-3.5,3.5])for(let i=0;i<4;i++)box(root,m.dark,x,5.2,-2+i,1.6,.4,.65,.09);
    cyl(root,m.dark,4,4.7,-3,.35,.4,3,10);root.userData.smokestacks=[[4,6.3,-3]];
    for(let i=0;i<6;i++)box(root,m.brass,-2.6+i, .56,4.35,.45,.04,.45,0).rotation.y=.7;
  }
}
