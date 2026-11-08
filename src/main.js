import * as THREE from 'three';
import { Game } from './core/Game.js';
import { DEFS, CATALOG, FACTIONS, DIFFICULTIES, displayName, clamp } from './data/definitions.js';
import { terrainHeight } from './core/Map.js';
import { createScene } from './render/Scene.js';
import { makeModel, animateModel } from './render/Models.js';
import { Effects } from './render/Effects.js';
import { HUD } from './ui/HUD.js';
import { Input } from './ui/Input.js';
import { Menu } from './ui/Menu.js';
import { AudioEngine } from './audio/Audio.js';

const canvas = document.querySelector('#battlefield');
const ui = document.querySelector('#interface');
const loading = document.querySelector('#loading');
const errorOverlay = document.querySelector('#error-overlay');
const errorDetail = document.querySelector('#error-detail');
const labels = document.querySelector('#world-labels');
const view = createScene(canvas);
const effects = new Effects(view.scene);
const audio = new AudioEngine();
const menus = new Menu(ui, audio);
const scene = view.scene;
const camera = view.camera;

let world = null;
let hud = null;
let input = null;
let mode = 'menu';
let paused = false;
let selected = new Set();
let nodes = new Map();
let rings = new Map();
let labelNodes = new Map();
let menuGroup = null;
let menuUnits = [];
let menuFlags = [];
let menuParticles = null;
const iconAtlas = new Map();
window.__IRON_ICONS__ = {};
let placementType = null;
let ghost = null;
let superTargeting = false;
let superReticle = null;
let rallyMarker = null;
let rallyBuildingId = null;
let orderMode = 'move';
let edgeScroll = localStorage.getItem('iron-edge') !== '0';
let faction = 'allied';
let difficulty = 'recruit';
let accumulator = 0;
let last = performance.now();
let fps = 60;
let frames = 0;
let fpsAt = performance.now();
let hudAt = 0;
let fogAt = 0;
let elapsed = 0;
let shake = 0;
let flashTimer = 0;
let worldReady = false;
let gameStartedAt = 0;
let qualityChecked = false;
let collapsing = [];
let scorches = [];
let lastAlertAt = 0;
let cameraTarget = new THREE.Vector3(-44, 0, 34);
let cameraZoom = 1.05;
let cameraYaw = -0.78;
let cameraIntro = 0;
let menuAngle = -0.55;
const cameraGoal = new THREE.Vector3();
const projectVector = new THREE.Vector3();
const tempColor = new THREE.Color();
const hostileColor = new THREE.Color('#ff7056');
const friendlyColor = new THREE.Color('#7ef0dc');
const validColor = new THREE.Color('#67ffad');
const invalidColor = new THREE.Color('#ff5749');
const reticleColor = new THREE.Color('#ff8a58');
const fog = createFog();
view.setFogTexture(fog.texture);
const flash = document.createElement('div');
flash.id = 'super-flash';
document.body.appendChild(flash);

function fatal(error) {
  console.error(error);
  if (errorDetail) errorDetail.textContent = error?.stack || String(error);
  if (errorOverlay) errorOverlay.hidden = false;
  if (loading) loading.hidden = true;
}
window.addEventListener('error', e => fatal(e.error || e.message));
window.addEventListener('unhandledrejection', e => fatal(e.reason));

function createFog() {
  const fogCanvas = document.createElement('canvas');
  fogCanvas.width = 160; fogCanvas.height = 160;
  const ctx = fogCanvas.getContext('2d');
  const texture = new THREE.CanvasTexture(fogCanvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = false;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .3, depthWrite: false, depthTest: true })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 1.25;
  mesh.renderOrder = 8;
  mesh.visible = false;
  return { mesh, canvas: fogCanvas, ctx, texture };
}

function drawFog() {
  if (!world || !fog.mesh.visible) return;
  const ctx = fog.ctx;
  const data = ctx.createImageData(160, 160);
  const px = data.data;
  const visible = world.fog[0].visible;
  const explored = world.fog[0].explored;
  for (let y = 0; y < 160; y++) {
    const gz = Math.min(79, Math.floor(y / 2));
    for (let x = 0; x < 160; x++) {
      const gx = Math.min(79, Math.floor(x / 2));
      const at = gz * 80 + gx;
      const i = (y * 160 + x) * 4;
      if (visible[at]) {
        px[i + 3] = 0;
      } else if (explored[at]) {
        px[i] = 3; px[i + 1] = 9; px[i + 2] = 12; px[i + 3] = 128;
      } else {
        px[i] = 2; px[i + 1] = 6; px[i + 2] = 9; px[i + 3] = 245;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  fog.texture.needsUpdate = true;
}

function makeFlag(color, scale = 1) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035 * scale, .055 * scale, 3.2 * scale, 6), new THREE.MeshStandardMaterial({ color: '#89928b', metalness: .8, roughness: .32 }));
  pole.position.y = 1.6 * scale; group.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.25 * scale, .68 * scale, 6, 2), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .08, side: THREE.DoubleSide, roughness: .8 }));
  cloth.position.set(.65 * scale, 2.9 * scale, 0); cloth.castShadow = true; group.add(cloth);
  group.userData.cloth = cloth;
  return group;
}

function makeMenuDiorama() {
  menuGroup = new THREE.Group();
  menuGroup.name = 'menu-diorama';
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.8, .32, 36), new THREE.MeshStandardMaterial({ color: '#4d4f44', roughness: .96, metalness: .04 }));
  stage.position.y = .4; stage.receiveShadow = true; menuGroup.add(stage);
  const stageTop = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.2, .18, 36), new THREE.MeshStandardMaterial({ color: '#69664f', roughness: .92 }));
  stageTop.position.y = .59; stageTop.receiveShadow = true; menuGroup.add(stageTop);
  for (let i = 0; i < 18; i++) {
    const sand = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .5, 2, 5), new THREE.MeshStandardMaterial({ color: i % 2 ? '#7a7052' : '#918160', roughness: 1 }));
    const angle = i / 18 * Math.PI * 2;
    sand.position.set(Math.cos(angle) * 7.7, .78, Math.sin(angle) * 7.7);
    sand.rotation.z = Math.PI / 2; sand.rotation.y = -angle; sand.castShadow = true; menuGroup.add(sand);
  }
  const tankA = makeModel('tank', 'allied');
  tankA.position.set(-2.4, .69, 1.4); tankA.rotation.y = .62; menuGroup.add(tankA);
  const tankB = makeModel('tank', 'soviet');
  tankB.position.set(3.1, .69, -.9); tankB.rotation.y = -.65; menuGroup.add(tankB);
  const advanced = makeModel('advanced', 'allied');
  advanced.position.set(1.1, .69, 3.4); advanced.rotation.y = .1; menuGroup.add(advanced);
  const harvester = makeModel('harvester', 'soviet');
  harvester.position.set(-4.8, .69, -3.2); harvester.rotation.y = -.9; menuGroup.add(harvester);
  for (let i = 0; i < 3; i++) {
    const infantry = makeModel(i === 2 ? 'rocket' : 'rifle', i % 2 ? 'soviet' : 'allied');
    infantry.position.set(-1.2 + i * 1.35, .71, -3.8 - (i % 2) * .8);
    infantry.rotation.y = 1.2 + i * .55; menuGroup.add(infantry);
  }
  menuUnits = [tankA, tankB, advanced, harvester];
  const flagA = makeFlag('#58d7ed', 1.1); flagA.position.set(5.9, .7, 4.2); menuGroup.add(flagA); menuFlags.push(flagA);
  const flagB = makeFlag('#f16a51', .9); flagB.position.set(-6.2, .7, 3.7); menuGroup.add(flagB); menuFlags.push(flagB);
  const crateMat = new THREE.MeshStandardMaterial({ color: '#6d6045', roughness: .85 });
  for (let i = 0; i < 4; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(.85, .7, .85), crateMat);
    crate.position.set(4.6 + (i % 2) * .9, .95, -4.6 + Math.floor(i / 2) * .9);
    crate.rotation.y = (i * .4) % 1; crate.castShadow = true; menuGroup.add(crate);
  }
  // Dust lit by the low sun, adds depth to the live menu backdrop.
  const dustGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(110 * 3);
  for (let i = 0; i < 110; i++) {
    positions[i * 3] = (Math.random() - .5) * 30;
    positions[i * 3 + 1] = .9 + Math.random() * 7;
    positions[i * 3 + 2] = (Math.random() - .5) * 30;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#ffdb9e', size: .055, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending });
  menuParticles = new THREE.Points(dustGeo, dustMat); menuGroup.add(menuParticles);
  const baseY = terrainHeight(-44, 40) + .01;
  menuGroup.position.set(-44, baseY, 40);
  scene.add(menuGroup);
}

