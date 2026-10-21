import { getTerrainHeight } from './terrain';
import {
  CarState,
  EffectiveStats,
  FloatingText,
  Particle,
  PickupItem,
  SceneryProp,
  VehicleSpec,
} from './types';

const PARTICLE_POOL_SIZE = 140;
const TEXT_POOL_SIZE = 24;

export class GameRenderer {
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public cameraX = 0;
  public cameraY = 300;
  public trauma = 0;
  public hitFlash = 0;
  private particleCursor = 0;
  private textCursor = 0;
  private time = 0;

  constructor() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        alpha: 1,
        life: 0,
        maxLife: 0.5,
        color: '#ffffff',
        kind: 'dirt',
      });
    }
    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      this.floatingTexts.push({
        active: false,
        x: 0,
        y: 0,
        vy: -40,
        text: '',
        color: '#fbbf24',
        life: 0,
        maxLife: 1,
        scale: 1,
      });
    }
  }

  public resetCamera(car: CarState): void {
    this.cameraX = car.x + 140;
    this.cameraY = car.y - 45;
    this.trauma = 0;
    this.hitFlash = 0;
    for (const p of this.particles) p.active = false;
    for (const t of this.floatingTexts) t.active = false;
  }

  public addShake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  public spawnParticles(
    x: number,
    y: number,
    count: number,
    kind: Particle['kind'],
    color: string,
    baseVx = 0,
    baseVy = -60
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const angle = (Math.random() - 0.5) * Math.PI * 1.4 - Math.PI * 0.5;
      const speed = 35 + Math.random() * 130;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 12;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = baseVx + Math.cos(angle) * speed;
      p.vy = baseVy + Math.sin(angle) * speed;
      p.size = kind === 'smoke' ? 6 + Math.random() * 6 : 3.5 + Math.random() * 4.5;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = kind === 'smoke' ? 0.55 + Math.random() * 0.35 : 0.35 + Math.random() * 0.3;
      p.color = color;
      p.kind = kind;
    }
  }

  public spawnFloatingText(x: number, y: number, text: string, color: string, scale = 1): void {
    let adjustedY = y;
    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      const other = this.floatingTexts[i];
      if (other.active && Math.abs(other.x - x) < 90 && Math.abs(other.y - adjustedY) < 28) {
        adjustedY = other.y - 28;
      }
    }
    const t = this.floatingTexts[this.textCursor];
    this.textCursor = (this.textCursor + 1) % TEXT_POOL_SIZE;
    t.active = true;
    t.x = x;
    t.y = adjustedY;
    t.vy = -65;
    t.text = text;
    t.color = color;
    t.life = 0;
    t.maxLife = 1.05;
    t.scale = scale;
  }

  public updateEffects(
    car: CarState,
    spec: VehicleSpec,
    isTitleMode: boolean,
    dt: number
  ): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);

    // Smooth camera tracking with look-ahead
    const lookAheadX = isTitleMode
      ? 90 + Math.sin(this.time * 0.6) * 28
      : Math.max(85, Math.min(260, 125 + car.vx * 0.25));
    const targetCamX = car.x + lookAheadX;
    const targetCamY = isTitleMode ? car.y - 75 : car.y - 45 + Math.min(40, car.vy * 0.08);

    const smooth = 1 - Math.pow(0.0015, dt);
    this.cameraX += (targetCamX - this.cameraX) * smooth;
    this.cameraY += (targetCamY - this.cameraY) * smooth;

    // Exhaust smoke & wheel dirt roost during active driving
    if (!isTitleMode && !car.crashed && !car.outOfFuel) {
      if (car.throttle !== 0 && Math.random() < 0.45) {
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const exhaustX = car.x - cosA * (spec.chassisWidth * 0.48);
        const exhaustY = car.y - sinA * (spec.chassisWidth * 0.48);
        this.spawnParticles(
          exhaustX,
          exhaustY,
          1,
          'smoke',
          'rgba(226, 232, 240, 0.55)',
          -cosA * 65,
          -35
        );
      }
      if (
        car.rearWheel.grounded &&
        Math.abs(car.throttle) > 0.2 &&
        Math.abs(car.vx) > 40 &&
        Math.random() < 0.65
      ) {
        this.spawnParticles(
          car.rearWheel.worldX - 8,
          car.rearWheel.worldY + spec.wheelRadius * 0.85,
          1,
          'dirt',
          Math.random() > 0.4 ? '#78350f' : '#4ade80',
          -car.vx * 0.35,
          -55
        );
      }
    }

    // Update pooled particles
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      if (p.kind === 'dirt' || p.kind === 'spark') {
        p.vy += 460 * dt;
      } else if (p.kind === 'smoke') {
        p.vy -= 30 * dt;
        p.size += 12 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }

    // Update floating texts
    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      const t = this.floatingTexts[i];
      if (!t.active) continue;
      t.life += dt;
      if (t.life >= t.maxLife) {
        t.active = false;
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 0.94;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    car: CarState,
    spec: VehicleSpec,
    stats: EffectiveStats,
    pickups: PickupItem[],
    scenery: SceneryProp[],
    isTitleMode: boolean
  ): void {
    ctx.save();

    // 1. Vibrant Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.52, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Warm sun with soft glow in upper right
    const sunX = width * 0.78;
    const sunY = height * 0.2;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 130);
    sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    sunGlow.addColorStop(0.35, 'rgba(253, 224, 71, 0.35)');
    sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();

    // 2. Parallax Clouds
    this.drawClouds(ctx, width, height);

    // 3. Layered Parallax Mountains & Distant Hills
    this.drawMountainLayer(ctx, width, height, 0.08, '#64748b', '#475569', 0.62, 115, 0.0022);
    this.drawMountainLayer(ctx, width, height, 0.18, '#0d9488', '#0f766e', 0.71, 78, 0.0035);
    this.drawMountainLayer(ctx, width, height, 0.32, '#16a34a', '#15803d', 0.79, 48, 0.0052);

    // Camera transform with trauma shake
    const shakeMag = this.trauma * this.trauma * 16;
    const shakeX = (Math.random() - 0.5) * 2 * shakeMag;
    const shakeY = (Math.random() - 0.5) * 2 * shakeMag;

    const viewOriginX = this.cameraX - width * (isTitleMode ? 0.56 : 0.34) + shakeX;
    const viewOriginY = this.cameraY - height * (isTitleMode ? 0.62 : 0.56) + shakeY;

    ctx.translate(-viewOriginX, -viewOriginY);

    // 4. Roadside Scenery Behind Terrain Crest
    this.drawScenery(ctx, scenery, viewOriginX - 150, viewOriginX + width + 150);

    // 5. Continuous Hilly Terrain (Dirt cross-section, rock strata, green grass top)
    this.drawTerrain(ctx, viewOriginX, viewOriginY, width, height);

    // 6. Pickups (Coins & Fuel Cans)
    this.drawPickups(ctx, pickups, viewOriginX - 100, viewOriginX + width + 100);

    // 7. Player Vehicle (Suspension, Wheels, Chassis, Driver)
    this.drawCar(ctx, car, spec, stats);

    // 8. Pooled Particles
    this.drawParticles(ctx);

    // 9. Floating Score/Bonus Texts
    this.drawFloatingTexts(ctx);

    ctx.restore();

    // Optional Low-Fuel subtle edge vignette (non-obstructive)
    if (!isTitleMode && car.fuel > 0 && car.fuel / car.maxFuel < 0.22) {
      const pulse = 0.18 + Math.sin(this.time * 9) * 0.1;
      const vig = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        width * 0.32,
        width * 0.5,
        height * 0.5,
        width * 0.7
      );
      vig.addColorStop(0, 'rgba(239, 68, 68, 0)');
      vig.addColorStop(1, `rgba(239, 68, 68, ${pulse.toFixed(3)})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawClouds(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    const cloudCount = 6;
    const span = width + 420;
    for (let i = 0; i < cloudCount; i++) {
      const rawX = i * 290 - this.cameraX * 0.06 + this.time * (8 + (i % 3) * 3);
      const cx = (((rawX % span) + span) % span) - 210;
      const cy = height * (0.11 + (i % 3) * 0.075);
      const scale = 0.75 + (i % 3) * 0.22;

      ctx.beginPath();
      ctx.arc(cx, cy, 26 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 22 * scale, cy - 8 * scale, 22 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 44 * scale, cy, 20 * scale, 0, Math.PI * 2);
      ctx.arc(cx - 22 * scale, cy + 2 * scale, 18 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMountainLayer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    parallax: number,
    topColor: string,
    bottomColor: string,
    baseHeightRatio: number,
    amplitude: number,
    freq: number
  ): void {
    const grad = ctx.createLinearGradient(0, height * 0.35, 0, height);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, height);
    const step = 32;
    for (let sx = 0; sx <= width + step; sx += step) {
      const wx = sx + this.cameraX * parallax;
      const h =
        Math.sin(wx * freq) * amplitude +
        Math.cos(wx * freq * 2.1 + 1.7) * (amplitude * 0.45);
      const sy = height * baseHeightRatio + h;
      ctx.lineTo(sx, sy);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }

  private drawScenery(
    ctx: CanvasRenderingContext2D,
    scenery: SceneryProp[],
    minX: number,
    maxX: number
  ): void {
    for (let i = 0; i < scenery.length; i++) {
      const s = scenery[i];
      if (s.x < minX || s.x > maxX) continue;

      ctx.save();
      ctx.translate(s.x, s.y);
      const sway = Math.sin(this.time * 1.8 + s.seed * 10) * 0.03;
      ctx.rotate(s.slope * 0.35 + sway);
      ctx.scale(s.scale, s.scale);

      if (s.kind === 'pine') {
        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-5, -24, 10, 28);
        // Pine tiers
        const greens = ['#14532d', '#15803d', '#16a34a'];
        for (let t = 0; t < 3; t++) {
          ctx.fillStyle = greens[t];
          ctx.beginPath();
          const w = 34 - t * 6;
          const topY = -88 - t * 20;
          const botY = -22 - t * 24;
          ctx.moveTo(0, topY);
          ctx.lineTo(-w, botY);
          ctx.lineTo(w, botY);
          ctx.closePath();
          ctx.fill();
        }
      } else if (s.kind === 'oak') {
        ctx.fillStyle = '#713f12';
        ctx.fillRect(-6, -34, 12, 38);
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, -56, 26, 0, Math.PI * 2);
        ctx.arc(-18, -44, 20, 0, Math.PI * 2);
        ctx.arc(18, -44, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(-5, -62, 18, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'bush') {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(0, -10, 14, 0, Math.PI * 2);
        ctx.arc(-12, -6, 11, 0, Math.PI * 2);
        ctx.arc(12, -6, 11, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'rock') {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(-18, 4);
        ctx.lineTo(-12, -14);
        ctx.lineTo(4, -18);
        ctx.lineTo(18, -6);
        ctx.lineTo(20, 4);
        ctx.closePath();
        ctx.fill();
      } else if (s.kind === 'signpost' && s.milestoneMeters) {
        // Wooden distance signpost
        ctx.rotate(-s.slope * 0.35 - sway);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-3, -64, 6, 68);
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-30, -68, 60, 26, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = '800 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${s.milestoneMeters}m`, 0, -55);
      }

      ctx.restore();
    }
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    viewOriginX: number,
    viewOriginY: number,
    width: number,
    height: number
  ): void {
    const startX = Math.floor((viewOriginX - 40) / 16) * 16;
    const endX = viewOriginX + width + 60;
    const bottomY = viewOriginY + height + 300;
    const step = 16;

    // 1. Deep Earth Fill
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(startX, bottomY);
    for (let x = startX; x <= endX; x += step) {
      ctx.lineTo(x, getTerrainHeight(x));
    }
    ctx.lineTo(endX, bottomY);
    ctx.closePath();
    ctx.fill();

    // 2. Sub-surface Soil Layer
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x) + 10;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = endX; x >= startX; x -= step) {
      const y = getTerrainHeight(x) + 46 + Math.sin(x * 0.04) * 8;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Top Grass Ribbon (Dark green underside + bright green top crest)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 18;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x) + 5;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 11;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x);
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x) - 3;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private drawPickups(
    ctx: CanvasRenderingContext2D,
    pickups: PickupItem[],
    minX: number,
    maxX: number
  ): void {
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      if (p.collected || p.x < minX || p.x > maxX) continue;

      const bob = Math.sin(this.time * 4 + p.id * 0.7) * 4;
      ctx.save();
      ctx.translate(p.x, p.y + bob);

      if (p.type === 'coin') {
        const spinScaleX = 0.65 + Math.abs(Math.cos(this.time * 3.5 + p.id * 0.5)) * 0.35;
        ctx.scale(spinScaleX, 1);

        // Outer dark stroke
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();

        // Gold body
        ctx.fillStyle = p.value >= 25 ? '#f59e0b' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Inner rim
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Value label
        ctx.fillStyle = '#78350f';
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${p.value}`, 0, 0.5);
      } else if (p.type === 'fuel') {
        // Red Jerrycan Fuel Pickup
        ctx.rotate(Math.sin(this.time * 2.5 + p.id) * 0.08);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-16, -20, 32, 38, 6);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(-13, -17, 26, 32, 4);
        ctx.fill();

        // Handle cutout
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-7, -14, 14, 5);

        // Spout
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(6, -24, 6, 6);

        // Cross X emboss
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(7, 10);
        ctx.moveTo(7, -4);
        ctx.lineTo(-7, 10);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawCar(
    ctx: CanvasRenderingContext2D,
    car: CarState,
    spec: VehicleSpec,
    stats: EffectiveStats
  ): void {
    const cosA = Math.cos(car.angle);
    const sinA = Math.sin(car.angle);
    const halfBase = spec.wheelBase * 0.5;

    const rearMountX = car.x - cosA * halfBase - sinA * (spec.chassisHeight * 0.2);
    const rearMountY = car.y - sinA * halfBase + cosA * (spec.chassisHeight * 0.2);
    const frontMountX = car.x + cosA * halfBase - sinA * (spec.chassisHeight * 0.2);
    const frontMountY = car.y + sinA * halfBase + cosA * (spec.chassisHeight * 0.2);

    // 1. Suspension Struts & Coil-over Springs (connecting chassis mounts to wheel hubs)
    this.drawSuspensionStrut(
      ctx,
      rearMountX,
      rearMountY,
      car.rearWheel.worldX,
      car.rearWheel.worldY,
      spec.accentColor
    );
    this.drawSuspensionStrut(
      ctx,
      frontMountX,
      frontMountY,
      car.frontWheel.worldX,
      car.frontWheel.worldY,
      spec.accentColor
    );

    // 2. Chassis & Driver
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.scale(car.squashX, car.squashY);

    const w = spec.chassisWidth;
    const h = spec.chassisHeight;

    // Driver inside cockpit
    ctx.save();
    ctx.translate(-8, -h * 0.45);
    ctx.rotate(car.driverHeadLagAngle);

    // Torso
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-9, -4, 18, 18, 5);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -14, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -14, 11.5, 0, Math.PI * 2);
    ctx.fill();

    // Racing stripe on helmet
    ctx.fillStyle = spec.bodyColor;
    ctx.fillRect(-4, -25, 8, 5);

    // Visor
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.roundRect(2, -19, 10, 8, 3);
    ctx.fill();
    ctx.restore();

    // Roll Cage Bars
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.28, -h * 0.2);
    ctx.lineTo(-w * 0.16, -h * 0.95);
    ctx.lineTo(w * 0.15, -h * 0.95);
    ctx.lineTo(w * 0.3, -h * 0.2);
    ctx.stroke();

    // Vehicle Body Silhouette
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5 - 3, -h * 0.48 - 3, w + 6, h * 0.85 + 6, 12);
    ctx.fill();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : spec.bodyColor;
    ctx.beginPath();
    if (spec.bodyStyle === 'buggy') {
      ctx.moveTo(-w * 0.5, h * 0.25);
      ctx.lineTo(-w * 0.44, -h * 0.32);
      ctx.lineTo(w * 0.12, -h * 0.36);
      ctx.lineTo(w * 0.52, h * 0.05);
      ctx.lineTo(w * 0.48, h * 0.32);
      ctx.closePath();
    } else if (spec.bodyStyle === 'rover') {
      ctx.moveTo(-w * 0.52, h * 0.28);
      ctx.lineTo(-w * 0.42, -h * 0.38);
      ctx.lineTo(w * 0.18, -h * 0.42);
      ctx.lineTo(w * 0.54, h * 0.04);
      ctx.lineTo(w * 0.48, h * 0.32);
      ctx.closePath();
    } else {
      ctx.roundRect(-w * 0.5, -h * 0.45, w, h * 0.82, 9);
    }
    ctx.fill();

    // Accent racing stripe
    ctx.fillStyle = spec.accentColor;
    ctx.fillRect(-w * 0.46, -h * 0.12, w * 0.92, 7);

    // Headlight
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(w * 0.47, -h * 0.14, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Under-chassis skid plate
    ctx.fillStyle = spec.trimColor;
    ctx.fillRect(-w * 0.4, h * 0.25, w * 0.8, 6);

    ctx.restore();

    // 3. Rotating Front & Rear Wheels
    this.drawWheel(
      ctx,
      car.rearWheel.worldX,
      car.rearWheel.worldY,
      spec.wheelRadius,
      car.rearWheel.spinAngle,
      spec.accentColor
    );
    this.drawWheel(
      ctx,
      car.frontWheel.worldX,
      car.frontWheel.worldY,
      spec.wheelRadius,
      car.frontWheel.spinAngle,
      spec.accentColor
    );
  }

  private drawSuspensionStrut(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    coilColor: string
  ): void {
    // Inner damper piston rod
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Zig-zag coil spring around piston
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(8, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    ctx.strokeStyle = coilColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const coils = 5;
    ctx.moveTo(x1, y1);
    for (let i = 1; i <= coils; i++) {
      const t = (i - 0.5) / coils;
      const side = i % 2 === 0 ? 6.5 : -6.5;
      ctx.lineTo(x1 + dx * t + px * side, y1 + dy * t + py * side);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  private drawWheel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    spinAngle: number,
    rimAccent: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);

    // Tire outer tread notches
    ctx.fillStyle = '#0f172a';
    const lugs = 10;
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-3.5, -radius - 2.5, 7, 5);
      ctx.restore();
    }

    // Rubber tire wall
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Alloy Rim
    const rimRadius = radius * 0.56;
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, rimRadius, 0, Math.PI * 2);
    ctx.fill();

    // Rim Accent Ring
    ctx.strokeStyle = rimAccent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, rimRadius * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    // Spokes so wheel rotation is unmistakably visible
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rimRadius, Math.sin(a) * rimRadius);
      ctx.stroke();
    }

    // Center hub bolt
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      const t = this.floatingTexts[i];
      if (!t.active) continue;
      const alpha = 1 - Math.pow(t.life / t.maxLife, 1.6);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);
      ctx.font = '900 18px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }
}
