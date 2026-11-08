import { WEAPONS, ARMOR, distance, angleDelta, clamp } from '../data/definitions.js';
export class Combat {
  constructor(world) { this.w=world;this.projectiles=[];this.nextShot=1; }
  weapon(e) { return WEAPONS[e.type==='advanced'&&e.faction==='soviet'?'heavy':e.def.weapon]; }
  update(e,dt) {
    const w=this.w,gun=this.weapon(e);if(!gun)return;
    e.cooldown=Math.max(0,e.cooldown-dt*(e.def.building&&w.players[e.p].lowPower?0.6:1));
    let target=w.entities.get(e.target);
    if(!target||target.dead||target.p===e.p||(!w.visibleTo(e.p,target)&&e.p===0))target=null;
    if(!target&&e.order!=='move'&&w.time>=e.scanAt) {
      e.scanAt=w.time+0.35;
      let best=Infinity;
      for(const enemy of w.entities.values())if(enemy.p!==e.p&&!enemy.dead&&w.visibleTo(e.p,enemy)) {
        const d=distance(e,enemy)-enemy.def.radius*0.5;
        if(d<=gun.range && d<best && w.nav.lineClear(e,enemy)){target=enemy;best=d;}
      }
    }
    if(!target){e.target=null;return;}
    e.target=target.id;const d=distance(e,target)-target.def.radius*0.5;
    if(d>gun.range||!w.nav.lineClear(e,target)) {
      if(!e.def.building&&e.order!=='hold'&&(e.order==='attack'||e.order==='attackMove'))w.setGoal(e,target);
      return;
    }
    if(e.order!=='move'){e.fighting=true;e.path=[];}
    const aim=Math.atan2(target.x-e.x,target.z-e.z),diff=angleDelta(e.turret,aim);
    e.turret+=clamp(diff,-gun.turn*dt,gun.turn*dt);
    if(Math.abs(diff)>0.15||e.cooldown>0)return;
    e.cooldown=gun.cooldown;e.recoil=1;
    const damage=gun.damage*(1+e.rank*0.14);
    const shot={id:this.nextShot++,source:e.id,p:e.p,x:e.x,z:e.z,y:e.def.building?5:1.8,tx:target.x,tz:target.z,ty:target.def.building?2.8:1,target:target.id,kind:gun.kind,speed:gun.speed,damage,splash:gun.splash,age:0};
    w.emit('fire',{...shot,faction:e.faction});
    if(gun.kind==='energy') {
      this.impact(shot,target.x,target.z);
      if(e.faction==='soviet'&&e.type==='defense') {
        const chain=w.list(1-e.p).find(a=>a.id!==target.id&&distance(a,target)<7);
        if(chain){this.damage(chain,damage*0.45,'energy',e);w.emit('beam',{x:target.x,z:target.z,tx:chain.x,tz:chain.z,faction:e.faction});}
      }
    }else this.projectiles.push(shot);
  }
  tick(dt) {
    for(let i=this.projectiles.length-1;i>=0;i--) {
      const s=this.projectiles[i],target=this.w.entities.get(s.target);s.age+=dt;
      if(s.kind==='rocket'&&target&&!target.dead){s.tx=target.x;s.tz=target.z;}
      const d=Math.hypot(s.tx-s.x,s.tz-s.z),step=s.speed*dt;
      if(d<=step||s.age>5){this.impact(s,s.tx,s.tz);this.projectiles.splice(i,1);}
      else {s.x+=(s.tx-s.x)/d*step;s.z+=(s.tz-s.z)/d*step;}
    }
  }
  impact(s,x,z) {
    const w=this.w,source=w.entities.get(s.source);
    w.emit('impact',{x,z,kind:s.kind,size:s.kind==='bullet'?0.35:1.6});
    for(const e of w.entities.values())if(!e.dead&&e.p!==s.p) {
      const d=Math.hypot(e.x-x,e.z-z),radius=e.def.radius*0.65;
      if(e.id===s.target||d<radius+s.splash) {
        const scale=e.id===s.target?1:Math.max(0.2,1-Math.max(0,d-radius)/Math.max(s.splash,0.1));
        this.damage(e,s.damage*scale,s.kind,source);
      }
    }
  }
  damage(e,amount,kind='explosive',source=null,raw=false) {
    if(!e||e.dead)return;
    const actual=raw?amount:amount*(ARMOR[kind]?.[e.def.armor]??1);
    e.hp-=actual;e.hitAt=this.w.time;
    if(e.p===0&&e.def.building&&this.w.time-this.w.lastAttackAlert>9){this.w.lastAttackAlert=this.w.time;this.w.notice(0,'我方基地遭到攻击','attack');}
    if(e.hp<=0) {
      e.dead=true;this.w.players[e.p].stats.losses++;
      if(source){source.kills++;this.w.players[source.p].stats.kills++;const rank=Math.min(3,Math.floor(source.kills/3));if(rank>source.rank){source.rank=rank;source.maxHp=source.def.hp*(1+rank*0.12);source.hp=Math.min(source.maxHp,source.hp+source.maxHp*0.15);}}
      this.w.emit('death',{id:e.id,x:e.x,z:e.z,building:e.def.building,type:e.type,p:e.p,faction:e.faction});
      if(e.def.building)this.w.navDirty=true;
    }
  }
  strike(p,x,z) {
    const w=this.w,base=w.list(p).find(e=>e.type==='super'&&e.charge>=120);
    if(!base)return false;
    base.charge=0;base.superAnnounced=false;
    w.pendingStrikes.push({p,x,z,at:w.time+3.2,faction:base.faction});
    w.notice(0,base.faction==='allied'?'极光打击即将抵达 — 请撤离目标区域':'侦测到核弹发射 — 请立即撤离','super');
    w.emit('strikeWarning',{x,z,faction:base.faction});return true;
  }
  strikes() {
    const w=this.w;
    for(let i=w.pendingStrikes.length-1;i>=0;i--)if(w.pendingStrikes[i].at<=w.time) {
      const s=w.pendingStrikes.splice(i,1)[0];w.emit('supernova',s);
      for(const e of w.entities.values()) {
        const d=distance(e,s),r=e.def.radius*0.5;
        if(d<25+r)this.damage(e,(s.faction==='allied'?2400:2700)*Math.max(0.15,1-Math.max(0,d-r)/32),'explosive',w.list(s.p).find(a=>a.type==='super'),true);
      }
    }
  }
}
