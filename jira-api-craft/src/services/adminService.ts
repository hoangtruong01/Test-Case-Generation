import { API_BASE_URL } from "@/config/apiconfig";

const getSession = () => localStorage.getItem("admin_session") || "";

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-session-token": getSession(),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }
  return response.json();
};

// ── Users ──────────────────────────────────────────
export interface AdminUser {
  id: string;
  user: string;
  is_token_expired: boolean;
  is_banned: boolean;
  last_logged_in: string;
}


export const getUsers = () => apiCall("/admin/users");
export const banUser = (user_id: string) =>
  apiCall(`/admin/users/ban`, { method: "POST", body: JSON.stringify({ user_id }) });
export const unbanUser = (user_id: string) =>
  apiCall(`/admin/users/unban`, { method: "POST", body: JSON.stringify({ user_id }) });

// ── Jira Tokens ────────────────────────────────────
export interface JiraToken {
  id: string;
  username: string;
  jiraAccountId: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}

export const getJiraTokens = () => apiCall("/admin/jira-tokens");
export const revokeToken = (id: string) =>
  apiCall(`/admin/jira-tokens/${id}`, { method: "DELETE" });

// ── Projects ───────────────────────────────────────
export interface AdminProject {
  id: string;
  projectName: string;
  description: string;
  owner: string;
  totalTestSuites: number;
  createdAt: string;
}

export interface CreateProjectPayload {
  projectName: string;
  description: string;
  owner: string;
}

export const getProjects = () => apiCall("/admin/projects");
export const createProject = (data: CreateProjectPayload) =>
  apiCall("/admin/projects", { method: "POST", body: JSON.stringify(data) });
export const updateProject = (id: string, data: Partial<CreateProjectPayload>) =>
  apiCall(`/admin/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProject = (id: string) =>
  apiCall(`/admin/projects/${id}`, { method: "DELETE" });

// ── Test Suites ────────────────────────────────────
export interface AdminTestSuite {
  id: string;
  suiteName: string;
  projectName: string;
  projectId: string;
  description: string;
  totalTestCases: number;
  createdAt: string;
}

export interface CreateTestSuitePayload {
  suiteName: string;
  projectId: string;
  description: string;
}

export const getTestSuites = () => apiCall("/admin/test-suites");
export const createTestSuite = (data: CreateTestSuitePayload) =>
  apiCall("/admin/test-suites", { method: "POST", body: JSON.stringify(data) });
export const updateTestSuite = (id: string, data: Partial<CreateTestSuitePayload>) =>
  apiCall(`/admin/test-suites/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteTestSuite = (id: string) =>
  apiCall(`/admin/test-suites/${id}`, { method: "DELETE" });

// ── Test Cases ─────────────────────────────────────
export interface AdminTestCase {
  id: string;
  user: string;
  jira_project_name?: string | null;
  postman_workspace?: string | null;
  postman_collection?: string | null;
  created_at: string;
  testcase_count: number;
  testsuite: [
    {
      test_case_id: string;
      title: string;
      test_steps: [
        {
          step_number: number;
          action: string;
          test_data: string;
        }
      ],
      expected_result: string;
      actual_result: string;
      status: string;
    }
  ]
}



export const getTestCases = () => apiCall("/admin/testcases");
