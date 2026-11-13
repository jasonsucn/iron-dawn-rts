import * as T from 'three';

const V = new T.Vector3();
const UP = new T.Vector3(0, 1, 0);
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

// 几何体缓存（同类特效共享几何，只有材质与变换不同）
const GEO = {
  flash: () => new T.SphereGeometry(1, 8, 6),
  ring: () => new T.TorusGeometry(1, .1, 5, 30),
  smoke: () => new T.IcosahedronGeometry(1, 1),
  shard: () => new T.IcosahedronGeometry(1, 0),
  spark: () => new T.BoxGeometry(.5, .5, 1.6),
  fire: () => new T.IcosahedronGeometry(1, 0),
  beam: () => new T.CylinderGeometry(.035, .035, 1, 5),
  bullet: () => new T.SphereGeometry(1, 5, 4),
  tracer: () => new T.BoxGeometry(1, 1, 1),
};
const ADDITIVE = new Set(['flash', 'ring', 'spark', 'fire', 'beam', 'bullet', 'tracer']);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.live = [];
    this.pool = {};
    this.max = 420;
    this.lowQuality = false;
    this.simple = false;
    this.onShake = null;
  }

  /** 低画质时整体降粒子量，而不是完全关掉 */
  setLowQuality(value) {
    this.lowQuality = !!value;
    this.simple = !!value;
  }

  /** 性能模式：退回最初那套轻量特效 */

  count(base) {
    return this.lowQuality ? Math.max(1, Math.round(base * 0.4)) : base;
  }

  take(kind, color) {
    let mesh = this.pool[kind]?.pop();
    if (mesh) {
      mesh.visible = true;
      mesh.material.color.set(color);
      mesh.material.opacity = 1;
      mesh.scale.setScalar(1);
      mesh.rotation.set(0, 0, 0);
      mesh.geometry = mesh.geometry || GEO[kind]();
      this.scene.add(mesh);
    } else {
      const material = new T.MeshBasicMaterial({
        color,
        flatShading: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        side: T.DoubleSide,
        blending: ADDITIVE.has(kind) ? T.AdditiveBlending : T.NormalBlending,
      });
      mesh = new T.Mesh(GEO[kind](), material);
      this.scene.add(mesh);
    }
    if (this.live.length >= this.max) this.release(0);
    return mesh;
  }

  add(o, ttl, update, kind = 'shard') {
    this.live.push({ o, age: 0, ttl, update, kind });
  }

  release(i) {
    const [fx] = this.live.splice(i, 1);
    if (!fx) return;
    fx.o.visible = false;
    if (fx.o.isLight) fx.o.intensity = 0;
    fx.o.parent?.remove(fx.o);
    if (!fx.o.isLight) (this.pool[fx.kind] ??= []).push(fx.o);
  }

  shake(power, x, z) {
    this.onShake?.(power, x, z);
  }

  // 短命点光源（数量受限，性能模式下直接跳过）
  flashLight(x, y, z, color, peak, ttl, distance = 24) {
    if (this.lowQuality) return;
    let lights = 0;
    for (const fx of this.live) if (fx.o.isLight) lights++;
    if (lights >= 6) return;
    const light = new T.PointLight(color, peak, distance, 2);
    light.position.set(x, y, z);
    light.visible = true;
    this.scene.add(light);
    this.add(light, ttl, fx => { fx.o.intensity = peak * Math.max(0, 1 - fx.age / fx.ttl); }, 'light');
  }

  event(type, d) {
    if (this.simple) return this.simpleEvent(type, d);
    if (type === 'fire') return this.shot(d);
    if (type === 'beam') return this.shot({ ...d, kind: 'beam', faction: d.faction });
    if (type === 'impact') return this.impact(d);
    if (type === 'death') return this.explosion(d.x, d.z, d.building ? 5.4 : 3.1, d.building ? '#ffb060' : '#ff9a55', !!d.building);
    if (type === 'strikeWarning') return this.strikeWarning(d);
    if (type === 'supernova') return this.supernova(d);
    if (type === 'spawn' && d.entity?.construct) this.burst(d.entity.x, d.entity.z, 2, '#b8b08b');
  }

  // 受伤单位持续冒烟（由主循环按帧率节流调用）
  damageSmoke(x, y, z, heavy = false) {
    if (this.simple) return;
    const smoke = this.take('smoke', heavy ? '#2f2c28' : '#4a443c');
    smoke.position.set(x + rnd(-.5, .5), y, z + rnd(-.5, .5));
    const drift = rnd(-.4, .4);
    this.add(smoke, 1.5 + Math.random() * 1.1, fx => {
      const t = fx.age;
      fx.o.position.y = y + t * (heavy ? 1.9 : 1.2);
      fx.o.position.x += drift * .02;
      fx.o.scale.setScalar((heavy ? .55 : .38) + t * .5);
      fx.o.material.opacity = Math.max(0, (heavy ? .3 : .2) * (1 - t / fx.ttl));
    });
  }

  // 地面燃烧：爆点留下的火堆，持续数秒
  burning(x, z, radius = 1.6, duration = 3.4) {
    if (this.simple) return;
    const count = this.count(7);
    for (let i = 0; i < count; i++) {
      const fire = this.take('fire', i % 2 ? '#ff7d33' : '#ffc457');
      const a = Math.random() * Math.PI * 2, d = Math.random() * radius;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      fire.position.set(px, .35, pz);
      const delay = Math.random() * .5;
      const ttl = duration * (.6 + Math.random() * .6);
      this.add(fire, ttl + delay, fx => {
        if (fx.age < delay) { fx.o.visible = false; return; }
        fx.o.visible = true;
        const t = (fx.age - delay) / ttl;
        fx.o.position.y = .35 + Math.sin(fx.age * 7 + i) * .12 + t * .5;
        fx.o.scale.setScalar(.34 * (1 + Math.sin(fx.age * 9 + i) * .18) * (1 - t * .4));
        fx.o.material.opacity = Math.max(0, .85 * (1 - t));
      }, 'fire');
    }
    for (let i = 0; i < this.count(3); i++) {
      const smoke = this.take('smoke', '#33302b');
      const px = x + rnd(-radius, radius), pz = z + rnd(-radius, radius);
      smoke.position.set(px, .6, pz);
      this.add(smoke, duration + 1.6 + Math.random(), fx => {
        const t = fx.age;
        fx.o.position.y = .6 + t * 1.3;
        fx.o.scale.setScalar(.5 + t * .55);
        fx.o.material.opacity = Math.max(0, .22 * (1 - t / fx.ttl));
      });
    }
  }

  // ---------- 开火 ----------
  shot(d) {
    const distance = Math.hypot(d.tx - d.x, d.tz - d.z);
    if (d.kind === 'energy' || d.kind === 'beam') {
      const color = d.faction === 'soviet' ? '#ff5847' : '#6df8ff';
      V.set(d.tx - d.x, 1.1, d.tz - d.z);
      const len = V.length();
      const beam = this.take('beam', color);
      beam.position.set((d.x + d.tx) / 2, 1.8, (d.z + d.tz) / 2);
      beam.quaternion.setFromUnitVectors(UP, V.normalize());
      beam.scale.set(2.2, len, 2.2);
      this.add(beam, .22, fx => { fx.o.material.opacity = 1 - fx.age / fx.ttl; }, 'beam');
      const glow = this.take('flash', d.faction === 'soviet' ? '#ff9a70' : '#b0ffff');
      glow.position.set(d.tx, 1.6, d.tz);
      glow.scale.setScalar(.6);
      this.add(glow, .32, fx => { fx.o.scale.setScalar(.6 + fx.age * 4); fx.o.material.opacity = .7 * (1 - fx.age / fx.ttl); }, 'flash');
      return;
    }

    const travel = Math.max(.07, Math.min(1.2, distance / Math.max(8, d.speed || 60)));
    const tracer = d.kind === 'rocket' ? '#ffb057' : d.kind === 'piercing' ? '#ffe9b0' : '#eaffdc';
    const bullet = this.take('tracer', tracer);
    bullet.position.set(d.x, 1.8, d.z);
    bullet.lookAt(new T.Vector3(d.tx, 1, d.tz));
    const thickness = d.kind === 'piercing' ? .15 : d.kind === 'rocket' ? .12 : .085;
    const streak = d.kind === 'piercing' ? 3.6 : d.kind === 'rocket' ? 2.6 : 1.7;
    bullet.scale.set(thickness, thickness, streak);
    this.add(bullet, travel, fx => {
      const t = Math.min(1, fx.age / fx.ttl);
      fx.o.position.lerpVectors(new T.Vector3(d.x, 1.8, d.z), new T.Vector3(d.tx, 1, d.tz), t);
      fx.o.material.opacity = 1;
    }, 'bullet');

    // 枪口焰 + 枪口光斑
    const muzzleColor = d.kind === 'rocket' ? '#ff9a4a' : d.kind === 'piercing' ? '#ffd984' : '#ecffe2';
    const muzzle = this.take('flash', muzzleColor);
    muzzle.position.set(d.x, 1.7, d.z);
    const muzzleSize = d.kind === 'piercing' ? .72 : d.kind === 'rocket' ? .52 : .34;
    muzzle.scale.setScalar(muzzleSize);
    this.flashLight(d.x, 1.9, d.z, muzzleColor, d.kind === 'piercing' ? 90 : 55, .09, 18);
    this.add(muzzle, .13, fx => {
      fx.o.material.opacity = Math.max(0, 1 - fx.age / fx.ttl);
      fx.o.scale.setScalar(muzzleSize * (1 + fx.age * 3));
    }, 'flash');
    for (let i = 0; i < this.count(2); i++) {
      const spark = this.take('spark', muzzleColor);
      const a = Math.random() * Math.PI * 2;
      spark.position.set(d.x, 1.7, d.z);
      spark.rotation.set(rnd(0, 3), a, rnd(-.4, .4));
      this.add(spark, .16, fx => {
        fx.o.position.x += Math.cos(a) * fx.age * 4;
        fx.o.position.z += Math.sin(a) * fx.age * 4;
        fx.o.material.opacity = 1 - fx.age / fx.ttl;
        fx.o.scale.setScalar(.05 * (1 - fx.age / fx.ttl));
      }, 'spark');
    }

    if (d.kind === 'rocket') {
      for (let i = 1; i <= this.count(4); i++) {
        const smoke = this.take('smoke', '#6c6256');
        const t = i / 5;
        smoke.position.set(d.x + (d.tx - d.x) * t, .9, d.z + (d.tz - d.z) * t);
        this.add(smoke, .8 + i * .2, fx => {
          fx.o.scale.setScalar(.2 + fx.age * .4);
          fx.o.material.opacity = .18 * (1 - fx.age / fx.ttl);
        });
      }
    }
  }

  // ---------- 命中：火星四溅 ----------
  impact(d) {
    const x = d.x, z = d.z;
    const color = d.kind === 'bullet' ? '#e6dfaa' : '#ff934f';
    if (d.kind === 'piercing' || d.kind === 'rocket' || d.kind === 'energy') {
      const shell = this.take('flash', '#ffe6b0');
      shell.position.set(x, .9, z);
      shell.scale.setScalar(.3);
      this.add(shell, .24, fx => { fx.o.scale.setScalar(.3 + fx.age * 5.2); fx.o.material.opacity = 1 - fx.age / fx.ttl; }, 'flash');
      const shock = this.take('ring', '#ffc98a');
      shock.position.set(x, .12, z);
      this.add(shock, .45, fx => { fx.o.scale.setScalar(.6 + fx.age * 6.4); fx.o.material.opacity = .5 * (1 - fx.age / fx.ttl); }, 'ring');
      for (let i = 0; i < this.count(2); i++) {
        const smoke = this.take('smoke', '#5a5348');
        smoke.position.set(x + rnd(-.4, .4), .7, z + rnd(-.4, .4));
        this.add(smoke, 1.1 + Math.random() * .8, fx => {
          const t = fx.age;
          fx.o.position.y = .7 + t * 1.2;
          fx.o.scale.setScalar(.32 + t * .7);
          fx.o.material.opacity = Math.max(0, .26 * (1 - t / fx.ttl));
        });
      }
    }
    const puff = this.take('flash', color);
    puff.position.set(x, .9, z);
    puff.scale.setScalar(.55);
    this.add(puff, .18, fx => { fx.o.scale.setScalar(.55 + fx.age * 3.4); fx.o.material.opacity = .8 * (1 - fx.age / fx.ttl); }, 'flash');
    this.flashLight(x, 1.1, z, color, 45, .08, 14);
    const dust = this.take('ring', '#b9a98d');
    dust.position.set(x, .1, z);
    this.add(dust, .55, fx => { fx.o.scale.setScalar(.6 + fx.age * 3.6); fx.o.material.opacity = .3 * (1 - fx.age / fx.ttl); }, 'ring');
    for (let i = 0; i < this.count(8); i++) {
      const spark = this.take('spark', i % 2 ? '#ffe1a0' : color);
      const a = Math.random() * Math.PI * 2, speed = 2.4 + Math.random() * 4.4;
      spark.position.set(x, .9, z);
      spark.rotation.set(rnd(-.6, .6), a, rnd(-.6, .6));
      this.add(spark, .22 + Math.random() * .16, fx => {
        const t = fx.age;
        fx.o.position.set(x + Math.cos(a) * speed * t, .9 + 1.6 * t - 5.5 * t * t, z + Math.sin(a) * speed * t);
        fx.o.material.opacity = 1 - t / fx.ttl;
        fx.o.scale.setScalar(.055 * (1 - t / fx.ttl));
      }, 'spark');
    }
  }

  // ---------- 爆炸（单位死亡 / 建筑摧毁） ----------
  explosion(x, z, size, color, building = false) {
    const flash = this.take('flash', '#fff2c4');
    flash.position.set(x, .9, z);
    flash.scale.setScalar(size * .35);
    this.add(flash, .3, fx => { fx.o.scale.setScalar(size * (.35 + fx.age * 2.6)); fx.o.material.opacity = 1 - fx.age / fx.ttl; }, 'flash');

    const ring = this.take('ring', color);
    ring.position.set(x, .16, z);
    this.add(ring, .9, fx => { fx.o.scale.setScalar(size * (.2 + fx.age * 1.9)); fx.o.material.opacity = .8 * (1 - fx.age / fx.ttl); }, 'ring');

    if (building || size > 3) {
      // 冲击波双环
      for (let i = 0; i < 2; i++) {
        const wave = this.take('ring', '#ffd9a0');
        wave.position.set(x, .12 + i * .04, z);
        this.add(wave, 1.15 + i * .35, fx => {
          fx.o.scale.setScalar(size * .4 + fx.age * (11 - i * 3));
          fx.o.material.opacity = .45 * (1 - fx.age / fx.ttl);
        }, 'ring');
      }
      const light = new T.PointLight(building ? '#ffb066' : '#ff8a4a', 0, 60, 2);
      light.position.set(x, 4, z);
      light.visible = true;
      this.scene.add(light);
      const peak = building ? 420 : 200;
      this.add(light, .9, fx => { fx.o.intensity = peak * Math.max(0, 1 - fx.age / fx.ttl); }, 'light');
    }

    for (let i = 0; i < this.count(building ? 16 : 7); i++) {
      const shard = this.take('shard', i % 3 === 0 ? '#ffde9d' : i % 3 === 1 ? '#a9937a' : '#4d4b42');
      const a = Math.random() * Math.PI * 2, speed = 2 + Math.random() * (building ? 9 : 5);
      shard.position.set(x, .5, z);
      shard.scale.setScalar(size * .1);
      this.add(shard, .7 + Math.random() * .8, fx => {
        const t = fx.age;
        fx.o.position.set(x + Math.cos(a) * speed * t, .5 + 3.4 * t - 9.5 * t * t, z + Math.sin(a) * speed * t);
        fx.o.rotation.x += .2; fx.o.rotation.z += .16;
        fx.o.material.opacity = Math.max(0, 1 - t / fx.ttl);
      });
    }

    for (let i = 0; i < this.count(building ? 10 : 4); i++) {
      const smoke = this.take('smoke', building ? '#4a4038' : '#554b43');
      const a = Math.random() * Math.PI * 2, speed = .6 + Math.random() * 1.6;
      smoke.position.set(x, .6, z);
      this.add(smoke, 1.9 + Math.random() * 1.6, fx => {
        const t = fx.age;
        smoke.position.set(x + Math.cos(a) * speed * t, .6 + t * 2.1, z + Math.sin(a) * speed * t);
        smoke.scale.setScalar(size * (.14 + t * .5));
        smoke.material.opacity = Math.max(0, .42 * (1 - t / fx.ttl));
      });
    }

    if (building) {
      // 建筑：二次连锁爆炸 + 火柱
      for (let i = 0; i < 3; i++) {
        const ox = x + rnd(-3, 3), oz = z + rnd(-3, 3);
        const pop = this.take('flash', '#ffd089');
        pop.position.set(ox, 1.4, oz);
        pop.scale.setScalar(.2);
        this.add(pop, .5, fx => {
          if (fx.age < .16 + i * .12) return;
          fx.o.scale.setScalar(2.4 + (fx.age - .2) * 9);
          fx.o.material.opacity = Math.max(0, .9 - fx.age * 2.2);
        }, 'flash');
      }
      for (let i = 0; i < this.count(6); i++) {
        const fire = this.take('fire', i % 2 ? '#ff8a3d' : '#ffcf6b');
        fire.position.set(x + rnd(-2.4, 2.4), .8, z + rnd(-2.4, 2.4));
        this.add(fire, .8 + Math.random() * .7, fx => {
          const t = fx.age;
          fx.o.position.y = .8 + t * 4.2;
          fx.o.scale.setScalar(.4 + t * 1.5);
          fx.o.material.opacity = Math.max(0, .85 * (1 - t / fx.ttl));
        }, 'fire');
      }
      this.shake(.6, x, z);
    } else {
      for (let i = 0; i < this.count(3); i++) {
        const fire = this.take('fire', i % 2 ? '#ff8a3d' : '#ffd06b');
        fire.position.set(x + rnd(-1, 1), .8, z + rnd(-1, 1));
        this.add(fire, .55 + Math.random() * .4, fx => {
          const t = fx.age;
          fx.o.position.y = .8 + t * 2.2;
          fx.o.scale.setScalar(.5 + t * 1.6);
          fx.o.material.opacity = Math.max(0, .85 * (1 - t / fx.ttl));
        }, 'fire');
      }
      this.flashLight(x, 1.2, z, '#ff9440', 130, .35, 26);
      for (let i = 0; i < this.count(5); i++) {
        const smoke = this.take('smoke', '#3d3a35');
        smoke.position.set(x + rnd(-.6, .6), .7, z + rnd(-.6, .6));
        this.add(smoke, 3.2 + Math.random() * 2.6, fx => {
          const t = fx.age;
          fx.o.position.y = .7 + t * 1.7;
          fx.o.position.x += Math.sin(t * 1.4 + i) * .02;
          fx.o.scale.setScalar(.5 + t * .8);
          fx.o.material.opacity = Math.max(0, .3 * (1 - t / fx.ttl));
        });
      }
      this.shake(.22, x, z);
    }
  }

  // ---------- 超武预警：地面收缩光环 + 落点光柱 ----------
  strikeWarning(d) {
    for (let i = 0; i < 3; i++) {
      const ring = this.take('ring', i === 0 ? '#ff6953' : '#ffb27a');
      ring.position.set(d.x, .25 + i * .03, d.z);
      ring.scale.setScalar(2 + i * 1.4);
      this.add(ring, 3.4, fx => {
        const t = fx.age / fx.ttl;
        fx.o.scale.setScalar((2 + i * 1.4) * (1 - t * .55));
        fx.o.material.opacity = (1 - t) * (.75 - i * .15);
      }, 'ring');
    }
    const pillar = this.take('beam', d.faction === 'soviet' ? '#ff8560' : '#8ef7ff');
    pillar.position.set(d.x, 14, d.z);
    pillar.scale.set(1.4, 28, 1.4);
    this.add(pillar, 3.4, fx => {
      const t = fx.age / fx.ttl;
      fx.o.material.opacity = .18 + Math.sin(t * Math.PI) * .5;
      fx.o.scale.x = 1.4 + Math.sin(t * Math.PI) * 1.2;
      fx.o.scale.z = fx.o.scale.x;
    }, 'beam');
  }

  // ---------- 超级武器 ----------
  supernova(d) {
    const nuke = d.faction === 'soviet';
    const color = nuke ? '#ff5e36' : '#8ef7ff';
    const lightColor = nuke ? '#ff7b45' : '#8cefff';

    // 1. 审判白光
    const pre = this.take('flash', nuke ? '#ffe9c8' : '#e8ffff');
    pre.position.set(d.x, 8, d.z);
    pre.scale.setScalar(3);
    this.add(pre, 1.5, fx => {
      fx.o.scale.setScalar(2.4 + fx.age * 9);
      fx.o.material.opacity = Math.max(0, .95 - fx.age / .55);
    }, 'flash');

    // 2. 中心火球
    for (let i = 0; i < this.count(7); i++) {
      const fire = this.take('fire', i % 2 ? color : '#ffd28a');
      fire.position.set(d.x + rnd(-4, 4), 1 + rnd(0, 3), d.z + rnd(-4, 4));
      this.add(fire, 1.2 + Math.random() * .9, fx => {
        const t = fx.age;
        fx.o.position.y = 2 + t * (7 + i * .5);
        fx.o.scale.setScalar(1.6 + t * 4.2);
        fx.o.material.opacity = Math.max(0, .9 * (1 - t / fx.ttl));
      }, 'fire');
    }

    // 3. 冲击波：三道错峰圆环
    for (let i = 0; i < 3; i++) {
      const ring = this.take('ring', i ? color : '#fff3d2');
      ring.position.set(d.x, .35 + i * .05, d.z);
      this.add(ring, 1.5 + i * .5, fx => {
        const t = fx.age / fx.ttl;
        fx.o.scale.setScalar(2 + t * (26 - i * 6));
        fx.o.material.opacity = .75 * (1 - t);
        if (fx.o.material.opacity > .05) fx.o.scale.z = fx.o.scale.x * .55;
      }, 'ring');
    }

    // 4. 光柱 / 蘑菇柄
    const pillar = this.take('beam', nuke ? '#ffb16d' : '#b9fcff');
    pillar.position.set(d.x, nuke ? 13 : 24, d.z);
    pillar.scale.set(nuke ? 9 : 14, nuke ? 30 : 52, nuke ? 9 : 14);
    this.add(pillar, nuke ? 2.6 : 1.6, fx => {
      const t = fx.age / fx.ttl;
      fx.o.material.opacity = (nuke ? .5 : .9) * (1 - t);
      fx.o.scale.x = (nuke ? 7 : 11) + fx.age * 4;
      fx.o.scale.z = fx.o.scale.x;
    }, 'beam');
    const halo = this.take('beam', nuke ? '#ff9b52' : '#a9f4ff');
    halo.position.set(d.x, nuke ? 12 : 22, d.z);
    halo.scale.set(nuke ? 22 : 30, nuke ? 26 : 46, nuke ? 22 : 30);
    this.add(halo, .9, fx => {
      const t = fx.age / fx.ttl;
      fx.o.material.opacity = .22 * (1 - t);
      fx.o.scale.x = (nuke ? 22 : 30) * (1 + t * .5);
      fx.o.scale.z = fx.o.scale.x;
    }, 'beam');

    // 5. 蘑菇云：火舌上升 → 云盖扩散
    for (let i = 0; i < this.count(24); i++) {
      const cap = i > this.count(24) * .45;
      const smoke = this.take('smoke', nuke && i % 3 === 0 ? '#6b5344' : '#5d5f54');
      const a = Math.random() * Math.PI * 2;
      const radius = cap ? 2 + Math.random() * 5 : Math.random() * 2.4;
      const sx = d.x + Math.cos(a) * radius, sz = d.z + Math.sin(a) * radius;
      const rise = cap ? 7 + Math.random() * 9 : 4 + Math.random() * 8;
      const spread = cap ? 4 + Math.random() * 5 : 1.2 + Math.random() * 2;
      const size = cap ? 2.6 + Math.random() * 2.2 : 1.8 + Math.random() * 1.6;
      const ttl = 4.2 + Math.random() * 3.4;
      smoke.position.set(sx, 1 + Math.random() * 3, sz);
      this.add(smoke, ttl, fx => {
        const t = fx.age;
        const e = 1 - Math.exp(-t * 1.5);
        fx.o.position.set(sx + Math.cos(a) * spread * e, 1 + rise * e, sz + Math.sin(a) * spread * e);
        fx.o.scale.setScalar(size * (.2 + t * .34));
        fx.o.material.opacity = Math.max(0, .16 * (1 - t / fx.ttl));
      });
    }

    // 6. 碎石雨
    for (let i = 0; i < this.count(34); i++) {
      const shard = this.take('shard', i % 3 === 0 ? '#ffde9d' : i % 3 === 1 ? '#a9937a' : '#4d4b42');
      const a = Math.random() * Math.PI * 2, speed = 6 + Math.random() * 18, scale = .1 + Math.random() * .08;
      shard.position.set(d.x, .6, d.z);
      shard.scale.setScalar(scale);
      this.add(shard, 1.3 + Math.random() * 1.6, fx => {
        const t = fx.age;
        shard.position.set(d.x + Math.cos(a) * speed * t, .6 + Math.sin(t * 5 + i) * 7 * t - 9 * t * t, d.z + Math.sin(a) * speed * t);
        shard.rotation.x += .24; shard.rotation.z += .18;
        shard.material.opacity = Math.max(0, 1 - t / fx.ttl);
      }, 'shard');
    }

    // 7. 地面火环
    for (let i = 0; i < this.count(14); i++) {
      const fire = this.take('fire', i % 2 ? '#ff7b33' : '#ffc350');
      const a = (i / this.count(14)) * Math.PI * 2 + rnd(-.2, .2);
      const dist = 7 + Math.random() * 9;
      fire.position.set(d.x + Math.cos(a) * dist * .2, .5, d.z + Math.sin(a) * dist * .2);
      this.add(fire, 1.1 + Math.random() * 1.4, fx => {
        const t = fx.age / fx.ttl;
        const travel = dist * (1 - Math.exp(-fx.age * 1.8));
        fx.o.position.x = d.x + Math.cos(a) * travel;
        fx.o.position.z = d.z + Math.sin(a) * travel;
        fx.o.position.y = .5 + t * 2.6;
        fx.o.scale.setScalar(.7 + t * 1.8);
        fx.o.material.opacity = Math.max(0, .8 * (1 - t));
      }, 'fire');
    }

    // 8. 双色点光
    const light = new T.PointLight(lightColor, 700, 90, 2);
    light.position.set(d.x, 8, d.z);
    light.visible = true;
    this.scene.add(light);
    this.add(light, 1.6, fx => { fx.o.intensity = 700 * Math.max(0, 1 - fx.age / fx.ttl); }, 'light');
    const warm = new T.PointLight('#ff9d4d', 320, 70, 2);
    warm.position.set(d.x, 3, d.z);
    warm.visible = true;
    this.scene.add(warm);
    this.add(warm, 2.6, fx => { fx.o.intensity = 320 * Math.max(0, 1 - fx.age / fx.ttl); }, 'light');

    // 9. 余烬烟柱
    for (let i = 0; i < this.count(10); i++) {
      const a = Math.random() * Math.PI * 2, dist = Math.random() * 10;
      const sx = d.x + Math.cos(a) * dist, sz = d.z + Math.sin(a) * dist;
      const smoke = this.take('smoke', '#3f3a34');
      smoke.position.set(sx, .6, sz);
      this.add(smoke, 2.4 + Math.random() * 2.4, fx => {
        const t = fx.age;
        fx.o.position.y = .6 + t * 3.4;
        fx.o.scale.setScalar(1.1 + t * .8);
        fx.o.material.opacity = Math.max(0, .18 * (1 - t / fx.ttl));
      });
    }

    this.shake(2.6, d.x, d.z);
  }

  // ================= 简单模式（性能模式使用）=================
  simpleEvent(type, d) {
    if (type === 'fire') return this.simpleShot(d);
    if (type === 'beam') return this.simpleShot({ ...d, kind: 'beam', faction: d.faction });
    if (type === 'impact' || type === 'death') {
      return this.simpleBurst(d.x, d.z, type === 'death' ? (d.building ? 4.2 : 2.1) : (d.size || 1.1), d.building ? '#ffb467' : d.kind === 'bullet' ? '#e6dfaa' : '#ff934f');
    }
    if (type === 'strikeWarning') {
      const ring = this.take('ring', '#ff6953');
      ring.position.set(d.x, .3, d.z);
      ring.scale.setScalar(2);
      this.add(ring, 3.2, fx => { fx.o.scale.setScalar(2 + fx.age * 1.3); fx.o.material.opacity = .65 * (1 - fx.age / fx.ttl); });
      return;
    }
    if (type === 'supernova') return this.simpleSupernova(d);
    if (type === 'spawn' && d.entity?.construct) this.simpleBurst(d.entity.x, d.entity.z, 2, '#b8b08b');
  }

  simpleShot(d) {
    const distance = Math.hypot(d.tx - d.x, d.tz - d.z);
    if (d.kind === 'energy' || d.kind === 'beam') {
      const beam = this.take('beam', d.faction === 'soviet' ? '#ff5847' : '#6df8ff');
      V.set(d.tx - d.x, 1.1, d.tz - d.z);
      const len = V.length();
      beam.position.set((d.x + d.tx) / 2, 1.8, (d.z + d.tz) / 2);
      beam.quaternion.setFromUnitVectors(UP, V.normalize());
      beam.scale.set(1.4, len, 1.4);
      this.add(beam, .22, fx => { fx.o.material.opacity = 1 - fx.age / fx.ttl; }, 'beam');
      const glow = this.take('flash', d.faction === 'soviet' ? '#ff9a70' : '#b0ffff');
      glow.position.set(d.tx, 1.6, d.tz);
      glow.scale.setScalar(.45);
      this.add(glow, .28, fx => { fx.o.scale.setScalar(.45 + fx.age * 3); fx.o.material.opacity = .65 * (1 - fx.age / fx.ttl); }, 'flash');
      return;
    }
    const travel = Math.max(.07, Math.min(1.2, distance / Math.max(8, d.speed || 60)));
    const bullet = this.take('bullet', d.kind === 'rocket' ? '#ff9d49' : d.kind === 'piercing' ? '#ffe4a0' : '#eaffdc');
    bullet.position.set(d.x, 1.8, d.z);
    bullet.scale.setScalar(d.kind === 'piercing' ? .12 : d.kind === 'rocket' ? .1 : .045);
    this.add(bullet, travel, fx => {
      const t = Math.min(1, fx.age / fx.ttl);
      fx.o.position.lerpVectors(new T.Vector3(d.x, 1.8, d.z), new T.Vector3(d.tx, 1, d.tz), t);
      fx.o.material.opacity = 1;
    }, 'bullet');
    const muzzle = this.take('flash', d.kind === 'rocket' ? '#ff9a4a' : d.kind === 'piercing' ? '#ffd984' : '#ecffe2');
    muzzle.position.set(d.x, 1.7, d.z);
    const size = d.kind === 'piercing' ? .38 : .23;
    muzzle.scale.setScalar(size);
    this.add(muzzle, .12, fx => { fx.o.material.opacity = Math.max(0, 1 - fx.age / fx.ttl); fx.o.scale.setScalar(size * (1 + fx.age * 2)); }, 'flash');
    if (d.kind === 'rocket') {
      for (let i = 1; i <= 3; i++) {
        const smoke = this.take('smoke', '#6c6256');
        const t = i / 4;
        smoke.position.set(d.x + (d.tx - d.x) * t, .9, d.z + (d.tz - d.z) * t);
        this.add(smoke, .7 + i * .18, fx => { fx.o.scale.setScalar(.18 + fx.age * .32); fx.o.material.opacity = .14 * (1 - fx.age / fx.ttl); });
      }
    }
  }

  simpleBurst(x, z, size, color) {
    const flash = this.take('flash', '#fff0be');
    flash.position.set(x, .8, z);
    this.add(flash, .27, fx => { fx.o.scale.setScalar(size * (.35 + fx.age * 2)); fx.o.material.opacity = 1 - fx.age / fx.ttl; });
    const ring = this.take('ring', color);
    ring.position.set(x, .15, z);
    this.add(ring, .8, fx => { fx.o.scale.setScalar(size * (.2 + fx.age * 1.6)); fx.o.material.opacity = .7 * (1 - fx.age / fx.ttl); });
    for (let i = 0; i < 5; i++) {
      const shard = this.take('shard', i % 2 ? '#5a5046' : '#f39546');
      const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 4;
      shard.position.set(x, .4 + Math.random() * .7, z);
      const start = shard.position.clone();
      this.add(shard, .5 + Math.random() * .55, fx => {
        shard.position.set(start.x + Math.cos(a) * v * fx.age, .4 + fx.age * (2 - fx.age * 1.6), start.z + Math.sin(a) * v * fx.age);
        shard.scale.setScalar(size * .12 * (1 - fx.age / fx.ttl));
        shard.material.opacity = 1 - fx.age / fx.ttl;
      });
    }
    for (let i = 0; i < 3; i++) {
      const smoke = this.take('smoke', '#554b43');
      const a = Math.random() * Math.PI * 2;
      smoke.position.set(x, .5, z);
      const start = smoke.position.clone();
      this.add(smoke, 1.7 + i * .3, fx => {
        const t = fx.age;
        smoke.position.set(start.x + Math.cos(a) * t * 1.1, .5 + t * 2, start.z + Math.sin(a) * t * 1.1);
        smoke.scale.setScalar(size * (.12 + t * .47));
        smoke.material.opacity = Math.max(0, .38 * (1 - t / fx.ttl));
      });
    }
  }

  simpleSupernova(d) {
    const nuke = d.faction === 'soviet', color = nuke ? '#ff5e36' : '#8ef7ff';
    this.simpleBurst(d.x, d.z, 11, nuke ? '#ff4b2d' : '#79edff');
    const flash = this.take('flash', nuke ? '#ffe6b6' : '#ddffff');
    flash.position.set(d.x, 6, d.z);
    flash.scale.setScalar(2);
    this.add(flash, 1.2, fx => { fx.o.scale.setScalar(2 + fx.age * 17); fx.o.material.opacity = Math.max(0, 1 - fx.age / fx.ttl); }, 'flash');
    for (let i = 0; i < 3; i++) {
      const ring = this.take('ring', color);
      ring.position.set(d.x, .45 + i * .02, d.z);
      this.add(ring, 1.3 + i * .35, fx => { fx.o.scale.setScalar(1 + fx.age * (8 - i * 2)); fx.o.material.opacity = .55 * (1 - fx.age / fx.ttl); }, 'ring');
    }
    if (!nuke) {
      const beam = this.take('beam', '#b9fcff');
      beam.position.set(d.x, 24, d.z);
      beam.scale.set(9, 52, 9);
      this.add(beam, 1.1, fx => { fx.o.material.opacity = .86 * (1 - fx.age / fx.ttl); fx.o.scale.x = 9 + fx.age * 3; fx.o.scale.z = 9 + fx.age * 3; }, 'beam');
    } else {
      const stem = this.take('beam', '#ffb16d');
      stem.position.set(d.x, 13, d.z);
      stem.scale.set(5, 30, 5);
      this.add(stem, 2.2, fx => { fx.o.material.opacity = .38 * (1 - fx.age / fx.ttl); fx.o.scale.x = 5 + fx.age * 5; fx.o.scale.z = 4 + fx.age * 4; }, 'beam');
    }
    for (let i = 0; i < 34; i++) {
      const angle = Math.random() * Math.PI * 2, radius = Math.random() * 13, size = 2 + Math.random() * 5;
      const smoke = this.take('smoke', nuke && i % 3 === 0 ? '#5a4438' : '#4e5148');
      const sx = d.x + Math.cos(angle) * radius * .35, sz = d.z + Math.sin(angle) * radius * .35;
      const wobble = Math.random() * 5;
      smoke.position.set(sx, 1 + Math.random() * 4, sz);
      const drift = Math.cos(angle) * (2 + Math.random() * 7), driftZ = Math.sin(angle) * (2 + Math.random() * 7);
      const ttl = 2.8 + Math.random() * 3.4;
      this.add(smoke, ttl, fx => {
        const t = fx.age;
        fx.o.position.set(sx + drift * t * .23, 1 + t * (3.2 + Math.sin(t * 2 + wobble) * .35), sz + driftZ * t * .23);
        fx.o.scale.setScalar(size * (.3 + t * .45));
        fx.o.material.opacity = Math.max(0, .3 * (1 - t / fx.ttl));
      });
    }
    for (let i = 0; i < 20; i++) {
      const shard = this.take('shard', i % 3 === 0 ? '#ffde9d' : i % 3 === 1 ? '#a9937a' : '#4d4b42');
      const angle = Math.random() * Math.PI * 2, speed = 6 + Math.random() * 18, scale = .1 + Math.random() * .06;
      shard.position.set(d.x, .5, d.z);
      this.add(shard, 1.2 + Math.random() * 1.5, fx => {
        const t = fx.age;
        fx.o.position.set(d.x + Math.cos(angle) * speed * t, .5 + Math.sin(t * 5 + i) * 6 * t - 9 * t * t, d.z + Math.sin(angle) * speed * t);
        fx.o.scale.setScalar(scale);
        fx.o.material.opacity = Math.max(0, 1 - t / fx.ttl);
      });
    }
    const light = new T.PointLight(nuke ? '#ff7b45' : '#8cefff', nuke ? 350 : 260, 80, 2);
    light.position.set(d.x, 7, d.z);
    light.visible = true;
    this.scene.add(light);
    this.add(light, 1.25, fx => { fx.o.intensity = (nuke ? 350 : 260) * Math.max(0, 1 - fx.age / fx.ttl); }, 'light');
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const fx = this.live[i];
      fx.age += dt;
      if (fx.age >= fx.ttl) { this.release(i); continue; }
      fx.update?.(fx);
    }
  }

  clear() {
    for (let i = this.live.length - 1; i >= 0; i--) this.release(i);
    this.pool = Object.fromEntries(Object.entries(this.pool).map(([k, v]) => {
      v.forEach(o => { o.geometry.dispose(); o.material.dispose(); });
      return [k, []];
    }));
  }
}
