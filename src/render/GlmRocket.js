// rocket.js —— 火箭兵（无载具步兵）
// 通用：肩扛斜置火箭筒（细长筒体 + 筒口外扩喇叭锥 + 尾部后喷口锥 + 前后握把/扳机护圈/简易瞄具），
//       背大弹药箱，下蹲宽站姿，比步枪手更宽更重
// 盟军：筒体细长（长 1.26 / 直径 0.19）+ 青色瞄具
// 苏军：筒体粗短（长 1.14 / 直径 0.23）+ 两道红色警示环 + 尾部刻环 + 坦克帽护耳（与苏军步枪手同族）
// 动画契约：body/leg×2/arm×2 全部为 group() 创建；leg 枢轴在髋部、arm 枢轴在肩部，几何向下延伸
// 发射筒口朝向 +z（前）并上仰约 30°
import { group, box, cyl, sphere } from './Parts.js';

export function rocket(root, faction, m) {
  const sov = faction === 'soviet';
  const body = group(root, 'body');
  root.userData.body = body;
  root.userData.legs = [];
  root.userData.arms = [];

  // ---- 躯干与装具（重心低 = 下蹲感） ----
  if (sov) {
    box(body, m.body,   0, 1.26,  .01, .64, .46, .50, .09);  // 厚胸
    box(body, m.body,   0,  .84,  0,   .56, .30, .48, .07);  // 大衣下摆（盖胯）
    box(body, m.rubber, 0,  .95,  .01, .58, .10, .50, .03);  // 腰带
    box(body, m.dark,   0, 1.24, -.37, .46, .44, .28, .07);  // 弹药箱
    box(body, m.dark, -.195, 1.70, -.01, .08, .15, .16, .04); // 护耳 L
    box(body, m.dark,  .195, 1.70, -.01, .08, .15, .16, .04); // 护耳 R
  } else {
    box(body, m.body,   0, 1.28,  .01, .62, .46, .52, .09);  // 胸甲
    box(body, m.dark,   0,  .96,  0,   .50, .24, .42, .06);  // 腰部
    box(body, m.rubber, 0,  .92,  .01, .54, .10, .46, .03);  // 腰带
    box(body, m.armor,  0, 1.26, -.37, .46, .44, .30, .07);  // 弹药箱
    box(body, m.armor, -.40, 1.48, .01, .24, .16, .38, .07); // 加厚护肩 L
    box(body, m.armor,  .40, 1.48, .01, .24, .16, .38, .07); // 加厚护肩 R
    box(body, m.dark,    0, 1.71,  .18, .28, .08, .06, .03); // 护目镜带
  }

  // ---- 头部与头盔 ----
  sphere(body, m.armor, 0, 1.70,  .02, .18);                // 头
  if (sov) {
    sphere(body, m.dark, 0, 1.75, -.02, .20);               // 坦克帽顶
  } else {
    sphere(body, m.body, 0, 1.75, -.03, .21);               // 圆盔
    cyl(body, m.body, 0, 1.62, -.01, .24, .25, .05, 10);    // 盔沿
  }

  // ---- 腿（枢轴=髋部 y0.86，下蹲+宽距） ----
  for (const side of [-1, 1]) {
    const leg = group(body, 'leg', side * .26, .86, 0);
    box(leg, sov ? m.dark : m.body, 0, -.26, 0, .28, .52, .30, .06);   // 裤腿
    box(leg, m.rubber, 0, -.66, .08, .31, .34, .46, .07);              // 靴子
    root.userData.legs.push(leg);
    // ---- 臂（枢轴=肩部 y1.44；右手前上扶筒握把） ----
    const arm = group(body, 'arm', side * .48, 1.44, 0);
    box(arm, m.body, 0, -.16, .02, .20, .40, .24, .05);                // 上臂
    box(arm, side > 0 ? m.armor : m.body,
        0, -.32, side > 0 ? .22 : .10, .18, .18, .40, .05);            // 前臂
    root.userData.arms.push(arm);
  }

  // ---- 肩扛火箭筒（turret 为瞄准节点；斜置上仰约 30°，筒口 +z 前上方） ----
  // 规格：筒体长 1.1–1.3 / 直径 0.18–0.24；筒口外扩喇叭锥，尾部向后喷口锥
  const gun = group(body, 'gun', .26, 1.54, .06);
  root.userData.turret = gun;
  const tilt = 0.52;                               // 仰角（弧度，约 30°）
  const dY = Math.sin(tilt), dZ = Math.cos(tilt);  // 筒轴方向（沿轴距离 d 的偏移）
  const rotX = Math.PI / 2 - tilt;                 // 圆柱 +y 轴旋到筒轴
  const rT = sov ? .115 : .095;                    // 筒半径（直径 .23 / .19 ∈ 0.18–0.24）
  const L  = sov ? 1.14 : 1.26;                    // 筒长（∈ 1.1–1.3）
  const sightMat = m.light || m.armor;             // 盟军青色瞄具（无 light 材质时退回装甲色）
  const at = (d, up = 0) => [0, dY * d + up, dZ * d];   // 筒轴上 d 处、垂直上移 up 的坐标

  const main = cyl(gun, m.dark, ...at(0), rT, rT, L, 10);                          // 主筒体
  main.rotation.x = rotX;
  const bell = cyl(gun, m.dark, ...at(L / 2 + .05), sov ? .17 : .15, rT, .13, 10); // 筒口喇叭锥（外扩）
  bell.rotation.x = rotX;
  const noz = cyl(gun, m.dark, ...at(-L / 2 - .05), rT, rT * .5, .12, 10);         // 尾喷口锥（向后收小）
  noz.rotation.x = rotX;

  // 侧面握把 ×2 + 扳机护圈 + 简易瞄具
  box(gun, sov ? m.steel : m.dark, ...at(.34, -(rT + .10)), .07, .18, .10, .03);   // 前握把
  box(gun, sov ? m.steel : m.dark, ...at(-.08, -(rT + .08)), .06, .15, .09, .03);  // 后握把（扳机手）
  box(gun, m.dark, ...at(-.08, -(rT + .175)), .05, .02, .13, 0);                   // 扳机护圈底杆
  box(gun, m.dark, ...at(-.02, -(rT + .12)), .05, .10, .02, 0);                    // 扳机护圈前柱
  box(gun, m.dark, ...at(.18, rT + .05), .06, .08, .14, .02);                      // 瞄具座
  if (!sov) {
    box(gun, sightMat, ...at(.18, rT + .11), .05, .04, .06, 0);                    // 青色瞄具发光块
  } else {
    box(gun, m.steel, ...at(.18, rT + .105), .02, .05, .02, 0);                    // 准星薄片
    for (const d of [-L / 2 + .10, -L / 2 + .18]) {                                // 尾部刻环 ×2
      const ring = cyl(gun, m.steel, ...at(d), rT + .02, rT + .02, .03, 10);
      ring.rotation.x = rotX;
    }
    for (const d of [.20, -.10]) {                                                 // 红色警示环 ×2
      const ring = cyl(gun, m.team, ...at(d), rT + .035, rT + .035, .07, 10);
      ring.rotation.x = rotX;
    }
  }
}
