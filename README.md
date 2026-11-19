# Pocket Dragon

An original little dragon that makes a real home on your website. An egg cracks open, wings unfold, tiny feet find a ledge, and a very small fire sneeze surprises everybody.

[Live playground](https://fluri.xyz/pocket-dragon/) · [Fluri collection](https://fluri.xyz/) · [Commercial licence](https://fluri.xyz/legal/license/)

![Pocket Dragon perched on a real page ledge](https://fluri.xyz/previews/dragon.webp)

[Watch the actual animation](https://fluri.xyz/previews/dragon.mp4)

## Install

```sh
npm install @fluritheme/pocket-dragon
```

```ts
import { createPocketDragon } from "@fluritheme/pocket-dragon";

const dragon = createPocketDragon({
  preset: "ember",
  size: 150,
  surfaces: "h1, h2, button, [data-dragon-perch]",
});

// Application teardown:
dragon.destroy();
```

Add `data-dragon-perch` to specific page elements to give the dragon somewhere to land. The companion renders in a transparent, click-through canvas and does not change your DOM content, global styles or scrolling. By default its canvas sits above your page at `z-index: 100`; choose the layer appropriate for your site's menus and dialogs.

## A small creature with a complete life

- A speckled egg wobbles and cracks, then reveals the dragon within about 2 seconds at default speed.
- The original character has articulated legs, a delayed curling tail, shaded scales and belly plates, membrane wings, blinking eyes, an expressive snout and soft breathing.
- Feeding creates a visible treat. The dragon walks to it, eats it, and only then increments the treat counter.
- Flights have crouching anticipation, takeoff, a curved airborne path, flapping wings, landing compression and a settling pose.
- Tiny fire sneezes have an anticipatory breath, warm fire shapes and optional quickly extinguishing embers. They never modify or damage host content.
- Sleeping curls the pose with gentle breathing; the dragon wakes for commands and explores another visible ledge on a relaxed schedule.
- Every action is available programmatically. No sound, accounts, network requests, runtime activation, cookies or storage.

## Options

All options are optional. Unknown keys, inherited configuration objects, invalid selectors, non-finite numbers and invalid enum/boolean values are rejected. Finite numeric values are clamped to the documented bounds.

| Option                 | Default                              | Meaning                                                                                               |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `root`                 | whole viewport                       | Optional `HTMLElement` containing a bounded scene. Its current bounding rectangle defines the canvas. |
| `preset`               | `'ember'`                            | `'ember'`, `'mint'` or `'lavender'`.                                                                  |
| `size`                 | `150`                                | Character drawing scale, `80`–`220` CSS pixels.                                                       |
| `speed`                | `0.8`                                | Behaviour speed, `0.25`–`1.5`.                                                                        |
| `surfaces`             | `'h1,h2,button,[data-dragon-perch]'` | CSS selector for real perches. Fixed/sticky elements and descendants are excluded.                    |
| `hatchOnStart`         | `true`                               | Show the brief egg introduction; `false` starts already hatched.                                      |
| `interaction`          | `true`                               | Tapping near the dragon wakes it. Form controls, links and buttons are ignored.                       |
| `sparks`               | `true`                               | Show small decorative ember particles during sneezes.                                                 |
| `maxFPS`               | `60`                                 | `30` or `60` rendering limit.                                                                         |
| `respectReducedMotion` | `true`                               | Start in a calm, hatched pose when the OS requests reduced motion. Explicit actions remain usable.    |
| `zIndex`               | `100`                                | Canvas layer, `0`–`2147483000`.                                                                       |

For a contained scene:

```html
<section id="dragon-scene" style="height: 460px">
  <article data-dragon-perch>Our next adventure starts here.</article>
</section>
```

```ts
const dragon = createPocketDragon({
  root: document.querySelector<HTMLElement>("#dragon-scene")!,
  surfaces: "[data-dragon-perch]",
  preset: "mint",
  size: 180,
});
```

The default whole-page overlay follows current viewport geometry. Scrolling updates the anchored pose atomically, including nested scrollers, so a paused creature remains attached to its perch. Use regular, visible layout elements with enough horizontal room; highly transformed 3D containers or cross-document surfaces are not supported. A fallback ground position is used when no suitable perch is visible.

## Controller

```ts
dragon.feed(); // Place a treat a short walk ahead.
dragon.feed(400, 320); // Optional viewport coordinates, clamped to the scene.
dragon.fly(); // Choose another suitable visible ledge.
dragon.sneeze(); // Anticipate, then perform one harmless fire sneeze.
dragon.sleep();
dragon.wake();
dragon.hatch(); // Replay the egg introduction.
dragon.pause(); // Freeze behaviour; keep scroll anchoring correct.
dragon.resume();
dragon.update({ preset: "lavender", sparks: false });
dragon.reset(); // Reset counters and replay the configured introduction.
console.log(dragon.getState());
dragon.destroy(); // Idempotent; remove canvas/listeners/observers/RAF.
```

`getState()` returns a snapshot containing `ready`, `paused`, `phase`, `x`, `y`, `direction`, `age`, `fed`, `flights`, `sneezes`, `food`, `anchor` and `reducedMotion`. Coordinates are scene-local CSS pixels. `update` preserves unspecified settings; changing `root` requires a new instance. Commands after destruction are harmless. Importing and creating during SSR returns an inert, safe controller; instantiate again on the client to display the creature.

## React

```tsx
import { useEffect } from "react";
import { createPocketDragon } from "@fluritheme/pocket-dragon";

export function Dragon() {
  useEffect(() => {
    const companion = createPocketDragon({ preset: "ember" });
    return () => companion.destroy();
  }, []);
  return null;
}
```

## Performance and accessibility

Canvas pixels are capped at device-pixel ratio 2. The engine pauses while the document is hidden or a bounded scene is offscreen, respects reduced motion, uses bounded simulation time steps, and measures geometry on invalidation rather than rasterising text. Pointer listeners are passive and the canvas has `pointer-events: none` and `aria-hidden="true"`. The decorative creature does not add keyboard traps. Expose your own labelled buttons for optional keyboard-operated actions, as in the live demo.

## Privacy and licence

The standalone package has no runtime dependencies, telemetry, cookies, local storage, remote asset downloads or activation checks. Fluri's separately installed hosted service has its own account, access and optional analytics rules.

This release uses the **Fluri Themes Commercial License**, included in `LICENSE`. Private non-production evaluation is permitted; production and client use require the applicable licence. It is not an MIT/open-source release. Historical MIT grants remain unaffected; `LICENSE-MIT-LEGACY` records those boundaries. Original artwork is rendered in code; no third-party character assets are included. See `LICENSING.md` and `THIRD-PARTY-NOTICES.txt`.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
```

Model tests cover transitions, consumption, bounded time steps, anchor updates and hostile configuration. Browser checks cover automatic hatching, actual feeding/flight/sleep actions, fast native scrolling, reduced motion, host interaction and teardown. `pnpm release:check` validates the archive and SSR import.
