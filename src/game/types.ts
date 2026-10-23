export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type UpgradeKey = 'engine' | 'grip' | 'suspension' | 'fuel';

export type MapId = 'hills' | 'desert' | 'snow' | 'seasons';

export type SeasonId = 'spring' | 'summer' | 'monsoon' | 'winter';

export type WeatherKind = 'clear' | 'windy' | 'rain' | 'snow' | 'fog' | 'heat';

export type ObstacleKind =
  | 'small_rock'
  | 'large_rock'
  | 'rocky_step'
  | 'fallen_log'
  | 'steep_ramp'
  | 'bump_mogul'
  | 'broken_bridge'
  | 'moving_platform'
  | 'mud_pit'
  | 'ice_slick';

export interface TerrainObstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  currentX: number;
  width: number;
  height: number;
  friction: number;
  restitution: number;
  mass: number;
  seed: number;
  isMoving?: boolean;
  moveAmpX?: number;
  moveAmpY?: number;
  moveFreq?: number;
  movePhase?: number;
  currentOffsetY?: number;
  vx?: number;
  vy?: number;
}

export interface UpgradeLevels {
  engine: number;
  grip: number;
  suspension: number;
  fuel: number;
}

export interface VehicleCustomization {
  paintId: string;
  rimId: string;
  skinId: string;
  unlockedPaints: string[];
  unlockedRims: string[];
  unlockedSkins: string[];
}

export interface CosmeticOption {
  id: string;
  name: string;
  cost: number;
  primaryColor?: string;
  secondaryColor?: string;
  pattern?: 'stock' | 'stripes' | 'flames' | 'carbon';
  rimStyle?: 'sport' | 'beadlock' | 'turbine' | 'star';
}

export interface WeatherState {
  kind: WeatherKind;
  label: string;
  tractionMultiplier: number;
  windForce: number; // horizontal px/s^2 applied when airborne
  rainIntensity: number; // 0..1
  snowIntensity: number; // 0..1
  fogIntensity: number; // 0..1
  seasonId?: SeasonId;
  seasonName?: string;
  nextSeasonId?: SeasonId;
  seasonBlend?: number; // 0..1 transition blend
}

export interface MapSpec {
  id: MapId;
  name: string;
  subtitle: string;
  description: string;
  unlockCost: number;
  tractionMultiplier: number;
  gravityMultiplier: number;
  hillSteepness: number;
  jumpAmplitude: number;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  sunColor: string;
  mountainFar: [string, string];
  mountainMid: [string, string];
  mountainNear: [string, string];
  groundDeep: string;
  groundSub: string;
  surfaceShadow: string;
  surfaceMain: string;
  surfaceHighlight: string;
  dirtParticleColor: string;
  secondaryParticleColor: string;
  hasSnowfall: boolean;
}

export interface VehicleSpec {
  id: string;
  name: string;
  tagline: string;
  unlockCost: number;
  bodyColor: string;
  accentColor: string;
  trimColor: string;
  wheelRadius: number;
  wheelBase: number;
  chassisWidth: number;
  chassisHeight: number;
  massKg: number;
  rotationalInertia: number;
  baseEngineForce: number;
  baseMaxSpeed: number;
  baseGrip: number;
  baseSuspensionStiffness: number;
  baseSuspensionDamping: number;
  baseSuspensionRestLength: number;
  baseFuelCapacity: number;
  airPitchTorque: number;
  drivePitchReaction: number;
  obstacleClimbFactor: number;
  bodyStyle: 'climber' | 'jeep' | 'sports' | 'monster';
}

export interface EffectiveStats {
  engineForce: number;
  maxSpeed: number;
  grip: number;
  massKg: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  suspensionRestLength: number;
  fuelCapacity: number;
  fuelDrainRate: number;
  airPitchTorque: number;
  rotationalInertia: number;
  drivePitchReaction: number;
  obstacleClimbFactor: number;
}

export interface PickupItem {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'fuel' | 'treasure';
  value: number;
  collected: boolean;
  collectAnim: number;
  isSecret?: boolean;
}

export interface SecretPlatform {
  id: number;
  startX: number;
  endX: number;
  startY: number;
  peakY: number;
  endY: number;
}

export interface SceneryProp {
  x: number;
  y: number;
  slope: number;
  kind:
    | 'pine'
    | 'oak'
    | 'rock'
    | 'bush'
    | 'cactus'
    | 'dune_rock'
    | 'snow_pine'
    | 'ice_rock'
    | 'flower'
    | 'blossom_tree'
    | 'puddle'
    | 'ice_patch'
    | 'signpost';
  scale: number;
  seed: number;
  milestoneMeters?: number;
}

export interface WheelState {
  worldX: number;
  worldY: number;
  groundY: number;
  compression: number;
  prevCompression: number;
  grounded: boolean;
  spinAngle: number;
  angularVel: number;
  contactNormalX?: number;
  contactNormalY?: number;
  contactFriction?: number;
  onObstacleKind?: ObstacleKind | null;
}

export interface CarState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  rearWheel: WheelState;
  frontWheel: WheelState;
  fuel: number;
  maxFuel: number;
  condition: number; // 0..100 vehicle structural condition
  distanceMeters: number;
  maxDistanceMeters: number;
  runCoins: number;
  pickupCoins: number;
  flipBonusCoins: number;
  flipsCount: number;
  longJumpsCount: number;
  stuntCombo: number;
  maxStuntCombo: number;
  treasuresFound: number;
  rpm: number;
  airTimeSeconds: number;
  airStartX: number;
  accumulatedAirAngle: number;
  wasGrounded: boolean;
  onSecretRoute: boolean;
  upsideDownTimer: number;
  outOfFuelTimer: number;
  crashed: boolean;
  outOfFuel: boolean;
  gameOverReason: 'none' | 'crashed' | 'fuel';
  crashDetail?: string;
  driverHeadLagAngle: number;
  driverHeadLagVel: number;
  squashX: number;
  squashY: number;
  throttle: number;
  braking: boolean;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'dirt' | 'smoke' | 'spark' | 'coin' | 'fuel' | 'water' | 'petal';
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface MissionSpec {
  id: string;
  title: string;
  description: string;
  category: 'career' | 'map' | 'daily';
  mapId?: MapId;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  metric:
    | 'distance'
    | 'run_coins'
    | 'flips'
    | 'treasures'
    | 'seasons_driven'
    | 'clean_run_distance';
}

export interface RunSummary {
  distanceMeters: number;
  bestDistanceMeters: number;
  isNewBest: boolean;
  coinsCollected: number;
  pickupCoins: number;
  stuntBonusCoins: number;
  flipsCount: number;
  longJumpsCount: number;
  maxStuntCombo: number;
  treasuresFound: number;
  completedMissionTitles: string[];
  missionRewardCoins: number;
  finalCondition: number;
  reason: 'crashed' | 'fuel';
  reasonDetail: string;
  vehicleName: string;
  mapName: string;
}

export interface SavedProgress {
  coins: number;
  xp: number;
  bestDistance: number;
  bestDistanceByMap: Record<MapId, number>;
  selectedVehicleId: string;
  unlockedVehicles: string[];
  selectedMapId: MapId;
  unlockedMaps: MapId[];
  upgrades: Record<string, UpgradeLevels>;
  vehicleCondition: Record<string, number>;
  customization: Record<string, VehicleCustomization>;
  completedMissions: string[];
  missionProgress: Record<string, number>;
  muted: boolean;
}
