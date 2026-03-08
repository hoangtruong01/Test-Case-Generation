import { Platform } from "react-native";

/**
 * Resolve backend URL based on platform:
 * - Android emulator: 10.0.2.2 (maps to host machine's localhost)
 * - iOS simulator / web: localhost works directly
 * - Physical device: set EXPO_PUBLIC_API_URL env var to your LAN IP
 */
function resolveBaseUrl(): string {
  // Allow explicit override via Expo env (e.g. EXPO_PUBLIC_API_URL=http://192.168.1.5:8000)
  const envUrl =
    typeof process !== "undefined" &&
    (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  if (!__DEV__) return "https://your-production-url.com";

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
