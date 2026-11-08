export const MAP_SIZE = 160;
export const HALF = MAP_SIZE / 2;
export const STEP = 1 / 30;
export const FACTIONS = {
  allied: { name: '盟军先锋', short: '盟军', color: '#58d7ed', dark: '#234958', motto: '精准、机动、决心。', super: '极光阵列' },
  soviet: { name: '苏军指挥部', short: '苏军', color: '#f16a51', dark: '#623932', motto: '钢铁、工业、统治。', super: '核弹发射井' }
};
export const DIFFICULTIES = {
  recruit: { name: '新兵', economy: 0.95, production: 0.9, wave: 100, size: 6 },
  veteran: { name: '老兵', economy: 1.2, production: 1.15, wave: 76, size: 8 },
  iron: { name: '铁幕', economy: 1.55, production: 1.4, wave: 58, size: 11 }
};
const b = (name, cost, time, hp, w, d, power, requires, description) => ({ name, cost, time, hp, w, d, radius: Math.max(w,d)*0.5, power, requires, description, building: true, armor: 'structure', sight: 23 });
const u = (name, cost, time, hp, speed, armor, requires, weapon, description) => ({ name, cost, time, hp, speed, armor, requires, weapon, description, radius: armor === 'infantry' ? 0.55 : 1.45, sight: 20, building: false });
export const DEFS = {
  yard: b('建造厂', 2800, 35, 2600, 10, 9, -25, [], '指挥核心。扩张建造领土。失去所有建造厂与基地车即告失败。'),
  power: b('电厂', 700, 12, 1000, 7, 7, 180, ['yard'], '提供 180 点电力。电力不足会降低生产速度与防御设施射速。'),
  refinery: b('矿石精炼厂', 1500, 20, 1600, 10, 8, -35, ['power'], '将矿石转化为资金，并附赠一辆自动采矿车。'),
  barracks: b('兵营', 650, 13, 1000, 7, 7, -20, ['refinery'], '训练步兵。选中后右键点击地面可设置集结点。'),
  factory: b('战车工厂', 1800, 24, 1900, 11, 9, -55, ['refinery'], '制造装甲车辆、采矿车与基地车。'),
  radar: b('雷达站', 1300, 20, 1100, 7, 7, -45, ['factory'], '解锁战术雷达、高级装甲、防御设施与战略武器。'),
  defense: { ...b('光棱塔', 900, 15, 1100, 4, 4, -35, ['radar'], '电力驱动的区域防御。盟军使用光棱束，苏军使用连锁磁暴。'), weapon: 'tower', sight: 26 },
  super: b('极光阵列', 2600, 35, 2000, 9, 9, -100, ['radar'], '战略打击武器。充能 120 秒后，可对目标区域发动毁灭性攻击。'),
  rifle: u('步枪手', 120, 5, 110, 4.7, 'infantry', ['barracks'], 'rifle', '机动反步兵步枪手。廉价、快速，数量优势明显。'),
  rocket: u('火箭兵', 250, 8, 100, 3.8, 'infantry', ['barracks'], 'rocket', '制导反装甲火箭兵。惧怕步枪火力与坦克碾压。'),
  tank: u('灰熊坦克', 750, 15, 650, 5.1, 'heavy', ['factory'], 'cannon', '主战坦克。独立炮塔、穿甲炮弹与碾压履带。'),
  advanced: u('光棱坦克', 1400, 23, 850, 4.4, 'heavy', ['factory', 'radar'], 'prism', '盟军远程光棱坦克 / 苏军双管重型攻城装甲。'),
  harvester: { ...u('采矿车', 1000, 18, 1000, 3.7, 'heavy', ['refinery'], null, '自动开采矿石并运回精炼厂。载矿容量：$700。'), sight: 17 },
  mcv: { ...u('基地车', 2400, 30, 1500, 3.1, 'heavy', ['factory'], null, '可在选中面板中部署为新的建造厂。'), radius: 2 }
};
export const CATALOG = { structures: ['power','refinery','barracks','factory','radar','super'], defenses: ['defense'], infantry: ['rifle','rocket'], vehicles: ['tank','advanced','harvester','mcv'] };
const SOVIET_NAMES = {
  power: '磁能反应炉',
  defense: '磁暴线圈',
  super: '核弹发射井',
  rifle: '动员兵',
  rocket: '火箭兵',
  tank: '犀牛坦克',
  advanced: '天启坦克'
};
export function displayName(type, faction) {
  if (faction === 'soviet') return SOVIET_NAMES[type] || DEFS[type].name;
  return DEFS[type].name;
}
export const WEAPONS = {
  rifle: { damage: 13, range: 12, cooldown: 0.5, speed: 75, kind: 'bullet', splash: 0, turn: 10 },
  rocket: { damage: 78, range: 18, cooldown: 2.6, speed: 20, kind: 'rocket', splash: 1.8, turn: 8 },
  cannon: { damage: 82, range: 19, cooldown: 2.2, speed: 36, kind: 'piercing', splash: 2, turn: 3.5 },
  prism: { damage: 135, range: 25, cooldown: 3, speed: 200, kind: 'energy', splash: 1, turn: 3 },
  heavy: { damage: 158, range: 21, cooldown: 3.1, speed: 32, kind: 'piercing', splash: 3.5, turn: 2.6 },
  tower: { damage: 110, range: 25, cooldown: 1.7, speed: 200, kind: 'energy', splash: 1.8, turn: 5 }
};
export const ARMOR = {
  bullet: { infantry: 1, light: 0.6, heavy: 0.18, structure: 0.16 },
  piercing: { infantry: 0.55, light: 1.1, heavy: 1, structure: 0.85 },
  rocket: { infantry: 0.6, light: 1.1, heavy: 1.25, structure: 0.8 },
  energy: { infantry: 1, light: 1.1, heavy: 1, structure: 0.9 },
  explosive: { infantry: 1.4, light: 1.1, heavy: 0.85, structure: 1 }
};
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x-b.x, a.z-b.z);
export function angleDelta(a, b) { return Math.atan2(Math.sin(b-a), Math.cos(b-a)); }
export function seeded(seed = 91347) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
export function timeText(seconds) { const t = Math.max(0, Math.floor(seconds)); return `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toString().padStart(2,'0')}`; }
