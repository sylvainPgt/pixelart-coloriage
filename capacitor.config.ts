import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.osalistudio.mosaipix",
  appName: "Mosaipix",
  webDir: "mobile-shell",
  server: {
    url: "https://mosaipix.com/fr/studio",
    cleartext: false,
    allowNavigation: ["mosaipix.com", "*.mosaipix.com"],
  },
};

export default config;
