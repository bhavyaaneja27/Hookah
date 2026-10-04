import type { Particle } from '../types/hookah';

export class VapourParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 140; // Ample pool to support central plume + wide atmospheric scatter
  private frameCount = 0;

  /**
   * Emit realistic hookah smoke that flows from the mouth and scatters
   * broadly around the face, cheeks, shoulders, and surrounding air.
   */
  emit(x: number, y: number, _requestedCount: number = 3, faceW: number = 160) {
    this.frameCount++;
    // Emit continuously every frame for rich, smooth volumetric smoke
    if (this.frameCount % 2 !== 0) return;

    const scale = Math.max(0.6, Math.min(2.0, faceW / 160));

    // Spawn 3 complementary particle types per burst:
    // 1. Central rising billow
    // 2. Left-curling scatter cloud (drifts around left cheek/shoulder)
    // 3. Right-curling scatter cloud (drifts around right cheek/shoulder)

    // Type 1: Central Plume
    this.spawnParticle(
      x + (Math.random() - 0.5) * 10 * scale,
      y,
      -Math.PI / 2 + (Math.random() - 0.5) * 0.5, // -90° ± 15° (Upward)
      (2.8 + Math.random() * 2.2) * scale,
      (16 + Math.random() * 8) * scale,
      1.1 * scale, // Expansion rate
      0.13 + Math.random() * 0.03,
      80 + Math.random() * 30,
      0 // Center
    );

    // Type 2: Left Curl / Scatter (flows around face to the left)
    const leftAngle = -Math.PI / 2 - (0.35 + Math.random() * 0.55); // -110° to -145° (Left-Up)
    this.spawnParticle(
      x - (Math.random() * 8 * scale),
      y + (Math.random() - 0.5) * 6,
      leftAngle,
      (2.2 + Math.random() * 2.0) * scale,
      (20 + Math.random() * 12) * scale,
      1.35 * scale, // Expands wider into ambient mist
      0.11 + Math.random() * 0.03,
      95 + Math.random() * 35,
      -1 // Left bias
    );

    // Type 3: Right Curl / Scatter (flows around face to the right)
    const rightAngle = -Math.PI / 2 + (0.35 + Math.random() * 0.55); // -70° to -35° (Right-Up)
    this.spawnParticle(
      x + (Math.random() * 8 * scale),
      y + (Math.random() - 0.5) * 6,
      rightAngle,
      (2.2 + Math.random() * 2.0) * scale,
      (20 + Math.random() * 12) * scale,
      1.35 * scale, // Expands wider into ambient mist
      0.11 + Math.random() * 0.03,
      95 + Math.random() * 35,
      1 // Right bias
    );
  }

  private spawnParticle(
    x: number,
    y: number,
    angle: number,
    speed: number,
    size: number,
    expansionRate: number,
    alpha: number,
    maxLife: number,
    lateralBias: number
  ) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      alpha,
      maxLife,
      life: 0,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.025,
      // Store custom expansion & lateral curl dynamics
      expansionRate: expansionRate,
      lateralBias: lateralBias
    } as Particle & { expansionRate: number; lateralBias: number });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i] as Particle & { expansionRate?: number; lateralBias?: number };
      p.life++;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics: Move particles along velocity vectors
      p.x += p.vx;
      p.y += p.vy;

      // Air drag slows initial burst
      p.vx *= 0.968;
      p.vy *= 0.972;

      // Gentle thermal rise lifts smoke upward continuously
      p.vy -= 0.042;

      // Atmospheric scatter: lateral curl spreads smoke around face & shoulders
      const bias = p.lateralBias || 0;
      if (bias !== 0) {
        // Continue drifting outward into adjacent area
        p.vx += bias * 0.055;
      }

      // Organic sinusoidal atmospheric turbulence
      p.vx += Math.sin(p.life * 0.06 + p.rotation) * 0.085;

      // Volumetric cloud expansion (grows from mouth size into wide billowy cloud)
      const growth = p.expansionRate || 1.1;
      p.size += growth;
      p.rotation += p.rotSpeed;

      // Instant visibility with smooth late fade-out
      const progress = p.life / p.maxLife;
      let envelope: number;
      if (progress < 0.45) {
        envelope = 1.0; // 100% visible immediately from the mouth
      } else {
        envelope = Math.pow(1 - (progress - 0.45) / 0.55, 1.4);
      }
      p.alpha = envelope * 0.135;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (const p of this.particles) {
      if (p.alpha <= 0.002) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // Multi-stop soft feathered smoke puff: realistic hookah clouds
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
      g.addColorStop(0, `rgba(255, 255, 255, ${p.alpha * 1.15})`);
      g.addColorStop(0.28, `rgba(245, 248, 255, ${p.alpha * 0.9})`);
      g.addColorStop(0.62, `rgba(235, 242, 255, ${p.alpha * 0.45})`);
      g.addColorStop(1, 'rgba(215, 230, 255, 0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }

  getActiveParticleCount(): number {
    return this.particles.length;
  }
}
