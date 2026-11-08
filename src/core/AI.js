import { DIFFICULTIES, DEFS, distance } from '../data/definitions.js';
export class CommanderAI {
  constructor(world) { this.w=world;this.timer=0;this.waveAt=DIFFICULTIES[world.difficulty].wave;this.waves=0;this.buildIndex=0; }
  placement(type) {
    const w=this.w,anchors=w.list(1).filter(e=>e.def.building);
    const preferred={power:[35,-49],refinery:[60,-38],barracks:[48,-27],factory:[31,-29],radar:[60,-58],defense:[32,-11],super:[45,-63]}[type];
    if(preferred&&w.canPlace(type,1,...preferred).ok)return {x:preferred[0],z:preferred[1]};
    for(let r=12;r<62;r+=4)for(let a=0;a<Math.PI*2;a+=0.24) {
      const x=48+Math.cos(a)*r,z=-44+Math.sin(a)*r;
      if(w.canPlace(type,1,x,z).ok)return {x,z};
    }
    for(const anchor of anchors)for(let a=0;a<6.28;a+=0.45){const x=anchor.x+Math.cos(a)*17,z=anchor.z+Math.sin(a)*17;if(w.canPlace(type,1,x,z).ok)return {x,z};}
    return null;
  }
  tick(dt) {
    const w=this.w;this.timer-=dt;if(this.timer>0)return;this.timer=1;
    const player=w.players[1],own=w.list(1),has=t=>own.some(e=>e.type===t),count=t=>own.filter(e=>e.type===t).length;
    const q=player.queues;
    if(q.structures[0]?.ready){const pos=this.placement(q.structures[0].type);if(pos)w.economy.place(1,pos.x,pos.z);else w.economy.cancel(1,'structures');return;}
    if(!q.structures.length) {
      let next;
      if(player.supply<player.demand+45&&has('yard'))next='power';
      else next=['power','refinery','barracks','factory','radar','defense','super'].find(t=>!has(t));
      if(!next&&count('defense')<3)next='defense';
      if(next&&!w.economy.requirements(1,next))w.economy.enqueue(1,next);
    }
    if(!has('yard')) {
      const mcv=own.find(e=>e.type==='mcv');if(mcv)w.deploy(mcv.id);
      else if(has('factory')&&!q.vehicles.some(j=>j.type==='mcv'))w.economy.enqueue(1,'mcv');
    }
    if(has('refinery')&&count('harvester')<2&&!q.vehicles.some(j=>j.type==='harvester'))w.economy.enqueue(1,'harvester');
    const fighting=own.filter(e=>e.def.weapon&&!e.def.building);
    if(q.infantry.length<2&&has('barracks')&&fighting.length<45)w.economy.enqueue(1,w.random()<0.55?'rifle':'rocket');
    if(q.vehicles.length<2&&has('factory')&&fighting.length<45)w.economy.enqueue(1,has('radar')&&w.random()<0.4?'advanced':'tank');
    // React to threats using actual scouting proximity, not free target damage.
    const yard=own.find(e=>e.type==='yard')||{x:48,z:-44};
    const threats=w.list(0).filter(e=>e.def.weapon&&distance(e,yard)<35);
    if(threats.length) {
      const t=threats.sort((a,b)=>distance(a,yard)-distance(b,yard))[0];
      const defenders=fighting.filter(e=>distance(e,yard)<48||e.order==='hold');
      w.order(defenders.map(e=>e.id),t,'attack');
      if(yard.hp<yard.maxHp)yard.repair=true;
    }else if(w.time>=this.waveAt&&fighting.length>=Math.min(4,DIFFICULTIES[w.difficulty].size)) {
      const cfg=DIFFICULTIES[w.difficulty],available=fighting.filter(e=>e.hp>e.maxHp*0.35);
      const squad=available.slice(0,cfg.size+Math.min(4,this.waves));
      const targets=w.list(0).filter(e=>e.type==='yard'||e.type==='refinery'||e.type==='harvester');
      const t=targets.find(e=>e.type===(w.difficulty==='iron'&&this.waves%2?'harvester':'yard'))||targets[0];
      if(t){w.order(squad.map(e=>e.id),t,'attackMove');this.waves++;w.emit('wave',{size:squad.length,wave:this.waves});}
      this.waveAt=w.time+cfg.wave;
    }
    for(const e of fighting)if(e.hp<e.maxHp*0.22&&distance(e,yard)>18)w.order([e.id],{x:yard.x-10,z:yard.z+11},'move');
    const superweapon=own.find(e=>e.type==='super'&&e.charge>=120);
    if(superweapon) {
      const targets=w.list(0).filter(e=>e.def.building);
      let best=null,score=-1;
      for(const t of targets){const s=targets.reduce((n,e)=>n+(distance(e,t)<22?e.def.cost:0),0);if(s>score){score=s;best=t;}}
      if(best)w.combat.strike(1,best.x,best.z);
    }
    for(const e of own)if(e.def.building&&e.hp<e.maxHp*0.75&&player.credits>800)e.repair=true;
  }
}
