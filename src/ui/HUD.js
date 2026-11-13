import { DEFS, CATALOG, displayName, timeText } from '../data/definitions.js';

const ORDER_LABEL = { idle: '待命', move: '移动中', attack: '攻击中', attackMove: '攻击移动', hold: '坚守' };
const ARMOR_LABEL = { infantry: '步兵', light: '轻型装甲', heavy: '重型装甲', structure: '建筑' };
const FACTION_LABEL = { allied: '盟军', soviet: '苏军' };
const orderLabel = value => ORDER_LABEL[value] || '待命';
const armorLabel = value => ARMOR_LABEL[value] || '装甲';
const factionLabel = value => FACTION_LABEL[value] || '军队';

const ICON_GLYPH = {
  yard: '▰', power: '◫', refinery: '⬢', barracks: '▤', factory: '▥', radar: '◉',
  defense: '⌁', super: '✶', rifle: '◆', rocket: '▲', tank: '◈', advanced: '✦',
  harvester: '⬟', mcv: '▣'
};
const ICON_COLOR = {
  yard: '#c4ad7a', power: '#81beb4', refinery: '#d7a04e', barracks: '#9eb3a2',
  factory: '#a8b7ae', radar: '#78c7cf', defense: '#78e3df', super: '#efa66b',
  rifle: '#9dad9b', rocket: '#c59373', tank: '#aab8aa', advanced: '#87e1df',
  harvester: '#d2a75e', mcv: '#b7bdad'
};
const TAB_INFO = [
  ['structures', 'Q', '建筑', '基地'],
  ['defenses', 'W', '防御', '火力'],
  ['infantry', 'E', '步兵', '人员'],
  ['vehicles', 'R', '载具', '机械']
];

function iconThumb(type, faction) {
  return window.__IRON_ICONS__?.[`${faction}:${type}`] || '';
}

function makeIcon(type, faction, className = 'blueprint-icon') {
  const thumb = iconThumb(type, faction);
  const span = document.createElement('span');
  span.className = className + (thumb ? ' has-thumb' : '');
  span.style.setProperty('--icon', ICON_COLOR[type] || '#9db0a4');
  if (thumb) span.style.backgroundImage = `url("${thumb}")`;
  else span.textContent = ICON_GLYPH[type] || '▰';
  return span;
}

export class HUD {
  constructor(root, actions) {
    this.root = root;
    this.a = actions;
    this.tab = 'structures';
    this.lastCatalogSignature = '';
    this.lastQueueSignature = '';
    this.mapCtx = null;
    this.mapCanvas = null;
    this.fogCanvas = null;
    this.fogCtx = null;
    this.fogImage = null;
    this.noticeCount = 0;
    this.make();
  }

