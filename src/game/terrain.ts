import { getMapById, getSeasonBlendAtDistance } from './maps';
import {
  MapId,
  ObstacleKind,
  PickupItem,
  SceneryProp,
  SecretPlatform,
  TerrainObstacle,
} from './types';

export const PIXELS_PER_METER = 32;
export const BASE_GROUND_Y = 420;

// Deterministic hash for procedural noise
export function hash1D(n: number): number {
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

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Returns the exact base terrain Y coordinate in world pixels (downwards positive)
 * for any world X coordinate and selected MapId.
 */
export function getTerrainHeight(x: number, mapId: MapId = 'hills'): number {
  if (x <= 180) {
    return BASE_GROUND_Y;
  }

  const distFromStart = x - 180;
  const linearRamp = Math.min(1, distFromStart / 950);
  const ramp = linearRamp * linearRamp * (3 - 2 * linearRamp);
  const meters = Math.max(0, x / PIXELS_PER_METER);
  const mapSpec = getMapById(mapId);

  const difficultyScale =
    (0.8 + Math.min(1.55, meters / 850)) * mapSpec.hillSteepness;

  if (mapId === 'desert') {
    const duneMacro = (smoothNoise(x * 0.00125 + 19.4) - 0.5) * 235 * difficultyScale;
    const duneRamp = Math.sin(x * 0.0028) * 78 * mapSpec.jumpAmplitude;
    const sharpCrest =
      Math.pow(Math.sin(x * 0.0019 + 0.8), 3) * 64 * mapSpec.jumpAmplitude;
    const ripples = (smoothNoise(x * 0.0075 + 91.2) - 0.5) * 24;
    const overallClimb = -Math.min(meters * 0.32, 650);

    return (
      BASE_GROUND_Y +
      ramp * (duneMacro + duneRamp + sharpCrest + ripples + overallClimb)
    );
  }

  if (mapId === 'snow') {
    const alpineMacro = (smoothNoise(x * 0.0015 + 73.1) - 0.5) * 240 * difficultyScale;
    const ridgeWave = Math.sin(x * 0.0024 + 1.2) * 62 * difficultyScale;
    const icyMoguls = Math.cos(x * 0.0068) * 26 * Math.min(1.4, difficultyScale);
    const cragDetail = (smoothNoise(x * 0.01 + 205.7) - 0.5) * 24;
    const overallClimb = -Math.min(meters * 0.42, 780);

    return (
      BASE_GROUND_Y +
      ramp * (alpineMacro + ridgeWave + icyMoguls + cragDetail + overallClimb)
    );
  }

  if (mapId === 'seasons') {
    // Flowing valley terrain with dips, crests, and terraces that remain continuous across all four seasons
    const valleyMacro = (smoothNoise(x * 0.0013 + 31.7) - 0.5) * 225 * difficultyScale;
    const rollingHills = Math.sin(x * 0.0025 + 0.4) * 70 * mapSpec.jumpAmplitude;
    const launchTerrace =
      Math.pow(Math.cos(x * 0.0017), 3) * 54 * mapSpec.jumpAmplitude;
    const meadowDetail = (smoothNoise(x * 0.008 + 144.2) - 0.5) * 22;
    const overallClimb = -Math.min(meters * 0.34, 680);

    return (
      BASE_GROUND_Y +
      ramp * (valleyMacro + rollingHills + launchTerrace + meadowDetail + overallClimb)
    );
  }

  // Default: 'hills' (Green Hills)
  const lowFreq = (smoothNoise(x * 0.00138) - 0.5) * 205 * difficultyScale;
  const midFreq = (smoothNoise(x * 0.0036 + 42.1) - 0.5) * 88 * difficultyScale;
  const detailFreq =
    (smoothNoise(x * 0.0085 + 117.3) - 0.5) * 24 * Math.min(1.25, difficultyScale);
  const wave = Math.sin(x * 0.0022) * 48 * difficultyScale;
  const overallClimb = -Math.min(meters * 0.3, 600);

  return BASE_GROUND_Y + ramp * (lowFreq + midFreq + detailFreq + wave + overallClimb);
}

/**
 * Single source of truth for obstacle geometry (used by both Physics Collision and Canvas Renderer).
 * Returns the vertical height offset (positive = raised above base terrain, negative = depressed)
 * at world coordinate `worldX` for a given `TerrainObstacle`.
 */
export function getObstacleHeightOffset(obs: TerrainObstacle, worldX: number): number {
  const halfW = obs.width * 0.5;
  const startX = obs.currentX - halfW;
  const endX = obs.currentX + halfW;
  if (worldX <= startX || worldX >= endX) {
    return 0;
  }

  const u = (worldX - startX) / Math.max(1, obs.width); // 0..1 across obstacle width
  const h = obs.height;
  const verticalShift = obs.currentOffsetY ? -obs.currentOffsetY : 0;

  switch (obs.kind) {
    case 'small_rock': {
      // Smooth rounded boulder with subtle natural rock facets, climbable from both sides
      const dome = Math.pow(Math.sin(u * Math.PI), 1.25);
      const facet = 0.93 + 0.07 * Math.sin(u * Math.PI * 3 + obs.seed * 4);
      return h * dome * facet + verticalShift;
    }

    case 'large_rock': {
      // Multi-faceted rock formation with sloped climbable shoulders and a craggy crown
      let profile = 0;
      if (u < 0.36) {
        const s = smoothstep(0, 0.36, u);
        profile = s * (0.92 + 0.08 * Math.sin(u * Math.PI * 5));
      } else if (u <= 0.66) {
        const crownU = (u - 0.36) / 0.3;
        profile = 0.92 + 0.08 * Math.sin(crownU * Math.PI);
      } else {
        const s = 1 - smoothstep(0.66, 1.0, u);
        profile = s * (0.92 + 0.08 * Math.cos(u * Math.PI * 4));
      }
      return h * profile + verticalShift;
    }

    case 'rocky_step': {
      // Two-tier natural rocky steps requiring throttle and suspension articulation
      let profile = 0;
      if (u < 0.25) {
        profile = smoothstep(0, 0.25, u) * 0.54;
      } else if (u < 0.46) {
        profile = 0.54 + 0.03 * Math.sin(((u - 0.25) / 0.21) * Math.PI);
      } else if (u < 0.68) {
        profile = 0.54 + smoothstep(0.46, 0.68, u) * 0.46;
      } else if (u < 0.82) {
        profile = 1.0;
      } else {
        profile = 1.0 - smoothstep(0.82, 1.0, u);
      }
      return h * profile + verticalShift;
    }

    case 'fallen_log': {
      // Fallen cylindrical tree trunk with natural soil/moss fillets at both bases
      const arch = Math.pow(Math.sin(u * Math.PI), 0.9);
      const barkBump = 0.96 + 0.04 * Math.cos(u * Math.PI * 6);
      return h * arch * barkBump + verticalShift;
    }

    case 'steep_ramp': {
      // Launch ramp: gradual curved entry rising to a launch lip, then sloped back support
      let profile = 0;
      if (u < 0.78) {
        const t = u / 0.78;
        profile = Math.pow(t, 1.15) * smoothstep(0, 0.14, u);
      } else if (u < 0.85) {
        profile = 1.0;
      } else {
        profile = 1.0 - smoothstep(0.85, 1.0, u);
      }
      return h * profile + verticalShift;
    }

    case 'bump_mogul': {
      // Sequence of 3 closely spaced washboard bumps that test suspension damping
      const envelope = Math.sin(u * Math.PI);
      const ripples = 0.42 + 0.58 * Math.pow(Math.sin(u * Math.PI * 3), 2);
      return h * envelope * ripples + verticalShift;
    }

    case 'broken_bridge': {
      // Timber bridge deck with approach ramps and a traversable sagged/broken middle plank section
      let profile = 0;
      if (u < 0.18) {
        profile = smoothstep(0, 0.18, u);
      } else if (u <= 0.82) {
        const midDip = 1 - 0.28 * Math.exp(-Math.pow((u - 0.5) / 0.12, 2));
        profile = midDip;
      } else {
        profile = 1.0 - smoothstep(0.82, 1.0, u);
      }
      return h * profile + verticalShift;
    }

    case 'moving_platform': {
      // Kinetic platform with smooth entry/exit ramps on both ends
      let profile = 0;
      if (u < 0.22) {
        profile = smoothstep(0, 0.22, u);
      } else if (u <= 0.78) {
        profile = 1.0;
      } else {
        profile = 1.0 - smoothstep(0.78, 1.0, u);
      }
      return Math.max(0, h * profile + verticalShift);
    }

    case 'mud_pit': {
      // Shallow muddy depression that reduces tire grip
      return -3.5 * Math.sin(u * Math.PI);
    }

    case 'ice_slick': {
      // Glazed ice sheet slightly raised on the road
      return 2.0 * Math.sin(u * Math.PI);
    }

    default:
      return 0;
  }
}

export interface CompositeSurfaceInfo {
  y: number;
  baseTerrainY: number;
  slope: number;
  nx: number;
  ny: number;
  friction: number;
  restitution: number;
  obstacle: TerrainObstacle | null;
  obstacleVx: number;
  obstacleVy: number;
}

/**
 * Evaluates the composite world surface (base terrain + solid/surface obstacles) at world X.
 */
export function getCompositeTerrainHeight(
  x: number,
  mapId: MapId = 'hills',
  obstacles: TerrainObstacle[] = []
): {
  y: number;
  baseTerrainY: number;
  friction: number;
  restitution: number;
  obstacle: TerrainObstacle | null;
} {
  const baseTerrainY = getTerrainHeight(x, mapId);
  let bestY = baseTerrainY;
  let friction = 1.0;
  let restitution = 0.08;
  let activeObs: TerrainObstacle | null = null;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const halfW = obs.width * 0.5;
    if (x >= obs.currentX - halfW && x <= obs.currentX + halfW) {
      const offset = getObstacleHeightOffset(obs, x);
      const candY = baseTerrainY - offset;
      if (obs.kind === 'mud_pit' || obs.kind === 'ice_slick') {
        if (!activeObs) {
          bestY = candY;
          friction = obs.friction;
          restitution = obs.restitution;
          activeObs = obs;
        }
      } else if (candY < bestY) {
        bestY = candY;
        friction = obs.friction;
        restitution = obs.restitution;
        activeObs = obs;
      }
    }
  }

  return {
    y: bestY,
    baseTerrainY,
    friction,
    restitution,
    obstacle: activeObs,
  };
}

