import API_CONFIG, { API_BASE_URL } from "@/config/apiconfig";
import { JiraIssue, JiraProject } from "@/types/Jira";


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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }

  return response.json();
};

// Mock data for demo — replace with real Axios calls when backend is ready
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async postmanLoginWithApiKey(apiKey: string): Promise<{ success: boolean; token?: string; error?: string }> {
    await delay(400);
    if (!apiKey) {
      return { success: false, error: "API key is required" };
    }

    // Demo acceptance: keys starting with PMAK- are valid
    if (!apiKey.startsWith("PMAK-")) {
      return { success: false, error: "Invalid API key" };
    }
    try {
      const session = localStorage.getItem("jira_session");
      if (!session) {
        return { success: false, error: "Please authenticate with Jira first (session token required)" };
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
        localStorage.setItem("postman_apikey", apiKey);
        api.getPostmanCollections(); // prefetch collections after login
        return { success: true };
      }
      return { success: false, error: "Login failed" };
    } catch (err) {
      console.error("postmanLoginWithApiKey failed", err);
      return { success: false, error: err instanceof Error ? err.message : "Login failed" };
    }
  },

  async getPostmanCollections(): Promise<{ collections: Array<{ id: string; name: string; createdAt?: string }> } | { error: string }> {

    try {
      const session = localStorage.getItem("jira_session");
      if (!session) {
        return { error: "Please authenticate with Jira first (session token required)" };
      }
      // Call backend endpoint with X-Api-Key header (matches provided backend swagger)
      const response = await apiCall('/postman/collections', {
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
      const session = localStorage.getItem("jira_session");
      if (!session) {
        return { error: "Please authenticate with Jira first (session token required)" };
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

    const session = localStorage.getItem("jira_session");
    if (!session) {
      throw new Error("Please authenticate with Jira first (session token required)");
    }
    const sessionExp = typeof window !== "undefined" ? localStorage.getItem("jira_session_exp") : null;
    if (sessionExp && Number(sessionExp) <= Date.now()) {
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
    // Require session token and projectKey to fetch issues from backend
    const session = localStorage.getItem("jira_session");
    if (!session) {
      throw new Error("Please authenticate with Jira first (session token required)");
    }
    const sessionExp = typeof window !== "undefined" ? localStorage.getItem("jira_session_exp") : null;
    if (sessionExp && Number(sessionExp) <= Date.now()) {
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

  async generateTestcases(collectionId: string, issueDescriptions: string[] = []) {
    if (!collectionId) {
      throw new Error("collectionId is required to generate test cases");
    }
    const session = localStorage.getItem("jira_session");
    if (session) {
      try {
        const body = {
          issue_descriptions: issueDescriptions,
          think: false
        };

        const response = await apiCall(`/testcases?collectionId=${encodeURIComponent(collectionId)}`, {
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

    const session = localStorage.getItem("jira_session");
    if (!session) {
      return { error: "Please authenticate with Jira first (session token required)" };
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

};