function buildThumbnails(factionName) {
  if (iconAtlas.has(factionName)) return;
  try {
    const size = 192;
    const iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'default' });
    iconRenderer.setPixelRatio(1);
    iconRenderer.setSize(size, size);
    iconRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    iconRenderer.toneMappingExposure = 1.28;
    iconRenderer.outputColorSpace = THREE.SRGBColorSpace;
    iconRenderer.setClearColor(0x000000, 0);
    const iconScene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight('#d3eef1', '#48392a', 2.2);
    iconScene.add(hemi);
    const keyLight = new THREE.DirectionalLight('#ffd39d', 3.6);
    keyLight.position.set(8, 12, 10);
    iconScene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(factionName === 'allied' ? '#6fe7ff' : '#ff7b56', 2.1);
    rimLight.position.set(-8, 5, -10);
    iconScene.add(rimLight);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 120);
    const types = Object.keys(DEFS);
    const teamColor = factionName === 'allied' ? '#63e8ef' : '#ff7656';
    for (const type of types) {
      const model = makeModel(type, factionName);
      iconScene.add(model);
      const bounds = new THREE.Box3().setFromObject(model);
      const dims = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const extent = Math.max(dims.x, dims.y, dims.z, .8);
      const view = extent * 1.18;
      cam.left = -view; cam.right = view; cam.top = view; cam.bottom = -view;
      cam.near = .1; cam.far = extent * 14 + 10;
      cam.updateProjectionMatrix();
      const dist = extent * 3.2 + 2;
      cam.position.set(Math.cos(.72) * dist, center.y + dist * .55, Math.sin(.72) * dist);
      cam.lookAt(0, center.y * .94, 0);
      // Studio plinth helps tiny silhouettes read immediately.
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.max(dims.x, dims.z) * .55, Math.max(dims.x, dims.z) * .58, .1, 24),
        new THREE.MeshStandardMaterial({ color: '#1a2729', roughness: .7, metalness: .35 })
      );
      plinth.position.y = .04; iconScene.add(plinth);
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(dims.x, dims.z) * .58, Math.max(dims.x, dims.z) * .64, 36),
        new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: .8, side: THREE.DoubleSide })
      );
      halo.rotation.x = -Math.PI / 2; halo.position.y = .105; iconScene.add(halo);
      iconRenderer.render(iconScene, cam);
      const output = document.createElement('canvas');
      output.width = output.height = size;
      const ctx = output.getContext('2d');
      const gradient = ctx.createRadialGradient(size / 2, size * .52, 8, size / 2, size / 2, size * .7);
      gradient.addColorStop(0, factionName === 'allied' ? '#12333b' : '#3a1f1b');
      gradient.addColorStop(.58, '#101f22');
      gradient.addColorStop(1, '#081113');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = factionName === 'allied' ? 'rgba(100,230,237,.32)' : 'rgba(255,118,86,.32)';
      ctx.lineWidth = 1; ctx.strokeRect(7.5, 7.5, size - 15, size - 15);
      ctx.drawImage(iconRenderer.domElement, 0, 0);
      ctx.globalAlpha = .09;
      for (let y = 0; y < size; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(0, y, size, 1);
      }
      ctx.globalAlpha = 1;
      const url = output.toDataURL('image/png');
      iconAtlas.set(`${factionName}:${type}`, url);
      window.__IRON_ICONS__[`${factionName}:${type}`] = url;
      iconScene.remove(model, plinth, halo);
    }
    iconRenderer.forceContextLoss();
    iconRenderer.dispose();
  } catch (error) {
    console.warn('3D thumbnail generation unavailable', error);
  }
}


function menuHTML() {
  return `<section class="menu-shell">
    <header class="menu-top"><span class="brand-mini">战术指挥系统</span><span><i class="live-dot"></i>本地指挥链路在线 <b class="menu-clock">07:42:19</b></span></header>
    <div class="menu-content">
      <div class="menu-kicker"><span class="eyebrow">原创即时战略</span><span class="menu-build">版本 07.11</span></div>
      <h1 class="menu-title">IRON<span>DAWN</span></h1>
      <div class="menu-subtitle">钢 铁 黎 明 <span>∕</span> 遭遇战指挥</div>
      <p class="menu-description">最后的余晖不属于任何人。<br>建立你的战争机器，夺取地平线。</p>
      <div class="field-label">01 ∕ 选择你的阵营</div>
      <div class="faction-options">
        <button class="faction-card active" data-faction="allied" aria-pressed="true"><span class="sigil">◇</span><strong>盟军先锋</strong><small>同盟国远征军</small><em>精准 · 机动 · 极光打击</em></button>
        <button class="faction-card" data-faction="soviet" aria-pressed="false"><span class="sigil">△</span><strong>苏军指挥部</strong><small>苏维埃装甲集群</small><em>钢铁 · 重装 · 核武威慑</em></button>
      </div>
      <div class="field-label">02 ∕ 选择威胁等级</div>
      <div class="difficulty-options">
        <button class="active" data-level="recruit" aria-pressed="true">新兵<small>低强度</small></button>
        <button data-level="veteran" aria-pressed="false">老兵<small>标准</small></button>
        <button data-level="iron" aria-pressed="false">铁幕<small>高强度</small></button>
      </div>
      <button class="primary launch-button" data-action="start">开始遭遇战 <span>→</span></button>
      <div class="menu-links"><button data-action="manual">作战手册</button><button data-action="settings">音频 / 设置</button></div>
    </div>
    <footer class="menu-footer"><span>遭遇战协议 ∕ 单人模式</span><span>程序化战场 · 无外部素材</span></footer>
    <div class="diorama-caption"><div class="rule"></div><strong>边疆属于你</strong><small>程序化战场 07</small></div>
  </section>`;
}

