/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CareerModal } from './components/CareerModal';
import { GameHud, HudSnapshot } from './components/GameHud';
import { GarageModal } from './components/GarageModal';
import { MapSelectModal } from './components/MapSelectModal';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import {
  getDynamicWeather,
  getMapById,
  getSeasonBlendAtDistance,
  isValidMapId,
} from './game/maps';
import { createInitialCarState, stepCarPhysics } from './game/physics';
import { GameRenderer } from './game/renderer';
import { sound } from './game/sound';
import { TerrainWorld } from './game/terrain';
import {
  CarState,
  EffectiveStats,
  GamePhase,
  MapId,
  RunSummary,
  SavedProgress,
  SeasonId,
  UpgradeKey,
  VehicleSpec,
} from './game/types';
import {
  VEHICLES,
  createDefaultProgress,
  evaluateRunMissions,
  getEffectiveVehicleStats,
  getVehicleById,
  purchaseUpgrade,
  repairVehicle,
  selectOrPurchaseCosmetic,
  unlockOrSelectMap,
  unlockOrSelectVehicle,
} from './game/vehicles';

const STORAGE_KEY = 'hill_climb_x_progress_v2';

function loadSavedProgress(): SavedProgress {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('hill_climb_x_progress_v1');
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const def = createDefaultProgress();
    const validSelectedVehicle = VEHICLES.some((v) => v.id === parsed.selectedVehicleId)
      ? (parsed.selectedVehicleId as string)
      : def.selectedVehicleId;
    const validSelectedMap: MapId =
      parsed.selectedMapId && isValidMapId(parsed.selectedMapId)
        ? parsed.selectedMapId
        : def.selectedMapId;

    return {
      coins: typeof parsed.coins === 'number' ? Math.max(parsed.coins, 0) : def.coins,
      xp: typeof parsed.xp === 'number' ? Math.max(parsed.xp, 0) : def.xp,
      bestDistance:
        typeof parsed.bestDistance === 'number' ? parsed.bestDistance : def.bestDistance,
      bestDistanceByMap: {
        ...def.bestDistanceByMap,
        ...(parsed.bestDistanceByMap ?? {}),
      },
      selectedVehicleId: validSelectedVehicle,
      unlockedVehicles:
        Array.isArray(parsed.unlockedVehicles) && parsed.unlockedVehicles.length > 0
          ? Array.from(new Set([def.selectedVehicleId, ...parsed.unlockedVehicles]))
          : def.unlockedVehicles,
      selectedMapId: validSelectedMap,
      unlockedMaps:
        Array.isArray(parsed.unlockedMaps) && parsed.unlockedMaps.length > 0
          ? (Array.from(new Set(['hills', ...parsed.unlockedMaps])).filter((m) =>
              isValidMapId(m)
            ) as MapId[])
          : def.unlockedMaps,
      upgrades: { ...def.upgrades, ...(parsed.upgrades ?? {}) },
      vehicleCondition: {
        ...def.vehicleCondition,
        ...(parsed.vehicleCondition ?? {}),
      },
      customization: {
        ...def.customization,
        ...(parsed.customization ?? {}),
      },
      completedMissions: Array.isArray(parsed.completedMissions)
        ? parsed.completedMissions
        : def.completedMissions,
      missionProgress: {
        ...def.missionProgress,
        ...(parsed.missionProgress ?? {}),
      },
      muted: Boolean(parsed.muted),
    };
  } catch {
    return createDefaultProgress();
  }
}

function applyUrlOverrides(base: SavedProgress): SavedProgress {
  try {
    const params = new URLSearchParams(window.location.search);
    const mapParam = params.get('map');
    const vehicleParam = params.get('vehicle');
    let next = { ...base };
    if (mapParam && isValidMapId(mapParam)) {
      next = {
        ...next,
        selectedMapId: mapParam,
        unlockedMaps: Array.from(new Set([...next.unlockedMaps, mapParam])),
      };
    }
    if (vehicleParam && VEHICLES.some((v) => v.id === vehicleParam)) {
      next = {
        ...next,
        selectedVehicleId: vehicleParam,
        unlockedVehicles: Array.from(new Set([...next.unlockedVehicles, vehicleParam])),
      };
    }
    return next;
  } catch {
    return base;
  }
}

