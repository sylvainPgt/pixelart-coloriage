import path from "node:path";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(process.env.BASE_URL || "http://127.0.0.1:3000", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("main").waitFor();
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/pixelia-desktop.png", fullPage: false });

  assert(await page.locator(".hero-pixel-grid > span").count() === 256, "Le héros doit être un vrai motif 16 × 16.");
  assert(await page.locator(".pixel-heart").count() === 0, "L’ancien cœur vectoriel ne doit plus exister.");
  await page.getByRole("tab", { name: "Modèles" }).waitFor();

  const correctCell = page.locator('.pixel-grid button[aria-label*="Couleur cible 2"]').first();
  await correctCell.click();
  await page.locator(".progress-label b").filter({ hasNotText: "0%" }).waitFor();
  await page.getByRole("button", { name: "Annuler" }).click();
  await page.locator(".progress-label b").filter({ hasText: "0%" }).waitFor();

  await page.getByRole("button", { name: "Gomme" }).click();
  await correctCell.click();
  assert((await correctCell.getAttribute("aria-label"))?.includes("vide"), "La gomme doit laisser une cellule vide.");

  await page.getByRole("tab", { name: "Motif guidé" }).click();
  await page.getByPlaceholder("Une fusée violette dans l’espace…").fill("Un robot dans l’espace");
  await page.getByRole("button", { name: "Créer le motif" }).click();
  await page.getByText("Un robot dans l’espace", { exact: true }).waitFor();

  await page.getByRole("tab", { name: "Une image" }).click();
  await page.locator('input[type="file"]').setInputFiles(path.resolve("assets/assets_demo.png"));
  await page.getByRole("button", { name: "Mettre à jour la grille" }).waitFor({ state: "visible" });
  await page.getByLabel("Colonnes").fill("12");
  await page.getByLabel("Lignes").fill("10");
  await page.getByRole("button", { name: "Mettre à jour la grille" }).click();
  await page.locator(".pixel-grid button").nth(119).waitFor();
  assert(await page.locator(".pixel-grid button").count() === 120, "La grille 12 × 10 doit contenir 120 cellules.");
  assert(await page.locator(".palette .swatch").count() <= 8, "La palette générée doit respecter la limite demandée.");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const layout = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  assert(layout.documentWidth <= layout.viewportWidth + 1, "La page mobile ne doit pas déborder horizontalement.");
  const hasErrorOverlay = await page.evaluate(() => Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay")));
  assert(!hasErrorOverlay, "Aucune erreur applicative ne doit recouvrir la page.");
  assert(browserErrors.length === 0, `Erreurs navigateur : ${browserErrors.join(" | ")}`);
  await page.screenshot({ path: "artifacts/pixelia-mobile.png", fullPage: true });

  console.log("Pixelia: hero, drawing tools, guided motif, image quantization and mobile layout passed.");
} finally {
  await browser.close();
}