function showMenu() {
  cleanupGame();
  audio.setIntense(false);
  mode = 'menu';
  paused = false;
  document.body.classList.add('menu-active');
  placementType = null;
  superTargeting = false;
  orderMode = 'move';
  ui.innerHTML = menuHTML();
  ui.classList.add('menu-mode');
  if (!menuGroup) makeMenuDiorama();
  menuGroup.visible = true;
  fog.mesh.visible = false;
  view.setFogEnabled(false);
  labels.innerHTML = '';
  camera.fov = 36;
  camera.updateProjectionMatrix();
  cameraTarget.set(-44, 0, 40);
  ui.querySelectorAll('[data-faction]').forEach(button => {
    const on = button.dataset.faction === faction;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
    button.onclick = () => {
      faction = button.dataset.faction;
      ui.querySelectorAll('[data-faction]').forEach(other => {
        const selectedNow = other === button;
        other.classList.toggle('active', selectedNow);
        other.setAttribute('aria-pressed', String(selectedNow));
      });
    };
  });
  ui.querySelectorAll('[data-level]').forEach(button => {
    const on = button.dataset.level === difficulty;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
    button.onclick = () => {
      difficulty = button.dataset.level;
      ui.querySelectorAll('[data-level]').forEach(other => {
        const selectedNow = other === button;
        other.classList.toggle('active', selectedNow);
        other.setAttribute('aria-pressed', String(selectedNow));
      });
    };
  });
  ui.querySelector('[data-action=start]').onclick = () => { audio.start(); startGame(); };
  ui.querySelector('[data-action=manual]').onclick = () => menus.help();
  ui.querySelector('[data-action=settings]').onclick = () => wirePreferences(menus.settings());
  loading.hidden = true;
  last = performance.now();
}

function wirePreferences(modal) {
  if (!modal) return;
  const pref = modal.querySelector('[data-setting=edge]');
  if (pref) {
    pref.checked = edgeScroll;
    pref.onchange = () => {
      edgeScroll = !!pref.checked;
      localStorage.setItem('iron-edge', edgeScroll ? '1' : '0');
      if (input) input.edge = edgeScroll;
    };
  }
  return modal;
}

function cleanupGame() {
  if (input) { try { input.dispose(); } catch {} input = null; }
  for (const node of nodes.values()) { scene.remove(node); }
  for (const ring of rings.values()) { scene.remove(ring); }
  for (const ruin of collapsing) { scene.remove(ruin.node); }
  collapsing = [];
  for (const scorch of scorches) { scene.remove(scorch.mesh); scorch.mesh.geometry.dispose(); scorch.material.dispose(); }
  scorches = [];
  nodes.clear(); rings.clear();
  if (labels) labels.innerHTML = '';
  labelNodes.clear();
  selected.clear();
  if (world) { try { world.dispose(); } catch {} world = null; }
  effects.clear();
  disposeGhost();
  hideTargetReticle();
  hideRallyMarker();
  hud = null;
  worldReady = false;
  fog.mesh.visible = false;
  view.setFogEnabled(false);
  ui.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
}

function makeHealthElement(entity) {
  if (!labels) return;
  const el = document.createElement('div');
  el.className = 'world-health' + (entity.p === 0 ? '' : ' enemy');
  el.innerHTML = '<span></span><i><b></b></i>';
  labels.appendChild(el);
  labelNodes.set(entity.id, el);
}

