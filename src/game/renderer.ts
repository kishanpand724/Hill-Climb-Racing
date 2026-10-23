import {
  getDynamicWeather,
  getMapById,
  getSeasonBlendAtDistance,
  lerpHexColor,
} from './maps';
import {
  getCompositeTerrainHeight,
  getObstacleHeightOffset,
  getPlatformHeightAt,
  getTerrainHeight,
  hash1D,
} from './terrain';
import {
  CarState,
  EffectiveStats,
  FloatingText,
  MapId,
  Particle,
  PickupItem,
  SceneryProp,
  SecretPlatform,
  TerrainObstacle,
  VehicleCustomization,
  VehicleSpec,
} from './types';
import { PAINT_OPTIONS, RIM_OPTIONS } from './vehicles';

const PARTICLE_POOL_SIZE = 220;
const TEXT_POOL_SIZE = 28;
const SNOWFLAKE_COUNT = 85;
const RAINDROP_COUNT = 95;
const PETAL_COUNT = 36;

interface Snowflake {
  x: number;
  y: number;
  r: number;
  speedY: number;
  driftX: number;
  phase: number;
}

interface Raindrop {
  x: number;
  y: number;
  len: number;
  speedY: number;
  driftX: number;
}

interface BlossomPetal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftX: number;
  phase: number;
  color: string;
}

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
  private snowflakes: Snowflake[] = [];
  private raindrops: Raindrop[] = [];
  private petals: BlossomPetal[] = [];

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
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      this.snowflakes.push({
        x: (i * 37) % 1600,
        y: (i * 53) % 900,
        r: 1.8 + (i % 4) * 1.15,
        speedY: 45 + (i % 5) * 16,
        driftX: -25 - (i % 4) * 8,
        phase: i * 0.7,
      });
    }
    for (let i = 0; i < RAINDROP_COUNT; i++) {
      this.raindrops.push({
        x: (i * 41) % 1600,
        y: (i * 67) % 900,
        len: 15 + (i % 4) * 5,
        speedY: 560 + (i % 5) * 65,
        driftX: -105 - (i % 3) * 20,
      });
    }
    for (let i = 0; i < PETAL_COUNT; i++) {
      this.petals.push({
        x: (i * 47) % 1600,
        y: (i * 71) % 900,
        size: 3.2 + (i % 3) * 1.2,
        speedY: 28 + (i % 4) * 10,
        driftX: 22 + (i % 3) * 12,
        phase: i * 0.9,
        color: i % 2 === 0 ? '#f472b6' : '#fbcfe8',
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

  public spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1
  ): void {
    let adjustedY = y;
    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      const other = this.floatingTexts[i];
      if (
        other.active &&
        Math.abs(other.x - x) < 90 &&
        Math.abs(other.y - adjustedY) < 28
      ) {
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
    t.maxLife = 1.15;
    t.scale = scale;
  }

  public updateEffects(
    car: CarState,
    spec: VehicleSpec,
    mapId: MapId,
    isTitleMode: boolean,
    dt: number
  ): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);

    const mapSpec = getMapById(mapId);
    const weather = getDynamicWeather(mapId, car.distanceMeters, this.time);

    const lookAheadX = isTitleMode
      ? 90 + Math.sin(this.time * 0.6) * 28
      : Math.max(85, Math.min(260, 125 + car.vx * 0.25));
    const targetCamX = car.x + lookAheadX;
    const targetCamY = isTitleMode
      ? car.y - 75
      : car.y - 45 + Math.min(40, car.vy * 0.08);

    const smooth = 1 - Math.pow(0.0015, dt);
    this.cameraX += (targetCamX - this.cameraX) * smooth;
    this.cameraY += (targetCamY - this.cameraY) * smooth;

    if (!isTitleMode && !car.crashed && !car.outOfFuel) {
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);

      if (car.throttle !== 0 && Math.random() < 0.45) {
        const exhaustX = car.x - cosA * (spec.chassisWidth * 0.48);
        const exhaustY = car.y - sinA * (spec.chassisWidth * 0.48);
        this.spawnParticles(
          exhaustX,
          exhaustY,
          1,
          'smoke',
          'rgba(226, 232, 240, 0.52)',
          -cosA * 65,
          -35
        );
      }

      if (car.condition < 60 && Math.random() < (65 - car.condition) * 0.012) {
        const hoodX = car.x + cosA * (spec.chassisWidth * 0.34);
        const hoodY = car.y + sinA * (spec.chassisWidth * 0.34) - 10;
        const darkSmoke =
          car.condition < 30
            ? 'rgba(30, 41, 59, 0.78)'
            : 'rgba(100, 116, 139, 0.62)';
        this.spawnParticles(hoodX, hoodY, 1, 'smoke', darkSmoke, car.vx * 0.15, -55);
        if (car.condition < 35 && Math.random() < 0.28) {
          this.spawnParticles(hoodX, hoodY, 2, 'spark', '#fbbf24', car.vx * 0.2, -85);
        }
      }

      // Surface-specific wheel contact spray (dust, mud, water, snow, rock sparks)
      const wheels = [car.rearWheel, car.frontWheel];
      for (let w = 0; w < wheels.length; w++) {
        const wheel = wheels[w];
        if (
          wheel.grounded &&
          (Math.abs(car.throttle) > 0.18 || Math.abs(car.vx) > 90) &&
          Math.abs(car.vx) > 30 &&
          Math.random() < (w === 0 ? 0.72 : 0.42)
        ) {
          const obsKind = wheel.onObstacleKind;
          const isMud = obsKind === 'mud_pit';
          const isIce = obsKind === 'ice_slick';
          const isWet = weather.kind === 'rain' || weather.rainIntensity > 0.25;
          const isSnow =
            mapId === 'snow' ||
            weather.snowIntensity > 0.3 ||
            weather.seasonId === 'winter';
          const isDrySummer =
            mapId === 'desert' ||
            (mapId === 'seasons' && weather.seasonId === 'summer');

          let particleColor = mapSpec.dirtParticleColor;
          let particleKind: Particle['kind'] = 'dirt';

          if (isMud) {
            particleColor = '#451a03';
            particleKind = 'dirt';
          } else if (isWet) {
            particleColor = Math.random() > 0.35 ? '#38bdf8' : '#7dd3fc';
            particleKind = 'water';
          } else if (isIce || isSnow) {
            particleColor = '#f8fafc';
            particleKind = 'dirt';
          } else if (isDrySummer) {
            particleColor = Math.random() > 0.4 ? '#d97706' : '#fde047';
            particleKind = 'smoke';
          } else if (obsKind === 'small_rock' || obsKind === 'large_rock' || obsKind === 'rocky_step') {
            particleColor = '#94a3b8';
            particleKind = 'dirt';
          }

          this.spawnParticles(
            wheel.worldX - 6,
            wheel.worldY + spec.wheelRadius * 0.85,
            isMud || isWet ? 2 : 1,
            particleKind,
            particleColor,
            -car.vx * 0.35,
            -55
          );
        }
      }
    }

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      if (p.kind === 'dirt' || p.kind === 'spark' || p.kind === 'water') {
        p.vy += 460 * dt;
      } else if (p.kind === 'smoke') {
        p.vy -= 28 * dt;
        p.size += 11 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }

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

    if (mapSpec.hasSnowfall || weather.snowIntensity > 0.1) {
      for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
        const sf = this.snowflakes[i];
        sf.y += sf.speedY * dt;
        sf.x +=
          (sf.driftX +
            weather.windForce * 0.6 +
            Math.sin(this.time * 2 + sf.phase) * 18) *
          dt;
        if (sf.y > 1000) sf.y = -10;
        if (sf.x < -20) sf.x += 1640;
        if (sf.x > 1640) sf.x -= 1640;
      }
    }

    if (weather.rainIntensity > 0.1) {
      for (let i = 0; i < RAINDROP_COUNT; i++) {
        const rd = this.raindrops[i];
        rd.y += rd.speedY * dt;
        rd.x += (rd.driftX + weather.windForce * 1.2) * dt;
        if (rd.y > 1000) rd.y = -20;
        if (rd.x < -30) rd.x += 1660;
        if (rd.x > 1660) rd.x -= 1660;
      }
    }

    if (mapId === 'seasons' && weather.seasonId === 'spring') {
      for (let i = 0; i < PETAL_COUNT; i++) {
        const pt = this.petals[i];
        pt.y += pt.speedY * dt;
        pt.x += (pt.driftX + Math.sin(this.time * 1.8 + pt.phase) * 22) * dt;
        if (pt.y > 1000) pt.y = -12;
        if (pt.x < -20) pt.x += 1640;
        if (pt.x > 1640) pt.x -= 1640;
      }
    }
  }

  private getEnvironmentColors(mapId: MapId, distanceMeters: number) {
    const mapSpec = getMapById(mapId);
    if (mapId !== 'seasons') {
      return {
        skyTop: mapSpec.skyTop,
        skyMid: mapSpec.skyMid,
        skyBottom: mapSpec.skyBottom,
        sunColor: mapSpec.sunColor,
        mountainFar: mapSpec.mountainFar,
        mountainMid: mapSpec.mountainMid,
        mountainNear: mapSpec.mountainNear,
        groundDeep: mapSpec.groundDeep,
        groundSub: mapSpec.groundSub,
        surfaceShadow: mapSpec.surfaceShadow,
        surfaceMain: mapSpec.surfaceMain,
        surfaceHighlight: mapSpec.surfaceHighlight,
        sunbeamIntensity: mapId === 'hills' ? 0.35 : mapId === 'desert' ? 0.55 : 0.15,
        heatHazeIntensity: mapId === 'desert' ? 0.75 : 0,
        wetReflectivity: 0,
        snowAccumulation: mapId === 'snow' ? 1.0 : 0,
        seasonId: undefined as string | undefined,
      };
    }

    const { current, next, blend } = getSeasonBlendAtDistance(distanceMeters);
    return {
      skyTop: lerpHexColor(current.skyTop, next.skyTop, blend),
      skyMid: lerpHexColor(current.skyMid, next.skyMid, blend),
      skyBottom: lerpHexColor(current.skyBottom, next.skyBottom, blend),
      sunColor: lerpHexColor(current.sunColor, next.sunColor, blend),
      mountainFar: [
        lerpHexColor(current.mountainFar[0], next.mountainFar[0], blend),
        lerpHexColor(current.mountainFar[1], next.mountainFar[1], blend),
      ] as [string, string],
      mountainMid: [
        lerpHexColor(current.mountainMid[0], next.mountainMid[0], blend),
        lerpHexColor(current.mountainMid[1], next.mountainMid[1], blend),
      ] as [string, string],
      mountainNear: [
        lerpHexColor(current.mountainNear[0], next.mountainNear[0], blend),
        lerpHexColor(current.mountainNear[1], next.mountainNear[1], blend),
      ] as [string, string],
      groundDeep: lerpHexColor(current.groundDeep, next.groundDeep, blend),
      groundSub: lerpHexColor(current.groundSub, next.groundSub, blend),
      surfaceShadow: lerpHexColor(current.surfaceShadow, next.surfaceShadow, blend),
      surfaceMain: lerpHexColor(current.surfaceMain, next.surfaceMain, blend),
      surfaceHighlight: lerpHexColor(
        current.surfaceHighlight,
        next.surfaceHighlight,
        blend
      ),
      sunbeamIntensity:
        current.sunbeamIntensity +
        (next.sunbeamIntensity - current.sunbeamIntensity) * blend,
      heatHazeIntensity:
        current.heatHazeIntensity +
        (next.heatHazeIntensity - current.heatHazeIntensity) * blend,
      wetReflectivity:
        current.wetReflectivity +
        (next.wetReflectivity - current.wetReflectivity) * blend,
      snowAccumulation:
        current.snowAccumulation +
        (next.snowAccumulation - current.snowAccumulation) * blend,
      seasonId: current.id,
    };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    car: CarState,
    spec: VehicleSpec,
    stats: EffectiveStats,
    mapId: MapId,
    pickups: PickupItem[],
    scenery: SceneryProp[],
    isTitleMode: boolean,
    platforms: SecretPlatform[] = [],
    customization?: VehicleCustomization,
    obstacles: TerrainObstacle[] = []
  ): void {
    const mapSpec = getMapById(mapId);
    const weather = getDynamicWeather(mapId, car.distanceMeters, this.time);
    const envColors = this.getEnvironmentColors(mapId, car.distanceMeters);

    ctx.save();

    // 1. Environment Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, envColors.skyTop);
    skyGrad.addColorStop(0.55, envColors.skyMid);
    skyGrad.addColorStop(1, envColors.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant Lightning Bolt & Sky Illumination during Monsoon / Heavy Rain
    if (weather.rainIntensity > 0.5 && Math.sin(this.time * 5.3) > 0.955) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.24)';
      ctx.fillRect(0, 0, width, height);
      this.drawLightningBolt(ctx, width * 0.66, height * 0.06, height * 0.48);
    }

    // Sun & Atmospheric Corona
    const sunX = width * 0.78;
    const sunY = mapId === 'desert' ? height * 0.3 : height * 0.2;
    const sunRadius = mapId === 'desert' ? 46 : 35;

    if (weather.rainIntensity < 0.7) {
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 165);
      sunGlow.addColorStop(0, envColors.sunColor);
      sunGlow.addColorStop(0.38, 'rgba(253, 224, 71, 0.28)');
      sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 165, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = envColors.sunColor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crepuscular Sunbeams in Spring / Summer / Hills
    if (envColors.sunbeamIntensity > 0.1) {
      this.drawSunbeams(ctx, sunX, sunY, width, height, envColors.sunbeamIntensity);
    }

    // 2. Parallax Clouds
    this.drawClouds(ctx, width, height, mapId, weather.rainIntensity > 0.25);

    // 3. Layered Parallax Mountains / Dunes / Snow Peaks with Atmospheric Perspective
    this.drawMountainLayer(
      ctx,
      width,
      height,
      0.08,
      envColors.mountainFar[0],
      envColors.mountainFar[1],
      0.61,
      120,
      0.0022,
      envColors.snowAccumulation > 0.35 || mapId === 'snow'
    );
    this.drawMountainLayer(
      ctx,
      width,
      height,
      0.18,
      envColors.mountainMid[0],
      envColors.mountainMid[1],
      0.7,
      80,
      0.0035,
      envColors.snowAccumulation > 0.65
    );
    this.drawMountainLayer(
      ctx,
      width,
      height,
      0.32,
      envColors.mountainNear[0],
      envColors.mountainNear[1],
      0.78,
      48,
      0.0052,
      false
    );

    const shakeMag = this.trauma * this.trauma * 16;
    const shakeX = (Math.random() - 0.5) * 2 * shakeMag;
    const shakeY = (Math.random() - 0.5) * 2 * shakeMag;

    const maxLookAhead = isTitleMode ? 120 : Math.min(260, width * 0.22);
    const effectiveCamX = Math.min(this.cameraX, car.x + maxLookAhead);
    const carScreenFraction = isTitleMode ? 0.56 : width < 640 ? 0.44 : 0.34;

    const viewOriginX = effectiveCamX - width * carScreenFraction + shakeX;
    const viewOriginY =
      this.cameraY - height * (isTitleMode ? 0.62 : 0.56) + shakeY;

    ctx.translate(-viewOriginX, -viewOriginY);

    // 4. Roadside Scenery Behind Terrain Crest
    this.drawScenery(ctx, scenery, viewOriginX - 150, viewOriginX + width + 150);

    // 5. Continuous Hilly Terrain with Geological Strata & Seasonal Grass/Snow/Wet Details
    this.drawTerrain(ctx, viewOriginX, viewOriginY, width, height, mapId, envColors);

    // 5b. Surface Puddles & Ice Patches (from scenery)
    this.drawSurfacePatches(
      ctx,
      scenery,
      viewOriginX - 120,
      viewOriginX + width + 120,
      envColors.skyMid
    );

    // 5c. Physically Traversable Obstacles (drawn from exact collision geometry)
    this.drawObstacles(
      ctx,
      obstacles,
      mapId,
      viewOriginX - 200,
      viewOriginX + width + 200,
      envColors
    );

    // 5d. Elevated Secret Bridge Platforms
    this.drawPlatforms(ctx, platforms, viewOriginX - 180, viewOriginX + width + 180);

    // 6. Pickups (Coins, Fuel Cans, Treasure Crates)
    this.drawPickups(ctx, pickups, viewOriginX - 100, viewOriginX + width + 100);

    // 7. Player Vehicle + Ambient Occlusion Ground Shadow
    this.drawCarGroundShadow(ctx, car, spec, mapId, obstacles);
    this.drawCar(ctx, car, spec, customization);

    // 8. Pooled Particles
    this.drawParticles(ctx);

    // 9. Floating Score/Bonus Texts
    this.drawFloatingTexts(ctx);

    ctx.restore();

    // 10. Dynamic Weather & Seasonal Overlays (Spring Petals, Summer Heat Haze, Monsoon Rain, Winter Snow)
    if (mapId === 'seasons' && weather.seasonId === 'spring') {
      this.drawBlossomPetals(ctx, width, height);
    }
    if (envColors.heatHazeIntensity > 0.15) {
      this.drawHeatHaze(ctx, width, height, envColors.heatHazeIntensity);
    }
    if (mapSpec.hasSnowfall || weather.snowIntensity > 0.1) {
      this.drawSnowfall(ctx, width, height, Math.max(0.4, weather.snowIntensity));
    }
    if (weather.rainIntensity > 0.1) {
      this.drawRainfall(ctx, width, height, weather.rainIntensity);
    }
    if (weather.fogIntensity > 0.04) {
      this.drawFogOverlay(ctx, width, height, weather.fogIntensity);
    }

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

  private drawSunbeams(
    ctx: CanvasRenderingContext2D,
    sunX: number,
    sunY: number,
    width: number,
    height: number,
    intensity: number
  ): void {
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const angle = 2.05 + i * 0.18 + Math.sin(this.time * 0.4 + i) * 0.02;
      const rayLen = Math.max(width, height) * 0.95;
      const spread = 48 + i * 16;
      const grad = ctx.createLinearGradient(
        sunX,
        sunY,
        sunX + Math.cos(angle) * rayLen,
        sunY + Math.sin(angle) * rayLen
      );
      grad.addColorStop(0, `rgba(254, 249, 195, ${(0.11 * intensity).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(
        sunX + Math.cos(angle - 0.04) * rayLen,
        sunY + Math.sin(angle - 0.04) * rayLen + spread
      );
      ctx.lineTo(
        sunX + Math.cos(angle + 0.04) * rayLen,
        sunY + Math.sin(angle + 0.04) * rayLen - spread
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLightningBolt(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let cx = startX;
    let cy = startY;
    ctx.moveTo(cx, cy);
    const segments = 6;
    for (let i = 1; i <= segments; i++) {
      cx += (i % 2 === 0 ? 18 : -22) + Math.sin(this.time * 30 + i) * 6;
      cy += length / segments;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawBlossomPetals(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    ctx.save();
    for (let i = 0; i < PETAL_COUNT; i++) {
      const pt = this.petals[i];
      const sx = ((pt.x % width) + width) % width;
      const sy = ((pt.y % height) + height) % height;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.time * 2 + pt.phase);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.size * 1.3, pt.size * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawHeatHaze(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ): void {
    ctx.save();
    ctx.strokeStyle = `rgba(254, 240, 138, ${(0.12 * intensity).toFixed(3)})`;
    ctx.lineWidth = 2;
    for (let band = 0; band < 3; band++) {
      const baseY = height * (0.64 + band * 0.09);
      ctx.beginPath();
      for (let x = 0; x <= width; x += 28) {
        const y =
          baseY +
          Math.sin(x * 0.025 + this.time * 4.5 + band * 1.7) * 3.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSnowfall(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    density = 1
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
    const count = Math.floor(SNOWFLAKE_COUNT * Math.max(0.4, Math.min(1, density)));
    for (let i = 0; i < count; i++) {
      const sf = this.snowflakes[i];
      const sx = ((sf.x % width) + width) % width;
      const sy = ((sf.y % height) + height) % height;
      ctx.beginPath();
      ctx.arc(sx, sy, sf.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawRainfall(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ): void {
    ctx.save();
    ctx.strokeStyle = `rgba(186, 230, 253, ${(0.35 + intensity * 0.35).toFixed(2)})`;
    ctx.lineWidth = 1.8;
    const count = Math.floor(RAINDROP_COUNT * Math.max(0.45, intensity));
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const rd = this.raindrops[i];
      const sx = ((rd.x % width) + width) % width;
      const sy = ((rd.y % height) + height) % height;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 6, sy + rd.len);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawFogOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    density: number
  ): void {
    ctx.save();
    const fogGrad = ctx.createLinearGradient(0, height * 0.15, 0, height);
    fogGrad.addColorStop(0, `rgba(226, 232, 240, ${(density * 0.32).toFixed(3)})`);
    fogGrad.addColorStop(0.6, `rgba(203, 213, 225, ${(density * 0.58).toFixed(3)})`);
    fogGrad.addColorStop(1, `rgba(148, 163, 184, ${(density * 0.2).toFixed(3)})`);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private drawClouds(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mapId: MapId,
    isStormy: boolean
  ): void {
    ctx.fillStyle = isStormy
      ? 'rgba(71, 85, 105, 0.84)'
      : mapId === 'desert'
      ? 'rgba(254, 215, 170, 0.45)'
      : mapId === 'snow'
      ? 'rgba(226, 232, 240, 0.65)'
      : 'rgba(255, 255, 255, 0.84)';
    const cloudCount = 6;
    const span = width + 420;
    for (let i = 0; i < cloudCount; i++) {
      const rawX = i * 290 - this.cameraX * 0.06 + this.time * (8 + (i % 3) * 3);
      const cx = (((rawX % span) + span) % span) - 210;
      const cy = height * (0.11 + (i % 3) * 0.075);
      const scale = 0.78 + (i % 3) * 0.24;

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
    freq: number,
    hasSnowCaps = false
  ): void {
    const grad = ctx.createLinearGradient(0, height * 0.35, 0, height);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, height);
    const step = 28;
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

    // Subtle ridge snow highlight on high mountain peaks
    if (hasSnowCaps) {
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let sx = 0; sx <= width + step; sx += step) {
        const wx = sx + this.cameraX * parallax;
        const h =
          Math.sin(wx * freq) * amplitude +
          Math.cos(wx * freq * 2.1 + 1.7) * (amplitude * 0.45);
        const sy = height * baseHeightRatio + h;
        if (sx === 0) ctx.moveTo(sx, sy + 2);
        else ctx.lineTo(sx, sy + 2);
      }
      ctx.stroke();
    }
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
      if (s.kind === 'puddle' || s.kind === 'ice_patch') continue;

      ctx.save();
      ctx.translate(s.x, s.y);
      const sway = Math.sin(this.time * 1.8 + s.seed * 10) * 0.03;
      ctx.rotate(s.slope * 0.35 + sway);
      ctx.scale(s.scale, s.scale);

      if (s.kind === 'pine') {
        ctx.fillStyle = '#5c2d16';
        ctx.fillRect(-5, -24, 10, 28);
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
      } else if (s.kind === 'snow_pine') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(-5, -24, 10, 28);
        const tiers = ['#1e3a8a', '#0f766e', '#38bdf8'];
        for (let t = 0; t < 3; t++) {
          ctx.fillStyle = tiers[t];
          ctx.beginPath();
          const w = 34 - t * 6;
          const topY = -88 - t * 20;
          const botY = -22 - t * 24;
          ctx.moveTo(0, topY);
          ctx.lineTo(-w, botY);
          ctx.lineTo(w, botY);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(0, topY);
          ctx.lineTo(-w * 0.58, topY + (botY - topY) * 0.5);
          ctx.lineTo(w * 0.58, topY + (botY - topY) * 0.5);
          ctx.closePath();
          ctx.fill();
        }
      } else if (s.kind === 'blossom_tree') {
        ctx.fillStyle = '#5c2d16';
        ctx.fillRect(-6, -38, 12, 42);
        ctx.fillStyle = '#db2777';
        ctx.beginPath();
        ctx.arc(0, -60, 28, 0, Math.PI * 2);
        ctx.arc(-20, -46, 22, 0, Math.PI * 2);
        ctx.arc(20, -46, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(0, -62, 24, 0, Math.PI * 2);
        ctx.arc(-16, -48, 18, 0, Math.PI * 2);
        ctx.arc(16, -48, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(-6, -66, 15, 0, Math.PI * 2);
        ctx.arc(10, -54, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'flower') {
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(0, -16);
        ctx.moveTo(-8, 2);
        ctx.lineTo(-10, -12);
        ctx.stroke();

        ctx.fillStyle = s.seed > 0.5 ? '#f43f5e' : '#facc15';
        ctx.beginPath();
        ctx.arc(0, -18, 6, 0, Math.PI * 2);
        ctx.arc(-10, -14, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -18, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'cactus') {
        ctx.fillStyle = '#15803d';
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-8, -86, 16, 90, 8);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(-26, -62, 18, 10, 5);
        ctx.roundRect(-26, -80, 10, 26, 5);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(8, -50, 18, 10, 5);
        ctx.roundRect(16, -70, 10, 28, 5);
        ctx.fill();
        ctx.stroke();
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
      } else if (
        s.kind === 'rock' ||
        s.kind === 'dune_rock' ||
        s.kind === 'ice_rock'
      ) {
        ctx.fillStyle =
          s.kind === 'dune_rock'
            ? '#b45309'
            : s.kind === 'ice_rock'
            ? '#93c5fd'
            : '#64748b';
        ctx.beginPath();
        ctx.moveTo(-18, 4);
        ctx.lineTo(-12, -14);
        ctx.lineTo(4, -18);
        ctx.lineTo(18, -6);
        ctx.lineTo(20, 4);
        ctx.closePath();
        ctx.fill();
      } else if (s.kind === 'signpost' && s.milestoneMeters) {
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

  private drawSurfacePatches(
    ctx: CanvasRenderingContext2D,
    scenery: SceneryProp[],
    minX: number,
    maxX: number,
    skyReflectionColor: string
  ): void {
    for (let i = 0; i < scenery.length; i++) {
      const s = scenery[i];
      if (s.x < minX || s.x > maxX) continue;
      if (s.kind !== 'puddle' && s.kind !== 'ice_patch') continue;

      ctx.save();
      ctx.translate(s.x, s.y - 2);
      ctx.rotate(s.slope);
      ctx.scale(s.scale, 1);

      if (s.kind === 'puddle') {
        ctx.fillStyle = 'rgba(14, 165, 233, 0.78)';
        ctx.strokeStyle = skyReflectionColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Specular sky reflection glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(-6, -1, 14, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'ice_patch') {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.82)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 34, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Draws all physical obstacles directly from their exact collision contour (`getObstacleHeightOffset`),
   * guaranteeing 1-to-1 visual and physics alignment with zero terrain gaps.
   */
  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    obstacles: TerrainObstacle[],
    mapId: MapId,
    minX: number,
    maxX: number,
    envColors: {
      wetReflectivity: number;
      snowAccumulation: number;
      seasonId?: string;
    }
  ): void {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const halfW = obs.width * 0.5;
      const startX = obs.currentX - halfW;
      const endX = obs.currentX + halfW;
      if (endX < minX || startX > maxX) continue;

      ctx.save();

      // Sample exact collision surface points across the obstacle
      const samples = 24;
      const topPoints: { x: number; y: number; baseY: number; u: number }[] = [];
      for (let s = 0; s <= samples; s++) {
        const u = s / samples;
        const x = startX + obs.width * u;
        const baseY = getTerrainHeight(x, mapId);
        const offset = getObstacleHeightOffset(obs, x);
        topPoints.push({ x, y: baseY - offset, baseY, u });
      }

      // Ground Ambient Occlusion shadow underneath solid obstacles
      if (obs.kind !== 'mud_pit' && obs.kind !== 'ice_slick') {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let s = 0; s <= samples; s++) {
          const pt = topPoints[s];
          if (s === 0) ctx.moveTo(pt.x, pt.baseY + 3);
          else ctx.lineTo(pt.x, pt.baseY + 3);
        }
        ctx.stroke();
      }

      if (
        obs.kind === 'small_rock' ||
        obs.kind === 'large_rock' ||
        obs.kind === 'rocky_step'
      ) {
        const isDesertStyle =
          mapId === 'desert' ||
          (mapId === 'seasons' && envColors.seasonId === 'summer');
        const isSnowStyle =
          mapId === 'snow' || envColors.snowAccumulation > 0.45;

        const rockBaseColor = isDesertStyle
          ? '#9a3412'
          : isSnowStyle
          ? '#475569'
          : '#334155';
        const rockMidColor = isDesertStyle
          ? '#c2410c'
          : isSnowStyle
          ? '#64748b'
          : '#475569';
        const rockHighlight = isSnowStyle
          ? '#f8fafc'
          : envColors.wetReflectivity > 0.5
          ? '#99f6e4'
          : isDesertStyle
          ? '#fdba74'
          : '#94a3b8';

        // Main solid rock polygon flush with base terrain
        ctx.fillStyle = rockBaseColor;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].baseY + 12);
        for (let s = 0; s <= samples; s++) {
          ctx.lineTo(topPoints[s].x, topPoints[s].y);
        }
        for (let s = samples; s >= 0; s--) {
          ctx.lineTo(topPoints[s].x, topPoints[s].baseY + 12);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner sunlit rock facet band
        ctx.fillStyle = rockMidColor;
        ctx.beginPath();
        ctx.moveTo(topPoints[1].x, topPoints[1].baseY + 4);
        for (let s = 1; s < samples; s++) {
          ctx.lineTo(topPoints[s].x, topPoints[s].y + 3);
        }
        for (let s = samples - 1; s >= 1; s--) {
          ctx.lineTo(topPoints[s].x, topPoints[s].baseY + 4);
        }
        ctx.closePath();
        ctx.fill();

        // Top bevel highlight / snow cap / wet sheen along exact collision contour
        ctx.strokeStyle = rockHighlight;
        ctx.lineWidth = isSnowStyle ? 5 : 3.5;
        ctx.beginPath();
        for (let s = 2; s <= samples - 2; s++) {
          const pt = topPoints[s];
          if (s === 2) ctx.moveTo(pt.x, pt.y + 1.5);
          else ctx.lineTo(pt.x, pt.y + 1.5);
        }
        ctx.stroke();

        // Internal rock fracture lines
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const midPt = topPoints[Math.floor(samples * 0.48)];
        ctx.moveTo(midPt.x - 10, midPt.y + 6);
        ctx.lineTo(midPt.x + 6, (midPt.y + midPt.baseY) * 0.5);
        ctx.lineTo(midPt.x - 4, midPt.baseY + 2);
        ctx.stroke();
      } else if (obs.kind === 'fallen_log') {
        // Cylindrical fallen tree trunk with bark texture & end grain rings
        ctx.fillStyle = '#451a03';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].baseY + 10);
        for (let s = 0; s <= samples; s++) {
          ctx.lineTo(topPoints[s].x, topPoints[s].y);
        }
        for (let s = samples; s >= 0; s--) {
          ctx.lineTo(topPoints[s].x, topPoints[s].baseY + 10);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bark highlight ridge
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let s = 3; s <= samples - 3; s++) {
          const pt = topPoints[s];
          if (s === 3) ctx.moveTo(pt.x, pt.y + 4);
          else ctx.lineTo(pt.x, pt.y + 4);
        }
        ctx.stroke();

        // Cut wood cross-section with growth rings on the side face
        const centerPt = topPoints[Math.floor(samples * 0.5)];
        const logRadius = Math.max(8, obs.height * 0.44);
        const ringCenterY = centerPt.y + logRadius + 2;
        ctx.fillStyle = '#d97706';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(centerPt.x, ringCenterY, logRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerPt.x, ringCenterY, logRadius * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      } else if (obs.kind === 'steep_ramp') {
        // Reinforced timber/stone launch ramp
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].baseY + 10);
        for (let s = 0; s <= samples; s++) {
          ctx.lineTo(topPoints[s].x, topPoints[s].y);
        }
        for (let s = samples; s >= 0; s--) {
          ctx.lineTo(topPoints[s].x, topPoints[s].baseY + 10);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Support truss struts
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3.5;
        for (let s = 4; s <= samples - 4; s += 4) {
          const pt = topPoints[s];
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y + 3);
          ctx.lineTo(pt.x, pt.baseY + 8);
          ctx.stroke();
        }

        // High-grip yellow launch deck surface
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let s = 1; s <= Math.floor(samples * 0.85); s++) {
          const pt = topPoints[s];
          if (s === 1) ctx.moveTo(pt.x, pt.y + 1.5);
          else ctx.lineTo(pt.x, pt.y + 1.5);
        }
        ctx.stroke();
      } else if (obs.kind === 'bump_mogul') {
        // Washboard mogul sequence
        ctx.fillStyle = '#57534e';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].baseY + 10);
        for (let s = 0; s <= samples; s++) {
          ctx.lineTo(topPoints[s].x, topPoints[s].y);
        }
        for (let s = samples; s >= 0; s--) {
          ctx.lineTo(topPoints[s].x, topPoints[s].baseY + 10);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let s = 1; s < samples; s++) {
          const pt = topPoints[s];
          if (s === 1) ctx.moveTo(pt.x, pt.y + 1.5);
          else ctx.lineTo(pt.x, pt.y + 1.5);
        }
        ctx.stroke();
      } else if (obs.kind === 'broken_bridge') {
        // Timber trestle bridge with weathered planks
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 6;
        for (let s = 3; s <= samples - 3; s += 6) {
          const pt = topPoints[s];
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y + 4);
          ctx.lineTo(pt.x, pt.baseY + 16);
          ctx.stroke();
        }

        // Individual wooden deck planks along the exact collision profile
        for (let s = 0; s < samples; s++) {
          const p1 = topPoints[s];
          const p2 = topPoints[s + 1];
          ctx.strokeStyle = s % 2 === 0 ? '#92400e' : '#b45309';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y + 2);
          ctx.lineTo(p2.x, p2.y + 2);
          ctx.stroke();
        }
      } else if (obs.kind === 'moving_platform') {
        // Kinetic moving platform with contour-following guide track
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 5;
        ctx.beginPath();
        const railSteps = 8;
        const railStart = obs.x - obs.width * 0.62;
        const railEnd = obs.x + obs.width * 0.62;
        for (let r = 0; r <= railSteps; r++) {
          const rx = railStart + ((railEnd - railStart) * r) / railSteps;
          const ry = getTerrainHeight(rx, mapId) + 4;
          if (r === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].baseY + 6);
        for (let s = 0; s <= samples; s++) {
          ctx.lineTo(topPoints[s].x, topPoints[s].y);
        }
        for (let s = samples; s >= 0; s--) {
          ctx.lineTo(topPoints[s].x, topPoints[s].baseY + 6);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        for (let s = 2; s <= samples - 2; s++) {
          const pt = topPoints[s];
          if (s === 2) ctx.moveTo(pt.x, pt.y + 1.5);
          else ctx.lineTo(pt.x, pt.y + 1.5);
        }
        ctx.stroke();
      } else if (obs.kind === 'mud_pit') {
        // Deep glossy mud patch
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let s = 0; s <= samples; s++) {
          const pt = topPoints[s];
          if (s === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(180, 83, 9, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let s = 3; s <= samples - 3; s++) {
          const pt = topPoints[s];
          if (s === 3) ctx.moveTo(pt.x, pt.y - 1.5);
          else ctx.lineTo(pt.x, pt.y - 1.5);
        }
        ctx.stroke();
      } else if (obs.kind === 'ice_slick') {
        // Crystalline slippery ice sheet
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let s = 0; s <= samples; s++) {
          const pt = topPoints[s];
          if (s === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let s = 2; s <= samples - 2; s++) {
          const pt = topPoints[s];
          if (s === 2) ctx.moveTo(pt.x, pt.y - 2);
          else ctx.lineTo(pt.x, pt.y - 2);
        }
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawPlatforms(
    ctx: CanvasRenderingContext2D,
    platforms: SecretPlatform[],
    minX: number,
    maxX: number
  ): void {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p.endX < minX || p.startX > maxX) continue;

      ctx.save();

      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 8;
      const pillarPositions = [0.18, 0.5, 0.82];
      for (const t of pillarPositions) {
        const px = p.startX + (p.endX - p.startX) * t;
        const py = getPlatformHeightAt(p, px);
        ctx.beginPath();
        ctx.moveTo(px, py + 4);
        ctx.lineTo(px, py + 135);
        ctx.stroke();
      }

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const steps = 16;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = p.startX + (p.endX - p.startX) * t;
        const y = getPlatformHeightAt(p, x);
        if (s === 0) ctx.moveTo(x, y + 3);
        else ctx.lineTo(x, y + 3);
      }
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = p.startX + (p.endX - p.startX) * t;
        const y = getPlatformHeightAt(p, x);
        if (s === 0) ctx.moveTo(x, y - 2);
        else ctx.lineTo(x, y - 2);
      }
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.startX - 36, p.startY - 46, 76, 22, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = '800 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SECRET ROUTE', p.startX + 2, p.startY - 35);

      ctx.restore();
    }
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    viewOriginX: number,
    viewOriginY: number,
    width: number,
    height: number,
    mapId: MapId,
    envColors: {
      groundDeep: string;
      groundSub: string;
      surfaceShadow: string;
      surfaceMain: string;
      surfaceHighlight: string;
      wetReflectivity: number;
      snowAccumulation: number;
      seasonId?: string;
    }
  ): void {
    const startX = Math.floor((viewOriginX - 40) / 14) * 14;
    const endX = viewOriginX + width + 60;
    const bottomY = viewOriginY + height + 320;
    const step = 14;

    // 1. Deep geological earth fill
    ctx.fillStyle = envColors.groundDeep;
    ctx.beginPath();
    ctx.moveTo(startX, bottomY);
    for (let x = startX; x <= endX; x += step) {
      ctx.lineTo(x, getTerrainHeight(x, mapId));
    }
    ctx.lineTo(endX, bottomY);
    ctx.closePath();
    ctx.fill();

    // 2. Sub-surface soil stratum
    ctx.fillStyle = envColors.groundSub;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x, mapId) + 10;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = endX; x >= startX; x -= step) {
      const y =
        getTerrainHeight(x, mapId) +
        52 +
        Math.sin(x * 0.035) * 10 +
        Math.cos(x * 0.08) * 5;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Ambient Occlusion shadow band directly beneath top surface crust
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x, mapId) + 8;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 4. Surface shadow border
    ctx.strokeStyle = envColors.surfaceShadow;
    ctx.lineWidth = 18;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x, mapId) + 5;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 5. Main top road/turf crust
    ctx.strokeStyle = envColors.surfaceMain;
    ctx.lineWidth = 11;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x, mapId);
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 6. Top specular rim highlight (or wet monsoon sheen)
    ctx.strokeStyle =
      envColors.wetReflectivity > 0.5 ? '#99f6e4' : envColors.surfaceHighlight;
    ctx.lineWidth = envColors.wetReflectivity > 0.5 ? 5 : 4;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const y = getTerrainHeight(x, mapId) - 3;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 7. Procedural grass blades / dry tufts / snowbank drifts along terrain crest
    const isGrassy =
      mapId === 'hills' ||
      (mapId === 'seasons' &&
        (envColors.seasonId === 'spring' || envColors.seasonId === 'summer'));
    const isSnowy = mapId === 'snow' || envColors.snowAccumulation > 0.5;

    if (isGrassy) {
      ctx.strokeStyle =
        envColors.seasonId === 'summer' ? '#eab308' : '#16a34a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += 28) {
        const y = getTerrainHeight(x, mapId) - 4;
        const sway = Math.sin(this.time * 2.4 + x * 0.05) * 3;
        ctx.moveTo(x, y);
        ctx.lineTo(x + sway, y - 8 - (Math.abs(Math.sin(x)) * 4));
      }
      ctx.stroke();
    } else if (isSnowy) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      for (let x = startX; x <= endX; x += 56) {
        const y = getTerrainHeight(x, mapId) - 3;
        const driftW = 18 + hash1D(x) * 14;
        ctx.beginPath();
        ctx.ellipse(x, y, driftW, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
        const spinScaleX =
          0.65 + Math.abs(Math.cos(this.time * 3.5 + p.id * 0.5)) * 0.35;
        ctx.scale(spinScaleX, 1);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.value >= 25 ? '#f59e0b' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${p.value}`, 0, 0.5);
      } else if (p.type === 'treasure') {
        const pulse = 1 + Math.sin(this.time * 5 + p.id) * 0.06;
        ctx.scale(pulse, pulse);

        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#451a03';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-18, -15, 36, 28, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d97706';
        ctx.fillRect(-15, -4, 30, 14);

        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-4, -7, 8, 9);

        ctx.fillStyle = '#fde047';
        ctx.font = '900 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+150', 0, -21);
      } else if (p.type === 'fuel') {
        ctx.rotate(Math.sin(this.time * 2.5 + p.id) * 0.08);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-16, -20, 32, 38, 6);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(-13, -17, 26, 32, 4);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-7, -14, 14, 5);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(6, -24, 6, 6);

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

  private drawCarGroundShadow(
    ctx: CanvasRenderingContext2D,
    car: CarState,
    spec: VehicleSpec,
    mapId: MapId,
    obstacles: TerrainObstacle[]
  ): void {
    const surf = getCompositeTerrainHeight(car.x, mapId, obstacles);
    const heightAboveGround = Math.max(0, surf.y - car.y);
    const alpha = Math.max(0.08, Math.min(0.46, 0.48 - heightAboveGround * 0.0022));
    const shadowScale = Math.max(0.45, Math.min(1.05, 1.0 - heightAboveGround * 0.0025));

    ctx.save();
    ctx.translate(car.x, surf.y + 2);
    ctx.fillStyle = `rgba(15, 23, 42, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, spec.chassisWidth * 0.54 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public drawCar(
    ctx: CanvasRenderingContext2D,
    car: CarState,
    spec: VehicleSpec,
    customization?: VehicleCustomization
  ): void {
    const paintOpt = customization
      ? PAINT_OPTIONS.find((p) => p.id === customization.paintId)
      : undefined;
    const rimOpt = customization
      ? RIM_OPTIONS.find((r) => r.id === customization.rimId)
      : undefined;

    const bodyColor =
      paintOpt && paintOpt.id !== 'stock' && paintOpt.primaryColor
        ? paintOpt.primaryColor
        : spec.bodyColor;
    const accentColor =
      paintOpt && paintOpt.id !== 'stock' && paintOpt.secondaryColor
        ? paintOpt.secondaryColor
        : spec.accentColor;
    const rimColor =
      rimOpt && rimOpt.secondaryColor ? rimOpt.secondaryColor : accentColor;
    const skinId = customization?.skinId ?? 'stock';

    const cosA = Math.cos(car.angle);
    const sinA = Math.sin(car.angle);
    const halfBase = spec.wheelBase * 0.5;

    const rearMountX =
      car.x - cosA * halfBase - sinA * (spec.chassisHeight * 0.2);
    const rearMountY =
      car.y - sinA * halfBase + cosA * (spec.chassisHeight * 0.2);
    const frontMountX =
      car.x + cosA * halfBase - sinA * (spec.chassisHeight * 0.2);
    const frontMountY =
      car.y + sinA * halfBase + cosA * (spec.chassisHeight * 0.2);

    this.drawSuspensionStrut(
      ctx,
      rearMountX,
      rearMountY,
      car.rearWheel.worldX,
      car.rearWheel.worldY,
      accentColor
    );
    this.drawSuspensionStrut(
      ctx,
      frontMountX,
      frontMountY,
      car.frontWheel.worldX,
      car.frontWheel.worldY,
      accentColor
    );

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.scale(car.squashX, car.squashY);

    const w = spec.chassisWidth;
    const h = spec.chassisHeight;

    // Driver figure with helmet & visor reflection
    ctx.save();
    const driverOffsetY =
      spec.bodyStyle === 'sports'
        ? -h * 0.42
        : spec.bodyStyle === 'monster'
        ? -h * 0.54
        : -h * 0.46;
    ctx.translate(-8, driverOffsetY);
    ctx.rotate(car.driverHeadLagAngle);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-9, -4, 18, 18, 5);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -14, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -14, 11.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-4, -25, 8, 5);

    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.roundRect(2, -19, 10, 8, 3);
    ctx.fill();
    ctx.restore();

    if (spec.bodyStyle === 'monster') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-w * 0.28, -h * 0.95, 7, h * 0.55);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-w * 0.36, -h * 0.3);
      ctx.lineTo(-w * 0.22, -h * 0.96);
      ctx.lineTo(w * 0.16, -h * 0.96);
      ctx.lineTo(w * 0.3, -h * 0.3);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.fillRect(-w * 0.14, -h * 1.04, 22, 6);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-w * 0.5 - 3, -h * 0.54 - 3, w + 6, h * 0.88 + 6, 11);
      ctx.fill();

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : bodyColor;
      ctx.beginPath();
      ctx.roundRect(-w * 0.5, -h * 0.52, w, h * 0.84, 9);
      ctx.fill();

      // Upper metallic highlight strip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(-w * 0.46, -h * 0.46, w * 0.92, 6);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-w * 0.34, h * 0.28, 22, Math.PI, 0);
      ctx.arc(w * 0.34, h * 0.28, 22, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.fillRect(-w * 0.46, -h * 0.15, w * 0.92, 9);
    } else if (spec.bodyStyle === 'jeep') {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-w * 0.42, -h * 0.25);
      ctx.lineTo(-w * 0.36, -h * 0.98);
      ctx.lineTo(w * 0.22, -h * 0.98);
      ctx.lineTo(w * 0.34, -h * 0.25);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-w * 0.52, -h * 0.1, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-w * 0.5 - 3, -h * 0.52 - 3, w + 6, h * 0.9 + 6, 10);
      ctx.fill();

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : bodyColor;
      ctx.beginPath();
      ctx.roundRect(-w * 0.5, -h * 0.5, w, h * 0.86, 8);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(-w * 0.46, -h * 0.44, w * 0.88, 6);

      ctx.fillStyle = '#334155';
      ctx.fillRect(w * 0.46, -h * 0.35, 9, h * 0.65);

      ctx.fillStyle = accentColor;
      ctx.fillRect(-w * 0.46, -h * 0.12, w * 0.88, 8);
    } else if (spec.bodyStyle === 'sports') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-w * 0.48, -h * 0.2);
      ctx.lineTo(-w * 0.56, -h * 0.85);
      ctx.lineTo(-w * 0.38, -h * 0.85);
      ctx.lineTo(-w * 0.36, -h * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.fillRect(-w * 0.6, -h * 0.95, 26, 7);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.22, -h * 0.3);
      ctx.lineTo(-w * 0.04, -h * 0.92);
      ctx.lineTo(w * 0.28, -h * 0.3);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-w * 0.52, h * 0.34);
      ctx.lineTo(-w * 0.48, -h * 0.42);
      ctx.lineTo(w * 0.14, -h * 0.46);
      ctx.lineTo(w * 0.55, h * 0.08);
      ctx.lineTo(w * 0.52, h * 0.34);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : bodyColor;
      ctx.beginPath();
      ctx.moveTo(-w * 0.49, h * 0.28);
      ctx.lineTo(-w * 0.45, -h * 0.35);
      ctx.lineTo(w * 0.12, -h * 0.39);
      ctx.lineTo(w * 0.51, h * 0.08);
      ctx.lineTo(w * 0.48, h * 0.28);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.fillRect(-w * 0.44, -h * 0.06, w * 0.86, 6);
    } else {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, -h * 0.2);
      ctx.lineTo(-w * 0.16, -h * 0.95);
      ctx.lineTo(w * 0.15, -h * 0.95);
      ctx.lineTo(w * 0.3, -h * 0.2);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-w * 0.5 - 3, -h * 0.48 - 3, w + 6, h * 0.85 + 6, 12);
      ctx.fill();

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : bodyColor;
      ctx.beginPath();
      ctx.roundRect(-w * 0.5, -h * 0.45, w, h * 0.82, 9);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(-w * 0.45, -h * 0.4, w * 0.9, 5);

      ctx.fillStyle = accentColor;
      ctx.fillRect(-w * 0.46, -h * 0.12, w * 0.92, 7);
    }

    if (skinId === 'stripes') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w * 0.44, -h * 0.26, w * 0.88, 4);
      ctx.fillRect(-w * 0.44, -h * 0.16, w * 0.88, 4);
    } else if (skinId === 'flames') {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(w * 0.44, -h * 0.22);
      ctx.lineTo(w * 0.05, -h * 0.3);
      ctx.lineTo(w * 0.18, -h * 0.1);
      ctx.lineTo(-w * 0.15, -h * 0.02);
      ctx.lineTo(w * 0.44, h * 0.12);
      ctx.closePath();
      ctx.fill();
    } else if (skinId === 'carbon') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
      ctx.fillRect(-w * 0.42, -h * 0.34, w * 0.84, 8);
    }

    if (car.condition < 80) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, -h * 0.28);
      ctx.lineTo(-w * 0.12, -h * 0.05);
      ctx.moveTo(w * 0.1, -h * 0.25);
      ctx.lineTo(w * 0.28, -h * 0.08);
      if (car.condition < 50) {
        ctx.moveTo(-w * 0.36, h * 0.02);
        ctx.lineTo(-w * 0.15, h * 0.18);
        ctx.moveTo(w * 0.18, -h * 0.32);
        ctx.lineTo(w * 0.38, -h * 0.18);
      }
      ctx.stroke();
    }

    // Headlight & Taillight (glows when braking)
    ctx.fillStyle = car.condition < 35 ? '#94a3b8' : '#fef08a';
    ctx.beginPath();
    ctx.arc(w * 0.46, -h * 0.1, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = car.braking ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(-w * 0.47, -h * 0.1, car.braking ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = spec.trimColor;
    ctx.fillRect(-w * 0.4, h * 0.24, w * 0.8, 6);

    ctx.restore();

    this.drawWheel(
      ctx,
      car.rearWheel.worldX,
      car.rearWheel.worldY,
      spec.wheelRadius,
      car.rearWheel.spinAngle,
      rimColor
    );
    this.drawWheel(
      ctx,
      car.frontWheel.worldX,
      car.frontWheel.worldY,
      spec.wheelRadius,
      car.frontWheel.spinAngle,
      rimColor
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
    // Inner chrome damper piston rod
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Upper shock body cylinder
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(8, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + dx * 0.45, y1 + dy * 0.45);
    ctx.stroke();

    // Helical coil spring
    ctx.strokeStyle = coilColor;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    const coils = 5;
    ctx.moveTo(x1, y1);
    for (let i = 1; i <= coils; i++) {
      const t = (i - 0.5) / coils;
      const side = i % 2 === 0 ? 7.2 : -7.2;
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

    ctx.fillStyle = '#0f172a';
    const lugs = radius >= 32 ? 12 : 10;
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-4.2, -radius - 3.2, 8.4, 6.4);
      ctx.restore();
    }

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tire sidewall highlight ring
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();

    const rimRadius = radius * 0.56;
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, rimRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = rimAccent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rimRadius * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rimRadius, Math.sin(a) * rimRadius);
      ctx.stroke();
    }

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

export function renderGarageVehiclePreview(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spec: VehicleSpec,
  stats: EffectiveStats,
  time: number,
  condition = 100,
  customization?: VehicleCustomization
): void {
  ctx.clearRect(0, 0, width, height);

  const floorY = height * 0.85;
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(width * 0.14, floorY, width * 0.72, 14, 7);
  ctx.fill();
  ctx.stroke();

  const bounce = Math.sin(time * 3.2) * 3.0;
  const pitch = Math.sin(time * 1.6) * 0.025;
  const halfBase = spec.wheelBase * 0.5;
  const wheelY = floorY - spec.wheelRadius;
  const chassisY =
    wheelY -
    spec.chassisHeight * 0.24 -
    stats.suspensionRestLength * 0.65 +
    bounce;

  const dummyCar: CarState = {
    x: width * 0.5,
    y: chassisY,
    vx: 0,
    vy: 0,
    angle: pitch,
    angularVel: 0,
    rearWheel: {
      worldX: width * 0.5 - halfBase,
      worldY: wheelY,
      groundY: floorY,
      compression: 8,
      prevCompression: 8,
      grounded: true,
      spinAngle: time * 2.2,
      angularVel: 2.2,
    },
    frontWheel: {
      worldX: width * 0.5 + halfBase,
      worldY: wheelY,
      groundY: floorY,
      compression: 8,
      prevCompression: 8,
      grounded: true,
      spinAngle: time * 2.2,
      angularVel: 2.2,
    },
    fuel: 100,
    maxFuel: 100,
    condition,
    distanceMeters: 0,
    maxDistanceMeters: 0,
    runCoins: 0,
    pickupCoins: 0,
    flipBonusCoins: 0,
    flipsCount: 0,
    longJumpsCount: 0,
    stuntCombo: 0,
    maxStuntCombo: 0,
    treasuresFound: 0,
    rpm: 1100,
    airTimeSeconds: 0,
    airStartX: 0,
    accumulatedAirAngle: 0,
    wasGrounded: true,
    onSecretRoute: false,
    upsideDownTimer: 0,
    outOfFuelTimer: 0,
    crashed: false,
    outOfFuel: false,
    gameOverReason: 'none',
    driverHeadLagAngle: Math.sin(time * 2.5) * 0.06,
    driverHeadLagVel: 0,
    squashX: 1,
    squashY: 1,
    throttle: 0,
    braking: false,
  };

  const previewRenderer = new GameRenderer();
  ctx.save();
  ctx.translate(width * 0.5, floorY);
  ctx.scale(1.02, 1.02);
  ctx.translate(-width * 0.5, -floorY);
  previewRenderer.drawCar(ctx, dummyCar, spec, customization);
  ctx.restore();
}
