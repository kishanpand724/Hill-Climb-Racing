import { MapId, MapSpec, SeasonId, WeatherState } from './types';

export const SEASON_ORDER: SeasonId[] = ['spring', 'summer', 'monsoon', 'winter'];
export const SEASON_SPAN_METERS = 110; // Transitions smoothly through all 4 seasons during a continuous session

export interface SeasonVisualTheme {
  id: SeasonId;
  name: string;
  bannerSubtitle: string;
  tractionMultiplier: number;
  windForce: number;
  rainIntensity: number;
  snowIntensity: number;
  fogIntensity: number;
  sunbeamIntensity: number;
  heatHazeIntensity: number;
  wetReflectivity: number;
  snowAccumulation: number;
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
}

export const SEASON_THEMES: Record<SeasonId, SeasonVisualTheme> = {
  spring: {
    id: 'spring',
    name: 'Spring Bloom',
    bannerSubtitle: 'Lush meadows, cherry blossoms & damp post-rain soil',
    tractionMultiplier: 0.98,
    windForce: 16,
    rainIntensity: 0,
    snowIntensity: 0,
    fogIntensity: 0.05,
    sunbeamIntensity: 0.65,
    heatHazeIntensity: 0,
    wetReflectivity: 0.22,
    snowAccumulation: 0,
    skyTop: '#0369a1',
    skyMid: '#38bdf8',
    skyBottom: '#e0f2fe',
    sunColor: '#fef08a',
    mountainFar: ['#64748b', '#475569'],
    mountainMid: ['#0d9488', '#0f766e'],
    mountainNear: ['#16a34a', '#15803d'],
    groundDeep: '#5c2d16',
    groundSub: '#78350f',
    surfaceShadow: '#15803d',
    surfaceMain: '#22c55e',
    surfaceHighlight: '#86efac',
    dirtParticleColor: '#713f12',
    secondaryParticleColor: '#f472b6',
  },
  summer: {
    id: 'summer',
    name: 'Golden Summer',
    bannerSubtitle: 'Sunlit sandstone, dry golden grass & high dry-road grip',
    tractionMultiplier: 1.04,
    windForce: 38,
    rainIntensity: 0,
    snowIntensity: 0,
    fogIntensity: 0.06,
    sunbeamIntensity: 0.9,
    heatHazeIntensity: 0.85,
    wetReflectivity: 0,
    snowAccumulation: 0,
    skyTop: '#9a3412',
    skyMid: '#f59e0b',
    skyBottom: '#fef08a',
    sunColor: '#fde047',
    mountainFar: ['#7c2d12', '#5c2d16'],
    mountainMid: ['#b45309', '#78350f'],
    mountainNear: ['#d97706', '#92400e'],
    groundDeep: '#652b0d',
    groundSub: '#9a3412',
    surfaceShadow: '#b45309',
    surfaceMain: '#eab308',
    surfaceHighlight: '#fef08a',
    dirtParticleColor: '#d97706',
    secondaryParticleColor: '#fde047',
  },
  monsoon: {
    id: 'monsoon',
    name: 'Monsoon Storm',
    bannerSubtitle: 'Brooding storm clouds, wet rocks, puddles & slick mud',
    tractionMultiplier: 0.76,
    windForce: -62,
    rainIntensity: 0.92,
    snowIntensity: 0,
    fogIntensity: 0.22,
    sunbeamIntensity: 0,
    heatHazeIntensity: 0,
    wetReflectivity: 0.92,
    snowAccumulation: 0,
    skyTop: '#090d16',
    skyMid: '#1e293b',
    skyBottom: '#475569',
    sunColor: '#94a3b8',
    mountainFar: ['#1e293b', '#0f172a'],
    mountainMid: ['#334155', '#1e293b'],
    mountainNear: ['#115e59', '#134e4a'],
    groundDeep: '#3b1d0a',
    groundSub: '#44403c',
    surfaceShadow: '#0f766e',
    surfaceMain: '#0d9488',
    surfaceHighlight: '#5eead4',
    dirtParticleColor: '#44403c',
    secondaryParticleColor: '#38bdf8',
  },
  winter: {
    id: 'winter',
    name: 'Alpine Winter',
    bannerSubtitle: 'Snow-draped peaks, frosted pines, snowbanks & slick ice',
    tractionMultiplier: 0.66,
    windForce: -46,
    rainIntensity: 0,
    snowIntensity: 0.95,
    fogIntensity: 0.16,
    sunbeamIntensity: 0.28,
    heatHazeIntensity: 0,
    wetReflectivity: 0.5,
    snowAccumulation: 1.0,
    skyTop: '#0f172a',
    skyMid: '#1e3a8a',
    skyBottom: '#bae6fd',
    sunColor: '#f0f9ff',
    mountainFar: ['#334155', '#1e293b'],
    mountainMid: ['#475569', '#334155'],
    mountainNear: ['#64748b', '#475569'],
    groundDeep: '#1e293b',
    groundSub: '#334155',
    surfaceShadow: '#94a3b8',
    surfaceMain: '#e2e8f0',
    surfaceHighlight: '#ffffff',
    dirtParticleColor: '#e2e8f0',
    secondaryParticleColor: '#7dd3fc',
  },
};

