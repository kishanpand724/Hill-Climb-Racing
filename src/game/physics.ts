import { getTerrainHeight, getTerrainHeightAndSlope, PIXELS_PER_METER } from './terrain';
import { CarState, EffectiveStats, PickupItem, VehicleSpec } from './types';

export const GRAVITY = 820; // px/s^2

export interface PhysicsInput {
  accelerate: boolean;
  brakeReverse: boolean;
  hardBrake: boolean;
}

export interface PhysicsStepEvents {
  coinsCollected: { x: number; y: number; value: number }[];
  fuelCollected: { x: number; y: number }[];
  landedHard: { impactSpeed: number; x: number; y: number } | null;
  flipCompleted: { count: number; bonusCoins: number; x: number; y: number } | null;
  justCrashed: boolean;
  justOutOfFuel: boolean;
}

export function normalizeAngle(angle: number): number {
  let a = ((angle + Math.PI) % (Math.PI * 2));
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export function createInitialCarState(spec: VehicleSpec, stats: EffectiveStats): CarState {
  const startX = 0;
  const groundY = getTerrainHeight(startX);
  const eqComp = (GRAVITY * 3.6) / (2 * stats.suspensionStiffness);
  const startY =
    groundY -
    spec.wheelRadius -
    spec.chassisHeight * 0.25 -
    (stats.suspensionRestLength - eqComp);
  const halfBase = spec.wheelBase * 0.5;

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
      grounded: true,
      spinAngle: 0,
      angularVel: 0,
    },
    frontWheel: {
      worldX: startX + halfBase,
      worldY: groundY - spec.wheelRadius,
      groundY,
      compression: eqComp,
      grounded: true,
      spinAngle: 0,
      angularVel: 0,
    },
    fuel: stats.fuelCapacity,
    maxFuel: stats.fuelCapacity,
    distanceMeters: 0,
    maxDistanceMeters: 0,
    runCoins: 0,
    flipsCount: 0,
    airTimeSeconds: 0,
    accumulatedAirAngle: 0,
    wasGrounded: true,
    upsideDownTimer: 0,
    outOfFuelTimer: 0,
    crashed: false,
    outOfFuel: false,
    gameOverReason: 'none',
    driverHeadLagAngle: 0,
    driverHeadLagVel: 0,
    squashX: 1,
    squashY: 1,
    throttle: 0,
    braking: false,
  };
}

