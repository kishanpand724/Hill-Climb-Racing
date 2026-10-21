import { PickupItem, SceneryProp } from './types';

export const PIXELS_PER_METER = 32;
export const BASE_GROUND_Y = 420;

// Deterministic hash for procedural noise
function hash1D(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

// Smooth cosine/hermite interpolated 1D value noise
function smoothNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash1D(i);
  const b = hash1D(i + 1);
  return a + (b - a) * u;
}

/**
 * Returns the exact terrain Y coordinate in world pixels (downwards positive)
 * for any world X coordinate.
 * Starting zone (-400 <= x <= 450) is gently rolling so the car spawns safely on a flat crest.
 */
export function getTerrainHeight(x: number): number {
  if (x <= 220) {
    // Gentle flat starting plateau with a subtle welcome dip
    return BASE_GROUND_Y + Math.sin(x * 0.008) * 5;
  }

  // Smooth ramp-in of hill amplitude after x = 220
  const distFromStart = x - 220;
  const ramp = Math.min(1, distFromStart / 1200);

  // Difficulty increases gradually with distance in meters
  const meters = Math.max(0, x / PIXELS_PER_METER);
  const difficultyScale = 0.72 + Math.min(1.5, meters / 950);

  // Layered octaves of smooth hills
  const lowFreq = (smoothNoise(x * 0.00135) - 0.5) * 195 * difficultyScale;
  const midFreq = (smoothNoise(x * 0.0034 + 42.1) - 0.5) * 82 * difficultyScale;
  const detailFreq = (smoothNoise(x * 0.0085 + 117.3) - 0.5) * 22 * Math.min(1.2, difficultyScale);

  // Occasional fun roller-coaster waves
  const wave = Math.sin(x * 0.0021) * 44 * difficultyScale;

  // Overall gradual climb upward (negative Y is higher elevation)
  const overallClimb = -Math.min(meters * 0.3, 600);

  return BASE_GROUND_Y + ramp * (lowFreq + midFreq + detailFreq + wave + overallClimb);
}

/**
 * Returns both height and slope angle (in radians) at world X.
 */
export function getTerrainHeightAndSlope(x: number): { y: number; slope: number; nx: number; ny: number } {
  const eps = 4;
  const y1 = getTerrainHeight(x - eps);
  const y2 = getTerrainHeight(x + eps);
  const dy = y2 - y1;
  const dx = eps * 2;
  const slope = Math.atan2(dy, dx);
  const len = Math.hypot(dx, dy);
  // Upward surface normal (since Y points downward, normal is (dy/len, -dx/len))
  return {
    y: (y1 + y2) * 0.5,
    slope,
    nx: dy / len,
    ny: -dx / len,
  };
}

export class TerrainWorld {
  public pickups: PickupItem[] = [];
  public scenery: SceneryProp[] = [];
  private nextPickupId = 1;
  private generatedUpToX = 0;
  private nextFuelX = 780;
  private nextCoinClusterX = 320;
  private nextMilestoneMeters = 100;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.pickups = [];
    this.scenery = [];
    this.nextPickupId = 1;
    this.generatedUpToX = -400;
    this.nextFuelX = 780;
    this.nextCoinClusterX = 320;
    this.nextMilestoneMeters = 100;
    this.ensureGeneratedUpTo(3200);
  }

  public ensureGeneratedUpTo(targetX: number): void {
    while (this.generatedUpToX < targetX) {
      const x = this.generatedUpToX;

      // Spawn milestone signposts every 100m
      const milestoneX = this.nextMilestoneMeters * PIXELS_PER_METER;
      if (x >= milestoneX) {
        const info = getTerrainHeightAndSlope(milestoneX);
        this.scenery.push({
          x: milestoneX,
          y: info.y,
          slope: info.slope,
          kind: 'signpost',
          scale: 1,
          seed: hash1D(milestoneX),
          milestoneMeters: this.nextMilestoneMeters,
        });
        this.nextMilestoneMeters += 100;
      }

      // Spawn decorative roadside trees, rocks, bushes
      if (x > -250) {
        const r = hash1D(x * 0.13);
        if (r < 0.42) {
          const info = getTerrainHeightAndSlope(x);
          const kindRoll = hash1D(x * 0.71);
          const kind: SceneryProp['kind'] =
            kindRoll < 0.42
              ? 'pine'
              : kindRoll < 0.72
              ? 'oak'
              : kindRoll < 0.88
              ? 'bush'
              : 'rock';
          this.scenery.push({
            x,
            y: info.y,
            slope: info.slope,
            kind,
            scale: 0.75 + hash1D(x * 0.37) * 0.55,
            seed: r,
          });
        }
      }

      // Spawn fuel cans at reliable intervals so skilled drivers can extend their run
      if (x >= this.nextFuelX) {
        const fy = getTerrainHeight(this.nextFuelX) - 34;
        this.pickups.push({
          id: this.nextPickupId++,
          x: this.nextFuelX,
          y: fy,
          type: 'fuel',
          value: 100,
          collected: false,
          collectAnim: 0,
        });
        const meters = this.nextFuelX / PIXELS_PER_METER;
        // Slightly wider intervals as distance grows, but always reachable
        const intervalMeters = Math.min(72, 42 + Math.floor(meters / 200) * 4);
        this.nextFuelX += intervalMeters * PIXELS_PER_METER;
      }

      // Spawn arcs of collectible coins along hills
      if (x >= this.nextCoinClusterX) {
        const count = 4 + Math.floor(hash1D(x * 0.19) * 4); // 4 to 7 coins
        const spacing = 52;
        const baseValueRoll = hash1D(x * 0.53);
        const coinValue = baseValueRoll > 0.75 ? 25 : baseValueRoll > 0.35 ? 10 : 5;

        for (let i = 0; i < count; i++) {
          const cx = this.nextCoinClusterX + i * spacing;
          // Avoid overlapping directly with a fuel can
          const nearFuel = this.pickups.some(
            (p) => p.type === 'fuel' && Math.abs(p.x - cx) < 48
          );
          if (!nearFuel) {
            const arcLift = Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 18;
            const cy = getTerrainHeight(cx) - 32 - arcLift;
            this.pickups.push({
              id: this.nextPickupId++,
              x: cx,
              y: cy,
              type: 'coin',
              value: coinValue,
              collected: false,
              collectAnim: 0,
            });
          }
        }

        this.nextCoinClusterX += (15 + Math.floor(hash1D(x * 0.29) * 12)) * PIXELS_PER_METER;
      }

      this.generatedUpToX += 110;
    }
  }

  public pruneBehind(minX: number): void {
    if (this.pickups.length > 160) {
      this.pickups = this.pickups.filter((p) => p.x > minX);
    }
    if (this.scenery.length > 160) {
      this.scenery = this.scenery.filter((s) => s.x > minX);
    }
  }
}
