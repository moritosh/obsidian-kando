import { c } from '../components/helpers';
import { Lane } from '../components/types';

export interface Point {
  x: number;
  y: number;
}

// Every completion gets a quick sparkle burst; the creature flight is kept
// to fixed odds so it stays an occasional surprise rather than something
// that fires (and gets old) every single time.
const CREATURE_CHANCE = 0.35;
const LOOP_CHANCE = 0.5;
const MAX_FLIGHTS = 2;
const MAX_PARTICLES = 500;

const FLIGHT_MS = 2600;
const TRAIL_MS = 520;
const CREATURE_SIZE = 56;
const BAND_WIDTH = 3.5;
const GRAVITY = 900;

const CREATURES = ['🦄', '🐉', '🦦', '🐳', '🦩'];
const RAINBOW = ['#ff453a', '#ff9f0a', '#ffd60a', '#32d74b', '#0a84ff', '#bf5af2'];
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

const DONE_LANE_NAME_PATTERN = /\b(done|complete|completed|finished)\b/i;

// A lane counts as a "done" list either because the user explicitly marked
// it as one ("Mark cards in this list as complete"), or just by its name
// (e.g. a list titled "Done", "✅ Done", "Completed").
export function isDoneLane(lane: Lane | null | undefined): boolean {
  if (!lane) return false;
  if (lane.data.shouldMarkItemsComplete) return true;
  return DONE_LANE_NAME_PATTERN.test(lane.data.title || '');
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const random = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * p0.x + b * p1.x + d * p2.x + e * p3.x,
    y: a * p0.y + b * p1.y + d * p2.y + e * p3.y,
  };
}

export interface FlightOptions {
  // Whether the creature turns a loop-the-loop halfway across.
  loop: boolean;
  // Where it leaves the screen, as a fraction of the viewport height.
  exitHeight: number;
}