/**
 * Returns height, slope angle (in radians), upward surface normal, and physical properties
 * for the composite world surface (terrain + obstacles) at world X.
 */
export function getCompositeSurfaceInfo(
  x: number,
  mapId: MapId = 'hills',
  obstacles: TerrainObstacle[] = []
): CompositeSurfaceInfo {
  const eps = 3.0;
  const center = getCompositeTerrainHeight(x, mapId, obstacles);
  const left = getCompositeTerrainHeight(x - eps, mapId, obstacles);
  const right = getCompositeTerrainHeight(x + eps, mapId, obstacles);

  const dy = right.y - left.y;
  const dx = eps * 2;
  const slope = Math.atan2(dy, dx);
  const len = Math.hypot(dx, dy);

  return {
    y: center.y,
    baseTerrainY: center.baseTerrainY,
    slope,
    nx: dy / len,
    ny: -dx / len,
    friction: center.friction,
    restitution: center.restitution,
    obstacle: center.obstacle,
    obstacleVx: center.obstacle?.vx ?? 0,
    obstacleVy: center.obstacle?.vy ?? 0,
  };
}

/**
 * Returns height, slope angle (in radians), and upward surface normal at world X
 * for base terrain (plus optional obstacles).
 */
export function getTerrainHeightAndSlope(
  x: number,
  mapId: MapId = 'hills',
  obstacles: TerrainObstacle[] = []
): { y: number; slope: number; nx: number; ny: number } {
  if (obstacles.length > 0) {
    const info = getCompositeSurfaceInfo(x, mapId, obstacles);
    return {
      y: info.y,
      slope: info.slope,
      nx: info.nx,
      ny: info.ny,
    };
  }
  const eps = 4;
  const y1 = getTerrainHeight(x - eps, mapId);
  const y2 = getTerrainHeight(x + eps, mapId);
  const dy = y2 - y1;
  const dx = eps * 2;
  const slope = Math.atan2(dy, dx);
  const len = Math.hypot(dx, dy);
  return {
    y: (y1 + y2) * 0.5,
    slope,
    nx: dy / len,
    ny: -dx / len,
  };
}

