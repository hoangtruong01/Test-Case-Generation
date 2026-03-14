import { API_BASE_URL } from "@/config/apiconfig";

const getSession = () => localStorage.getItem("jira_session") || "";

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
  username: string;
  email: string;
  role: "ADMIN" | "USER";
  jiraConnected: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: "ADMIN" | "USER";
}

export const getUsers = () => apiCall("/admin/users");
export const createUser = (data: CreateUserPayload) =>
  apiCall("/admin/users", { method: "POST", body: JSON.stringify(data) });
export const updateUser = (id: string, data: Partial<CreateUserPayload>) =>
  apiCall(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteUser = (id: string) =>
  apiCall(`/admin/users/${id}`, { method: "DELETE" });

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
  testCaseName: string;
  suiteName: string;
  suiteId: string;
  projectName: string;
  httpMethod: string;
  endpoint: string;
  requestBody: string;
  expectedStatus: number;
  expectedResponse: string;
  createdAt: string;
}

export interface CreateTestCasePayload {
  testCaseName: string;
  suiteId: string;
  httpMethod: string;
  endpoint: string;
  requestBody: string;
  expectedStatus: number;
  expectedResponse: string;
}

export const getTestCases = () => apiCall("/admin/test-cases");
export const createTestCase = (data: CreateTestCasePayload) =>
  apiCall("/admin/test-cases", { method: "POST", body: JSON.stringify(data) });
export const updateTestCase = (id: string, data: Partial<CreateTestCasePayload>) =>
  apiCall(`/admin/test-cases/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteTestCase = (id: string) =>
  apiCall(`/admin/test-cases/${id}`, { method: "DELETE" });
