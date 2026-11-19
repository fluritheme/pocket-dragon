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
    await page.waitForTimeout(20);
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
  const before = await page.evaluate(() => ({
    y: window.dragon.getState().y,
    top: document.querySelector("#first-perch")!.getBoundingClientRect().top,
  }));
  await page.evaluate(() => scrollBy(0, 150));
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({
    y: window.dragon.getState().y,
    top: document.querySelector("#first-perch")!.getBoundingClientRect().top,
  }));
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
