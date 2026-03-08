import { create } from "zustand";
import { JiraProject, JiraIssue, TestCase } from "../types/jira";

interface AppState {
  // Projects
  projects: JiraProject[];
  setProjects: (projects: JiraProject[]) => void;
  selectedProject: JiraProject | null;
  setSelectedProject: (project: JiraProject | null) => void;

  // Issues
  issues: JiraIssue[];
  setIssues: (issues: JiraIssue[]) => void;

  // Test cases
  generatedTestcases: TestCase[];
  setGeneratedTestcases: (testcases: TestCase[]) => void;

  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  selectedProject: null,
  setSelectedProject: (selectedProject) => set({ selectedProject, issues: [] }),

  issues: [],
  setIssues: (issues) => set({ issues }),

  generatedTestcases: [],
  setGeneratedTestcases: (generatedTestcases) => set({ generatedTestcases }),

  reset: () =>
    set({
      projects: [],
      selectedProject: null,
      issues: [],
      generatedTestcases: [],
    }),
}));
