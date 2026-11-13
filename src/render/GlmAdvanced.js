// advanced.js — 高级坦克：盟军「光棱坦克」/ 苏军「天启坦克」
// 盟军：细长底盘、倾斜装甲、收拢桁架棱镜塔 + 悬浮水晶（m.light 青色自发光）
// 苏军：超重方正底盘、双管主炮、厚重炮塔（m.warm 橙色自发光 + m.team 红色警示条）
// 动画锚点：body(颠簸) / turret(绕y) / barrel(原点固定在炮盾 z=0.85，游戏驱动后坐)
//           tread0..1(履带条，沿 z 滚动，等距节距 0.44)
// 尺寸规格：长 5.0–5.6 / 宽 4.2–5.0 / 高 2.8–3.4（本轮收窄长宽常量，高度与锚点不动）
import { group, box, cyl, sphere, pipe, stripe, antenna, vents } from './Parts.js';

export function advanced(root, faction, m) {
  const sov = faction === 'soviet';
  const glow = sov ? (m.warm || m.light) : m.light;      // 阵营自发光：苏军橙 / 盟军青
  const body = group(root, 'body'); root.userData.body = body;

  // —— 骨架参数：苏军整体加宽加重（长/宽已收进规格区间，高度参数保持不变） ——
  const half   = sov ? 1.88 : 1.78;         // 履带中心距的一半（原 2.02 / 1.9）
  const bandW  = sov ? .42 : .34;           // 履带包宽度（不变，随 half 内收）
  const bandD  = sov ? 5.2 : 5.15;          // 履带包长度（原 5.3 / 5.1）
  const wheelR = sov ? .46 : .42;           // 负重轮半径（涉及离地高，保持不变）
  const nWheel = sov ? 5 : 4;
  const wheelY = sov ? .55 : .5;

  // —— 履带底盘：可见负重轮轮组 + 导向轮 + 侧裙/翼子板 + 履带条 ——
  for (const s of [-1, 1]) {
    box(body, m.rubber, s * half, wheelY, 0, bandW, wheelR * 2 - .02, bandD, .08);
    const span = (bandD - 1.9) / (nWheel - 1);
    for (let j = 0; j < nWheel; j++) {
      const z = -(nWheel - 1) / 2 * span + j * span;
      cyl(body, m.steel, s * half, wheelY, z, wheelR, wheelR, .34, 10).rotation.z = Math.PI / 2;
      cyl(body, m.dark, s * half, wheelY, z, wheelR * .38, wheelR * .38, .42, 8).rotation.z = Math.PI / 2;
    }
    for (const ez of [-1, 1])
      cyl(body, m.dark, s * half, wheelY + .1, ez * (bandD / 2 - .3), sov ? .34 : .3, sov ? .34 : .3, .3, 10).rotation.z = Math.PI / 2;
    box(body, m.armor, s * (half + .25), wheelY + .68, -.1, .1, .5, bandD - 1.3, .04);       // 侧裙
    box(body, m.armor, s * (half + .2), wheelY + 1.02, -.1, .52, .2, bandD - .7, .07);       // 翼子板
    if (sov) for (let j = 0; j < 3; j++)                                                     // 红色警示条
      box(body, m.team, s * (half + .32), wheelY + .68, -1.1 + j * 1.1, .02, .4, .5, 0);
    const tread = group(body, `tread${s < 0 ? 0 : 1}`, s * (half + .2), wheelY, 0);
    for (let j = 0; j < 11; j++)
      box(tread, m.steel, 0, 0, -2.2 + j * .44, .05, .62, .3, .012);
    (root.userData.tracks ??= []).push(tread);
  }

  // —— 车体：苏军方正厚重，盟军低矮修长（车宽随履带同比微收） ——
  const hullW = sov ? 2.9 : 2.6, hullH = sov ? .9 : .62, hullD = sov ? 4.3 : 3.9, hullY = sov ? 1.5 : 1.4;
  const deckY = hullY + hullH / 2;
  box(body, m.body, 0, hullY, -.15, hullW, hullH, hullD, sov ? .2 : .16);
  if (sov) {   // 两级阶梯式首上装甲
    box(body, m.armor, 0, deckY - .1, 1.5, hullW - .05, .26, 1.4, .08).rotation.x = -.32;
    box(body, m.armor, 0, 1.35, 2.1, hullW - .3, .5, .8, .08);
  } else {     // 一体斜装甲
    box(body, m.armor, 0, hullY - .08, 1.72, hullW, .16, 1.3, .05).rotation.x = -.42;
    box(body, m.armor, 0, 1.0, 2.25, hullW - .25, .32, .55, .06);
  }
  box(body, m.armor, 0, sov ? 1.6 : 1.42, sov ? -2.22 : -2.02, hullW - .1, sov ? .75 : .5, sov ? .35 : .3, .06);  // 尾甲板
  for (const s of [-1, 1]) {
    if (sov) {   // 侧后橙光格栅 + 粗壮排气
      box(body, glow, s * 1.46, 1.6, -1.55, .03, .12, .7, 0);
      cyl(body, m.dark, s * 1.15, 1.85, -2.0, .15, .18, .85, 8);
      cyl(body, glow, s * 1.15, 2.3, -2.0, .12, .12, .05, 8);
    } else {     // 青色饰条 + 细排气
      box(body, glow, s * 1.36, 1.42, -.3, .04, .09, 2.2, 0);
      cyl(body, m.dark, s * .95, 1.5, -1.95, .08, .08, .8, 8).rotation.x = .4;
    }
    box(body, glow, s * (sov ? 1.2 : 1.0), sov ? 1.38 : 1.14, sov ? 2.42 : 2.36, .26, .15, .08, .02);  // 大灯
  }
  vents(body, m, sov ? 0 : -.62, deckY + .01, sov ? -1.75 : -1.3, 6);
  if (sov) box(body, m.dark, -1.9, 1.79, 1.5, .5, .24, 1.0, .03);           // 翼子板工具箱（随翼子板内收）
  else box(body, m.dark, -1.85, 1.74, -.6, .44, .22, .9, .03);
  const slX = sov ? 1.2 : 1.0, slY = sov ? 1.81 : 1.85, slZ = sov ? 1.35 : .55;   // 探照灯
  cyl(body, m.dark, slX, slY, slZ, .14, .14, .2, 10).rotation.x = Math.PI / 2;
  cyl(body, glow, slX, slY, slZ + .11, .1, .1, .03, 10).rotation.x = Math.PI / 2;
  if (sov) for (let j = 0; j < 3; j++) box(body, m.steel, -.9 + j * .45, 1.68, 2.1, .3, .12, .22, 0);  // 备用履带板
  antenna(body, m, sov ? -1.35 : 1.25, deckY, sov ? -2.05 : -1.85, .85);

  // —— 炮塔：天启厚重带尾舱，光棱背负棱镜塔（宽度随车体同比微收） ——
  const turret = group(body, 'turret', 0, deckY, sov ? -.2 : .15); root.userData.turret = turret;
  if (sov) {
    cyl(turret, m.dark, 0, 0, 0, 1.4, 1.5, .18, 16);
    box(turret, m.armor, 0, .5, 0, 2.4, .8, 2.2, .18);
    box(turret, m.armor, 0, .5, 1.0, 1.85, .75, .35, .1).rotation.x = -.3;     // 前斜面
    for (const s of [-1, 1]) {
      box(turret, m.armor, s * 1.0, .48, .3, .4, .56, 1.2, .03);              // 副装甲颊
      box(turret, m.team, s * 1.21, .45, .3, .02, .22, .9, 0);                 // 红色警示条
    }
    box(turret, m.dark, 0, .42, -1.25, 1.5, .5, .5, .03);                      // 尾部配重
    for (const s of [-1, 1]) box(turret, m.steel, s * .7, .72, -1.25, .05, .05, .62, 0);
    cyl(turret, m.body, -.6, 1.02, -.5, .3, .33, .3, 8);                       // 车长指挥舱
    cyl(turret, m.dark, -.6, 1.2, -.5, .22, .22, .07, 8);
    for (const s of [-1, 1]) box(turret, glow, -.6 + s * .3, 1.04, -.5, .02, .07, .18, 0);  // 观察缝
    box(turret, m.dark, .62, .76, 1.02, .32, .07, .16, .02);
    box(turret, glow, .62, .7, 1.06, .26, .16, .1, .02);                       // 观瞄镜
  } else {
    cyl(turret, m.dark, 0, 0, 0, .95, 1.05, .16, 16);
    cyl(turret, m.armor, 0, .3, 0, .88, .95, .46, 8);
    cyl(turret, m.body, 0, .56, 0, .76, .76, .12, 8);
    box(turret, m.armor, 0, .28, .76, .76, .44, .34, .03);                     // 炮盾
    box(turret, m.dark, .42, .6, .4, .13, .15, .34, .02);                      // 观瞄
    box(turret, glow, .42, .6, .58, .08, .1, .03, 0);
    box(turret, m.dark, 0, .34, -.8, .82, .48, .42, .06);                      // 尾部配重
    stripe(turret, m.team, 0, .63, -.4, .5, .5);                               // 塔顶阵营色识别板
    for (const s of [-1, 1]) for (const zz of [.3, -.02])                      // 棱镜塔收拢桁架
      box(turret, m.steel, s * .32, .82, zz, .07, .5, .07, 0).rotation.z = s * .22;
    cyl(turret, m.steel, 0, 1.1, .14, .26, .26, .06, 8);                       // 塔顶定位环
    cyl(turret, glow, 0, 1.23, .14, .26, .05, .2, 4);                          // 悬浮水晶下半
    cyl(turret, glow, 0, 1.43, .14, .05, .26, .2, 4);                          // 悬浮水晶上半
    sphere(turret, m.light, 0, 1.33, .14, .12);                                // 发光核心
    antenna(turret, m, -.52, .58, -.66, .8);
  }

  // —— 炮管：原点在炮盾位置 z=0.85，游戏每帧写入 position.z（锚点不动；苏军炮管几何内收以控车长） ——
  const barrel = group(turret, 'barrel', 0, sov ? .5 : .3, .85); root.userData.barrel = barrel;
  if (sov) {   // 双管主炮
    box(barrel, m.armor, 0, 0, .15, 1.05, .52, .5, .12);
    for (const s of [-1, 1]) {
      cyl(barrel, m.steel, s * .32, 0, 1.15, .13, .15, 1.6, 10).rotation.x = Math.PI / 2;
      cyl(barrel, m.dark, s * .32, 0, 1.8, .17, .17, .32, 8).rotation.x = Math.PI / 2;    // 炮口制退器
      cyl(barrel, m.brass, s * .32, .17, .7, .06, .06, .7, 6).rotation.x = Math.PI / 2;    // 复进机
    }
    box(barrel, glow, 0, .1, .45, .14, .1, .18, .02);
  } else {     // 棱镜发射器
    box(barrel, m.body, 0, 0, .22, .6, .42, .55, .03);
    for (const s of [-1, 1])
      cyl(barrel, m.steel, s * .17, .03, .85, .045, .075, .95, 8).rotation.x = Math.PI / 2;  // 导向棱杆
    cyl(barrel, m.steel, 0, .04, .88, .19, .19, .08, 8).rotation.x = Math.PI / 2;              // 聚焦环
    cyl(barrel, glow, 0, .04, 1.15, .16, .035, .45, 4).rotation.x = Math.PI / 2;               // 前向水晶
  }
}
