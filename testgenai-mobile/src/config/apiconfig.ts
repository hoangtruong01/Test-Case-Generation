import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Resolve backend URL based on platform:
 * - EXPO_PUBLIC_API_URL (if provided) always wins
 * - Expo dev host (LAN IP) is auto-detected when available
 * - Android emulator: 10.0.2.2 (maps to host machine's localhost)
 * - iOS simulator / web: localhost works directly
 */
function resolveBaseUrl(): string {
  // Allow explicit override via Expo env (e.g. EXPO_PUBLIC_API_URL=http://192.168.1.5:8000)
  const envUrl =
    typeof process !== "undefined" &&
    (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (!__DEV__) return "https://your-production-url.com";

  // In Expo dev sessions, hostUri/debuggerHost usually points to the machine
  // running Metro. This lets physical devices reach local backend without
  // requiring EXPO_PUBLIC_API_URL every time.
  const hostUriCandidates = [
    Constants.expoConfig?.hostUri,
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost,
    (
      Constants as unknown as {
        expoGoConfig?: { debuggerHost?: string; developer?: { host?: string } };
      }
    ).expoGoConfig?.debuggerHost,
    (
      Constants as unknown as {
        expoGoConfig?: { debuggerHost?: string; developer?: { host?: string } };
      }
    ).expoGoConfig?.developer?.host,
  ].filter(Boolean) as string[];

  for (const rawHost of hostUriCandidates) {
    const hostname = rawHost.split(":")[0]?.trim();
    if (hostname) {
      return `http://${hostname}:8000`;
    }
  }

  switch (Platform.OS) {
    case "android":
      return "http://10.0.2.2:8000";
    case "ios":
    case "web":
    default:
      return "http://localhost:8000";
  }
}

const API_CONFIG = {
  API_BASE_URL: resolveBaseUrl(),
  jira: {
    login: "/jira/login",
    projects: "/jira/projects",
    issues: "/jira/issues",
  },
};

export const API_BASE_URL = API_CONFIG.API_BASE_URL;

export const POSTMAN_API_KEY_URL = "https://go.postman.co/settings/me/api-keys";

export default API_CONFIG;
