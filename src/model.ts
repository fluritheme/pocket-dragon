import type { DragonPhase } from "./types.js";
export interface Perch {
  x: number;
  y: number;
  left: number;
  right: number;
  id: string;
}
const ease = (x: number) => x * x * (3 - 2 * x);
export class DragonModel {
  x = 0;
  y = 0;
  direction = 1;
  phase: DragonPhase = "egg";
  time = 0;
  age = 0;
  fed = 0;
  flights = 0;
  sneezes = 0;
  food: { x: number; y: number; life: number } | null = null;
  anchor: Perch | null = null;
  vx = 0;
  vy = 0;
  wing = 0;
  blink = 0;
  mood = 0;
  gait = 0;
  bodyPitch = 0;
  stretch = 1;
  eggCrack = 0;
  private origin = { x: 0, y: 0 };
  private target = { x: 0, y: 0 };
  private afterAnticipation: "flying" | "sneezing" = "flying";
  private cycle = 0;
  constructor(
    private speed = 0.8,
    public reduced = false,
  ) {}
  setSpeed(speed: number) {
    this.speed = speed;
  }
  place(perch: Perch) {
    this.anchor = perch;
    this.x = perch.x;
    this.y = perch.y;
    this.origin = { x: this.x, y: this.y };
    this.target = { ...this.origin };
  }
  syncAnchor(perch: Perch) {
    if (this.anchor?.id !== perch.id) return;
    const dx = perch.x - this.anchor.x,
      dy = perch.y - this.anchor.y;
    this.x += dx;
    this.y += dy;
    this.origin.x += dx;
    this.origin.y += dy;
    this.target.x += dx;
    this.target.y += dy;
    if (this.food) {
      this.food.x += dx;
      this.food.y += dy;
    }
    this.anchor = perch;
  }
  setPhase(phase: DragonPhase) {
    this.phase = phase;
    this.time = 0;
    this.origin = { x: this.x, y: this.y };
  }
  hatch() {
    this.eggCrack = 0;
    this.setPhase("egg");
  }
  feed(x?: number, y?: number) {
    if (this.phase === "egg" || this.phase === "hatching") {
      this.eggCrack = 1;
      this.setPhase("idle");
    }
    this.food = {
      x: x ?? this.x + this.direction * 100,
      y: y ?? this.y,
      life: 12,
    };
    this.direction = this.food.x >= this.x ? 1 : -1;
    this.target = { x: this.food.x, y: this.food.y };
    this.setPhase("walking");
  }
  fly(target?: Perch) {
    if (this.phase === "egg" || this.phase === "hatching")
      this.setPhase("idle");
    this.food = null;
    this.target = target
      ? { x: target.x, y: target.y }
      : { x: this.x + this.direction * 110, y: this.y };
    if (target) this.anchor = target;
    this.afterAnticipation = "flying";
    this.setPhase("anticipating");
  }
  sneeze() {
    if (this.phase === "egg" || this.phase === "hatching")
      this.setPhase("idle");
    this.afterAnticipation = "sneezing";
    this.setPhase("anticipating");
  }
  sleep() {
    this.food = null;
    this.setPhase("sleeping");
  }
  wake() {
    this.setPhase("idle");
    this.mood = 1;
  }
  reset() {
    this.fed = 0;
    this.flights = 0;
    this.sneezes = 0;
    this.food = null;
    this.hatch();
  }
  step(delta: number) {
    const dt = Math.min(0.05, Math.max(0, delta));
    this.age += dt;
    this.time += dt * this.speed;
    this.cycle += dt;
    this.blink = Math.sin(this.cycle * 1.31) > 0.994 ? 1 : 0;
    this.mood *= Math.exp(-dt * 1.8);
    const t = this.time;
    if (this.food) {
      this.food.life -= dt;
      if (this.food.life <= 0) {
        this.food = null;
        this.setPhase("idle");
      }
    }
    if (this.phase === "egg") {
      this.eggCrack = Math.min(1, t / 1.65);
      if (t > 1.7) this.setPhase("hatching");
    } else if (this.phase === "hatching") {
      this.stretch = 1 + Math.sin(t * 8) * 0.13 * Math.exp(-t * 3);
      if (t > 0.75) {
        this.stretch = 1;
        this.setPhase("idle");
      }
    } else if (this.phase === "walking") {
      const dx = this.target.x - this.x,
        dy = this.target.y - this.y;
      const length = Math.hypot(dx, dy);
      if (length < 3) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.setPhase("eating");
      } else {
        const step = Math.min(length, dt * 92 * this.speed);
        this.x += (dx / length) * step;
        this.y += (dy / length) * step;
        this.gait += step * 0.095;
        this.bodyPitch = Math.sin(this.gait * 2) * 0.025;
      }
    } else if (this.phase === "eating") {
      this.bodyPitch = Math.sin(t * 10) * 0.06;
      this.mood = 1;
      if (t > 0.85) {
        this.food = null;
        this.fed++;
        this.bodyPitch = 0;
        this.setPhase("idle");
      }
    } else if (this.phase === "anticipating") {
      this.stretch = 1 - Math.sin((Math.min(1, t / 0.48) * Math.PI) / 2) * 0.13;
      this.bodyPitch = -0.08 * Math.sin((Math.min(1, t / 0.48) * Math.PI) / 2);
      if (t > 0.48) {
        this.stretch = 1;
        this.setPhase(this.afterAnticipation);
        if (this.afterAnticipation === "flying") this.flights++;
        else this.sneezes++;
      }
    } else if (this.phase === "flying") {
      const u = Math.min(1, t / 2.2),
        s = ease(u);
      this.x = this.origin.x + (this.target.x - this.origin.x) * s;
      this.y =
        this.origin.y +
        (this.target.y - this.origin.y) * s -
        Math.sin(u * Math.PI) * 110;
      this.direction = this.target.x >= this.origin.x ? 1 : -1;
      this.wing = Math.sin(t * 17);
      this.bodyPitch = Math.cos(u * Math.PI) * -0.16;
      if (u >= 1) this.setPhase("landing");
    } else if (this.phase === "landing") {
      this.stretch = 1 - Math.sin(Math.min(1, t / 0.4) * Math.PI) * 0.15;
      this.wing *= Math.exp(-dt * 9);
      this.bodyPitch *= Math.exp(-dt * 9);
      if (t > 0.55) {
        this.stretch = 1;
        this.setPhase("idle");
      }
    } else if (this.phase === "sneezing") {
      this.bodyPitch = -Math.sin(Math.min(t / 0.8, 1) * Math.PI) * 0.18;
      this.mood = 0.7;
      if (t > 1) {
        this.bodyPitch = 0;
        this.setPhase("idle");
      }
    } else if (this.phase === "idle") {
      this.gait *= Math.exp(-dt * 8);
      this.bodyPitch *= Math.exp(-dt * 6);
      this.wing *= Math.exp(-dt * 6);
      if (t > 8 && !this.reduced) this.sleep();
    }
  }
}
