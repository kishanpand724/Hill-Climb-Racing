import React from 'react';
import {
  SavedProgress,
  UpgradeKey,
  VehicleSpec,
} from '../game/types';
import {
  MAX_UPGRADE_LEVEL,
  UPGRADE_META,
  VEHICLES,
  canPurchaseUpgrade,
  getEffectiveVehicleStats,
  getUpgradeCost,
  getVehicleById,
} from '../game/vehicles';

interface GarageModalProps {
  progress: SavedProgress;
  onSelectOrUnlockVehicle: (vehicleId: string) => void;
  onUpgradeVehicle: (vehicleId: string, key: UpgradeKey) => void;
  onClose: () => void;
  onStartRun: () => void;
}

const UPGRADE_KEYS: UpgradeKey[] = ['engine', 'grip', 'suspension', 'fuel'];

export const GarageModal: React.FC<GarageModalProps> = ({
  progress,
  onSelectOrUnlockVehicle,
  onUpgradeVehicle,
  onClose,
  onStartRun,
}) => {
  const selectedVehicle: VehicleSpec = getVehicleById(progress.selectedVehicleId);
  const currentUpgrades = progress.upgrades[selectedVehicle.id] ?? {
    engine: 1,
    grip: 1,
    suspension: 1,
    fuel: 1,
  };
  const effectiveStats = getEffectiveVehicleStats(selectedVehicle, currentUpgrades);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Garage and Upgrades"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-5 bg-slate-950/80"
    >
      <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-slate-700 text-slate-100 shadow-2xl p-4 md:p-6 flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-white">
              GARAGE &amp; TUNING SHOP
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Select your hill climber and upgrade engine torque, traction, shocks, and fuel tank.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-amber-400 text-lg tabular-nums">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#0f172a" />
                <circle cx="12" cy="12" r="8.5" fill="#fbbf24" />
              </svg>
              <span data-testid="garage-coins">{progress.coins}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Garage"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              Close
            </button>
          </div>
        </div>

        {/* Section 1: Vehicle Roster */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Select Vehicle ({ progress.unlockedVehicles.length } / { VEHICLES.length } Unlocked)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {VEHICLES.map((v) => {
              const isUnlocked = progress.unlockedVehicles.includes(v.id);
              const isSelected = progress.selectedVehicleId === v.id;
              const canAffordUnlock = progress.coins >= v.unlockCost;

              return (
                <div
                  key={v.id}
                  className={`rounded-2xl p-4 border-2 transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/95 border-amber-400 shadow-md'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-display font-bold text-base text-white">
                        {v.name}
                      </span>
                      <span
                        className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                        style={{ backgroundColor: v.bodyColor }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {v.tagline}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => onSelectOrUnlockVehicle(v.id)}
                        disabled={isSelected}
                        className={`w-full py-2 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                      >
                        {isSelected ? 'Equipped' : 'Select Vehicle'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectOrUnlockVehicle(v.id)}
                        disabled={!canAffordUnlock}
                        className={`w-full py-2 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
                          canAffordUnlock
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                            : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Unlock · {v.unlockCost} Coins
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Upgrades for Selected Vehicle */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tune {selectedVehicle.name}
            </h3>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              Power {Math.round(effectiveStats.engineForce)} · Grip {effectiveStats.grip.toFixed(2)}x · Suspension {Math.round(effectiveStats.suspensionStiffness)} · Tank {effectiveStats.fuelCapacity}L
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {UPGRADE_KEYS.map((key) => {
              const meta = UPGRADE_META[key];
              const level = currentUpgrades[key];
              const isMax = level >= MAX_UPGRADE_LEVEL;
              const cost = getUpgradeCost(key, level);
              const affordable = canPurchaseUpgrade(progress, selectedVehicle.id, key);

              return (
                <div
                  key={key}
                  className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display font-bold text-base text-white">
                        {meta.label}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {meta.description}
                      </p>
                    </div>
                    <span
                      data-testid={`upgrade-level-${key}`}
                      className="font-mono font-bold text-xs text-amber-400 tabular-nums shrink-0"
                    >
                      LVL {level}/{MAX_UPGRADE_LEVEL}
                    </span>
                  </div>

                  {/* Discrete Level Pips */}
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => {
                      const filled = idx < level;
                      return (
                        <div
                          key={idx}
                          className={`h-2.5 flex-1 rounded-sm transition-colors ${
                            filled
                              ? 'bg-emerald-400'
                              : idx === level
                              ? 'bg-slate-700 border border-amber-400/50'
                              : 'bg-slate-800'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {isMax ? 'Max Level Reached' : `Cost: ${cost} Coins`}
                    </span>

                    <button
                      type="button"
                      disabled={isMax || !affordable}
                      onClick={() => onUpgradeVehicle(selectedVehicle.id, key)}
                      className={`px-4 py-2 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                        isMax
                          ? 'bg-slate-800 text-emerald-400 cursor-default'
                          : affordable
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'Maxed' : `Upgrade ${meta.label} (${cost})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            data-start="true"
            onClick={onStartRun}
            className="px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-base uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer whitespace-nowrap shrink-0"
          >
            Drive Now
          </button>
        </div>
      </div>
    </div>
  );
};
