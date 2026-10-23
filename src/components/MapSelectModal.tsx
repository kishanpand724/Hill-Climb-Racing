import React from 'react';
import { MAPS } from '../game/maps';
import { MapId, SavedProgress } from '../game/types';

interface MapSelectModalProps {
  progress: SavedProgress;
  onSelectOrUnlockMap: (mapId: MapId) => void;
  onClose: () => void;
  onStartRun: () => void;
}

export const MapSelectModal: React.FC<MapSelectModalProps> = ({
  progress,
  onSelectOrUnlockMap,
  onClose,
  onStartRun,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select Map Environment"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-5 bg-slate-950/85"
    >
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-slate-700 text-slate-100 shadow-2xl p-4 md:p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-white">
              SELECT STAGE MAP
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Each stage features unique terrain slopes, dynamic weather, secret shortcuts, and surface traction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-amber-400 text-lg tabular-nums">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#0f172a" />
                <circle cx="12" cy="12" r="8.5" fill="#fbbf24" />
              </svg>
              <span data-testid="map-modal-coins">{progress.coins}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Map Selection"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              Close
            </button>
          </div>
        </div>

        {/* 4 Map Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MAPS.map((map) => {
            const isUnlocked = progress.unlockedMaps.includes(map.id);
            const isSelected = progress.selectedMapId === map.id;
            const canAfford = progress.coins >= map.unlockCost;
            const mapBest = progress.bestDistanceByMap?.[map.id] ?? 0;

            return (
              <div
                key={map.id}
                data-testid={`map-card-${map.id}`}
                className={`rounded-2xl overflow-hidden border-2 transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-400 shadow-lg'
                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Illustrated SVG Biome Preview Banner */}
                <div>
                  <div className="relative h-28 w-full overflow-hidden border-b border-slate-800">
                    {map.id === 'hills' && (
                      <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="hillsSky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" />
                            <stop offset="100%" stopColor="#bae6fd" />
                          </linearGradient>
                        </defs>
                        <rect width="300" height="120" fill="url(#hillsSky)" />
                        <circle cx="240" cy="30" r="16" fill="#fef08a" />
                        <path d="M0 95 Q75 50 150 85 T300 75 L300 120 L0 120 Z" fill="#15803d" />
                        <path d="M0 102 Q90 65 180 95 T300 88 L300 120 L0 120 Z" fill="#22c55e" />
                        <polygon points="55,80 42,102 68,102" fill="#14532d" />
                        <polygon points="55,68 45,88 65,88" fill="#16a34a" />
                      </svg>
                    )}
                    {map.id === 'desert' && (
                      <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="desertSky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c2d12" />
                            <stop offset="60%" stopColor="#ea580c" />
                            <stop offset="100%" stopColor="#fde047" />
                          </linearGradient>
                        </defs>
                        <rect width="300" height="120" fill="url(#desertSky)" />
                        <circle cx="230" cy="42" r="22" fill="#fed7aa" />
                        <path d="M0 92 Q80 45 160 88 T300 70 L300 120 L0 120 Z" fill="#d97706" />
                        <path d="M0 100 Q110 60 210 96 T300 84 L300 120 L0 120 Z" fill="#f59e0b" />
                        <rect x="68" y="60" width="7" height="32" rx="3" fill="#15803d" />
                        <rect x="60" y="70" width="8" height="5" rx="2" fill="#15803d" />
                        <rect x="75" y="66" width="8" height="5" rx="2" fill="#15803d" />
                      </svg>
                    )}
                    {map.id === 'snow' && (
                      <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="snowSky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f172a" />
                            <stop offset="60%" stopColor="#1e3a8a" />
                            <stop offset="100%" stopColor="#93c5fd" />
                          </linearGradient>
                        </defs>
                        <rect width="300" height="120" fill="url(#snowSky)" />
                        <polygon points="30,100 95,28 160,100" fill="#475569" />
                        <polygon points="95,28 75,55 115,55" fill="#f8fafc" />
                        <polygon points="140,100 215,22 290,100" fill="#334155" />
                        <polygon points="215,22 192,52 238,52" fill="#f8fafc" />
                        <path d="M0 96 Q90 68 185 94 T300 82 L300 120 L0 120 Z" fill="#e2e8f0" />
                        <circle cx="50" cy="25" r="2.5" fill="#ffffff" />
                        <circle cx="130" cy="40" r="2" fill="#ffffff" />
                        <circle cx="180" cy="20" r="2.5" fill="#ffffff" />
                        <circle cx="260" cy="35" r="2" fill="#ffffff" />
                      </svg>
                    )}
                    {map.id === 'seasons' && (
                      <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="seasonsSky" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0284c7" />
                            <stop offset="35%" stopColor="#f59e0b" />
                            <stop offset="70%" stopColor="#334155" />
                            <stop offset="100%" stopColor="#1e3a8a" />
                          </linearGradient>
                          <linearGradient id="seasonsGround" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#4ade80" />
                            <stop offset="35%" stopColor="#facc15" />
                            <stop offset="70%" stopColor="#15803d" />
                            <stop offset="100%" stopColor="#f8fafc" />
                          </linearGradient>
                        </defs>
                        <rect width="300" height="120" fill="url(#seasonsSky)" />
                        <circle cx="48" cy="64" r="14" fill="#f472b6" />
                        <rect x="45" y="74" width="6" height="22" fill="#5c2d16" />
                        <circle cx="130" cy="28" r="14" fill="#fde047" />
                        <line x1="205" y1="22" x2="198" y2="42" stroke="#bae6fd" strokeWidth="2" />
                        <line x1="220" y1="28" x2="213" y2="48" stroke="#bae6fd" strokeWidth="2" />
                        <circle cx="268" cy="32" r="3" fill="#ffffff" />
                        <circle cx="282" cy="48" r="2.5" fill="#ffffff" />
                        <path d="M0 94 Q85 55 175 90 T300 76 L300 120 L0 120 Z" fill="url(#seasonsGround)" />
                      </svg>
                    )}

                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/85 text-[11px] font-mono font-bold text-slate-200 tabular-nums">
                      Best: {mapBest}m
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-black text-lg text-white leading-tight">
                        {map.name}
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-amber-400 shrink-0">
                        {isUnlocked ? 'UNLOCKED' : `${map.unlockCost} Coins`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {map.description}
                    </p>

                    <div className="pt-1.5 flex items-center gap-2.5 text-[11px] font-mono text-slate-300">
                      <span>Grip: {Math.round(map.tractionMultiplier * 100)}%</span>
                      <span>·</span>
                      <span>Jumps: {Math.round(map.jumpAmplitude * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="p-3.5 pt-0">
                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onSelectOrUnlockMap(map.id)}
                      className={`w-full py-2.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-2 border-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {isSelected ? 'Selected Stage' : 'Select Stage'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onSelectOrUnlockMap(map.id)}
                      className={`w-full py-2.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                        canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Unlock ({map.unlockCost} Coins)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            data-start="true"
            onClick={onStartRun}
            className="px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-base uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer whitespace-nowrap shrink-0"
          >
            Play Selected Map
          </button>
        </div>
      </div>
    </div>
  );
};