function materialize(entity) {
  if (!world || nodes.has(entity.id)) return;
  const node = makeModel(entity.type, entity.faction);
  const y = terrainHeight(entity.x, entity.z);
  node.position.set(entity.x, y, entity.z);
  if (!entity.def.building) node.rotation.y = entity.angle;
  node.userData.entityId = entity.id;
  node.userData.constructStart = entity.construct ? performance.now() : 0;
  node.traverse(child => { child.userData.entityId = entity.id; });
  scene.add(node);
  nodes.set(entity.id, node);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(entity.def.radius * .9, entity.def.radius * 1.08, 42),
    new THREE.MeshBasicMaterial({ color: entity.p ? '#ff725c' : '#90fff2', transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(entity.x, y + .32, entity.z);
  ring.visible = false;
  ring.renderOrder = 20;
  scene.add(ring);
  rings.set(entity.id, ring);
  makeHealthElement(entity);
}

function removeVisual(id) {
  const node = nodes.get(id);
  if (node) { scene.remove(node); nodes.delete(id); }
  const ring = rings.get(id);
  if (ring) { scene.remove(ring); rings.delete(id); }
  const label = labelNodes.get(id);
  if (label) { label.remove(); labelNodes.delete(id); }
  selected.delete(id);
}

function handleEvent(type, data = {}) {
  if (type === 'spawn') {
    if (worldReady) materialize(data.entity);
  }
  if (type === 'death' || type === 'sold') {
    const node = nodes.get(data.id);
    if (type === 'death' && data.building && node) {
      nodes.delete(data.id);
      const ring = rings.get(data.id);
      if (ring) { scene.remove(ring); rings.delete(data.id); }
      const label = labelNodes.get(data.id);
      if (label) { label.remove(); labelNodes.delete(data.id); }
      selected.delete(data.id);
      collapsing.push({ node, at: performance.now(), duration: 2600, nextSmoke: 0, x: data.x, z: data.z });
      addScorch(data.x, data.z, 4.5);
    } else {
      removeVisual(data.id);
      if (type === 'death') addScorch(data.x, data.z, data.building ? 3.5 : .9);
      if (type === 'sold' && data.x !== undefined) addScorch(data.x, data.z, 1.1);
    }
  }
  audio.event(type, data);
  try { effects.event(type, data); } catch {}
  if (type === 'notice') {
    if (hud) hud.notice(data.text, data.kind);
  }
  if (type === 'queue' || type === 'cancel') {
    // The next HUD refresh shows the queue state.
  }
  if (type === 'strikeWarning') {
    shake = Math.max(shake, .5);
  }
  if (type === 'supernova') {
    triggerFlash(data.faction === 'soviet' ? '#ffd4b0' : '#c8fbff', .95);
    shake = 1.8;
    addScorch(data.x, data.z, 8);
  }
  if (type === 'death' && data.building) shake = Math.max(shake, .32);
  if (type === 'wave') {
    if (hud) hud.notice(`敌军第 ${data.wave} 波进攻 · ${data.size} 个单位`, 'attack');
    triggerFlash('#ff5b4114', .22);
  }
  if (type === 'end') {
    if (hud) hud.notice(data.status === 'victory' ? '敌方指挥体系已被摧毁' : '指挥链路中断', data.status === 'victory' ? 'super' : 'warning');
    showResult(data);
  }
}

function addScorch(x, z, size) {
  const material = new THREE.MeshBasicMaterial({ color: '#0d0c09', transparent: true, opacity: .45, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(size, 12), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, terrainHeight(x, z) + .035, z);
  mesh.renderOrder = 2;
  scene.add(mesh);
  scorches.push({ mesh, material, born: performance.now() });
}

function updateScorches(now) {
  for (let i = scorches.length - 1; i >= 0; i--) {
    const scorch = scorches[i];
    const age = (now - scorch.born) / 1000;
    if (age > 70) {
      scene.remove(scorch.mesh);
      scorch.mesh.geometry.dispose();
      scorch.material.dispose();
      scorches.splice(i, 1);
    } else {
      scorch.material.opacity = .45 * Math.min(1, (70 - age) / 8);
    }
  }
}

function triggerFlash(color, amount) {
  flash.style.background = color;
  flash.style.opacity = String(Math.min(.85, amount));
  flashTimer = .5 + amount * .55;
}

function createReticle() {
  if (superReticle) return;
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(23.8, 25, 64), new THREE.MeshBasicMaterial({ color: reticleColor, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; group.add(ring);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1.25, 20), new THREE.MeshBasicMaterial({ color: '#ffb073', transparent: true, opacity: .85, depthWrite: false }));
  inner.rotation.x = -Math.PI / 2; group.add(inner);
  group.position.y = 1.35; group.visible = false; group.renderOrder = 7; scene.add(group);
  superReticle = group;
}
function showTargetReticle(p) {
  createReticle(); superReticle.visible = true; superReticle.position.set(p.x, terrainHeight(p.x, p.z) + 1.35, p.z);
}
function hideTargetReticle() { if (superReticle) superReticle.visible = false; }

function createRallyMarker() {
  if (rallyMarker) return;
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 24), new THREE.MeshBasicMaterial({ color: '#f2c57d', transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; group.add(ring);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1.6, 5), new THREE.MeshStandardMaterial({ color: '#c4b58e' }));
  pole.position.y = .8; group.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.62, .38), new THREE.MeshBasicMaterial({ color: '#f2c57d', side: THREE.DoubleSide }));
  flag.position.set(.32, 1.35, 0); group.add(flag);
  group.visible = false; scene.add(group); rallyMarker = group;
}
function setRally(entity, p) {
  if (!entity || entity.p !== 0 || !['barracks', 'factory', 'refinery'].includes(entity.type)) return false;
  entity.rally = { x: clamp(p.x, -74, 74), z: clamp(p.z, -74, 74) };
  rallyBuildingId = entity.id;
  createRallyMarker();
  rallyMarker.visible = true;
  rallyMarker.position.set(p.x, terrainHeight(p.x, p.z) + .06, p.z);
  effectsRing(p.x, p.z, '#ecc27e', .5);
  if (hud) hud.notice('集结点已更新', 'build');
  return true;
}
function hideRallyMarker() { if (rallyMarker) rallyMarker.visible = false; rallyBuildingId = null; }

function effectsRing(x, z, color, ttl = .5) {
  const ring = effects.take('ring', color);
  ring.position.set(x, .5, z);
  ring.scale.setScalar(1);
  effects.add(ring, ttl, fx => { fx.o.scale.setScalar(.45 + fx.age * 3.2); fx.o.material.opacity = .7 * (1 - fx.age / fx.ttl); });
}

function enterPlacement(type) {
  if (!world || mode !== 'game') return;
  placementType = type;
  hideTargetReticle();
  disposeGhost();
  const model = makeModel(type, world.players[0].faction);
  model.traverse(child => {
    if (!child.isMesh) return;
    child.material = child.material.clone();
    child.material.transparent = true;
    child.material.opacity = .5;
    child.material.depthWrite = false;
    child.castShadow = false;
    child.receiveShadow = false;
    child.material.userData.baseColor = child.material.color.clone();
  });
  ghost = new THREE.Group();
  ghost.add(model);
  const footprint = new THREE.Mesh(new THREE.PlaneGeometry(DEFS[type].w, DEFS[type].d), new THREE.MeshBasicMaterial({ color: '#67ffad', transparent: true, opacity: .15, side: THREE.DoubleSide, depthWrite: false }));
  footprint.rotation.x = -Math.PI / 2; footprint.position.y = .035; ghost.add(footprint);
  ghost.userData.footprint = footprint;
  scene.add(ghost);
  buildHudStatus('放置建筑 · 左键部署 · 右键取消');
  updateGhost(cameraTarget);
}

function updateGhost(p) {
  if (!ghost || !placementType) return;
  ghost.position.set(p.x, terrainHeight(p.x, p.z) + .03, p.z);
  const valid = world.canPlace(placementType, 0, p.x, p.z).ok;
  const tint = valid ? validColor : invalidColor;
  ghost.traverse(child => {
    if (!child.isMesh || !child.material?.userData?.baseColor) return;
    child.material.color.copy(child.material.userData.baseColor).lerp(tint, .62);
    child.material.opacity = valid ? .5 : .34;
  });
  if (ghost.userData.footprint) {
    ghost.userData.footprint.material.color.copy(tint);
    ghost.userData.footprint.material.opacity = valid ? .2 : .12;
  }
}

function disposeGhost() {
  if (!ghost) return;
  scene.remove(ghost);
  ghost.traverse(child => {
    if (child.isMesh && child.material?.userData?.baseColor) child.material.dispose?.();
  });
  ghost = null;
  placementType = null;
}

function cancelTargeting() {
  if (superTargeting) {
    superTargeting = false;
    hideTargetReticle();
    if (hud) hud.notice('战略打击已取消', 'super');
    return;
  }
  if (placementType) {
    const job = world?.players[0].queues.structures[0];
    if (job?.ready) {
      world.economy.cancel(0, 'structures', 0);
      if (hud) hud.notice('建造已取消 — 资金已退还', 'warning');
    }
    disposeGhost();
    if (hud) hud.notice('部署已取消', 'warning');
  }
}

function confirmTarget(p) {
  if (!world) return;
  if (superTargeting) {
    const ok = world.combat.strike(0, p.x, p.z);
    superTargeting = false;
    hideTargetReticle();
    if (ok && hud) hud.notice('战略打击已授权', 'super');
    return;
  }
  if (!placementType) return;
  const job = world.players[0].queues.structures[0];
  if (!job?.ready) { disposeGhost(); return; }
  const validity = world.canPlace(placementType, 0, p.x, p.z);
  if (!validity.ok) { if (hud) hud.notice(validity.reason, 'warning'); return; }
  if (world.economy.place(0, p.x, p.z, false)) {
    effectsRing(p.x, p.z, '#d8c18a', .7);
    disposeGhost();
    buildHudStatus('建筑已部署 · 正在建造');
  }
}

