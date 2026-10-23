import React from 'react';
import { MapSpec, SavedProgress, VehicleSpec } from '../game/types';
import { CAREER_MISSIONS, canPurchaseUpgrade, getCareerLevel, getRepairCost } from '../game/vehicles';

interface TitleScreenProps {
  progress: SavedProgress;
  selectedVehicle: VehicleSpec;
  selectedMap: MapSpec;
  onStartGame: () => void;
  onOpenGarage: () => void;
  onOpenMapSelect: () => void;
  onOpenCareer: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  selectedVehicle,
  selectedMap,
  onStartGame,
  onOpenGarage,
  onOpenMapSelect,
  onOpenCareer,
  onToggleMute,
}) => {
  const hasAffordableUpgrade = (['engine', 'grip', 'suspension', 'fuel'] as const).some((key) =>
    canPurchaseUpgrade(progress, selectedVehicle.id, key)
  );
  const currentCond = progress.vehicleCondition?.[selectedVehicle.id] ?? 100;
  const needsRepair = getRepairCost(currentCond) > 0;
  const career = getCareerLevel(progress.xp);
  const completedCount = progress.completedMissions.length;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Top Row: Telemetry Summary & Mute Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="pointer-events-auto inline-flex flex-wrap items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/85 border border-slate-700/80 text-slate-100 shadow-lg">
          <span className="inline-flex items-center gap-1.5 font-mono font-bold text-amber-400 tabular-nums">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#0f172a" />
              <circle cx="12" cy="12" r="8.5" fill="#fbbf24" />
              <circle cx="12" cy="12" r="6" fill="none" stroke="#fef08a" strokeWidth="1.5" />
            </svg>
            <span data-testid="title-coins">{progress.coins}</span>
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Best <span className="font-mono font-bold text-white tabular-nums">{progress.bestDistance}m</span>
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span
            data-testid="title-selected-vehicle"
            className="text-xs font-semibold text-emerald-400"
          >
            {selectedVehicle.name}
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span
            data-testid="title-selected-map"
            className="text-xs font-semibold text-sky-300"
          >
            {selectedMap.name}
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span
            data-testid="title-career-rank"
            className="text-xs font-mono font-bold text-amber-300"
          >
            Rank {career.level} ({completedCount}/{CAREER_MISSIONS.length})
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={progress.muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto w-11 h-11 rounded-xl bg-slate-950/85 border border-slate-700/80 text-slate-100 hover:bg-slate-900 active:scale-95 transition-transform flex items-center justify-center shadow-lg cursor-pointer shrink-0"
        >
          {progress.muted ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>

      {/* Main Left-Third Focal Lockup over Calm Sky Negative Space */}
      <div className="my-auto max-w-2xl flex flex-col items-start gap-6">
        <div className="w-full max-w-md select-none">
          <svg
            viewBox="0 0 460 135"
            className="w-full h-auto drop-shadow-[0_6px_0_rgba(15,23,42,0.95)]"
            role="img"
            aria-label="Hill Climb X"
          >
            <path
              d="M14 96 L68 28 L112 66 L168 16 L232 82 L14 96 Z"
              fill="#15803d"
              stroke="#0f172a"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M68 28 L88 52 L68 48 L52 56 Z" fill="#f8fafc" />
            <path d="M168 16 L192 48 L168 40 L146 50 Z" fill="#f8fafc" />
            <rect
              x="8"
              y="46"
              width="442"
              height="76"
              rx="16"
              fill="#0f172a"
              stroke="#fbbf24"
              strokeWidth="4"
            />
            <g transform="translate(22, 58)">
              <rect x="0" y="0" width="12" height="12" fill="#fbbf24" />
              <rect x="12" y="12" width="12" height="12" fill="#fbbf24" />
              <rect x="0" y="24" width="12" height="12" fill="#fbbf24" />
              <rect x="12" y="36" width="12" height="12" fill="#fbbf24" />
            </g>
            <text
              x="58"
              y="99"
              fontFamily="Outfit, sans-serif"
              fontWeight="900"
              fontSize="46"
              fill="#f8fafc"
              letterSpacing="1.5"
            >
              HILL CLIMB
            </text>
            <g transform="translate(362, 53)">
              <rect x="0" y="0" width="74" height="62" rx="12" fill="#ef4444" />
              <path
                d="M18 14 L56 48 M56 14 L18 48"
                stroke="#fef08a"
                strokeWidth="11"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* Primary & Secondary CTAs */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="px-7 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-slate-950 font-display font-black text-xl tracking-wide uppercase border-2 border-slate-950 shadow-[0_5px_0_#0f172a] transition-all flex items-center gap-3 cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <polygon points="6,4 20,12 6,20" />
            </svg>
            Start Run
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGarage();
            }}
            className="px-5 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-lg tracking-wide uppercase border-2 border-slate-950 shadow-[0_5px_0_#0f172a] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <span>Garage</span>
            {(hasAffordableUpgrade || needsRepair) && (
              <span className="ml-0.5 px-2 py-0.5 text-xs font-mono font-bold bg-slate-950 text-amber-300 rounded-md">
                {needsRepair ? 'REPAIR' : 'UPGRADE'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMapSelect();
            }}
            className="px-5 py-4 rounded-2xl bg-sky-400 hover:bg-sky-300 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-lg tracking-wide uppercase border-2 border-slate-950 shadow-[0_5px_0_#0f172a] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <span>Select Map</span>
          </button>

          <button
            type="button"
            data-testid="title-career-button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenCareer();
            }}
            className="px-5 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-white font-display font-extrabold text-lg tracking-wide uppercase border-2 border-slate-950 shadow-[0_5px_0_#0f172a] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span>Career</span>
          </button>
        </div>
      </div>

      {/* Bottom Safe Margin */}
      <div className="w-full flex items-center justify-between text-xs md:text-sm font-semibold text-white hud-stroke-sm tracking-wide">
        <span>
          D / Right Accelerate · A / Left Brake &amp; Reverse · Space Hard Brake · P / Esc Pause
        </span>
        <span className="hidden sm:inline font-mono">
          Press Enter or Space to Start
        </span>
      </div>
    </div>
  );
};