/**
 * Computes the deck Y height and slope of an elevated SecretPlatform shortcut bridge at world X.
 */
export function getPlatformHeightAt(plat: SecretPlatform, x: number): number {
  const t = Math.max(
    0,
    Math.min(1, (x - plat.startX) / Math.max(1, plat.endX - plat.startX))
  );
  const linearY = plat.startY + (plat.endY - plat.startY) * t;
  const archOffset =
    Math.sin(t * Math.PI) * (plat.peakY - (plat.startY + plat.endY) * 0.5);
  return linearY + archOffset;
}

export function getPlatformHeightAndSlope(
  plat: SecretPlatform,
  x: number
): { y: number; slope: number; nx: number; ny: number } {
  const eps = 4;
  const y1 = getPlatformHeightAt(plat, x - eps);
  const y2 = getPlatformHeightAt(plat, x + eps);
  const dy = y2 - y1;
  const dx = eps * 2;
  const slope = Math.atan2(dy, dx);
  const len = Math.hypot(dx, dy);
  return {
    y: (y1 + y2) * 0.5,
    slope,
    nx: dy / len,
    ny: -dx / len,
  };
}

export function createObstacleSpec(
  id: number,
  kind: ObstacleKind,
  x: number,
  difficultyScale = 1,
  seed = 0.5
): TerrainObstacle {
  const clampScale = Math.max(0.85, Math.min(1.35, difficultyScale));
  switch (kind) {
    case 'small_rock':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(64 + seed * 16),
        height: Math.round((18 + seed * 6) * clampScale),
        friction: 0.98,
        restitution: 0.1,
        mass: 500,
        seed,
      };
    case 'large_rock':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(115 + seed * 24),
        height: Math.round((30 + seed * 8) * clampScale),
        friction: 0.95,
        restitution: 0.12,
        mass: 1400,
        seed,
      };
    case 'rocky_step':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(155 + seed * 28),
        height: Math.round((27 + seed * 7) * clampScale),
        friction: 1.0,
        restitution: 0.08,
        mass: 1800,
        seed,
      };
    case 'fallen_log':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(62 + seed * 14),
        height: Math.round((20 + seed * 5) * clampScale),
        friction: 0.88,
        restitution: 0.14,
        mass: 420,
        seed,
      };
    case 'steep_ramp':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(128 + seed * 24),
        height: Math.round((34 + seed * 10) * clampScale),
        friction: 1.06,
        restitution: 0.05,
        mass: 1200,
        seed,
      };
    case 'bump_mogul':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(160 + seed * 30),
        height: Math.round((18 + seed * 6) * clampScale),
        friction: 0.92,
        restitution: 0.18,
        mass: 900,
        seed,
      };
    case 'broken_bridge':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(195 + seed * 35),
        height: Math.round((24 + seed * 6) * clampScale),
        friction: 0.96,
        restitution: 0.08,
        mass: 1500,
        seed,
      };
    case 'moving_platform':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: 145,
        height: 22,
        friction: 1.02,
        restitution: 0.06,
        mass: 2000,
        seed,
        isMoving: true,
        moveAmpX: 46,
        moveAmpY: 6,
        moveFreq: 1.45,
        movePhase: seed * Math.PI * 2,
        currentOffsetY: 0,
        vx: 0,
        vy: 0,
      };
    case 'mud_pit':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(110 + seed * 35),
        height: 4,
        friction: 0.54,
        restitution: 0.02,
        mass: 100,
        seed,
      };
    case 'ice_slick':
      return {
        id,
        kind,
        x,
        currentX: x,
        width: Math.round(115 + seed * 35),
        height: 3,
        friction: 0.38,
        restitution: 0.04,
        mass: 100,
        seed,
      };
  }
}

