import React from 'react';

export interface HudSnapshot {
  distanceMeters: number;
  bestDistanceMeters: number;
  coins: number;
  fuelPct: number;
  lowFuel: boolean;
  speedKmh: number;
  gasPressed: boolean;
  brakePressed: boolean;
}

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  fuelBarRef: React.RefObject<HTMLDivElement | null>;
  fuelGhostRef: React.RefObject<HTMLDivElement | null>;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onGasDown: () => void;
  onGasUp: () => void;
  onBrakeDown: () => void;
  onBrakeUp: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  fuelBarRef,
  fuelGhostRef,
  onToggleMute,
  onPause,
  onRestart,
  onGasDown,
  onGasUp,
  onBrakeDown,
  onBrakeUp,
}) => {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter Bar: Left Telemetry Cluster & Right Utility Buttons */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Cluster: Fuel Bar, Distance, Coins */}
        <div className="flex flex-col gap-2.5">
          {/* Fuel Gauge with Custom Jerrycan Icon & Ghost Drain Bar */}
          <div className="flex items-center gap-2.5 bg-slate-950/90 border-2 border-slate-900 rounded-2xl px-3.5 py-2 shadow-[0_4px_0_#0f172a]">
            <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
              <rect x="4" y="4" width="14" height="17" rx="3" fill="#0f172a" />
              <rect x="5.5" y="5.5" width="11" height="14" rx="2" fill="#ef4444" />
              <rect x="8" y="7" width="6" height="2.2" fill="#0f172a" />
              <rect x="14" y="2.5" width="3.5" height="3" fill="#fbbf24" />
              <path d="M8 11.5 L14 17.5 M14 11.5 L8 17.5" stroke="#fca5a5" strokeWidth="1.8" />
            </svg>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                  FUEL {hud.lowFuel ? '· LOW!' : ''}
                </span>
                <span
                  data-testid="hud-fuel"
                  className={`font-mono font-bold text-xs tabular-nums ${
                    hud.lowFuel ? 'text-red-400 animate-pulse' : 'text-slate-200'
                  }`}
                >
                  {Math.round(hud.fuelPct)}%
                </span>
              </div>

              <div className="w-36 sm:w-44 h-3.5 bg-slate-900 rounded-md overflow-hidden border border-slate-800 relative">
                {/* Delayed trailing drain ghost bar */}
                <div
                  ref={fuelGhostRef}
                  className="absolute inset-y-0 left-0 bg-amber-200/50 origin-left transition-transform duration-300"
                  style={{ width: '100%', transform: `scaleX(${Math.max(0, Math.min(1, hud.fuelPct / 100))})` }}
                />
                {/* Immediate fuel fill bar */}
                <div
                  ref={fuelBarRef}
                  className={`absolute inset-y-0 left-0 origin-left ${
                    hud.lowFuel ? 'bg-red-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: '100%', transform: `scaleX(${Math.max(0, Math.min(1, hud.fuelPct / 100))})` }}
                />
              </div>
            </div>
          </div>

          {/* Distance & Coins Row (Hero-to-Kicker 3:1 Scale with Tabular Numerals) */}
          <div className="flex items-center gap-5 px-1">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 hud-stroke-sm">
                DISTANCE · BEST {hud.bestDistanceMeters}M
              </div>
              <div
                data-testid="hud-distance"
                className="font-display font-black text-3xl md:text-4xl text-white tabular-nums hud-stroke leading-none"
              >
                {hud.distanceMeters}m
              </div>
            </div>

            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0 drop-shadow-[0_2px_0_#0f172a]" aria-hidden="true">
                <circle cx="12" cy="12" r="10.5" fill="#0f172a" />
                <circle cx="12" cy="12" r="8.5" fill="#fbbf24" />
                <circle cx="12" cy="12" r="6" fill="none" stroke="#fef08a" strokeWidth="1.5" />
              </svg>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200 hud-stroke-sm">
                  COINS
                </div>
                <div
                  data-testid="hud-coins"
                  className="font-mono font-extrabold text-2xl text-amber-300 tabular-nums hud-stroke leading-none"
                >
                  {hud.coins}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top-Right Cluster: Mute [M], Restart [R], Pause [P] */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio [M]' : 'Mute audio [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-11 h-11 rounded-xl bg-slate-950/90 hover:bg-slate-900 active:scale-95 text-slate-100 border-2 border-slate-900 shadow-[0_3px_0_#0f172a] flex items-center justify-center cursor-pointer"
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart Run [R]"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="w-11 h-11 rounded-xl bg-slate-950/90 hover:bg-slate-900 active:scale-95 text-slate-100 border-2 border-slate-900 shadow-[0_3px_0_#0f172a] flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-11 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 border-2 border-slate-950 shadow-[0_3px_0_#0f172a] flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <rect x="6" y="4" width="4.5" height="16" rx="1" />
              <rect x="13.5" y="4" width="4.5" height="16" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Perimeter Pedals for Touch & Desktop Feedback */}
      <div className="flex items-end justify-between gap-4 pb-1">
        {/* Left Pedal: BRAKE / REVERSE */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Brake and Reverse Pedal"
          onPointerDown={(e) => {
            e.preventDefault();
            onBrakeDown();
          }}
          onPointerUp={onBrakeUp}
          onPointerLeave={onBrakeUp}
          onPointerCancel={onBrakeUp}
          className={`pointer-events-auto w-28 sm:w-36 h-24 sm:h-28 rounded-2xl border-3 border-slate-950 flex flex-col items-center justify-between p-3 transition-transform select-none cursor-pointer ${
            hud.brakePressed
              ? 'bg-red-500 text-white translate-y-1.5 shadow-[0_2px_0_#0f172a]'
              : 'bg-slate-800/95 hover:bg-slate-700 text-slate-100 shadow-[0_6px_0_#0f172a]'
          }`}
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest opacity-80">
            [A / LEFT]
          </span>
          {/* Pedal Tread Bars */}
          <div className="w-full flex flex-col gap-1.5 px-2" aria-hidden="true">
            <div className="h-2 rounded-full bg-slate-950/50" />
            <div className="h-2 rounded-full bg-slate-950/50" />
            <div className="h-2 rounded-full bg-slate-950/50" />
          </div>
          <span className="font-display font-black text-sm sm:text-base tracking-wider uppercase">
            BRAKE
          </span>
        </button>

        {/* Center-Bottom Compact Speed Readout */}
        <div className="hidden sm:flex flex-col items-center pb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200 hud-stroke-sm">
            SPEED
          </span>
          <span className="font-mono font-extrabold text-xl text-white tabular-nums hud-stroke">
            {hud.speedKmh} km/h
          </span>
        </div>

        {/* Right Pedal: ACCELERATE / GAS */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Gas Accelerate Pedal"
          onPointerDown={(e) => {
            e.preventDefault();
            onGasDown();
          }}
          onPointerUp={onGasUp}
          onPointerLeave={onGasUp}
          onPointerCancel={onGasUp}
          className={`pointer-events-auto w-28 sm:w-36 h-24 sm:h-28 rounded-2xl border-3 border-slate-950 flex flex-col items-center justify-between p-3 transition-transform select-none cursor-pointer ${
            hud.gasPressed
              ? 'bg-emerald-400 text-slate-950 translate-y-1.5 shadow-[0_2px_0_#0f172a]'
              : 'bg-emerald-500/95 hover:bg-emerald-400 text-slate-950 shadow-[0_6px_0_#0f172a]'
          }`}
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest opacity-80">
            [D / RIGHT]
          </span>
          <div className="w-full flex flex-col gap-1.5 px-2" aria-hidden="true">
            <div className="h-2 rounded-full bg-slate-950/35" />
            <div className="h-2 rounded-full bg-slate-950/35" />
            <div className="h-2 rounded-full bg-slate-950/35" />
          </div>
          <span className="font-display font-black text-sm sm:text-base tracking-wider uppercase">
            GAS
          </span>
        </button>
      </div>
    </div>
  );
};
