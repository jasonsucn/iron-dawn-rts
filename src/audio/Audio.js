// Fully procedural WebAudio score and battlefield SFX. No external samples.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.voice = true;
    this.enabled = true;
    this.started = false;
    this.musicTimer = null;
    this.nodes = [];
    this.musicStep = 0;
    this.nextNote = 0;
    this.intense = false;
    this.ambient = null;
  }

  start() {
    if (this.started) {
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = .56;
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = .16;
      this.sfxGain.gain.value = .5;
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      compressor.attack.value = .006;
      compressor.release.value = .22;
      this.musicGain.connect(compressor);
      this.sfxGain.connect(compressor);
      compressor.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.started = true;
      this.ctx.resume().catch(() => {});
      this.ambience();
      this.music();
    } catch {
      this.enabled = false;
    }
  }

  ambience() {
    if (!this.ctx) return;
    const seconds = 5;
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, rate * seconds, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + .012 * white) / 1.012;
      data[i] = last * 2.8;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 460;
    const gain = this.ctx.createGain();
    gain.gain.value = .027;
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.start();
    this.ambient = source;
  }

  scheduleTone(freq, duration = .2, wave = 'sine', volume = .15, when = 0, dest = 'sfx', target = null, glide = null) {
    if (!this.ctx || !this.enabled) return;
    const t = when || this.ctx.currentTime + Math.max(0, when === 0 ? 0 : 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (target) osc.frequency.exponentialRampToValueAtTime(Math.max(20, target), t + duration);
    osc.detune.value = (Math.random() - .5) * 5;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume), t + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain);
    gain.connect(dest === 'music' ? this.musicGain : this.sfxGain);
    osc.start(t); osc.stop(t + duration + .03);
    osc.onended = () => {
      const i = this.nodes.indexOf(osc);
      if (i >= 0) this.nodes.splice(i, 1);
    };
    this.nodes.push(osc);
  }

  tone(freq, duration = .2, wave = 'sine', volume = .2, at = 0, into = 'sfx', slide = 0) {
    const when = this.ctx ? this.ctx.currentTime + at : 0;
    this.scheduleTone(freq, duration, wave, volume, when, into, slide ? freq * slide : null);
  }

  noise(duration = .2, volume = .15, filterFreq = 850, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = when || this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    gain.gain.value = volume;
    src.buffer = buffer;
    src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
    src.start(t); src.stop(t + duration);
  }

  kick(when) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + .17);
    gain.gain.setValueAtTime(.15, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .28);
    osc.connect(gain); gain.connect(this.musicGain);
    osc.start(when); osc.stop(when + .3);
    osc.onended = () => { const i = this.nodes.indexOf(osc); if (i >= 0) this.nodes.splice(i, 1); };
    this.nodes.push(osc);
  }

  snare(when) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * .16);
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * .18));
    const src = this.ctx.createBufferSource();
    const high = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    high.type = 'highpass'; high.frequency.value = 1000;
    gain.gain.value = .055;
    src.buffer = buffer; src.connect(high); high.connect(gain); gain.connect(this.musicGain);
    src.start(when); src.stop(when + .17);
  }

  hat(when) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * .045);
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * .28));
    const src = this.ctx.createBufferSource();
    const high = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    high.type = 'highpass'; high.frequency.value = 5200;
    gain.gain.value = .025;
    src.buffer = buffer; src.connect(high); high.connect(gain); gain.connect(this.musicGain);
    src.start(when); src.stop(when + .05);
  }

  music() {
    if (!this.ctx || this.musicTimer) return;
    const bpm = this.intense ? 124 : 112;
    const stepTime = 60 / bpm / 4;
    const roots = [55, 55, 65.41, 73.42, 55, 82.41, 65.41, 73.42];
    const bassPattern = [0, null, 0, 12, null, 0, 7, null, 0, null, 3, null, 7, 10, null, 0];
    const lead = [0, null, 3, null, 5, null, 7, 3, 0, null, 10, null, 7, 5, null, 3];
    this.nextNote = this.ctx.currentTime + .12;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (this.nextNote < this.ctx.currentTime - .5) this.nextNote = this.ctx.currentTime + .1;
      while (this.nextNote < this.ctx.currentTime + .32) {
        const step = this.musicStep % 32;
        const bar = Math.floor(this.musicStep / 32) % roots.length;
        const root = roots[bar];
        if (step % 8 === 0) this.kick(this.nextNote);
        if (step === 3 || step === 11 || step === 19 || step === 27) this.kick(this.nextNote);
        if (step === 4 || step === 12 || step === 20 || step === 28) this.snare(this.nextNote);
        if (step % 2 === 0) this.hat(this.nextNote);
        const note = bassPattern[step % 16];
        if (note !== null) this.scheduleTone(root * Math.pow(2, note / 12), stepTime * 1.8, 'sawtooth', .035, this.nextNote, 'music', root * Math.pow(2, note / 12));
        if (this.intense && step % 4 === 0) {
          const chord = [root * 2, root * 2 * Math.pow(2, 3 / 12), root * 2 * Math.pow(2, 7 / 12)];
          chord.forEach(freq => this.scheduleTone(freq, stepTime * 3.4, 'triangle', .009, this.nextNote, 'music'));
        }
        if (step >= 16 && this.intense) {
          const n = lead[step - 16];
          if (n !== null) this.scheduleTone(root * 4 * Math.pow(2, n / 12), stepTime * 1.15, 'square', .012, this.nextNote, 'music', root * 4 * Math.pow(2, n / 12));
        }
        this.nextNote += stepTime;
        this.musicStep++;
      }
    }, 110);
  }

  setIntense(value) {
    this.intense = !!value;
    // Existing scheduler reads the flag every step; no restart needed.
  }

  speak(text) {
    if (!this.voice || !window.speechSynthesis || !this.started) return;
    const zhLines = ['建造完成', '单位已就绪', '电力不足', '我方基地遭到攻击', '超级武器已就绪', '极光打击', '核弹发射'];
    const enLines = ['Construction complete', 'Unit ready', 'Low power', 'Our base is under attack', 'Superweapon ready'];
    const isZh = zhLines.some(x => text?.includes(x));
    if (!isZh && !enLines.some(x => text?.includes(x))) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(isZh ? text.replace(/[—·].*$/, '').trim() : text);
      u.volume = .42;
      u.rate = isZh ? .92 : .88;
      u.pitch = isZh ? .88 : .72;
      u.lang = isZh ? 'zh-CN' : 'en-US';
      speechSynthesis.speak(u);
    } catch {}
  }

  event(type, d = {}) {
    if (!this.started || !this.enabled) return;
    switch (type) {
      case 'order': this.tone(610, .065, 'square', .038, 0, 'sfx', 1.3); break;
      case 'queue': this.tone(360, .1, 'triangle', .035); this.tone(580, .16, 'sine', .03, .08); break;
      case 'spawn': if (d.entity?.p === 0) { this.tone(500, .2, 'triangle', .035); this.tone(780, .25, 'sine', .025, .1); } break;
      case 'fire':
        if (d.kind === 'rocket') { this.noise(.22, .15, 540); this.tone(96, .28, 'sawtooth', .065, .0, 'sfx', .48); }
        else if (d.kind === 'piercing') { this.noise(.18, .12, 620); this.tone(86, .22, 'sawtooth', .055, 0, 'sfx', .5); }
        else if (d.kind === 'energy') { this.tone(1100, .15, 'sine', .028, 0, 'sfx', .5); }
        else if (d.p === 0 || Math.random() < .55) this.noise(.06, .055, 1600);
        break;
      case 'impact': this.noise(d.kind === 'bullet' ? .06 : .28, d.kind === 'bullet' ? .07 : .15, d.kind === 'bullet' ? 1700 : 420); if (d.kind !== 'bullet') this.tone(70, .25, 'sine', .085, 0, 'sfx', .4); break;
      case 'death':
        if (d.p === 0 || Math.random() < .65) { this.noise(.42, .18, 300); this.tone(58, .38, 'sawtooth', .09, 0, 'sfx', .4); }
        break;
      case 'income': if (d.p === 0) this.tone(880, .1, 'sine', .02, 0, 'sfx', 1.14); break;
      case 'notice':
        if (d.kind === 'power' || d.kind === 'attack' || d.kind === 'warning') { this.tone(390, .16, 'square', .06); this.tone(270, .22, 'square', .045, .17); }
        this.speak(d.text);
        break;
      case 'supernova':
        this.noise(1.5, .25, 180);
        this.tone(49, 1.8, 'sawtooth', .16, 0, 'sfx', .26);
        this.tone(73, 1.2, 'triangle', .06, .1, 'sfx', .7);
        break;
      case 'wave': this.tone(178, .3, 'triangle', .075); this.tone(267, .4, 'triangle', .055, .16); break;
      case 'end': this.tone(d.status === 'victory' ? 523 : 145, 1.05, 'triangle', .1, 0, 'sfx', d.status === 'victory' ? 1.6 : .55); break;
    }
  }

  setMusic(v) { if (this.musicGain) this.musicGain.gain.value = Number(v); }
  setSfx(v) { if (this.sfxGain) this.sfxGain.gain.value = Number(v); }
  setVoice(v) { this.voice = !!v; if (!v && window.speechSynthesis) speechSynthesis.cancel(); }

  dispose() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    try { this.ambient?.stop(); } catch {}
    for (const n of this.nodes) try { n.stop(); } catch {}
    this.nodes.length = 0;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.started = false;
  }
}