  make() {
    this.root.innerHTML = `
      <header class="hud-top">
        <div class="hud-brand"><span class="faction-pin" id="hud-pin"></span><b>贱客战争</b><small>即时战略 · <span id="hud-faction">盟军先锋</span></small></div>
        <div class="hud-readout">
          <span class="read-cell"><small>资金</small><b id="credits">—</b><em id="income"></em></span>
          <span class="read-cell"><small>电力</small><b id="power">—</b><em id="power-warning"></em></span>
          <span class="read-cell"><small>作战时间</small><b id="time">00:00</b></span>
          <span class="read-cell radar-cell"><small>战术雷达</small><b id="radar-online">受限</b></span>
        </div>
        <div class="hud-status"><i class="live-dot"></i><span id="hud-state">交战中</span><span class="perf-chip" id="perf-chip" title="帧率 · 绘制调用 · 三角形">— FPS</span><button data-command="home" title="回到基地 [Space]">⌂</button><button data-command="fullscreen" title="全屏 [Alt+Enter]">⛶</button><button data-command="pause" title="暂停 [Esc]">Ⅱ</button><button data-command="settings" title="设置">⚙</button></div>
      </header>
      <div class="hud-objective"><span class="tag">主要目标</span><span>摧毁敌方建造厂</span></div>
      <div class="alerts" id="alerts"></div>
      <aside class="build-panel panel">
        <div class="build-head"><span class="eyebrow">生产</span><span class="tag" id="tech-tag">一级科技</span></div>
        <div class="build-tabs">${TAB_INFO.map(([id, key, label]) => `<button data-tab="${id}" class="${id === 'structures' ? 'active' : ''}"><kbd>${key}</kbd>${label}</button>`).join('')}</div>
        <div class="catalog" id="catalog"></div>
        <div class="intel-card">
          <div class="intel-head"><span>战地情报</span><b id="intel-state">实时</b></div>
          <p id="intel-copy">稳住防线，开采矿石，并搜寻敌方建造厂的位置。</p>
          <div class="feed" id="feed"><div class="feed-line"><span>00:00</span> 指挥链路已建立</div></div>
        </div>
        <div class="queue-head"><span>生产队列</span><span id="queue-count">0 / 8</span></div>
        <div class="queue" id="queue"></div>
        <div class="super-card" id="super-card">
          <div class="super-title"><span class="tag">战略武器</span><b id="super-state">未建造</b></div>
          <div class="super-track"><i id="super-bar"></i></div>
          <button class="super-button" id="super-button" data-command="target" hidden>指定打击目标 <span>⌁</span></button>
        </div>
        <div class="build-foot">点击蓝图开始生产<br><small>选中生产建筑后，右键地面可设置集结点</small></div>
      </aside>
      <section class="unit-card panel" id="selection">
        <div class="unit-identity">
          <div class="unit-glyph" id="unit-glyph">—</div>
          <div class="unit-copy"><div class="eyebrow" id="unit-type">未选择</div><h3 id="unit-name">指挥你的部队</h3><div class="unit-sub" id="unit-sub">选择单位或建筑</div></div>
          <span class="unit-rank" id="unit-rank" hidden>精英</span>
        </div>
        <div class="unit-stats">
          <div><small>完整度 <b id="hp-num">—</b></small><div class="hp-track"><i id="hp-bar"></i></div></div>
          <div><small>状态</small><b id="unit-status">待命</b></div>
        </div>
        <div class="selection-actions" id="selection-actions">
          <button data-command="attackMove">A · 攻击移动</button>
          <button data-command="stop">S · 停止</button>
          <button data-command="hold">H · 坚守</button>
          <button data-command="deploy" id="mcv-deploy" hidden>部署基地车</button>
        </div>
        <div class="building-actions" id="building-actions" hidden>
          <button data-command="repair">维修</button>
          <button data-command="sell">出售</button>
          <button data-command="target" id="target-building" hidden>打击</button>
          <button data-command="deploy" id="deploy-building" hidden>部署</button>
        </div>
      </section>
      <aside class="mini-map panel">
        <header><span>战术雷达</span><b id="radar-tag">受限</b></header>
        <canvas class="mini" width="188" height="188" aria-label="战术小地图"></canvas>
        <footer><i></i>友军 <i class="hostile"></i>敌军 <span class="mini-coord" id="mini-coord">X -48 ∕ Z 44</span></footer>
      </aside>
      <div class="world-hint" id="world-hint">右键移动 · 拖拽框选</div>
      <div class="fps-tag" id="fps-tag">— 帧/秒</div>
      <div class="notice-stack" id="notice-stack"></div>
      <div class="tutorial" id="tutorial">
        <button data-dismiss aria-label="关闭简报">×</button>
        <div class="eyebrow">指挥官简报</div>
        <strong>你的部队已进入阵地。</strong>
        <span><kbd>鼠标左键拖拽</kbd>选择单位 · <kbd>鼠标右键</kbd>移动或攻击。<br>在右侧生产面板建造，并保卫建造厂。<br><em>建造厂被毁后，仍可用战车工厂生产的基地车重建指挥体系。</em></span>
      </div>`;
    this.root.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => this.setTab(button.dataset.tab);
    });
    this.root.querySelectorAll('[data-command]').forEach(button => {
      button.onclick = () => this.a.command(button.dataset.command);
    });
    const dismiss = this.root.querySelector('[data-dismiss]');
    if (dismiss) dismiss.onclick = () => {
      const tutorial = this.root.querySelector('#tutorial');
      tutorial?.classList.remove('show');
      tutorial?.remove();
      localStorage.setItem('iron-tutorial', '1');
    };
    this.mapCanvas = this.root.querySelector('.mini-map canvas');
    this.mapCtx = this.mapCanvas.getContext('2d');
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = this.fogCanvas.height = 80;
    this.fogCtx = this.fogCanvas.getContext('2d');
    this.fogImage = this.fogCtx.createImageData(80, 80);
    const mini = this.root.querySelector('.mini-map');
    const jump = event => {
      const rect = this.mapCanvas.getBoundingClientRect();
      this.a.minimap((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    };
    let dragging = false;
    mini.addEventListener('pointerdown', event => {
      if (event.target !== this.mapCanvas) return;
      dragging = true;
      mini.setPointerCapture?.(event.pointerId);
      jump(event);
      event.preventDefault();
    });
    mini.addEventListener('pointermove', event => {
      if (!dragging) return;
      jump(event);
    });
    const stopDrag = () => { dragging = false; };
    mini.addEventListener('pointerup', stopDrag);
    mini.addEventListener('pointercancel', stopDrag);
  }

  setTab(tab) {
    this.tab = tab;
    this.root.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    this.lastCatalogSignature = '';
    const header = this.root.querySelector('.build-head .eyebrow');
    if (header) header.textContent = `生产 · ${TAB_INFO.find(t => t[0] === tab)?.[2] || '建筑'}`;
  }

  order(tab) {
    return CATALOG[tab] || [];
  }

  thumb(type, faction) {
    return iconThumb(type, faction);
  }

  updatePerf({ fps = 0, calls = 0, tris = 0, low = false } = {}) {
    const chip = this.root.querySelector('#perf-chip');
    const value = Math.round(fps);
    if (chip) {
      chip.textContent = value + ' FPS';
      chip.classList.toggle('good', value >= 55);
      chip.classList.toggle('warn', value >= 30 && value < 55);
      chip.classList.toggle('bad', value < 30);
      chip.classList.toggle('low', low);
      chip.title = value + ' 帧/秒 · ' + calls + ' 次绘制 · ' + Math.round(tris / 1000) + 'k 三角形' + (low ? ' · 性能模式' : '');
    }
    const tag = this.root.querySelector('#fps-tag');
    if (tag) tag.textContent = value + ' 帧/秒' + (low ? ' · 性能模式' : '');
  }

  update(world, selection, placement, fps) {
    if (!world) return;
    const player = world.players[0];
    const faction = player.faction;
    const money = Math.floor(player.credits);
    this.root.querySelector('#credits').textContent = `$${money.toLocaleString('en-US')}`;
    this.root.querySelector('#income').textContent = player.lowPower ? '' : '';
    const power = this.root.querySelector('#power');
    power.textContent = `${player.supply} / ${player.demand}`;
    power.classList.toggle('low', player.lowPower);
    this.root.querySelector('#power-warning').textContent = player.lowPower ? '低电' : '';
    this.root.querySelector('#time').textContent = timeText(world.time);
    this.root.querySelector('#hud-faction').textContent = faction === 'soviet' ? '苏军指挥部' : '盟军先锋';
    this.root.querySelector('#hud-pin').style.background = faction === 'soviet' ? 'var(--red)' : 'var(--cyan)';
    this.root.querySelector('#fps-tag').textContent = `${Math.round(fps)} 帧/秒`;
    this.lastFps = fps;
    this.root.querySelector('#hud-state').textContent = world.players[0].lowPower ? '电力告急' : '交战中';
    this.root.querySelector('#hud-state').style.color = world.players[0].lowPower ? 'var(--red)' : '';
    const radar = world.list(0).some(e => e.type === 'radar');
    this.root.querySelector('#radar-online').textContent = radar ? '在线' : '受限';
    this.root.querySelector('#radar-tag').textContent = radar ? '在线' : '受限';
    this.root.querySelector('#tech-tag').textContent = radar ? '二级科技' : '一级科技';

    this.drawCatalog(world, player);
    this.drawQueue(world, player);
    this.drawSuper(world);
    this.updateSelection(world, selection, placement);
    this.drawMiniMap(world);
    this.updateIntel(world, selection, placement);
  }

  drawCatalog(world, player) {
    const catalog = this.root.querySelector('#catalog');
    const types = this.order(this.tab);
    for (const button of catalog.children) {
      const def = DEFS[button.dataset.type];
      if (def) button.classList.toggle('unaffordable', !button.disabled && player.credits < def.cost);
    }
    const signature = `${this.tab}|${types.map(type => `${type}:${world.economy.requirements(0, type)}`).join('|')}`;
    if (signature === this.lastCatalogSignature) return;
    this.lastCatalogSignature = signature;
    catalog.innerHTML = '';
    const faction = player.faction;
    types.forEach((type, index) => {
      const def = DEFS[type];
      const requirement = world.economy.requirements(0, type);
      const button = document.createElement('button');
      button.className = 'blueprint';
      button.dataset.type = type;
      button.title = `${displayName(type, faction)} · $${def.cost.toLocaleString()} · ${def.time} 秒\n${requirement || def.description}`;
      button.appendChild(makeIcon(type, faction));
      const copy = document.createElement('span');
      copy.className = 'blueprint-copy';
      copy.innerHTML = `<b>${displayName(type, faction)}</b><small>$${def.cost.toLocaleString()} <span>·</span> ${def.time} 秒</small>${def.power ? `<em class="bp-power">${def.power > 0 ? '+' : ''}${def.power} 电力</em>` : ''}`;
      button.appendChild(copy);
      const hotkey = document.createElement('kbd');
      hotkey.textContent = index < 9 ? String(index + 1) : '';
      button.appendChild(hotkey);
      if (requirement) {
        button.disabled = true;
        button.classList.add('locked');
        const reason = document.createElement('small');
        reason.className = 'bp-reason';
        reason.textContent = requirement;
        button.querySelector('.blueprint-copy').appendChild(reason);
      } else if (player.credits < def.cost) {
        button.classList.add('unaffordable');
      }
      button.onclick = () => this.a.enqueue(type);
      catalog.appendChild(button);
    });
  }

  drawQueue(world, player) {
    const root = this.root.querySelector('#queue');
    const jobs = [...player.queues.structures, ...player.queues.infantry, ...player.queues.vehicles];
    this.root.querySelector('#queue-count').textContent = `${jobs.length} / 8`;
    const signature = jobs.map(job => `${job.type}/${Math.floor(job.progress * 100)}/${job.ready}`).join('|');
    if (signature === this.lastQueueSignature) return;
    this.lastQueueSignature = signature;
    root.innerHTML = '';
    if (!jobs.length) {
      root.innerHTML = '<div class="queue-empty">暂无生产任务</div>';
      return;
    }
    jobs.slice(0, 5).forEach((job, index) => {
      const def = DEFS[job.type];
      const row = document.createElement('div');
      row.className = 'queue-item' + (job.ready ? ' ready' : '') + (job.stalled ? ' stalled' : '');
      row.appendChild(makeIcon(job.type, player.faction, 'queue-glyph'));
      const name = document.createElement('span');
      name.className = 'queue-name';
      name.innerHTML = `<b>${displayName(job.type, player.faction)}</b><small>${job.stalled ? '等待资金' : job.ready ? '等待放置' : `${Math.floor(job.progress * 100)}%`}</small>`;
      row.appendChild(name);
      const track = document.createElement('i');
      track.className = 'queue-track';
      track.innerHTML = `<b style="width:${Math.min(100, job.progress * 100)}%"></b>`;
      row.appendChild(track);
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'queue-cancel';
      cancel.title = '取消生产并退款';
      cancel.textContent = '×';
      cancel.onclick = () => this.a.cancel(job.type);
      row.appendChild(cancel);
      root.appendChild(row);
    });
  }

  drawSuper(world) {
    const card = this.root.querySelector('#super-card');
    const button = this.root.querySelector('#super-button');
    const supers = world.list(0).filter(e => e.type === 'super');
    this.root.querySelector('.build-panel')?.classList.toggle('has-super', supers.length > 0);
    const maxCharge = supers.reduce((best, superEntity) => Math.max(best, superEntity.charge || 0), 0);
    const ready = supers.some(e => e.charge >= 120);
    const bar = this.root.querySelector('#super-bar');
    const state = this.root.querySelector('#super-state');
    if (world.superEnabled === false) {
      card.hidden = false;
      card.classList.remove('ready', 'charging');
      card.classList.add('disabled');
      state.textContent = '已禁用';
      bar.style.width = '0%';
      button.hidden = true;
      return;
    }
    card.classList.remove('disabled');
    if (!supers.length) {
      card.hidden = true;
      card.classList.remove('ready', 'charging');
      state.textContent = '未建造';
      bar.style.width = '0%';
      button.hidden = true;
      return;
    }
    card.hidden = false;
    card.classList.toggle('ready', ready);
    card.classList.toggle('charging', !ready);
    state.textContent = ready ? '就绪' : `${Math.floor(maxCharge)} ∕ 120 秒`;
    bar.style.width = `${Math.min(100, maxCharge / 120 * 100)}%`;
    button.hidden = !ready;
  }

  updateSelection(world, selection, placement) {
    const entities = selection.map(id => world.entities.get(id)).filter(entity => entity && !entity.dead);
    const panel = this.root.querySelector('#selection');
    const glyph = this.root.querySelector('#unit-glyph');
    const unitActions = this.root.querySelector('#selection-actions');
    const buildingActions = this.root.querySelector('#building-actions');
    const mcvDeploy = this.root.querySelector('#mcv-deploy');
      if (!entities.length) {
      panel.classList.remove('has-selection', 'has-building');
      this.root.querySelector('#unit-type').textContent = placement ? '部署命令' : '未选择';
      this.root.querySelector('#unit-name').textContent = placement ? `放置 ${displayName(placement, world.players[0].faction)}` : '指挥你的部队';
      this.root.querySelector('#unit-sub').textContent = placement ? '左键点击合法地面 · 右键取消' : '选择单位或建筑';
      this.root.querySelector('#unit-status').textContent = placement ? '等待选址' : '待命';
      this.root.querySelector('#hp-bar').style.width = '0%';
      this.root.querySelector('#hp-num').textContent = '—';
      this.root.querySelector('#unit-rank').hidden = true;
      glyph.textContent = '—';
      glyph.classList.remove('has-thumb');
      glyph.style.backgroundImage = '';
      unitActions.hidden = false;
      buildingActions.hidden = true;
      mcvDeploy.hidden = true;
      this.root.querySelectorAll('#selection-actions [data-command="attackMove"], #selection-actions [data-command="stop"], #selection-actions [data-command="hold"]').forEach(b => b.disabled = true);
      return;
    }
    const entity = entities[0];
    const def = entity.def;
    const isBuilding = !!def.building;
    const isMcv = entity.type === 'mcv';
    const groupSelection = entities.length > 1 && entities.every(e => !e.def.building);
    if (groupSelection) {
      const counts = new Map();
      for (const member of entities) counts.set(member.type, (counts.get(member.type) || 0) + 1);
      const summary = [...counts.entries()].map(([type, count]) => `${displayName(type, entity.faction)}${count > 1 ? ` ×${count}` : ''}`).join(' · ');
      panel.classList.add('has-selection');
      panel.classList.remove('has-building');
      this.root.querySelector('#unit-type').textContent = `特遣队 ∕ ${entities.length} 个单位`;
      this.root.querySelector('#unit-name').textContent = '已选择多个单位';
      this.root.querySelector('#unit-sub').textContent = summary;
      const thumb = iconThumb(entity.type, entity.faction);
      glyph.classList.toggle('has-thumb', !!thumb);
      glyph.style.backgroundImage = thumb ? `url("${thumb}")` : '';
      glyph.textContent = thumb ? '' : (ICON_GLYPH[entity.type] || '◆');
      const avg = entities.reduce((sum, member) => sum + member.hp / member.maxHp, 0) / entities.length;
      this.root.querySelector('#hp-bar').style.width = `${Math.max(0, Math.min(100, avg * 100))}%`;
      this.root.querySelector('#hp-num').textContent = `${entities.length} 个单位`;
      this.root.querySelector('#unit-status').textContent = entities.some(e => e.fighting) ? '交战中' : entities.some(e => e.moving) ? '行军中' : '待命';
      this.root.querySelector('#unit-rank').hidden = true;
      unitActions.hidden = false;
      buildingActions.hidden = true;
      mcvDeploy.hidden = !entities.some(e => e.type === 'mcv');
      this.root.querySelectorAll('#selection-actions [data-command="attackMove"], #selection-actions [data-command="stop"], #selection-actions [data-command="hold"]').forEach(button => button.disabled = false);
      return;
    }
    panel.classList.add('has-selection');
    panel.classList.toggle('has-building', isBuilding);
    this.root.querySelector('#unit-type').textContent = isBuilding ? `建筑 ∕ ${factionLabel(entity.faction)}` : isMcv ? '移动指挥车' : `野战单位 ∕ ${factionLabel(entity.faction)}`;
    this.root.querySelector('#unit-name').textContent = displayName(entity.type, entity.faction);
    this.root.querySelector('#unit-sub').textContent = isBuilding ? def.description : `${armorLabel(def.armor)} · ${orderLabel(entity.order)}${entity.cargo ? ` · 载矿 $${Math.floor(entity.cargo)}` : ''}`;
    const thumb = iconThumb(entity.type, entity.faction);
    glyph.classList.toggle('has-thumb', !!thumb);
    glyph.style.backgroundImage = thumb ? `url("${thumb}")` : '';
    glyph.textContent = thumb ? '' : (ICON_GLYPH[entity.type] || '◆');
    const pct = Math.max(0, Math.min(100, entity.hp / entity.maxHp * 100));
    this.root.querySelector('#hp-bar').style.width = `${pct}%`;
    this.root.querySelector('#hp-num').textContent = `${Math.ceil(entity.hp)} ∕ ${entity.maxHp}`;
    this.root.querySelector('#unit-status').textContent = isBuilding
      ? entity.construct ? '建造中' : entity.repair ? '维修中' : '运作中'
      : entity.harvesting ? '采矿中' : entity.moving ? '行军中' : entity.fighting ? '交战中' : orderLabel(entity.order);
    const rank = this.root.querySelector('#unit-rank');
    if (entity.rank > 0) { rank.hidden = false; rank.textContent = entity.rank === 3 ? '精锐 III' : entity.rank === 2 ? '老兵 II' : '老兵 I'; }
    else rank.hidden = true;
    unitActions.hidden = isBuilding;
    buildingActions.hidden = !isBuilding;
    mcvDeploy.hidden = !isMcv;
    const canSuper = isBuilding && entity.type === 'super' && entity.charge >= 120;
    this.root.querySelector('#target-building').hidden = !canSuper;
    this.root.querySelector('#deploy-building').hidden = true;
    this.root.querySelectorAll('#selection-actions [data-command="attackMove"], #selection-actions [data-command="stop"], #selection-actions [data-command="hold"]').forEach(button => button.disabled = false);
    this.root.querySelector('#repair')?.classList?.toggle('active', !!entity.repair);
    // Repair button active state.
    const repair = this.root.querySelector('#building-actions [data-command="repair"]');
    if (repair) repair.classList.toggle('active', !!entity.repair);
  }

  updateIntel(world, selection, placement) {
    const state = this.root.querySelector('#intel-state');
    const copy = this.root.querySelector('#intel-copy');
    if (!state || !copy) return;
    const player = world.players[0];
    const entity = selection.map(id => world.entities.get(id)).find(Boolean);
    if (player.lowPower) {
      state.textContent = '警报';
      state.style.color = 'var(--red)';
      copy.textContent = '电力不足。生产速度与防御射速下降，请尽快建造电厂。';
      return;
    }
    if (selection.length > 1) {
      state.textContent = '特遣队';
      state.style.color = 'var(--cyan)';
      copy.textContent = `${selection.length} 个单位已选中。右键可统一下达命令；轻按 A 再右键可进行攻击移动。`;
      return;
    }
    state.textContent = '实时';
    state.style.color = 'var(--cyan)';
    if (placement) {
      copy.textContent = `部署命令：${displayName(placement, player.faction)}。请在建造范围内选择合法地面。右键取消并退还资金。`;
    } else if (entity) {
      copy.textContent = entity.def.building
        ? `${displayName(entity.type, entity.faction)}：${entity.def.description}`
        : `${displayName(entity.type, entity.faction)}已选中。${entity.def.description} 右键地面移动，右键敌人攻击。`;
    } else {
      const harvesters = world.list(0).filter(e => e.type === 'harvester').length;
      const refineries = world.list(0).filter(e => e.type === 'refinery').length;
      copy.textContent = `采矿车 ${harvesters} ∕ 精炼厂 ${refineries}。保护采矿路线，向敌方建造厂推进。`;
    }
  }

  addFeedLine(text, kind = 'info') {
    const feed = this.root.querySelector('#feed');
    if (!feed) return;
    const line = document.createElement('div');
    line.className = `feed-line ${kind}`;
    const stamp = this.a.getGameTime ? Math.floor(this.a.getGameTime()) : 0;
    line.innerHTML = `<span>${String(Math.floor(stamp / 60)).padStart(2, '0')}:${String(stamp % 60).padStart(2, '0')}</span> ${text}`;
    feed.prepend(line);
    while (feed.children.length > 4) feed.lastElementChild.remove();
  }

  drawMiniMap(world) {
    if (!this.mapCtx) return;
    const ctx = this.mapCtx;
    const width = this.mapCanvas.width;
    const height = this.mapCanvas.height;
    const playerFog = world.fog[0];
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#24362f');
    gradient.addColorStop(.55, '#2f4033');
    gradient.addColorStop(1, '#1c2d2c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(146,202,195,.22)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const z = i / 80 * 160 - 80;
      const x = Math.sin(z * .055) * 6;
      const px = (x + 80) / 160 * width;
      const py = (z + 80) / 160 * height;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Roads
    ctx.strokeStyle = 'rgba(148,120,80,.34)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, height * .7);
    ctx.lineTo(width, height * .3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,176,66,.65)';
    for (const ore of world.map.ore) {
      if (ore.amount > 0) ctx.fillRect((ore.x + 80) / 160 * width - 1, (ore.z + 80) / 160 * height - 1, 2.2, 2.2);
    }
    // Fog from the player's perspective, using the low-res grid for speed.
    const fogData = this.fogImage.data;
    for (let i = 0; i < 6400; i++) {
      const alpha = playerFog.visible[i] ? 0 : playerFog.explored[i] ? 120 : 242;
      fogData[i * 4] = 3;
      fogData[i * 4 + 1] = 8;
      fogData[i * 4 + 2] = 11;
      fogData[i * 4 + 3] = alpha;
    }
    this.fogCtx.putImageData(this.fogImage, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogCanvas, 0, 0, width, height);
    ctx.restore();
    for (const entity of world.list()) {
      const visible = entity.p === 0 || (entity.def.building ? playerFog.explored[world.nav.index(entity.x, entity.z)] : playerFog.visible[world.nav.index(entity.x, entity.z)]);
      if (!visible) continue;
      const x = (entity.x + 80) / 160 * width;
      const y = (entity.z + 80) / 160 * height;
      ctx.fillStyle = entity.p === 0 ? '#73f0e4' : '#f06b53';
      ctx.fillRect(x - (entity.def.building ? 3 : 1.5), y - (entity.def.building ? 3 : 1.5), entity.def.building ? 6 : 3, entity.def.building ? 6 : 3);
    }
    // Camera target locator.
    const target = this.a.getCameraTarget?.();
    if (target) {
      const x = (target.x + 80) / 160 * width;
      const y = (target.z + 80) / 160 * height;
      ctx.strokeStyle = 'rgba(255,223,163,.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 15, y - 11, 30, 22);
    }
    const selectedEntities = this.a.getSelection?.().map(id => world.entities.get(id)).filter(Boolean) || [];
    if (selectedEntities.length) {
      const entity = selectedEntities[0];
      this.root.querySelector('#mini-coord').textContent = `X ${Math.round(entity.x)} ∕ Z ${Math.round(entity.z)}`;
    }
  }

  notice(text, kind = 'info') {
    const stack = this.root.querySelector('#notice-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${kind}`;
    toast.innerHTML = `<i></i><span>${text}</span>`;
    stack.appendChild(toast);
    this.addFeedLine(text, kind);
    while (stack.children.length > 4) stack.firstElementChild.remove();
    setTimeout(() => toast.remove(), 5200);
  }
}
