import { getMapById, MAPS } from './maps';
import {
  CosmeticOption,
  EffectiveStats,
  MapId,
  MissionSpec,
  SavedProgress,
  UpgradeKey,
  UpgradeLevels,
  VehicleCustomization,
  VehicleSpec,
} from './types';

export const MAX_UPGRADE_LEVEL = 8;

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'trail_blazer',
    name: 'Hill Climber',
    tagline:
      'Agile open-top hill racer with balanced coil-over suspension and lively air control.',
    unlockCost: 0,
    bodyColor: '#ef4444',
    accentColor: '#fbbf24',
    trimColor: '#1e293b',
    wheelRadius: 23,
    wheelBase: 86,
    chassisWidth: 118,
    chassisHeight: 38,
    massKg: 1150,
    rotationalInertia: 1.0,
    baseEngineForce: 750,
    baseMaxSpeed: 660,
    baseGrip: 1.02,
    baseSuspensionStiffness: 185,
    baseSuspensionDamping: 15.5,
    baseSuspensionRestLength: 30,
    baseFuelCapacity: 100,
    airPitchTorque: 9.2,
    drivePitchReaction: 2.25,
    obstacleClimbFactor: 1.02,
    bodyStyle: 'climber',
  },
  {
    id: 'jeep',
    name: 'Off-Road Jeep',
    tagline:
      'Sturdy heavy-duty 4x4 with a reinforced roll cage, oversized mud tires, and deep rock-crawling suspension travel.',
    unlockCost: 150,
    bodyColor: '#16a34a',
    accentColor: '#f59e0b',
    trimColor: '#0f172a',
    wheelRadius: 29,
    wheelBase: 98,
    chassisWidth: 132,
    chassisHeight: 46,
    massKg: 1580,
    rotationalInertia: 1.32,
    baseEngineForce: 980,
    baseMaxSpeed: 690,
    baseGrip: 1.26,
    baseSuspensionStiffness: 230,
    baseSuspensionDamping: 18.0,
    baseSuspensionRestLength: 37,
    baseFuelCapacity: 120,
    airPitchTorque: 8.6,
    drivePitchReaction: 1.8,
    obstacleClimbFactor: 1.32,
    bodyStyle: 'jeep',
  },
  {
    id: 'sports_car',
    name: 'Sports Car',
    tagline:
      'Low-slung lightweight aerodynamic coupe with blistering acceleration and top speed, best suited to smooth roads and ramps.',
    unlockCost: 200,
    bodyColor: '#0ea5e9',
    accentColor: '#f43f5e',
    trimColor: '#090d16',
    wheelRadius: 21,
    wheelBase: 94,
    chassisWidth: 128,
    chassisHeight: 28,
    massKg: 960,
    rotationalInertia: 0.86,
    baseEngineForce: 890,
    baseMaxSpeed: 840,
    baseGrip: 1.12,
    baseSuspensionStiffness: 210,
    baseSuspensionDamping: 16.5,
    baseSuspensionRestLength: 23,
    baseFuelCapacity: 110,
    airPitchTorque: 10.6,
    drivePitchReaction: 2.45,
    obstacleClimbFactor: 0.76,
    bodyStyle: 'sports',
  },
  {
    id: 'monster_truck',
    name: 'Monster Truck',
    tagline:
      'Colossal lifted powerhouse with giant mud-bogger tires, towering ground clearance, and boulder-crushing momentum.',
    unlockCost: 350,
    bodyColor: '#7c3aed',
    accentColor: '#facc15',
    trimColor: '#0f172a',
    wheelRadius: 36,
    wheelBase: 108,
    chassisWidth: 142,
    chassisHeight: 50,
    massKg: 2150,
    rotationalInertia: 1.55,
    baseEngineForce: 1220,
    baseMaxSpeed: 735,
    baseGrip: 1.38,
    baseSuspensionStiffness: 275,
    baseSuspensionDamping: 21.0,
    baseSuspensionRestLength: 44,
    baseFuelCapacity: 135,
    airPitchTorque: 8.4,
    drivePitchReaction: 1.6,
    obstacleClimbFactor: 1.52,
    bodyStyle: 'monster',
  },
];

