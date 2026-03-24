import API_CONFIG, { API_BASE_URL } from "@/config/apiconfig";
import { JiraIssue, JiraProject } from "@/types/jira";
import { AdminTestCase } from "./adminService";



// Backend Configuration


// Helper function for API requests
const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as {
      message?: string;
      detail?: unknown;
    };
    const detail = error.detail;
    let msg: string;
    if (typeof detail === "string") msg = detail;
    else if (Array.isArray(detail))
      msg = detail
        .map((d) =>
          typeof d === "object" && d && "msg" in d
            ? String((d as { msg: string }).msg)
            : String(d),
        )
        .join("; ");
    else msg = error.message || `API Error: ${response.statusText}`;
    throw new Error(msg);
  }

  return response.json();
};

// Mock data for demo — replace with real Axios calls when backend is ready
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Read session token from multiple possible storage keys
const getSessionToken = () => {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('jira_session') || localStorage.getItem('jira_token') || null;
  } catch (e) { return null; }
};

const getSessionExp = () => {
  try {
    if (typeof window === 'undefined') return null;
    const exp = localStorage.getItem('jira_session_exp') || localStorage.getItem('jira_token_exp');
    return exp ? Number(exp) : null;
  } catch (e) { return null; }
};

export const api = {
  async postmanStartSession(apiKey: string): Promise<{
    session_token: string;
    email: string;
    display_name: string;
  }> {
    if (!apiKey?.trim()) throw new Error("API key is required");
    return apiCall("/postman/start-session", {
      method: "POST",
      body: JSON.stringify({ api_key: apiKey.trim() }),
    });
  },

  async postmanLoginWithApiKey(apiKey: string): Promise<{ success: boolean; token?: string; error?: string }> {
    await delay(400);
    if (!apiKey) {
      return { success: false, error: "API key is required" };
    }
    try {
      const session = getSessionToken();
      if (!session) {
        return {
          success: false,
          error: "Jira session required for this path — use Start with Postman on the main flow, or sign in with Jira first.",
        };
      }
      const response = await apiCall("/postman/connect", {
        method: "POST",
        headers: {
          "x-session-token": session,
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (response) {
        // Save token to localStorage for subsequent requests
        // store under both variations to be tolerant of casing
        try {
          localStorage.setItem("postman_apikey", apiKey);
          localStorage.setItem("postman_apiKey", apiKey);
        } catch (e) {
          /* ignore */
        }
        api.getPostmanCollections(); // prefetch collections after login
        return { success: true };
      }
      return { success: false, error: "Login failed" };
    } catch (err) {
      console.error("postmanLoginWithApiKey failed", err);
      return { success: false, error: err instanceof Error ? err.message : "Login failed" };
    }
  },

  async getPostmanWorkspaces(): Promise<
    | { workspaces: Array<{ id: string; name: string; type?: string }> }
    | { error: string }
  > {
    try {
      const session = getSessionToken();
      if (!session) {
        return { error: "Please sign in with your Postman API key first." };
      }
      const response = await apiCall("/postman/workspaces", {
        method: "GET",
        headers: { "x-session-token": session },
      });
      return { workspaces: response.workspaces || [] };
    } catch (err) {
      console.error("getPostmanWorkspaces failed", err);
      return {
        error: err instanceof Error ? err.message : "Failed to load workspaces",
      };
    }
  },

  async getPostmanCollections(
    workspaceId?: string,
  ): Promise<{ collections: Array<{ id: string; name: string; createdAt?: string }> } | { error: string }> {

    try {
      const session = getSessionToken();
      if (!session) {
        return { error: "Please sign in with your Postman API key first." };
      }
      const qs = workspaceId
        ? `?workspace=${encodeURIComponent(workspaceId)}`
        : "";
      const response = await apiCall(`/postman/collections${qs}`, {
        method: 'GET',
        headers: {
          'x-session-token': session
        },
      });

      // backend may return { collections: [...] } or an array
      const raw = Array.isArray(response) ? response : (response.collections && Array.isArray(response.collections) ? response.collections : null);
      if (raw) {
        return {
          collections: raw.map((c: { id?: string; _id?: string; name?: string; title?: string; createdAt?: string; createdAtDate?: string }) => ({
            id: c.id || c._id || String(c.id),
            name: c.name || c.title || `Collection ${c.id}`,
            createdAt: c.createdAt || c.createdAtDate
          }))
        };
      }
      return { collections: [] };
    } catch (err) {
      console.error('getPostmanCollections failed', err);
      return { error: err instanceof Error ? err.message : 'Failed to load collections' };
    }
  },

  async getPostmanCollection(collectionId: string, apiKey?: string): Promise<{ collection: Record<string, unknown> } | { error: string }> {
    if (!collectionId) return { error: "collectionId is required" };
    const key = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('postman_apikey') : null);
    if (!key) return { error: "API key required" };

    try {
      const session = getSessionToken();
      if (!session) {
        return { error: "Please sign in with your Postman API key first." };
      }
      const response = await apiCall(`/postman/collection?collectionId=${encodeURIComponent(collectionId)}`, {
        method: 'GET',
        headers: {
          'x-session-token': session
        },
      });

      if (response && (response.collection || response.data || response)) {
        // prefer response.collection
        const col = response.collection || response.data || response;
        return { collection: col };
      }
    } catch (err) {
      console.error('getPostmanCollection failed', err);
    }

    // fallback mock
    await delay(200);
    return { collection: { id: collectionId, name: `Collection ${collectionId}`, items: [], createdAt: new Date().toLocaleString() } };
  },

  // === ORIGINAL JIRA APIS ===
  async getProjects(): Promise<JiraProject[]> {

    const session = getSessionToken();
    if (!session) {
      throw new Error("Please authenticate with Jira first (session token required)");
    }
    const sessionExp = getSessionExp();
    if (sessionExp && sessionExp <= Date.now()) {
      throw new Error("Jira session has expired. Please re-authenticate.");
    }

    try {
      console.debug("getProjects: calling backend", { url: `${API_BASE_URL}/jira/projects`, sessionPresent: !!session });
      const headers: Record<string, string> = { "x-session-token": session };

      const response = await apiCall("/jira/projects", {
        method: "GET",
        headers,
      });

      console.debug("getProjects: raw response", response);

      // backend may return { projects: [...] } or an array directly
      const rawProjects = Array.isArray(response) ? response : (response.projects && Array.isArray(response.projects) ? response.projects : null);
      if (rawProjects) {
        const mapped: JiraProject[] = rawProjects.map((p: {
          uuid?: string;
          entityId?: string;
          id?: string;
          key?: string;
          projectKey?: string;
          name?: string;
          avatarUrls?: {
            "48x48"?: string;
            "24x24"?: string;
            "16x16"?: string;
            "32x32"?: string;
          };
          projectTypeKey?: string;
          simplified?: boolean;
          style?: string;
          isPrivate?: boolean;
        }) => ({
          id: p.uuid || p.entityId || p.id || p.key || `${p.name}`,
          key: p.key || p.projectKey || "",
          name: p.name || "",
          avatarUrls: {
            "48x48": p.avatarUrls?.["48x48"] || "",
            "24x24": p.avatarUrls?.["24x24"] || "",
            "16x16": p.avatarUrls?.["16x16"] || "",
            "32x32": p.avatarUrls?.["32x32"] || "",
          },
          projectTypeKey: p.projectTypeKey || "software",
          simplified: p.simplified || false,
          style: p.style || "classic",
          isPrivate: p.isPrivate || false,
          entityId: p.entityId || p.uuid || p.id || "",
        }));
        return mapped;
      }

      // unexpected shape
      console.warn("getProjects: unexpected response shape", response);
      return [];
    } catch (err) {
      console.error("getProjects: backend request failed", err);
      throw err;
    }

  },

  async getIssues(project: string): Promise<JiraIssue[]> {
    const session = getSessionToken();
    if (!session) {
      throw new Error("Please authenticate with Jira first (session token required)");
    }
    const sessionExp = getSessionExp();
    if (sessionExp && sessionExp <= Date.now()) {
      throw new Error("Jira session has expired. Please re-authenticate.");
    }

    try {
      const response = await apiCall(`/jira/issues?project=${encodeURIComponent(project)}`, {
        method: "GET",
        headers: {
          "x-session-token": session,
        },
      });

      // backend may return { issues: [...] } or an array directly
      const rawIssues = Array.isArray(response) ? response : (response.issues && Array.isArray(response.issues) ? response.issues : null);
      if (rawIssues) {
        // Normalize issues to include a `fields` object expected by the UI
        const mapped = rawIssues.map((iss) => {
          const id = iss.id || iss.key || `${project}-${Math.random().toString(36).slice(2, 8)}`;
          const key = iss.key || (iss.fields && iss.fields.issuekey) || `${project}-${iss.id}`;
          const summary = iss.fields?.summary || iss.summary || "";
          const description = iss.fields?.description || iss.description || "";
          const statusName = iss.fields?.status?.name || iss.fields?.statusCategory?.name || iss.status || "To Do";
          const priority = { name: iss.fields?.priority?.name || iss.priority || "Medium" };

          return {
            id,
            key,
            fields: {
              summary,
              description,
              statusCategory: { name: iss.fields?.statusCategory?.name || statusName },
              priority,
              issuekey: key,
            },
          };
        });

        return mapped as unknown as JiraIssue[];
      }
      console.warn("getIssues: unexpected response shape", response);
    } catch (err) {
      console.error("getIssues: backend request failed", err);
    }

    // Fallback to mock data
    await delay(800);
    return [];
  },

  async generateTestcases(jira_project_name: string, issueDescriptions: string[] = []) {
    if (!jira_project_name) {
      throw new Error("Jira project name is required to generate test cases");
    }
    const session = getSessionToken();
    if (session) {
      try {
        const body = {
          issue_descriptions: issueDescriptions,
          think: false
        };

        const response = await apiCall(`/testcases?jira_project_name=${encodeURIComponent(jira_project_name)}`, {
          method: "POST",
          headers: {
            "x-session-token": session,
          },
          body: JSON.stringify(body),
        });

        return response;
      } catch (err) {
        console.error("generateTestcases backend call failed", err);
        throw new Error("Failed to generate test cases");
      }
    } else {
      throw new Error("Please authenticate with Jira first (session token required)");
    }
  },

  async getPostmanRequests(collectionId: string): Promise<{ requests: Array<Record<string, unknown>> } | { error: string }> {
    if (!collectionId) return { error: "collectionId is required" };

    const session = getSessionToken();
    if (!session) {
      return { error: "Please sign in with your Postman API key first." };
    }

    try {
      const response = await apiCall(`/postman/requests?collectionId=${encodeURIComponent(collectionId)}`, {
        method: "GET",
        headers: {
          "x-session-token": session,
        },
      });

      const raw = Array.isArray(response) ? response : (response.requests && Array.isArray(response.requests) ? response.requests : null);
      if (raw) {
        return { requests: raw };
      }
      return { requests: response ? [response] : [] };
    } catch (err) {
      console.error("getPostmanRequests failed", err);
      return { error: err instanceof Error ? err.message : "Failed to fetch requests" };
    }
  },

  async generateTestcasesFromPostman(payload: {
    postman_workspace: string;
    postman_workspace_id?: string;
    postman_collection: string;
    postman_collection_id: string;
    endpoints: Array<{
      id?: string;
      name?: string;
      method: string;
      url: string;
      description?: string;
      body_excerpt?: string;
      folder?: string;
    }>;
    think?: boolean;
  }) {
    const session = getSessionToken();
    if (!session) {
      throw new Error("Please sign in with your Postman API key first.");
    }
    return apiCall("/postman/testcases/generate", {
      method: "POST",
      headers: { "x-session-token": session },
      body: JSON.stringify({ ...payload, think: payload.think ?? false }),
    });
  },

  async downloadTestcasesExcel(
    testcases: unknown[],
    filename = "testcases.xlsx",
  ): Promise<void> {
    const session = getSessionToken();
    const url = `${API_BASE_URL}/export-excel`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { "x-session-token": session } : {}),
      },
      body: JSON.stringify(testcases),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: unknown };
      const d = err.detail;
      throw new Error(
        typeof d === "string" ? d : `Excel export failed (${res.status})`,
      );
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  },

  async adminLogin(username: string, password: string): Promise<{ session_token?: string; }> {
    try {
      // apiCall returns parsed JSON or throws on non-2xx
      const data = await apiCall("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      // accept multiple possible shapes: { session }, { token }, { session_token }, { data: { session } }
      const session = data?.session || data?.token || data?.session_token || data?.sessionToken || data?.data?.session;
      if (session) {
        localStorage.setItem("admin_session", session);
        return { session_token: session };
      }

      console.error("adminLogin: unexpected response shape", data);
      throw new Error("Invalid admin credentials");
    } catch (err) {
      console.error("adminLogin failed", err);
      throw err instanceof Error ? err : new Error("Failed to login as admin");
    }
  },

  async getInfo() {
    try {
      const session = getSessionToken();
      const response = await apiCall("/jira/info", {
        method: "GET",
        headers: session ? { "x-session-token": session } : undefined,
      });
      return response;
    } catch (err) {
      console.error("getInfo failed", err);
      return { error: err instanceof Error ? err.message : "Failed to fetch info" };
    }
  },
  async generateEndpoints(
    testcases: string[],
    options: {
      collection_id?: string;
      collection_name?: string;
      workspace_id?: string;
      think?: boolean;
    } = {},
  ) {
    if (!Array.isArray(testcases) || testcases.length === 0) {
      throw new Error("No testcases provided");
    }
    const session = getSessionToken();
    if (!session) throw new Error("Please authenticate with Jira first (session token required)");
    try {
      const body = {
        testcases,
        collection_id: options.collection_id || "",
        collection_name: options.collection_name || "Generated HTTP Requests",
        workspace_id: options.workspace_id || "",
        think: false,
      };

      const response = await apiCall(`/postman/generate-http`, {
        method: "POST",
        headers: {
          "x-session-token": session,
        },
        body: JSON.stringify(body),
      });
      return response;
    } catch (err) {
      console.error("generateEndpoints failed", err);
      throw err;
    }
  },

  // Upload testcases as a JSON file (multipart/form-data)
  async generateEndpointsFile(
    testcases: Array<Record<string, unknown>>,
    options: {
      collection_id?: string;
      collection_name?: string;
      workspace_id?: string;
      think?: boolean;
    } = {},
  ) {
    if (!Array.isArray(testcases) || testcases.length === 0) {
      throw new Error("No testcases provided");
    }
    const session = getSessionToken();
    if (!session) throw new Error("Please authenticate with Jira first (session token required)");

    try {
      // Build payload matching the requested JSON file shape and send as JSON
      const payload = {
        testcases,
        collection_id: options.collection_id || "",
        collection_name: options.collection_name || "Generated HTTP Requests",
        workspace_id: options.workspace_id || "",
        think: !!options.think,
      };

      const response = await apiCall(`/postman/generate-http`, {
        method: "POST",
        headers: {
          "x-session-token": session,
        },
        body: JSON.stringify(payload),
      });

      return response;


    } catch (err) {
      console.error("generateEndpointsFile failed", err);
      throw err;
    }
  },


  async exportExcel(data: AdminTestCase[]): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const session = getSessionToken();
      if (!session) {
        return { success: false, error: "Please authenticate with Jira first (session token required)" };
      }
      const response = await apiCall("/export-excel", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return { success: true, url: response.url };
    } catch (err) {
      console.error("exportExcel failed", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to export Excel" };
    }
  },

  async generateTestScript(collectionId: string, requestId: string, language: string, agentFramework: string) {
    if (!collectionId || !requestId || !language || !agentFramework) {
      throw new Error("Missing required parameters for generating test script");
    }
    const session = getSessionToken();
    if (!session) {
      throw new Error("Please authenticate with Jira first (session token required)");
    }
    try {
      const body = {
        collectionId: collectionId,
        requestId: requestId,
        language,
        agentFramework: agentFramework,
      };

      const response = await apiCall("/postman/generate", {
        method: "POST",
        headers: {
          "x-session-token": session,
        },
        body: JSON.stringify(body),
      });
      return response;
    } catch (err) {
      console.error("generateTestScript failed", err);
      throw new Error(err instanceof Error ? err.message : "Failed to generate test script");
    }
  }
};
