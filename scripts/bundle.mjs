import { build } from "esbuild";
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/standalone.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "eof",
});
