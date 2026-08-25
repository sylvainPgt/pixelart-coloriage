export async function hasNetworkConnection(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.onLine) return false;
  try {
    const response = await fetch(`/manifest.webmanifest?connectivity=${Date.now()}`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
