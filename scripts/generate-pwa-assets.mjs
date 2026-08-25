import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("public/icons", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

const mark = '<path fill="#fff" d="M10 12h8v40h-8zm8 8h8v12h-8zm8 8h8v12h-8zm8-8h8v12h-8zm8-8h8v40h-8z"/>';

async function renderIcon(path, size, maskable = false) {
  await page.setViewportSize({ width: size, height: size });
  const content = maskable
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" fill="#604bd8"/><g transform="translate(8.96 8.96) scale(.72)">${mark}</g></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" fill="#604bd8"/><g transform="translate(-2 0)">${mark}</g></svg>`;
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}</style>${content}`);
  await page.screenshot({ path, clip: { x: 0, y: 0, width: size, height: size } });
}

await renderIcon("public/icons/mosaipix-192.png", 192);
await renderIcon("public/icons/mosaipix-512.png", 512);
await renderIcon("public/icons/mosaipix-maskable-512.png", 512, true);
await renderIcon("app/apple-icon.png", 180);

await browser.close();
