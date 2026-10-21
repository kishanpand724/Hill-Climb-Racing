/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud, HudSnapshot } from './components/GameHud';
import { GarageModal } from './components/GarageModal';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { createInitialCarState, stepCarPhysics } from './game/physics';
import { GameRenderer } from './game/renderer';
import { sound } from './game/sound';
import { TerrainWorld } from './game/terrain';
import {
  CarState,
  EffectiveStats,
  GamePhase,
  RunSummary,
  SavedProgress,
  UpgradeKey,
  VehicleSpec,
} from './game/types';
import {
  createDefaultProgress,
  getEffectiveVehicleStats,
  getVehicleById,
  purchaseUpgrade,
  unlockOrSelectVehicle,
} from './game/vehicles';

const STORAGE_KEY = 'hill_climb_x_progress_v1';

function loadSavedProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const def = createDefaultProgress();
    return {
      coins: typeof parsed.coins === 'number' ? parsed.coins : def.coins,
      bestDistance:
        typeof parsed.bestDistance === 'number' ? parsed.bestDistance : def.bestDistance,
      selectedVehicleId: parsed.selectedVehicleId ?? def.selectedVehicleId,
      unlockedVehicles: Array.isArray(parsed.unlockedVehicles)
        ? parsed.unlockedVehicles
        : def.unlockedVehicles,
      upgrades: { ...def.upgrades, ...(parsed.upgrades ?? {}) },
      muted: Boolean(parsed.muted),
    };
  } catch {
    return createDefaultProgress();
  }
}