export const PAINT_OPTIONS: CosmeticOption[] = [
  { id: 'stock', name: 'Factory Original', cost: 0 },
  {
    id: 'crimson',
    name: 'Nitro Crimson',
    cost: 0,
    primaryColor: '#dc2626',
    secondaryColor: '#fde047',
  },
  {
    id: 'emerald',
    name: 'Viper Emerald',
    cost: 60,
    primaryColor: '#10b981',
    secondaryColor: '#0f172a',
  },
  {
    id: 'cobalt',
    name: 'Electric Cobalt',
    cost: 75,
    primaryColor: '#2563eb',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'gold',
    name: 'Championship Gold',
    cost: 120,
    primaryColor: '#eab308',
    secondaryColor: '#1e293b',
  },
];

export const RIM_OPTIONS: CosmeticOption[] = [
  { id: 'sport', name: 'Sport 5-Spoke', cost: 0, rimStyle: 'sport', secondaryColor: '#cbd5e1' },
  {
    id: 'beadlock',
    name: 'Off-Road Beadlock',
    cost: 50,
    rimStyle: 'beadlock',
    secondaryColor: '#fbbf24',
  },
  {
    id: 'turbine',
    name: 'Aero Turbine',
    cost: 80,
    rimStyle: 'turbine',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'star',
    name: 'Gold Racing Star',
    cost: 110,
    rimStyle: 'star',
    secondaryColor: '#facc15',
  },
];

export const SKIN_OPTIONS: CosmeticOption[] = [
  { id: 'stock', name: 'Clean Stock', cost: 0, pattern: 'stock' },
  { id: 'stripes', name: 'Twin Rally Stripes', cost: 55, pattern: 'stripes' },
  { id: 'flames', name: 'Hot-Rod Flames', cost: 90, pattern: 'flames' },
  { id: 'carbon', name: 'Pro Carbon Trim', cost: 125, pattern: 'carbon' },
];

export const CAREER_MISSIONS: MissionSpec[] = [
  {
    id: 'dist_150',
    title: 'Rookie Trailblazer',
    description: 'Reach 150m in a single run on any map.',
    category: 'career',
    target: 150,
    rewardCoins: 100,
    rewardXp: 120,
    metric: 'distance',
  },
  {
    id: 'coins_120',
    title: 'Treasure Hunter',
    description: 'Collect at least 120 coins in a single run.',
    category: 'career',
    target: 120,
    rewardCoins: 125,
    rewardXp: 150,
    metric: 'run_coins',
  },
  {
    id: 'flips_2',
    title: 'Aerial Acrobat',
    description: 'Land 2 complete 360° flips safely in a single run.',
    category: 'career',
    target: 2,
    rewardCoins: 150,
    rewardXp: 180,
    metric: 'flips',
  },
  {
    id: 'clean_200',
    title: 'Precision Driver',
    description: 'Reach 200m while keeping vehicle condition above 80%.',
    category: 'career',
    target: 200,
    rewardCoins: 175,
    rewardXp: 220,
    metric: 'clean_run_distance',
  },
  {
    id: 'map_desert_250',
    title: 'Dune Conqueror',
    description: 'Drive 250m across Sunset Desert dunes.',
    category: 'map',
    mapId: 'desert',
    target: 250,
    rewardCoins: 180,
    rewardXp: 200,
    metric: 'distance',
  },
  {
    id: 'map_snow_220',
    title: 'Ice & Snow Master',
    description: 'Reach 220m on slippery Snow Mountain.',
    category: 'map',
    mapId: 'snow',
    target: 220,
    rewardCoins: 200,
    rewardXp: 240,
    metric: 'distance',
  },
  {
    id: 'map_seasons_300',
    title: 'Four Seasons Voyager',
    description:
      'Reach 300m in Four Seasons Valley to drive through multiple seasons in one run.',
    category: 'map',
    mapId: 'seasons',
    target: 300,
    rewardCoins: 250,
    rewardXp: 300,
    metric: 'distance',
  },
  {
    id: 'daily_treasure',
    title: 'Daily Challenge: Secret Route',
    description: 'Discover and collect a hidden Treasure Crate on an elevated shortcut.',
    category: 'daily',
    target: 1,
    rewardCoins: 200,
    rewardXp: 250,
    metric: 'treasures',
  },
];

