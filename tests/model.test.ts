import { describe, it, expect } from "vitest";
import { DragonModel } from "../src/model.js";
import { configure } from "../src/config.js";
const perch = { x: 200, y: 240, left: 80, right: 350, id: "ledge" };
function advance(m: DragonModel, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) m.step(1 / 60);
}
describe("coherent creature model", () => {
  it("hatches promptly into a stable pose", () => {
    const m = new DragonModel();
    m.place(perch);
    advance(m, 3.2);
    expect(m.phase).toBe("idle");
    expect(m.x).toBe(200);
    expect(m.stretch).toBe(1);
  });
  it("walks to a physical treat before consuming it", () => {
    const m = new DragonModel(1);
    m.place(perch);
    m.setPhase("idle");
    m.feed(300, 240);
    advance(m, 0.5);
    expect(m.fed).toBe(0);
    expect(m.x).toBeGreaterThan(200);
    expect(m.x).toBeLessThan(300);
    advance(m, 2);
    expect(m.fed).toBe(1);
    expect(m.food).toBe(null);
    expect(m.phase).toBe("idle");
  });
  it("prepares, takes off, follows an arc and settles on a new ledge", () => {
    const m = new DragonModel(1);
    m.place(perch);
    m.setPhase("idle");
    m.fly({ ...perch, x: 480, y: 350, id: "second" });
    expect(m.phase).toBe("anticipating");
    advance(m, 0.8);
    expect(m.phase).toBe("flying");
    expect(m.y).toBeLessThan(240);
    expect(m.flights).toBe(1);
    advance(m, 3);
    expect(m.phase).toBe("idle");
    expect(m.x).toBe(480);
    expect(m.y).toBe(350);
  });
  it("moves anchor and flight trajectory atomically during scroll", () => {
    const m = new DragonModel(1);
    m.place(perch);
    m.fly(perch);
    advance(m, 0.8);
    const before = m.y;
    m.syncAnchor({ ...perch, y: perch.y - 150 });
    expect(m.y - before).toBe(-150);
    advance(m, 3);
    expect(m.y).toBeCloseTo(90, 8);
  });
  it("sneezes once and returns to calm without mutating layout", () => {
    const m = new DragonModel(1);
    m.place(perch);
    m.sneeze();
    advance(m, 2);
    expect(m.sneezes).toBe(1);
    expect(m.phase).toBe("idle");
    expect(m.bodyPitch).toBe(0);
  });
  it("can sleep, wake, reset and keep counters consistent", () => {
    const m = new DragonModel(1);
    m.place(perch);
    m.sleep();
    advance(m, 20);
    expect(m.phase).toBe("sleeping");
    m.wake();
    expect(m.phase).toBe("idle");
    m.reset();
    expect(m.phase).toBe("egg");
    expect(m.fed).toBe(0);
    expect(m.flights).toBe(0);
  });
  it("caps large time deltas and remains finite through repeated commands", () => {
    const m = new DragonModel(1);
    m.place(perch);
    for (let i = 0; i < 100; i++) {
      m.step(10000);
      if (i % 4 === 0) m.fly();
      if (i % 9 === 0) m.sneeze();
    }
    for (const n of [m.x, m.y, m.time, m.stretch, m.age])
      expect(Number.isFinite(n)).toBe(true);
  });
});
describe("configuration trust boundary", () => {
  it("keeps a validated bounded configuration", () => {
    expect(configure({ size: 900, speed: -1, zIndex: 1e15 })).toMatchObject({
      size: 220,
      speed: 0.25,
      zIndex: 2147483000,
    });
  });
  it("rejects unexpected keys, polluted prototypes and non finite values", () => {
    for (const input of [
      { size: NaN },
      { speed: Infinity },
      { preset: "evil" },
      { sparks: "yes" },
      { maxFPS: 100 },
      { __proto__: { hidden: 1 } },
      { extra: true },
    ])
      expect(() => configure(input as never)).toThrow();
  });
  it("keeps previous configuration when updating one option", () => {
    const cfg = configure({ preset: "mint", sparks: false });
    expect(configure({ size: 100 }, cfg)).toMatchObject({
      preset: "mint",
      sparks: false,
      size: 100,
    });
  });
});
