import { create } from "zustand";
import { AdminUser, AdminStats, AdminTestCase } from "../types/jira";

interface AdminState {
  // Stats
  stats: AdminStats | null;
  setStats: (stats: AdminStats | null) => void;

  // Users
  users: AdminUser[];
  setUsers: (users: AdminUser[]) => void;

  // Test cases
  testCases: AdminTestCase[];
  setTestCases: (testCases: AdminTestCase[]) => void;

  // Selected project filter
  selectedProjectKey: string | null;
  setSelectedProjectKey: (key: string | null) => void;

  // Reset
  reset: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  setStats: (stats) => set({ stats }),

  users: [],
  setUsers: (users) => set({ users }),

  testCases: [],
  setTestCases: (testCases) => set({ testCases }),

  selectedProjectKey: null,
  setSelectedProjectKey: (selectedProjectKey) => set({ selectedProjectKey }),

  reset: () =>
    set({
      stats: null,
      users: [],
      testCases: [],
      selectedProjectKey: null,
    }),
}));
