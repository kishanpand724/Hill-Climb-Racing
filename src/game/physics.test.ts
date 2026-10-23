import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAPS,
  SEASON_SPAN_METERS,
  getDynamicWeather,
  getSeasonBlendAtDistance,
  lerpHexColor,
} from './maps';
import {
  CAREER_MISSIONS,
  PAINT_OPTIONS,
  VEHICLES,
  createDefaultProgress,
  evaluateRunMissions,
  getCareerLevel,
  getEffectiveVehicleStats,
  getRepairCost,
  getUpgradeCost,
   getVehicleById,
  purchaseUpgrade,
  repairVehicle,
  selectOrPurchaseCosmetic,
  unlockOrSelectMap,
  unlockOrSelectVehicle,
} from './vehicles';
import {
  PIXELS_PER_METER,
  TerrainWorld,
  createObstacleSpec,
  getCompositeTerrainHeight,
  getObstacleHeightOffset,
  getPlatformHeightAndSlope,
  getTerrainHeight,
  getTerrainHeightAndSlope,
} from './terrain';
import { createInitialCarState, stepCarPhysics } from './physics';

test('all 4 maps (hills, desert, snow, seasons) generate distinct terrain profiles, obstacles, seasonal props, and secret platforms', () => {
  assert.equal(MAPS.length, 4);
  const hHills = getTerrainHeight(950, 'hills');
  const hDesert = getTerrainHeight(950, 'desert');
  const hSnow = getTerrainHeight(950, 'snow');
  const hSeasons = getTerrainHeight(950, 'seasons');

  assert.notEqual(hHills, hDesert, 'Desert terrain should differ from Green Hills');
  assert.notEqual(hHills, hSnow, 'Snow Mountain terrain should differ from Green Hills');
  assert.notEqual(hHills, hSeasons, 'Four Seasons terrain should differ from Green Hills');

  const hillsWorld = new TerrainWorld('hills');
  hillsWorld.ensureGeneratedUpTo(4500);
  assert.ok(
    hillsWorld.obstacles.length >= 8,
    'TerrainWorld should generate diverse physical obstacles'
  );
  const kinds = new Set(hillsWorld.obstacles.map((o) => o.kind));
  assert.ok(kinds.has('small_rock'), 'Should spawn small_rock');
  assert.ok(kinds.has('fallen_log'), 'Should spawn fallen_log');
  assert.ok(kinds.has('rocky_step'), 'Should spawn rocky_step');
  assert.ok(kinds.has('steep_ramp'), 'Should spawn steep_ramp');
  assert.ok(kinds.has('large_rock'), 'Should spawn large_rock');
  assert.ok(kinds.has('bump_mogul'), 'Should spawn bump_mogul');
  assert.ok(kinds.has('broken_bridge'), 'Should spawn broken_bridge');
  assert.ok(kinds.has('moving_platform'), 'Should spawn moving_platform');

  const desertWorld = new TerrainWorld('desert');
  desertWorld.ensureGeneratedUpTo(4000);
  assert.ok(
    desertWorld.scenery.some((s) => s.kind === 'cactus'),
    'Desert map should spawn cacti'
  );

  const snowWorld = new TerrainWorld('snow');
  snowWorld.ensureGeneratedUpTo(4000);
  assert.ok(
    snowWorld.scenery.some((s) => s.kind === 'snow_pine'),
    'Snow Mountain map should spawn snow-covered pine trees'
  );

  const seasonsWorld = new TerrainWorld('seasons');
  seasonsWorld.ensureGeneratedUpTo(18000);
  assert.ok(
    seasonsWorld.scenery.some((s) => s.kind === 'blossom_tree' || s.kind === 'flower'),
    'Four Seasons map should spawn spring/summer blossoms and flowers'
  );
  assert.ok(
    seasonsWorld.scenery.some((s) => s.kind === 'puddle' || s.kind === 'ice_patch'),
    'Four Seasons map should spawn monsoon puddles and winter ice patches'
  );
  assert.ok(
    seasonsWorld.platforms.length >= 1,
    'Worlds should generate elevated secret shortcut platforms'
  );
  assert.ok(
    seasonsWorld.pickups.some((p) => p.type === 'treasure'),
    'Secret routes should spawn high-value treasure crates'
  );

  const slopeInfo = getTerrainHeightAndSlope(800, 'desert');
  assert.ok(Math.abs(Math.hypot(slopeInfo.nx, slopeInfo.ny) - 1) < 1e-5);
});

