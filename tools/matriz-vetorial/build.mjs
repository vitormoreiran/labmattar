import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, unlink, cp } from "node:fs/promises";
import path from "node:path";

const root = import.meta.dirname;
const outputDirectory = path.join(root, "dist");
const assetsDirectory = path.join(outputDirectory, "assets");
await mkdir(assetsDirectory, { recursive: true });
await cp(path.join(root, "static"), outputDirectory, { recursive: true });

// Content-based names prevent mixing a cached script with a newer stylesheet.
const result = await build({
  absWorkingDir: root,
  entryPoints: { app: "src/app.js", legacy: "src/legacy-entry.jsx" },
  outdir: "dist/assets",
  entryNames: "[name]-[hash]",
  chunkNames: "[name]-[hash]",
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  minify: true,
  sourcemap: false,
  metafile: true,
});

const generatedAssets = new Set(
  Object.keys(result.metafile.outputs).map((file) => path.basename(file)),
);
const stylesheet = await readFile(path.join(root, "src/style.css"), "utf8");
const styleHash = createHash("sha256").update(stylesheet).digest("hex").slice(0, 12);
const styleName = `style-${styleHash}.css`;
await writeFile(path.join(assetsDirectory, styleName), stylesheet);
generatedAssets.add(styleName);

function entryOutput(entryPoint) {
  const entry = Object.entries(result.metafile.outputs).find(
    ([, output]) => output.entryPoint === entryPoint,
  );
  if (!entry) throw new Error(`Missing build entry: ${entryPoint}`);
  return {
    script: `./assets/${path.basename(entry[0])}`,
    css: entry[1].cssBundle && `./assets/${path.basename(entry[1].cssBundle)}`,
  };
}

const app = entryOutput("src/app.js");
const editor = entryOutput("src/legacy-entry.jsx");
for (const [file, replacements] of [
  ["index.html", { APP_SCRIPT: app.script, APP_STYLE: `./assets/${styleName}` }],
  ["legacy.html", { EDITOR_SCRIPT: editor.script, EDITOR_STYLE: editor.css }],
]) {
  let html = await readFile(path.join(root, "src", file), "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    if (!value) throw new Error(`Missing build asset: ${key}`);
    html = html.replaceAll(`{{${key}}}`, value);
  }
  await writeFile(path.join(outputDirectory, file), html);
}

// Remove only obsolete generated files after both pages are ready.
for (const name of await readdir(assetsDirectory)) {
  if (/\.(js|css|map)$/.test(name) && !generatedAssets.has(name)) {
    await unlink(path.join(assetsDirectory, name));
  }
}
console.log("Build complete: dist/");
