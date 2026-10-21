import React from 'react';
import { RunSummary } from '../game/types';

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  currentDistance: number;
  currentCoins: number;
  bestDistance: number;
  summary: RunSummary | null;
  onResume: () => void;
  onRestart: () => void;
  onOpenGarage: () => void;
  onBackToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  currentDistance,
  currentCoins,
  bestDistance,
  summary,
  onResume,
  onRestart,
  onOpenGarage,
  onBackToTitle,
}) => {
  if (mode === 'paused') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75"
      >
        <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 md:p-7 text-slate-100 shadow-2xl flex flex-col gap-5">
          <div className="text-center">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
              RUN PAUSED
            </span>
            <h2 className="font-display font-black text-3xl text-white mt-1">
              PIT STOP
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-400">Distance</div>
              <div className="font-mono font-extrabold text-xl text-white tabular-nums mt-0.5">
                {currentDistance}m
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-400">Best</div>
              <div className="font-mono font-extrabold text-xl text-emerald-400 tabular-nums mt-0.5">
                {bestDistance}m
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-400">Run Coins</div>
              <div className="font-mono font-extrabold text-xl text-amber-400 tabular-nums mt-0.5">
                +{currentCoins}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-lg uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer"
            >
              Resume Run
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-base uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer"
            >
              Restart Run
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenGarage}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap truncate"
              >
                Garage &amp; Tuning
              </button>
              <button
                type="button"
                onClick={onBackToTitle}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap truncate"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const reasonHeadline =
    summary?.reason === 'fuel' ? 'OUT OF FUEL!' : 'DRIVER DOWN!';
  const reasonSub =
    summary?.reason === 'fuel'
      ? 'Your tank ran dry before reaching the next jerrycan.'
      : 'Hard upside-down landing! Upgrade suspension or feather the throttle in mid-air.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Over Summary"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80"
    >
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 md:p-7 text-slate-100 shadow-2xl flex flex-col gap-5">
        <div className="text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
            RUN COMPLETE · {summary?.vehicleName ?? '4x4'}
          </span>
          <h2 className="font-display font-black text-3xl text-white mt-1">
            {reasonHeadline}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{reasonSub}</p>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
            <div className="text-[11px] font-bold uppercase text-slate-400">Distance</div>
            <div
              data-testid="gameover-distance"
              className="font-mono font-extrabold text-xl text-white tabular-nums mt-0.5"
            >
              {summary?.distanceMeters ?? currentDistance}m
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              {summary?.isNewBest ? 'New Best!' : 'Best'}
            </div>
            <div className="font-mono font-extrabold text-xl text-emerald-400 tabular-nums mt-0.5">
              {summary?.bestDistanceMeters ?? bestDistance}m
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
            <div className="text-[11px] font-bold uppercase text-slate-400">Coins Earned</div>
            <div className="font-mono font-extrabold text-xl text-amber-400 tabular-nums mt-0.5">
              +{summary?.coinsCollected ?? currentCoins}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-lg uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer"
          >
            Try Again
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenGarage}
              className="py-3 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider border-2 border-slate-950 cursor-pointer whitespace-nowrap truncate"
            >
              Garage &amp; Tuning
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap truncate"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
