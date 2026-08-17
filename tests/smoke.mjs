import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(process.env.BASE_URL || "http://localhost:3000", { waitUntil: "networkidle" });
  await page.locator(".pixel-grid button").first().hover();
  await page.mouse.down();
  await page.mouse.up();
  await page.locator(".progress-label b").filter({ hasNotText: "0%" }).waitFor();

  await page.getByRole("button", { name: "Une idée" }).click();
  await page.getByPlaceholder("Un petit robot dans l'espace…").fill("Un robot dans l'espace");
  await page.getByRole("button", { name: "Générer" }).click();
  await page.getByText("Un robot dans l'espace", { exact: true }).waitFor();

  console.log("Pixel painting and text generation journeys passed.");
} finally {
  await browser.close();
}
