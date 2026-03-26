import { JiraIssue, JiraProject } from "@/types/jira";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface Endpoint {
  id: string;
  method: string;
  url: string;
  description: string;
  requestBody?: string;
  responseExample?: string;
}

interface Test {
  id: string;
  title: string;
  type: string;
  description?: string;
  steps: string[];
  url?: string;
  method?: string;
  headers?: Array<{ key: string; value: string }>;
  queryParams?: Array<{ key: string; value: string; equals?: boolean; description?: string | null; enabled?: boolean }>;
  dataMode?: string;
  rawModeData?: string;
  dataOptions?: unknown;
}

interface TestCase {
  issueKey: string;
  requirement?: string;
  tests: Test[];
}

export interface EndpointResult {
  index: number;
  name: string;
  method: string;
  url: string;
  status_code: number | null;
  error: string;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_TESTCASES = "app_generated_testcases";
const LS_ENDPOINTS = "app_endpoint_results";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

// ── context ───────────────────────────────────────────────────────────────────

interface AppContextType {
  projects: JiraProject[];
  setProjects: (p: JiraProject[]) => void;
  selectedProject: JiraProject | null;
  setSelectedProject: (p: JiraProject | null) => void;
  issues: JiraIssue[];
  setIssues: (i: JiraIssue[]) => void;
  generatedTestcases: TestCase[];
  setGeneratedTestcases: (t: TestCase[]) => void;
  endpointResults: EndpointResult[];
  setEndpointResults: (r: EndpointResult[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);

  // Initialise from localStorage so data survives a page refresh
  const [generatedTestcases, setGeneratedTestcasesRaw] = useState<TestCase[]>(
    () => lsGet<TestCase[]>(LS_TESTCASES, [])
  );
  const [endpointResults, setEndpointResultsRaw] = useState<EndpointResult[]>(
    () => lsGet<EndpointResult[]>(LS_ENDPOINTS, [])
  );

  const setGeneratedTestcases = (t: TestCase[]) => {
    setGeneratedTestcasesRaw(t);
    lsSet(LS_TESTCASES, t);
  };

  const setEndpointResults = (r: EndpointResult[]) => {
    setEndpointResultsRaw(r);
    lsSet(LS_ENDPOINTS, r);
  };

  return (
    <AppContext.Provider value={{
      projects, setProjects,
      selectedProject, setSelectedProject,
      issues, setIssues,
      generatedTestcases, setGeneratedTestcases,
      endpointResults, setEndpointResults,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export default useAppContext;