export class TerrainWorld {
  public pickups: PickupItem[] = [];
  public scenery: SceneryProp[] = [];
  public platforms: SecretPlatform[] = [];
  public obstacles: TerrainObstacle[] = [];
  public mapId: MapId = 'hills';
  private nextPickupId = 1;
  private nextPlatformId = 1;
  private nextObstacleId = 1;
  private generatedUpToX = 0;
  private nextFuelX = 780;
  private nextCoinClusterX = 320;
  private nextObstacleX = 340;
  private nextSecretPlatformX = 1650; // First secret bridge around ~52m
  private nextMilestoneMeters = 100;

  constructor(mapId: MapId = 'hills') {
    this.reset(mapId);
  }

  public reset(mapId: MapId = this.mapId): void {
    this.mapId = mapId;
    this.pickups = [];
    this.scenery = [];
    this.platforms = [];
    this.obstacles = [];
    this.nextPickupId = 1;
    this.nextPlatformId = 1;
    this.nextObstacleId = 1;
    this.generatedUpToX = -400;
    this.nextFuelX = 780;
    this.nextCoinClusterX = 320;
    this.nextObstacleX = 340;
    this.nextSecretPlatformX = 1650;
    this.nextMilestoneMeters = 100;
    this.ensureGeneratedUpTo(3400);
  }

