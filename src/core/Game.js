import { DEFS, HALF, clamp, distance, angleDelta, seeded } from '../data/definitions.js';
import { makeMap, isWater } from './Map.js';
import { Navigation } from './Pathfinding.js';
import { Economy } from './Economy.js';
import { Combat } from './Combat.js';
import { CommanderAI } from './AI.js';
export class Game {
  constructor({faction='allied',difficulty='recruit',onEvent=()=>{},demo=false,superEnabled=true}={}) {
    this.faction=faction;this.difficulty=difficulty;this.onEvent=onEvent;this.demo=demo;this.superEnabled=superEnabled!==false;
    this.time=0;this.status='playing';this.entities=new Map();this.nextId=1;this.random=seeded(23481);this.map=makeMap();
    this.players=[faction,faction==='allied'?'soviet':'allied'].map((f,i)=>({faction:f,credits:9000,supply:0,demand:0,lowPower:false,queues:{structures:[],infantry:[],vehicles:[]},stats:{kills:0,losses:0,harvested:0},name:i?'HOSTILE COMMAND':'YOUR COMMAND'}));
    this.fog=[0,1].map(()=>({visible:new Uint8Array(6400),explored:new Uint8Array(6400)}));
    this.fogTimer=0;this.navDirty=false;this.pathBudget=4;this.lastAttackAlert=-20;this.pendingStrikes=[];
    this.nav=new Navigation(this);this.economy=new Economy(this);this.combat=new Combat(this);
    this.spawn('yard',0,-48,44);this.spawn('power',0,-63,43);this.spawn('refinery',0,-46,60);this.spawn('barracks',0,-31,42);
    this.spawn('tank',0,-39,29);this.spawn('tank',0,-45,28);this.spawn('rifle',0,-31,30);this.spawn('rocket',0,-27,30);
    this.spawn('yard',1,48,-44);this.spawn('tank',1,43,-31);this.spawn('rifle',1,50,-30);
    this.nav.rebuild();this.navDirty=false;this.economy.power(0);this.economy.power(1);this.updateFog();this.ai=new CommanderAI(this);
  }
  emit(type,data={}){this.onEvent(type,data);}
  notice(p,text,kind='info'){if(p===0)this.emit('notice',{text,kind});}
  list(p) { return [...this.entities.values()].filter(e=>!e.dead&&(p===undefined||e.p===p)); }
  spawn(type,p,x,z,options={}) {
    if(type==='super'&&this.superEnabled===false)return null;
    if(!DEFS[type])throw new Error(`Unknown entity type: ${type}`);
    if(typeof p==='string')p=p===this.players[0].faction?0:1;
    p=p===1?1:0;const def=DEFS[type],faction=this.players[p].faction;
    const e={id:this.nextId++,type,p,faction,def,x:clamp(x,-76,76),z:clamp(z,-76,76),hp:def.hp,maxHp:def.hp,angle:p?Math.PI:0,turret:p?Math.PI:0,target:null,cooldown:0,scanAt:0,goal:null,path:[],pathAt:0,order:'idle',fighting:false,moving:false,dead:false,recoil:0,kills:0,rank:0,hitAt:-10,born:this.time,construct:!!options.construct,repair:false,rally:null,door:0,cargo:0,harvesting:false,harvestState:'mine',manualUntil:0,charge:0,superAnnounced:false,lastKnown:[false,false]};
    this.entities.set(e.id,e);if(def.building){this.navDirty=true;this.nav.rebuild();}
    this.emit('spawn',{entity:e});
    if(type==='refinery'&&!options.noHarvester){const pos=this.nav.nearest(x,z+def.d/2+4);this.spawn('harvester',p,pos.x,pos.z);}
    return e;
  }
  canPlace(type,p,x,z,{deploy=false}={}) {
    const d=DEFS[type];if(!d?.building)return {ok:false,reason:'不是建筑'};
    if(Math.abs(x)+d.w/2>75||Math.abs(z)+d.d/2>75)return {ok:false,reason:'超出作战边界'};
    if(!deploy&&!this.list(p).some(e=>e.def.building&&distance(e,{x,z})<24+e.def.radius*0.3))return {ok:false,reason:'超出建造范围'};
    if(!deploy&&!this.fog[p].explored[this.nav.index(x,z)])return {ok:false,reason:'未探明区域'};
    for(let dx=-d.w/2;dx<=d.w/2;dx+=2)for(let dz=-d.d/2;dz<=d.d/2;dz+=2)if(isWater(x+dx,z+dz))return {ok:false,reason:'不能在水面建造'};
    for(const e of this.entities.values())if(!e.dead&&!(deploy&&e.type==='mcv'&&distance(e,{x,z})<1)) {
      if(e.def.building){if(Math.abs(x-e.x)<(d.w+e.def.w)/2+1.6&&Math.abs(z-e.z)<(d.d+e.def.d)/2+1.6)return {ok:false,reason:'建筑阻挡'};}
      else if(Math.abs(x-e.x)<d.w/2+e.def.radius&&Math.abs(z-e.z)<d.d/2+e.def.radius)return {ok:false,reason:'单位阻挡'};
    }
    if(this.map.ore.some(o=>o.amount>0&&Math.abs(x-o.x)<d.w/2+1&&Math.abs(z-o.z)<d.d/2+1))return {ok:false,reason:'矿脉阻挡'};
    if(this.map.rocks.some(r=>Math.abs(x-r.x)<d.w/2+r.radius&&Math.abs(z-r.z)<d.d/2+r.radius))return {ok:false,reason:'岩石阻挡'};
    return {ok:true,reason:'可以建造'};
  }
  setGoal(e,target) {
    if(e.goal&&distance(e.goal,target)<2.5)return;
    e.goal={x:clamp(target.x,-75,75),z:clamp(target.z,-75,75)};e.path=[];e.pathAt=0;
  }
  order(ids,target,kind='move') {
    const units=ids.map(id=>this.entities.get(id)).filter(e=>e&&!e.dead&&!e.def.building);
    const width=Math.ceil(Math.sqrt(units.length)),spacing=3.1;
    units.forEach((e,i)=>{
      e.target=kind==='attack'?target.id:null;e.order=kind;e.fighting=false;e.path=[];e.goal=null;
      if(e.type==='harvester'){e.manualUntil=this.time+8;e.harvesting=false;}
      const tx=target.x+(kind==='attack'?0:(i%width-(width-1)/2)*spacing),tz=target.z+(kind==='attack'?0:(Math.floor(i/width)-(Math.ceil(units.length/width)-1)/2)*spacing);
      this.setGoal(e,{x:tx,z:tz});e.resumeGoal=kind==='attackMove'?{x:tx,z:tz}:null;
    });
    if(units.some(e=>e.p===0))this.emit('order',{x:target.x,z:target.z,kind});
  }
  stop(ids,hold=false) {
    for(const id of ids){const e=this.entities.get(id);if(e){e.goal=null;e.path=[];e.target=null;e.resumeGoal=null;e.order=hold?'hold':'idle';if(e.type==='harvester')e.manualUntil=this.time+5;}}
  }
  sell(id) {
    const e=this.entities.get(id);if(!e||e.p!==0||!e.def.building||e.dead)return false;
    this.players[0].credits+=e.def.cost*0.5;e.dead=true;this.navDirty=true;this.emit('sold',{id,x:e.x,z:e.z});return true;
  }
  deploy(id) {
    const e=this.entities.get(id);if(!e||e.type!=='mcv')return false;
    const valid=this.canPlace('yard',e.p,e.x,e.z,{deploy:true});if(!valid.ok){this.notice(e.p,valid.reason,'warning');return false;}
    e.dead=true;this.emit('sold',{id,x:e.x,z:e.z});this.spawn('yard',e.p,e.x,e.z,{construct:true});return true;
  }
  updateFog() {
    for(let p=0;p<2;p++) {
      const f=this.fog[p];f.visible.fill(0);
      for(const e of this.list(p)) {
        const r=e.def.sight+(e.type==='radar'?12:0),cx=this.nav.coord(e.x),cz=this.nav.coord(e.z),cells=Math.ceil(r/2);
        for(let dz=-cells;dz<=cells;dz++)for(let dx=-cells;dx<=cells;dx++) {
          const x=cx+dx,z=cz+dz;if(x<0||z<0||x>79||z>79||dx*dx+dz*dz>cells*cells)continue;
          const at=z*80+x;f.visible[at]=1;f.explored[at]=1;
        }
      }
      for(const e of this.entities.values())if(f.visible[this.nav.index(e.x,e.z)]&&e.def.building)e.lastKnown[p]=true;
    }
    this.emit('fog');
  }
  visibleTo(p,e){return !!this.fog[p].visible[this.nav.index(e.x,e.z)];}
  move(e,dt) {
    e.moving=false;if(e.def.building||e.fighting||!e.goal)return;
    if(!e.path.length&&this.time>=e.pathAt&&this.pathBudget>0) {
      this.pathBudget--;e.path=this.nav.path(e.x,e.z,e.goal.x,e.goal.z);e.pathAt=this.time+1.1;
    }
    const next=e.path[0];if(!next)return;
    const dx=next.x-e.x,dz=next.z-e.z,d=Math.hypot(dx,dz),speed=e.def.speed*(e.faction==='allied'?1.05:e.type==='tank'?0.92:1);
    if(d<0.65){e.path.shift();if(!e.path.length&&distance(e,e.goal)<3){e.goal=null;if(e.order==='move')e.order='idle';}return;}
    const a=Math.atan2(dx,dz);e.angle+=clamp(angleDelta(e.angle,a),-dt*4,dt*4);
    const step=Math.min(d,speed*dt),nx=e.x+dx/d*step,nz=e.z+dz/d*step;
    if(this.nav.walkable(nx,nz)){e.x=nx;e.z=nz;e.moving=true;}else {e.path=[];e.pathAt=this.time+0.25;}
    if(!e.target)e.turret+=clamp(angleDelta(e.turret,e.angle),-dt*3,dt*3);
  }
  separate(dt) {
    const units=this.list().filter(e=>!e.def.building),buckets=new Map();
    for(const e of units){const k=`${Math.floor(e.x/5)},${Math.floor(e.z/5)}`;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(e);}
    for(const e of units){const cx=Math.floor(e.x/5),cz=Math.floor(e.z/5);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const o of buckets.get(`${cx+dx},${cz+dz}`)||[]) {
        if(o.id<=e.id||o.dead)continue;let vx=e.x-o.x,vz=e.z-o.z,d=Math.hypot(vx,vz),min=(e.def.radius+o.def.radius)*0.87;
        if(d>=min)continue;
        if(e.p!==o.p&&((e.moving&&e.def.armor==='heavy'&&o.def.armor==='infantry')||(o.moving&&o.def.armor==='heavy'&&e.def.armor==='infantry'))){const victim=e.def.armor==='infantry'?e:o;this.combat.damage(victim,999,'explosive',victim===e?o:e,true);continue;}
        if(d<0.01){vx=0.1;vz=0.05;d=Math.hypot(vx,vz);}
        const push=Math.min((min-d)*0.5,dt*5),nx=vx/d*push,nz=vz/d*push;
        if(this.nav.walkable(e.x+nx,e.z+nz)){e.x+=nx;e.z+=nz;}if(this.nav.walkable(o.x-nx,o.z-nz)){o.x-=nx;o.z-=nz;}
      }
    }
  }
  tick(dt) {
    if(this.status!=='playing')return;this.time+=dt;this.pathBudget=5;
    if(this.navDirty){this.nav.rebuild();this.navDirty=false;}
    this.economy.update(dt);if(!this.demo)this.ai.tick(dt);
    for(const e of this.entities.values()) {
      if(e.dead)continue;e.fighting=false;e.recoil=Math.max(0,e.recoil-dt*5);e.door=Math.max(0,e.door-dt);
      if(e.type==='super'){e.charge=Math.min(120,e.charge+dt*(this.players[e.p].lowPower?0.55:1));if(e.charge>=120&&!e.superAnnounced){e.superAnnounced=true;this.notice(e.p,'超级武器已就绪 — 请选择目标','super');}}
      if(e.type==='harvester')this.economy.harvest(e,dt);
      this.combat.update(e,dt);
      if(!e.fighting&&e.order==='attackMove'&&e.resumeGoal&&!e.goal)this.setGoal(e,e.resumeGoal);
      this.move(e,dt);
    }
    this.separate(dt);this.combat.tick(dt);this.combat.strikes();
    this.fogTimer-=dt;if(this.fogTimer<=0){this.fogTimer=0.2;this.updateFog();}
    for(const [id,e] of this.entities)if(e.dead)this.entities.delete(id);
    if(!this.demo) {
      if(!this.list(0).some(e=>e.type==='yard'||e.type==='mcv'))this.end('defeat');
      else if(!this.list(1).some(e=>e.type==='yard'||e.type==='mcv'))this.end('victory');
    }
  }
  end(status) {if(this.status!=='playing')return;this.status=status;this.emit('end',{status,time:this.time,stats:{...this.players[0].stats}});}
  skipBuild() {for(const p of this.players)for(const [category,q] of Object.entries(p.queues))if(q[0]){p.credits+=Math.max(0,DEFS[q[0].type].cost-q[0].paid);q[0].progress=0.999;}}
  dispose() {this.entities.clear();this.combat.projectiles.length=0;this.pendingStrikes.length=0;this.onEvent=()=>{};}
  getState() {
    return {status:this.status,time:this.time,faction:this.faction,difficulty:this.difficulty,players:this.players.map((p,i)=>({faction:p.faction,credits:Math.floor(p.credits),power:{supply:p.supply,demand:p.demand,low:p.lowPower},units:this.list(i).filter(e=>!e.def.building).length,buildings:this.list(i).filter(e=>e.def.building).length,queues:JSON.parse(JSON.stringify(p.queues)),stats:{...p.stats}})),aiWaves:this.ai.waves,entities:this.list().map(e=>({id:e.id,type:e.type,faction:e.faction,player:e.p,x:e.x,z:e.z,hp:Math.ceil(e.hp),cargo:Math.floor(e.cargo),charge:e.charge,order:e.order}))};
  }
}
