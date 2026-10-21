import { EffectiveStats, SavedProgress, UpgradeKey, UpgradeLevels, VehicleSpec } from './types';

export const MAX_UPGRADE_LEVEL = 8;

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'trail_blazer',
    name: 'Trail Blazer 4x4',
    tagline: 'Balanced all-terrain hill climber with rugged coil-over suspension.',
    unlockCost: 0,
    bodyColor: '#ef4444',
    accentColor: '#fbbf24',
    trimColor: '#1e293b',
    wheelRadius: 23,
    wheelBase: 86,
    chassisWidth: 118,
    chassisHeight: 40,
    baseEngineForce: 680,
    baseMaxSpeed: 640,
    baseGrip: 1.0,
    baseSuspensionStiffness: 175,
    baseSuspensionDamping: 14.5,
    baseSuspensionRestLength: 28,
    baseFuelCapacity: 100,
    airPitchTorque: 8.5,
    bodyStyle: 'jeep',
  },
  {
    id: 'dune_buggy',
    name: 'Sand Viper Buggy',
    tagline: 'Lightweight tubular frame built for high-speed ridge jumps and flips.',
    unlockCost: 250,
    bodyColor: '#f59e0b',
    accentColor: '#38bdf8',
    trimColor: '#0f172a',
    wheelRadius: 22,
    wheelBase: 90,
    chassisWidth: 122,
    chassisHeight: 34,
    baseEngineForce: 760,
    baseMaxSpeed: 740,
    baseGrip: 1.08,
    baseSuspensionStiffness: 195,
    baseSuspensionDamping: 15.5,
    baseSuspensionRestLength: 31,
    baseFuelCapacity: 105,
    airPitchTorque: 10.5,
    bodyStyle: 'buggy',
  },
  {
    id: 'monster_crusher',
    name: 'Titan Monster X',
    tagline: 'Oversized mud tires and deep suspension travel that crush steep crags.',
    unlockCost: 600,
    bodyColor: '#2563eb',
    accentColor: '#4ade80',
    trimColor: '#0f172a',
    wheelRadius: 31,
    wheelBase: 96,
    chassisWidth: 128,
    chassisHeight: 46,
    baseEngineForce: 850,
    baseMaxSpeed: 710,
    baseGrip: 1.22,
    baseSuspensionStiffness: 220,
    baseSuspensionDamping: 17.0,
    baseSuspensionRestLength: 36,
    baseFuelCapacity: 120,
    airPitchTorque: 9.2,
    bodyStyle: 'monster',
  },
  {
    id: 'lunar_rover',
    name: 'Apex Cyber Crawler',
    tagline: 'High-torque electric 600V drivetrain with ultra-low center of gravity.',
    unlockCost: 1200,
    bodyColor: '#10b981',
    accentColor: '#f43f5e',
    trimColor: '#090d16',
    wheelRadius: 25,
    wheelBase: 98,
    chassisWidth: 130,
    chassisHeight: 36,
    baseEngineForce: 940,
    baseMaxSpeed: 820,
    baseGrip: 1.32,
    baseSuspensionStiffness: 240,
    baseSuspensionDamping: 18.5,
    baseSuspensionRestLength: 33,
    baseFuelCapacity: 135,
    airPitchTorque: 11.2,
    bodyStyle: 'rover',
  },
];

export const UPGRADE_META: Record<
  UpgradeKey,
  { label: string; description: string; baseCost: number; costMultiplier: number }
> = {
  engine: {
    label: 'Engine Torque',
    description: 'Increases hill-climbing acceleration and top speed.',
    baseCost: 50,
    costMultiplier: 1.45,
  },
  grip: {
    label: 'Tire Traction',
    description: 'Improves grip on steep slopes and reduces wheel slip.',
    baseCost: 50,
    costMultiplier: 1.45,
  },
  suspension: {
    label: 'Shocks & Springs',
    description: 'Absorbs heavy landings and stabilizes high-speed bumps.',
    baseCost: 50,
    costMultiplier: 1.45,
  },
  fuel: {
    label: 'Fuel Tank',
    description: 'Expands fuel capacity and improves fuel efficiency.',
    baseCost: 50,
    costMultiplier: 1.45,
  },
};

