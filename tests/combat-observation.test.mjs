import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSim, snapshot, step } from '../dist/game/sim.js';
import { enemyContact, impactContact, shotLaunch } from '../dist/game/combat-observation.js';

function fight(cat, dx, dy, hp) {
  const state = createSim({ cat, seed: 7 });
  const target = {
    id: 1, kind: 'ink-blob', x: state.player.x + dx, y: state.player.y + dy,
    alive: true, hp, maxHp: hp, spawnTime: 0, slowTime: 0, orbitCooldown: 0,
  };
  state.enemies = [target];
  state.nextEnemyId = 2;
  state.spawnTimer = 600;
  state.wavesDone = 99;
  state.boss.spawned = true;
  state.player.attackCooldown = 0;
  return { state, target };
}
const tick = state => step(state, { ax: 0, ay: 0 }, 1/60);

test('sound blade launch and swept contact are tied to the real projectile', () => {
  const { state, target } = fight('zero', 130, 0, 5);
  tick(state);
  const shot = state.shots[0], launch = shotLaunch(shot);
  assert.ok(launch);
  assert.equal(launch.x, state.player.x + 14);
  assert.equal(launch.y, state.player.y);
  assert.equal(launch.dx, 1);
  for (let i = 0; i < 40 && target.hp === 5; i++) tick(state);
  assert.equal(target.hp, 4);
  const impact = state.impacts.find(e => e.kind === 'hit');
  const contact = impactContact(impact);
  assert.equal(contact, enemyContact(target));
  assert.equal(contact.family, 'bolt');
  assert.equal(contact.dx, 1);
  assert.ok(Math.abs(contact.x - (impact.x - contact.radius)) < .01);
  assert.equal(contact.y, impact.y);
  const saved = structuredClone(state);
  assert.deepEqual(snapshot(saved), snapshot(state));
  assert.equal(impactContact(saved.impacts.find(e => e.kind === 'hit')), undefined, 'presentation is absent from replay state');
});

test('moon-star contact remains tied to the star after the enemy is pushed', () => {
  const { state, target } = fight('nicole', 47, 0, 6);
  tick(state);
  const hit = state.impacts.find(e => e.kind === 'hit');
  const contact = impactContact(hit);
  assert.equal(contact.family, 'orbit');
  assert.equal(contact, enemyContact(target));
  assert.ok(Math.abs(Math.hypot(contact.dx, contact.dy) - 1) < 1e-6);
  assert.ok(contact.dy > .9, 'the first star is moving down on the right side of the orbit');
  assert.ok(Math.hypot(contact.x - hit.x, contact.y - hit.y) <= contact.radius);
  assert.ok(target.x > hit.x, 'contact precedes the existing knockback');
});

test('star fall produces a ground strike and its fatal contact in the same fixed step', () => {
  const { state, target } = fight('nicole', 120, 0, 1);
  state.upgrades['star-fall'] = 1;
  state.build.weapons.push('star-fall');
  tick(state);
  const strike = state.impacts.find(e => e.kind === 'star-fall');
  const death = state.impacts.find(e => e.kind === 'defeat');
  const scraps = state.impacts.find(e => e.kind === 'dissolve');
  assert.equal(target.alive, false);
  assert.ok(strike && death && scraps);
  assert.equal(strike.x, death.x);
  assert.equal(strike.y, death.y);
  assert.equal(impactContact(death).family, 'star-fall');
  assert.equal(impactContact(death), impactContact(scraps));
});