export default function App() {
  const [progress, setProgress] = useState<SavedProgress>(() =>
    applyUrlOverrides(loadSavedProgress())
  );
  const [phase, setPhase] = useState<GamePhase>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });
  const [garageOpen, setGarageOpen] = useState(false);
  const [mapSelectOpen, setMapSelectOpen] = useState(false);
  const [careerOpen, setCareerOpen] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(() => {
    const v = getVehicleById(progress.selectedVehicleId);
    const m = getMapById(progress.selectedMapId);
    const cond = progress.vehicleCondition?.[v.id] ?? 100;
    const weather = getDynamicWeather(m.id, 0, 0);
    return {
      distanceMeters: 0,
      bestDistanceMeters: progress.bestDistance,
      coins: progress.coins,
      runCoins: 0,
      fuelPct: 100,
      lowFuel: false,
      conditionPct: cond,
      stuntCombo: 0,
      weatherLabel: weather.label,
      seasonBanner: null,
      speedKmh: 0,
      rpm: 950,
      vehicleName: v.name,
      mapName: m.name,
      gasPressed: false,
      brakePressed: false,
    };
  });

  // High-frequency DOM refs for fuel bars
  const fuelBarRef = useRef<HTMLDivElement | null>(null);
  const fuelGhostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable simulation state held in refs so React renders never reset the 60fps loop
  const phaseRef = useRef<GamePhase>(phase);
  const modalOpenRef = useRef<boolean>(garageOpen || mapSelectOpen || careerOpen);
  const progressRef = useRef<SavedProgress>(progress);

  const worldRef = useRef<TerrainWorld>(new TerrainWorld(progress.selectedMapId));
  const rendererRef = useRef<GameRenderer>(new GameRenderer());

  const initialSpec = getVehicleById(progress.selectedVehicleId);
  const initialCond = progress.vehicleCondition?.[initialSpec.id] ?? 100;
  const initialStats = getEffectiveVehicleStats(
    initialSpec,
    progress.upgrades[initialSpec.id],
    initialCond
  );

  const specRef = useRef<VehicleSpec>(initialSpec);
  const statsRef = useRef<EffectiveStats>(initialStats);
  const mapIdRef = useRef<MapId>(progress.selectedMapId);
  const carRef = useRef<CarState>(
    createInitialCarState(initialSpec, initialStats, progress.selectedMapId, initialCond)
  );

  const keysHeldRef = useRef<Set<string>>(new Set());
  const touchGasRef = useRef<boolean>(false);
  const touchBrakeRef = useRef<boolean>(false);
  const hitstopTimerRef = useRef<number>(0);
  const defeatDelayTimerRef = useRef<number>(0);
  const pendingDefeatRef = useRef<boolean>(false);
  const ghostFuelPctRef = useRef<number>(100);
  const runElapsedRef = useRef<number>(0);
  const lastSeasonRef = useRef<SeasonId>('spring');
  const bannerTextRef = useRef<string | null>(null);
  const bannerTimerRef = useRef<number>(0);
  const announcedPlatformRef = useRef<boolean>(false);

  // Sync progress to localStorage and sound engine
  useEffect(() => {
    progressRef.current = progress;
    sound.setMuted(progress.muted);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  // Mirror phase to document.body.dataset.state
  useEffect(() => {
    phaseRef.current = phase;
    document.body.dataset.state = phase;
  }, [phase]);

  useEffect(() => {
    modalOpenRef.current = garageOpen || mapSelectOpen || careerOpen;
  }, [garageOpen, mapSelectOpen, careerOpen]);

  const resetSimulation = useCallback((prog: SavedProgress) => {
    const spec = getVehicleById(prog.selectedVehicleId);
    const cond = prog.vehicleCondition?.[spec.id] ?? 100;
    const stats = getEffectiveVehicleStats(spec, prog.upgrades[spec.id], cond);
    const mapId = prog.selectedMapId;
    const mapSpec = getMapById(mapId);
    const weather = getDynamicWeather(mapId, 0, 0);

    specRef.current = spec;
    statsRef.current = stats;
    mapIdRef.current = mapId;
    worldRef.current.reset(mapId);
    const freshCar = createInitialCarState(spec, stats, mapId, cond);
    carRef.current = freshCar;
    rendererRef.current.resetCamera(freshCar);
    hitstopTimerRef.current = 0;
    defeatDelayTimerRef.current = 0;
    pendingDefeatRef.current = false;
    ghostFuelPctRef.current = 100;
    runElapsedRef.current = 0;
    lastSeasonRef.current = 'spring';
    bannerTextRef.current = mapId === 'seasons' ? 'SPRING BLOOM · FOUR SEASONS VALLEY' : null;
    bannerTimerRef.current = mapId === 'seasons' ? 2.4 : 0;
    announcedPlatformRef.current = false;

    if (fuelBarRef.current) {
      fuelBarRef.current.style.transform = 'scaleX(1)';
    }
    if (fuelGhostRef.current) {
      fuelGhostRef.current.style.transform = 'scaleX(1)';
    }

    setHud({
      distanceMeters: 0,
      bestDistanceMeters: prog.bestDistance,
      coins: prog.coins,
      runCoins: 0,
      fuelPct: 100,
      lowFuel: false,
      conditionPct: cond,
      stuntCombo: 0,
      weatherLabel: weather.label,
      seasonBanner: bannerTextRef.current,
      speedKmh: 0,
      rpm: 950,
      vehicleName: spec.name,
      mapName: mapSpec.name,
      gasPressed: false,
      brakePressed: false,
    });
  }, []);

  const startNewRun = useCallback(() => {
    sound.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    setGarageOpen(false);
    setMapSelectOpen(false);
    setCareerOpen(false);
    setRunSummary(null);
    resetSimulation(progressRef.current);
    document.body.dataset.state = 'playing';
    phaseRef.current = 'playing';
    setPhase('playing');
  }, [resetSimulation]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    sound.playClick();
    sound.updateDrivingAudio(0, 0, false, 0, false);
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    document.body.dataset.state = 'paused';
    phaseRef.current = 'paused';
    setPhase('paused');
  }, []);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    sound.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    setGarageOpen(false);
    setMapSelectOpen(false);
    setCareerOpen(false);
    document.body.dataset.state = 'playing';
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  const returnToTitle = useCallback(() => {
    sound.playClick();
    sound.updateDrivingAudio(0, 0, false, 0, false);
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    setGarageOpen(false);
    setMapSelectOpen(false);
    setCareerOpen(false);
    setRunSummary(null);
    resetSimulation(progressRef.current);
    document.body.dataset.state = 'title';
    phaseRef.current = 'title';
    setPhase('title');
  }, [resetSimulation]);

  const toggleMute = useCallback(() => {
    setProgress((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const handleSelectOrUnlockVehicle = useCallback(
    (vehicleId: string) => {
      sound.playUpgrade();
      setProgress((prev) => {
        const next = unlockOrSelectVehicle(prev, vehicleId);
        resetSimulation(next);
        return next;
      });
    },
    [resetSimulation]
  );

  const handleUpgradeVehicle = useCallback(
    (vehicleId: string, key: UpgradeKey) => {
      sound.playUpgrade();
      setProgress((prev) => {
        const next = purchaseUpgrade(prev, vehicleId, key);
        resetSimulation(next);
        return next;
      });
    },
    [resetSimulation]
  );

  const handleRepairVehicle = useCallback(
    (vehicleId: string) => {
      sound.playUpgrade();
      setProgress((prev) => {
        const next = repairVehicle(prev, vehicleId);
        resetSimulation(next);
        return next;
      });
    },
    [resetSimulation]
  );

  const handleCustomizeVehicle = useCallback(
    (vehicleId: string, category: 'paint' | 'rim' | 'skin', optionId: string) => {
      sound.playUpgrade();
      setProgress((prev) => selectOrPurchaseCosmetic(prev, vehicleId, category, optionId));
    },
    []
  );

  const handleSelectOrUnlockMap = useCallback(
    (mapId: MapId) => {
      sound.playUpgrade();
      setProgress((prev) => {
        const next = unlockOrSelectMap(prev, mapId);
        resetSimulation(next);
        return next;
      });
    },
    [resetSimulation]
  );

  // Keyboard & Blur Listeners
  useEffect(() => {
    const clearInputs = () => {
      keysHeldRef.current.clear();
      touchGasRef.current = false;
      touchBrakeRef.current = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      if (code === 'KeyM') {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (modalOpenRef.current) {
        if (code === 'Escape') {
          e.preventDefault();
          setGarageOpen(false);
          setMapSelectOpen(false);
          setCareerOpen(false);
        }
        return;
      }

      if (phaseRef.current === 'title') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          startNewRun();
        }
        return;
      }

      if (phaseRef.current === 'gameover') {
        if (code === 'Enter' || code === 'Space' || code === 'KeyR') {
          e.preventDefault();
          startNewRun();
        }
        return;
      }

      if (phaseRef.current === 'paused') {
        if (code === 'Escape' || code === 'KeyP') {
          e.preventDefault();
          resumeGame();
        } else if (code === 'KeyR') {
          e.preventDefault();
          startNewRun();
        }
        return;
      }

      if (phaseRef.current === 'playing') {
        if (code === 'Escape' || code === 'KeyP') {
          e.preventDefault();
          pauseGame();
          return;
        }
        if (code === 'KeyR') {
          e.preventDefault();
          startNewRun();
          return;
        }
        if (
          code === 'ArrowRight' ||
          code === 'KeyD' ||
          code === 'ArrowLeft' ||
          code === 'KeyA' ||
          code === 'Space' ||
          code === 'ArrowUp' ||
          code === 'KeyW' ||
          code === 'ArrowDown' ||
          code === 'KeyS'
        ) {
          e.preventDefault();
          keysHeldRef.current.add(code);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, [pauseGame, resumeGame, startNewRun, toggleMute]);

  // Isolated 60fps Canvas Loop + ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let viewWidth = window.innerWidth;
    let viewHeight = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      viewWidth = Math.max(320, rect.width || window.innerWidth);
      viewHeight = Math.max(240, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(viewWidth * dpr);
      canvas.height = Math.round(viewHeight * dpr);
    };

    updateCanvasSize();
    const ro = new ResizeObserver(updateCanvasSize);
    ro.observe(canvas);

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncTimer = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const currentPhase = phaseRef.current;
      const car = carRef.current;
      const spec = specRef.current;
      const stats = statsRef.current;
      const mapId = mapIdRef.current;
      const world = worldRef.current;
      const renderer = rendererRef.current;

      if (currentPhase === 'title') {
        sound.updateDrivingAudio(0, 0, false, 0, false);
        const idlePulse = Math.sin(now * 0.004) * 1.5;
        car.rearWheel.compression = stats.suspensionRestLength * 0.28 + idlePulse;
        car.frontWheel.compression = stats.suspensionRestLength * 0.28 - idlePulse;
        car.driverHeadLagAngle = Math.sin(now * 0.003) * 0.06;
        renderer.updateEffects(car, spec, mapId, true, dt);
      } else if (currentPhase === 'playing') {
        runElapsedRef.current += dt;
        if (bannerTimerRef.current > 0) {
          bannerTimerRef.current = Math.max(0, bannerTimerRef.current - dt);
          if (bannerTimerRef.current === 0) {
            bannerTextRef.current = null;
          }
        }

        const keys = keysHeldRef.current;
        const accelerate =
          touchGasRef.current ||
          keys.has('ArrowRight') ||
          keys.has('KeyD') ||
          keys.has('ArrowUp') ||
          keys.has('KeyW');
        const brakeReverse =
          touchBrakeRef.current ||
          keys.has('ArrowLeft') ||
          keys.has('KeyA') ||
          keys.has('ArrowDown') ||
          keys.has('KeyS');
        const hardBrake = keys.has('Space');

        world.updatePickupAnimations(dt);
        world.updateObstacles(runElapsedRef.current);

        if (hitstopTimerRef.current > 0) {
          hitstopTimerRef.current = Math.max(0, hitstopTimerRef.current - dt);
        } else if (!pendingDefeatRef.current) {
          world.ensureGeneratedUpTo(car.x + 2800);
          world.pruneBehind(car.x - 1600);

          const events = stepCarPhysics(
            car,
            spec,
            stats,
            { accelerate, brakeReverse, hardBrake },
            world.pickups,
            dt,
            mapId,
            world.platforms,
            runElapsedRef.current,
            world.obstacles
          );

          if (events.obstacleImpact) {
            renderer.addShake(0.18);
            renderer.spawnParticles(
              events.obstacleImpact.x,
              events.obstacleImpact.y - 6,
              6,
              'spark',
              '#fbbf24',
              car.vx * 0.15,
              -70
            );
          }

          // Check for Four Seasons transition banner
          if (mapId === 'seasons') {
            const seasonBlend = getSeasonBlendAtDistance(car.distanceMeters);
            if (seasonBlend.current.id !== lastSeasonRef.current) {
              lastSeasonRef.current = seasonBlend.current.id;
              bannerTextRef.current = `${seasonBlend.current.name.toUpperCase()} · ${seasonBlend.current.bannerSubtitle.toUpperCase()}`;
              bannerTimerRef.current = 2.6;
            }
          }

          // Check for Secret Route Bridge discovery banner
          if (car.onSecretRoute && !announcedPlatformRef.current) {
            announcedPlatformRef.current = true;
            bannerTextRef.current = 'SECRET HIGH-ROAD SHORTCUT!';
            bannerTimerRef.current = 2.4;
          } else if (!car.onSecretRoute) {
            announcedPlatformRef.current = false;
          }

          const speedKmhNow = Math.round(Math.abs(car.vx) * 0.16);
          sound.updateDrivingAudio(
            car.rpm,
            car.throttle,
            car.braking,
            speedKmhNow,
            !car.crashed && !car.outOfFuel
          );

          if (events.justJumped) {
            sound.playJump();
          }

          for (const c of events.coinsCollected) {
            sound.playCoin();
            renderer.spawnParticles(c.x, c.y, 10, 'coin', '#fbbf24', car.vx * 0.2, -90);
            renderer.spawnFloatingText(c.x, c.y - 16, `+${c.value}`, '#fde047', 1.05);
          }

          for (const t of events.treasureCollected) {
            sound.playFlipBonus();
            renderer.spawnParticles(t.x, t.y, 20, 'coin', '#facc15', car.vx * 0.2, -110);
            renderer.spawnFloatingText(
              t.x,
              t.y - 24,
              `SECRET TREASURE +${t.value}!`,
              '#fde047',
              1.35
            );
          }

          for (const f of events.fuelCollected) {
            sound.playFuelRefill();
            renderer.spawnParticles(f.x, f.y, 14, 'fuel', '#4ade80', car.vx * 0.2, -100);
            renderer.spawnFloatingText(f.x, f.y - 20, 'FUEL +85%', '#4ade80', 1.2);
          }

          if (events.landedHard) {
            const intensity = Math.min(1, events.landedHard.impactSpeed / 550);
            sound.playLandThud(intensity);
            renderer.addShake(intensity * 0.45);
            const mapSpec = getMapById(mapId);
            renderer.spawnParticles(
              car.rearWheel.worldX,
              car.rearWheel.worldY + spec.wheelRadius,
              8,
              'dirt',
              mapSpec.dirtParticleColor,
              0,
              -80
            );
            if (events.landedHard.damageTaken > 0) {
              renderer.spawnParticles(car.x, car.y - 10, 12, 'spark', '#fbbf24', 0, -90);
              renderer.spawnFloatingText(
                car.x,
                car.y - 34,
                `-${events.landedHard.damageTaken}% CHASSIS`,
                '#f87171',
                1.05
              );
            }
          }

          if (events.comboBroken) {
            renderer.spawnFloatingText(car.x, car.y - 44, 'COMBO RESET!', '#fb923c', 1.1);
          }

          if (events.flipCompleted) {
            sound.playFlipBonus();
            renderer.spawnFloatingText(
              events.flipCompleted.x,
              events.flipCompleted.y,
              events.flipCompleted.label,
              '#38bdf8',
              1.32
            );
          }

          if (events.longJumpCompleted) {
            sound.playFlipBonus();
            renderer.spawnFloatingText(
              events.longJumpCompleted.x,
              events.longJumpCompleted.y,
              events.longJumpCompleted.label,
              '#4ade80',
              1.25
            );
          }

          if (events.justCrashed || events.justOutOfFuel) {
            sound.updateDrivingAudio(0, 0, false, 0, false);
            pendingDefeatRef.current = true;
            defeatDelayTimerRef.current = 0.52;
            if (events.justCrashed) {
              sound.playCrash();
              renderer.addShake(0.85);
              renderer.hitFlash = 1;
              hitstopTimerRef.current = 0.06;
              renderer.spawnParticles(car.x, car.y - 15, 22, 'spark', '#fbbf24', 0, -120);
              renderer.spawnFloatingText(car.x, car.y - 36, 'CRUNCH!', '#ef4444', 1.35);
            } else {
              renderer.spawnFloatingText(car.x, car.y - 36, 'OUT OF FUEL!', '#f97316', 1.25);
            }
          }
        } else {
          defeatDelayTimerRef.current -= dt;
          if (defeatDelayTimerRef.current <= 0) {
            pendingDefeatRef.current = false;
            const prevProg = progressRef.current;
            const finalDistance = car.maxDistanceMeters;
            const isNewBest = finalDistance > prevProg.bestDistance;
            const bestDistanceMeters = Math.max(prevProg.bestDistance, finalDistance);
            const mapSpec = getMapById(mapId);
            const reason = car.gameOverReason === 'fuel' ? 'fuel' : 'crashed';
            const savedCondition = Math.max(15, Math.round(car.condition));

            const missionEval = evaluateRunMissions(prevProg, {
              mapId,
              distanceMeters: finalDistance,
              runCoins: car.runCoins,
              flipsCount: car.flipsCount,
              treasuresFound: car.treasuresFound,
              finalCondition: savedCondition,
            });

            const totalEarnedCoins = car.runCoins + missionEval.bonusCoins;

            const summary: RunSummary = {
              distanceMeters: finalDistance,
              bestDistanceMeters,
              isNewBest,
              coinsCollected: totalEarnedCoins,
              pickupCoins: car.pickupCoins,
              stuntBonusCoins: car.flipBonusCoins,
              flipsCount: car.flipsCount,
              longJumpsCount: car.longJumpsCount,
              maxStuntCombo: car.maxStuntCombo,
              treasuresFound: car.treasuresFound,
              completedMissionTitles: missionEval.newlyCompletedTitles,
              missionRewardCoins: missionEval.bonusCoins,
              finalCondition: savedCondition,
              reason,
              reasonDetail:
                car.crashDetail ??
                (reason === 'fuel'
                  ? 'Your fuel tank ran dry and the vehicle rolled to a stop.'
                  : 'Landed upside down! Upgrade suspension or feather the throttle in mid-air.'),
              vehicleName: spec.name,
              mapName: mapSpec.name,
            };

            setProgress((prev) => {
              const afterMissions = evaluateRunMissions(prev, {
                mapId,
                distanceMeters: finalDistance,
                runCoins: car.runCoins,
                flipsCount: car.flipsCount,
                treasuresFound: car.treasuresFound,
                finalCondition: savedCondition,
              }).nextProgress;

              return {
                ...afterMissions,
                coins: afterMissions.coins + car.runCoins,
                bestDistance: Math.max(afterMissions.bestDistance, finalDistance),
                bestDistanceByMap: {
                  ...afterMissions.bestDistanceByMap,
                  [mapId]: Math.max(afterMissions.bestDistanceByMap?.[mapId] ?? 0, finalDistance),
                },
                vehicleCondition: {
                  ...afterMissions.vehicleCondition,
                  [spec.id]: savedCondition,
                },
              };
            });
            setRunSummary(summary);
            document.body.dataset.state = 'gameover';
            phaseRef.current = 'gameover';
            setPhase('gameover');
          }
        }

        renderer.updateEffects(car, spec, mapId, false, dt);

        const fuelPct = Math.max(0, Math.min(100, (car.fuel / car.maxFuel) * 100));
        ghostFuelPctRef.current += (fuelPct - ghostFuelPctRef.current) * Math.min(1, dt * 3.5);
        if (fuelBarRef.current) {
          fuelBarRef.current.style.transform = `scaleX(${(fuelPct / 100).toFixed(4)})`;
        }
        if (fuelGhostRef.current) {
          fuelGhostRef.current.style.transform = `scaleX(${(
            ghostFuelPctRef.current / 100
          ).toFixed(4)})`;
        }

        hudSyncTimer += dt;
        if (hudSyncTimer >= 0.08) {
          hudSyncTimer = 0;
          const liveBest = Math.max(progressRef.current.bestDistance, car.maxDistanceMeters);
          const liveCoins = progressRef.current.coins + car.runCoins;
          const speedKmh = Math.round(Math.abs(car.vx) * 0.16);
          const lowFuel = fuelPct < 22;
          const mapSpec = getMapById(mapId);
          const weather = getDynamicWeather(
            mapId,
            car.distanceMeters,
            runElapsedRef.current
          );
          const condPct = Math.round(car.condition);
          const activeBanner = bannerTextRef.current;

          setHud((prev) => {
            if (
              prev.distanceMeters === car.maxDistanceMeters &&
              prev.bestDistanceMeters === liveBest &&
              prev.coins === liveCoins &&
              prev.runCoins === car.runCoins &&
              Math.round(prev.fuelPct) === Math.round(fuelPct) &&
              prev.lowFuel === lowFuel &&
              prev.conditionPct === condPct &&
              prev.stuntCombo === car.stuntCombo &&
              prev.weatherLabel === weather.label &&
              prev.seasonBanner === activeBanner &&
              prev.speedKmh === speedKmh &&
              Math.round(prev.rpm / 50) === Math.round(car.rpm / 50) &&
              prev.vehicleName === spec.name &&
              prev.mapName === mapSpec.name &&
              prev.gasPressed === accelerate &&
              prev.brakePressed === (brakeReverse || hardBrake)
            ) {
              return prev;
            }
            return {
              distanceMeters: car.maxDistanceMeters,
              bestDistanceMeters: liveBest,
              coins: liveCoins,
              runCoins: car.runCoins,
              fuelPct,
              lowFuel,
              conditionPct: condPct,
              stuntCombo: car.stuntCombo,
              weatherLabel: weather.label,
              seasonBanner: activeBanner,
              speedKmh,
              rpm: car.rpm,
              vehicleName: spec.name,
              mapName: mapSpec.name,
              gasPressed: accelerate,
              brakePressed: brakeReverse || hardBrake,
            };
          });
        }
      }

      const activeCustomization = progressRef.current.customization?.[spec.id];

      ctx.save();
      ctx.scale(dpr, dpr);
      renderer.render(
        ctx,
        viewWidth,
        viewHeight,
        car,
        spec,
        stats,
        mapId,
        world.pickups,
        world.scenery,
        currentPhase === 'title',
        world.platforms,
        activeCustomization,
        world.obstacles
      );
      ctx.restore();

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const selectedVehicle = getVehicleById(progress.selectedVehicleId);
  const selectedMap = getMapById(progress.selectedMapId);

  return (
    <main className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* Isolated Full-Viewport 2D Game Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        aria-label="Hill Climb X 2D Game Canvas"
        className="block w-full h-full"
      />

      {/* Title Screen Overlay */}
      {phase === 'title' && !garageOpen && !mapSelectOpen && !careerOpen && (
        <TitleScreen
          progress={progress}
          selectedVehicle={selectedVehicle}
          selectedMap={selectedMap}
          onStartGame={startNewRun}
          onOpenGarage={() => {
            setMapSelectOpen(false);
            setCareerOpen(false);
            setGarageOpen(true);
          }}
          onOpenMapSelect={() => {
            setGarageOpen(false);
            setCareerOpen(false);
            setMapSelectOpen(true);
          }}
          onOpenCareer={() => {
            setGarageOpen(false);
            setMapSelectOpen(false);
            setCareerOpen(true);
          }}
          onToggleMute={toggleMute}
        />
      )}

      {/* Active Gameplay HUD */}
      {phase === 'playing' && (
        <GameHud
          hud={hud}
          muted={progress.muted}
          fuelBarRef={fuelBarRef}
          fuelGhostRef={fuelGhostRef}
          onToggleMute={toggleMute}
          onPause={pauseGame}
          onRestart={startNewRun}
          onGasDown={() => {
            touchGasRef.current = true;
            setHud((h) => ({ ...h, gasPressed: true }));
          }}
          onGasUp={() => {
            touchGasRef.current = false;
            setHud((h) => ({ ...h, gasPressed: false }));
          }}
          onBrakeDown={() => {
            touchBrakeRef.current = true;
            setHud((h) => ({ ...h, brakePressed: true }));
          }}
          onBrakeUp={() => {
            touchBrakeRef.current = false;
            setHud((h) => ({ ...h, brakePressed: false }));
          }}
        />
      )}

      {/* Pause or Game Over Modal */}
      {(phase === 'paused' || phase === 'gameover') &&
        !garageOpen &&
        !mapSelectOpen &&
        !careerOpen && (
          <StatusModal
            mode={phase}
            currentDistance={hud.distanceMeters}
            currentCoins={carRef.current.runCoins}
            bestDistance={progress.bestDistance}
            summary={runSummary}
            onResume={resumeGame}
            onRestart={startNewRun}
            onOpenGarage={() => {
              setMapSelectOpen(false);
              setCareerOpen(false);
              setGarageOpen(true);
            }}
            onOpenMapSelect={() => {
              setGarageOpen(false);
              setCareerOpen(false);
              setMapSelectOpen(true);
            }}
            onOpenCareer={() => {
              setGarageOpen(false);
              setMapSelectOpen(false);
              setCareerOpen(true);
            }}
            onBackToTitle={returnToTitle}
          />
        )}

      {/* Hill Climb-Style Single-Vehicle Carousel Garage */}
      {garageOpen && (
        <GarageModal
          progress={progress}
          onSelectOrUnlockVehicle={handleSelectOrUnlockVehicle}
          onUpgradeVehicle={handleUpgradeVehicle}
          onRepairVehicle={handleRepairVehicle}
          onCustomizeVehicle={handleCustomizeVehicle}
          onClose={() => setGarageOpen(false)}
          onStartRun={startNewRun}
        />
      )}

      {/* 4-Card Stage Map Selection Screen */}
      {mapSelectOpen && (
        <MapSelectModal
          progress={progress}
          onSelectOrUnlockMap={handleSelectOrUnlockMap}
          onClose={() => setMapSelectOpen(false)}
          onStartRun={startNewRun}
        />
      )}

      {/* Career Progression & Challenges Modal */}
      {careerOpen && (
        <CareerModal
          progress={progress}
          onClose={() => setCareerOpen(false)}
          onStartRun={startNewRun}
        />
      )}
    </main>
  );
}
