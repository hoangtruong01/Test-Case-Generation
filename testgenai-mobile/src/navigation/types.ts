export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  JiraAuth: undefined;
  Dashboard: undefined;
  Issues: { projectKey: string };
  GeneratedTestcases: undefined;
  CollectionDetail: { collectionId: string };
  CollectionPicker: { testcases: Array<Record<string, unknown>> };
  UserManagement: undefined;
  AdminProjects: undefined;
  AdminTestSuites: undefined;
  AdminTestCases: { projectKey?: string };
  AdminJiraTokens: undefined;
};

export type TabParamList = {
  DashboardTab: undefined;
  ProjectsTab: undefined;
  PostmanTab: undefined;
  EndpointsTab: { collectionId?: string } | undefined;
  TestCasesTab: undefined;
  UsersTab: undefined;
  SettingsTab: undefined;
};