export const UPGRADE_META: Record<
  UpgradeKey,
  { label: string; description: string; baseCost: number; costMultiplier: number }
> = {
  engine: {
    label: 'Engine',
    description: 'Increases engine power, hill-climbing torque, and top speed.',
    baseCost: 50,
    costMultiplier: 1.45,
  },
  grip: {
    label: 'Tires',
    description: 'Improves tire traction on rocks, logs, wet rain, and slippery snow.',
    baseCost: 50,
    costMultiplier: 1.45,
  },
  suspension: {
    label: 'Suspension',
    description: 'Strengthens springs & shock dampers for smoother obstacle absorption.',
    baseCost: 50,
    costMultiplier: 1.45,
  },
  fuel: {
    label: 'Fuel',
    description: 'Expands fuel tank capacity and reduces fuel consumption.',
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

export function getRepairCost(condition: number): number {
  const missing = Math.max(0, 100 - Math.round(condition));
  if (missing <= 0) return 0;
  return Math.max(10, Math.round((missing * 1.2) / 5) * 5);
}

export function getEffectiveVehicleStats(
  spec: VehicleSpec,
  levels: UpgradeLevels,
  condition = 100
): EffectiveStats {
  const safeLevels = levels ?? { engine: 1, grip: 1, suspension: 1, fuel: 1 };
  const safeCond = Math.max(15, Math.min(100, condition));
  // Severe damage (< 60% condition) gradually reduces engine output & suspension stability
  const damagePowerPenalty =
    safeCond >= 60 ? 1.0 : 0.78 + ((safeCond - 15) / 45) * 0.22;
  const damageSuspPenalty =
    safeCond >= 60 ? 1.0 : 0.82 + ((safeCond - 15) / 45) * 0.18;

  const engineBonus = 1 + (safeLevels.engine - 1) * 0.11;
  const speedBonus = 1 + (safeLevels.engine - 1) * 0.08;
  const gripBonus = 1 + (safeLevels.grip - 1) * 0.11;
  const suspBonus = 1 + (safeLevels.suspension - 1) * 0.095;
  const dampBonus = 1 + (safeLevels.suspension - 1) * 0.085;
  const fuelBonus = 1 + (safeLevels.fuel - 1) * 0.14;
  const efficiencyBonus = 1 - (safeLevels.fuel - 1) * 0.045;

  return {
    engineForce: spec.baseEngineForce * engineBonus * damagePowerPenalty,
    maxSpeed: spec.baseMaxSpeed * speedBonus * damagePowerPenalty,
    grip: spec.baseGrip * gripBonus,
    massKg: spec.massKg,
    suspensionStiffness: spec.baseSuspensionStiffness * suspBonus * damageSuspPenalty,
    suspensionDamping: spec.baseSuspensionDamping * dampBonus * damageSuspPenalty,
    suspensionRestLength: spec.baseSuspensionRestLength + (safeLevels.suspension - 1) * 1.3,
    fuelCapacity: Math.round(spec.baseFuelCapacity * fuelBonus),
    fuelDrainRate: 4.1 * Math.max(0.56, efficiencyBonus),
    airPitchTorque: spec.airPitchTorque * (1 + (safeLevels.engine - 1) * 0.03),
    rotationalInertia: spec.rotationalInertia * (1 + (safeLevels.suspension - 1) * 0.025),
    drivePitchReaction: spec.drivePitchReaction,
    obstacleClimbFactor:
      spec.obstacleClimbFactor * (1 + (safeLevels.grip - 1) * 0.04 + (safeLevels.suspension - 1) * 0.03),
  };
}

export function createDefaultCustomization(): VehicleCustomization {
  return {
    paintId: 'stock',
    rimId: 'sport',
    skinId: 'stock',
    unlockedPaints: ['stock', 'crimson'],
    unlockedRims: ['sport'],
    unlockedSkins: ['stock'],
  };
}

export function createDefaultProgress(): SavedProgress {
  const upgrades: Record<string, UpgradeLevels> = {};
  const vehicleCondition: Record<string, number> = {};
  const customization: Record<string, VehicleCustomization> = {};

  for (const v of VEHICLES) {
    upgrades[v.id] = { engine: 1, grip: 1, suspension: 1, fuel: 1 };
    vehicleCondition[v.id] = 100;
    customization[v.id] = createDefaultCustomization();
  }

  const bestDistanceByMap: Record<MapId, number> = {
    hills: 0,
    desert: 0,
    snow: 0,
    seasons: 0,
  };

  return {
    coins: 600,
    xp: 0,
    bestDistance: 0,
    bestDistanceByMap,
    selectedVehicleId: VEHICLES[0].id,
    unlockedVehicles: [VEHICLES[0].id],
    selectedMapId: MAPS[0].id,
    unlockedMaps: ['hills', 'seasons'],
    upgrades,
    vehicleCondition,
    customization,
    completedMissions: [],
    missionProgress: {},
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

export function repairVehicle(
  progress: SavedProgress,
  vehicleId: string
): SavedProgress {
  const currentCond = progress.vehicleCondition?.[vehicleId] ?? 100;
  const cost = getRepairCost(currentCond);
  if (cost <= 0 || progress.coins < cost) return progress;
  return {
    ...progress,
    coins: progress.coins - cost,
    vehicleCondition: {
      ...progress.vehicleCondition,
      [vehicleId]: 100,
    },
  };
}

export function selectOrPurchaseCosmetic(
  progress: SavedProgress,
  vehicleId: string,
  category: 'paint' | 'rim' | 'skin',
  optionId: string
): SavedProgress {
  const currentCust = progress.customization?.[vehicleId] ?? createDefaultCustomization();
  const options =
    category === 'paint'
      ? PAINT_OPTIONS
      : category === 'rim'
      ? RIM_OPTIONS
      : SKIN_OPTIONS;
  const opt = options.find((o) => o.id === optionId);
  if (!opt) return progress;

  const unlockedList =
    category === 'paint'
      ? currentCust.unlockedPaints
      : category === 'rim'
      ? currentCust.unlockedRims
      : currentCust.unlockedSkins;

  const isUnlocked = unlockedList.includes(optionId) || opt.cost === 0;
  if (!isUnlocked && progress.coins < opt.cost) {
    return progress;
  }

  const nextCoins = isUnlocked ? progress.coins : progress.coins - opt.cost;
  const nextCust: VehicleCustomization = {
    ...currentCust,
    paintId: category === 'paint' ? optionId : currentCust.paintId,
    rimId: category === 'rim' ? optionId : currentCust.rimId,
    skinId: category === 'skin' ? optionId : currentCust.skinId,
    unlockedPaints:
      category === 'paint' && !currentCust.unlockedPaints.includes(optionId)
        ? [...currentCust.unlockedPaints, optionId]
        : currentCust.unlockedPaints,
    unlockedRims:
      category === 'rim' && !currentCust.unlockedRims.includes(optionId)
        ? [...currentCust.unlockedRims, optionId]
        : currentCust.unlockedRims,
    unlockedSkins:
      category === 'skin' && !currentCust.unlockedSkins.includes(optionId)
        ? [...currentCust.unlockedSkins, optionId]
        : currentCust.unlockedSkins,
  };

  return {
    ...progress,
    coins: nextCoins,
    customization: {
      ...progress.customization,
      [vehicleId]: nextCust,
    },
  };
}

export function unlockOrSelectVehicle(
  progress: SavedProgress,
  vehicleId: string
): SavedProgress {
  const spec = getVehicleById(vehicleId);
  if (progress.unlockedVehicles.includes(spec.id)) {
    return {
      ...progress,
      selectedVehicleId: spec.id,
    };
  }
  if (progress.coins < spec.unlockCost) {
    return progress;
  }
  return {
    ...progress,
    coins: progress.coins - spec.unlockCost,
    selectedVehicleId: spec.id,
    unlockedVehicles: [...progress.unlockedVehicles, spec.id],
    upgrades: {
      ...progress.upgrades,
      [spec.id]: progress.upgrades[spec.id] ?? {
        engine: 1,
        grip: 1,
        suspension: 1,
        fuel: 1,
      },
    },
    vehicleCondition: {
      ...progress.vehicleCondition,
      [spec.id]: progress.vehicleCondition?.[spec.id] ?? 100,
    },
    customization: {
      ...progress.customization,
      [spec.id]: progress.customization?.[spec.id] ?? createDefaultCustomization(),
    },
  };
}

export function unlockOrSelectMap(
  progress: SavedProgress,
  mapId: MapId
): SavedProgress {
  const spec = getMapById(mapId);
  if (progress.unlockedMaps.includes(spec.id)) {
    return {
      ...progress,
      selectedMapId: spec.id,
    };
  }
  if (progress.coins < spec.unlockCost) {
    return progress;
  }
  return {
    ...progress,
    coins: progress.coins - spec.unlockCost,
    selectedMapId: spec.id,
    unlockedMaps: [...progress.unlockedMaps, spec.id],
  };
}

export function getCareerLevel(xp: number): {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  const safeXp = Math.max(0, xp);
  const level = Math.floor(safeXp / 250) + 1;
  const titles = [
    'Rookie Driver',
    'Hill Runner',
    'Stunt Specialist',
    'All-Terrain Pro',
    'Mountain Legend',
    'Grand Champion',
  ];
  const title = titles[Math.min(titles.length - 1, level - 1)];
  return {
    level,
    title,
    currentLevelXp: safeXp % 250,
    nextLevelXp: 250,
  };
}

export function evaluateRunMissions(
  progress: SavedProgress,
  metrics: {
    mapId: MapId;
    distanceMeters: number;
    runCoins: number;
    flipsCount: number;
    treasuresFound: number;
    finalCondition: number;
  }
): {
  nextProgress: SavedProgress;
  newlyCompletedTitles: string[];
  bonusCoins: number;
  bonusXp: number;
} {
  const completedSet = new Set(progress.completedMissions ?? []);
  const missionProgress = { ...(progress.missionProgress ?? {}) };
  const newlyCompletedTitles: string[] = [];
  let bonusCoins = 0;
  let bonusXp = 0;

  for (const m of CAREER_MISSIONS) {
    if (m.mapId && m.mapId !== metrics.mapId) continue;

    let value = 0;
    if (m.metric === 'distance') {
      value = metrics.distanceMeters;
    } else if (m.metric === 'run_coins') {
      value = metrics.runCoins;
    } else if (m.metric === 'flips') {
      value = metrics.flipsCount;
    } else if (m.metric === 'treasures') {
      value = (missionProgress[m.id] ?? 0) + metrics.treasuresFound;
    } else if (m.metric === 'clean_run_distance') {
      value = metrics.finalCondition >= 80 ? metrics.distanceMeters : 0;
    }

    missionProgress[m.id] = Math.max(missionProgress[m.id] ?? 0, value);

    if (!completedSet.has(m.id) && missionProgress[m.id] >= m.target) {
      completedSet.add(m.id);
      newlyCompletedTitles.push(m.title);
      bonusCoins += m.rewardCoins;
      bonusXp += m.rewardXp;
    }
  }

  const nextProgress: SavedProgress = {
    ...progress,
    coins: progress.coins + bonusCoins,
    xp: (progress.xp ?? 0) + bonusXp,
    completedMissions: Array.from(completedSet),
    missionProgress,
  };

  return {
    nextProgress,
    newlyCompletedTitles,
    bonusCoins,
    bonusXp,
  };
}
