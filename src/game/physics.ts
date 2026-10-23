import { getDynamicWeather, getMapById } from './maps';
import {
  getCompositeSurfaceInfo,
  getCompositeTerrainHeight,
  getPlatformHeightAndSlope,
  getTerrainHeight,
  PIXELS_PER_METER,
} from './terrain';
import {
  CarState,
  EffectiveStats,
  MapId,
  ObstacleKind,
  PickupItem,
  SecretPlatform,
  TerrainObstacle,
  VehicleSpec,
} from './types';

export const GRAVITY = 820; // px/s^2

export interface PhysicsInput {
  accelerate: boolean;
  brakeReverse: boolean;
  hardBrake: boolean;
}

export interface PhysicsStepEvents {
  coinsCollected: { x: number; y: number; value: number }[];
  fuelCollected: { x: number; y: number }[];
  treasureCollected: { x: number; y: number; value: number }[];
  landedHard: { impactSpeed: number; x: number; y: number; damageTaken: number } | null;
  obstacleImpact: {
    kind: ObstacleKind;
    impactSpeed: number;
    x: number;
    y: number;
  } | null;
  flipCompleted: {
    count: number;
    bonusCoins: number;
    combo: number;
    label: string;
    x: number;
    y: number;
  } | null;
  longJumpCompleted: {
    meters: number;
    bonusCoins: number;
    combo: number;
    label: string;
    x: number;
    y: number;
  } | null;
  comboBroken: boolean;
  justJumped: boolean;
  justCrashed: boolean;
  justOutOfFuel: boolean;
}

