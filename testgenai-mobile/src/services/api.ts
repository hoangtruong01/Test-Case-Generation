import { API_BASE_URL } from "../config/apiconfig";
import {
  JiraIssue,
  JiraProject,
  PostmanCollection,
  PostmanCollectionDetail,
  PostmanWorkspace,
  AdminUser,
  AdminStats,
  AdminTestCase,
  AdminProject,
  AdminJiraToken,
  AdminTestSuite,
} from "../types/jira";
import { encode as encodeBase64 } from "base-64";
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

const mapAdminTestCase = (row: Record<string, unknown>): AdminTestCase => {
  const testsuite = Array.isArray(row.testsuite)
    ? (row.testsuite as Record<string, unknown>[])
    : [];

  return {
    id: String(row.id || ""),
    projectKey: String(row.jira_project_name || "Unknown"),
    projectName: String(row.jira_project_name || "Unknown"),
    issueKey: String(row.user || row.id || "N/A"),
    requirement: undefined,
    tests: testsuite.map((t, index) => {
      const rawSteps = Array.isArray(t.test_steps)
        ? (t.test_steps as Record<string, unknown>[])
        : [];

      return {
        id: String(t.test_case_id || `${row.id}-${index}`),
        title: String(t.title || t.test_case_id || "Untitled test"),
        type: "Functional",
        description:
          typeof t.description === "string" ? t.description : undefined,
        steps: rawSteps
          .map((s) => String(s.action || "").trim())
          .filter(Boolean),
        url: undefined,
        method: undefined,
      };
    }),
    createdAt: String(row.created_at || ""),
  };
};

const shouldUseMockFallback = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("404") || msg.includes("not found");
};

let mockAdminProjects: AdminProject[] = [
  {
    id: "p1",
    projectName: "Postbot Automation",
    description: "Automation testing for Postman collections",
    owner: "khoa",
    totalTestSuites: 8,
    createdAt: "2024-01-10",
  },
  {
    id: "p2",
    projectName: "AI Test Generator",
    description: "Generate API test cases using AI",
    owner: "anna",
    totalTestSuites: 5,
    createdAt: "2024-02-01",
  },
];

let mockAdminJiraTokens: AdminJiraToken[] = [
  {
    id: "tok_1",
    username: "khoa",
    jiraAccountId: "5f8d123abc001",
    refreshToken: "ATJIRA-7d93f4d8b92d9e123456abcdef0987",
    expiresAt: "2026-05-10",
    createdAt: "2025-12-01",
  },
  {
    id: "tok_2",
    username: "anna",
    jiraAccountId: "5f8d123abc002",
    refreshToken: "ATJIRA-2c93a2f9a8b1a222223456abcdef987",
    expiresAt: "2026-04-01",
    createdAt: "2025-12-20",
  },
];