export function stepCarPhysics(
  car: CarState,
  spec: VehicleSpec,
  stats: EffectiveStats,
  input: PhysicsInput,
  pickups: PickupItem[],
  rawDt: number
): PhysicsStepEvents {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  const events: PhysicsStepEvents = {
    coinsCollected: [],
    fuelCollected: [],
    landedHard: null,
    flipCompleted: null,
    justCrashed: false,
    justOutOfFuel: false,
  };

  if (car.crashed || car.outOfFuel) {
    return events;
  }

  const hasFuel = car.fuel > 0;
  let throttle = 0;
  if (hasFuel) {
    if (input.accelerate && !input.hardBrake) {
      throttle = 1;
    } else if (input.brakeReverse && !input.hardBrake) {
      throttle = -0.82;
    }
  }
  car.throttle = throttle;
  car.braking = input.hardBrake || (input.brakeReverse && car.vx > 45);

  // Fuel consumption
  if (hasFuel) {
    const activeFactor =
      input.accelerate || input.brakeReverse ? 1.35 : 0.45;
    car.fuel = Math.max(0, car.fuel - stats.fuelDrainRate * activeFactor * dt);
  }

  const subSteps = 4;
  const subDt = dt / subSteps;
  const halfBase = spec.wheelBase * 0.5;
  const maxTravel = stats.suspensionRestLength * 0.92;
  const chassisMass = 3.6;

  let prevVyBeforeLand = car.vy;

  for (let step = 0; step < subSteps; step++) {
    const cosA = Math.cos(car.angle);
    const sinA = Math.sin(car.angle);

    // Mount points at bottom of chassis
    const rearMountX = car.x - cosA * halfBase - sinA * (spec.chassisHeight * 0.25);
    const rearMountY = car.y - sinA * halfBase + cosA * (spec.chassisHeight * 0.25);

    const frontMountX = car.x + cosA * halfBase - sinA * (spec.chassisHeight * 0.25);
    const frontMountY = car.y + sinA * halfBase + cosA * (spec.chassisHeight * 0.25);

    // Uncompressed wheel centers (hanging down along chassis local +Y, which is (-sinA, cosA))
    const rearMaxX = rearMountX - sinA * stats.suspensionRestLength;
    const rearMaxY = rearMountY + cosA * stats.suspensionRestLength;

    const frontMaxX = frontMountX - sinA * stats.suspensionRestLength;
    const frontMaxY = frontMountY + cosA * stats.suspensionRestLength;

    const rearTerrain = getTerrainHeightAndSlope(rearMaxX);
    const frontTerrain = getTerrainHeightAndSlope(frontMaxX);

    const rearPenetration = rearMaxY + spec.wheelRadius - rearTerrain.y;
    const frontPenetration = frontMaxY + spec.wheelRadius - frontTerrain.y;

    const rearGrounded = rearPenetration > -4 && cosA > -0.25;
    const frontGrounded = frontPenetration > -4 && cosA > -0.25;

    let totalFx = 0;
    let totalFy = GRAVITY; // downward gravity acceleration
    let angularAcc = 0;

    // Rear wheel spring-damper
    if (rearGrounded) {
      const comp = Math.max(0, Math.min(maxTravel, rearPenetration));
      car.rearWheel.compression = comp;
      car.rearWheel.grounded = true;
      car.rearWheel.groundY = rearTerrain.y;
      car.rearWheel.worldX = rearMaxX;
      car.rearWheel.worldY = rearTerrain.y - spec.wheelRadius;

      // Vertical velocity at rear wheel
      const wheelVy = car.vy - car.angularVel * halfBase * cosA;
      const springForce =
        (comp * stats.suspensionStiffness - wheelVy * stats.suspensionDamping) /
        chassisMass;
      const clampedForce = Math.max(0, springForce);

      // Push along surface normal + upward
      totalFx += rearTerrain.nx * clampedForce * 0.28;
      totalFy -= clampedForce;

      // Torque around chassis center: rear wheel pushing up rotates nose down (+angularAcc)
      angularAcc += (clampedForce * halfBase) / 480;

      // Hard bottom-out stop if penetration exceeds maxTravel
      if (rearPenetration > maxTravel) {
        const excess = rearPenetration - maxTravel;
        car.y -= excess * 0.55;
        if (car.vy > 0) car.vy *= 0.55;
      }
    } else {
      car.rearWheel.compression *= 0.85;
      car.rearWheel.grounded = false;
      car.rearWheel.groundY = rearTerrain.y;
      car.rearWheel.worldX = rearMaxX;
      car.rearWheel.worldY = rearMaxY;
    }

    // Front wheel spring-damper
    if (frontGrounded) {
      const comp = Math.max(0, Math.min(maxTravel, frontPenetration));
      car.frontWheel.compression = comp;
      car.frontWheel.grounded = true;
      car.frontWheel.groundY = frontTerrain.y;
      car.frontWheel.worldX = frontMaxX;
      car.frontWheel.worldY = frontTerrain.y - spec.wheelRadius;

      const wheelVy = car.vy + car.angularVel * halfBase * cosA;
      const springForce =
        (comp * stats.suspensionStiffness - wheelVy * stats.suspensionDamping) /
        chassisMass;
      const clampedForce = Math.max(0, springForce);

      totalFx += frontTerrain.nx * clampedForce * 0.28;
      totalFy -= clampedForce;

      // Front wheel pushing up rotates nose up (-angularAcc)
      angularAcc -= (clampedForce * halfBase) / 480;

      if (frontPenetration > maxTravel) {
        const excess = frontPenetration - maxTravel;
        car.y -= excess * 0.55;
        if (car.vy > 0) car.vy *= 0.55;
      }
    } else {
      car.frontWheel.compression *= 0.85;
      car.frontWheel.grounded = false;
      car.frontWheel.groundY = frontTerrain.y;
      car.frontWheel.worldX = frontMaxX;
      car.frontWheel.worldY = frontMaxY;
    }

    const anyGrounded = rearGrounded || frontGrounded;

    if (anyGrounded) {
      // Average slope tangent
      const avgSlope =
        rearGrounded && frontGrounded
          ? (rearTerrain.slope + frontTerrain.slope) * 0.5
          : rearGrounded
          ? rearTerrain.slope
          : frontTerrain.slope;

      const tx = Math.cos(avgSlope);
      const ty = Math.sin(avgSlope);

      // Drive force along terrain surface
      if (input.hardBrake) {
        car.vx *= Math.pow(0.08, subDt);
        car.vy *= Math.pow(0.25, subDt);
        angularAcc += 0.9; // Gentle nose dive on hard brake
      } else if (throttle !== 0) {
        const contactFactor = rearGrounded && frontGrounded ? 1.0 : 0.78;
        const speedRatio = Math.min(1, Math.abs(car.vx) / stats.maxSpeed);
        const torqueCurve = 1 - speedRatio * 0.55;
        const driveAccel =
          throttle * stats.engineForce * stats.grip * contactFactor * torqueCurve;

        totalFx += tx * driveAccel;
        totalFy += ty * driveAccel * 0.75;

        // Subtle suspension pitch reaction on throttle/brake
        angularAcc -= throttle * 0.25;
      } else {
        // Gentle rolling resistance
        car.vx *= Math.pow(0.62, subDt);
      }

      // Strong slope alignment restorative torque when grounded
      const angleDiff = normalizeAngle(avgSlope - car.angle);
      angularAcc += angleDiff * 28.0 - car.angularVel * 14.0;
    } else {
      // Airborne controls: allow controllable air pitch while preventing accidental roof flips on normal hill crests
      const localTerrain = getTerrainHeightAndSlope(car.x);
      const heightAboveGround = localTerrain.y - (car.y + spec.wheelRadius);
      const highJumpFactor = Math.min(1, Math.max(0, (heightAboveGround - 35) / 80));

      if (input.accelerate) {
        angularAcc -= stats.airPitchTorque * (0.18 + 0.32 * highJumpFactor);
      }
      if (input.brakeReverse) {
        angularAcc += stats.airPitchTorque * (0.24 + 0.35 * highJumpFactor);
      }

      // Natural suspension/aero leveling toward terrain slope when close to the ground
      const targetSlope = localTerrain.slope * 0.6;
      const airAngleDiff = normalizeAngle(targetSlope - car.angle);
      angularAcc += airAngleDiff * (5.5 * (1 - highJumpFactor * 0.6)) - car.angularVel * 4.2;
    }

    // Air drag
    car.vx *= Math.pow(0.96, subDt);
    car.vy *= Math.pow(0.985, subDt);

    // Integrate velocities and positions
    car.vx += totalFx * subDt;
    car.vy += totalFy * subDt;

    // Clamp max horizontal velocity
    if (car.vx > stats.maxSpeed) car.vx = stats.maxSpeed;
    if (car.vx < -stats.maxSpeed * 0.55) car.vx = -stats.maxSpeed * 0.55;
    if (car.x < -220 && car.vx < 0) {
      car.x = -220;
      car.vx = 0;
    }

    car.x += car.vx * subDt;
    car.y += car.vy * subDt;

    car.angularVel += angularAcc * subDt;
    car.angularVel = Math.max(-4.5, Math.min(4.5, car.angularVel));
    car.angle += car.angularVel * subDt;

    // Prevent chassis belly from sinking below terrain
    const centerGroundY = getTerrainHeight(car.x);
    if (car.y > centerGroundY - 12) {
      car.y = centerGroundY - 12;
      if (car.vy > 0) car.vy = 0;
    }
  }

  // Wheel spin animation
  const groundSpeed = Math.hypot(car.vx, car.vy * 0.3) * (car.vx >= 0 ? 1 : -1);
  const targetWheelSpinVel =
    car.rearWheel.grounded || car.frontWheel.grounded
      ? groundSpeed / spec.wheelRadius
      : car.throttle * 18;
  car.rearWheel.angularVel = targetWheelSpinVel;
  car.frontWheel.angularVel = targetWheelSpinVel;
  car.rearWheel.spinAngle += car.rearWheel.angularVel * dt;
  car.frontWheel.spinAngle += car.frontWheel.angularVel * dt;

  // Driver head inertia spring
  const headTarget = -car.throttle * 0.28 + car.angularVel * 0.08;
  const headForce = (headTarget - car.driverHeadLagAngle) * 45 - car.driverHeadLagVel * 6.5;
  car.driverHeadLagVel += headForce * dt;
  car.driverHeadLagAngle += car.driverHeadLagVel * dt;
  car.driverHeadLagAngle = Math.max(-0.55, Math.min(0.55, car.driverHeadLagAngle));

  // Squash & stretch recovery
  car.squashX += (1 - car.squashX) * Math.min(1, dt * 12);
  car.squashY += (1 - car.squashY) * Math.min(1, dt * 12);

  // Air time & flip detection
  const nowGrounded = car.rearWheel.grounded || car.frontWheel.grounded;
  if (!nowGrounded) {
    car.airTimeSeconds += dt;
    car.accumulatedAirAngle += car.angularVel * dt;
  } else {
    if (!car.wasGrounded) {
      // Just landed!
      if (prevVyBeforeLand > 210) {
        car.squashX = 1.16;
        car.squashY = 0.84;
        events.landedHard = {
          impactSpeed: prevVyBeforeLand,
          x: car.x,
          y: car.y,
        };
      }
      const completedFlips = Math.floor(
        (Math.abs(car.accumulatedAirAngle) + Math.PI * 0.35) / (Math.PI * 2)
      );
      if (completedFlips >= 1 && Math.abs(normalizeAngle(car.angle)) < Math.PI * 0.48) {
        const bonus = completedFlips * 100;
        car.flipsCount += completedFlips;
        car.runCoins += bonus;
        events.flipCompleted = {
          count: completedFlips,
          bonusCoins: bonus,
          x: car.x,
          y: car.y - 45,
        };
      }
    }
    car.airTimeSeconds = 0;
    car.accumulatedAirAngle = 0;
  }
  car.wasGrounded = nowGrounded;

  // Distance tracking
  const currentMeters = Math.max(0, Math.floor(car.x / PIXELS_PER_METER));
  car.distanceMeters = currentMeters;
  if (currentMeters > car.maxDistanceMeters) {
    car.maxDistanceMeters = currentMeters;
  }

  // Pickup collisions
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
        car.runCoins += p.value;
        events.coinsCollected.push({ x: p.x, y: p.y, value: p.value });
      } else if (p.type === 'fuel') {
        car.fuel = car.maxFuel;
        car.outOfFuelTimer = 0;
        events.fuelCollected.push({ x: p.x, y: p.y });
      }
    }
  }

  // Crash (upside down roof / driver head impact) check
  const normAngle = normalizeAngle(car.angle);
  const roofX = car.x + Math.sin(car.angle) * (spec.chassisHeight * 0.85);
  const roofY = car.y - Math.cos(car.angle) * (spec.chassisHeight * 0.85);
  const roofGroundY = getTerrainHeight(roofX);

  const isUpsideDown = Math.abs(normAngle) > Math.PI * 0.62;
  const roofTouchingGround = roofY >= roofGroundY - 8;

  if (isUpsideDown && roofTouchingGround) {
    car.upsideDownTimer += dt;
    // Immediate crash on hard upside-down impact, or after 0.35s upside down on ground
    if (prevVyBeforeLand > 140 || car.upsideDownTimer >= 0.32) {
      car.crashed = true;
      car.gameOverReason = 'crashed';
      events.justCrashed = true;
      return events;
    }
  } else {
    car.upsideDownTimer = Math.max(0, car.upsideDownTimer - dt * 2);
  }

  // Out of fuel check
  if (car.fuel <= 0) {
    if (Math.abs(car.vx) < 42) {
      car.outOfFuelTimer += dt;
    } else {
      car.outOfFuelTimer += dt * 0.35;
    }
    if (car.outOfFuelTimer >= 1.6) {
      car.outOfFuel = true;
      car.gameOverReason = 'fuel';
      events.justOutOfFuel = true;
    }
  } else {
    car.outOfFuelTimer = 0;
  }

  return events;
}