function updateTargetPreview(p) {
  if (superTargeting) showTargetReticle(p);
  else if (placementType) updateGhost(p);
}

function buildHudStatus(text) {
  const el = document.querySelector('#world-hint');
  if (el) el.textContent = text;
}

function selectionRefresh() {
  for (const [id, ring] of rings) ring.visible = selected.has(id);
  if (selected.size === 1) {
    const entity = world?.entities.get([...selected][0]);
    if (entity?.rally) {
      createRallyMarker();
      rallyMarker.visible = true;
      rallyMarker.position.set(entity.rally.x, terrainHeight(entity.rally.x, entity.rally.z) + .06, entity.rally.z);
    } else hideRallyMarker();
  } else hideRallyMarker();
}

function selectEntity(id, add = false, double = false) {
  if (!world) return;
  const entity = world.entities.get(id);
  if (!entity || entity.dead || entity.p !== 0) return;
  if (!add) selected.clear();
  if (add && selected.has(id)) selected.delete(id);
  else selected.add(id);
  if (double && !entity.def.building) {
    for (const other of world.list(0)) {
      if (!other.def.building && other.type === entity.type && world.visibleTo(0, other)) selected.add(other.id);
    }
  }
  selectionRefresh();
}

function boxSelect(rect, add = false) {
  if (!world) return;
  if (!add) selected.clear();
  const minX = Math.min(rect.x, rect.x2), maxX = Math.max(rect.x, rect.x2);
  const minY = Math.min(rect.y, rect.y2), maxY = Math.max(rect.y, rect.y2);
  for (const entity of world.list(0)) {
    if (entity.def.building) continue;
    projectVector.set(entity.x, terrainHeight(entity.x, entity.z) + .8, entity.z).project(camera);
    if (projectVector.z > 1) continue;
    const x = (projectVector.x + 1) / 2 * innerWidth;
    const y = (1 - projectVector.y) / 2 * innerHeight;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) selected.add(entity.id);
  }
  selectionRefresh();
}

function clearSelection(add = false) { if (!add) { selected.clear(); selectionRefresh(); } }

function command(name) {
  if (!world) return;
  const entities = [...selected].map(id => world.entities.get(id)).filter(e => e && !e.dead);
  const units = entities.filter(e => !e.def.building);
  const building = entities.length === 1 && entities[0].def.building ? entities[0] : null;
  const singleUnit = entities.length === 1 && !entities[0].def.building ? entities[0] : null;
  if (name === 'pause') { pauseGame(); return; }
  if (name === 'settings') { openSettingsInGame(); return; }
  if (name === 'attackMove') {
    orderMode = 'attackMove';
    buildHudStatus('攻击移动已就绪 · 右键选择目的地');
    if (hud) hud.notice('攻击移动已就绪', 'info');
    return;
  }
  if (name === 'stop' || name === 'hold') { world.stop(units.map(e => e.id), name === 'hold'); if (hud) hud.notice(name === 'hold' ? '坚守阵地' : '已取消命令'); return; }
  if (name === 'sell' && building) { world.sell(building.id); if (hud) hud.notice('建筑已出售', 'warning'); selected.clear(); selectionRefresh(); return; }
  if (name === 'repair' && building) { building.repair = !building.repair; if (hud) hud.notice(building.repair ? '维修班组已派出' : '维修已取消'); return; }
  if (name === 'deploy' && (building?.type === 'mcv' || singleUnit?.type === 'mcv')) { const mcv = building?.type === 'mcv' ? building : singleUnit; world.deploy(mcv.id); selected.clear(); selectionRefresh(); return; }
  if (name === 'target') {
    const sup = world.list(0).find(e => e.type === 'super' && e.charge >= 120);
    if (!sup) { if (hud) hud.notice('超级武器尚未就绪', 'warning'); return; }
    superTargeting = true; disposeGhost(); createReticle();
    buildHudStatus('选择打击目标 · 左键发射 · 右键取消');
    return;
  }
  if (name === 'focus') {
    if (entities.length) { cameraTarget.set(entities[0].x, 0, entities[0].z); if (mode === 'game') cameraIntro = .4; }
    return;
  }
  if (name === 'home') { cameraTarget.set(-44, 0, 36); cameraIntro = .5; return; }
  if (name === 'rally' && building) {
    buildHudStatus('选择集结点 · 右键点击地面');
    return;
  }
}

function issueOrder(point) {
  if (!world || mode !== 'game' || paused) return;
  if (placementType || superTargeting) return;
  const clicked = point.entityId !== undefined ? world.entities.get(point.entityId) : null;
  const entities = [...selected].map(id => world.entities.get(id)).filter(e => e && !e.dead);
  const units = entities.filter(e => !e.def.building);
  if (!entities.length) return;
  if (!units.length && entities.length === 1) {
    const building = entities[0];
    if (!clicked) { setRally(building, point); return; }
    return;
  }
  if (!units.length) return;
  const ids = units.map(e => e.id);
  if (clicked && clicked.p !== 0) {
    world.order(ids, clicked, 'attack');
    effectsRing(clicked.x, clicked.z, '#ff6b58', .45);
    buildHudStatus('攻击目标');
  } else {
    world.order(ids, point, orderMode === 'attackMove' ? 'attackMove' : 'move');
    effectsRing(point.x, point.z, orderMode === 'attackMove' ? '#ffb06a' : '#8de8dd', .5);
    buildHudStatus(orderMode === 'attackMove' ? '攻击移动' : '移动中');
  }
  orderMode = 'move';
}

