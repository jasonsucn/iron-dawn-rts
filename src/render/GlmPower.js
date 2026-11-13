import { foundation, cyl, box, sphere, pipe } from './Parts.js';

// ==== power.js · 发电厂（第二轮迭代） ====
// 出口：export function power(root, faction, m)
// 仅使用 Parts.js 白名单 helper：foundation / cyl / box / sphere / pipe
//（ring、antenna 等本实现一律以内联圆柱带/自建桅塔替代，避免依赖签名未知的 helper）
// 预算：≤3500 三角 · ≤7.0×7.0 占地 · ≤7.0 总高
//
// 三段式地标结构：
//   坪 —— 深色地基 + 三块八角设备坪 + 黄铜缘带 / 角部螺栓
//   群 —— 双曲线收腰冷却塔 ×2（宽底 → 收腰 → 顶口外翻，深色膛口 + 塔口辉光环）
//         + 中央堆芯鼓（黄铜基环 / 发光环带 / 装甲穹顶 / 辉光球）
//         + 腰部蒸汽联箱连通双塔
//   塔 —— 后方输电桅塔（双段塔柱 + 横梁 + 辉光信标），黄铜拉线双端锚固
// 阵营：盟军 = 细联箱、发光竖窗、悬垂绝缘子、青色辉光（m.light）
//       苏军 = 粗联箱 + 下潜烟道、铆钉、红色警示翼、厚重横梁、橙色辉光（m.warm）

export function power(root, faction, m) {
  const sov = String(faction ?? '').toLowerCase().startsWith('sov') || faction === true || faction === 1;
  const GLOW = sov ? m.warm : m.light; // 发光焦点：盟军青 / 苏军橙

  // ---- 坪：深色地基 + 三块八角设备坪 + 黄铜缘带 / 角部螺栓 ----
  foundation(root, m, 6.4, 6.4);
  cyl(root, m.dark, 0, .56, .55, 1.06, 1.14, .36, 8);   // 中央堆芯坪
  cyl(root, m.brass, 0, .68, .55, 1.11, 1.11, .08, 10); // 坪缘黄铜环带
  const towers = [[-1.72, -1.15, -1], [1.72, -1.15, 1]];
  for (const [tx, tz] of towers) cyl(root, m.dark, tx, .56, tz, 1.00, 1.08, .36, 8); // 塔坪
  for (const [bx, bz] of [[-.75, 1.30], [.75, 1.30], [-.75, -.20], [.75, -.20]])
    cyl(root, m.brass, bx, .775, bz, .09, .09, .07, 6); // 角部黄铜螺栓

  // ---- 双曲线冷却塔 ×2：宽底收分 → 直腰 → 顶口外翻 → 深色膛口 ----
  for (const [tx, tz, s] of towers) {
    cyl(root, m.dark, tx, .78, tz, .96, 1.02, .10, 9);      // 塔基环
    cyl(root, m.concrete, tx, 1.68, tz, .62, .92, 1.70, 9); // 宽底收分
    cyl(root, m.concrete, tx, 3.16, tz, .58, .58, 1.26, 9); // 收腰
    cyl(root, m.concrete, tx, 4.045, tz, .74, .60, .51, 9); // 顶口外翻
    cyl(root, m.dark, tx, 4.315, tz, .68, .68, .09, 9);     // 膛口（空心读感）
    cyl(root, m.steel, tx, 3.82, tz, .64, .64, .09, 9);     // 腰顶钢箍
    cyl(root, GLOW, tx, 4.19, tz, .77, .77, .10, 9);        // 塔口辉光环（环外翻唇）
    cyl(root, m.team, tx, .90, tz, .98, .98, .12, 9);       // 塔基阵营警示环带
    if (!sov) box(root, m.team, tx + s * .79, 1.75, tz, .09, .50, .34, .01); // 盟军识别板
  }

  // ---- 中央堆芯：锥台鼓身 + 黄铜基环 + 发光环带 + 装甲穹顶 + 辉光球 ----
  cyl(root, m.body, 0, 1.82, .55, .80, .92, 2.30, 12);
  cyl(root, m.brass, 0, .86, .55, .98, .98, .12, 12);
  cyl(root, GLOW, 0, 2.38, .55, .89, .89, .26, 12);
  cyl(root, m.armor, 0, 3.06, .55, .84, .92, .18, 12);
  sphere(root, m.armor, 0, 3.12, .55, .58);
  cyl(root, m.brass, 0, 3.80, .55, .07, .09, .34, 6);
  sphere(root, GLOW, 0, 4.02, .55, .23);

  // ---- 鼓身细节：盟军发光竖窗 / 苏军铆钉 ----
  for (const a of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
    const wx = Math.sin(a), wz = Math.cos(a);
    if (sov) box(root, m.brass, wx * .84, 2.80, .55 + wz * .84, .08, .08, .10, .008).rotation.y = a;
    else box(root, m.light, wx * .815, 2.78, .55 + wz * .815, .08, .42, .04, .008).rotation.y = a;
  }

  // ---- 蒸汽联箱：腰部连通双塔（苏军加粗 + 两根下潜烟道入堆芯） ----
  pipe(root, m.steel, [-1.72, 3.05, -1.15], [1.72, 3.05, -1.15], sov ? .20 : .13);
  for (const s of [-1, 1])
    cyl(root, m.brass, s * 1.10, 3.05, -1.15, sov ? .28 : .17, sov ? .28 : .17, .14, 8);
  if (sov) for (const s of [-1, 1]) {
    pipe(root, m.dark, [s * .62, 3.05, -1.15], [s * .42, 1.70, -.15], .14);
    cyl(root, m.brass, s * .62, 3.05, -1.15, .19, .19, .12, 8);
  }

  // ---- 输电桅塔：双段塔柱 + 横梁 + 辉光信标 ----
  cyl(root, m.dark, 0, .50, -.35, .16, .22, .22, 8);      // 塔基座
  cyl(root, m.steel, 0, 1.95, -.35, .055, .075, 2.90, 6); // 下段塔柱
  cyl(root, m.steel, 0, 4.55, -.35, .040, .055, 2.40, 6); // 上段塔柱
  cyl(root, m.steel, 0, 5.86, -.35, .030, .040, .30, 6);  // 塔尖
  box(root, sov ? m.dark : m.brass, 0, 5.62, -.35, sov ? 2.30 : 2.10, .07, .09, .01); // 横梁
  if (sov) for (const fx of [-.55, .55])
    box(root, m.team, fx, 5.70, -.35, .26, .09, .05, .008); // 横梁警示翼
  else for (const ix of [-.85, .85]) {
    cyl(root, m.dark, ix, 5.445, -.35, .045, .045, .28, 6); // 悬垂绝缘子
    cyl(root, GLOW, ix, 5.275, -.35, .060, .060, .06, 6);   // 辉光端子
  }
  box(root, GLOW, 0, 6.06, -.35, .12, .12, .12, .01);       // 辉光信标

  // ---- 黄铜拉线：横梁↔塔口、塔腰↔地坪角（双端锚固，读作结构） ----
  for (const s of [-1, 1]) {
    pipe(root, m.brass, [s * .95, 5.62, -.35], [s * 2.44, 4.28, -1.15], .045);
    pipe(root, m.brass, [s * 2.30, 2.75, -1.15], [s * 2.85, .42, -2.70], .045);
  }

  root.userData.smokestacks = [[-1.72, 4.42, -1.15], [1.72, 4.42, -1.15]];
}
