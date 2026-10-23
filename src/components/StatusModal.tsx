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
  onOpenMapSelect: () => void;
  onOpenCareer: () => void;
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
  onOpenMapSelect,
  onOpenCareer,
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
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={onOpenGarage}
                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap truncate"
              >
                Garage
              </button>
              <button
                type="button"
                onClick={onOpenMapSelect}
                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap truncate"
              >
                Maps
              </button>
              <button
                type="button"
                onClick={onOpenCareer}
                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap truncate"
              >
                Career
              </button>
              <button
                type="button"
                onClick={onBackToTitle}
                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap truncate"
              >
                Title
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
    summary?.reasonDetail ??
    (summary?.reason === 'fuel'
      ? 'Your tank ran dry before reaching the next jerrycan.'
      : 'Hard upside-down landing! Upgrade suspension or feather the throttle in mid-air.');

  const pickupCoins = summary?.pickupCoins ?? currentCoins;
  const stuntBonus = summary?.stuntBonusCoins ?? 0;
  const missionBonus = summary?.missionRewardCoins ?? 0;
  const totalRewards = summary?.coinsCollected ?? currentCoins;
  const completedMissions = summary?.completedMissionTitles ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Over Summary"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80"
    >
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 md:p-7 text-slate-100 shadow-2xl flex flex-col gap-4 max-h-[94vh] overflow-y-auto">
        <div className="text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
            {summary?.mapName ?? 'GREEN HILLS'} · {summary?.vehicleName ?? 'HILL CLIMBER'}
          </span>
          <h2 className="font-display font-black text-3xl text-white mt-1">
            {reasonHeadline}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{reasonSub}</p>
        </div>

        {/* Distance & Best Distance Row */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
            <div className="text-[11px] font-bold uppercase text-slate-400">Distance Travelled</div>
            <div
              data-testid="gameover-distance"
              className="font-mono font-extrabold text-2xl text-white tabular-nums mt-0.5"
            >
              {summary?.distanceMeters ?? currentDistance}m
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              {summary?.isNewBest ? 'New Best Distance!' : 'Best Distance'}
            </div>
            <div className="font-mono font-extrabold text-2xl text-emerald-400 tabular-nums mt-0.5">
              {summary?.bestDistanceMeters ?? bestDistance}m
            </div>
          </div>
        </div>

        {/* Rewards Breakdown */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3.5 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Coins &amp; Treasure Collected</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">+{pickupCoins}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>
              Stunt &amp; Jump Bonus{' '}
              {summary?.maxStuntCombo && summary.maxStuntCombo > 1
                ? `(Max ${summary.maxStuntCombo}x Combo)`
                : ''}
            </span>
            <span className="font-mono font-bold text-sky-400 tabular-nums">+{stuntBonus}</span>
          </div>
          {missionBonus > 0 && (
            <div className="flex items-center justify-between text-emerald-300">
              <span>Career Mission Bonus ({completedMissions.length})</span>
              <span className="font-mono font-bold tabular-nums">+{missionBonus}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-400">
            <span>Chassis Condition</span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">
              {Math.round(summary?.finalCondition ?? 100)}%
            </span>
          </div>
          <div className="border-t border-slate-800 pt-2 mt-1 flex items-center justify-between text-sm font-bold text-white">
            <span>Total Run Rewards</span>
            <span
              data-testid="gameover-total-rewards"
              className="font-mono font-extrabold text-amber-400 text-base tabular-nums"
            >
              +{totalRewards} Coins
            </span>
          </div>
        </div>

        {completedMissions.length > 0 && (
          <div className="rounded-2xl bg-emerald-950/35 border border-emerald-500/40 p-3 flex flex-col gap-1">
            <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-300">
              MISSIONS COMPLETED THIS RUN
            </div>
            {completedMissions.map((title) => (
              <div key={title} className="text-xs font-bold text-white">
                ✓ {title}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-lg uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer"
          >
            Restart Run
          </button>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onOpenGarage}
              className="py-3 px-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer whitespace-nowrap truncate"
            >
              Garage
            </button>
            <button
              type="button"
              onClick={onOpenMapSelect}
              className="py-3 px-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-extrabold text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer whitespace-nowrap truncate"
            >
              Maps
            </button>
            <button
              type="button"
              onClick={onOpenCareer}
              className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-display font-extrabold text-xs uppercase tracking-wider border-2 border-slate-950 cursor-pointer whitespace-nowrap truncate"
            >
              Career
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap truncate"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