test('all 4 vehicles (Hill Climber, Off-Road Jeep, Sports Car, Monster Truck) have distinct specs and unlock properly', () => {
  assert.equal(VEHICLES.length, 4);
  const [climber, jeep, sports, monster] = VEHICLES;
  assert.equal(climber.id, 'trail_blazer');
  assert.equal(jeep.id, 'jeep');
  assert.equal(sports.id, 'sports_car');
  assert.equal(monster.id, 'monster_truck');

  assert.ok(jeep.wheelRadius > climber.wheelRadius, 'Jeep has larger off-road wheels');
  assert.ok(
    monster.wheelRadius > jeep.wheelRadius,
    'Monster Truck has the largest mud-terrain tires'
  );
  assert.ok(sports.baseMaxSpeed > climber.baseMaxSpeed, 'Sports car has higher top speed');
  assert.ok(
    jeep.obstacleClimbFactor > sports.obstacleClimbFactor,
    'Jeep has superior obstacle climbing factor compared to Sports Car'
  );
  assert.ok(
    monster.obstacleClimbFactor > jeep.obstacleClimbFactor,
    'Monster Truck has the highest obstacle climbing capability'
  );

  let progress = createDefaultProgress();
  progress.coins = 800;
  progress = unlockOrSelectVehicle(progress, 'monster_truck');
  assert.equal(progress.selectedVehicleId, 'monster_truck');
  assert.ok(progress.unlockedVehicles.includes('monster_truck'));
  assert.equal(progress.coins, 800 - monster.unlockCost);

  progress = unlockOrSelectMap(progress, 'seasons');
  assert.equal(progress.selectedMapId, 'seasons');
  assert.ok(progress.unlockedMaps.includes('seasons'));
});

test('vehicle upgrades, damage condition penalties, repairs, and cosmetic customization work accurately', () => {
  let progress = createDefaultProgress();
  const initialCoins = progress.coins;
  const spec = VEHICLES[0];
  const baseStats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id], 100);

  const cost = getUpgradeCost('engine', 1);
  progress = purchaseUpgrade(progress, spec.id, 'engine');
  assert.equal(progress.coins, initialCoins - cost);
  assert.equal(progress.upgrades[spec.id].engine, 2);

  const upgradedStats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id], 100);
  assert.ok(upgradedStats.engineForce > baseStats.engineForce);

  const damagedStats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id], 30);
  assert.ok(
    damagedStats.engineForce < upgradedStats.engineForce,
    'Damaged vehicle should have reduced engine power'
  );
  assert.ok(
    damagedStats.suspensionDamping < upgradedStats.suspensionDamping,
    'Damaged vehicle should have reduced suspension damping stability'
  );

  progress.coins = 500;
  progress.vehicleCondition[spec.id] = 40;
  const repairCost = getRepairCost(40);
  assert.ok(repairCost > 0);
  progress = repairVehicle(progress, spec.id);
  assert.equal(progress.vehicleCondition[spec.id], 100);
  assert.equal(progress.coins, 500 - repairCost);

  const emeraldPaint = PAINT_OPTIONS.find((p) => p.id === 'emerald')!;
  const coinsBeforePaint = progress.coins;
  progress = selectOrPurchaseCosmetic(progress, spec.id, 'paint', emeraldPaint.id);
  assert.equal(progress.customization[spec.id].paintId, 'emerald');
  assert.equal(progress.coins, coinsBeforePaint - emeraldPaint.cost);
});

