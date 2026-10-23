import React, { useEffect, useRef, useState } from 'react';
import { renderGarageVehiclePreview } from '../game/renderer';
import {
  CosmeticOption,
  SavedProgress,
  UpgradeKey,
  VehicleSpec,
} from '../game/types';
import {
  MAX_UPGRADE_LEVEL,
  PAINT_OPTIONS,
  RIM_OPTIONS,
  SKIN_OPTIONS,
  UPGRADE_META,
  VEHICLES,
  canPurchaseUpgrade,
  createDefaultCustomization,
  getEffectiveVehicleStats,
  getRepairCost,
  getUpgradeCost,
} from '../game/vehicles';

interface GarageModalProps {
  progress: SavedProgress;
  onSelectOrUnlockVehicle: (vehicleId: string) => void;
  onUpgradeVehicle: (vehicleId: string, key: UpgradeKey) => void;
  onRepairVehicle: (vehicleId: string) => void;
  onCustomizeVehicle: (
    vehicleId: string,
    category: 'paint' | 'rim' | 'skin',
    optionId: string
  ) => void;
  onClose: () => void;
  onStartRun: () => void;
}

const UPGRADE_KEYS: UpgradeKey[] = ['engine', 'grip', 'suspension', 'fuel'];

export const GarageModal: React.FC<GarageModalProps> = ({
  progress,
  onSelectOrUnlockVehicle,
  onUpgradeVehicle,
  onRepairVehicle,
  onCustomizeVehicle,
  onClose,
  onStartRun,
}) => {
  const [browsedIdx, setBrowsedIdx] = useState<number>(() => {
    const idx = VEHICLES.findIndex((v) => v.id === progress.selectedVehicleId);
    return idx >= 0 ? idx : 0;
  });
  const [activeTab, setActiveTab] = useState<'upgrades' | 'customize'>('upgrades');

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const browsedVehicle: VehicleSpec = VEHICLES[browsedIdx] ?? VEHICLES[0];
  const isUnlocked = progress.unlockedVehicles.includes(browsedVehicle.id);
  const isSelected = progress.selectedVehicleId === browsedVehicle.id;
  const canAffordVehicle = progress.coins >= browsedVehicle.unlockCost;

  const currentUpgrades = progress.upgrades[browsedVehicle.id] ?? {
    engine: 1,
    grip: 1,
    suspension: 1,
    fuel: 1,
  };
  const condition = Math.round(progress.vehicleCondition?.[browsedVehicle.id] ?? 100);
  const repairCost = getRepairCost(condition);
  const canAffordRepair = isUnlocked && repairCost > 0 && progress.coins >= repairCost;

  const customization =
    progress.customization?.[browsedVehicle.id] ?? createDefaultCustomization();

  const effectiveStats = getEffectiveVehicleStats(
    browsedVehicle,
    currentUpgrades,
    condition
  );

  const handlePrevVehicle = () => {
    setBrowsedIdx((prev) => (prev - 1 + VEHICLES.length) % VEHICLES.length);
  };

  const handleNextVehicle = () => {
    setBrowsedIdx((prev) => (prev + 1) % VEHICLES.length);
  };

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      renderGarageVehiclePreview(
        ctx,
        canvas.width,
        canvas.height,
        browsedVehicle,
        effectiveStats,
        elapsed,
        condition,
        customization
      );
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [browsedVehicle, effectiveStats, condition, customization]);

  const renderCosmeticRow = (
    title: string,
    category: 'paint' | 'rim' | 'skin',
    options: CosmeticOption[],
    activeId: string,
    unlockedList: string[]
  ) => (
    <div className="rounded-2xl bg-slate-950/85 border border-slate-800 p-3 flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
        {title}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {options.map((opt) => {
          const isOwned = unlockedList.includes(opt.id) || opt.cost === 0;
          const isEquipped = activeId === opt.id;
          const affordable = isUnlocked && progress.coins >= opt.cost;

          return (
            <button
              key={opt.id}
              type="button"
              data-testid={`cosmetic-${category}-${opt.id}`}
              disabled={!isUnlocked || (!isOwned && !affordable)}
              onClick={() => onCustomizeVehicle(browsedVehicle.id, category, opt.id)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all ${
                isEquipped
                  ? 'bg-emerald-500/20 border-emerald-400 text-white cursor-default'
                  : isOwned
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
                  : affordable
                  ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/50 text-slate-200 cursor-pointer'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                {(opt.primaryColor || opt.secondaryColor) && (
                  <span
                    className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                    style={{ backgroundColor: opt.primaryColor ?? opt.secondaryColor }}
                  />
                )}
                <span className="font-display font-bold text-xs truncate">
                  {opt.name}
                </span>
              </div>
              <div className="text-[10px] font-mono font-bold uppercase">
                {isEquipped ? (
                  <span className="text-emerald-400">EQUIPPED</span>
                ) : isOwned ? (
                  <span className="text-sky-400">OWNED · APPLY</span>
                ) : (
                  <span className="text-amber-400">{opt.cost} COINS</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Garage and Upgrades"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-5 bg-slate-950/85"
    >
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-slate-700 text-slate-100 shadow-2xl p-4 md:px-6 md:py-4 flex flex-col gap-3">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-2.5">
          <div>
            <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-white">
              HILL CLIMB GARAGE
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Switch vehicles, repair chassis damage, upgrade performance, or customize paint &amp; rims.
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

        {/* Center Vehicle Showcase with Left / Right Arrows */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handlePrevVehicle}
              aria-label="Previous Vehicle"
              className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-2 border-slate-700 flex items-center justify-center cursor-pointer shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.8">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="relative flex flex-col items-center">
              <canvas
                ref={previewCanvasRef}
                width={320}
                height={155}
                className="w-[260px] sm:w-[320px] h-[130px] sm:h-[155px] rounded-xl bg-slate-900/90 border border-slate-800"
              />
              <span className="mt-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
                Vehicle {browsedIdx + 1} of {VEHICLES.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextVehicle}
              aria-label="Next Vehicle"
              className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-2 border-slate-700 flex items-center justify-center cursor-pointer shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.8">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Vehicle Details, Condition/Repair, Stats & BUY / SELECT Button */}
          <div className="flex-1 w-full flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3
                  data-testid="garage-vehicle-name"
                  className="font-display font-black text-2xl text-white"
                >
                  {browsedVehicle.name}
                </h3>
                <span
                  data-testid="garage-vehicle-status"
                  className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg tabular-nums ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : isUnlocked
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isSelected
                    ? 'EQUIPPED'
                    : isUnlocked
                    ? 'PURCHASED'
                    : `LOCKED · ${browsedVehicle.unlockCost} COINS`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {browsedVehicle.tagline}
              </p>
            </div>

            {/* Vehicle Condition & Repair Bar */}
            {isUnlocked && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <span className="text-slate-300 uppercase">
                      Chassis Condition {condition < 60 ? '· DAMAGED!' : ''}
                    </span>
                    <span
                      data-testid="garage-vehicle-condition"
                      className={`tabular-nums ${
                        condition < 50
                          ? 'text-red-400'
                          : condition < 80
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {condition}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all ${
                        condition < 50
                          ? 'bg-red-500'
                          : condition < 80
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${condition}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="garage-repair-button"
                  disabled={repairCost === 0 || !canAffordRepair}
                  onClick={() => onRepairVehicle(browsedVehicle.id)}
                  className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs uppercase tracking-wider shrink-0 transition-all ${
                    repairCost === 0
                      ? 'bg-slate-800 text-emerald-400 cursor-default'
                      : canAffordRepair
                      ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {repairCost === 0 ? '100% Repaired' : `Repair (${repairCost} Coins)`}
                </button>
              </div>
            )}

            {/* Stats Readout Row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-1.5">
                <div className="text-[9px] font-bold uppercase text-slate-400">Speed</div>
                <div className="font-mono font-bold text-xs text-white tabular-nums">
                  {Math.round(effectiveStats.maxSpeed * 0.16)} km/h
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-1.5">
                <div className="text-[9px] font-bold uppercase text-slate-400">Power</div>
                <div className="font-mono font-bold text-xs text-amber-300 tabular-nums">
                  {Math.round(effectiveStats.engineForce)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-1.5">
                <div className="text-[9px] font-bold uppercase text-slate-400">Grip</div>
                <div className="font-mono font-bold text-xs text-emerald-400 tabular-nums">
                  {effectiveStats.grip.toFixed(2)}x
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-1.5">
                <div className="text-[9px] font-bold uppercase text-slate-400">Mass</div>
                <div className="font-mono font-bold text-xs text-slate-200 tabular-nums">
                  {effectiveStats.massKg} kg
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-1.5">
                <div className="text-[9px] font-bold uppercase text-slate-400">Susp.</div>
                <div className="font-mono font-bold text-xs text-sky-400 tabular-nums">
                  {Math.round(effectiveStats.suspensionStiffness)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-1.5">
                <div className="text-[9px] font-bold uppercase text-slate-400">Fuel</div>
                <div className="font-mono font-bold text-xs text-amber-400 tabular-nums">
                  {effectiveStats.fuelCapacity}L
                </div>
              </div>
            </div>

            {/* Clear BUY or SELECT Button */}
            <div className="flex items-center gap-3">
              {isUnlocked ? (
                <button
                  type="button"
                  onClick={() => onSelectOrUnlockVehicle(browsedVehicle.id)}
                  disabled={isSelected}
                  className={`w-full py-2.5 px-5 rounded-xl font-display font-black text-sm uppercase tracking-wider transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/50 cursor-default'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-2 border-slate-950 cursor-pointer'
                  }`}
                >
                  {isSelected ? 'Selected Vehicle' : `Select ${browsedVehicle.name}`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canAffordVehicle}
                  onClick={() => onSelectOrUnlockVehicle(browsedVehicle.id)}
                  className={`w-full py-2.5 px-5 rounded-xl font-display font-black text-sm uppercase tracking-wider transition-all whitespace-nowrap ${
                    canAffordVehicle
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Buy {browsedVehicle.name} ({browsedVehicle.unlockCost} Coins)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Navigation: Performance Upgrades vs Cosmetic Customization */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="garage-tab-upgrades"
              onClick={() => setActiveTab('upgrades')}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                activeTab === 'upgrades'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Performance Upgrades
            </button>
            <button
              type="button"
              data-testid="garage-tab-customize"
              onClick={() => setActiveTab('customize')}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                activeTab === 'customize'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Paint, Rims &amp; Skins
            </button>
          </div>

          {!isUnlocked && (
            <span className="text-xs text-amber-400 font-semibold">
              Unlock this vehicle first to upgrade or customize
            </span>
          )}
        </div>

        {activeTab === 'upgrades' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {UPGRADE_KEYS.map((key) => {
              const meta = UPGRADE_META[key];
              const level = currentUpgrades[key];
              const isMax = level >= MAX_UPGRADE_LEVEL;
              const cost = getUpgradeCost(key, level);
              const affordable =
                isUnlocked && canPurchaseUpgrade(progress, browsedVehicle.id, key);

              return (
                <div
                  key={key}
                  className="rounded-2xl bg-slate-950/85 border border-slate-800 p-3.5 flex flex-col justify-between gap-3"
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

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {isMax ? 'Max Level Reached' : `Cost: ${cost} Coins`}
                    </span>

                    <button
                      type="button"
                      disabled={isMax || !affordable}
                      onClick={() => onUpgradeVehicle(browsedVehicle.id, key)}
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
        ) : (
          <div className="flex flex-col gap-3">
            {renderCosmeticRow(
              'Body Paint Color',
              'paint',
              PAINT_OPTIONS,
              customization.paintId,
              customization.unlockedPaints
            )}
            {renderCosmeticRow(
              'Wheel Rim Style',
              'rim',
              RIM_OPTIONS,
              customization.rimId,
              customization.unlockedRims
            )}
            {renderCosmeticRow(
              'Chassis Decal Skin',
              'skin',
              SKIN_OPTIONS,
              customization.skinId,
              customization.unlockedSkins
            )}
          </div>
        )}

        {/* Footer CTA */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            data-start="true"
            onClick={onStartRun}
            className="px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-base uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer whitespace-nowrap shrink-0"
          >
            Drive Now
          </button>
        </div>
      </div>
    </div>
  );
};
