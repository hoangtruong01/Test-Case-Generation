import { API_BASE_URL } from "../config/apiconfig";
import {
  JiraIssue,
  JiraProject,
  PostmanCollection,
  PostmanCollectionDetail,
  AdminUser,
  AdminStats,
  AdminTestCase,
} from "../types/jira";
import { storage } from "./storage";

/**
 * Generic API caller — adapted from web's apiCall.
 * Uses expo-secure-store via storage service instead of localStorage.
 */
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.detail || `API Error: ${response.statusText}`,
    );
  }

  return response.json();
};

/**
 * Helper to attach session header to requests
 */
const withSession = async (
  extraHeaders?: Record<string, string>,
): Promise<Record<string, string>> => {
  const session = await storage.getJiraSession();
  if (!session) {
    throw new Error("Please authenticate with Jira first");
  }
  return {
    "x-session-token": session,
    ...extraHeaders,
  };
};

/**
 * Helper to attach auth token header to admin requests
 */
const withAuth = async (
  extraHeaders?: Record<string, string>,
): Promise<Record<string, string>> => {
  const token = await storage.getAuthToken();
  if (!token) {
    throw new Error("Please sign in as admin first");
  }
  return {
    "x-session-token": token,
    ...extraHeaders,
  };
};

export const api = {
  // ==================== JIRA ====================

  async getProjects(): Promise<JiraProject[]> {
    const headers = await withSession();

    const response = await apiCall("/jira/projects", {
      method: "GET",
      headers,
    });

    const rawProjects = Array.isArray(response)
      ? response
      : response.projects && Array.isArray(response.projects)
        ? response.projects
        : null;

    if (rawProjects) {
      return rawProjects.map(
        (p: Record<string, unknown>): JiraProject => ({
          uuid: (p.uuid as string) || "",
          id:
            (p.uuid as string) ||
            (p.entityId as string) ||
            (p.id as string) ||
            (p.key as string) ||
            "",
          key: (p.key as string) || (p.projectKey as string) || "",
          name: (p.name as string) || "",
          avatarUrls: {
            "48x48": (p.avatarUrls as Record<string, string>)?.["48x48"] || "",
            "24x24": (p.avatarUrls as Record<string, string>)?.["24x24"] || "",
            "16x16": (p.avatarUrls as Record<string, string>)?.["16x16"] || "",
            "32x32": (p.avatarUrls as Record<string, string>)?.["32x32"] || "",
          },
          projectTypeKey: (p.projectTypeKey as string) || "software",
          simplified: (p.simplified as boolean) || false,
          style: (p.style as string) || "classic",
          isPrivate: (p.isPrivate as boolean) || false,
          entityId:
            (p.entityId as string) ||
            (p.uuid as string) ||
            (p.id as string) ||
            "",
        }),
      );
    }

    return [];
  },

  async getIssues(projectKey: string): Promise<JiraIssue[]> {
    const headers = await withSession();

    const response = await apiCall(
      `/jira/issues?project=${encodeURIComponent(projectKey)}`,
      { method: "GET", headers },
    );

    const rawIssues = Array.isArray(response)
      ? response
      : response.issues && Array.isArray(response.issues)
        ? response.issues
        : null;

    if (rawIssues) {
      return rawIssues.map((iss: Record<string, unknown>): JiraIssue => {
        const fields = iss.fields as Record<string, unknown> | undefined;
        const id = (iss.id as string) || (iss.key as string) || "";
        const key =
          (iss.key as string) ||
          (fields?.issuekey as string) ||
          `${projectKey}-${iss.id}`;
        const summary =
          (fields?.summary as string) || (iss.summary as string) || "";
        const description =
          (fields?.description as string) || (iss.description as string) || "";
        const statusCat = fields?.statusCategory as Record<string, unknown>;
        const statusName =
          (statusCat?.name as string) ||
          (fields?.status as Record<string, string>)?.name ||
          (iss.status as string) ||
          "To Do";

        return {
          id,
          key,
          expand: "",
          self: "",
          fields: {
            summary,
            description,
            statusCategory: {
              self: "",
              id: 0,
              key: "",
              colorName: "",
              name: statusName,
            },
          },
        };
      });
    }

    return [];
  },

  // ==================== POSTMAN ====================

  async postmanLoginWithApiKey(
    apiKey: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!apiKey) return { success: false, error: "API key is required" };
    if (!apiKey.startsWith("PMAK-"))
      return { success: false, error: "Invalid API key" };

    try {
      const headers = await withSession();
      await apiCall("/postman/connect", {
        method: "POST",
        headers,
        body: JSON.stringify({ api_key: apiKey }),
      });
      await storage.setPostmanApiKey(apiKey);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Login failed",
      };
    }
  },

  async getPostmanCollections(): Promise<{
    collections?: PostmanCollection[];
    error?: string;
  }> {
    try {
      const headers = await withSession();
      const response = await apiCall("/postman/collections", {
        method: "GET",
        headers,
      });

      const raw = Array.isArray(response)
        ? response
        : response.collections && Array.isArray(response.collections)
          ? response.collections
          : null;

      if (raw) {
        return {
          collections: raw.map(
            (c: Record<string, string>): PostmanCollection => ({
              id: c.id || c._id || "",
              name: c.name || c.title || `Collection ${c.id}`,
              createdAt: c.createdAt || c.createdAtDate,
            }),
          ),
        };
      }
      return { collections: [] };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to load collections",
      };
    }
  },

  async getPostmanCollection(
    collectionId: string,
  ): Promise<{ collection?: PostmanCollectionDetail; error?: string }> {
    if (!collectionId) return { error: "collectionId is required" };

    try {
      const headers = await withSession();
      const response = await apiCall(
        `/postman/collection?collectionId=${encodeURIComponent(collectionId)}`,
        { method: "GET", headers },
      );

      const col = response.collection || response.data || response;
      return { collection: col };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Failed to load collection",
      };
    }
  },

  // ==================== TEST GENERATION ====================

  async generateTestcases(
    collectionId: string,
    issueDescriptions: string[] = [],
  ): Promise<unknown> {
    if (!collectionId) throw new Error("collectionId is required");

    const headers = await withSession();
    return apiCall(
      `/testcases?collectionId=${encodeURIComponent(collectionId)}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          issue_descriptions: issueDescriptions,
          think: false,
        }),
      },
    );
  },

  // ==================== AUTH (User/Admin) ====================

  async login(
    username: string,
    password: string,
  ): Promise<{
    success: boolean;
    user?: { name: string; email: string; role: "admin" };
    token?: string;
    error?: string;
  }> {
    try {
      const response = (await apiCall("/admin/login", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })) as Record<string, unknown>;

      const token =
        (response.token as string | undefined) ||
        (response.access_token as string | undefined);

      if (!token) {
        return {
          success: false,
          error: "Login succeeded but no auth token was returned",
        };
      }

      return {
        success: true,
        user: {
          name: username.trim(),
          email: `${username.trim()}@admin.local`,
          role: "admin",
        },
        token,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Login failed",
      };
    }
  },

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiCall("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Request failed",
      };
    }
  },

  // ==================== ADMIN ====================

  async getAdminStats(): Promise<AdminStats> {
    const headers = await withAuth();
    return apiCall("/admin/stats", { method: "GET", headers });
  },

  async getUsers(): Promise<AdminUser[]> {
    const headers = await withAuth();
    const response = await apiCall("/admin/users", { method: "GET", headers });
    return Array.isArray(response) ? response : response.users || [];
  },

  async softDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await withAuth();
      await apiCall(`/admin/users/${encodeURIComponent(userId)}/soft-delete`, {
        method: "PATCH",
        headers,
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete user",
      };
    }
  },

  async restoreUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await withAuth();
      await apiCall(`/admin/users/${encodeURIComponent(userId)}/restore`, {
        method: "PATCH",
        headers,
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to restore user",
      };
    }
  },

  async getAdminTestCases(projectKey?: string): Promise<AdminTestCase[]> {
    const headers = await withAuth();
    const query = projectKey ? `?projectKey=${encodeURIComponent(projectKey)}` : "";
    const response = await apiCall(`/admin/testcases${query}`, {
      method: "GET",
      headers,
    });
    return Array.isArray(response) ? response : response.testcases || [];
  },
};
