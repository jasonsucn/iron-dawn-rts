// Headless simulation QA for the core game loop. No DOM/renderer dependency.
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';

function run(world, seconds) {
  const steps = Math.round(seconds * 30);
  for (let i = 0; i < steps; i++) world.tick(1 / 30);
}

function state(world) {
  return world.getState();
}

function findSite(world, type, player = 0) {
  for (let ring = 0; ring < 40; ring++) {
    for (let z = 24 + ring; z < 68 - ring; z += 2) {
      for (let x = -72 + ring; x < -18 - ring; x += 2) {
        const result = world.canPlace(type, player, x, z);
        if (result.ok) return { x, z };
      }
    }
  }
  return null;
}

const results = [];
function test(name, fn) {
  const started = performance.now();
  try {
    fn();
    results.push({ name, ok: true, ms: Math.round(performance.now() - started) });
    console.log(`PASS  ${name} (${Math.round(performance.now() - started)}ms)`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
}

test('initial skirmish is valid', () => {
  const w = new Game({ faction: 'allied', difficulty: 'recruit' });
  const s = state(w);
  assert.equal(s.status, 'playing');
  assert.equal(s.players.length, 2);
  assert.ok(s.players[0].credits >= 8000, 'player credits');
  assert.ok(s.players[0].buildings >= 4, 'starter base');
  assert.ok(w.list(0).some(e => e.type === 'harvester'), 'starter harvester');
  assert.ok(w.list(1).some(e => e.type === 'yard'), 'AI yard');
});

test('construction queue, prerequisites and placement', () => {
  const w = new Game({ faction: 'allied', difficulty: 'recruit' });
  assert.equal(w.economy.enqueue(0, 'factory'), true, 'factory should be enqueueable');
  // Give the simulation enough time and money to finish; the queue pays over time.
  w.players[0].credits = 30000;
  run(w, 30);
  const job = w.players[0].queues.structures[0];
  assert.ok(job && job.ready, 'factory should be ready');
  const site = findSite(w, 'factory');
  assert.ok(site, 'a legal factory site exists');
  const check = w.canPlace('factory', 0, site.x, site.z);
  assert.equal(check.ok, true, check.reason);
  assert.equal(w.economy.place(0, site.x, site.z), true);
  assert.ok(w.list(0).some(e => e.type === 'factory'), 'factory exists');
});

test('infantry and vehicle production spawn controllable units', () => {
  const w = new Game({ faction: 'allied', difficulty: 'recruit' });
  w.players[0].credits = 50000;
  // Factory is not in the starter base; build it instantly for this test.
  const site = findSite(w, 'factory');
  assert.ok(site, 'a legal factory site exists');
  w.spawn('factory', 0, site.x, site.z);
  assert.equal(w.economy.enqueue(0, 'rifle'), true);
  assert.equal(w.economy.enqueue(0, 'tank'), true);
  run(w, 20);
  assert.ok(w.list(0).filter(e => e.type === 'rifle').length >= 2, 'rifle spawned');
  assert.ok(w.list(0).some(e => e.type === 'tank'), 'tank spawned');
});

test('combat kills and awards stats', () => {
  const w = new Game({ faction: 'allied', difficulty: 'recruit' });
  w.players[0].credits = 50000;
  const target = w.spawn('rifle', 1, -15, 33);
  const attacker = w.spawn('tank', 0, -20, 33);
  w.order([attacker.id], target, 'attack');
  run(w, 20);
  assert.ok(target.dead, 'target should die');
  assert.ok(w.players[0].stats.kills >= 1, 'kill recorded');
});

test('AI builds, harvests and attacks within five minutes', () => {
  const w = new Game({ faction: 'allied', difficulty: 'veteran' });
  run(w, 300);
  const s = state(w);
  const ai = s.players[1];
  console.log('      AI 5min:', JSON.stringify({ buildings: ai.buildings, units: ai.units, credits: ai.credits, waves: s.aiWaves, status: s.status, harvested: ai.stats.harvested }));
  assert.ok(ai.buildings >= 5, 'AI expands beyond its yard');
  assert.ok(ai.units >= 6, 'AI produced units');
  assert.ok(ai.stats.harvested > 500, 'AI economy works');
  assert.ok(s.aiWaves >= 1 || s.status !== 'playing', 'AI attacks or wins');
});

test('player can win by eliminating the enemy command', () => {
  const w = new Game({ faction: 'allied', difficulty: 'recruit' });
  const enemyYard = w.list(1).find(e => e.type === 'yard');
  assert.ok(enemyYard);
  w.combat.damage(enemyYard, 99999, 'explosive', null, true);
  run(w, 0.1);
  assert.equal(w.status, 'victory');
});

test('superweapon charges and strikes', () => {
  const w = new Game({ faction: 'allied', difficulty: 'recruit' });
  w.players[0].credits = 50000;
  const sup = w.spawn('super', 0, -38, 34);
  sup.charge = 120;
  const enemy = w.spawn('tank', 1, 0, 0);
  assert.equal(w.combat.strike(0, 0, 0), true);
  run(w, 4);
  assert.ok(enemy.dead || enemy.hp < enemy.maxHp, 'superweapon damaged enemy');
});

test('nine minutes of simulation stays stable', () => {
  const w = new Game({ faction: 'soviet', difficulty: 'iron' });
  w.players[0].credits = 60000;
  // Let the AI play; keep the player from being instantly eliminated to exercise long play.
  for (let i = 0; i < 30; i++) {
    run(w, 18);
    for (const id of ['yard', 'power', 'refinery', 'barracks', 'factory']) {
      if (i === 0 && id === 'yard') continue;
      if (!w.list(0).some(e => e.type === id)) {
        const e = w.spawn(id, 0, -50 + Math.random() * 14, 38 + Math.random() * 14, { noHarvester: true });
        e.construct = false;
      }
    }
    if (w.status !== 'playing') break;
  }
  const s = state(w);
  console.log('      9min:', JSON.stringify({ status: s.status, time: Math.round(s.time), p0: s.players[0].stats, p1: s.players[1].stats, aiWaves: s.aiWaves, units: [s.players[0].units, s.players[1].units] }));
  assert.ok(Number.isFinite(s.time));
});

console.log('\nSUMMARY', JSON.stringify(results, null, 2));
if (results.some(r => !r.ok)) process.exitCode = 1;
