import { test, expect } from "@playwright/test";
import type { PocketDragonController } from "../src/types.js";
declare global {
  interface Window {
    dragon: PocketDragonController;
  }
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.dragon?.getState().ready))
    .toBe(true);
});
test("original companion hatches automatically and accepts real interactions", async ({
  page,
}) => {
  await expect(page.locator("canvas[data-fluri-dragon]")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.dragon.getState().phase))
    .toBe("idle");
  await page.getByRole("button", { name: "A little treat" }).click();
  await expect
    .poll(() => page.evaluate(() => window.dragon.getState().fed), {
      timeout: 8000,
    })
    .toBe(1);
  await page.getByRole("button", { name: "Tiny fire sneeze" }).click();
  await expect
    .poll(() => page.evaluate(() => window.dragon.getState().sneezes))
    .toBe(1);
});
test("flight lands on a real page surface and nap is reversible", async ({
  page,
}) => {
  await page.evaluate(() => window.dragon.fly());
  await expect
    .poll(() => page.evaluate(() => window.dragon.getState().flights))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.dragon.getState().phase), {
      timeout: 8000,
    })
    .toBe("idle");
  await page.getByRole("button", { name: "Nap time" }).click();
  expect(await page.evaluate(() => window.dragon.getState().phase)).toBe(
    "sleeping",
  );
  await page.getByRole("button", { name: "Nap time" }).click();
  expect(await page.evaluate(() => window.dragon.getState().phase)).toBe(
    "idle",
  );
});
test("bounded scene follows fast native scrolling with no drift", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.dragon.wake();
    window.dragon.pause();
  });
  const before = await page.evaluate(() => {
    const c = document
      .querySelector("canvas[data-fluri-dragon]")!
      .getBoundingClientRect();
    const p = document.querySelector("#first-perch")!.getBoundingClientRect();
    return { localY: window.dragon.getState().y, relative: c.top - p.top };
  });
  for (const y of [250, 20, 350, 70, 400, 0]) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const after = await page.evaluate(() => {
      const c = document
        .querySelector("canvas[data-fluri-dragon]")!
        .getBoundingClientRect();
      const p = document.querySelector("#first-perch")!.getBoundingClientRect();
      return { localY: window.dragon.getState().y, relative: c.top - p.top };
    });
    expect(Math.abs(after.localY - before.localY)).toBeLessThan(1);
    expect(Math.abs(after.relative - before.relative)).toBeLessThan(1);
  }
});
test("document overlay anchors to a real ledge through scrolling", async ({
  page,
}) => {
  await page.locator("#first-perch").scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    window.dragon.destroy();
    const { createPocketDragon } = await import(
      /* @vite-ignore */ String("/src/index.ts")
    );
    window.dragon = createPocketDragon({
      surfaces: "#first-perch",
      hatchOnStart: false,
    });
    window.dragon.pause();
  });
  const before = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "canvas[data-fluri-dragon]",
    )!;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let paintedTop = 0;
    for (let i = 3; i < data.length; i += 4)
      if (data[i]! > 20) {
        paintedTop =
          Math.floor((i - 3) / 4 / c.width) /
          (devicePixelRatio > 2 ? 2 : devicePixelRatio);
        break;
      }
    return {
      y: window.dragon.getState().y,
      paintedTop,
      top: document.querySelector("#first-perch")!.getBoundingClientRect().top,
    };
  });
  await page.evaluate(() => scrollBy(0, 150));
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const after = await page.evaluate(() => {
    // Read painted pixels BEFORE getState can synchronise geometry itself.
    const c = document.querySelector<HTMLCanvasElement>(
      "canvas[data-fluri-dragon]",
    )!;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let paintedTop = 0;
    for (let i = 3; i < data.length; i += 4)
      if (data[i]! > 20) {
        paintedTop =
          Math.floor((i - 3) / 4 / c.width) /
          (devicePixelRatio > 2 ? 2 : devicePixelRatio);
        break;
      }
    return {
      y: window.dragon.getState().y,
      paintedTop,
      top: document.querySelector("#first-perch")!.getBoundingClientRect().top,
    };
  });
  expect(
    Math.abs(after.paintedTop - before.paintedTop - (after.top - before.top)),
  ).toBeLessThan(1);
  expect(Math.abs(after.y - before.y - (after.top - before.top))).toBeLessThan(
    1,
  );
});
test("configuration rejects executable selectors/unknown data and cleanup preserves host", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      try {
        window.dragon.update({ surfaces: "[" });
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  const before = await page.locator("body").getAttribute("style");
  await page.evaluate(() => {
    window.dragon.update({ preset: "mint", size: 180 });
    window.dragon.destroy();
    window.dragon.destroy();
  });
  await expect(page.locator("canvas[data-fluri-dragon]")).toHaveCount(0);
  expect(await page.locator("body").getAttribute("style")).toBe(before);
  await page
    .getByRole("button", { name: "This host button still works" })
    .click();
  await expect(
    page.getByRole("button", { name: "Still yours. Still working." }),
  ).toBeVisible();
});
test("reduced motion begins in a calm visible pose and viewport remains usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.dragon?.getState().reducedMotion))
    .toBe(true);
  expect(await page.evaluate(() => window.dragon.getState().phase)).toBe(
    "idle",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await expect(page.locator("canvas[data-fluri-dragon]")).toHaveCSS(
    "pointer-events",
    "none",
  );
});

