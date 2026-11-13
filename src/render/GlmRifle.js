// rifle.js —— 步枪手（无载具步兵）
// 盟军：青白精密装甲，圆盔+盔沿+护目镜带，护肩/背挂件，身形挺拔收腰
// 苏军：暗红厚重大衣，毛领+大衣下摆盖胯，坦克帽+护耳，方肩宽胸
// 动画契约：body/leg×2/arm×2 全部为 group() 创建；leg 枢轴在髋部、arm 枢轴在肩部，几何向下延伸
// 枪口朝向 +z（前）
import { group, box, cyl, sphere } from './Parts.js';

export function rifle(root, faction, m) {
  const sov = faction === 'soviet';
  const body = group(root, 'body');
  root.userData.body = body;
  root.userData.legs = [];
  root.userData.arms = [];

  // ---- 躯干与装具 ----
  if (sov) {
    box(body, m.body,   0, 1.30,  .01, .60, .48, .44, .08);  // 大衣胸部（方肩宽胸）
    box(body, m.body,   0,  .86,  0,   .52, .32, .46, .07);  // 大衣下摆（盖住胯部，轮廓关键）
    box(body, m.dark,   0, 1.58, -.02, .44, .16, .36, .05);  // 毛领
    box(body, m.rubber, 0,  .98,  .01, .54, .10, .48, .03);  // 腰带
    box(body, m.dark,   0, 1.28, -.36, .40, .40, .26, .06);  // 背包
  } else {
    box(body, m.body,   0, 1.32,  .01, .56, .48, .46, .08);  // 胸甲/背心
    box(body, m.dark,   0, 1.02,  0,   .46, .26, .38, .06);  // 收腰
    box(body, m.rubber, 0,  .96,  .01, .52, .10, .44, .03);  // 腰带
    box(body, m.armor,  0, 1.30, -.36, .40, .42, .28, .06);  // 背包
    box(body, m.armor, -.37, 1.55, .01, .22, .14, .34, .06); // 护肩 L
    box(body, m.armor,  .37, 1.55, .01, .22, .14, .34, .06); // 护肩 R
    box(body, m.dark,    0, 1.80,  .19, .30, .08, .06, .03); // 护目镜带
  }

  // ---- 头部与头盔（两阵营轮廓差异核心） ----
  sphere(body, m.armor, 0, 1.79,  .02, .19);                // 头
  if (sov) {
    sphere(body, m.dark, 0, 1.85, -.02, .21);               // 坦克帽顶（低矮贴合）
    box(body, m.dark, -.205, 1.80, -.01, .09, .17, .18, .04); // 护耳 L
    box(body, m.dark,  .205, 1.80, -.01, .09, .17, .18, .04); // 护耳 R
  } else {
    sphere(body, m.body, 0, 1.86, -.03, .22);               // 圆盔（后移让出面部）
    cyl(body, m.body, 0, 1.71, -.01, .26, .27, .05, 10);    // 盔沿
  }

  // ---- 腿（枢轴=髋部 y0.92，几何向下） ----
  for (const side of [-1, 1]) {
    const leg = group(body, 'leg', side * .19, .92, 0);
    box(leg, sov ? m.dark : m.body, 0, -.31, 0, .24, .62, .26, .05);   // 裤腿
    box(leg, m.rubber, 0, -.77, .07, .27, .32, .42, .06);              // 靴子
    root.userData.legs.push(leg);
    // ---- 臂（枢轴=肩部 y1.50，几何向下；右手前伸扶枪） ----
    const arm = group(body, 'arm', side * .44, 1.50, 0);
    box(arm, m.body, 0, -.18, .02, .20, .42, .24, .05);                // 上臂
    box(arm, side > 0 ? m.armor : m.body,
        0, -.36, side > 0 ? .22 : .10, .18, .18, .40, .05);            // 前臂
    root.userData.arms.push(arm);
  }

  // ---- 步枪（turret 为瞄准节点，枪口 +z） ----
  const gun = group(body, 'gun', .32, 1.16, .32);
  root.userData.turret = gun;
  box(gun, m.dark, 0, 0, -.08, .09, .15, .62, .03);          // 枪身（枪托+机匣一体）
  const barrel = cyl(gun, m.steel, 0, .02, .48, .042, .042, .50, 8); // 枪管
  barrel.rotation.x = Math.PI / 2;
}
