import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

const KEYS = {
  JIRA_SESSION: "jira_session",
  JIRA_SESSION_EXP: "jira_session_exp",
  JIRA_USER: "jira_user",
  JIRA_TOKEN: "jira_token",
  JIRA_TOKEN_EXP: "jira_token_exp",
  POSTMAN_API_KEY: "postman_apikey",
} as const;

/**
 * Secure storage wrapper — replaces localStorage from web app.
 * Uses expo-secure-store on native, falls back to localStorage on web.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (isWeb) return localStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // silently fail
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // silently fail
    }
  },

  // Jira-specific helpers
  async getJiraSession(): Promise<string | null> {
    const session = await this.get(KEYS.JIRA_SESSION);
    if (!session) return null;
    const exp = await this.get(KEYS.JIRA_SESSION_EXP);
    if (exp && Number(exp) <= Date.now()) {
      await this.clearJira();
      return null;
    }
    return session;
  },

  async setJiraSession(session: string, expiresInMs = 3600000): Promise<void> {
    await this.set(KEYS.JIRA_SESSION, session);
    await this.set(KEYS.JIRA_SESSION_EXP, String(Date.now() + expiresInMs));
  },

  async setJiraUser(user: {
    name: string;
    email: string;
    avatar?: string;
  }): Promise<void> {
    await this.set(KEYS.JIRA_USER, JSON.stringify(user));
  },

  async getJiraUser(): Promise<{
    name: string;
    email: string;
    avatar?: string;
  } | null> {
    const raw = await this.get(KEYS.JIRA_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setJiraToken(token: string, expiresInSeconds = 3600): Promise<void> {
    await this.set(KEYS.JIRA_TOKEN, token);
    await this.set(
      KEYS.JIRA_TOKEN_EXP,
      String(Date.now() + expiresInSeconds * 1000),
    );
  },

  async getJiraToken(): Promise<string | null> {
    const token = await this.get(KEYS.JIRA_TOKEN);
    if (!token) return null;
    const exp = await this.get(KEYS.JIRA_TOKEN_EXP);
    if (exp && Number(exp) <= Date.now()) {
      await this.remove(KEYS.JIRA_TOKEN);
      await this.remove(KEYS.JIRA_TOKEN_EXP);
      return null;
    }
    return token;
  },

  async clearJira(): Promise<void> {
    await Promise.all([
      this.remove(KEYS.JIRA_SESSION),
      this.remove(KEYS.JIRA_SESSION_EXP),
      this.remove(KEYS.JIRA_USER),
      this.remove(KEYS.JIRA_TOKEN),
      this.remove(KEYS.JIRA_TOKEN_EXP),
    ]);
  },

  // Postman helpers
  async getPostmanApiKey(): Promise<string | null> {
    return this.get(KEYS.POSTMAN_API_KEY);
  },

  async setPostmanApiKey(key: string): Promise<void> {
    await this.set(KEYS.POSTMAN_API_KEY, key);
  },

  async clearPostman(): Promise<void> {
    await this.remove(KEYS.POSTMAN_API_KEY);
  },

  async clearAll(): Promise<void> {
    await Promise.all([this.clearJira(), this.clearPostman()]);
  },
};

export { KEYS };
