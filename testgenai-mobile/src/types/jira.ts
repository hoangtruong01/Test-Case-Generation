export type JiraProject = {
  uuid: string;
  id: string;
  key: string;
  name: string;
  avatarUrls: {
    "48x48": string;
    "24x24": string;
    "16x16": string;
    "32x32": string;
  };
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  entityId: string;
};

export type JiraIssue = {
  expand: string;
  id: string;
  self: string;
  key: string;
  fields: {
    summary: string;
    statusCategory: {
      self: string;
      id: number;
      key: string;
      colorName: string;
      name: string;
    };
    description: string;
  };
};

export type PostmanCollection = {
  id: string;
  name: string;
  createdAt?: string;
};

export type PostmanCollectionDetail = {
  id?: string;
  name?: string;
  item?: PostmanCollectionItem[];
  items?: PostmanCollectionItem[];
  [key: string]: unknown;
};

export type PostmanCollectionItem = {
  name?: string;
  item?: PostmanCollectionItem[];
  items?: PostmanCollectionItem[];
  [key: string]: unknown;
};

export interface TestCase {
  issueKey: string;
  requirement?: string;
  tests: Test[];
}

export interface Test {
  id: string;
  title: string;
  type: string;
  description?: string;
  steps: string[];
  url?: string;
  method?: string;
}

// ==================== ADMIN ====================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  deletedUsers: number;
  totalTestCases: number;
  projectTestCases: { projectKey: string; projectName: string; count: number }[];
}

export interface AdminTestCase {
  id: string;
  projectKey: string;
  projectName: string;
  issueKey: string;
  requirement?: string;
  tests: Test[];
  createdAt: string;
}
