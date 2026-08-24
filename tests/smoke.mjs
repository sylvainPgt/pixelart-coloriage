import path from "node:path";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

const bananaTargets = Array.from({ length: 16 * 16 }, (_, index) => {
  const x = index % 16;
  const y = Math.floor(index / 16);
  if (y >= 5 && y <= 10 && x >= 3 && x <= 12 && x + y >= 11 && x + y <= 21) return 2;
  if ((x === 6 || x === 10) && y === 7) return 1;
  if (y === 9 && x >= 7 && x <= 9) return 3;
  return 0;
});

await page.route("**/api/generate-pattern", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      project: {
        version: 2,
        name: "Banane souriante",
        width: 16,
        height: 16,
        palette: ["#fffaf0", "#18172d", "#ffd25c", "#ff875c", "#61d889", "#7868e6"],
        targets: bananaTargets,
      },
    }),
  });
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("main").waitFor();
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/mosaipix-desktop.png", fullPage: false });
  await page.locator(".idea-panel").screenshot({ path: "artifacts/mosaipix-idea-panel.png" });

  assert(await page.locator(".hero-pixel-grid > span").count() === 256, "Le héros doit être un vrai motif 16 × 16.");
  assert(await page.locator(".pixel-heart").count() === 0, "L’ancien cœur vectoriel ne doit plus exister.");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("heading", { name: "What do you want to create?" }).waitFor();
  assert(await page.locator("html").getAttribute("lang") === "en", "Le sélecteur anglais doit mettre à jour la langue du document.");
  await page.getByRole("button", { name: "FR", exact: true }).click();
  await page.getByRole("tab", { name: "Une idée" }).waitFor();

  const correctCell = page.locator('.pixel-grid button[aria-label*="Couleur cible 2"]').first();
  await correctCell.click();
  await page.locator(".progress-label b").filter({ hasNotText: "0%" }).waitFor();
  await page.getByRole("button", { name: "Annuler" }).click();
  await page.locator(".progress-label b").filter({ hasText: "0%" }).waitFor();

  await page.getByRole("button", { name: "Gomme" }).click();
  await correctCell.click();
  assert((await correctCell.getAttribute("aria-label"))?.includes("vide"), "La gomme doit laisser une cellule vide.");

  const invalidRequest = await page.request.post(`${baseUrl}/api/generate-pattern`, {
    data: { prompt: "x", style: "cute", detail: "classic" },
  });
  assert(invalidRequest.status() === 400, "La route IA doit refuser les descriptions invalides.");

  await page.getByPlaceholder("Une banane souriante, un chat astronaute…").fill("Une banane souriante");
  await page.getByRole("button", { name: "Créer mon pixel art" }).click();
  await page.getByText("Banane souriante", { exact: true }).waitFor();
  assert(!(await page.getByRole("button", { name: "Pipette" }).isVisible()), "Les outils avancés doivent être masqués au départ.");

  await page.getByRole("tab", { name: "Une photo" }).click();
  await page.locator('input[type="file"]').setInputFiles(path.resolve("assets/assets_demo.png"));
  await page.getByRole("button", { name: "Simple 12 × 12" }).click();
  await page.getByRole("button", { name: "Créer mon pixel art" }).click();
  await page.locator(".pixel-grid button").nth(143).waitFor();
  assert(await page.locator(".pixel-grid button").count() === 144, "La grille simple doit contenir 144 cellules.");
  assert(await page.locator(".palette .swatch").count() <= 8, "La palette générée doit respecter la limite demandée.");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const layout = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  assert(layout.documentWidth <= layout.viewportWidth + 1, "La page mobile ne doit pas déborder horizontalement.");
  const hasErrorOverlay = await page.evaluate(() => Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay")));
  assert(!hasErrorOverlay, "Aucune erreur applicative ne doit recouvrir la page.");
  assert(browserErrors.length === 0, `Erreurs navigateur : ${browserErrors.join(" | ")}`);
  await page.screenshot({ path: "artifacts/mosaipix-mobile.png", fullPage: true });

  console.log("Mosaipix: bilingual pixel-art creation, AI flow, image quantization, drawing and mobile layout passed.");
} finally {
  await browser.close();
}
