import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const launchOptions = process.env.CI
  ? { headless: true }
  : { channel: "chrome", headless: true };
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: { width: 1024, height: 768 },
  locale: "fr-FR",
  serviceWorkers: "allow",
});
const page = await context.newPage();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30_000 });

  const manifestResponse = await page.request.get(`${baseUrl}/manifest.webmanifest`);
  assert(manifestResponse.ok(), "Le manifeste PWA doit être disponible.");
  const manifest = await manifestResponse.json();
  assert(manifest.id === "/" && manifest.start_url === "/fr" && manifest.display === "standalone", "Le manifeste doit décrire une application installable stable en français.");
  assert(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), "Une icône adaptative 512 × 512 est requise.");
  assert(manifest.screenshots?.some((screenshot) => screenshot.form_factor === "wide"), "Une capture ordinateur est requise pour l’installation.");
  assert(manifest.screenshots?.some((screenshot) => screenshot.form_factor === "narrow"), "Une capture mobile est requise pour l’installation.");

  for (const asset of [...manifest.icons, ...manifest.screenshots]) {
    const response = await page.request.get(new URL(asset.src, baseUrl).toString());
    assert(response.ok(), `La ressource PWA ${asset.src} doit être disponible.`);
  }

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await page.reload({ waitUntil: "networkidle" });
  assert(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), "La page doit être pilotée par le service worker après rechargement.");

  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt");
    Object.defineProperties(event, {
      prompt: { value: async () => undefined },
      userChoice: { value: Promise.resolve({ outcome: "dismissed" }) },
    });
    window.dispatchEvent(event);
  });
  await page.locator(".pwa-install-card").waitFor();
  const installClose = page.locator(".pwa-install-close");
  assert(Boolean(await installClose.getAttribute("aria-label")), "La fermeture de la proposition d’installation doit avoir un nom accessible.");
  await installClose.click();
  await page.locator(".pwa-install-card").waitFor({ state: "hidden" });

  let aiRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/generate-image")) aiRequests += 1;
  });
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page.getByText("Mode hors connexion", { exact: true }).waitFor();

  const offlinePage = await context.newPage();
  await offlinePage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await offlinePage.locator("main").waitFor();
  await offlinePage.close();

  await page.getByRole("tab", { name: "Un modèle" }).click();
  await page.getByRole("button", { name: /Fusée cosmique/ }).click();
  assert(await page.locator(".pixel-grid button").count() === 256, "Un modèle 16 × 16 doit fonctionner hors connexion.");

  await page.getByRole("tab", { name: "Une photo" }).click();
  await page.locator('input[type="file"]').setInputFiles(path.resolve("assets/assets_demo.png"));
  await page.getByRole("button", { name: "Créer mon pixel art" }).click();
  assert(await page.locator(".pixel-grid button").count() === 256, "Une photo locale doit être transformable hors connexion.");

  await page.getByRole("tab", { name: "Une idée" }).click();
  await page.getByPlaceholder("Une banane souriante, un chat astronaute…").fill("Un chat astronaute");
  await page.getByRole("button", { name: "Créer mon pixel art" }).click();
  await page.getByText("La création IA nécessite Internet.", { exact: false }).waitFor();
  assert(aiRequests === 0, "La création IA hors connexion ne doit pas lancer de requête inutile.");

  console.log("Mosaipix: installation assets, service worker and useful offline flows passed.");
} finally {
  await context.setOffline(false).catch(() => undefined);
  await browser.close();
}
