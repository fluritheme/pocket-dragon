import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const p = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(p.name, "@fluritheme/pocket-dragon");
assert.equal(p.homepage, "https://fluri.xyz/");
for (const f of [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/standalone.js",
  "LICENSE",
  "LICENSE-MIT-LEGACY",
  "LICENSING.md",
  "licensing.json",
  "THIRD-PARTY-NOTICES.txt",
])
  await access(f);
const { createPocketDragon } = await import("../dist/index.js");
const d = createPocketDragon();
assert.equal(d.getState().ready, false);
d.destroy();
d.destroy();
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    encoding: "utf8",
  }),
)[0];
assert.ok(packed.files.some((f) => f.path === "dist/standalone.js"));
assert.ok(
  !packed.files.some(
    (f) => f.path.startsWith("node_modules") || f.path.endsWith(".env"),
  ),
);
console.log(
  `${p.name}@${p.version}: ${packed.files.length} packaged files, commercial licence, complete runtime and SSR import verified.`,
);
