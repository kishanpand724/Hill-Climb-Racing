export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type UpgradeKey = 'engine' | 'grip' | 'suspension' | 'fuel';

export interface UpgradeLevels {
  engine: number;
  grip: number;
  suspension: number;
  fuel: number;
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
  baseEngineForce: number;
  baseMaxSpeed: number;
  baseGrip: number;
  baseSuspensionStiffness: number;
  baseSuspensionDamping: number;
  baseSuspensionRestLength: number;
  baseFuelCapacity: number;
  airPitchTorque: number;
  bodyStyle: 'jeep' | 'buggy' | 'monster' | 'rover';
}

export interface EffectiveStats {
  engineForce: number;
  maxSpeed: number;
  grip: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  suspensionRestLength: number;
  fuelCapacity: number;
  fuelDrainRate: number;
  airPitchTorque: number;
}

export interface PickupItem {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'fuel';
  value: number;
  collected: boolean;
  collectAnim: number; // 0 to 1 after collection
}

export interface SceneryProp {
  x: number;
  y: number;
  slope: number;
  kind: 'pine' | 'oak' | 'rock' | 'bush' | 'signpost';
  scale: number;
  seed: number;
  milestoneMeters?: number;
}

export interface WheelState {
  worldX: number;
  worldY: number;
  groundY: number;
  compression: number;
  grounded: boolean;
  spinAngle: number;
  angularVel: number;
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
  distanceMeters: number;
  maxDistanceMeters: number;
  runCoins: number;
  flipsCount: number;
  airTimeSeconds: number;
  accumulatedAirAngle: number;
  wasGrounded: boolean;
  upsideDownTimer: number;
  outOfFuelTimer: number;
  crashed: boolean;
  outOfFuel: boolean;
  gameOverReason: 'none' | 'crashed' | 'fuel';
  driverHeadLagAngle: number;
  driverHeadLagVel: number;
  squashX: number;
  squashY: number;
  throttle: number; // -1 to 1
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
  kind: 'dirt' | 'smoke' | 'spark' | 'coin' | 'fuel';
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

export interface RunSummary {
  distanceMeters: number;
  bestDistanceMeters: number;
  isNewBest: boolean;
  coinsCollected: number;
  stuntBonusCoins: number;
  flipsCount: number;
  reason: 'crashed' | 'fuel';
  vehicleName: string;
}

export interface SavedProgress {
  coins: number;
  bestDistance: number;
  selectedVehicleId: string;
  unlockedVehicles: string[];
  upgrades: Record<string, UpgradeLevels>;
  muted: boolean;
}