export const MAPS: MapSpec[] = [
  {
    id: 'hills',
    name: 'Green Hills',
    subtitle: 'Rolling Countryside',
    description:
      'Lush green meadows, rocky outcrops, fallen timber logs, launch ramps, and secret bridges.',
    unlockCost: 0,
    tractionMultiplier: 1.0,
    gravityMultiplier: 1.0,
    hillSteepness: 1.0,
    jumpAmplitude: 1.0,
    skyTop: '#0284c7',
    skyMid: '#38bdf8',
    skyBottom: '#bae6fd',
    sunColor: '#fef08a',
    mountainFar: ['#64748b', '#475569'],
    mountainMid: ['#0d9488', '#0f766e'],
    mountainNear: ['#16a34a', '#15803d'],
    groundDeep: '#78350f',
    groundSub: '#92400e',
    surfaceShadow: '#15803d',
    surfaceMain: '#22c55e',
    surfaceHighlight: '#4ade80',
    dirtParticleColor: '#78350f',
    secondaryParticleColor: '#4ade80',
    hasSnowfall: false,
  },
  {
    id: 'desert',
    name: 'Sunset Desert',
    subtitle: 'Golden Canyon Dunes',
    description:
      'Sweeping sand dunes, sandstone rock steps, canyon gales, and steep launch ramps.',
    unlockCost: 100,
    tractionMultiplier: 0.92,
    gravityMultiplier: 0.96,
    hillSteepness: 1.2,
    jumpAmplitude: 1.35,
    skyTop: '#7c2d12',
    skyMid: '#ea580c',
    skyBottom: '#fde047',
    sunColor: '#fed7aa',
    mountainFar: ['#9a3412', '#7c2d12'],
    mountainMid: ['#c2410c', '#9a3412'],
    mountainNear: ['#d97706', '#b45309'],
    groundDeep: '#78350f',
    groundSub: '#b45309',
    surfaceShadow: '#d97706',
    surfaceMain: '#f59e0b',
    surfaceHighlight: '#fde047',
    dirtParticleColor: '#d97706',
    secondaryParticleColor: '#fde047',
    hasSnowfall: false,
  },
  {
    id: 'snow',
    name: 'Snow Mountain',
    subtitle: 'Slippery Alpine Peaks',
    description:
      'Snow-covered ridges, glacial rock formations, icy slicks, and alpine blizzards.',
    unlockCost: 150,
    tractionMultiplier: 0.68,
    gravityMultiplier: 1.0,
    hillSteepness: 1.16,
    jumpAmplitude: 1.15,
    skyTop: '#0f172a',
    skyMid: '#1e3a8a',
    skyBottom: '#93c5fd',
    sunColor: '#e0f2fe',
    mountainFar: ['#334155', '#1e293b'],
    mountainMid: ['#475569', '#334155'],
    mountainNear: ['#64748b', '#475569'],
    groundDeep: '#1e293b',
    groundSub: '#334155',
    surfaceShadow: '#94a3b8',
    surfaceMain: '#e2e8f0',
    surfaceHighlight: '#ffffff',
    dirtParticleColor: '#e2e8f0',
    secondaryParticleColor: '#38bdf8',
    hasSnowfall: true,
  },
  {
    id: 'seasons',
    name: 'Four Seasons Valley',
    subtitle: 'Dynamic Seasonal World',
    description:
      'Drive through a living valley that transitions seamlessly from Spring bloom to golden Summer, stormy Monsoon, and icy Winter!',
    unlockCost: 200,
    tractionMultiplier: 1.0,
    gravityMultiplier: 0.98,
    hillSteepness: 1.12,
    jumpAmplitude: 1.22,
    skyTop: '#0369a1',
    skyMid: '#38bdf8',
    skyBottom: '#e0f2fe',
    sunColor: '#fef08a',
    mountainFar: ['#64748b', '#475569'],
    mountainMid: ['#0d9488', '#0f766e'],
    mountainNear: ['#16a34a', '#15803d'],
    groundDeep: '#5c2d16',
    groundSub: '#78350f',
    surfaceShadow: '#15803d',
    surfaceMain: '#22c55e',
    surfaceHighlight: '#86efac',
    dirtParticleColor: '#713f12',
    secondaryParticleColor: '#f472b6',
    hasSnowfall: false,
  },
];

