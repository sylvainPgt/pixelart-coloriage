import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch(process.env.CI ? { headless: true } : { channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", serviceWorkers: "allow" });
const page = await context.newPage();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(`${baseUrl}/fr/studio`, { waitUntil: "networkidle", timeout: 30_000 });
  const manifest = await (await page.request.get(`${baseUrl}/manifest.webmanifest`)).json();
  assert(manifest.id === "/" && manifest.start_url === "/fr/studio" && manifest.display === "standalone", "Le manifeste doit démarrer dans le studio français.");
  assert(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), "Une icône adaptative 512 × 512 est requise.");
  for (const asset of [...manifest.icons, ...manifest.screenshots]) {
    assert((await page.request.get(new URL(asset.src, baseUrl).toString())).ok(), `La ressource PWA ${asset.src} doit être disponible.`);
  }

  const serviceWorker = await (await page.request.get(`${baseUrl}/sw.js`)).text();
  assert(serviceWorker.includes('CACHE_VERSION = "v5"'), "Le cache PWA doit utiliser la nouvelle version.");
  assert(serviceWorker.includes('"/fr/studio"') && serviceWorker.includes('"/en/studio"'), "Les deux studios doivent être préchargés hors connexion.");
  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    await ready.update();
    return Boolean(ready);
  });
  assert(registration, "Le service worker doit être actif.");
  await page.reload({ waitUntil: "networkidle" });
  assert(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), "Le studio doit être piloté par le service worker.");

  await context.setOffline(true);
  const offlineStudio = await context.newPage();
  await offlineStudio.goto(`${baseUrl}/fr/studio`, { waitUntil: "domcontentloaded" });
  await offlineStudio.getByRole("heading", { level: 1, name: "Que veux-tu créer ?" }).waitFor();
  await offlineStudio.getByRole("tab", { name: "Un modèle" }).click();
  await offlineStudio.getByRole("button", { name: /Fusée cosmique/ }).click();
  await offlineStudio.getByRole("application", { name: /Grille de coloriage 16 par 16/ }).waitFor();
  assert(await offlineStudio.locator("canvas.pixel-canvas").count() === 1, "Un modèle doit rester jouable hors connexion.");
  await offlineStudio.close();
  console.log("Mosaipix: install assets, localized studio shell and offline template flow passed.");
} finally {
  await context.setOffline(false).catch(() => undefined);
  await browser.close();
}
