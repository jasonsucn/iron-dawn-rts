// mcv.js — 基地车：大型运输车底盘 + 可展开的指挥舱段 + 折叠支撑腿
// 盟军：玻璃舷窗带 + 青色饰条；苏军：红色警示条 + 橙光观察缝
// 动画锚点：body(颠簸) / tread0..1(履带条沿 z 滚动)；指挥舱段与支撑腿为静态待展开姿态
// 尺寸规格：长 4.8–5.4 / 宽 4.6–5.2 / 高 3.6–4.4（本轮收窄长宽常量，高度与锚点不动）
import { group, box, cyl, stripe, antenna, vents } from './Parts.js';

export function mcv(root, faction, m) {
  const sov = faction === 'soviet';
  const glow = sov ? (m.warm || m.light) : m.light;
  const body = group(root, 'body'); root.userData.body = body;

  // —— 重型运输履带底盘（长/宽常量已收窄，高度不变） ——
  const half = 1.98, wheelR = .42, wheelY = .5, bandD = 4.3;   // half 原 2.0、bandD 原 4.6
  for (const s of [-1, 1]) {
    box(body, m.rubber, s * half, wheelY, 0, .38, wheelR * 2 - .02, bandD, .08);
    for (let j = 0; j < 5; j++) {
      const z = -1.44 + j * .72;
      cyl(body, m.steel, s * half, wheelY, z, wheelR, wheelR, .34, 10).rotation.z = Math.PI / 2;
      cyl(body, m.dark, s * half, wheelY, z, wheelR * .36, wheelR * .36, .42, 8).rotation.z = Math.PI / 2;
    }
    for (const ez of [-1, 1])
      cyl(body, m.dark, s * half, wheelY + .08, ez * (bandD / 2 - .3), .34, .34, .3, 10).rotation.z = Math.PI / 2;
    box(body, m.armor, s * (half + .26), wheelY + .7, 0, .1, .52, 3.1, .04);          // 侧裙
    box(body, m.armor, s * (half + .2), wheelY + 1.02, 0, .54, .2, 3.8, .07);         // 翼子板
    const tread = group(body, `tread${s < 0 ? 0 : 1}`, s * (half + .2), wheelY, 0);
    for (let j = 0; j < 10; j++) box(tread, m.steel, 0, 0, -1.935 + j * .43, .05, .6, .3, .012);
    (root.userData.tracks ??= []).push(tread);
  }

  // —— 运输车体 ——
  const deckY = 1.8;
  box(body, m.body, 0, 1.45, 0, 2.7, .7, 4.1, .18);
  box(body, m.dark, 0, 1.1, 2.3, 2.5, .32, .3, .05);                       // 前保险杠
  box(body, m.armor, 0, 1.5, -2.2, 2.6, .7, .25, .06);                     // 尾甲板
  for (const s of [-1, 1]) box(body, m.dark, s * .6, 1.15, -2.33, .1, .16, .08, 0);  // 拖钩

  // —— 前部驾驶室 ——
  box(body, m.armor, 0, 2.5, 1.5, 2.45, 1.35, 1.5, .16);
  box(body, m.glass, 0, 2.8, 2.27, 2.1, .55, .06, .02).rotation.x = -.14;   // 前风挡
  for (const s of [-1, 1]) box(body, m.glass, s * 1.24, 2.75, 1.5, .03, .5, 1.2, .01);
  box(body, m.dark, 0, 3.22, 1.5, 2.55, .1, 1.6, .04);                      // 车顶
  cyl(body, m.dark, .9, 3.3, 2.0, .13, .13, .18, 10).rotation.x = Math.PI / 2;   // 探照灯
  cyl(body, glow, .9, 3.3, 2.11, .1, .1, .03, 10).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) box(body, glow, s * .95, 2.0, 2.28, .24, .16, .08, .02);    // 大灯
  cyl(body, m.dark, 1.25, 2.35, .5, .12, .14, .95, 8);                      // 排气管
  cyl(body, glow, 1.25, 2.87, .5, .09, .09, .05, 8);
  antenna(body, m, -1.1, 3.27, 1.2, .9);
  stripe(body, m.team, 0, deckY + .01, .575, .7, .3);

  // —— 可展开指挥舱段（后部高大舱体，两侧壁微张 + 顶部铰链，示意展开形态） ——
  box(body, m.armor, 0, 2.65, -.95, 2.65, 1.65, 2.35, .18);
  for (const s of [-1, 1]) {
    box(body, m.body, s * 1.36, 2.6, -.9, .07, 1.45, 2.15, .03).rotation.z = -s * .05;  // 微张侧板
    cyl(body, m.steel, s * 1.32, 3.35, -1.4, .04, .04, 1.5, 8).rotation.x = Math.PI / 2; // 顶部铰链
    if (sov) {
      box(body, m.team, s * 1.31, 3.1, -1.6, .02, .25, .55, 0);              // 红色警示条
      box(body, glow, s * 1.31, 2.5, -.9, .03, .12, 1.5, 0);                // 橙光观察缝
    } else {
      box(body, m.glass, s * 1.30, 2.75, -.9, .03, .4, 1.75, .01);           // 玻璃舷窗带
      box(body, glow, s * 1.30, 3.42, -.9, .03, .05, 1.85, 0);               // 青色顶缘饰条
    }
  }
  vents(body, m, 0, 3.98, -1.0, 6);

  // —— 舱顶指挥模块 ——
  box(body, m.body, 0, 3.72, -1.0, 1.8, .5, 1.6, .12);
  if (sov) box(body, glow, 0, 3.75, -.13, 1.15, .14, .03, 0);
  else box(body, m.glass, 0, 3.72, -.13, 1.05, .28, .04, .01);

  // —— 折叠支撑腿（收拢于尾部，带铰链座与垫脚） ——
  for (const s of [-1, 1]) {
    box(body, m.steel, s * .85, 2.35, -2.32, .16, 2.3, .14, .03);
    box(body, m.dark, s * .85, 3.4, -2.2, .3, .18, .2, 0);                  // 铰链座
    box(body, m.dark, s * .85, 1.18, -2.32, .34, .1, .3, 0);                // 垫脚
  }
}
