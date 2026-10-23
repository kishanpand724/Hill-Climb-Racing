import React, { useState } from 'react';
import { MissionSpec, SavedProgress } from '../game/types';
import { CAREER_MISSIONS, getCareerLevel } from '../game/vehicles';

interface CareerModalProps {
  progress: SavedProgress;
  onClose: () => void;
  onStartRun: () => void;
}

export const CareerModal: React.FC<CareerModalProps> = ({
  progress,
  onClose,
  onStartRun,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const career = getCareerLevel(progress.xp);
  const completedCount = progress.completedMissions.length;
  const totalCount = CAREER_MISSIONS.length;
  const progressPct = Math.min(100, (career.currentLevelXp / career.nextLevelXp) * 100);

  const filteredMissions = CAREER_MISSIONS.filter((m) => {
    const done = progress.completedMissions.includes(m.id);
    if (filter === 'active') return !done;
    if (filter === 'completed') return done;
    return true;
  });

  const getMissionBadge = (mission: MissionSpec) => {
    if (mission.category === 'daily') {
      return {
        label: 'DAILY CHALLENGE',
        color: 'text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/40',
      };
    }
    if (mission.mapId === 'hills') {
      return {
        label: 'GREEN HILLS',
        color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40',
      };
    }
    if (mission.mapId === 'desert') {
      return {
        label: 'DESERT DUNES',
        color: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
      };
    }
    if (mission.mapId === 'snow') {
      return {
        label: 'SNOW MOUNTAIN',
        color: 'text-sky-300 bg-sky-500/20 border-sky-500/40',
      };
    }
    if (mission.mapId === 'seasons') {
      return {
        label: 'FOUR SEASONS',
        color: 'text-pink-300 bg-pink-500/20 border-pink-500/40',
      };
    }
    return {
      label: 'CAREER GOAL',
      color: 'text-slate-300 bg-slate-800 border-slate-700',
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Career Mode and Challenges"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-5 bg-slate-950/85"
    >
      <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-slate-700 text-slate-100 shadow-2xl p-4 md:p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-white">
              CAREER &amp; CHALLENGES
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Complete map objectives, stunt combos, and daily challenges to earn bonus Coins and Career XP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono font-bold text-amber-400 text-lg tabular-nums">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#0f172a" />
                <circle cx="12" cy="12" r="8.5" fill="#fbbf24" />
              </svg>
              <span data-testid="career-coins">{progress.coins}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Career Modal"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              Close
            </button>
          </div>
        </div>

        {/* Driver Rank, XP Bar & Map Best Summary */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 border-2 border-slate-950 flex flex-col items-center justify-center shrink-0 shadow-md">
              <span className="text-[10px] font-mono font-extrabold uppercase leading-none">
                RANK
              </span>
              <span
                data-testid="career-level"
                className="font-display font-black text-3xl leading-none mt-0.5 tabular-nums"
              >
                {career.level}
              </span>
            </div>

            <div className="flex-1 min-w-[210px]">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-white uppercase tracking-wider">
                  {career.title}
                </span>
                <span className="text-amber-300 tabular-nums">
                  {career.currentLevelXp} / {career.nextLevelXp} XP
                </span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 mt-1.5">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.round(progressPct)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Missions Completed:{' '}
                <span className="text-emerald-400 font-bold">
                  {completedCount}/{totalCount}
                </span>{' '}
                · Total XP: {progress.xp}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 w-full md:w-auto text-center">
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
              <div className="text-[9px] font-bold uppercase text-slate-400">Hills</div>
              <div className="font-mono font-bold text-sm text-emerald-400 tabular-nums">
                {progress.bestDistanceByMap.hills ?? 0}m
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
              <div className="text-[9px] font-bold uppercase text-slate-400">Desert</div>
              <div className="font-mono font-bold text-sm text-amber-400 tabular-nums">
                {progress.bestDistanceByMap.desert ?? 0}m
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
              <div className="text-[9px] font-bold uppercase text-slate-400">Snow</div>
              <div className="font-mono font-bold text-sm text-sky-400 tabular-nums">
                {progress.bestDistanceByMap.snow ?? 0}m
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
              <div className="text-[9px] font-bold uppercase text-slate-400">Seasons</div>
              <div className="font-mono font-bold text-sm text-pink-400 tabular-nums">
                {progress.bestDistanceByMap.seasons ?? 0}m
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(['all', 'active', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                  filter === tab
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab === 'all'
                  ? `All (${totalCount})`
                  : tab === 'active'
                  ? `Active (${totalCount - completedCount})`
                  : `Completed (${completedCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Missions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMissions.map((mission) => {
            const isDone = progress.completedMissions.includes(mission.id);
            const badge = getMissionBadge(mission);
            const currentProg = progress.missionProgress?.[mission.id] ?? 0;

            return (
              <div
                key={mission.id}
                data-testid={`mission-card-${mission.id}`}
                className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 ${
                  isDone
                    ? 'bg-emerald-950/25 border-emerald-500/40'
                    : 'bg-slate-950/85 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <h3 className="font-display font-bold text-base text-white mt-1">
                      {mission.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {mission.description}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-amber-300 border border-slate-800'
                    }`}
                  >
                    {isDone ? 'COMPLETED' : `${Math.min(mission.target, currentProg)}/${mission.target}`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <span className="text-slate-400">Reward:</span>
                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-amber-400">+{mission.rewardCoins} Coins</span>
                    <span className="text-sky-400">+{mission.rewardXp} XP</span>
                  </div>
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
            className="px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-base uppercase tracking-wider border-2 border-slate-950 shadow-[0_4px_0_#0f172a] cursor-pointer whitespace-nowrap shrink-0"
          >
            Drive &amp; Complete Missions
          </button>
        </div>
      </div>
    </div>
  );
};