export function getMapById(id: string | undefined): MapSpec {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

export function isValidMapId(id: string): id is MapId {
  return MAPS.some((m) => m.id === id);
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function lerpHexColor(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.001) return hexA;
  if (clamped >= 0.999) return hexB;
  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getSeasonBlendAtDistance(distanceMeters: number): {
  current: SeasonVisualTheme;
  next: SeasonVisualTheme;
  blend: number;
  seasonIndex: number;
} {
  const safeDist = Math.max(0, distanceMeters);
  const exactIndex = safeDist / SEASON_SPAN_METERS;
  const idx = Math.floor(exactIndex) % SEASON_ORDER.length;
  const nextIdx = (idx + 1) % SEASON_ORDER.length;
  const progressInSeason = exactIndex - Math.floor(exactIndex);

  // Smoothly blend over the last 32% of each season span for seamless visual & physics transitions
  const rawBlend = progressInSeason > 0.68 ? (progressInSeason - 0.68) / 0.32 : 0;
  const blend = rawBlend * rawBlend * (3 - 2 * rawBlend);

  return {
    current: SEASON_THEMES[SEASON_ORDER[idx]],
    next: SEASON_THEMES[SEASON_ORDER[nextIdx]],
    blend,
    seasonIndex: Math.floor(exactIndex),
  };
}

export function getDynamicWeather(
  mapId: MapId,
  distanceMeters: number,
  timeSeconds = 0
): WeatherState {
  if (mapId === 'seasons') {
    const { current, next, blend } = getSeasonBlendAtDistance(distanceMeters);
    const traction =
      current.tractionMultiplier +
      (next.tractionMultiplier - current.tractionMultiplier) * blend;
    const wind = current.windForce + (next.windForce - current.windForce) * blend;

    // Gradually vary rain and snow intensity over time during monsoon/winter
    const rainPulse = 0.85 + 0.15 * Math.sin(timeSeconds * 0.75 + distanceMeters * 0.02);
    const snowPulse = 0.82 + 0.18 * Math.cos(timeSeconds * 0.65 + distanceMeters * 0.015);

    const baseRain =
      current.rainIntensity + (next.rainIntensity - current.rainIntensity) * blend;
    const baseSnow =
      current.snowIntensity + (next.snowIntensity - current.snowIntensity) * blend;
    const rain = Math.max(0, Math.min(1, baseRain * rainPulse));
    const snow = Math.max(0, Math.min(1, baseSnow * snowPulse));
    const fog = current.fogIntensity + (next.fogIntensity - current.fogIntensity) * blend;

    const kind =
      rain > 0.35
        ? 'rain'
        : snow > 0.35
        ? 'snow'
        : current.id === 'summer'
        ? 'heat'
        : 'clear';

    return {
      kind,
      label: current.name,
      tractionMultiplier: traction,
      windForce: wind,
      rainIntensity: rain,
      snowIntensity: snow,
      fogIntensity: fog,
      seasonId: current.id,
      seasonName: current.name,
      nextSeasonId: next.id,
      seasonBlend: blend,
    };
  }

  // Dynamic weather cycles for Green Hills, Sunset Desert, and Snow Mountain
  const cycle = ((distanceMeters + timeSeconds * 4) % 360) / 360;

  if (mapId === 'hills') {
    if (cycle > 0.58 && cycle < 0.88) {
      return {
        kind: 'rain',
        label: 'Passing Rain',
        tractionMultiplier: 0.85,
        windForce: -38,
        rainIntensity: 0.68,
        snowIntensity: 0,
        fogIntensity: 0.14,
      };
    }
    if (cycle >= 0.35 && cycle <= 0.58) {
      return {
        kind: 'windy',
        label: 'Ridge Breeze',
        tractionMultiplier: 0.96,
        windForce: 42,
        rainIntensity: 0,
        snowIntensity: 0,
        fogIntensity: 0,
      };
    }
    return {
      kind: 'clear',
      label: 'Clear Skies',
      tractionMultiplier: 1.0,
      windForce: 10,
      rainIntensity: 0,
      snowIntensity: 0,
      fogIntensity: 0,
    };
  }

  if (mapId === 'desert') {
    if (cycle > 0.45 && cycle < 0.82) {
      return {
        kind: 'windy',
        label: 'Canyon Gale',
        tractionMultiplier: 0.92,
        windForce: -72,
        rainIntensity: 0,
        snowIntensity: 0,
        fogIntensity: 0.18,
      };
    }
    return {
      kind: 'heat',
      label: 'Dry Heat',
      tractionMultiplier: 1.0,
      windForce: 28,
      rainIntensity: 0,
      snowIntensity: 0,
      fogIntensity: 0.05,
    };
  }

  // Snow Mountain
  if (cycle > 0.48 && cycle < 0.86) {
    return {
      kind: 'snow',
      label: 'Alpine Blizzard',
      tractionMultiplier: 0.88,
      windForce: -64,
      rainIntensity: 0,
      snowIntensity: 1.0,
      fogIntensity: 0.28,
    };
  }
  return {
    kind: 'snow',
    label: 'Light Snow',
    tractionMultiplier: 1.0,
    windForce: -24,
    rainIntensity: 0,
    snowIntensity: 0.55,
    fogIntensity: 0.1,
  };
}
