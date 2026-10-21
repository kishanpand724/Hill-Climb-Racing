import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VEHICLES,
  createDefaultProgress,
  getEffectiveVehicleStats,
  getUpgradeCost,
  purchaseUpgrade,
  unlockOrSelectVehicle,
} from './vehicles';
import { getTerrainHeight, getTerrainHeightAndSlope, TerrainWorld } from './terrain';
import { createInitialCarState, stepCarPhysics } from './physics';

test('procedural terrain generates continuous heights and valid slopes', () => {
  const h0 = getTerrainHeight(0);
  const h500 = getTerrainHeight(500);
  const h2000 = getTerrainHeight(2000);
  assert.equal(typeof h0, 'number');
  assert.ok(!Number.isNaN(h500));
  assert.ok(!Number.isNaN(h2000));

  const info = getTerrainHeightAndSlope(600);
  assert.ok(Math.abs(info.slope) < Math.PI / 2);
  assert.ok(Math.abs(Math.hypot(info.nx, info.ny) - 1) < 1e-5);
});

test('terrain world spawns both coins and fuel cans ahead of the player', () => {
  const world = new TerrainWorld();
  world.ensureGeneratedUpTo(5000);
  const coins = world.pickups.filter((p) => p.type === 'coin');
  const fuels = world.pickups.filter((p) => p.type === 'fuel');
  assert.ok(coins.length >= 10, 'Expected multiple coins spawned');
  assert.ok(fuels.length >= 2, 'Expected fuel cans spawned along road');
});

test('vehicle upgrades deduct coins and boost effective stats', () => {
  let progress = createDefaultProgress();
  const initialCoins = progress.coins;
  const spec = VEHICLES[0];
  const baseStats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id]);

  const cost = getUpgradeCost('engine', 1);
  assert.ok(initialCoins >= cost);

  progress = purchaseUpgrade(progress, spec.id, 'engine');
  assert.equal(progress.coins, initialCoins - cost);
  assert.equal(progress.upgrades[spec.id].engine, 2);

  const upgradedStats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id]);
  assert.ok(upgradedStats.engineForce > baseStats.engineForce);
  assert.ok(upgradedStats.maxSpeed > baseStats.maxSpeed);
});

test('vehicle unlock and selection works properly', () => {
  let progress = createDefaultProgress();
  progress.coins = 1000;
  const buggy = VEHICLES[1];
  progress = unlockOrSelectVehicle(progress, buggy.id);
  assert.equal(progress.selectedVehicleId, buggy.id);
  assert.ok(progress.unlockedVehicles.includes(buggy.id));
  assert.equal(progress.coins, 1000 - buggy.unlockCost);
});

test('car physics accelerates forward, spins wheels, consumes fuel, and collects pickups', () => {
  const spec = VEHICLES[0];
  const progress = createDefaultProgress();
  const stats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id]);
  const car = createInitialCarState(spec, stats);
  const world = new TerrainWorld();

  // Place a coin directly ahead of the car
  world.pickups.push({
    id: 9999,
    x: 60,
    y: car.y,
    type: 'coin',
    value: 25,
    collected: false,
    collectAnim: 0,
  });

  const initialFuel = car.fuel;
  for (let i = 0; i < 45; i++) {
    stepCarPhysics(
      car,
      spec,
      stats,
      { accelerate: true, brakeReverse: false, hardBrake: false },
      world.pickups,
      1 / 60
    );
  }

  assert.ok(car.x > 40, `Expected car to move forward, got x=${car.x}`);
  assert.ok(car.vx > 50, `Expected positive forward velocity, got vx=${car.vx}`);
  assert.ok(car.fuel < initialFuel, 'Expected fuel to decrease while driving');
  assert.ok(car.runCoins >= 25, 'Expected coin to be collected');

  // Continue driving for another 195 frames (total 4 seconds) and verify car stays upright and passes 45m
  for (let i = 0; i < 195; i++) {
    stepCarPhysics(
      car,
      spec,
      stats,
      { accelerate: true, brakeReverse: false, hardBrake: false },
      world.pickups,
      1 / 60
    );
  }
  assert.equal(car.crashed, false, 'Expected car not to crash during opening 4s of driving');
  assert.ok(car.distanceMeters >= 40, `Expected car to pass 40m, got ${car.distanceMeters}m`);
});

test('car physics detects upside-down crash and out-of-fuel end states', () => {
  const spec = VEHICLES[0];
  const progress = createDefaultProgress();
  const stats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id]);
  const car = createInitialCarState(spec, stats);

  // Flip car upside down onto the ground
  car.angle = Math.PI;
  car.y = getTerrainHeight(car.x) - 5;
  car.vy = 200;

  const events = stepCarPhysics(
    car,
    spec,
    stats,
    { accelerate: false, brakeReverse: false, hardBrake: false },
    [],
    0.05
  );

  assert.equal(car.crashed, true);
  assert.equal(car.gameOverReason, 'crashed');
  assert.equal(events.justCrashed, true);

  // Test out of fuel state
  const car2 = createInitialCarState(spec, stats);
  car2.fuel = 0;
  for (let i = 0; i < 40; i++) {
    stepCarPhysics(
      car2,
      spec,
      stats,
      { accelerate: false, brakeReverse: false, hardBrake: false },
      [],
      0.05
    );
  }
  assert.equal(car2.outOfFuel, true);
  assert.equal(car2.gameOverReason, 'fuel');
});
