// Bundle once, render several check frames (brief §8.2). Seconds or frames:
// node scripts/stills.mjs 0.3s 1.5s 2.9s 3.3s 412   -> out/check/*.png
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = new URL("..", import.meta.url).pathname;
// Playwright's headless shell; Remotion's own download is slow on this network.
export const browserExecutable = process.env.REMOTION_BROWSER
  ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const serveUrl = await bundle({ entryPoint: root + "src/index.ts", publicDir: root + "public" });
const composition = await selectComposition({ serveUrl, id: "VideoB", browserExecutable });
mkdirSync(root + "out/check", { recursive: true });
for (const arg of process.argv.slice(2)) {
  const frame = arg.endsWith("s") ? Math.round(parseFloat(arg) * composition.fps) : Number(arg);
  const output = `${root}out/check/f${String(frame).padStart(4, "0")}.png`;
  await renderStill({ serveUrl, composition, frame, output, overwrite: true, browserExecutable });
  console.log(output);
}
