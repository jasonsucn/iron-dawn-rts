import { DEFS, DIFFICULTIES, distance } from '../data/definitions.js';
export class Economy {
  constructor(world) { this.w=world; }
  has(p,type) { return this.w.list(p).some(e=>e.type===type); }
  requirements(p,type) {
    const d=DEFS[type];if(!d)return '未知蓝图';
    for(const req of d.requires) if(!this.has(p,req))return `需要：${DEFS[req].name}`;
    if(d.building&&!this.has(p,'yard'))return '需要：建造厂';
    return '';
  }
  category(type) { return DEFS[type].building?'structures':DEFS[type].armor==='infantry'?'infantry':'vehicles'; }
  enqueue(p,type) {
    const reason=this.requirements(p,type);if(reason){this.w.notice(p,reason,'warning');return false;}
    const player=this.w.players[p],category=this.category(type),queue=player.queues[category];
    if(queue.length>=8){this.w.notice(p,'生产队列已满','warning');return false;}
    queue.push({type,progress:0,paid:0,ready:false,stalled:false});this.w.emit('queue',{p,type});return true;
  }
  cancel(p,category,index=0) {
    const q=this.w.players[p].queues[category];if(!q[index])return;
    this.w.players[p].credits+=q[index].paid;q.splice(index,1);this.w.emit('cancel',{p});
  }
  power(p) {
    let supply=0,demand=0;
    for(const e of this.w.list(p))if(e.def.building){if(e.def.power>0)supply+=e.def.power;else demand-=e.def.power;}
    const player=this.w.players[p];player.supply=supply;player.demand=demand;
    const low=demand>supply;
    if(low&&!player.lowPower)this.w.notice(p,'电力不足 — 生产与防御效率下降','power');
    player.lowPower=low;
  }
  place(p,x,z,continuous=false) {
    const player=this.w.players[p],job=player.queues.structures[0];
    if(!job?.ready)return false;
    const result=this.w.canPlace(job.type,p,x,z);
    if(!result.ok){this.w.notice(p,result.reason,'warning');return false;}
    player.queues.structures.shift();this.w.spawn(job.type,p,x,z,{construct:true});
    if(continuous)this.enqueue(p,job.type);return true;
  }
  update(dt) {
    for(let p=0;p<2;p++) {
      const player=this.w.players[p];this.power(p);
      for(const [category,queue] of Object.entries(player.queues)) {
        const job=queue[0];if(!job||job.ready)continue;
        if(this.requirements(p,job.type)){job.stalled=true;continue;}
        const d=DEFS[job.type],factories=category==='infantry'?'barracks':category==='vehicles'?'factory':'yard';
        // Replacement harvesters can also be assembled by an existing refinery.
        const count=this.w.list(p).filter(e=>e.type===factories||(job.type==='harvester'&&e.type==='refinery')).length;
        if(!count){job.stalled=true;continue;}
        const speed=(player.lowPower?1/1.8:1)*(p===1?DIFFICULTIES[this.w.difficulty].production:1)*(1+Math.min(2,count-1)*0.2);
        const step=Math.min(1-job.progress,dt/d.time*speed),cost=step*d.cost;
        if(player.credits+0.001<cost){if(!job.stalled)this.w.notice(p,'资金不足 — 生产暂停','warning');job.stalled=true;continue;}
        job.stalled=false;player.credits-=cost;job.paid+=cost;job.progress+=step;
        if(job.progress>=0.99999) {
          job.progress=1;
          if(d.building){job.ready=true;this.w.notice(p,'建造完成 — 请选择部署位置','build');}
          else {
            const producer=this.w.list(p).find(e=>e.type===factories||(job.type==='harvester'&&e.type==='refinery'));
            const exit=this.w.nav.nearest(producer.x,producer.z+producer.def.d/2+3);
            const unit=this.w.spawn(job.type,p,exit.x,exit.z);producer.door=3;
            if(job.type!=='harvester')this.w.order([unit.id],producer.rally||{x:exit.x+3,z:exit.z+4},'move');
            queue.shift();this.w.notice(p,'单位已就绪','unit');
          }
        }
      }
      for(const e of this.w.list(p))if(e.repair&&e.hp<e.maxHp) {
        const heal=Math.min(45*dt,e.maxHp-e.hp),cost=heal*e.def.cost/e.maxHp*0.55;
        if(player.credits>=cost){player.credits-=cost;e.hp+=heal;}if(e.hp>=e.maxHp)e.repair=false;
      }
    }
  }
  harvest(e,dt) {
    const w=this.w;
    if(e.manualUntil>w.time)return;
    const ref=w.list(e.p).filter(a=>a.type==='refinery').sort((a,b)=>distance(a,e)-distance(b,e))[0];
    if(!ref){e.harvesting=false;return;}
    if(e.cargo>=699||e.harvestState==='return') {
      e.harvestState='return';e.harvesting=false;
      const dest={x:ref.x,z:ref.z+ref.def.d/2+3};
      if(distance(e,dest)<4) {
        const value=e.cargo*(e.p===1?DIFFICULTIES[w.difficulty].economy:1);
        w.players[e.p].credits+=value;w.players[e.p].stats.harvested+=value;
        w.emit('income',{p:e.p,x:e.x,z:e.z,amount:Math.floor(value)});e.cargo=0;e.harvestState='mine';e.oreId=null;e.goal=null;e.path=[];
      }else w.setGoal(e,dest);
      return;
    }
    let ore=w.map.ore[e.oreId];
    if(!ore||ore.amount<=0) {
      ore=w.map.ore.filter(o=>o.amount>0).sort((a,b)=>distance(a,e)-distance(b,e))[0];e.oreId=ore?.id;
    }
    if(!ore){if(e.cargo>0)e.harvestState='return';return;}
    if(distance(e,ore)<3.5) {
      e.goal=null;e.path=[];e.harvesting=true;
      const mined=Math.min(135*dt,700-e.cargo,ore.amount);e.cargo+=mined;ore.amount-=mined;
    }else {e.harvesting=false;w.setGoal(e,ore);}
  }
}
