export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  JiraAuth: undefined;
  Dashboard: undefined;
  Issues: { projectKey: string };
  CollectionDetail: { collectionId: string };
  CollectionPicker: { issueDescriptions: string[] };
  UserManagement: undefined;
  AdminProjects: undefined;
  AdminTestSuites: undefined;
  AdminTestCases: { projectKey?: string };
  AdminJiraTokens: undefined;
};

export type TabParamList = {
  DashboardTab: undefined;
  ProjectsTab: undefined;
  TestCasesTab: undefined;
  UsersTab: undefined;
  SettingsTab: undefined;
};
