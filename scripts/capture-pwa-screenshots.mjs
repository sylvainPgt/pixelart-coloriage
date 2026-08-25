import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
mkdirSync("public/screenshots", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function capture(path, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#studio").scrollIntoViewIfNeeded();
  await page.screenshot({ path, type: "jpeg", quality: 84, fullPage: false });
  await context.close();
}

await capture("public/screenshots/mosaipix-desktop.jpg", 1280, 720);
await capture("public/screenshots/mosaipix-mobile.jpg", 390, 844);
await browser.close();
