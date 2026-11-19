import type { Config, PocketDragonOptions } from "./types.js";
const keys = new Set([
  "root",
  "zIndex",
  "preset",
  "size",
  "speed",
  "surfaces",
  "hatchOnStart",
  "interaction",
  "sparks",
  "maxFPS",
  "respectReducedMotion",
]);
export function configure(
  input: PocketDragonOptions = {},
  previous?: Config,
): Config {
  if (
    !input ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    throw new TypeError("Dragon options must be a plain object");
  for (const key of Object.keys(input))
    if (!keys.has(key)) throw new TypeError(`Unknown Dragon option: ${key}`);
  const cfg: Config = {
    root: undefined,
    zIndex: 100,
    preset: "ember",
    size: 150,
    speed: 0.8,
    surfaces: "h1,h2,button,[data-dragon-perch]",
    hatchOnStart: true,
    interaction: true,
    sparks: true,
    maxFPS: 60,
    respectReducedMotion: true,
    ...previous,
  };
  for (const [key, value] of Object.entries(input)) {
    if (key === "root") {
      if (
        value !== undefined &&
        (typeof HTMLElement === "undefined" || !(value instanceof HTMLElement))
      )
        throw new TypeError("root must be an HTMLElement");
      cfg.root = value as HTMLElement | undefined;
    } else if (key === "preset") {
      if (!["ember", "mint", "lavender"].includes(String(value)))
        throw new TypeError("Invalid preset");
      cfg.preset = value as Config["preset"];
    } else if (key === "size" || key === "speed" || key === "zIndex") {
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new TypeError(`${key} must be finite`);
      cfg[key] = Math.max(
        key === "size" ? 80 : key === "zIndex" ? 0 : 0.25,
        Math.min(
          key === "size" ? 220 : key === "zIndex" ? 2147483000 : 1.5,
          value,
        ),
      );
    } else if (key === "surfaces") {
      if (typeof value !== "string" || value.length > 300)
        throw new TypeError("Invalid surfaces");
      if (typeof document !== "undefined") {
        try {
          document.querySelector(value);
        } catch {
          throw new TypeError("Invalid surfaces selector");
        }
      }
      cfg.surfaces = value;
    } else if (key === "maxFPS") {
      if (value !== 30 && value !== 60)
        throw new TypeError("maxFPS must be 30 or 60");
      cfg.maxFPS = value;
    } else {
      if (typeof value !== "boolean")
        throw new TypeError(`${key} must be boolean`);
      if (
        key === "hatchOnStart" ||
        key === "interaction" ||
        key === "sparks" ||
        key === "respectReducedMotion"
      )
        cfg[key] = value;
    }
  }
  return cfg;
}