export function getVehicleById(id: string): VehicleSpec {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

export function getUpgradeCost(key: UpgradeKey, currentLevel: number): number {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return 0;
  const meta = UPGRADE_META[key];
  return Math.round((meta.baseCost * Math.pow(meta.costMultiplier, currentLevel - 1)) / 5) * 5;
}

export function getEffectiveVehicleStats(
  spec: VehicleSpec,
  levels: UpgradeLevels
): EffectiveStats {
  const engineBonus = 1 + (levels.engine - 1) * 0.11;
  const speedBonus = 1 + (levels.engine - 1) * 0.08;
  const gripBonus = 1 + (levels.grip - 1) * 0.10;
  const suspBonus = 1 + (levels.suspension - 1) * 0.09;
  const dampBonus = 1 + (levels.suspension - 1) * 0.08;
  const fuelBonus = 1 + (levels.fuel - 1) * 0.14;
  const efficiencyBonus = 1 - (levels.fuel - 1) * 0.045;

  return {
    engineForce: spec.baseEngineForce * engineBonus,
    maxSpeed: spec.baseMaxSpeed * speedBonus,
    grip: spec.baseGrip * gripBonus,
    suspensionStiffness: spec.baseSuspensionStiffness * suspBonus,
    suspensionDamping: spec.baseSuspensionDamping * dampBonus,
    suspensionRestLength: spec.baseSuspensionRestLength + (levels.suspension - 1) * 1.2,
    fuelCapacity: Math.round(spec.baseFuelCapacity * fuelBonus),
    fuelDrainRate: 4.2 * Math.max(0.58, efficiencyBonus),
    airPitchTorque: spec.airPitchTorque * (1 + (levels.engine - 1) * 0.03),
  };
}

export function createDefaultProgress(): SavedProgress {
  const upgrades: Record<string, UpgradeLevels> = {};
  for (const v of VEHICLES) {
    upgrades[v.id] = { engine: 1, grip: 1, suspension: 1, fuel: 1 };
  }
  return {
    coins: 150, // Starting coins so players can test upgrades immediately
    bestDistance: 0,
    selectedVehicleId: VEHICLES[0].id,
    unlockedVehicles: [VEHICLES[0].id],
    upgrades,
    muted: false,
  };
}

export function canPurchaseUpgrade(
  progress: SavedProgress,
  vehicleId: string,
  key: UpgradeKey
): boolean {
  const levels = progress.upgrades[vehicleId];
  if (!levels) return false;
  const current = levels[key];
  if (current >= MAX_UPGRADE_LEVEL) return false;
  const cost = getUpgradeCost(key, current);
  return progress.coins >= cost;
}

export function purchaseUpgrade(
  progress: SavedProgress,
  vehicleId: string,
  key: UpgradeKey
): SavedProgress {
  if (!canPurchaseUpgrade(progress, vehicleId, key)) return progress;
  const current = progress.upgrades[vehicleId][key];
  const cost = getUpgradeCost(key, current);
  return {
    ...progress,
    coins: progress.coins - cost,
    upgrades: {
      ...progress.upgrades,
      [vehicleId]: {
        ...progress.upgrades[vehicleId],
        [key]: current + 1,
      },
    },
  };
}

export function unlockOrSelectVehicle(
  progress: SavedProgress,
  vehicleId: string
): SavedProgress {
  const spec = getVehicleById(vehicleId);
  if (progress.unlockedVehicles.includes(vehicleId)) {
    return {
      ...progress,
      selectedVehicleId: vehicleId,
    };
  }
  if (progress.coins < spec.unlockCost) {
    return progress;
  }
  return {
    ...progress,
    coins: progress.coins - spec.unlockCost,
    selectedVehicleId: vehicleId,
    unlockedVehicles: [...progress.unlockedVehicles, vehicleId],
  };
}
