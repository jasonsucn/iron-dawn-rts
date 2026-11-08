import { HALF, clamp } from '../data/definitions.js';
import { isWater } from './Map.js';
// 2m navigation cells. Obstacles are cached and A* is budgeted by the simulation.
export class Navigation {
  constructor(world) { this.world=world; this.size=80; this.cell=2; this.blocked=new Uint8Array(6400); this.rebuild(); }
  coord(x) { return clamp(Math.floor((x+HALF)/2),0,79); }
  index(x,z) { return this.coord(z)*80+this.coord(x); }
  center(i) { return {x:(i%80)*2-HALF+1,z:Math.floor(i/80)*2-HALF+1}; }
  rebuild() {
    for(let z=0;z<80;z++) for(let x=0;x<80;x++) {
      const wx=x*2-HALF+1,wz=z*2-HALF+1;
      this.blocked[z*80+x]=(x<1||z<1||x>78||z>78||isWater(wx,wz)||this.world.map.rocks.some(r=>Math.hypot(wx-r.x,wz-r.z)<r.radius+0.65))?1:0;
    }
    for(const e of this.world.entities.values()) if(e.def.building && !e.dead) {
      const a=this.coord(e.x-e.def.w/2-0.6),b=this.coord(e.x+e.def.w/2+0.6),c=this.coord(e.z-e.def.d/2-0.6),d=this.coord(e.z+e.def.d/2+0.6);
      for(let z=c;z<=d;z++) for(let x=a;x<=b;x++) this.blocked[z*80+x]=1;
    }
  }
  walkable(x,z) { return Math.abs(x)<77 && Math.abs(z)<77 && !this.blocked[this.index(x,z)]; }
  nearest(x,z) {
    const start=this.index(x,z); if(!this.blocked[start]) return this.center(start);
    const cx=start%80,cz=Math.floor(start/80);
    for(let r=1;r<16;r++) for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++) {
      if(Math.abs(dx)!==r&&Math.abs(dz)!==r) continue;
      const nx=cx+dx,nz=cz+dz;
      if(nx>0&&nx<79&&nz>0&&nz<79&&!this.blocked[nz*80+nx]) return this.center(nz*80+nx);
    }
    return {x,z};
  }
  path(sx,sz,tx,tz) {
    const end=this.nearest(tx,tz),start=this.index(sx,sz),goal=this.index(end.x,end.z);
    if(start===goal) return [end];
    const score=new Float32Array(6400).fill(Infinity),prev=new Int32Array(6400).fill(-1),closed=new Uint8Array(6400);
    const heap=[]; const heuristic=i=>Math.hypot(i%80-goal%80,Math.floor(i/80)-Math.floor(goal/80));
    const push=(i,f)=>{let p=heap.length;heap.push({i,f});while(p>0){const q=(p-1)>>1;if(heap[q].f<=f)break;heap[p]=heap[q];p=q;}heap[p]={i,f};};
    const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let p=0;while(p*2+1<heap.length){let q=p*2+1;if(q+1<heap.length&&heap[q+1].f<heap[q].f)q++;if(heap[q].f>=last.f)break;heap[p]=heap[q];p=q;}heap[p]=last;}return top.i;};
    score[start]=0;push(start,heuristic(start));let found=false,loops=0;
    while(heap.length&&loops++<5600) {
      const at=pop();if(closed[at])continue;closed[at]=1;if(at===goal){found=true;break;}
      const x=at%80,z=Math.floor(at/80);
      for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++) {
        if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz,n=nz*80+nx;
        if(nx<1||nx>78||nz<1||nz>78||this.blocked[n]||closed[n])continue;
        if(dx&&dz&&(this.blocked[z*80+nx]||this.blocked[nz*80+x]))continue;
        const g=score[at]+(dx&&dz?1.414:1);
        if(g<score[n]){score[n]=g;prev[n]=at;push(n,g+heuristic(n));}
      }
    }
    if(!found)return [];
    const result=[];let at=goal;while(at!==start&&at!==-1){result.push(this.center(at));at=prev[at];}result.reverse();return result;
  }
  lineClear(a,b,ignoreId=null) {
    const len=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(len/2);
    for(let i=2;i<steps-2;i++) {
      const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      for(const e of this.world.entities.values()) if(e.id!==a.id&&e.id!==b.id&&e.id!==ignoreId&&e.def.building&&!e.dead&&Math.abs(x-e.x)<e.def.w/2&&Math.abs(z-e.z)<e.def.d/2)return false;
      if(this.world.map.rocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.radius*0.8))return false;
    }return true;
  }
}
