import {
  createContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { api } from "@/services/api";

interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  // Jira Authentication
  jiraUser: User | null;
  jiraAccessToken: string | null;
  isJiraAuthenticated: boolean;
  loginJira: ( token: string) => void;
  logoutJira: () => void;

  postmanAccessToken: string | null;
  setPostmanAccessToken: (token: string | null) => void;
  isPostmanAuthenticated: boolean;
  loginPostman: (user: User, token: string) => void;
  logoutPostman: () => void;

  // Legacy (keep for backward compatibility)
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [jiraUser, setJiraUser] = useState<User | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const s = localStorage.getItem("jira_user");
      return s ? (JSON.parse(s) as User) : null;
    } catch (e) {
      return null;
    }
  });
  const [jiraAccessToken, setJiraAccessToken] = useState<string | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      // Accept either jira_token (preferred) or legacy jira_session
      const token =
        localStorage.getItem("jira_token") ||
        localStorage.getItem("jira_session");
      const exp =
        localStorage.getItem("jira_token_exp") ||
        localStorage.getItem("jira_session_exp");
      if (token && exp && Number(exp) > Date.now()) return token;
      // expired or missing
      try {
        localStorage.removeItem("jira_token");
        localStorage.removeItem("jira_token_exp");
        localStorage.removeItem("jira_session");
        localStorage.removeItem("jira_session_exp");
      } catch (e) {
        /* ignore */
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [jiraTokenExp, setJiraTokenExp] = useState<number | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const s =
        localStorage.getItem("jira_token_exp") ||
        localStorage.getItem("jira_session_exp");
      return s ? Number(s) : null;
    } catch (e) {
      return null;
    }
  });

  // Postman Auth State
  const [, setPostmanUser] = useState<User | null>(null);
  const [postmanAccessToken, setPostmanAccessToken] = useState<string | null>(
    () => {
      try {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("postman_apiKey") || null;
      } catch (e) {
        return null;
      }
    },
  );
  const isPostmanAuthenticated = !!postmanAccessToken;

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        if (!jiraAccessToken || jiraUser) return;
        const info = await api.getInfo();
        if (info && !info.error) {
          const fetchedUser: User = {
            name:
              info.name ||
              info.display_name ||
              info.nickname ||
              info.fullName ||
              "user",
            email:
              info.email ||
              info.emailAddress ||
              (info.email_verified ? info.email : "") ||
              "",
            avatar:
              info.picture ||
              (info.avatarUrls && info.avatarUrls["48x48"]) ||
              undefined,
          };
          setJiraUser(fetchedUser);
          try {
            localStorage.setItem("jira_user", JSON.stringify(fetchedUser));
          } catch (e) {
            /* ignore */
          }
        }
      } catch (e) {
        console.error("Failed to fetch Jira user info", e);
      }
    };
    fetchInfo();
  }, [jiraAccessToken, jiraUser]);

  const loginJira = useCallback(
    ( token: string, expiresInSeconds: number = 3600) => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("jira_token", token);
          const exp = Date.now() + expiresInSeconds * 1000;
          localStorage.setItem("jira_token_exp", String(exp));
        }
      } catch (e) {
        /* ignore */
      }
      setJiraAccessToken(token);
      setJiraTokenExp(Date.now() + expiresInSeconds * 1000);
    },
    [],
  );

  const logoutJira = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("jira_user");
        localStorage.removeItem("jira_token");
        localStorage.removeItem("jira_session");
        localStorage.removeItem("jira_token_exp");
        localStorage.removeItem("jira_session_exp");
      }
    } catch (e) {
      /* ignore */
    }
    setJiraUser(null);
    setJiraAccessToken(null);
    setJiraTokenExp(null);
  }, []);

  // Auto-logout when token expires
  useEffect(() => {
    if (!jiraTokenExp) return;
    const ms = jiraTokenExp - Date.now();
    if (ms <= 0) {
      logoutJira();
      return;
    }
    const id = window.setTimeout(() => {
      logoutJira();
    }, ms);
    return () => window.clearTimeout(id);
  }, [jiraTokenExp, logoutJira]);


  const loginPostman = useCallback((user: User, token: string) => {
    setPostmanUser(user);
    setPostmanAccessToken(token);
  }, []);

  const logoutPostman = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("postman_apiKey");
        localStorage.removeItem("postman_apikey");
      }
    } catch (e) {
      /* ignore */
    }
    setPostmanUser(null);
    setPostmanAccessToken(null);
  }, []);

  // Legacy methods (use Jira as default for backward compatibility)
  const login = useCallback(
    (user: User, token: string) => {
      loginJira( token);
    },
    [loginJira],
  );

  const logout = useCallback(() => {
    logoutJira();
    logoutPostman();
  }, [logoutJira, logoutPostman]);

  return (
    <AuthContext.Provider
      value={{
        // Jira Auth
        jiraUser,
        jiraAccessToken,
        isJiraAuthenticated:
          jiraUser != null &&
          jiraAccessToken != null &&
          (jiraTokenExp ? jiraTokenExp > Date.now() : true),
        loginJira,
        logoutJira,

        // Postman Auth
        postmanAccessToken,
        setPostmanAccessToken,
        isPostmanAuthenticated,
        loginPostman,
        logoutPostman,

        // Legacy
        user: jiraUser,
        accessToken: jiraAccessToken,
        isAuthenticated: !!jiraUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import { useContext } from "react";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