export function normalizeAngle(angle: number): number {
  let a = (angle + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export function createInitialCarState(
  spec: VehicleSpec,
  stats: EffectiveStats,
  mapId: MapId = 'hills',
  initialCondition = 100
): CarState {
  const startX = 0;
  const groundY = getTerrainHeight(startX, mapId);
  const eqComp = (GRAVITY * 3.6) / (2 * stats.suspensionStiffness);
  const startY =
    groundY -
    spec.wheelRadius -
    spec.chassisHeight * 0.25 -
    (stats.suspensionRestLength - eqComp);
  const halfBase = spec.wheelBase * 0.5;
  const clampedCond = Math.max(15, Math.min(100, initialCondition));

  return {
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVel: 0,
    rearWheel: {
      worldX: startX - halfBase,
      worldY: groundY - spec.wheelRadius,
      groundY,
      compression: eqComp,
      prevCompression: eqComp,
      grounded: true,
      spinAngle: 0,
      angularVel: 0,
      contactNormalX: 0,
      contactNormalY: -1,
      contactFriction: 1,
      onObstacleKind: null,
    },
    frontWheel: {
      worldX: startX + halfBase,
      worldY: groundY - spec.wheelRadius,
      groundY,
      compression: eqComp,
      prevCompression: eqComp,
      grounded: true,
      spinAngle: 0,
      angularVel: 0,
      contactNormalX: 0,
      contactNormalY: -1,
      contactFriction: 1,
      onObstacleKind: null,
    },
    fuel: stats.fuelCapacity,
    maxFuel: stats.fuelCapacity,
    condition: clampedCond,
    distanceMeters: 0,
    maxDistanceMeters: 0,
    runCoins: 0,
    pickupCoins: 0,
    flipBonusCoins: 0,
    flipsCount: 0,
    longJumpsCount: 0,
    stuntCombo: 0,
    maxStuntCombo: 0,
    treasuresFound: 0,
    rpm: 950,
    airTimeSeconds: 0,
    airStartX: startX,
    accumulatedAirAngle: 0,
    wasGrounded: true,
    onSecretRoute: false,
    upsideDownTimer: 0,
    outOfFuelTimer: 0,
    crashed: false,
    outOfFuel: false,
    gameOverReason: 'none',
    crashDetail: undefined,
    driverHeadLagAngle: 0,
    driverHeadLagVel: 0,
    squashX: 1,
    squashY: 1,
    throttle: 0,
    braking: false,
  };
}

interface WheelContactResult {
  y: number; // Effective ground Y directly under wheel center so wheel center sits at y - wheelRadius
  contactX: number;
  contactY: number;
  penetration: number;
  slope: number;
  nx: number;
  ny: number;
  friction: number;
  restitution: number;
  isPlatform: boolean;
  obstacle: TerrainObstacle | null;
  obstacleVx: number;
  obstacleVy: number;
}

const WHEEL_ARC_SAMPLES = [-0.84, -0.64, -0.42, -0.2, 0, 0.2, 0.42, 0.64, 0.84];

/**
 * Resolves true 2D circle-vs-composite-surface contact across the full lower arc of a wheel.
 * Ensures the front and rear of the tire detect obstacle edges, rocks, logs, and steps
 * smoothly before the wheel hub center crosses them.
 */
function resolveWheelCircleContact(
  wheelCenterX: number,
  wheelMaxCenterY: number,
  wheelRadius: number,
  carVy: number,
  mapId: MapId,
  platforms: SecretPlatform[],
  obstacles: TerrainObstacle[]
): WheelContactResult {
  // 1. Check one-way elevated secret platforms first
  for (let i = 0; i < platforms.length; i++) {
    const plat = platforms[i];
    if (wheelCenterX >= plat.startX && wheelCenterX <= plat.endX) {
      const platSurf = getPlatformHeightAndSlope(plat, wheelCenterX);
      const wheelBottomY = wheelMaxCenterY + wheelRadius;
      if (wheelBottomY <= platSurf.y + 28 && carVy >= -120) {
        return {
          y: platSurf.y,
          contactX: wheelCenterX,
          contactY: platSurf.y,
          penetration: wheelBottomY - platSurf.y,
          slope: platSurf.slope,
          nx: platSurf.nx,
          ny: platSurf.ny,
          friction: 1.0,
          restitution: 0.08,
          isPlatform: true,
          obstacle: null,
          obstacleVx: 0,
          obstacleVy: 0,
        };
      }
    }
  }

  // 2. Sample across the circular tire arc against composite terrain + obstacles
  let bestPenetration = -Infinity;
  let bestEffectiveGroundY = Infinity;
  let bestSampleX = wheelCenterX;
  let bestSampleSurfY = getTerrainHeight(wheelCenterX, mapId);
  let bestDx = 0;
  let bestArcDrop = wheelRadius;

  for (let s = 0; s < WHEEL_ARC_SAMPLES.length; s++) {
    const frac = WHEEL_ARC_SAMPLES[s];
    const dx = frac * wheelRadius;
    const arcDrop = Math.sqrt(Math.max(0, wheelRadius * wheelRadius - dx * dx));
    const sampleX = wheelCenterX + dx;
    const comp = getCompositeTerrainHeight(sampleX, mapId, obstacles);

    // For the tire circle to not penetrate sample (sampleX, comp.y),
    // wheel center Y must be <= comp.y - arcDrop, which corresponds to an effective ground Y of:
    const effectiveGroundY = comp.y + (wheelRadius - arcDrop);
    const pen = wheelMaxCenterY + arcDrop - comp.y;

    if (pen > bestPenetration) {
      bestPenetration = pen;
      bestEffectiveGroundY = effectiveGroundY;
      bestSampleX = sampleX;
      bestSampleSurfY = comp.y;
      bestDx = dx;
      bestArcDrop = arcDrop;
    }
  }

  const surfInfo = getCompositeSurfaceInfo(bestSampleX, mapId, obstacles);

  // Blend the surface slope normal with the tire radial contact normal so leading edges lift the wheel smoothly
  const radialNx = -bestDx / Math.max(1, wheelRadius);
  const radialNy = -bestArcDrop / Math.max(1, wheelRadius);
  let nx = surfInfo.nx * 0.65 + radialNx * 0.35;
  let ny = surfInfo.ny * 0.65 + radialNy * 0.35;
  const nLen = Math.hypot(nx, ny) || 1;
  nx /= nLen;
  ny /= nLen;

  const effectiveSlope = Math.atan2(nx, -ny);

  return {
    y: bestEffectiveGroundY,
    contactX: bestSampleX,
    contactY: bestSampleSurfY,
    penetration: bestPenetration,
    slope: effectiveSlope,
    nx,
    ny,
    friction: surfInfo.friction,
    restitution: surfInfo.restitution,
    isPlatform: false,
    obstacle: surfInfo.obstacle,
    obstacleVx: surfInfo.obstacleVx,
    obstacleVy: surfInfo.obstacleVy,
  };
}

export function stepCarPhysics(
  car: CarState,
  spec: VehicleSpec,
  stats: EffectiveStats,
  input: PhysicsInput,
  pickups: PickupItem[],
  rawDt: number,
  mapId: MapId = 'hills',
  platforms: SecretPlatform[] = [],
  elapsedTime = 0,
  obstacles: TerrainObstacle[] = []
): PhysicsStepEvents {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  const events: PhysicsStepEvents = {
    coinsCollected: [],
    fuelCollected: [],
    treasureCollected: [],
    landedHard: null,
    obstacleImpact: null,
    flipCompleted: null,
    longJumpCompleted: null,
    comboBroken: false,
    justJumped: false,
    justCrashed: false,
    justOutOfFuel: false,
  };

  if (car.crashed || car.outOfFuel) {
    car.rpm = Math.max(0, car.rpm - 4500 * dt);
    return events;
  }

  const mapSpec = getMapById(mapId);
  const weather = getDynamicWeather(mapId, car.distanceMeters, elapsedTime);
  const gravity = GRAVITY * mapSpec.gravityMultiplier;

  // Severe damage (< 60% condition) reduces live engine power & suspension stability
  const liveDamageRatio =
    car.condition < 60 ? 0.76 + (Math.max(0, car.condition) / 60) * 0.24 : 1.0;
  const liveStabilityRatio =
    car.condition < 60 ? 0.8 + (Math.max(0, car.condition) / 60) * 0.2 : 1.0;

  const baseEnvGrip = stats.grip * mapSpec.tractionMultiplier * weather.tractionMultiplier;
  const massFactor = 1150 / Math.max(600, stats.massKg);
  const climbCapability = stats.obstacleClimbFactor ?? spec.obstacleClimbFactor ?? 1.0;

  const hasFuel = car.fuel > 0;
  let throttle = 0;
  if (hasFuel) {
    if (input.accelerate && !input.hardBrake) {
      throttle = 1;
    } else if (input.brakeReverse && !input.hardBrake) {
      throttle = -0.85;
    }
  }
  car.throttle = throttle;
  car.braking = input.hardBrake || (input.brakeReverse && car.vx > 28);

  if (hasFuel) {
    const activeFactor = input.accelerate ? 1.38 : input.brakeReverse ? 1.15 : 0.36;
    car.fuel = Math.max(0, car.fuel - stats.fuelDrainRate * activeFactor * dt);
  }

  // 8 substeps per frame for continuous collision detection and zero high-speed tunneling
  const subSteps = 8;
  const subDt = dt / subSteps;
  const halfBase = spec.wheelBase * 0.5;
  const maxTravel = stats.suspensionRestLength * 0.95;
  const chassisMass = 3.6 * (stats.massKg / 1150);
  const inertia = Math.max(0.5, stats.rotationalInertia);

  const prevVyBeforeLand = car.vy;
  let lastGroundedSlope = 0;
  let stepOnPlatform = false;

  for (let step = 0; step < subSteps; step++) {
    const cosA = Math.cos(car.angle);
    const sinA = Math.sin(car.angle);

    const rearMountX = car.x - cosA * halfBase - sinA * (spec.chassisHeight * 0.24);
    const rearMountY = car.y - sinA * halfBase + cosA * (spec.chassisHeight * 0.24);

    const frontMountX = car.x + cosA * halfBase - sinA * (spec.chassisHeight * 0.24);
    const frontMountY = car.y + sinA * halfBase + cosA * (spec.chassisHeight * 0.24);

    const rearMaxX = rearMountX - sinA * stats.suspensionRestLength;
    const rearMaxY = rearMountY + cosA * stats.suspensionRestLength;

    const frontMaxX = frontMountX - sinA * stats.suspensionRestLength;
    const frontMaxY = frontMountY + cosA * stats.suspensionRestLength;

    const rearSurface = resolveWheelCircleContact(
      rearMaxX,
      rearMaxY,
      spec.wheelRadius,
      car.vy,
      mapId,
      platforms,
      obstacles
    );
    const frontSurface = resolveWheelCircleContact(
      frontMaxX,
      frontMaxY,
      spec.wheelRadius,
      car.vy,
      mapId,
      platforms,
      obstacles
    );

    const rearPenetration = rearSurface.penetration;
    const frontPenetration = frontSurface.penetration;

    const rearGrounded = rearPenetration > -3.5 && cosA > -0.28;
    const frontGrounded = frontPenetration > -3.5 && cosA > -0.28;

    if ((rearGrounded && rearSurface.isPlatform) || (frontGrounded && frontSurface.isPlatform)) {
      stepOnPlatform = true;
    }

    let totalFx = 0;
    let totalFy = gravity;
    let netTorque = 0;

    // 1. Rear Wheel Independent Suspension, Contact Normal & Obstacle Reaction
    car.rearWheel.prevCompression = car.rearWheel.compression;
    if (rearGrounded) {
      const comp = Math.max(0, Math.min(maxTravel, rearPenetration));
      car.rearWheel.compression = comp;
      car.rearWheel.grounded = true;
      car.rearWheel.groundY = rearSurface.y;
      car.rearWheel.worldX = rearMaxX;
      car.rearWheel.worldY = rearSurface.y - spec.wheelRadius;
      car.rearWheel.contactNormalX = rearSurface.nx;
      car.rearWheel.contactNormalY = rearSurface.ny;
      car.rearWheel.contactFriction = rearSurface.friction;
      car.rearWheel.onObstacleKind = rearSurface.obstacle?.kind ?? null;

      const relVy = car.vy - rearSurface.obstacleVy - car.angularVel * halfBase * cosA;
      const springForce =
        (comp * stats.suspensionStiffness +
          relVy * stats.suspensionDamping * liveStabilityRatio) /
        chassisMass;
      const clampedForce = Math.max(0, springForce);

      totalFx += rearSurface.nx * clampedForce * 0.34;
      totalFy += rearSurface.ny * clampedForce;

      netTorque += clampedForce * halfBase * Math.max(0.25, cosA) * 0.00055;

      // Bottoming out on obstacle or hard bump
      if (rearPenetration > maxTravel) {
        const excess = rearPenetration - maxTravel;
        car.x += rearSurface.nx * excess * 0.35;
        car.y += rearSurface.ny * excess * 0.68;
        if (car.vy > 0) {
          car.vy *= 0.45 + rearSurface.restitution * 0.3;
        }
        netTorque += excess * 0.09;
      }
    } else {
      car.rearWheel.compression *= Math.pow(0.08, subDt);
      car.rearWheel.grounded = false;
      car.rearWheel.groundY = rearSurface.y;
      car.rearWheel.worldX = rearMaxX;
      car.rearWheel.worldY = rearMaxY;
      car.rearWheel.onObstacleKind = null;
    }

    // 2. Front Wheel Independent Suspension, Contact Normal & Obstacle Reaction
    car.frontWheel.prevCompression = car.frontWheel.compression;
    if (frontGrounded) {
      const comp = Math.max(0, Math.min(maxTravel, frontPenetration));
      car.frontWheel.compression = comp;
      car.frontWheel.grounded = true;
      car.frontWheel.groundY = frontSurface.y;
      car.frontWheel.worldX = frontMaxX;
      car.frontWheel.worldY = frontSurface.y - spec.wheelRadius;
      car.frontWheel.contactNormalX = frontSurface.nx;
      car.frontWheel.contactNormalY = frontSurface.ny;
      car.frontWheel.contactFriction = frontSurface.friction;
      car.frontWheel.onObstacleKind = frontSurface.obstacle?.kind ?? null;

      const relVy = car.vy - frontSurface.obstacleVy + car.angularVel * halfBase * cosA;
      const springForce =
        (comp * stats.suspensionStiffness +
          relVy * stats.suspensionDamping * liveStabilityRatio) /
        chassisMass;
      const clampedForce = Math.max(0, springForce);

      totalFx += frontSurface.nx * clampedForce * 0.34;
      totalFy += frontSurface.ny * clampedForce;

      netTorque -= clampedForce * halfBase * Math.max(0.25, cosA) * 0.00055;

      // When front wheel hits a raised obstacle, lift the front axle smoothly without blocking
      if (frontPenetration > maxTravel) {
        const excess = frontPenetration - maxTravel;
        car.x += frontSurface.nx * excess * 0.35;
        car.y += frontSurface.ny * excess * 0.68;
        if (car.vy > 0) {
          car.vy *= 0.45 + frontSurface.restitution * 0.3;
        }
        netTorque -= excess * 0.11;
      }
    } else {
      car.frontWheel.compression *= Math.pow(0.08, subDt);
      car.frontWheel.grounded = false;
      car.frontWheel.groundY = frontSurface.y;
      car.frontWheel.worldX = frontMaxX;
      car.frontWheel.worldY = frontMaxY;
      car.frontWheel.onObstacleKind = null;
    }

    const anyGrounded = rearGrounded || frontGrounded;

    if (anyGrounded) {
      // Surface friction combines map/weather grip with specific obstacle friction (rock, log, mud, ice)
      const surfaceFriction =
        rearGrounded && frontGrounded
          ? (rearSurface.friction + frontSurface.friction) * 0.5
          : rearGrounded
          ? rearSurface.friction
          : frontSurface.friction;
      const effectiveGrip = baseEnvGrip * surfaceFriction;

      // Compute true axle line angle between the two wheel contact points + surface tangents
      const wheelLineAngle = Math.atan2(
        car.frontWheel.worldY - car.rearWheel.worldY,
        Math.max(20, car.frontWheel.worldX - car.rearWheel.worldX)
      );
      const avgSlope =
        rearGrounded && frontGrounded
          ? wheelLineAngle * 0.65 + (rearSurface.slope + frontSurface.slope) * 0.5 * 0.35
          : rearGrounded
          ? rearSurface.slope
          : frontSurface.slope;
      lastGroundedSlope = avgSlope;

      const tx = Math.cos(avgSlope);
      const ty = Math.sin(avgSlope);

      // Gravity component along the slope
      const slopeGravity = gravity * Math.sin(avgSlope) * 0.88;
      totalFx += tx * slopeGravity;

      // Mud pit viscous drag
      const inMud =
        rearSurface.obstacle?.kind === 'mud_pit' ||
        frontSurface.obstacle?.kind === 'mud_pit';
      if (inMud) {
        totalFx -= car.vx * (1.6 / Math.max(0.75, climbCapability));
      }

      // Rough obstacle step-climb impedance based on obstacle height vs wheel radius (H / R ratio)
      const activeObstacle = frontSurface.obstacle ?? rearSurface.obstacle;
      const isRoughObstacle =
        activeObstacle &&
        (activeObstacle.kind === 'small_rock' ||
          activeObstacle.kind === 'large_rock' ||
          activeObstacle.kind === 'rocky_step' ||
          activeObstacle.kind === 'fallen_log' ||
          activeObstacle.kind === 'bump_mogul');
      let roughClimbMultiplier = 1.0;
      if (isRoughObstacle && activeObstacle) {
        const stepToWheelRatio = activeObstacle.height / Math.max(16, spec.wheelRadius);
        // Small low-profile tires (Sports Car) struggle when obstacle height exceeds wheel radius,
        // while Monster Truck (36px) and Jeep (29px) roll over rough rocks with high torque
        roughClimbMultiplier = Math.max(
          0.56,
          Math.min(1.55, Math.pow(climbCapability, 1.35) / Math.max(0.72, stepToWheelRatio * 0.78))
        );
        if (climbCapability < 0.9 && stepToWheelRatio > 1.1) {
          totalFx -= car.vx * (stepToWheelRatio - 0.95) * 1.15;
        }
      }

      // Couple gently to moving platform horizontal velocity
      const platformVx =
        rearGrounded && rearSurface.obstacle?.isMoving
          ? rearSurface.obstacleVx
          : frontGrounded && frontSurface.obstacle?.isMoving
          ? frontSurface.obstacleVx
          : 0;
      if (platformVx !== 0) {
        totalFx += (platformVx - car.vx) * 2.2;
      }

      const uphillFactor = Math.max(0, -Math.sin(avgSlope));
      const contactFactor = rearGrounded && frontGrounded ? 1.0 : 0.84;

      if (input.hardBrake || (input.brakeReverse && car.vx > 28)) {
        const brakeForce = 640 * effectiveGrip * contactFactor;
        if (Math.abs(car.vx) > 10) {
          totalFx -= Math.sign(car.vx) * brakeForce;
        } else {
          car.vx *= Math.pow(0.05, subDt);
        }
        car.vy *= Math.pow(0.35, subDt);
        netTorque += stats.drivePitchReaction * 1.1;
      } else if (throttle !== 0) {
        const effectiveMaxSpd = stats.maxSpeed * liveDamageRatio;
        const speedRatio = Math.min(1, Math.abs(car.vx) / Math.max(1, effectiveMaxSpd));
        const torqueCurve = 1 - speedRatio * 0.52;
        const uphillLoadPenalty = Math.max(
          0.55,
          1 - (uphillFactor * 0.3) / Math.max(0.7, climbCapability)
        );
        const driveAccel =
          throttle *
          stats.engineForce *
          liveDamageRatio *
          massFactor *
          effectiveGrip *
          contactFactor *
          torqueCurve *
          uphillLoadPenalty *
          roughClimbMultiplier;

        // Apply drive force along each grounded wheel's actual contact tangent so wheels climb rocks/logs/steps!
        if (rearGrounded && frontGrounded) {
          const rTx = Math.cos(rearSurface.slope);
          const rTy = Math.sin(rearSurface.slope);
          const fTx = Math.cos(frontSurface.slope);
          const fTy = Math.sin(frontSurface.slope);
          totalFx += (rTx * 0.52 + fTx * 0.48) * driveAccel;
          totalFy += (rTy * 0.52 + fTy * 0.48) * driveAccel * 0.82 * climbCapability;
        } else if (rearGrounded) {
          const rTx = Math.cos(rearSurface.slope);
          const rTy = Math.sin(rearSurface.slope);
          totalFx += rTx * driveAccel;
          totalFy += rTy * driveAccel * 0.82 * climbCapability;
        } else {
          const fTx = Math.cos(frontSurface.slope);
          const fTy = Math.sin(frontSurface.slope);
          totalFx += fTx * driveAccel;
          totalFy += fTy * driveAccel * 0.82 * climbCapability;
        }

        // When climbing an obstacle, rear wheel thrust helps lift the front wheel over the obstacle face
        const climbingFrontObstacle =
          frontGrounded && frontSurface.obstacle && frontSurface.slope < -0.1;
        const climbLiftTorque = climbingFrontObstacle
          ? throttle * 1.15 * climbCapability
          : 0;

        const relativePitch = normalizeAngle(car.angle - avgSlope);
        const wheelieLimiter =
          throttle > 0
            ? Math.max(0.15, 1 - Math.max(0, -relativePitch) / 0.54)
            : Math.max(0.2, 1 - Math.max(0, relativePitch) / 0.48);
        const pitchLeverage =
          throttle > 0
            ? stats.drivePitchReaction * (0.85 + uphillFactor * 1.05) * wheelieLimiter
            : stats.drivePitchReaction * 0.95 * wheelieLimiter;
        netTorque -= throttle * pitchLeverage + climbLiftTorque;
      } else {
        const rollingDecel = 30 * mapSpec.tractionMultiplier * weather.tractionMultiplier * surfaceFriction;
        if (Math.abs(car.vx) > 6 && Math.abs(slopeGravity) < 95) {
          totalFx -= Math.sign(car.vx) * rollingDecel;
        }
      }

      // Align chassis toward the true wheel-to-wheel axle line when both wheels are grounded
      const targetAngle = rearGrounded && frontGrounded ? wheelLineAngle : avgSlope;
      const angleDiff = normalizeAngle(targetAngle - car.angle);
      if (rearGrounded && frontGrounded) {
        netTorque += (angleDiff * 14.5 - car.angularVel * 9.5) * liveStabilityRatio;
      } else {
        netTorque += (angleDiff * 7.5 - car.angularVel * 6.0) * liveStabilityRatio;
      }
    } else {
      // Airborne: Apply controlled wind force
      if (!input.accelerate) {
        totalFx += weather.windForce * 0.45;
      } else if (weather.windForce < 0) {
        totalFx += weather.windForce * 0.35;
      }

      if (input.accelerate) {
        netTorque -= stats.airPitchTorque;
      }
      if (input.brakeReverse) {
        netTorque += stats.airPitchTorque;
      }
      if (input.hardBrake) {
        netTorque += stats.airPitchTorque * 0.7;
      }
      car.angularVel *= Math.pow(0.93, subDt);
    }

    // Roof / Chassis ground contact when upside down or tipped past vertical
    const normAngleSub = normalizeAngle(car.angle);
    const roofX = car.x + Math.sin(car.angle) * (spec.chassisHeight * 0.82);
    const roofY = car.y - Math.cos(car.angle) * (spec.chassisHeight * 0.82);
    const roofGroundY = getCompositeTerrainHeight(roofX, mapId, obstacles).y;
    if (Math.abs(normAngleSub) > Math.PI * 0.55 && roofY > roofGroundY - 4) {
      const roofPen = roofY - (roofGroundY - 4);
      car.y -= roofPen * 0.7;
      if (car.vy > 0) car.vy *= 0.25;
      car.vx *= Math.pow(0.12, subDt);
      car.angularVel *= Math.pow(0.2, subDt);

      const scrapeDmg = 12 * subDt;
      car.condition = Math.max(0, car.condition - scrapeDmg);
    }

    const aeroDrag = 0.00022 * car.vx * Math.abs(car.vx);
    totalFx -= aeroDrag;
    car.vx *= Math.pow(0.975, subDt);
    car.vy *= Math.pow(0.988, subDt);

    car.vx += totalFx * subDt;
    car.vy += totalFy * subDt;

    const downhillOverspeed = anyGrounded && lastGroundedSlope > 0.08 ? 1.18 : 1.0;
    const effectiveMaxSpeed = stats.maxSpeed * liveDamageRatio * downhillOverspeed;
    if (car.vx > effectiveMaxSpeed) car.vx = effectiveMaxSpeed;
    if (car.vx < -stats.maxSpeed * 0.6) car.vx = -stats.maxSpeed * 0.6;
    if (car.x < -220 && car.vx < 0) {
      car.x = -220;
      car.vx = 0;
    }

    car.x += car.vx * subDt;
    car.y += car.vy * subDt;

    const angularAcc = netTorque / inertia;
    car.angularVel += angularAcc * subDt;
    car.angularVel = Math.max(-7.5, Math.min(7.5, car.angularVel));
    car.angle += car.angularVel * subDt;

    // Chassis Underbody & Bumper Solid Collision Resolution (prevents tunneling or getting stuck)
    const cosAfter = Math.cos(car.angle);
    const sinAfter = Math.sin(car.angle);
    const bellyOffsets = [-spec.chassisWidth * 0.36, 0, spec.chassisWidth * 0.36];
    const bellyClearance = spec.chassisHeight * 0.34;

    for (let b = 0; b < bellyOffsets.length; b++) {
      const localX = bellyOffsets[b];
      const worldBx = car.x + cosAfter * localX - sinAfter * bellyClearance;
      const worldBy = car.y + sinAfter * localX + cosAfter * bellyClearance;
      const surfAtBelly = getCompositeSurfaceInfo(worldBx, mapId, obstacles);

      if (worldBy > surfAtBelly.y - 2 && cosAfter > -0.2) {
        const pen = worldBy - (surfAtBelly.y - 2);
        car.x += surfAtBelly.nx * pen * 0.45;
        car.y += surfAtBelly.ny * pen * 0.85;
        if (car.vy > 0) {
          car.vy *= 0.35 + surfAtBelly.restitution * 0.25;
        }
        // Apply realistic pitch reaction when front or rear bumper/belly scrapes an obstacle
        if (localX > 0) {
          car.angularVel -= Math.min(1.8, pen * 0.045);
        } else if (localX < 0) {
          car.angularVel += Math.min(1.8, pen * 0.045);
        }

        // Low-clearance vehicles (e.g., Sports Car) lose more horizontal speed when their belly scrapes a tall rock
        const scrapeSlowdown = Math.max(0.88, Math.min(0.99, 0.94 * climbCapability));
        car.vx *= Math.pow(scrapeSlowdown, subDt * 8);

        if (
          surfAtBelly.obstacle &&
          Math.hypot(car.vx, car.vy) > 160 &&
          !events.obstacleImpact
        ) {
          events.obstacleImpact = {
            kind: surfAtBelly.obstacle.kind,
            impactSpeed: Math.hypot(car.vx, car.vy),
            x: worldBx,
            y: surfAtBelly.y,
          };
        }
      }
    }
  }

  car.onSecretRoute = stepOnPlatform;

  // Independent Front & Rear Wheel Rotation based on actual vehicle movement
  const tangentSpeed = Math.hypot(car.vx, car.vy * 0.3) * (car.vx >= 0 ? 1 : -1);
  if (car.rearWheel.grounded) {
    const wheelGrip =
      mapSpec.tractionMultiplier *
      weather.tractionMultiplier *
      (car.rearWheel.contactFriction ?? 1);
    const slipBoost = car.throttle * Math.max(0, 1 - wheelGrip) * 155;
    car.rearWheel.angularVel = (tangentSpeed + slipBoost) / spec.wheelRadius;
  } else if (car.throttle !== 0) {
    car.rearWheel.angularVel = (car.throttle * stats.maxSpeed * 0.65) / spec.wheelRadius;
  } else {
    car.rearWheel.angularVel *= Math.pow(0.4, dt);
  }

  if (car.frontWheel.grounded) {
    car.frontWheel.angularVel = tangentSpeed / spec.wheelRadius;
  } else if (car.throttle !== 0) {
    car.frontWheel.angularVel = (car.throttle * stats.maxSpeed * 0.55) / spec.wheelRadius;
  } else {
    car.frontWheel.angularVel *= Math.pow(0.4, dt);
  }

  car.rearWheel.spinAngle += car.rearWheel.angularVel * dt;
  car.frontWheel.spinAngle += car.frontWheel.angularVel * dt;

  const speedRatioAbs = Math.min(1, Math.abs(car.vx) / Math.max(1, stats.maxSpeed));
  const targetRpm = hasFuel
    ? 950 +
      speedRatioAbs * 4600 +
      Math.abs(car.throttle) * 2100 +
      (car.rearWheel.grounded && lastGroundedSlope < -0.1 && car.throttle > 0 ? 450 : 0)
    : 0;
  car.rpm += (Math.min(7800, targetRpm) - car.rpm) * Math.min(1, dt * 10);

  const headTarget = -car.throttle * 0.28 + car.angularVel * 0.09;
  const headForce = (headTarget - car.driverHeadLagAngle) * 45 - car.driverHeadLagVel * 6.5;
  car.driverHeadLagVel += headForce * dt;
  car.driverHeadLagAngle += car.driverHeadLagVel * dt;
  car.driverHeadLagAngle = Math.max(-0.55, Math.min(0.55, car.driverHeadLagAngle));

  car.squashX += (1 - car.squashX) * Math.min(1, dt * 12);
  car.squashY += (1 - car.squashY) * Math.min(1, dt * 12);

  // Air time, jump takeoff, vehicle impact damage, long jumps & stunt combos
  const nowGrounded = car.rearWheel.grounded || car.frontWheel.grounded;
  if (!nowGrounded) {
    if (car.wasGrounded) {
      car.airStartX = car.x;
      if (car.vy < -55) {
        events.justJumped = true;
      }
    }
    car.airTimeSeconds += dt;
    car.accumulatedAirAngle += car.angularVel * dt;
  } else {
    if (!car.wasGrounded) {
      const landingSlope = getCompositeSurfaceInfo(car.x, mapId, obstacles).slope;
      const landingAngleError = normalizeAngle(car.angle - landingSlope);
      const absAngleError = Math.abs(landingAngleError);

      let damageTaken = 0;
      if (prevVyBeforeLand > 190) {
        car.squashX = 1.16;
        car.squashY = 0.84;

        if (prevVyBeforeLand > 310 || (prevVyBeforeLand > 215 && absAngleError > 0.44)) {
          const speedExcess = Math.max(0, prevVyBeforeLand - 210) / 140;
          const anglePenalty = Math.max(0.4, absAngleError * 1.65);
          damageTaken = Math.min(18, Math.max(2, Math.round(speedExcess * anglePenalty * 6.5)));
          car.condition = Math.max(0, car.condition - damageTaken);
        }

        events.landedHard = {
          impactSpeed: prevVyBeforeLand,
          x: car.x,
          y: car.y,
          damageTaken,
        };

        if (absAngleError > 0.38) {
          car.angularVel += landingAngleError * (prevVyBeforeLand / 280) * 1.6;
        }
      }

      const safeUprightLanding =
        Math.abs(normalizeAngle(car.angle)) < Math.PI * 0.46 && absAngleError < Math.PI * 0.45;

      if (!safeUprightLanding || absAngleError > 0.68) {
        if (car.stuntCombo > 0) {
          car.stuntCombo = 0;
          events.comboBroken = true;
        }
      } else {
        const absAirRot = Math.abs(car.accumulatedAirAngle);
        const completedFlips =
          absAirRot >= Math.PI * 1.88
            ? Math.max(1, Math.floor((absAirRot + Math.PI * 0.14) / (Math.PI * 2)))
            : 0;

        if (completedFlips >= 1) {
          car.stuntCombo = Math.min(5, car.stuntCombo + 1);
          car.maxStuntCombo = Math.max(car.maxStuntCombo, car.stuntCombo);
          const bonus = completedFlips * 100 * car.stuntCombo;
          const flipDir = car.accumulatedAirAngle < 0 ? 'BACKFLIP' : 'FRONTFLIP';
          const comboTag = car.stuntCombo > 1 ? ` (${car.stuntCombo}x COMBO!)` : '';
          const label =
            completedFlips > 1
              ? `${completedFlips}x ${flipDir}${comboTag} +${bonus}`
              : `${flipDir}${comboTag} +${bonus}`;

          car.flipsCount += completedFlips;
          car.flipBonusCoins += bonus;
          car.runCoins += bonus;
          events.flipCompleted = {
            count: completedFlips,
            bonusCoins: bonus,
            combo: car.stuntCombo,
            label,
            x: car.x,
            y: car.y - 52,
          };
        }

        const airJumpMeters = Math.floor((car.x - car.airStartX) / PIXELS_PER_METER);
        if (airJumpMeters >= 25 && car.airTimeSeconds >= 0.48) {
          car.stuntCombo = Math.min(5, car.stuntCombo + 1);
          car.maxStuntCombo = Math.max(car.maxStuntCombo, car.stuntCombo);
          const baseJumpBonus = Math.min(180, Math.round((airJumpMeters - 15) * 4));
          const jumpBonus = baseJumpBonus * car.stuntCombo;
          const comboTag = car.stuntCombo > 1 ? ` ${car.stuntCombo}x` : '';
          const label = `LONG JUMP ${airJumpMeters}m${comboTag} +${jumpBonus}`;

          car.longJumpsCount += 1;
          car.flipBonusCoins += jumpBonus;
          car.runCoins += jumpBonus;
          events.longJumpCompleted = {
            meters: airJumpMeters,
            bonusCoins: jumpBonus,
            combo: car.stuntCombo,
            label,
            x: car.x,
            y: car.y - (events.flipCompleted ? 84 : 48),
          };
        }
      }
    }
    car.airTimeSeconds = 0;
    car.accumulatedAirAngle = 0;
  }
  car.wasGrounded = nowGrounded;

  const currentMeters = Math.max(0, Math.floor(car.x / PIXELS_PER_METER));
  car.distanceMeters = currentMeters;
  if (currentMeters > car.maxDistanceMeters) {
    car.maxDistanceMeters = currentMeters;
  }

  const normAngle = normalizeAngle(car.angle);
  const roofCheckX = car.x + Math.sin(car.angle) * (spec.chassisHeight * 0.82);
  const roofCheckY = car.y - Math.cos(car.angle) * (spec.chassisHeight * 0.82);
  const roofCheckGroundY = getCompositeTerrainHeight(roofCheckX, mapId, obstacles).y;

  const isUpsideDown = Math.abs(normAngle) > Math.PI * 0.58;
  const roofTouchingGround =
    roofCheckY >= roofCheckGroundY - 12 ||
    car.y >= getCompositeTerrainHeight(car.x, mapId, obstacles).y - 24;

  if (isUpsideDown && roofTouchingGround) {
    if (prevVyBeforeLand > 250 && Math.abs(normAngle) > Math.PI * 0.64) {
      car.upsideDownTimer = 0.5;
      car.crashDetail = 'Severe head-first landing impact!';
    } else {
      car.upsideDownTimer += dt;
    }

    if (car.upsideDownTimer >= 0.45) {
      car.crashed = true;
      car.gameOverReason = 'crashed';
      car.stuntCombo = 0;
      car.condition = Math.max(0, car.condition - 16);
      if (!car.crashDetail) {
        car.crashDetail = 'Landed upside down! Feather the throttle in mid-air.';
      }
      events.justCrashed = true;
      return events;
    }
  } else {
    car.upsideDownTimer = Math.max(0, car.upsideDownTimer - dt * 2.5);
  }

  const pickupRadius = Math.max(spec.chassisWidth * 0.56, 56);
  for (let i = 0; i < pickups.length; i++) {
    const p = pickups[i];
    if (p.collected) continue;
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    if (dx * dx + dy * dy <= pickupRadius * pickupRadius) {
      p.collected = true;
      p.collectAnim = 0.01;
      if (p.type === 'coin') {
        car.pickupCoins += p.value;
        car.runCoins += p.value;
        events.coinsCollected.push({ x: p.x, y: p.y, value: p.value });
      } else if (p.type === 'treasure') {
        car.pickupCoins += p.value;
        car.runCoins += p.value;
        car.treasuresFound += 1;
        events.treasureCollected.push({ x: p.x, y: p.y, value: p.value });
      } else if (p.type === 'fuel') {
        car.fuel = Math.min(car.maxFuel, car.fuel + car.maxFuel * 0.85);
        car.outOfFuelTimer = 0;
        events.fuelCollected.push({ x: p.x, y: p.y });
      }
    }
  }

  if (car.fuel <= 0) {
    if (Math.abs(car.vx) < 42) {
      car.outOfFuelTimer += dt;
    } else {
      car.outOfFuelTimer += dt * 0.35;
    }
    if (car.outOfFuelTimer >= 1.6) {
      car.outOfFuel = true;
      car.gameOverReason = 'fuel';
      car.crashDetail = 'Your fuel tank ran dry and the vehicle rolled to a stop.';
      events.justOutOfFuel = true;
    }
  } else {
    car.outOfFuelTimer = 0;
  }

  return events;
}
