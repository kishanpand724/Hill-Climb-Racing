class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private coinCombo = 0;
  private lastCoinTime = 0;

  // Continuous engine & brake oscillators
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private brakeOsc: OscillatorNode | null = null;
  private brakeGain: GainNode | null = null;

  // Procedural upbeat arcade background music scheduler
  private lastMusicNoteTime = 0;
  private musicStep = 0;

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.ctx) {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      }
      if (this.brakeGain) {
        this.brakeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureDrivingNodes(ctx: AudioContext): void {
    if (!this.engineOsc || !this.engineGain) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.engineOsc = osc;
      this.engineGain = gain;
    }

    if (!this.brakeOsc || !this.brakeGain) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.brakeOsc = osc;
      this.brakeGain = gain;
    }
  }

  public updateDrivingAudio(
    rpm: number,
    throttle: number,
    braking: boolean,
    speedKmh: number,
    isDriving: boolean
  ): void {
    if (this.muted || typeof window === 'undefined') return;
    if (!this.ctx || this.ctx.state !== 'running') return;

    this.ensureDrivingNodes(this.ctx);
    const now = this.ctx.currentTime;

    if (!isDriving) {
      this.engineGain?.gain.setTargetAtTime(0, now, 0.05);
      this.brakeGain?.gain.setTargetAtTime(0, now, 0.04);
      return;
    }

    // Engine frequency & volume scaled by RPM and throttle
    const rpmNorm = Math.max(0, Math.min(1, (rpm - 800) / 7000));
    const targetFreq = 44 + rpmNorm * 118 + (throttle > 0 ? 14 : 0);
    const targetVol = 0.018 + Math.abs(throttle) * 0.024 + rpmNorm * 0.015;
    this.engineOsc?.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.engineGain?.gain.setTargetAtTime(targetVol, now, 0.05);

    // Braking tire scrub sound when braking at speed
    if (braking && speedKmh > 12) {
      const brakePitch = 280 + Math.min(220, speedKmh * 1.8);
      this.brakeOsc?.frequency.setTargetAtTime(brakePitch, now, 0.03);
      this.brakeGain?.gain.setTargetAtTime(0.025, now, 0.03);
    } else {
      this.brakeGain?.gain.setTargetAtTime(0, now, 0.04);
    }

    // Subtle procedural background melody during active runs
    if (now - this.lastMusicNoteTime >= 0.28) {
      this.lastMusicNoteTime = now;
      const melody = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0];
      const freq = melody[this.musicStep % melody.length];
      this.musicStep++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.016, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    }
  }

  public playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playJump(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playCoin(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (now - this.lastCoinTime < 0.7) {
      this.coinCombo = Math.min(8, this.coinCombo + 1);
    } else {
      this.coinCombo = 0;
    }
    this.lastCoinTime = now;

    const baseFreq = 660 * Math.pow(1.06, this.coinCombo);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.35, now + 0.055);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playFuelRefill(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.15, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.17);
    });
  }

  public playFlipBonus(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.16, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.24);
    });
  }

  public playLandThud(intensity = 0.5): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);

    const vol = Math.min(0.22, Math.max(0.05, intensity * 0.18));
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playCrash(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.42);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public playUpgrade(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.14);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }
}

export const sound = new SoundEngine();
