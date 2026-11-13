# IRON DAWN — PM/QA Report

## Scope

- Deliverable: single-player browser RTS skirmish demo, one map, Allied/Soviet, AI opponent.
- Code generation: primary implementation delegated to `gpt-6.1-sol` (reasoning effort `max`) through the token5u relay with a local tool-calling harness; PM/QA performed integration, balance checks, browser acceptance, and visual/interaction fixes.
- Test browser: DSH-controlled Chromium/Edge at 1280×800 (software WebGL in this environment).
- Static server: `http://127.0.0.1:4173`.

## Automated checks

| Check | Result |
| --- | --- |
| `node --check` on 20 source modules | PASS |
| `node .qa/core-test.mjs` | 8/8 PASS |
| Initial skirmish state / starter economy | PASS |
| Building queue, prerequisites, legal placement | PASS |
| Infantry + vehicle production spawn | PASS |
| Combat damage + kill accounting | PASS |
| AI economy / building expansion / attack wave within 5 min | PASS (headless sim) |
| Victory by removing enemy command | PASS |
| Superweapon charge + strike damage | PASS |
| Nine-minute stability simulation | PASS |

Core AI run observed: AI expanded to 12 buildings / 39 units and launched 2 waves within 5 simulated minutes on headless recruitment difficulty. This confirms the opponent is not static.

## Browser acceptance

| Flow | Result | Notes |
| --- | --- | --- |
| Main menu loads, live 3D diorama, no fatal overlay | PASS | 3D tanks, flags, dust, animated camera. |
| Faction + difficulty selection / DEPLOY COMMAND | PASS | Allied and Soviet starts both verified. |
| HUD renders credits/power/time/minimap/catalog/selection | PASS | 3D thumbnails render; fog and radar state update. |
| First-time tutorial / dismissal persisted | PASS | `localStorage` flag; verified in an earlier profile. |
| Drag selection | PASS | Synthetic pointer events selected 4 units; unit card + rings + health labels appeared. |
| Movement / attack order | PASS | Unit positions changed after a move and after an attack order; combat damage applied. |
| Construction queue → auto placement → confirm | PASS | Queue completed, placement ghost appeared, structure count increased. |
| Power loss | PASS | Destroying the power station produced `POWER CRITICAL`, supply 0 / demand 80, red alerts and feed entries. |
| Building destruction | PASS | Collapse/removal path ran without error overlay; scorch decal added. |
| Superweapon HUD and launch | PASS | Asset card switches to READY at 120 s; launch consumed charge, reset to 7/120 s and damaged the target area. |
| Pause modal / resume | PASS | Pause overlay and RESUME tested via DOM. |
| Victory screen / restart | PASS | Victory stats modal shown; DEPLOY AGAIN reinitialized world, HUD, units and economy. |
| Fog of war | PASS | Main view shroud and minimap fog matched; forward vision cleared in a soft frontier. |
| Faction switch | PASS | Soviet start used Soviet models, names, UI accent and 3D icons; Allied AI used the opposing set. |
| 中文界面 | PASS | 主菜单、HUD、建造目录、单位/建筑名与说明、任务提示、设置、暂停、结算、简报均已中文化；保留了 IRON DAWN 品牌与按键字母。 |
| Audio initialization | PASS (load) | No blocking errors; subjective sound quality not audibly verified in this headless environment. |
| 动态配乐接入 | PASS | 从 `红色警戒2.5D` 项目引入 ambient/production/combat/resolve 四段 MP3；浏览器中四段均成功解码，菜单、生产、战斗、结算状态切换验证通过，无控制台错误。 |
| 雷达站重做 | PASS | 修复根节点 `radar` 与旋转组同名导致整栋建筑旋转的问题；改为独立 `radar_head`；房体 `rotation.y = 0`，雷达头独立旋转；主体改为八角塔楼并区分盟军碟形雷达/苏军阵列。 |
| 主基地重做 | PASS（第一版） | 主基地改为八角指挥中枢、双侧承重翼、开放式建造庭院、中央高塔、通讯冠和建造龙门；保留 10×9 占地约束；根节点保持静止，`yard_trolley` 横向移动、`yard_hoist` 纵向起吊；浏览器截图验收通过；核心回归测试通过。 |
| 战车工厂 Blender 英雄资产 | PASS（第一版） | 54 个网格 / 697 三角面的 GLB 成功接入；运行时按材质合批为约 14 个节点；门体枢轴、阵营灯带、发光条和烟囱锚点已处理；浏览器无捕获错误。尚未做贴图、背面细节、LOD 和完整 360° 美术验收。 |
| 先锋坦克 Blender 英雄资产 | PASS（第一版） | 47 个网格 / 647 三角面的 GLB 成功接入；运行时重建 body/turret/barrel 层级，车体、炮塔、炮管分别合批；炮塔枢轴 `[0,1.58,0.03]`、炮管枢轴 `[0,0.43,0.85]` 与现有动画一致；盟军/苏军材质验证通过；左右各 18 节履带 InstancedMesh 和 5 组负重轮旋转验证通过；击毁生成压暗残骸与烟雾；低面数代理（约 172 顶点）LOD 切换验证通过；苏军附加装甲套件成功挂接；浏览器无捕获错误。尚未做真实悬挂和自动减面 LOD。 |
| Adaptive performance mode | PASS | After sustained low FPS, bloom/FXAA downgraded and a feed notice appeared. |

## Defects found and fixed during acceptance

- `cancelTarget` was referenced before being defined; start crashed.
- `menuHTML` function declaration was accidentally removed during integration; restored.
- HUD catalog icons initially produced invalid inline URL quoting, leaving blank icons; rebuilt using DOM properties.
- HUD catalog intel/queue space caused clipped blueprints; rebalanced sidebar heights and hidden low-value footer.
- Global menu start could use stale faction UI state after returning from a match; menu now syncs active selection to current state.
- Audio engine had no scheduler guard after tab suspension; added catch-up clamp to prevent burst scheduling.
- Selection/box input `setPointerCapture` could throw on synthetic pointers; guarded.
- HUD multi-unit selection showed only the first (often harvester) entity; added task-force summary.
- Pause → settings flow could leave the game paused without a visible modal; settings now pauses/restores explicitly.
- Duplicate incoming superweapon warnings; removed duplicate notice.
- Destroyed structures disappeared instantly; added collapse animation, smoke puffs and persistent scorch fading.
- Building `construct` flag stayed true forever; now cleared after rise animation.
- 第二轮汉化：统一翻译单位/建筑数据、生成提示、HUD、菜单、教程、设置、暂停、结算与帮助文本；保留 IRON DAWN 品牌。中文界面已在浏览器中检查，无排版溢出或运行时错误。

## Known risks / unverified

- A full 10-minute live human playthrough was not performed. Headless browser software WebGL ran at roughly 3–7 FPS; the adaptive mode improved it but not enough for a representative performance claim. Real GPU performance should be validated on the host.
- Audio was verified to initialize without errors but not subjectively auditioned in this run.
- Only one handcrafted map and one skirmish ruleset are included; no campaign, naval, or air layer.
- AI balance across difficulty levels was checked via headless simulation, not by repeated human matches.
- Cross-browser testing beyond Chromium/Edge was not performed.

## Evidence

- Screenshots: `screenshots/menu.png`, `screenshots/gameplay.png`（均为中文化后的界面）。
- Core tests: `.qa/core-test.mjs`.
- Visual/QA page: `qa.html`.
