import { HALF, seeded } from '../data/definitions.js';
export function terrainHeight(x,z) {
  const edge = Math.max(Math.abs(x),Math.abs(z));
  return -0.1 + Math.sin(x*0.08)*Math.cos(z*0.065)*0.22 + Math.max(0,edge-68)*0.11;
}
export function isWater(x,z) {
  const river = Math.sin(z*0.055)*6;
  return Math.abs(x-river)<4.2 && ![-38,0,38].some(v=>Math.abs(z-v)<5.5);
}
export function makeMap() {
  const random = seeded(4352), ore = [], rocks = [];
  const fields = [[-64,18],[-24,57],[63,-18],[25,-57],[-24,-9],[25,9]];
  for (const [cx,cz] of fields) for(let i=0;i<20;i++) {
    const a=random()*Math.PI*2, r=Math.sqrt(random())*7.3;
    ore.push({ id: ore.length, x:cx+Math.cos(a)*r, z:cz+Math.sin(a)*r, amount:1800, max:1800 });
  }
  for(let i=0;i<46;i++) {
    const x=random()*146-73,z=random()*146-73;
    if (Math.hypot(x+48,z-44)<27 || Math.hypot(x-48,z+44)<27 || isWater(x,z) || Math.abs(x+z)<8 || ore.some(o=>Math.hypot(o.x-x,o.z-z)<10)) continue;
    rocks.push({x,z,radius:1.3+random()*2.1, height:1+random()*4});
  }
  return { ore, rocks, fields, half: HALF };
}
