import path from "node:path";
import { chromium } from "playwright";

const browser = await chromium.launch(process.env.CI ? { headless: true } : { channel: "chrome", headless: true });
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const landing = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
  const browserErrors = [];
  landing.on("pageerror", (error) => browserErrors.push(error.message));
  await landing.goto(baseUrl, { waitUntil: "domcontentloaded" });
  assert(new URL(landing.url()).pathname === "/fr", "La racine doit rediriger vers la page française.");
  await landing.getByRole("heading", { level: 1, name: /Transforme/ }).waitFor();
  assert(await landing.getByRole("link", { name: /Ouvrir le studio/ }).count() >= 1, "La page d’accueil doit mener clairement au studio.");
  assert(await landing.locator(".product-facts > div").count() === 4, "Les caractéristiques essentielles doivent rester indexables.");
  assert(await landing.locator(".faq-list details").count() === 5, "La FAQ française doit rester publiée.");
  const structuredData = JSON.parse(await landing.locator('script[type="application/ld+json"]').textContent());
  const types = structuredData["@graph"].map((item) => item["@type"]);
  assert(["Organization", "WebSite", "WebApplication", "FAQPage"].every((type) => types.includes(type)), "Les données structurées essentielles doivent être présentes.");

  const manifest = await (await landing.request.get(`${baseUrl}/manifest.webmanifest`)).json();
  assert(manifest.display === "standalone" && manifest.start_url === "/fr/studio", "La PWA doit démarrer directement dans le studio.");
  const sitemap = await (await landing.request.get(`${baseUrl}/sitemap.xml`)).text();
  assert(sitemap.includes("/fr/studio") && sitemap.includes("/en/studio"), "Le sitemap doit publier les deux studios localisés.");

  const studio = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  studio.on("pageerror", (error) => browserErrors.push(error.message));
  await studio.goto(`${baseUrl}/fr/studio`, { waitUntil: "domcontentloaded" });
  await studio.getByRole("heading", { level: 1, name: "Que veux-tu créer ?" }).waitFor();
  assert(await studio.getByRole("tab").count() === 3, "Le studio doit proposer les trois sources de création.");
  assert(await studio.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "L’étape Source ne doit pas déborder sur mobile.");

  await studio.getByRole("tab", { name: "Un modèle" }).click();
  await studio.getByRole("button", { name: /Fusée cosmique/ }).click();
  await studio.getByRole("application", { name: /Grille de coloriage 16 par 16/ }).waitFor();
  assert(await studio.locator("canvas.pixel-canvas").count() === 1, "L’éditeur doit dessiner la grille sur un canvas unique.");
  assert(await studio.getByRole("gridcell").count() === 0, "La grille ne doit plus créer des milliers d’éléments HTML.");
  assert(await studio.getByRole("button", { name: "Agrandir" }).count() === 1, "Le zoom doit être accessible sur mobile.");
  assert(await studio.getByRole("button", { name: "Déplacer" }).count() >= 1, "Le déplacement de la grille doit être disponible.");
  await studio.locator(".mobile-export-button").click();
  await studio.getByRole("dialog", { name: /Exporter/ }).waitFor();
  assert(await studio.locator(".export-sheet-actions button").count() === 4, "L’export mobile doit proposer sauvegarde, grille A4, impression et modèle terminé.");
  assert(await studio.locator(".autosave-status").count() === 1, "Le statut de sauvegarde locale doit être visible dans l’exporteur.");
  await studio.getByRole("button", { name: "Fermer" }).click();
  const coloringCanvas = studio.getByRole("application", { name: /Grille de coloriage 16 par 16/ });
  await coloringCanvas.focus();
  await coloringCanvas.press("Space");
  await studio.getByRole("application", { name: /1 couleur incorrecte/ }).waitFor();

  const photo = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  photo.on("pageerror", (error) => browserErrors.push(error.message));
  await photo.goto(`${baseUrl}/fr/studio`, { waitUntil: "domcontentloaded" });
  await photo.getByRole("tab", { name: "Une photo" }).click();
  await photo.locator('input[type="file"]').setInputFiles(path.resolve("assets/assets_demo.png"));
  await photo.getByRole("heading", { level: 1, name: "Cadre ton image" }).waitFor();
  assert(await photo.getByRole("img", { name: /Zone recadrée/ }).count() === 1, "Une photo doit passer par une étape de cadrage.");
  assert(await photo.getByText("Niveau de détail", { exact: true }).count() === 0, "Le cadrage ne doit pas répéter les réglages de rendu.");
  await photo.getByRole("button", { name: /Portrait/ }).click();
  await photo.getByRole("button", { name: /Continuer vers les réglages/ }).click();
  await photo.getByRole("heading", { level: 1, name: "Prévisualise et ajuste" }).waitFor();
  await photo.getByRole("img", { name: /Aperçu pixelisé/ }).waitFor();
  assert(await photo.locator(".preview-palette span").count() > 1, "L’aperçu doit afficher la palette réellement calculée.");
  await photo.getByText("Réglages avancés", { exact: true }).click();
  assert(await photo.locator(".live-settings-layout").evaluate((element) => element.classList.contains("advanced-tuning")), "L’ouverture des réglages avancés doit activer l’aperçu mobile compact.");
  await photo.getByLabel("Luminosité").scrollIntoViewIfNeeded();
  const stickyPreviewVisible = await photo.locator(".live-render-card").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.top >= 57 && box.top < window.innerHeight * 0.55 && box.bottom > box.top;
  });
  assert(stickyPreviewVisible, "L’aperçu doit rester visible pendant le réglage des curseurs avancés.");
  await photo.getByLabel("Colonnes").fill("64");
  await photo.getByLabel("Lignes").fill("64");
  await photo.getByRole("button", { name: "Utiliser ce rendu" }).click();
  await photo.getByRole("application", { name: /Grille de coloriage 64 par 64/ }).waitFor();
  assert(await photo.locator("canvas.pixel-canvas").count() === 1, "Une grille 64 × 64 doit rester rendue par un seul canvas.");
  const canvasFits = await photo.evaluate(() => {
    const canvas = document.querySelector("canvas.pixel-canvas")?.getBoundingClientRect();
    const host = document.querySelector(".pixel-canvas-host")?.getBoundingClientRect();
    return Boolean(canvas && host && canvas.width <= host.width + 1 && canvas.height <= host.height + 1);
  });
  assert(canvasFits, "La grande grille doit rester contenue dans sa zone de jeu mobile.");
  assert(await photo.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "L’éditeur ne doit pas déborder horizontalement.");

  const english = await browser.newPage({ viewport: { width: 768, height: 1024 }, locale: "en-US" });
  await english.goto(`${baseUrl}/en/studio`, { waitUntil: "domcontentloaded" });
  await english.getByRole("heading", { level: 1, name: "What do you want to create?" }).waitFor();
  assert(await english.title() === "Creation studio | Mosaipix", "Le studio anglais doit avoir un titre localisé sans duplication.");
  assert(browserErrors.length === 0, `Erreurs navigateur : ${browserErrors.join(" | ")}`);
  console.log("Mosaipix: landing, crop flow, custom 64 × 64 canvas and responsive studios passed.");
} finally {
  await browser.close();
}