export default function App() {
  const [progress, setProgress] = useState<SavedProgress>(() => loadSavedProgress());
  const [phase, setPhase] = useState<GamePhase>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });
  const [garageOpen, setGarageOpen] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    distanceMeters: 0,
    bestDistanceMeters: progress.bestDistance,
    coins: progress.coins,
    fuelPct: 100,
    lowFuel: false,
    speedKmh: 0,
    gasPressed: false,
    brakePressed: false,
  });

  // High-frequency DOM refs for fuel bars
  const fuelBarRef = useRef<HTMLDivElement | null>(null);
  const fuelGhostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable simulation state held in refs so React renders never reset the 60fps loop
  const phaseRef = useRef<GamePhase>(phase);
  const garageOpenRef = useRef<boolean>(garageOpen);
  const progressRef = useRef<SavedProgress>(progress);

  const worldRef = useRef<TerrainWorld>(new TerrainWorld());
  const rendererRef = useRef<GameRenderer>(new GameRenderer());

  const initialSpec = getVehicleById(progress.selectedVehicleId);
  const initialStats = getEffectiveVehicleStats(
    initialSpec,
    progress.upgrades[initialSpec.id]
  );

  const specRef = useRef<VehicleSpec>(initialSpec);
  const statsRef = useRef<EffectiveStats>(initialStats);
  const carRef = useRef<CarState>(createInitialCarState(initialSpec, initialStats));

  const keysHeldRef = useRef<Set<string>>(new Set());
  const touchGasRef = useRef<boolean>(false);
  const touchBrakeRef = useRef<boolean>(false);
  const hitstopTimerRef = useRef<number>(0);
  const defeatDelayTimerRef = useRef<number>(0);
  const pendingDefeatRef = useRef<boolean>(false);
  const ghostFuelPctRef = useRef<number>(100);

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
    garageOpenRef.current = garageOpen;
  }, [garageOpen]);

  const resetSimulationForVehicle = useCallback((prog: SavedProgress) => {
    const spec = getVehicleById(prog.selectedVehicleId);
    const stats = getEffectiveVehicleStats(spec, prog.upgrades[spec.id]);
    specRef.current = spec;
    statsRef.current = stats;
    worldRef.current.reset();
    const freshCar = createInitialCarState(spec, stats);
    carRef.current = freshCar;
    rendererRef.current.resetCamera(freshCar);
    hitstopTimerRef.current = 0;
    defeatDelayTimerRef.current = 0;
    pendingDefeatRef.current = false;
    ghostFuelPctRef.current = 100;

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
      fuelPct: 100,
      lowFuel: false,
      speedKmh: 0,
      gasPressed: false,
      brakePressed: false,
    });
  }, []);

  const startNewRun = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    setGarageOpen(false);
    setRunSummary(null);
    resetSimulationForVehicle(progressRef.current);
    document.body.dataset.state = 'playing';
    phaseRef.current = 'playing';
    setPhase('playing');
  }, [resetSimulationForVehicle]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    document.body.dataset.state = 'paused';
    phaseRef.current = 'paused';
    setPhase('paused');
  }, []);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    setGarageOpen(false);
    document.body.dataset.state = 'playing';
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  const returnToTitle = useCallback(() => {
    keysHeldRef.current.clear();
    touchGasRef.current = false;
    touchBrakeRef.current = false;
    setGarageOpen(false);
    setRunSummary(null);
    resetSimulationForVehicle(progressRef.current);
    document.body.dataset.state = 'title';
    phaseRef.current = 'title';
    setPhase('title');
  }, [resetSimulationForVehicle]);

  const toggleMute = useCallback(() => {
    setProgress((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const handleSelectOrUnlockVehicle = useCallback(
    (vehicleId: string) => {
      sound.playUpgrade();
      setProgress((prev) => {
        const next = unlockOrSelectVehicle(prev, vehicleId);
        resetSimulationForVehicle(next);
        return next;
      });
    },
    [resetSimulationForVehicle]
  );

  const handleUpgradeVehicle = useCallback(
    (vehicleId: string, key: UpgradeKey) => {
      sound.playUpgrade();
      setProgress((prev) => {
        const next = purchaseUpgrade(prev, vehicleId, key);
        resetSimulationForVehicle(next);
        return next;
      });
    },
    [resetSimulationForVehicle]
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

      if (garageOpenRef.current) {
        if (code === 'Escape') {
          e.preventDefault();
          setGarageOpen(false);
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
      const world = worldRef.current;
      const renderer = rendererRef.current;

      if (currentPhase === 'title') {
        // Gentle idle suspension bob on the starting crest
        const idlePulse = Math.sin(now * 0.004) * 1.5;
        car.rearWheel.compression = stats.suspensionRestLength * 0.28 + idlePulse;
        car.frontWheel.compression = stats.suspensionRestLength * 0.28 - idlePulse;
        car.driverHeadLagAngle = Math.sin(now * 0.003) * 0.06;
        renderer.updateEffects(car, spec, true, dt);
      } else if (currentPhase === 'playing') {
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

        if (hitstopTimerRef.current > 0) {
          hitstopTimerRef.current = Math.max(0, hitstopTimerRef.current - dt);
        } else if (!pendingDefeatRef.current) {
          // Ensure procedural world extends well ahead of the car
          world.ensureGeneratedUpTo(car.x + 2800);
          world.pruneBehind(car.x - 1600);

          const events = stepCarPhysics(
            car,
            spec,
            stats,
            { accelerate, brakeReverse, hardBrake },
            world.pickups,
            dt
          );

          // Handle Coin Pickups
          for (const c of events.coinsCollected) {
            sound.playCoin();
            renderer.spawnParticles(c.x, c.y, 10, 'coin', '#fbbf24', car.vx * 0.2, -90);
            renderer.spawnFloatingText(c.x, c.y - 16, `+${c.value}`, '#fde047', 1.05);
          }

          // Handle Fuel Pickups
          for (const f of events.fuelCollected) {
            sound.playFuelRefill();
            renderer.spawnParticles(f.x, f.y, 14, 'fuel', '#4ade80', car.vx * 0.2, -100);
            renderer.spawnFloatingText(f.x, f.y - 20, 'FUEL FULL!', '#4ade80', 1.2);
          }

          // Handle Hard Landing
          if (events.landedHard) {
            const intensity = Math.min(1, events.landedHard.impactSpeed / 550);
            sound.playLandThud(intensity);
            renderer.addShake(intensity * 0.45);
            renderer.spawnParticles(
              car.rearWheel.worldX,
              car.rearWheel.worldY + spec.wheelRadius,
              8,
              'dirt',
              '#78350f',
              0,
              -80
            );
          }

          // Handle Air Flip Bonus
          if (events.flipCompleted) {
            sound.playFlipBonus();
            renderer.spawnFloatingText(
              events.flipCompleted.x,
              events.flipCompleted.y,
              `FLIP +${events.flipCompleted.bonusCoins} COINS!`,
              '#38bdf8',
              1.3
            );
          }

          // Handle Crash or Out of Fuel
          if (events.justCrashed || events.justOutOfFuel) {
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
          // Defeat beat countdown before opening Game Over modal
          defeatDelayTimerRef.current -= dt;
          if (defeatDelayTimerRef.current <= 0) {
            pendingDefeatRef.current = false;
            const prevProg = progressRef.current;
            const finalDistance = car.maxDistanceMeters;
            const isNewBest = finalDistance > prevProg.bestDistance;
            const bestDistanceMeters = Math.max(prevProg.bestDistance, finalDistance);
            const earnedCoins = car.runCoins;

            const summary: RunSummary = {
              distanceMeters: finalDistance,
              bestDistanceMeters,
              isNewBest,
              coinsCollected: earnedCoins,
              stuntBonusCoins: car.flipsCount * 100,
              flipsCount: car.flipsCount,
              reason: car.gameOverReason === 'fuel' ? 'fuel' : 'crashed',
              vehicleName: spec.name,
            };

            setProgress((prev) => ({
              ...prev,
              coins: prev.coins + earnedCoins,
              bestDistance: Math.max(prev.bestDistance, finalDistance),
            }));
            setRunSummary(summary);
            document.body.dataset.state = 'gameover';
            phaseRef.current = 'gameover';
            setPhase('gameover');
          }
        }

        renderer.updateEffects(car, spec, false, dt);

        // Update high-frequency Fuel DOM bars directly
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

        // Throttle React HUD state updates (~12Hz)
        hudSyncTimer += dt;
        if (hudSyncTimer >= 0.08) {
          hudSyncTimer = 0;
          const liveBest = Math.max(progressRef.current.bestDistance, car.maxDistanceMeters);
          const liveCoins = progressRef.current.coins + car.runCoins;
          const speedKmh = Math.round(Math.abs(car.vx) * 0.16);
          const lowFuel = fuelPct < 22;
          setHud((prev) => {
            if (
              prev.distanceMeters === car.maxDistanceMeters &&
              prev.bestDistanceMeters === liveBest &&
              prev.coins === liveCoins &&
              Math.round(prev.fuelPct) === Math.round(fuelPct) &&
              prev.lowFuel === lowFuel &&
              prev.speedKmh === speedKmh &&
              prev.gasPressed === accelerate &&
              prev.brakePressed === (brakeReverse || hardBrake)
            ) {
              return prev;
            }
            return {
              distanceMeters: car.maxDistanceMeters,
              bestDistanceMeters: liveBest,
              coins: liveCoins,
              fuelPct,
              lowFuel,
              speedKmh,
              gasPressed: accelerate,
              brakePressed: brakeReverse || hardBrake,
            };
          });
        }
      }

      // Draw frame on canvas
      ctx.save();
      ctx.scale(dpr, dpr);
      renderer.render(
        ctx,
        viewWidth,
        viewHeight,
        car,
        spec,
        stats,
        world.pickups,
        world.scenery,
        currentPhase === 'title'
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
      {phase === 'title' && !garageOpen && (
        <TitleScreen
          progress={progress}
          selectedVehicle={selectedVehicle}
          onStartGame={startNewRun}
          onOpenGarage={() => setGarageOpen(true)}
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
      {(phase === 'paused' || phase === 'gameover') && !garageOpen && (
        <StatusModal
          mode={phase}
          currentDistance={hud.distanceMeters}
          currentCoins={carRef.current.runCoins}
          bestDistance={progress.bestDistance}
          summary={runSummary}
          onResume={resumeGame}
          onRestart={startNewRun}
          onOpenGarage={() => setGarageOpen(true)}
          onBackToTitle={returnToTitle}
        />
      )}

      {/* Garage & Upgrades Modal */}
      {garageOpen && (
        <GarageModal
          progress={progress}
          onSelectOrUnlockVehicle={handleSelectOrUnlockVehicle}
          onUpgradeVehicle={handleUpgradeVehicle}
          onClose={() => setGarageOpen(false)}
          onStartRun={startNewRun}
        />
      )}
    </main>
  );
}
