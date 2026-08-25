"use client";

import { useEffect, useState } from "react";
import { hasNetworkConnection } from "@/lib/connectivity";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "mosaipix-install-dismissed";

export default function PwaRegister() {
  const [online, setOnline] = useState(true);
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosDevice, setIosDevice] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const detectStandalone = () => setStandalone(displayMode.matches || navigatorWithStandalone.standalone === true);
    const detectLocale = () => setLocale(document.documentElement.lang === "en" ? "en" : "fr");
    const detectOnline = async () => {
      setOnline(await hasNetworkConnection());
    };
    const handleConnectivityChange = () => void detectOnline();
    const userAgent = navigator.userAgent;
    const ipadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

    setIosDevice(/iPhone|iPad|iPod/.test(userAgent) || ipadDesktopMode);
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "1");
    detectStandalone();
    detectLocale();
    void detectOnline();

    const languageObserver = new MutationObserver(detectLocale);
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };

    window.addEventListener("online", handleConnectivityChange);
    window.addEventListener("offline", handleConnectivityChange);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", detectStandalone);

    let registration: ServiceWorkerRegistration | null = null;
    const register = async () => {
      if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const watchWorker = (worker: ServiceWorker | null) => {
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        };
        registration.addEventListener("updatefound", () => watchWorker(registration?.installing ?? null));
        await registration.update();
      } catch {
        // Installation support should never interrupt the studio.
      }
    };

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      languageObserver.disconnect();
      window.removeEventListener("online", handleConnectivityChange);
      window.removeEventListener("offline", handleConnectivityChange);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("load", register);
      displayMode.removeEventListener("change", detectStandalone);
    };
  }, []);

  const tr = (french: string, english: string) => locale === "fr" ? french : english;
  const canOfferInstall = online && !standalone && !dismissed && (installPrompt !== null || iosDevice);

  function dismissInstall() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!installPrompt) {
      setShowIosHelp(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setStandalone(true);
    else dismissInstall();
  }

  return (
    <>
      {!online ? <div className="pwa-status offline" role="status"><span aria-hidden="true">●</span><b>{tr("Mode hors connexion", "Offline mode")}</b><span>{tr("Modèles, photos locales et projets sauvegardés restent disponibles. L’IA reviendra avec Internet.", "Templates, local photos, and saved projects remain available. AI will return when you reconnect.")}</span></div> : null}
      {updateReady && online ? <div className="pwa-status update" role="status"><b>{tr("Une nouvelle version est prête.", "A new version is ready.")}</b><button onClick={() => window.location.reload()}>{tr("Actualiser", "Refresh")}</button></div> : null}
      {canOfferInstall ? <aside className="pwa-install-card" aria-label={tr("Installer Mosaipix", "Install Mosaipix")}>
        <button className="pwa-install-close" aria-label={tr("Masquer la proposition d’installation", "Hide install suggestion")} onClick={dismissInstall}>×</button>
        <div className="pwa-install-mark" aria-hidden="true">M</div>
        <div><strong>{tr("Installe Mosaipix", "Install Mosaipix")}</strong><p>{tr("Retrouve ton studio comme une app, même hors connexion.", "Keep your studio like an app, even offline.")}</p></div>
        <button className="pwa-install-action" onClick={() => void install()}>{iosDevice ? tr("Voir comment", "Show me how") : tr("Installer", "Install")}</button>
        {showIosHelp ? <p className="pwa-ios-help">{tr("Dans Safari, touche Partager puis « Sur l’écran d’accueil ».", "In Safari, tap Share, then “Add to Home Screen”.")}</p> : null}
      </aside> : null}
    </>
  );
}
