// harvester.js — 采矿车：驾驶舱 + 矿石斗 + 前端装载臂 + 履带
// 动画锚点：body(颠簸) / tread0..1(履带条沿 z 滚动)
//           cargo(挂 root，原点在斗底 y=1.17，载货时游戏按 y 缩放，矿石随组缩放)
//           harvest(挂 root，原点为装载臂根部转轴，游戏绕 x 摆动)
// 尺寸规格：长 5.2–6.0 / 宽 4.2–5.0 / 高 2.8–3.4（本轮收窄长宽常量，高度与锚点不动）
import { group, box, cyl, sphere, pipe, stripe, antenna, vents } from './Parts.js';

export function harvester(root, faction, m) {
  const sov = faction === 'soviet';
  const glow = sov ? (m.warm || m.light) : m.light;
  const body = group(root, 'body'); root.userData.body = body;

  // —— 履带底盘（工程车风格，轮组粗壮 + 挡泥板；长/宽常量已收窄，高度不变） ——
  const half = 1.84, wheelR = .45, wheelY = .52, bandD = 4.2;   // half 原 1.88、bandD 原 4.5
  for (const s of [-1, 1]) {
    box(body, m.rubber, s * half, wheelY, 0, .36, wheelR * 2 - .02, bandD, .08);
    for (let j = 0; j < 5; j++) {
      const z = -1.56 + j * .78;
      cyl(body, m.steel, s * half, wheelY, z, wheelR, wheelR, .36, 10).rotation.z = Math.PI / 2;
      cyl(body, m.dark, s * half, wheelY, z, wheelR * .36, wheelR * .36, .44, 8).rotation.z = Math.PI / 2;
    }
    for (const ez of [-1, 1])
      cyl(body, m.dark, s * half, wheelY + .08, ez * (bandD / 2 - .3), .35, .35, .3, 10).rotation.z = Math.PI / 2;
    box(body, m.armor, s * (half + .24), wheelY + .7, -.15, .1, .5, 3.2, .04);       // 侧裙
    box(body, m.armor, s * (half + .18), wheelY + 1.0, -.15, .5, .2, 3.6, .07);      // 翼子板
    box(body, m.dark, s * (half + .18), .95, -2.2, .42, .55, .07, .02).rotation.x = .12;  // 挡泥板
    if (sov) box(body, m.team, s * (half + .3), wheelY + .7, -.5, .02, .3, .4, 0);   // 红色警示条
    const tread = group(body, `tread${s < 0 ? 0 : 1}`, s * (half + .19), wheelY, 0);
    for (let j = 0; j < 10; j++) box(tread, m.steel, 0, 0, -1.89 + j * .42, .05, .62, .3, .012);
    (root.userData.tracks ??= []).push(tread);
  }

  // —— 车体与驾驶舱（前部，高度相关几何全部保持原样） ——
  const deckY = 1.77;
  box(body, m.body, 0, 1.42, .35, 2.5, .7, 2.9, .16);
  box(body, m.armor, 0, 1.28, 1.9, 2.3, .42, .7, .03);                    // 前鼻装甲
  box(body, m.dark, 0, 1.05, 2.32, 2.35, .3, .35, .05);                   // 保险杠
  box(body, m.armor, 0, 2.42, 1.05, 2.0, 1.3, 1.6, .14);                  // 驾驶舱
  box(body, m.glass, 0, 2.62, 1.87, 1.7, .58, .06, .02).rotation.x = -.15; // 前风挡
  for (const s of [-1, 1]) box(body, m.glass, s * 1.01, 2.6, 1.05, .03, .48, 1.05, .01);
  box(body, m.dark, 0, 3.13, 1.05, 2.1, .12, 1.7, .05);                   // 舱顶
  cyl(body, m.dark, 0, 3.2, .75, .12, .13, .06, 8);                       // 警示灯座
  cyl(body, glow, 0, 3.27, .75, .09, .12, .14, 8);                        // 旋转警示灯
  cyl(body, m.dark, .72, 3.2, 1.55, .13, .13, .18, 10).rotation.x = Math.PI / 2;   // 探照灯
  cyl(body, glow, .72, 3.2, 1.66, .1, .1, .03, 10).rotation.x = Math.PI / 2;
  cyl(body, m.dark, .85, 2.5, .1, .11, .13, 1.0, 8);                      // 排气立管
  cyl(body, glow, .85, 3.04, .1, .08, .08, .04, 8);
  for (const s of [-1, 1]) {
    box(body, glow, s * .9, 1.22, 2.3, .24, .15, .08, .02);               // 大灯
    if (sov) box(body, glow, s * 1.26, 1.5, -.2, .03, .12, .6, 0);        // 侧后橙光
    else box(body, glow, s * 1.26, 1.45, .4, .03, .08, 1.1, 0);           // 青色饰条
  }
  vents(body, m, -.6, deckY + .01, -.45, 5);
  box(body, m.dark, -2.06, 1.77, .9, .45, .3, .9, .03);                   // 翼子板工具箱
  antenna(body, m, 1.1, deckY, .45, .9);

  // —— 矿石斗（挂 root，随 cargo 缩放的只有矿石，斗体静止；斗体随车长内收） ——
  const floorY = 1.12;
  box(root, m.armor, 0, floorY, -1.72, 2.2, .1, 1.1, .03);                // 斗底
  for (const s of [-1, 1]) {
    box(root, m.armor, s * 1.08, 1.5, -1.72, .12, .82, 1.15, .04);        // 侧壁
    box(root, m.brass, s * 1.08, 1.93, -1.72, .16, .05, 1.15, 0);         // 黄铜护缘
    if (sov) { box(root, m.team, s * 1.15, 1.5, -1.25, .02, .35, .4, 0); box(root, m.team, s * 1.15, 1.5, -1.95, .02, .35, .4, 0); }
    else box(root, m.light, s * 1.15, 1.85, -1.72, .03, .04, 1.1, 0);
  }
  box(root, m.armor, 0, 1.55, -1.1, 2.2, .9, .12, .04);                   // 前壁（靠驾驶舱）
  box(root, m.armor, 0, 1.42, -2.33, 2.2, .64, .12, .04);                 // 尾壁
  const cargo = group(root, 'cargo', 0, floorY + .05, -1.72); root.userData.cargo = cargo;  // 原点=斗底（逻辑不变）
  const lumps = [[-.5, .3, -.25, .3], [.42, .28, -.28, .26], [.55, .3, .25, .3], [-.45, .32, .28, .28],
                 [0, .52, -.1, .32], [.12, .3, .32, .24], [-.18, .55, .25, .26], [.5, .5, -.15, .28]];
  for (const [x, y, z, r] of lumps) sphere(cargo, m.ore, x, y, z, r);      // 矿石堆（随斗缩放）

  // —— 前端装载臂（挂 root，绕根部转轴摆动；锚点原位，臂段微收） ——
  const arm = group(root, 'harvest', .55, 1.5, 1.42); root.userData.arm = arm;
  pipe(arm, m.brass, [0, 0, 0], [0, .40, .75], .15);                      // 主臂
  pipe(arm, m.steel, [0, .40, .75], [0, -.5, 1.22], .11);                 // 副臂
  cyl(arm, m.dark, 0, -.5, 1.3, .4, .4, .6, 10).rotation.z = Math.PI / 2; // 破碎滚筒
  for (const s of [-1, 1])
    cyl(arm, m.steel, s * .32, -.5, 1.3, .3, .3, .06, 10).rotation.z = Math.PI / 2;  // 滚筒端盘
  for (let k = 0; k < 6; k++) {                                            // 破碎齿
    const a = k * Math.PI / 3;
    box(arm, m.steel, 0, -.5 + Math.sin(a) * .42, 1.3 + Math.cos(a) * .42, .1, .12, .1, 0);
  }
}
