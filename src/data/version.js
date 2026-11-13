/**
 * 版本号（唯一来源）
 * 维护规则（SemVer）：
 *   MAJOR —— 破坏性改动：存档/网络协议不兼容、核心玩法推翻重做
 *   MINOR —— 新增功能：新建筑、新单位、新玩法、新界面能力
 *   PATCH —— 兼容性修复：bug 修复、平衡微调、文案与美术微调
 * 每次发版同步更新 package.json 的 version 字段，打对应 git tag（如 v1.0.0）。
 */
export const VERSION = '1.0.0';
export const VERSION_LABEL = `版本 ${VERSION}`;