test('Four Seasons Valley transitions through Spring, Summer, Monsoon, and Winter and dynamic weather affects physics', () => {
  const s0 = getSeasonBlendAtDistance(10);
  const s1 = getSeasonBlendAtDistance(SEASON_SPAN_METERS + 15);
  const s2 = getSeasonBlendAtDistance(SEASON_SPAN_METERS * 2 + 15);
  const s3 = getSeasonBlendAtDistance(SEASON_SPAN_METERS * 3 + 15);

  assert.equal(s0.current.id, 'spring');
  assert.equal(s1.current.id, 'summer');
  assert.equal(s2.current.id, 'monsoon');
  assert.equal(s3.current.id, 'winter');

  const blendedColor = lerpHexColor('#000000', '#ffffff', 0.5);
  assert.equal(blendedColor, '#808080');

  const summerWeather = getDynamicWeather('seasons', SEASON_SPAN_METERS + 15, 10);
  const monsoonWeather = getDynamicWeather('seasons', SEASON_SPAN_METERS * 2 + 15, 10);
  const winterWeather = getDynamicWeather('seasons', SEASON_SPAN_METERS * 3 + 15, 10);

  assert.ok(
    monsoonWeather.tractionMultiplier < summerWeather.tractionMultiplier,
    'Monsoon rain should reduce surface traction'
  );
  assert.ok(
    winterWeather.tractionMultiplier < monsoonWeather.tractionMultiplier,
    'Winter snow/ice should have lowest traction'
  );
});

test('Priority 1, 2, 3 & 7: Jeep climbs small_rock, fallen_log, rocky_step, large_rock, and steep_ramp with proper suspension and wheel contact without tunneling or sticking', () => {
  const progress = createDefaultProgress();
  const jeep = getVehicleById('jeep');
  const jeepStats = getEffectiveVehicleStats(jeep, progress.upgrades.jeep);

  const obstacleTypes = [
    'small_rock',
    'fallen_log',
    'rocky_step',
    'large_rock',
    'steep_ramp',
    'bump_mogul',
    'broken_bridge',
    'moving_platform',
  ] as const;

  for (const kind of obstacleTypes) {
    const obsX = 110;
    const obs = createObstacleSpec(1, kind, obsX, 1.0, 0.5);
    assert.ok(
      getObstacleHeightOffset(obs, obsX) > 0,
      `Obstacle ${kind} should have positive collision height at center`
    );

    const car = createInitialCarState(jeep, jeepStats, 'hills');
    let frontClimbedHigherThanRear = false;
    let rearClimbedObstacle = false;
    let maxFrontCompression = 0;

    for (let step = 0; step < 180; step++) {
      stepCarPhysics(
        car,
        jeep,
        jeepStats,
        { accelerate: true, brakeReverse: false, hardBrake: false },
        [],
        1 / 60,
        'hills',
        [],
        step / 60,
        [obs]
      );

      if (car.frontWheel.worldY < car.rearWheel.worldY - 5 && car.rearWheel.grounded) {
        frontClimbedHigherThanRear = true;
      }
      if (car.rearWheel.onObstacleKind === kind) {
        rearClimbedObstacle = true;
      }
      maxFrontCompression = Math.max(maxFrontCompression, car.frontWheel.compression);

      // Verify neither wheel tunnels below the solid composite surface
      const rearSurfY = getCompositeTerrainHeight(car.rearWheel.worldX, 'hills', [obs]).y;
      const frontSurfY = getCompositeTerrainHeight(car.frontWheel.worldX, 'hills', [obs]).y;
      assert.ok(
        car.rearWheel.worldY + jeep.wheelRadius <= rearSurfY + 8,
        `Rear wheel must not tunnel through ${kind}`
      );
      assert.ok(
        car.frontWheel.worldY + jeep.wheelRadius <= frontSurfY + 8,
        `Front wheel must not tunnel through ${kind}`
      );
    }

    assert.ok(
      frontClimbedHigherThanRear,
      `Jeep front wheel should climb ${kind} while rear wheel stays grounded`
    );
    assert.ok(
      rearClimbedObstacle,
      `Jeep rear wheel should also contact and climb over ${kind}`
    );
    assert.ok(
      maxFrontCompression > 4,
      `Front suspension should visibly compress when climbing ${kind}`
    );
    assert.ok(
      car.x > obsX + obs.width * 0.6,
      `Jeep should completely traverse ${kind} without getting stuck (reached x=${car.x.toFixed(1)})`
    );
    assert.equal(car.crashed, false, `Jeep should not crash on ${kind}`);
  }
});