function startGame(options = {}) {
  try {
    audio.start();
    audio.setIntense(true);
    cleanupGame();
    view.setLowQuality(false);
    if (options.faction) faction = options.faction;
    if (options.difficulty) difficulty = options.difficulty;
    if (!['allied', 'soviet'].includes(faction)) faction = 'allied';
    if (!DIFFICULTIES[difficulty]) difficulty = 'recruit';
    ui.innerHTML = '';
    ui.classList.remove('menu-mode');
    document.body.classList.remove('menu-active');
    if (menuGroup) menuGroup.visible = false;
    mode = 'starting';
    paused = false;
    orderMode = 'move';
    placementType = null;
    superTargeting = false;
    selected.clear();
    const actions = {
      command,
      order: issueOrder,
      box: boxSelect,
      select: selectEntity,
      clear: clearSelection,
      group: ids => { selected = new Set(ids.filter(id => world?.entities.get(id)?.p === 0)); selectionRefresh(); },
      selection: () => [...selected],
      getSelection: () => [...selected],
      getCameraTarget: () => cameraTarget,
      getGameTime: () => world?.time || 0,
      blueprint: index => { const type = hud?.order(hud.tab)?.[index]; if (type) queueBlueprint(type); },
      tab: tab => hud?.setTab(tab),
      enqueue: type => queueBlueprint(type),
      cancel: type => cancelQueue(type),
      preview: updateTargetPreview,
      place: confirmTarget,
      cancelTarget: cancelTargeting,
      escape,
      minimap: minimapMove,
      pan: (x, z) => { cameraTarget.x = clamp(cameraTarget.x + x, -70, 70); cameraTarget.z = clamp(cameraTarget.z + z, -70, 70); },
      zoom: amount => { cameraZoom = clamp(cameraZoom * amount, .55, 1.75); },
      rotate: amount => { cameraYaw += amount; },
      status: buildHudStatus,
      getObjects: () => [...nodes.values()].filter(node => node.visible),
      active: () => mode === 'game' && !paused,
      targeting: () => !!placementType || superTargeting,
      alive: id => !!world?.entities.get(id) && !world.entities.get(id).dead
    };
    hud = new HUD(ui, actions);
    buildThumbnails(faction);
    world = new Game({ faction, difficulty, onEvent: handleEvent });
    worldReady = true;
    for (const entity of world.list()) materialize(entity);
    fog.mesh.visible = true;
    view.setFogEnabled(true);
    drawFog();
    if (!input) input = new Input(canvas, camera, actions);
    input.edge = edgeScroll;
    cameraTarget.set(-47, 0, 39);
    cameraZoom = .9;
    cameraYaw = -0.78;
    cameraIntro = 1.25;
    snapCamera();
    try { hud.update(world, [...selected], null, fps); } catch (error) { console.error('Initial HUD update failed', error); }
    updateTutorial();
    loading.hidden = true;
    mode = 'game';
    paused = false;
    gameStartedAt = performance.now();
    qualityChecked = false;
    last = performance.now();
    accumulator = 0;
    buildHudStatus('右键移动 · 拖拽框选 · 轻按 A 再右键可攻击移动');
    setTimeout(() => { if (mode === 'game' && hud) hud.notice('卫星链路已建立 · 指挥系统在线', 'super'); }, 900);
  } catch (error) {
    fatal(error);
  }
}

function createHealthElementIfNeeded(entity) {
  if (!labelNodes.has(entity.id)) makeHealthElement(entity);
}

function queueBlueprint(type) {
  if (!world) return;
  if (world.economy.enqueue(0, type)) {
    audio.start();
    if (DEFS[type].building) buildHudStatus(`${displayName(type, faction)}已加入生产队列`);
  }
}

function cancelQueue(type) {
  if (!world) return;
  for (const category of ['structures', 'infantry', 'vehicles']) {
    const index = world.players[0].queues[category].findIndex(job => job.type === type);
    if (index >= 0) { world.economy.cancel(0, category, index); return; }
  }
}

function minimapMove(x, y) {
  cameraTarget.set(clamp(x * 160 - 80, -70, 70), 0, clamp(y * 160 - 80, -70, 70));
  cameraIntro = .2;
}

function escape() {
  if (placementType || superTargeting) { cancelTargeting(); return; }
  if (mode === 'game' && !paused) pauseGame();
}

function pauseGame() {
  if (mode !== 'game' || paused) return;
  paused = true;
  mode = 'paused';
  if (input) input.reset();
  const modal = menus.modal('战斗暂停', `<div class="note">战场模拟已暂停，你的部队正在等待命令。<br><span class="mono muted">按 Esc 或点击“恢复作战”回到战场</span></div>`, [
    { label: '恢复作战', primary: true, action: () => resumeGame() },
    { label: '返回主菜单', action: () => showMenu() }
  ]);
  if (modal) {
    const close = () => { modal.remove(); resumeGame(); };
    modal.querySelector('.close').onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
  }
}

function openSettingsInGame() {
  if (!world || mode === 'menu' || mode === 'result') return;
  paused = true;
  mode = 'paused';
  if (input) input.reset();
  const modal = wirePreferences(menus.settings());
  if (!modal) { resumeGame(); return; }
  const close = () => {
    modal.remove();
    if (plausible()) resumeGame();
  };
  const plausible = () => mode === 'paused';
  modal.querySelector('.close').onclick = close;
  modal.onclick = event => { if (event.target === modal) close(); };
}

function resumeGame() {
  if (!world || world.status !== 'playing') return;
  paused = false;
  mode = 'game';
  last = performance.now();
  if (input) input.keys.clear();
  const stale = ui.querySelectorAll('.modal-backdrop');
  stale.forEach(el => el.remove());
}

function showResult(data) {
  if (mode === 'result') return;
  mode = 'result';
  paused = true;
  if (input) input.reset();
  const status = data.status;
  const time = data.time || world?.time || 0;
  const stats = data.stats || world?.players[0].stats || { kills: 0, losses: 0, harvested: 0 };
  const modal = menus.modal(
    status === 'victory' ? '行动完成' : '指挥失效',
    `<div class="eyebrow">${status === 'victory' ? '地平线属于我们' : '战场已经沦陷'}</div>
     <div class="note">${status === 'victory' ? '敌方指挥体系已被摧毁。这片边疆现在属于你。' : '你的指挥体系已经崩溃。重整旗鼓，再次出发。'}</div>
     <div class="stat-grid"><div><small>击毁数</small><strong>${stats.kills || 0}</strong></div><div><small>损失数</small><strong>${stats.losses || 0}</strong></div><div><small>已处理矿石</small><strong>$${Math.floor(stats.harvested || 0).toLocaleString()}</strong></div><div><small>战斗时长</small><strong>${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}</strong></div></div>`,
    [{ label: '再次部署', primary: true, action: () => startGame() }, { label: '返回主菜单', action: () => showMenu() }]
  );
  if (modal) {
    modal.onclick = e => e.stopPropagation();
    modal.querySelector('.close').remove();
  }
  triggerFlash(status === 'victory' ? '#d6f3f1' : '#ff5a43', .3);
}

function snapCamera() {
  const dist = 58 * cameraZoom;
  const height = 46 * Math.pow(cameraZoom, .82);
  camera.position.set(cameraTarget.x + Math.sin(cameraYaw) * dist, height, cameraTarget.z + Math.cos(cameraYaw) * dist);
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
}

