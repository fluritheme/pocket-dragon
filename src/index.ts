import { configure } from "./config.js";
import { DragonModel, type Perch } from "./model.js";
import { renderDragon, renderFood } from "./render.js";
import type {
  Config,
  DragonState,
  PocketDragonController,
  PocketDragonOptions,
} from "./types.js";
export type * from "./types.js";
function empty(): PocketDragonController {
  const state: DragonState = {
    ready: false,
    paused: true,
    phase: "idle",
    x: 0,
    y: 0,
    direction: 1,
    age: 0,
    fed: 0,
    flights: 0,
    sneezes: 0,
    food: null,
    anchor: null,
    reducedMotion: false,
  };
  const noop = () => {};
  return {
    update: noop,
    pause: noop,
    resume: noop,
    destroy: noop,
    hatch: noop,
    feed: noop,
    fly: noop,
    sneeze: noop,
    sleep: noop,
    wake: noop,
    reset: noop,
    getState: () => ({ ...state }),
  };
}
export function createPocketDragon(
  options: PocketDragonOptions = {},
): PocketDragonController {
  const config = configure(options);
  if (typeof document === "undefined") return empty();
  return new Dragon(config);
}
class Dragon implements PocketDragonController {
  private cfg: Config;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private model: DragonModel;
  private destroyed = false;
  private paused = false;
  private raf = 0;
  private last = 0;
  private lastPaint = 0;
  private width = 0;
  private height = 0;
  private dirty = true;
  private perches: Perch[] = [];
  private anchored: Element | null = null;
  private hidden = false;
  private visible = true;
  private nextFlight = 11;
  private ro: ResizeObserver;
  private io: IntersectionObserver | undefined;
  private mo: MutationObserver;
  private mq: MediaQueryList;
  private cleanups: (() => void)[] = [];
  constructor(config: Config) {
    this.cfg = config;
    this.mq = matchMedia("(prefers-reduced-motion: reduce)");
    this.model = new DragonModel(
      config.speed,
      config.respectReducedMotion && this.mq.matches,
    );
    this.canvas = document.createElement("canvas");
    this.canvas.dataset.fluriDragon = "";
    this.canvas.setAttribute("aria-hidden", "true");
    Object.assign(this.canvas.style, {
      position: "fixed",
      pointerEvents: "none",
      display: "block",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      zIndex: String(config.zIndex),
    });
    (config.root ?? document.body).append(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      this.canvas.remove();
      throw new Error("Pocket Dragon needs Canvas2D support");
    }
    this.ctx = ctx;
    this.ro = new ResizeObserver(() => {
      this.dirty = true;
      this.wakeLoop();
    });
    this.ro.observe(config.root ?? document.documentElement);
    this.mo = new MutationObserver((records) => {
      if (records.some((r) => r.target !== this.canvas)) {
        this.dirty = true;
        this.wakeLoop();
      }
    });
    this.mo.observe(config.root ?? document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
    if (document.fonts)
      this.listen(document.fonts, "loadingdone", () => {
        this.dirty = true;
        this.wakeLoop();
      });
    if (config.root) {
      this.io = new IntersectionObserver(
        (entries) => {
          this.visible = entries[0]?.isIntersecting ?? false;
          if (this.visible) {
            this.last = 0;
            this.wakeLoop();
          }
        },
        { rootMargin: "60px" },
      );
      this.io.observe(config.root);
    }
    this.listen(
      document,
      "scroll",
      () => {
        this.dirty = true;
        this.positionCanvas();
        this.measure();
        this.draw();
      },
      true,
    );
    this.listen(window, "resize", () => {
      this.dirty = true;
      this.wakeLoop();
    });
    this.listen(document, "visibilitychange", () => {
      this.hidden = document.hidden;
      if (!this.hidden) {
        this.last = 0;
        this.wakeLoop();
      }
    });
    this.listen(this.mq, "change", () => {
      this.model.reduced = this.cfg.respectReducedMotion && this.mq.matches;
      this.wakeLoop();
    });
    this.listen(
      document,
      "pointerup",
      (event: Event) => {
        if (!this.cfg.interaction) return;
        const e = event as PointerEvent;
        const el = e.target;
        if (
          el instanceof Element &&
          el.closest(
            'a,button,input,textarea,select,[role="button"],[contenteditable]',
          )
        )
          return;
        const r = this.canvas.getBoundingClientRect(),
          x = e.clientX - r.left,
          y = e.clientY - r.top;
        if (
          Math.hypot(
            x - this.model.x,
            y - (this.model.y - this.cfg.size * 0.35),
          ) <
          this.cfg.size * 0.75
        ) {
          this.model.wake();
          this.wakeLoop();
        }
      },
      false,
    );
    this.positionCanvas();
    this.measure();
    this.pickInitial();
    if (!config.hatchOnStart || this.model.reduced) this.model.setPhase("idle");
    this.draw();
    this.wakeLoop();
  }
  private listen(
    target: EventTarget,
    name: string,
    fn: (event: Event) => void,
    capture = false,
  ) {
    target.addEventListener(name, fn, { passive: true, capture });
    this.cleanups.push(() => target.removeEventListener(name, fn, { capture }));
  }
  private positionCanvas() {
    const r = this.cfg.root?.getBoundingClientRect();
    const w = r?.width ?? innerWidth,
      h = r?.height ?? innerHeight;
    if (r) {
      Object.assign(this.canvas.style, {
        left: r.left + "px",
        top: r.top + "px",
        width: w + "px",
        height: h + "px",
      });
    } else
      Object.assign(this.canvas.style, {
        left: "0px",
        top: "0px",
        width: innerWidth + "px",
        height: innerHeight + "px",
      });
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (
      w !== this.width ||
      h !== this.height ||
      this.canvas.width !== Math.round(w * dpr)
    ) {
      this.width = w;
      this.height = h;
      this.canvas.width = Math.max(1, Math.round(w * dpr));
      this.canvas.height = Math.max(1, Math.round(h * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.dirty = true;
    }
  }
  private moving(el: Element) {
    for (
      let e: Element | null = el;
      e && e !== document.documentElement;
      e = e.parentElement
    ) {
      const s = getComputedStyle(e);
      if (s.position === "fixed" || s.position === "sticky") return true;
    }
    return false;
  }
  private measure() {
    if (!this.dirty) return;
    this.dirty = false;
    const r = this.canvas.getBoundingClientRect();
    this.perches = [];
    const elements = (this.cfg.root ?? document).querySelectorAll(
      this.cfg.surfaces,
    );
    let index = 0;
    for (const el of elements) {
      if (el === this.canvas || this.moving(el)) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const b = el.getBoundingClientRect();
      if (b.width < 60 || b.height < 8 || b.bottom < r.top || b.top > r.bottom)
        continue;
      const left = Math.max(65, b.left - r.left),
        right = Math.min(this.width - 65, b.right - r.left);
      if (right < left) continue;
      const p = {
        x: left + (right - left) * 0.66,
        y: b.top - r.top + 2,
        left,
        right,
        id: el.id || "perch-" + index++,
      };
      this.perches.push(p);
      if (el === this.anchored) this.model.syncAnchor(p);
    }
    if (this.anchored && !this.anchored.isConnected) this.anchored = null;
    if (!this.model.anchor) {
      const p = this.fallback();
      this.model.place(p);
    }
  }
  private fallback(): Perch {
    return {
      x: this.width * 0.62,
      y: Math.max(this.cfg.size * 0.78, this.height * 0.72),
      left: 65,
      right: Math.max(70, this.width - 65),
      id: "ground",
    };
  }
  private pickInitial() {
    const p =
      this.perches.find(
        (p) => p.y > this.cfg.size * 0.7 && p.y < this.height - 35,
      ) ?? this.fallback();
    this.model.place(p);
    this.anchored = this.elementFor(p);
  }
  private elementFor(p: Perch): Element | null {
    if (p.id === "ground") return null;
    const roots = this.cfg.root ?? document;
    for (const el of roots.querySelectorAll(this.cfg.surfaces)) {
      const b = el.getBoundingClientRect(),
        r = this.canvas.getBoundingClientRect();
      if (
        Math.abs(b.top - r.top + 2 - p.y) < 2 &&
        p.x >= b.left - r.left &&
        p.x <= b.right - r.left
      )
        return el;
    }
    return null;
  }
  private wakeLoop() {
    if (
      this.destroyed ||
      this.raf ||
      this.paused ||
      this.hidden ||
      !this.visible
    )
      return;
    this.raf = requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    this.raf = 0;
    if (this.destroyed || this.paused || this.hidden || !this.visible) return;
    this.positionCanvas();
    this.measure();
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    if (!this.model.reduced || !["idle", "sleeping"].includes(this.model.phase))
      this.model.step(dt);
    if (
      this.model.age > this.nextFlight &&
      !this.model.reduced &&
      ["idle", "sleeping"].includes(this.model.phase)
    ) {
      this.nextFlight = this.model.age + 13;
      this.fly();
    }
    if (now - this.lastPaint >= 1000 / this.cfg.maxFPS - 1) {
      this.draw();
      this.lastPaint = now;
    }
    if (!this.model.reduced || !this.model.phase.match(/^(idle|sleeping)$/))
      this.wakeLoop();
  };
  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (this.model.food)
      renderFood(
        this.ctx,
        this.model.food.x,
        this.model.food.y,
        this.model.age,
      );
    renderDragon(this.ctx, this.model, this.cfg);
    if (
      this.cfg.sparks &&
      this.model.phase === "sneezing" &&
      this.model.time > 0.35
    ) {
      const time = this.model.time - 0.35;
      for (let i = 0; i < 11; i++) {
        const x =
            this.model.x +
            this.model.direction * (this.cfg.size * 0.6 + time * (35 + i * 12)),
          y =
            this.model.y -
            this.cfg.size * 0.48 -
            time * (20 + i * 5) +
            time * time * 80;
        this.ctx.globalAlpha = Math.max(0, 1 - time * 1.6);
        this.ctx.fillStyle = i % 2 ? "#ef8b47" : "#ffd18a";
        this.ctx.beginPath();
        this.ctx.arc(x, y, Math.max(0.3, 2.5 - time * 2), 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }
  }
  update(options: PocketDragonOptions) {
    if (this.destroyed) return;
    const next = configure(options, this.cfg);
    if (next.root !== this.cfg.root)
      throw new TypeError("Create a new dragon to change root");
    this.cfg = next;
    this.canvas.style.zIndex = String(next.zIndex);
    this.model.setSpeed(next.speed);
    this.model.reduced = next.respectReducedMotion && this.mq.matches;
    this.dirty = true;
    this.positionCanvas();
    this.measure();
    this.draw();
    this.wakeLoop();
  }
  pause() {
    this.paused = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  resume() {
    if (this.destroyed) return;
    this.paused = false;
    this.last = 0;
    this.wakeLoop();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.mo.disconnect();
    this.io?.disconnect();
    for (const fn of this.cleanups) fn();
    this.cleanups = [];
    this.canvas.remove();
  }
  hatch() {
    if (this.destroyed) return;
    this.model.hatch();
    this.wakeLoop();
  }
  feed(x?: number, y?: number) {
    if (this.destroyed) return;
    if (
      (x !== undefined && !Number.isFinite(x)) ||
      (y !== undefined && !Number.isFinite(y))
    )
      throw new TypeError("Feed coordinates must be finite");
    const r = this.canvas.getBoundingClientRect();
    const localx =
      x === undefined
        ? this.model.x + this.model.direction * this.cfg.size * 0.65
        : x - r.left;
    const localy = y === undefined ? this.model.y : y - r.top;
    this.model.feed(
      Math.max(
        this.cfg.size * 0.4,
        Math.min(this.width - this.cfg.size * 0.4, localx),
      ),
      Math.max(this.cfg.size * 0.7, Math.min(this.height - 10, localy)),
    );
    this.wakeLoop();
  }
  fly() {
    if (this.destroyed) return;
    this.dirty = true;
    this.measure();
    const visible = this.perches.filter(
      (p) =>
        p.y > this.cfg.size * 0.75 &&
        p.y < this.height - 15 &&
        Math.hypot(p.x - this.model.x, p.y - this.model.y) > 50,
    );
    const p =
      visible[Math.floor(this.model.flights % Math.max(1, visible.length))] ??
      this.fallback();
    this.anchored = this.elementFor(p);
    this.model.fly(p);
    this.wakeLoop();
  }
  sneeze() {
    if (this.destroyed) return;
    this.model.sneeze();
    this.wakeLoop();
  }
  sleep() {
    if (this.destroyed) return;
    this.model.sleep();
    this.draw();
    this.wakeLoop();
  }
  wake() {
    if (this.destroyed) return;
    this.model.wake();
    this.wakeLoop();
  }
  reset() {
    if (this.destroyed) return;
    this.pickInitial();
    this.model.reset();
    if (!this.cfg.hatchOnStart || this.model.reduced)
      this.model.setPhase("idle");
    this.nextFlight = this.model.age + 11;
    this.wakeLoop();
  }
  getState(): DragonState {
    return {
      ready: !this.destroyed,
      paused: this.paused,
      phase: this.model.phase,
      x: this.model.x,
      y: this.model.y,
      direction: this.model.direction,
      age: this.model.age,
      fed: this.model.fed,
      flights: this.model.flights,
      sneezes: this.model.sneezes,
      food: this.model.food ? { ...this.model.food } : null,
      anchor: this.model.anchor?.id ?? null,
      reducedMotion: this.model.reduced,
    };
  }
}