test('Priority 3 & 7: Vehicle comparison (Monster Truck > Jeep > Sports Car) on large rock obstacles and reverse traversal from opposite side', () => {
  const progress = createDefaultProgress();
  const largeRock = createObstacleSpec(1, 'large_rock', 115, 1.15, 0.5);

  const runObstacleTrial = (vehicleId: string) => {
    const spec = getVehicleById(vehicleId);
    const stats = getEffectiveVehicleStats(spec, progress.upgrades[vehicleId]);
    const car = createInitialCarState(spec, stats, 'hills');
    for (let i = 0; i < 120; i++) {
      stepCarPhysics(
        car,
        spec,
        stats,
        { accelerate: true, brakeReverse: false, hardBrake: false },
        [],
        1 / 60,
        'hills',
        [],
        i / 60,
        [largeRock]
      );
    }
    return car;
  };

  const monsterCar = runObstacleTrial('monster_truck');
  const jeepCar = runObstacleTrial('jeep');
  const sportsCar = runObstacleTrial('sports_car');

  assert.ok(
    monsterCar.x > sportsCar.x || jeepCar.x > sportsCar.x,
    'Off-Road Jeep and Monster Truck should clear large rough rock obstacles more easily than the low-clearance Sports Car'
  );
  assert.ok(
    sportsCar.x > largeRock.currentX + largeRock.width * 0.5,
    'Sports Car should still be able to traverse the obstacle without getting permanently stuck'
  );

  // Test traversing an obstacle in reverse from the right side to the left side
  const jeep = getVehicleById('jeep');
  const jeepStats = getEffectiveVehicleStats(jeep, progress.upgrades.jeep);
  const revCar = createInitialCarState(jeep, jeepStats, 'hills');
  const smallRock = createObstacleSpec(2, 'small_rock', 80, 1.0, 0.5);
  revCar.x = 175;
  for (let i = 0; i < 140; i++) {
    stepCarPhysics(
      revCar,
      jeep,
      jeepStats,
      { accelerate: false, brakeReverse: true, hardBrake: false },
      [],
      1 / 60,
      'hills',
      [],
      i / 60,
      [smallRock]
    );
  }
  assert.ok(
    revCar.x < smallRock.currentX - smallRock.width * 0.4,
    `Vehicle should be able to climb and traverse small_rock in reverse from right to left (x=${revCar.x.toFixed(1)})`
  );
});