function updateCamera(dt) {
  if (mode === 'menu') {
    menuAngle += dt * .035;
    const angle = -.5 + Math.sin(menuAngle) * .18;
    const center = new THREE.Vector3(-44, 1.5, 40);
    camera.position.set(center.x + Math.sin(angle) * 25.5, 11, center.z + Math.cos(angle) * 25.5);
    camera.lookAt(center.x - 3.2, 1.3, center.z - 2.2);
    camera.fov = 36; camera.updateProjectionMatrix();
    for (const flag of menuFlags) {
      const cloth = flag.userData.cloth;
      if (cloth) cloth.rotation.y = Math.sin(performance.now() * .0018 + flag.position.x) * .18;
    }
    if (menuUnits[0]?.userData?.turret) menuUnits[0].userData.turret.rotation.y = Math.sin(performance.now() * .00018) * .42;
    if (menuUnits[1]?.userData?.turret) menuUnits[1].userData.turret.rotation.y = -Math.sin(performance.now() * .00022) * .35;
    if (menuParticles) menuParticles.rotation.y += dt * .01;
    const clock = document.querySelector('.menu-clock');
    if (clock && Math.floor(performance.now() / 1000) % 2 === 0) clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  } else {
    camera.fov = 42; camera.updateProjectionMatrix();
    if (cameraIntro > 0) {
      cameraIntro = Math.max(0, cameraIntro - dt);
      const k = 1 - Math.exp(-dt * 3.2);
      const dist = 58 * cameraZoom;
      const height = 46 * Math.pow(cameraZoom, .82);
      camera.position.lerp(new THREE.Vector3(cameraTarget.x + Math.sin(cameraYaw) * dist, height, cameraTarget.z + Math.cos(cameraYaw) * dist), k);
    } else {
      const dist = 58 * cameraZoom;
      const height = 46 * Math.pow(cameraZoom, .82);
      cameraGoal.set(cameraTarget.x + Math.sin(cameraYaw) * dist, height, cameraTarget.z + Math.cos(cameraYaw) * dist);
      camera.position.lerp(cameraGoal, 1 - Math.exp(-dt * 9));
    }
    if (shake > .002) {
      camera.position.x += (Math.random() - .5) * shake;
      camera.position.y += (Math.random() - .5) * shake * .5;
      camera.position.z += (Math.random() - .5) * shake;
      shake *= Math.exp(-dt * 4.4);
    }
    camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
  }
}

function updateFogTexture() {
  if (!fog.mesh.visible) return;
  drawFog();
}

function updateEntityVisuals(now, dt) {
  if (!world) return;
  for (const entity of world.list()) {
    const node = nodes.get(entity.id);
    if (!node) continue;
    const y = terrainHeight(entity.x, entity.z);
    node.position.x = entity.x; node.position.z = entity.z;
    if (!entity.def.building) node.position.y = y;
    else node.position.y = y;
    if (entity.construct && node.userData.constructStart) {
      const t = Math.min(1, (now - node.userData.constructStart) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      node.scale.y = .12 + eased * .88;
      node.position.y = y - (1 - eased) * 2.6;
      if (t >= 1) { node.userData.constructStart = 0; entity.construct = false; }
    } else if (node.scale.y !== 1) {
      node.scale.y += (1 - node.scale.y) * Math.min(1, dt * 8);
      node.position.y = y;
    }
    animateModel(node, entity, now / 1000, dt);
    if (entity.p === 1) {
      let see = world.visibleTo(0, entity);
      if (entity.def.building) see = !!world.fog[0].explored[world.nav.index(entity.x, entity.z)];
      node.visible = see;
    } else node.visible = true;
    if (node.visible) {
      // Idle industry breathes: refinery stacks, power cooling towers, factory exhaust.
      if (entity.def.building && (entity.type === 'power' || entity.type === 'refinery' || entity.type === 'factory')) {
        node.userData.ambientAt ??= now + 500 + Math.random() * 1300;
        if (now > node.userData.ambientAt) {
          node.userData.ambientAt = now + 900 + Math.random() * 1600;
          const chimney = entity.type === 'power'
            ? { x: entity.x + (Math.random() < .5 ? -1.65 : 1.65), y: y + 4.8, z: entity.z }
            : entity.type === 'refinery'
              ? { x: entity.x - 2.4, y: y + 5.4, z: entity.z - 1.8 }
              : { x: entity.x + 4, y: y + 6.2, z: entity.z - 3 };
          const smoke = effects.take('smoke', '#5d5a50');
          smoke.position.set(chimney.x, chimney.y, chimney.z);
          effects.add(smoke, 2.4 + Math.random() * 1.2, fx => {
            const t = fx.age;
            fx.o.position.x += Math.sin(t * 1.3) * .006;
            fx.o.position.y += .5 * .016;
            fx.o.scale.setScalar(.16 + t * .24);
            fx.o.material.opacity = .11 * (1 - t / fx.ttl);
          });
        }
      }
      // Tracks kick up dust when armor moves.
      if (!entity.def.building && entity.moving && entity.def.armor === 'heavy') {
        node.userData.dustAt ??= now + 150;
        if (now > node.userData.dustAt) {
          node.userData.dustAt = now + 280 + Math.random() * 260;
          const back = 1.55;
          const dust = effects.take('smoke', '#88785e');
          dust.position.set(entity.x - Math.sin(entity.angle) * back, y + .35, entity.z - Math.cos(entity.angle) * back);
          effects.add(dust, .9 + Math.random() * .5, fx => { fx.o.position.y += .38 * .016; fx.o.scale.setScalar(.18 + fx.age * .44); fx.o.material.opacity = .14 * (1 - fx.age / fx.ttl); });
        }
      }
    }
    const ring = rings.get(entity.id);
    if (ring) {
      ring.visible = selected.has(entity.id) && (entity.p === 0 || world.visibleTo(0, entity));
      ring.position.x = entity.x; ring.position.z = entity.z;
      if (ring.visible) {
        ring.material.opacity = .58 + .3 * (Math.sin(now * .005 + entity.id) * .5 + .5);
        ring.scale.setScalar(1 + Math.sin(now * .004 + entity.id) * .035);
      }
    }
    // Damage smoke for structures and heavy armor.
    if (entity.hp < entity.maxHp * .55 && (entity.def.building || entity.def.armor === 'heavy')) {
      node.userData.smokeAt ??= now + Math.random() * 800;
      if (now > node.userData.smokeAt) {
        node.userData.smokeAt = now + 450 + Math.random() * 700;
        const smoke = effects.take('smoke', '#5b554b');
        smoke.position.set(entity.x + (Math.random() - .5) * entity.def.radius, y + (entity.def.building ? 5 : 2), entity.z + (Math.random() - .5) * entity.def.radius);
        effects.add(smoke, 1.5 + Math.random(), fx => { fx.o.position.y += dt * .5; fx.o.scale.setScalar(.25 + fx.age * .5); fx.o.material.opacity = .16 * (1 - fx.age / fx.ttl); });
      }
    }
  }
}

function updateCollapsing(now) {
  for (let i = collapsing.length - 1; i >= 0; i--) {
    const ruin = collapsing[i];
    const t = Math.min(1, (now - ruin.at) / ruin.duration);
    const ease = Math.pow(t, 1.55);
    ruin.node.scale.y = 1 - ease * .92;
    ruin.node.rotation.z = Math.sin(t * 9 + i) * .045 * t;
    ruin.node.position.y = terrainHeight(ruin.x, ruin.z) - ease * 1.8;
    if (now > ruin.nextSmoke) {
      ruin.nextSmoke = now + 180 + Math.random() * 280;
      const smoke = effects.take('smoke', Math.random() > .5 ? '#5b5147' : '#6c5b48');
      smoke.position.set(ruin.x + (Math.random() - .5) * 5, 1.2 + Math.random() * 4, ruin.z + (Math.random() - .5) * 5);
      effects.add(smoke, 2.2 + Math.random() * 1.5, fx => { fx.o.position.y += .6 * .016; fx.o.scale.setScalar(.35 + fx.age * .55); fx.o.material.opacity = .24 * (1 - fx.age / fx.ttl); });
    }
    if (t >= 1) {
      scene.remove(ruin.node);
      collapsing.splice(i, 1);
    }
  }
}

function updateHealthBars() {  if (!world || !labels) return;
  for (const [id, el] of labelNodes) {
    const entity = world.entities.get(id);
    if (!entity || entity.dead) { el.hidden = true; continue; }
    const visible = entity.p === 0 || (entity.def.building ? world.fog[0].explored[world.nav.index(entity.x, entity.z)] : world.visibleTo(0, entity));
    const damaged = entity.hp < entity.maxHp - .01;
    const show = visible && (selected.has(id) || damaged);
    el.hidden = !show;
    if (!show) continue;
    const h = entity.def.building ? 7.2 : (entity.def.armor === 'infantry' ? 2.7 : 3.4);
    projectVector.set(entity.x, terrainHeight(entity.x, entity.z) + h, entity.z).project(camera);
    if (projectVector.z > 1) { el.hidden = true; continue; }
    const x = (projectVector.x + 1) / 2 * innerWidth;
    const y = (1 - projectVector.y) / 2 * innerHeight;
    if (x < -30 || x > innerWidth + 30 || y < -30 || y > innerHeight + 30) { el.hidden = true; continue; }
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.classList.toggle('enemy', entity.p === 1);
    el.querySelector('span').textContent = entity.p === 0 ? displayName(entity.type, entity.faction) : (entity.def.building ? '敌方建筑' : '敌军');
    el.querySelector('b').style.width = `${clamp(entity.hp / entity.maxHp * 100, 0, 100)}%`;
  }
}

function updateHUD(now) {
  if (!world || !hud) return;
  if (now - hudAt > 110) {
    hudAt = now;
    try { hud.update(world, [...selected], placementType, fps); } catch (error) { console.error('HUD update failed', error); }
    if (!placementType && !superTargeting) {
      const job = world.players[0].queues.structures[0];
      if (job?.ready && mode === 'game') enterPlacement(job.type);
    }
  }
}

function updateRallyMarker() {
  if (!rallyMarker || !rallyMarker.visible || !world) return;
  if (rallyBuildingId && !selected.has(rallyBuildingId)) hideRallyMarker();
  if (rallyMarker.visible) rallyMarker.rotation.y += .01;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.2, Math.max(.001, (now - last) / 1000));
  last = now;
  elapsed += dt;
  frames++;
  if (now - fpsAt > 1000) { fps = frames * 1000 / (now - fpsAt); frames = 0; fpsAt = now; }
  if (mode === 'game' && !qualityChecked && gameStartedAt && now - gameStartedAt > 6500) {
    qualityChecked = true;
    if (fps < 28) {
      view.setLowQuality(true);
      if (hud) hud.notice('性能模式 · 已关闭后期处理', 'warning');
    }
  }
  if (mode === 'game' && !paused && world) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= 1 / 30 && steps < 10) { world.tick(1 / 30); accumulator -= 1 / 30; steps++; }
    if (steps >= 10) accumulator = 0;
    if (input) input.update(dt);
    updateEntityVisuals(now, dt);
    updateCollapsing(now);
    if (now - fogAt > 220) { fogAt = now; updateFogTexture(); }
    updateHealthBars();
    updateHUD(now);
    updateRallyMarker();
  } else if (mode === 'menu') {
    // Menu camera is updated once, below.
  } else if (mode === 'paused' || mode === 'result') {
    // Keep the battlefield alive visually without advancing the simulation.
    updateHealthBars();
  }
  if (flashTimer > 0) {
    flashTimer -= dt;
    flash.style.opacity = String(Math.max(0, flashTimer / .8) * .7);
    if (flashTimer <= 0) flash.style.opacity = '0';
  }
  effects.update(dt);
  updateScorches(now);
  updateCamera(dt);
  view.render();
}