  public updateObstacles(elapsedTime: number): void {
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (!obs.isMoving) continue;
      const freq = obs.moveFreq ?? 1.4;
      const phase = obs.movePhase ?? 0;
      const ampX = obs.moveAmpX ?? 42;
      const ampY = obs.moveAmpY ?? 6;
      const arg = elapsedTime * freq + phase;

      obs.currentX = obs.x + Math.sin(arg) * ampX;
      obs.currentOffsetY = Math.cos(arg) * ampY;
      obs.vx = Math.cos(arg) * ampX * freq;
      obs.vy = -Math.sin(arg) * ampY * freq;
    }
  }

  private chooseObstacleKind(x: number, ordinal: number): ObstacleKind {
    // Introductory showcase sequence so every obstacle type is encountered early & fairly
    const introSequence: ObstacleKind[] = [
      'small_rock',
      'fallen_log',
      'rocky_step',
      'steep_ramp',
      'large_rock',
      'bump_mogul',
      'broken_bridge',
      'moving_platform',
    ];
    if (ordinal < introSequence.length) {
      return introSequence[ordinal];
    }

    const meters = Math.max(0, x / PIXELS_PER_METER);
    const r = hash1D(x * 0.31 + ordinal * 7.13);

    if (this.mapId === 'seasons') {
      const { current } = getSeasonBlendAtDistance(meters);
      if (current.id === 'spring') {
        if (r < 0.22) return 'fallen_log';
        if (r < 0.42) return 'small_rock';
        if (r < 0.58) return 'mud_pit';
        if (r < 0.74) return 'steep_ramp';
        if (r < 0.88) return 'broken_bridge';
        return 'rocky_step';
      }
      if (current.id === 'summer') {
        if (r < 0.25) return 'rocky_step';
        if (r < 0.48) return 'large_rock';
        if (r < 0.68) return 'steep_ramp';
        if (r < 0.85) return 'bump_mogul';
        return 'moving_platform';
      }
      if (current.id === 'monsoon') {
        if (r < 0.28) return 'mud_pit';
        if (r < 0.48) return 'fallen_log';
        if (r < 0.66) return 'broken_bridge';
        if (r < 0.84) return 'large_rock';
        return 'rocky_step';
      }
      // winter
      if (r < 0.28) return 'ice_slick';
      if (r < 0.48) return 'rocky_step';
      if (r < 0.68) return 'large_rock';
      if (r < 0.84) return 'bump_mogul';
      return 'moving_platform';
    }

    if (this.mapId === 'desert') {
      if (r < 0.24) return 'rocky_step';
      if (r < 0.46) return 'large_rock';
      if (r < 0.66) return 'steep_ramp';
      if (r < 0.84) return 'bump_mogul';
      return 'moving_platform';
    }

    if (this.mapId === 'snow') {
      if (r < 0.26) return 'ice_slick';
      if (r < 0.46) return 'large_rock';
      if (r < 0.64) return 'rocky_step';
      if (r < 0.82) return 'bump_mogul';
      return 'broken_bridge';
    }

    // Green Hills default mix
    if (r < 0.18) return 'small_rock';
    if (r < 0.34) return 'fallen_log';
    if (r < 0.50) return 'rocky_step';
    if (r < 0.64) return 'steep_ramp';
    if (r < 0.76) return 'large_rock';
    if (r < 0.86) return 'bump_mogul';
    if (r < 0.94) return 'broken_bridge';
    return 'moving_platform';
  }

  public ensureGeneratedUpTo(targetX: number): void {
    while (this.generatedUpToX < targetX) {
      const x = this.generatedUpToX;

      // 1. Spawn physical traversable obstacles with matching collision & visual geometry
      if (x >= this.nextObstacleX) {
        const obsX = this.nextObstacleX;
        const meters = Math.max(0, obsX / PIXELS_PER_METER);
        const ordinal = this.nextObstacleId - 1;
        const difficultyScale = 0.88 + Math.min(0.42, meters / 650);
        const seed = hash1D(obsX * 0.23 + ordinal * 13.7);
        const kind = this.chooseObstacleKind(obsX, ordinal);

        const obs = createObstacleSpec(
          this.nextObstacleId++,
          kind,
          obsX,
          difficultyScale,
          seed
        );
        this.obstacles.push(obs);

        // Place bonus coins over steep ramps and large obstacles to reward climbing/jumping
        if (kind === 'steep_ramp' || kind === 'large_rock' || kind === 'broken_bridge') {
          const bonusCount = 3;
          for (let b = 0; b < bonusCount; b++) {
            const bx = obsX - 30 + b * 36;
            const compY = getCompositeTerrainHeight(bx, this.mapId, this.obstacles).y;
            const lift = kind === 'steep_ramp' ? 58 + b * 14 : 36;
            this.pickups.push({
              id: this.nextPickupId++,
              x: bx,
              y: compY - lift,
              type: 'coin',
              value: 25,
              collected: false,
              collectAnim: 0,
            });
          }
        }

        // Fair spacing between obstacles (320px to 440px) so player always has approach room
        const spacing = 310 + Math.floor(hash1D(obsX * 0.61) * 135);
        this.nextObstacleX += spacing;
      }

      // 2. Spawn milestone signposts every 100m
      const milestoneX = this.nextMilestoneMeters * PIXELS_PER_METER;
      if (x >= milestoneX) {
        const info = getTerrainHeightAndSlope(milestoneX, this.mapId);
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

      // 3. Spawn Elevated Secret Route Bridge + Hidden Coin Trail + Rare Treasure Crate
      if (x >= this.nextSecretPlatformX) {
        const span = 480;
        const startX = this.nextSecretPlatformX;
        const endX = startX + span;
        const groundStart = getTerrainHeight(startX, this.mapId);
        const groundEnd = getTerrainHeight(endX, this.mapId);
        const groundMid = getTerrainHeight(startX + span * 0.5, this.mapId);

        const startY = groundStart - 22;
        const endY = groundEnd - 18;
        const peakY = Math.min(groundMid, (startY + endY) * 0.5) - 82;

        const plat: SecretPlatform = {
          id: this.nextPlatformId++,
          startX,
          endX,
          startY,
          peakY,
          endY,
        };
        this.platforms.push(plat);

        const numBridgeCoins = 6;
        for (let i = 0; i < numBridgeCoins; i++) {
          const t = (i + 0.5) / numBridgeCoins;
          const bx = startX + span * t;
          const by = getPlatformHeightAt(plat, bx) - 30;
          if (i === Math.floor(numBridgeCoins / 2)) {
            this.pickups.push({
              id: this.nextPickupId++,
              x: bx,
              y: by - 4,
              type: 'treasure',
              value: 150,
              collected: false,
              collectAnim: 0,
              isSecret: true,
            });
          } else {
            this.pickups.push({
              id: this.nextPickupId++,
              x: bx,
              y: by,
              type: 'coin',
              value: 25,
              collected: false,
              collectAnim: 0,
              isSecret: true,
            });
          }
        }

        this.nextSecretPlatformX +=
          (68 + Math.floor(hash1D(x * 0.41) * 28)) * PIXELS_PER_METER;
      }

      // 4. Spawn biome-specific and season-specific roadside scenery (behind the road)
      if (x > -250) {
        const r = hash1D(x * 0.13);
        if (r < 0.48) {
          const info = getTerrainHeightAndSlope(x, this.mapId);
          const kindRoll = hash1D(x * 0.71);
          let kind: SceneryProp['kind'];

          if (this.mapId === 'desert') {
            kind =
              kindRoll < 0.58
                ? 'cactus'
                : kindRoll < 0.85
                ? 'dune_rock'
                : 'bush';
          } else if (this.mapId === 'snow') {
            kind =
              kindRoll < 0.65
                ? 'snow_pine'
                : kindRoll < 0.86
                ? 'ice_rock'
                : 'ice_patch';
          } else if (this.mapId === 'seasons') {
            const meters = Math.max(0, x / PIXELS_PER_METER);
            const { current } = getSeasonBlendAtDistance(meters);
            if (current.id === 'spring') {
              kind =
                kindRoll < 0.44
                  ? 'blossom_tree'
                  : kindRoll < 0.82
                  ? 'flower'
                  : 'oak';
            } else if (current.id === 'summer') {
              kind =
                kindRoll < 0.48
                  ? 'oak'
                  : kindRoll < 0.82
                  ? 'dune_rock'
                  : 'bush';
            } else if (current.id === 'monsoon') {
              kind =
                kindRoll < 0.44
                  ? 'puddle'
                  : kindRoll < 0.8
                  ? 'pine'
                  : 'rock';
            } else {
              kind =
                kindRoll < 0.58
                  ? 'snow_pine'
                  : kindRoll < 0.84
                  ? 'ice_patch'
                  : 'ice_rock';
            }
          } else {
            kind =
              kindRoll < 0.4
                ? 'pine'
                : kindRoll < 0.68
                ? 'oak'
                : kindRoll < 0.86
                ? 'flower'
                : 'puddle';
          }

          this.scenery.push({
            x,
            y: info.y,
            slope: info.slope,
            kind,
            scale: 0.78 + hash1D(x * 0.37) * 0.55,
            seed: r,
          });
        }
      }

      // 5. Spawn fuel cans at reliable intervals above composite terrain + obstacles
      if (x >= this.nextFuelX) {
        const fy =
          getCompositeTerrainHeight(this.nextFuelX, this.mapId, this.obstacles).y - 34;
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
        const intervalMeters = Math.min(70, 42 + Math.floor(meters / 220) * 4);
        this.nextFuelX += intervalMeters * PIXELS_PER_METER;
      }

      // 6. Spawn lines and aerial jump-arc clusters of collectible coins along hills
      if (x >= this.nextCoinClusterX) {
        const count = 5 + Math.floor(hash1D(x * 0.19) * 4);
        const spacing = 48;
        const baseValueRoll = hash1D(x * 0.53);
        const coinValue = baseValueRoll > 0.75 ? 25 : baseValueRoll > 0.35 ? 10 : 5;
        const isAerialJumpArc = hash1D(x * 0.83) > 0.48;
        const peakLift = isAerialJumpArc ? 76 : 22;

        for (let i = 0; i < count; i++) {
          const cx = this.nextCoinClusterX + i * spacing;
          const nearFuel = this.pickups.some(
            (p) => p.type === 'fuel' && Math.abs(p.x - cx) < 48
          );
          if (!nearFuel) {
            const arcLift = Math.sin((i / Math.max(1, count - 1)) * Math.PI) * peakLift;
            const cy =
              getCompositeTerrainHeight(cx, this.mapId, this.obstacles).y - 32 - arcLift;
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

        this.nextCoinClusterX +=
          (14 + Math.floor(hash1D(x * 0.29) * 11)) * PIXELS_PER_METER;
      }

      this.generatedUpToX += 110;
    }
  }

  public updatePickupAnimations(dt: number): void {
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (p.collected && p.collectAnim > 0 && p.collectAnim < 1) {
        p.collectAnim = Math.min(1, p.collectAnim + dt * 3.8);
      }
    }
  }

  public pruneBehind(minX: number): void {
    if (this.pickups.length > 180) {
      this.pickups = this.pickups.filter(
        (p) => p.x > minX && (!p.collected || p.collectAnim < 1)
      );
    }
    if (this.scenery.length > 180) {
      this.scenery = this.scenery.filter((s) => s.x > minX);
    }
    if (this.platforms.length > 16) {
      this.platforms = this.platforms.filter((pl) => pl.endX > minX);
    }
    if (this.obstacles.length > 48) {
      this.obstacles = this.obstacles.filter((o) => o.currentX + o.width > minX);
    }
  }
}