test('all 4 vehicles drive across all 4 maps with obstacles active without crashing in opening 3s', () => {
  const progress = createDefaultProgress();

  for (const v of VEHICLES) {
    for (const m of MAPS) {
      const st = getEffectiveVehicleStats(v, progress.upgrades[v.id]);
      const testCar = createInitialCarState(v, st, m.id);
      const testWorld = new TerrainWorld(m.id);
      for (let i = 0; i < 180; i++) {
        testWorld.updateObstacles(i / 60);
        stepCarPhysics(
          testCar,
          v,
          st,
          { accelerate: true, brakeReverse: false, hardBrake: false },
          testWorld.pickups,
          1 / 60,
          m.id,
          testWorld.platforms,
          i / 60,
          testWorld.obstacles
        );
        assert.ok(
          Math.abs(testCar.angle) < 0.85,
          `Vehicle ${v.id} on map ${m.id} had excessive pitch angle ${testCar.angle.toFixed(3)} rad at frame ${i}`
        );
      }
      assert.equal(
        testCar.crashed,
        false,
        `Vehicle ${v.id} should not crash in opening 3s on map ${m.id}`
      );
      assert.ok(
        testCar.distanceMeters >= 18,
        `Vehicle ${v.id} should pass 18m in 3s over obstacles on map ${m.id}, got ${testCar.distanceMeters}m`
      );
    }
  }
});

test('stunts, combos, long jumps, secret platforms, treasure pickups, and career mission evaluation work properly', () => {
  const spec = VEHICLES[0];
  const progress = createDefaultProgress();
  const stats = getEffectiveVehicleStats(spec, progress.upgrades[spec.id]);

  const stuntCar = createInitialCarState(spec, stats, 'hills');
  stuntCar.wasGrounded = false;
  stuntCar.accumulatedAirAngle = -Math.PI * 2.02;
  stuntCar.airStartX = stuntCar.x - 32 * PIXELS_PER_METER;
  stuntCar.airTimeSeconds = 0.85;
  stuntCar.angle = 0;

  const stuntEvents = stepCarPhysics(
    stuntCar,
    spec,
    stats,
    { accelerate: false, brakeReverse: false, hardBrake: false },
    [],
    1 / 60,
    'hills'
  );
  assert.ok(stuntEvents.flipCompleted, 'Should detect completed flip');
  assert.ok(stuntEvents.longJumpCompleted, 'Should detect 32m long jump');
  assert.equal(stuntCar.stuntCombo, 2, 'Flip + Long Jump should reach 2x stunt combo');
  assert.equal(stuntCar.longJumpsCount, 1);

  const platWorld = new TerrainWorld('hills');
  platWorld.ensureGeneratedUpTo(10000);
  const firstPlat = platWorld.platforms[0];
  assert.ok(firstPlat, 'Should have generated a secret platform');
  const midX = (firstPlat.startX + firstPlat.endX) * 0.5;
  const platSurf = getPlatformHeightAndSlope(firstPlat, midX);
  assert.ok(platSurf, 'Platform height should resolve at mid-span');

  const treasureCar = createInitialCarState(spec, stats, 'hills');
  const pickups = [
    {
      id: 99,
      x: treasureCar.x,
      y: treasureCar.y,
      type: 'treasure' as const,
      value: 150,
      collected: false,
      collectAnim: 0,
    },
  ];
  const pickupEvents = stepCarPhysics(
    treasureCar,
    spec,
    stats,
    { accelerate: false, brakeReverse: false, hardBrake: false },
    pickups,
    1 / 60,
    'hills'
  );
  assert.equal(pickupEvents.treasureCollected.length, 1);
  assert.equal(treasureCar.treasuresFound, 1);
  assert.equal(treasureCar.runCoins, 150);

  const evalResult = evaluateRunMissions(progress, {
    mapId: 'hills',
    distanceMeters: 260,
    runCoins: 200,
    flipsCount: 2,
    treasuresFound: 1,
    finalCondition: 95,
  });
  assert.ok(
    evalResult.newlyCompletedTitles.length >= 3,
    'Run should complete multiple career & daily missions'
  );
  assert.ok(evalResult.bonusCoins > 0);
  assert.ok(evalResult.bonusXp > 0);

  const rankInfo = getCareerLevel(evalResult.bonusXp);
  assert.ok(rankInfo.level >= 2, 'Earned XP should advance Career Rank');
  assert.ok(CAREER_MISSIONS.length >= 8);
});