test("a transformed positioned root keeps native canvas and perches in the same coordinate space", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.dragon.wake();
    window.dragon.pause();
    const root = document.querySelector<HTMLElement>("#habitat")!;
    root.style.transformOrigin = "top left";
    root.style.transform = "translate(12px, 18px) rotate(4deg) scale(.82)";
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const before = await page.evaluate(() => {
    const state = window.dragon.getState(),
      canvas = document.querySelector<HTMLCanvasElement>(
        "canvas[data-fluri-dragon]",
      )!,
      root = document.querySelector("#habitat")!.getBoundingClientRect(),
      c = canvas.getBoundingClientRect();
    return {
      x: state.x,
      y: state.y,
      age: state.age,
      relativeTop: c.top - root.top,
      relativeLeft: c.left - root.left,
      position: getComputedStyle(canvas).position,
    };
  });
  expect(before.position).toBe("absolute");
  for (const y of [250, 10, 350, 80, 0]) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const after = await page.evaluate(() => {
      const state = window.dragon.getState(),
        c = document
          .querySelector("canvas[data-fluri-dragon]")!
          .getBoundingClientRect(),
        r = document.querySelector("#habitat")!.getBoundingClientRect();
      return {
        x: state.x,
        y: state.y,
        age: state.age,
        relativeTop: c.top - r.top,
        relativeLeft: c.left - r.left,
      };
    });
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    expect(Math.abs(after.relativeTop - before.relativeTop)).toBeLessThan(1);
    expect(Math.abs(after.relativeLeft - before.relativeLeft)).toBeLessThan(1);
    expect(after.age).toBe(before.age);
  }
});

test("paused geometry reads and native scroll queue no animation frames", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.dragon.pause();
    const original = window.requestAnimationFrame;
    Object.assign(window, {
      __dragonRAFCount: 0,
      __restoreDragonRAF: () => {
        window.requestAnimationFrame = original;
      },
    });
    window.requestAnimationFrame = (fn) => {
      const state = window as unknown as { __dragonRAFCount: number };
      state.__dragonRAFCount++;
      return original(fn);
    };
  });
  const age = await page.evaluate(() => window.dragon.getState().age);
  await page.evaluate(() => {
    scrollTo(0, 180);
    window.dragon.getState();
    scrollTo(0, 20);
    window.dragon.getState();
  });
  await page.waitForTimeout(160);
  const state = await page.evaluate(() => {
    const w = window as unknown as {
      __dragonRAFCount: number;
      __restoreDragonRAF: () => void;
    };
    const count = w.__dragonRAFCount;
    w.__restoreDragonRAF();
    return { count, age: window.dragon.getState().age };
  });
  expect(state.count).toBe(0);
  expect(state.age).toBe(age);
});
