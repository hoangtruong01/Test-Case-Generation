import { JiraIssue, JiraProject } from "@/types/jira";
import React, { createContext, useContext, useState, ReactNode } from "react";

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



interface AppContextType {
  projects: JiraProject[];
  setProjects: (p: JiraProject[]) => void;
  selectedProject: JiraProject | null;
  setSelectedProject: (p: JiraProject | null) => void;
  issues: JiraIssue[];
  setIssues: (i: JiraIssue[]) => void;
  generatedTestcases: TestCase[];
  setGeneratedTestcases: (t: TestCase[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [generatedTestcases, setGeneratedTestcases] = useState<TestCase[]>([]);
 

 


  return (
    <AppContext.Provider value={{
      projects, setProjects,
      selectedProject, setSelectedProject,
      issues, setIssues,
      generatedTestcases, setGeneratedTestcases,
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
/* useAppContext and types moved to AppContextHelpers.ts */
