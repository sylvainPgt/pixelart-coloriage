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

let failPatternGeneration = false;
await page.route("**/api/generate-pattern", async (route) => {
  if (failPatternGeneration) {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Le motif n’a pas pu être créé." }),
    });
    return;
  }
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

await page.route("**/api/free-images/*", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "image/png",
    path: path.resolve("assets/assets_demo.png"),
  });
});

await page.route("**/api/free-images", async (route) => {
  const images = Array.from({ length: 3 }, (_, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index}`,
    title: `Chat astronaute ${index + 1}`,
    creator: "Artiste de test",
    attribution: "Image de test",
    license: "CC BY",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://openverse.org/",
    previewUrl: `/api/free-images/00000000-0000-4000-8000-00000000000${index}`,
  }));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ images }),
  });
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("main").waitFor();
  const manifestResponse = await page.request.get(`${baseUrl}/manifest.webmanifest`);
  assert(manifestResponse.status() === 200, "Le manifeste de l’application doit être disponible.");
  const manifest = await manifestResponse.json();
  assert(manifest.display === "standalone" && manifest.icons.length >= 1, "Le manifeste doit permettre l’installation de Mosaipix.");
  const serviceWorkerResponse = await page.request.get(`${baseUrl}/sw.js`);
  assert(serviceWorkerResponse.status() === 200, "Le service worker doit être disponible.");
  assert(serviceWorkerResponse.headers()["cache-control"]?.includes("no-cache"), "Le service worker ne doit pas être servi depuis un cache obsolète.");
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
  assert(await page.locator(".editor-card").count() === 0, "L’éditeur doit rester masqué avant la première création.");

  const invalidRequest = await page.request.post(`${baseUrl}/api/generate-pattern`, {
    data: { prompt: "x", style: "cute", detail: "classic" },
  });
  assert(invalidRequest.status() === 400, "La route IA doit refuser les descriptions invalides.");

  await page.getByPlaceholder("Une banane souriante, un chat astronaute…").fill("Un chat astronaute");
  await page.getByRole("button", { name: "Voir 3 images libres" }).click();
  await page.locator(".free-image-results article").nth(2).waitFor();
  assert(await page.locator(".free-image-results article").count() === 3, "La recherche libre doit proposer exactement trois images.");
  await page.locator(".free-image-results").screenshot({ path: "artifacts/mosaipix-free-images.png" });
  await page.getByRole("button", { name: "Utiliser Chat astronaute 1" }).click();
  await page.locator(".selected-image-credit").waitFor();
  assert(await page.getByRole("tab", { name: "Une photo" }).getAttribute("aria-selected") === "true", "Choisir une image libre doit ouvrir les réglages photo.");
  await page.getByRole("tab", { name: "Une idée" }).click();
  await page.getByPlaceholder("Une banane souriante, un chat astronaute…").fill("Une banane souriante");
  await page.getByRole("button", { name: "Créer mon pixel art" }).click();
  await page.locator(".editor-card").waitFor();
  await page.locator(".canvas-wrap > header").getByText("Banane souriante", { exact: true }).waitFor();
  assert(await page.locator('.pixel-grid button[tabindex="0"]').count() === 1, "Une seule cellule doit être présente dans l’ordre de tabulation.");
  assert(!(await page.getByRole("button", { name: "Pipette" }).isVisible()), "Les outils avancés doivent être masqués au départ.");

  await page.locator(".palette .swatch").nth(2).click();
  const correctCell = page.locator('.pixel-grid button[aria-label*="Couleur cible 3"]').first();
  await correctCell.click();
  await page.locator(".progress-label b").filter({ hasNotText: "0%" }).waitFor();
  await page.getByRole("button", { name: "Annuler" }).click();
  await page.locator(".progress-label b").filter({ hasText: "0%" }).waitFor();

  await page.getByRole("button", { name: "Gomme" }).click();
  await correctCell.click();
  assert((await correctCell.getAttribute("aria-label"))?.includes("vide"), "La gomme doit laisser une cellule vide.");

  await page.getByRole("button", { name: "Modifier la source" }).click();
  failPatternGeneration = true;
  await page.getByPlaceholder("Une banane souriante, un chat astronaute…").fill("Un chat astronaute");
  await page.getByRole("button", { name: "Créer mon pixel art" }).click();
  await page.getByText("L’IA n’a pas trouvé un dessin assez lisible cette fois.", { exact: false }).waitFor();
  assert(await page.locator(".free-image-results article").count() === 3, "Un échec IA doit proposer automatiquement trois images libres.");
  failPatternGeneration = false;

  await page.getByRole("tab", { name: "Une photo" }).click();
  await page.locator('input[type="file"]').setInputFiles(path.resolve("assets/assets_demo.png"));
  await page.locator(".canvas-wrap > header").getByText("Banane souriante", { exact: true }).waitFor();
  assert(await page.locator(".pixel-grid button").count() === 256, "Choisir une photo ne doit pas lancer la transformation avant validation.");
  await page.locator(".advanced-controls summary").click();
  await page.getByRole("slider", { name: "Nombre précis de couleurs" }).fill("16");
  assert(await page.getByRole("slider", { name: "Nombre précis de couleurs" }).inputValue() === "16", "Le réglage avancé doit accepter une palette de 16 couleurs.");
  await page.getByRole("button", { name: "Simple 12 × 12" }).click();
  await page.getByRole("button", { name: "Créer mon pixel art" }).click();
  await page.locator(".pixel-grid button").nth(143).waitFor();
  assert(await page.locator(".pixel-grid button").count() === 144, "La grille simple doit contenir 144 cellules.");
  assert(await page.locator(".palette .swatch").count() <= 16, "La palette générée doit respecter la limite avancée demandée.");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Plein écran" }).click();
  await page.locator(".editor-card.editor-focus").waitFor();
  await page.getByRole("button", { name: "Ajuster à l’écran" }).click();
  const fittedGrid = await page.evaluate(() => {
    const grid = document.querySelector(".pixel-grid")?.getBoundingClientRect();
    const viewport = document.querySelector(".pixel-grid-viewport")?.getBoundingClientRect();
    return Boolean(grid && viewport && grid.width <= viewport.width + 1 && grid.height <= viewport.height + 1);
  });
  assert(fittedGrid, "Ajuster à l’écran doit réellement contenir la grille sur mobile.");
  await page.getByRole("button", { name: "Fermer le plein écran" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const layout = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  assert(layout.documentWidth <= layout.viewportWidth + 1, "La page mobile ne doit pas déborder horizontalement.");
  const hasErrorOverlay = await page.evaluate(() => Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay")));
  assert(!hasErrorOverlay, "Aucune erreur applicative ne doit recouvrir la page.");
  assert(browserErrors.length === 0, `Erreurs navigateur : ${browserErrors.join(" | ")}`);
  await page.screenshot({ path: "artifacts/mosaipix-mobile.png", fullPage: true });

  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Reprendre" }).waitFor();
  assert(await page.locator(".editor-card").count() === 0, "Un projet sauvegardé doit être proposé sans imposer immédiatement l’éditeur.");
  await page.getByRole("button", { name: "Reprendre" }).click();
  await page.locator(".editor-card").waitFor();

  console.log("Mosaipix: progressive bilingual creation, saved-project resume, drawing and mobile full-screen layout passed.");
} finally {
  await browser.close();
}
