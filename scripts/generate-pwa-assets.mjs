import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("public/icons", { recursive: true });
mkdirSync("play-store-assets", { recursive: true });

const androidDensities = {
  mdpi: { legacy: 48, foreground: 108 },
  hdpi: { legacy: 72, foreground: 162 },
  xhdpi: { legacy: 96, foreground: 216 },
  xxhdpi: { legacy: 144, foreground: 324 },
  xxxhdpi: { legacy: 192, foreground: 432 },
};

const purple = "#604bd8";
const tile = '<path fill="#fff8e8" d="M14 10h36v4h4v36h-4v4H14v-4h-4V14h4z"/>';
const monogram = '<path fill="#17162a" d="M18 18h8v4h4v4h4v-4h4v-4h8v28h-8V30h-4v4h-4v-4h-4v16h-8z"/><path fill="#e8487d" d="M30 26h4v4h-4z"/>';

function compositeSvg(size, rounded = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="64" height="64"${rounded ? ' rx="14"' : ""} fill="${purple}"/>${tile}${monogram}</svg>`;
}

function foregroundSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}" shape-rendering="crispEdges"><g transform="translate(22 22)">${tile}${monogram}</g></svg>`;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

async function renderIcon(path, size, svg, transparent = false) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}</style>${svg}`);
  await page.screenshot({ path, clip: { x: 0, y: 0, width: size, height: size }, omitBackground: transparent });
}

await renderIcon("public/icons/mosaipix-192.png", 192, compositeSvg(192, true));
await renderIcon("public/icons/mosaipix-512.png", 512, compositeSvg(512, true));
await renderIcon("public/icons/mosaipix-maskable-512.png", 512, compositeSvg(512));
await renderIcon("app/apple-icon.png", 180, compositeSvg(180, true));
await renderIcon("play-store-assets/app-icon-512.png", 512, compositeSvg(512));

for (const [density, sizes] of Object.entries(androidDensities)) {
  const directory = `android/app/src/main/res/mipmap-${density}`;
  mkdirSync(directory, { recursive: true });
  await renderIcon(`${directory}/ic_launcher.png`, sizes.legacy, compositeSvg(sizes.legacy));
  await renderIcon(`${directory}/ic_launcher_round.png`, sizes.legacy, compositeSvg(sizes.legacy, true));
  await renderIcon(`${directory}/ic_launcher_foreground.png`, sizes.foreground, foregroundSvg(sizes.foreground), true);
}

await browser.close();
