export class Menu {
  constructor(root, audio) { this.root = root; this.audio = audio; }
  modal(title, body, buttons = []) {
    const el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.innerHTML = `<section class="modal"><button class="close" aria-label="关闭">×</button><div class="eyebrow">战地指挥</div><h2>${title}</h2>${body}${buttons.length ? `<div class="stack">${buttons.map((b, i) => `<button data-choice="${i}" class="${b.primary ? 'primary' : ''}">${b.label}</button>`).join('')}</div>` : ''}</section>`;
    el.querySelector('.close').onclick = () => el.remove();
    el.querySelectorAll('[data-close]').forEach(b => b.onclick = () => el.remove());
    el.onclick = e => { if (e.target === el) el.remove(); };
    buttons.forEach((b, i) => el.querySelector(`[data-choice="${i}"]`).onclick = () => { el.remove(); b.action?.(); });
    this.root.append(el);
    return el;
  }
  settings() {
    const el = this.modal('系统设置', `
      <label class="setting">音乐音量<input data-audio="music" type="range" min="0" max="0.35" step="0.01" value="0.17"></label>
      <label class="setting">战斗音效<input data-audio="sfx" type="range" min="0" max="1" step="0.05" value="0.55"></label>
      <label class="setting">无线电语音<input data-audio="voice" type="checkbox" checked></label>
      <label class="setting">边缘滚屏<input data-setting="edge" type="checkbox" checked></label>
      <div class="note">音乐、音效与战场环境声均由本机实时合成，首次点击后启动。全部画面为实时 3D 渲染。</div>`);
    el.querySelector('[data-audio=music]').oninput = e => this.audio.setMusic(e.target.value);
    el.querySelector('[data-audio=sfx]').oninput = e => this.audio.setSfx(e.target.value);
    el.querySelector('[data-audio=voice]').onchange = e => this.audio.setVoice(e.target.checked);
    return el;
  }
  help() {
    return this.modal('作战手册', `<div class="note">
      <b>指挥</b><br>
      <span style="color:#e2eee5">鼠标左键</span>选择 · 拖拽框选 · <span style="color:#e2eee5">Shift</span> 追加/移除 · 双击选择同类单位<br>
      <span style="color:#e2eee5">鼠标右键</span>移动/攻击 · 轻按 <span style="color:#e2eee5">A</span> 再右键为攻击移动<br>
      <span style="color:#e2eee5">H</span> 坚守 · <span style="color:#e2eee5">S</span> 停止 · <span style="color:#e2eee5">Delete</span> 出售选中的建筑<br>
      <span style="color:#e2eee5">1–9</span> 选择编队 · <span style="color:#e2eee5">Ctrl+1–9</span> 设置编队<br><br>
      <b>镜头</b><br>
      按住 <span style="color:#e2eee5">WASD</span> 或鼠标贴边平移 · 滚轮缩放 · 中键拖动平移 · <span style="color:#e2eee5">Alt+中键拖动</span> 旋转 · 长按 <span style="color:#e2eee5">Q/E</span> 旋转战场<br><br>
      <b>建造</b><br>
      短按 <span style="color:#e2eee5">Q/W/E/R</span> 切换生产页签 · <span style="color:#e2eee5">1–9</span> 快速选择蓝图 · 在基地周围放置建筑 · <span style="color:#e2eee5">Esc</span> 取消放置并按已支付金额退款<br><br>
      <b>经济与胜利条件</b><br>
      采矿车会自动采矿并返回精炼厂。让电力供应始终高于需求。摧毁敌军建造厂与全部基地车即可获胜。
    </div><button class="primary small" data-close>明白了</button>`);
  }
  pause(resume, quit) {
    return this.modal('战斗暂停', `<div class="note">战场模拟已暂停，你的部队正在等待命令。</div>`, [
      { label: '恢复作战', primary: true, action: resume },
      { label: '放弃本次遭遇战', action: quit }
    ]);
  }
  result(state, restart, menu) {
    const victory = state.status === 'victory';
    const stats = state.stats || {};
    return this.modal(victory ? '行动完成' : '指挥失效', `<div class="eyebrow">${victory ? '地平线属于我们' : '战场已经沦陷'}</div><div class="note">${victory ? '敌方指挥体系已被摧毁。' : '你的建造厂与全部移动指挥车均已被毁。'}</div><div class="stat-grid"><div><small>击毁数</small><strong>${stats.kills || 0}</strong></div><div><small>损失数</small><strong>${stats.losses || 0}</strong></div><div><small>已处理矿石</small><strong>$${Math.floor(stats.harvested || 0).toLocaleString()}</strong></div><div><small>战斗时长</small><strong>${Math.floor(state.time / 60).toString().padStart(2, '0')}:${Math.floor(state.time % 60).toString().padStart(2, '0')}</strong></div></div>`, [
      { label: '再次部署', primary: true, action: restart },
      { label: '返回主菜单', action: menu }
    ]);
  }
}