let mockAdminTestSuites: AdminTestSuite[] = [
  {
    id: "s1",
    suiteName: "User Authentication",
    projectId: "p1",
    projectName: "Auth Service",
    description: "Login and token validation",
    totalTestCases: 12,
    createdAt: "2024-03-01",
  },
  {
    id: "s2",
    suiteName: "Payment API",
    projectId: "p2",
    projectName: "Payment Service",
    description: "Payment gateway coverage",
    totalTestCases: 8,
    createdAt: "2024-03-05",
  },
];

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

  async getPostmanCollections(workspaceId?: string): Promise<{
    collections?: PostmanCollection[];
    error?: string;
  }> {
    try {
      const headers = await withSession();
      const query = workspaceId
        ? `?workspace=${encodeURIComponent(workspaceId)}`
        : "";
      const response = await apiCall(`/postman/collections${query}`, {
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

  async getPostmanWorkspaces(): Promise<{
    workspaces?: PostmanWorkspace[];
    error?: string;
  }> {
    try {
      const headers = await withSession();
      const response = await apiCall("/postman/workspaces", {
        method: "GET",
        headers,
      });

      const raw = Array.isArray(response)
        ? response
        : response.workspaces && Array.isArray(response.workspaces)
          ? response.workspaces
          : null;

      if (raw) {
        return {
          workspaces: raw.map(
            (w: Record<string, unknown>): PostmanWorkspace => ({
              id: String(w.id || ""),
              name: String(w.name || "Untitled workspace"),
              type: typeof w.type === "string" ? w.type : undefined,
            }),
          ),
        };
      }

      return { workspaces: [] };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to load workspaces",
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

  exportTestcasesToCsv(
    testcases: Array<{
      title: string;
      description?: string;
      test_steps?: string[];
      expected_result?: string;
      status?: string;
    }>,
  ): string {
    const escapeCell = (value: unknown): string => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const headers = [
      "Title",
      "Description",
      "Test Steps",
      "Expected Result",
      "Status",
    ];

    const rows = testcases.map((tc) => [
      escapeCell(tc.title),
      escapeCell(tc.description || ""),
      escapeCell((tc.test_steps || []).join(" | ")),
      escapeCell(tc.expected_result || ""),
      escapeCell(tc.status || ""),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  },

  async downloadTestcasesExcel(
    rows: Array<Record<string, unknown>>,
  ): Promise<{ filename: string; base64: string }> {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("No testcases to export");
    }

    const headers = await withSession();
    const response = await fetch(`${API_BASE_URL}/export-excel`, {
      method: "POST",
      headers,
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      throw new Error(`Excel export failed: ${response.statusText}`);
    }

    const contentDisposition = response.headers.get("content-disposition") || "";
    const nameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
    const filename = nameMatch?.[1] || "testcases.xlsx";

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return { filename, base64: encodeBase64(binary) };
  },

  // ==================== TEST GENERATION ====================

  async generateTestcases(
    jiraProjectName: string,
    issueDescriptions: string[] = [],
  ): Promise<unknown> {
    if (!jiraProjectName) throw new Error("jiraProjectName is required");

    const headers = await withSession();
    return apiCall(
      `/testcases?jira_project_name=${encodeURIComponent(jiraProjectName)}`,
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

  async getPostmanRequests(
    collectionId: string,
  ): Promise<{ requests?: Record<string, unknown>[]; error?: string }> {
    if (!collectionId) return { error: "collectionId is required" };

    try {
      const headers = await withSession();
      const response = await apiCall(
        `/postman/requests?collectionId=${encodeURIComponent(collectionId)}`,
        {
          method: "GET",
          headers,
        },
      );

      const raw = Array.isArray(response)
        ? response
        : response.requests && Array.isArray(response.requests)
          ? response.requests
          : [];

      return { requests: raw as Record<string, unknown>[] };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to load endpoint list",
      };
    }
  },

  async generateEndpoints(
    testcases: Array<Record<string, unknown>>,
    options: {
      collection_id?: string;
      collection_name?: string;
      workspace_id?: string;
      think?: boolean;
    } = {},
  ): Promise<unknown> {
    if (!Array.isArray(testcases) || testcases.length === 0) {
      throw new Error("No testcases provided");
    }

    const headers = await withSession();
    return apiCall("/postman/generate-http", {
      method: "POST",
      headers,
      body: JSON.stringify({
        testcases,
        collection_id: options.collection_id || "",
        collection_name: options.collection_name || "Generated HTTP Requests",
        workspace_id: options.workspace_id || "",
        think: options.think || false,
      }),
    });
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
        (response.session_token as string | undefined) ||
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
    const [users, testCases] = await Promise.all([
      this.getUsers(),
      this.getAdminTestCases(),
    ]);

    const projectMap = new Map<string, number>();
    for (const item of testCases) {
      const key = item.projectKey || "Unknown";
      const current = projectMap.get(key) || 0;
      projectMap.set(key, current + item.tests.length);
    }

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      deletedUsers: users.filter((u) => !u.isActive).length,
      totalTestCases: testCases.reduce((sum, tc) => sum + tc.tests.length, 0),
      projectTestCases: Array.from(projectMap.entries()).map(([k, count]) => ({
        projectKey: k,
        projectName: k,
        count,
      })),
    };
  },

  async getUsers(): Promise<AdminUser[]> {
    const headers = await withAuth();
    const response = await apiCall("/admin/users", { method: "GET", headers });
    const raw = Array.isArray(response) ? response : response.users || [];

    return raw.map(
      (u: Record<string, unknown>): AdminUser => ({
        id: String(u.id || ""),
        name: String(u.user || "Unknown"),
        email: `${String(u.user || "unknown")}@jira.local`,
        role: "user",
        isActive: !Boolean(u.is_banned),
        createdAt: String(u.last_logged_in || new Date().toISOString()),
      }),
    );
  },

  async softDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await withAuth();
      await apiCall("/admin/users/ban", {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId }),
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
      await apiCall("/admin/users/unban", {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId }),
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
    const response = await apiCall("/admin/testcases", {
      method: "GET",
      headers,
    });

    const raw = Array.isArray(response) ? response : response.testcases || [];
    const mapped = raw.map((row: Record<string, unknown>) =>
      mapAdminTestCase(row),
    );

    if (!projectKey) return mapped;
    return mapped.filter((tc: AdminTestCase) => tc.projectKey === projectKey);
  },

  async getAdminProjects(): Promise<AdminProject[]> {
    try {
      const headers = await withAuth();
      const response = await apiCall("/admin/projects", { method: "GET", headers });
      const raw = Array.isArray(response) ? response : response.projects || [];

      return raw.map((p: Record<string, unknown>): AdminProject => ({
        id: String(p.id || ""),
        projectName: String(p.projectName || p.project_name || "Untitled"),
        description: String(p.description || ""),
        owner: String(p.owner || p.user || "system"),
        totalTestSuites: Number(p.totalTestSuites || p.total_test_suites || 0),
        createdAt: String(p.createdAt || p.created_at || new Date().toISOString()),
      }));
    } catch (err) {
      if (shouldUseMockFallback(err)) return [...mockAdminProjects];
      throw err;
    }
  },

  async createAdminProject(payload: {
    projectName: string;
    description: string;
    owner: string;
  }): Promise<AdminProject> {
    try {
      const headers = await withAuth();
      const response = (await apiCall("/admin/projects", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })) as Record<string, unknown>;

      return {
        id: String(response.id || ""),
        projectName: String(response.projectName || payload.projectName),
        description: String(response.description || payload.description),
        owner: String(response.owner || payload.owner),
        totalTestSuites: Number(response.totalTestSuites || 0),
        createdAt: String(response.createdAt || new Date().toISOString()),
      };
    } catch (err) {
      if (!shouldUseMockFallback(err)) throw err;

      const created: AdminProject = {
        id: `p${Date.now()}`,
        projectName: payload.projectName,
        description: payload.description,
        owner: payload.owner,
        totalTestSuites: 0,
        createdAt: new Date().toISOString(),
      };
      mockAdminProjects = [created, ...mockAdminProjects];
      return created;
    }
  },

  async updateAdminProject(
    id: string,
    payload: Partial<Pick<AdminProject, "projectName" | "description" | "owner">>,
  ): Promise<AdminProject> {
    try {
      const headers = await withAuth();
      const response = (await apiCall(`/admin/projects/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      })) as Record<string, unknown>;

      return {
        id,
        projectName: String(response.projectName || payload.projectName || "Untitled"),
        description: String(response.description || payload.description || ""),
        owner: String(response.owner || payload.owner || "system"),
        totalTestSuites: Number(response.totalTestSuites || 0),
        createdAt: String(response.createdAt || new Date().toISOString()),
      };
    } catch (err) {
      if (!shouldUseMockFallback(err)) throw err;

      const current = mockAdminProjects.find((p) => p.id === id);
      if (!current) throw new Error("Project not found");
      const updated: AdminProject = { ...current, ...payload };
      mockAdminProjects = mockAdminProjects.map((p) => (p.id === id ? updated : p));
      return updated;
    }
  },

  async deleteAdminProject(id: string): Promise<{ success: boolean }> {
    try {
      const headers = await withAuth();
      await apiCall(`/admin/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      return { success: true };
    } catch (err) {
      if (!shouldUseMockFallback(err)) throw err;

      mockAdminProjects = mockAdminProjects.filter((p) => p.id !== id);
      return { success: true };
    }
  },

  async getAdminJiraTokens(): Promise<AdminJiraToken[]> {
    try {
      const headers = await withAuth();
      const response = await apiCall("/admin/jira-tokens", {
        method: "GET",
        headers,
      });
      const raw = Array.isArray(response) ? response : response.tokens || [];

      return raw.map((t: Record<string, unknown>): AdminJiraToken => ({
        id: String(t.id || ""),
        username: String(t.username || t.user || "unknown"),
        jiraAccountId: String(t.jiraAccountId || t.jira_account_id || ""),
        refreshToken: String(t.refreshToken || t.refresh_token || ""),
        expiresAt: String(t.expiresAt || t.expires_at || ""),
        createdAt: String(t.createdAt || t.created_at || new Date().toISOString()),
      }));
    } catch (err) {
      if (shouldUseMockFallback(err)) return [...mockAdminJiraTokens];
      throw err;
    }
  },

  async revokeAdminJiraToken(id: string): Promise<{ success: boolean }> {
    try {
      const headers = await withAuth();
      await apiCall(`/admin/jira-tokens/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      return { success: true };
    } catch (err) {
      if (!shouldUseMockFallback(err)) throw err;
      mockAdminJiraTokens = mockAdminJiraTokens.filter((t) => t.id !== id);
      return { success: true };
    }
  },

  async getAdminTestSuites(): Promise<AdminTestSuite[]> {
    try {
      const headers = await withAuth();
      const response = await apiCall("/admin/test-suites", {
        method: "GET",
        headers,
      });
      const raw = Array.isArray(response) ? response : response.testSuites || [];

      return raw.map((s: Record<string, unknown>): AdminTestSuite => ({
        id: String(s.id || ""),
        suiteName: String(s.suiteName || s.suite_name || "Untitled suite"),
        projectId: String(s.projectId || s.project_id || ""),
        projectName: String(s.projectName || s.project_name || "Unknown"),
        description: String(s.description || ""),
        totalTestCases: Number(s.totalTestCases || s.total_test_cases || 0),
        createdAt: String(s.createdAt || s.created_at || new Date().toISOString()),
      }));
    } catch (err) {
      if (shouldUseMockFallback(err)) return [...mockAdminTestSuites];
      throw err;
    }
  },

  async createAdminTestSuite(payload: {
    suiteName: string;
    projectId: string;
    projectName: string;
    description: string;
  }): Promise<AdminTestSuite> {
    try {
      const headers = await withAuth();
      const response = (await apiCall("/admin/test-suites", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })) as Record<string, unknown>;

      return {
        id: String(response.id || ""),
        suiteName: String(response.suiteName || payload.suiteName),
        projectId: String(response.projectId || payload.projectId),
        projectName: String(response.projectName || payload.projectName),
        description: String(response.description || payload.description),
        totalTestCases: Number(response.totalTestCases || 0),
        createdAt: String(response.createdAt || new Date().toISOString()),
      };
    } catch (err) {
      if (!shouldUseMockFallback(err)) throw err;

      const created: AdminTestSuite = {
        id: `s${Date.now()}`,
        suiteName: payload.suiteName,
        projectId: payload.projectId,
        projectName: payload.projectName,
        description: payload.description,
        totalTestCases: 0,
        createdAt: new Date().toISOString(),
      };
      mockAdminTestSuites = [created, ...mockAdminTestSuites];
      return created;
    }
  },

  async updateAdminTestSuite(
    id: string,
    payload: Partial<Pick<AdminTestSuite, "suiteName" | "projectId" | "projectName" | "description">>,
  ): Promise<AdminTestSuite> {
    try {
      const headers = await withAuth();
      const response = (await apiCall(`/admin/test-suites/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      })) as Record<string, unknown>;

      return {
        id,
        suiteName: String(response.suiteName || payload.suiteName || "Untitled suite"),
        projectId: String(response.projectId || payload.projectId || ""),
        projectName: String(response.projectName || payload.projectName || "Unknown"),
        description: String(response.description || payload.description || ""),
        totalTestCases: Number(response.totalTestCases || 0),
        createdAt: String(response.createdAt || new Date().toISOString()),
      };
    } catch (err) {
      if (!shouldUseMockFallback(err)) throw err;

      const current = mockAdminTestSuites.find((s) => s.id === id);
      if (!current) throw new Error("Test suite not found");
      const updated: AdminTestSuite = { ...current, ...payload };
      mockAdminTestSuites = mockAdminTestSuites.map((s) => (s.id === id ? updated : s));
      return updated;
    }
  },

  async deleteAdminTestSuite(id: string): Promise<{ success: boolean }> {
    try {
      const headers = await withAuth();
      await apiCall(`/admin/test-suites/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      return { success: true };
    } catch (err) {
      if (!shouldUseMockFallback(err)) throw err;
      mockAdminTestSuites = mockAdminTestSuites.filter((s) => s.id !== id);
      return { success: true };
    }
  },
};