function updateTutorial() {
  if (!document.querySelector('#tutorial')) return;
  const tutorial = document.querySelector('#tutorial');
  if (localStorage.getItem('iron-tutorial-zh')) { tutorial.remove(); return; }
  tutorial.classList.add('show');
  const dismiss = tutorial.querySelector('[data-dismiss]');
  if (dismiss) dismiss.onclick = () => { tutorial.classList.remove('show'); tutorial.remove(); localStorage.setItem('iron-tutorial-zh', '1'); };
}

// Debug surface used by PM/QA and curious tinkerers.
window.__IRON_DAWN__ = {
  getState() {
    const state = world ? world.getState() : { status: 'menu' };
    return { mode, paused, fps: Math.round(fps), selected: [...selected], nodes: nodes.size, ...state };
  },
  start: options => startGame(options || {}),
  menu: () => showMenu(),
  spawn(type, factionName, x, z) {
    if (!world) return null;
    const p = factionName === (world.players[0].faction) ? 0 : 1;
    return world.spawn(type, p, Number(x), Number(z));
  },
  giveCredits(amount = 10000) { if (world) world.players[0].credits += Number(amount); },
  damage(id, amount = 500) { if (world) { const e = world.entities.get(Number(id)); if (e) world.combat.damage(e, Number(amount), 'explosive', null, true); } },
  win() { if (world) world.end('victory'); },
  lose() { if (world) world.end('defeat'); },
  skipBuild() { if (world) world.skipBuild(); },
  selectAll() { if (!world) return; selected = new Set(world.list(0).filter(e => !e.def.building && world.visibleTo(0, e)).map(e => e.id)); selectionRefresh(); },
  selectId(id) { if (world) selectEntity(Number(id)); },
  issueMove(x, z, kind = 'move') { if (world) world.order([...selected], { x: Number(x), z: Number(z) }, kind); },
  issueAttack(id) { if (world) { const e = world.entities.get(Number(id)); if (e) world.order([...selected], e, 'attack'); } },
  queue(type) { queueBlueprint(type); },
  advance(seconds = 1) { if (!world) return; const steps = Math.min(9000, Math.round(Number(seconds) * 30)); for (let i = 0; i < steps && world.status === 'playing'; i++) world.tick(1 / 30); },
  getCamera: () => camera,
  getView: () => view,
  enterPlacement: type => enterPlacement(type),
  confirmPlacement(x, z) { confirmTarget({ x: Number(x), z: Number(z) }); },
  targetSuper() { command('target'); },
  confirmSuper(x, z) { confirmTarget({ x: Number(x), z: Number(z) }); },
  getWorld: () => world,
  getNodes: () => nodes,
  getSelection: () => [...selected]
};

document.addEventListener('visibilitychange', () => { last = performance.now(); accumulator = 0; });
window.addEventListener('resize', () => view.resize());
window.addEventListener('keydown', event => {
  if (event.code !== 'Escape' || mode !== 'paused') return;
  const modals = ui.querySelectorAll('.modal-backdrop');
  if (!modals.length) return;
  event.preventDefault();
  modals.forEach(modal => modal.remove());
  resumeGame();
});
window.addEventListener('pointerdown', () => audio.start(), { once: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showMenu);
else showMenu();
requestAnimationFrame(frame);