// The creature's position over its flight (t from 0 to 1): it pops out of
// `origin`, swoops across the board away from the nearer edge and leaves the
// screen high up on the far side. It stays on screen until then: from a card
// low on the screen it arcs upwards, from one near the top it dips first.
export function createFlightPath(
  origin: Point,
  width: number,
  height: number,
  { loop, exitHeight }: FlightOptions
): { direction: 1 | -1; at(t: number): Point } {
  const direction = origin.x <= width / 2 ? 1 : -1;
  const p0 = origin;
  const rising = origin.y > height * 0.45;
  const p1 = {
    x: origin.x + direction * width * 0.08,
    y: rising ? Math.max(height * 0.08, origin.y - height * 0.55) : origin.y + height * 0.45,
  };
  const p2 = { x: origin.x + direction * width * 0.55, y: height * 0.65 };
  const p3 = {
    x: direction > 0 ? width + 2 * CREATURE_SIZE : -2 * CREATURE_SIZE,
    y: height * exitHeight,
  };

  // The loop is a circle traced on top of the base curve between loopStart
  // and loopEnd. Its radius is sized against the ground the base curve covers
  // meanwhile, so the creature really flies backwards over the top. Where
  // there's no room above for it, it loops downwards instead.
  const loopStart = 0.32;
  const loopEnd = 0.62;
  const covered = Math.abs(bezier(p0, p1, p2, p3, loopEnd).x - bezier(p0, p1, p2, p3, loopStart).x);
  const radius = Math.max(48, covered / 3);
  const loopTop = bezier(p0, p1, p2, p3, (loopStart + loopEnd) / 2).y - 2 * radius;
  const upwards = loopTop > height * 0.05 ? 1 : -1;

  return {
    direction,
    at(t) {
      const point = bezier(p0, p1, p2, p3, t);
      if (!loop || t <= loopStart || t >= loopEnd) return point;

      // Easing in and out of the loop keeps the velocity, and so the
      // creature's heading, continuous where the loop joins the curve.
      const angle = 2 * Math.PI * smoothstep((t - loopStart) / (loopEnd - loopStart));
      return {
        x: point.x + direction * radius * Math.sin(angle),
        y: point.y - upwards * radius * (1 - Math.cos(angle)),
      };
    },
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  star: boolean;
}

interface Ring {
  x: number;
  y: number;
  age: number;
}

interface TrailPoint extends Point {
  time: number;
}

interface Flight {
  sprite: HTMLCanvasElement;
  direction: 1 | -1;
  at(t: number): Point;
  started: number;
  trail: TrailPoint[];
  emitted: number;
}

// One full-window canvas per window, alive only while something is on it.
class Stage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  particles: Particle[] = [];
  rings: Ring[] = [];
  flights: Flight[] = [];
  accent: string;
  last = 0;
  frame = 0;

  constructor(
    public win: Window,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.accent =
      win.getComputedStyle(win.document.body).getPropertyValue('--interactive-accent').trim() ||
      '#7f6df2';
    win.document.body.appendChild(canvas);
    this.resize();
  }

  get width() {
    return this.win.innerWidth;
  }

  get height() {
    return this.win.innerHeight;
  }

  resize() {
    const dpr = this.win.devicePixelRatio || 1;
    const width = Math.round(this.width * dpr);
    const height = Math.round(this.height * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.frame) return;
    this.last = 0;
    this.frame = this.win.requestAnimationFrame(this.tick);
  }

  tick = (now: number) => {
    // Clamped so a frame after the window was hidden doesn't teleport anything.
    const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 30) : 1 / 60;
    this.last = now;

    this.update(now, dt);
    this.draw(now);

    if (this.particles.length || this.rings.length || this.flights.length) {
      this.frame = this.win.requestAnimationFrame(this.tick);
    } else {
      this.frame = 0;
      this.canvas.remove();
      stages.delete(this.win);
    }
  };

  burst(origin: Point) {
    this.rings.push({ ...origin, age: 0 });
    for (let i = 0; i < 26; i++) {
      // Fans out mostly upwards, like a little party popper.
      const angle = -Math.PI / 2 + random(-1.25, 1.25);
      const speed = random(160, 420);
      this.spawn(origin, Math.cos(angle) * speed, Math.sin(angle) * speed, random(0.55, 0.95));
    }
  }

  fly(origin: Point) {
    if (this.flights.length >= MAX_FLIGHTS) return;
    const path = createFlightPath(origin, this.width, this.height, {
      loop: Math.random() < LOOP_CHANCE,
      exitHeight: random(-0.05, 0.25),
    });
    this.flights.push({
      ...path,
      sprite: this.renderSprite(pick(CREATURES)),
      started: -1,
      trail: [],
      emitted: 0,
    });
  }

  spawn(at: Point, vx: number, vy: number, life: number) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x: at.x,
      y: at.y,
      vx,
      vy,
      age: 0,
      life,
      size: random(3, 7),
      color: Math.random() < 0.15 ? '#ffffff' : pick(RAINBOW),
      rotation: random(0, Math.PI),
      spin: random(-8, 8),
      star: Math.random() < 0.6,
    });
  }

  renderSprite(emoji: string) {
    const dpr = this.win.devicePixelRatio || 1;
    const size = Math.ceil(CREATURE_SIZE * 1.4 * dpr);
    const sprite = this.win.document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const ctx = sprite.getContext('2d');
    if (ctx) {
      ctx.font = `${CREATURE_SIZE * dpr}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, size / 2, size / 2);
    }
    return sprite;
  }

  update(now: number, dt: number) {
    for (const p of this.particles) {
      p.age += dt;
      p.vy += GRAVITY * dt;
      p.vx *= 1 - 1.8 * dt;
      p.vy *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    for (const ring of this.rings) ring.age += dt;
    this.rings = this.rings.filter((ring) => ring.age < 0.45);

    for (const flight of this.flights) {
      if (flight.started < 0) flight.started = now;
      const progress = (now - flight.started) / FLIGHT_MS;
      if (progress < 1) {
        const point = flight.at(easeFlight(progress));
        flight.trail.push({ ...point, time: now });

        // Stardust shaken off the rainbow, a steady 45 sparkles a second.
        const due = Math.floor(((now - flight.started) / 1000) * 45);
        for (; flight.emitted < due; flight.emitted++) {
          this.spawn(point, random(-60, 60), random(-80, 40), random(0.45, 0.85));
        }
      }
      flight.trail = flight.trail.filter((p) => now - p.time < TRAIL_MS);
    }
    // A flight ends once the creature is gone and its trail has faded out.
    this.flights = this.flights.filter(
      (flight) => now - flight.started < FLIGHT_MS || flight.trail.length > 0
    );
  }

  draw(now: number) {
    const { ctx } = this;
    this.resize();
    ctx.clearRect(0, 0, this.width, this.height);

    for (const ring of this.rings) {
      const t = ring.age / 0.45;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = this.accent;
      ctx.lineWidth = 3 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 8 + 34 * smoothstep(t), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const flight of this.flights) this.drawTrail(flight, now);

    for (const p of this.particles) {
      const t = p.age / p.life;
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.star) drawStar(ctx, p.size * (1 - 0.4 * t));
      else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    for (const flight of this.flights) this.drawCreature(flight, now);
    ctx.globalAlpha = 1;
  }

  // Six bands that follow the flight path, narrowing and fading towards the
  // tail like a comet.
  drawTrail(flight: Flight, now: number) {
    const { ctx } = this;
    const { trail } = flight;
    if (trail.length < 2) return;

    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / length;
      const ny = (b.x - a.x) / length;
      const fresh = 1 - (now - b.time) / TRAIL_MS;
      const width = BAND_WIDTH * (0.25 + 0.75 * fresh);

      ctx.globalAlpha = 0.9 * fresh;
      ctx.lineWidth = width + 0.6;
      RAINBOW.forEach((color, band) => {
        const offset = (band - (RAINBOW.length - 1) / 2) * width;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(a.x + nx * offset, a.y + ny * offset);
        ctx.lineTo(b.x + nx * offset, b.y + ny * offset);
        ctx.stroke();
      });
    }
  }

  drawCreature(flight: Flight, now: number) {
    const elapsed = now - flight.started;
    const progress = elapsed / FLIGHT_MS;
    if (progress >= 1) return;

    const { ctx } = this;
    const t = easeFlight(progress);
    const here = flight.at(t);
    const ahead = flight.at(Math.min(1, t + 0.004));
    const heading = Math.atan2(ahead.y - here.y, ahead.x - here.x);

    // Pops out of the card with a little overshoot, then swims as it flies.
    const pop = elapsed < 380 ? easeOutBack(elapsed / 380) : 1;
    const swim = 1 + 0.06 * Math.sin(elapsed / 70);
    const size = flight.sprite.width / (this.win.devicePixelRatio || 1);

    ctx.save();
    ctx.globalAlpha = clamp01((1 - progress) / 0.08);
    ctx.translate(here.x, here.y);
    // Emoji animals face left, so rightward flights are mirrored to face
    // forwards, and either way the creature tilts with its heading.
    if (flight.direction > 0) {
      ctx.rotate(heading);
      ctx.scale(-pop, pop * swim);
    } else {
      ctx.rotate(heading - Math.PI);
      ctx.scale(pop, pop * swim);
    }
    ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
    ctx.shadowBlur = 14;
    ctx.drawImage(flight.sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

// Quick launch, a slower middle (where any loop happens), quick exit.
function easeFlight(t: number) {
  return t < 0.5 ? 0.5 * Math.pow(2 * t, 0.8) : 1 - 0.5 * Math.pow(2 - 2 * t, 1.25);
}

function easeOutBack(t: number) {
  const s = 1.9;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
}

const stages = new WeakMap<Window, Stage>();

function getStage(win: Window): Stage | null {
  const existing = stages.get(win);
  if (existing) return existing;

  const canvas = win.document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.className = c('celebrate-canvas');
  const stage = new Stage(win, canvas, ctx);
  stages.set(win, stage);
  return stage;
}

// Celebrates a card completed at `origin` (viewport coordinates): sparkles
// burst from it every time, and now and then a creature launches from it
// and swoops off the screen on a rainbow trail.
export function celebrate(win: Window, origin?: Point | null): void {
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const stage = getStage(win);
  if (!stage) return;

  const from = origin ?? { x: stage.width / 2, y: stage.height * 0.8 };
  stage.burst(from);
  if (Math.random() < CREATURE_CHANCE) stage.fly(from);
  stage.start();
}
