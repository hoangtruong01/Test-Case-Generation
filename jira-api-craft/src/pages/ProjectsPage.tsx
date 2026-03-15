import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { motion } from "framer-motion";
import {
  FolderKanban,
  ArrowRight,
  Loader2,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/apiconfig";

const ProjectsPage = () => {
  const { projects, setProjects, setSelectedProject } = useAppContext();
  const { isJiraAuthenticated, loginJira } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Parse either search params (?) or hash fragment (#)
      const raw =
        location.search && location.search.length > 0
          ? location.search.replace(/^\?/, "")
          : location.hash && location.hash.length > 0
            ? location.hash.replace(/^#/, "")
            : "";
      const params = new URLSearchParams(raw);
      const userName = localStorage.getItem("jira_user");
      // Accept multiple possible param names from backend redirect
      const session =
        params.get("session") ||
        params.get("jira_session") ||
        params.get("token");
      const userParam =
        params.get("jira_user") ||
        params.get("user") ||
        (userName ? JSON.parse(userName).name : null);

      if (session) {
        let user = null;
        if (userParam) {
          try {
            // Try parse JSON user, otherwise fall back to a simple object with name
            user = userParam.trim().startsWith("{")
              ? JSON.parse(userParam)
              : { name: userParam };
          } catch (e) {
            user = { name: userParam };
          }
        } else {
          user = { name: "user" };
        }

        try {
          loginJira(session);
          // Persist token using keys AuthContext expects, and keep legacy keys
          try {
            localStorage.setItem("jira_token", session);
            localStorage.setItem(
              "jira_token_exp",
              String(Date.now() + 60 * 60 * 1000),
            );
          } catch (e) {
            /* ignore */
          }
          try {
            localStorage.setItem("jira_session", session);
            localStorage.setItem(
              "jira_session_exp",
              String(Date.now() + 60 * 60 * 1000),
            );
          } catch (e) {
            /* ignore */
          }

          // Only show a personalized welcome when we have a real name
          if (user && user.name && user.name !== "user") {
            toast.success(`Welcome, ${user.name}!`);
          } else {
            toast.success("Logged in to Jira");
          }
          // Remove params/fragment from URL
          navigate("/dashboard/projects", { replace: true });
        } catch (e) {
          console.error("Failed to handle redirect params:", e);
        }
      }
    } catch (e) {
      // ignore URL parsing errors
    }
    // If projects are already loaded in context, no need to fetch again
    if (projects && projects.length > 0) {
      setLoading(false);
      return;
    }

    api
      .getProjects()
      .then((p) => {
        setProjects(p);
        setError("");
      })
      .catch((err) => {
        console.error("Failed to load projects:", err);
        setError(err.message || "Failed to load projects");
        toast.error("Failed to load projects. Please try logging in again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setProjects, isJiraAuthenticated, projects]);

  const handleSelect = (projectName: string) => {
    const project = projects.find((p) => p.name === projectName);
    if (project) {
      setSelectedProject(project);
      navigate(`/dashboard/projects/${encodeURIComponent(project.name)}`);
    }
  };

  const goToJiraAuth = () => {
    window.location.href = `${API_BASE_URL}/jira/login`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isJiraAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <LogIn className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Authentication Required
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please log in to Jira to access your projects and generate API
          endpoints.
        </p>
        <button
          onClick={goToJiraAuth}
          className="flex items-center gap-2 px-6 py-3 gradient-bg text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <LogIn className="w-4 h-4" />
          Login to Jira
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Failed to Load Projects
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
          >
            Retry
          </button>
          <button
            onClick={goToJiraAuth}
            className="flex items-center gap-2 px-4 py-2 gradient-bg text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Re-authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="text-muted-foreground mt-1">
          Select a Jira project to generate API endpoints
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleSelect(project.name)}
            className="group glass-card p-6 cursor-pointer hover-lift"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {project.avatarUrls?.["48x48"] ? (
                  <img
                    src={project.avatarUrls["48x48"]}
                    alt={`${project.name} avatar`}
                    className="w-6 h-6 rounded-sm"
                  />
                ) : (
                  <FolderKanban className="w-5 h-5 text-primary" />
                )}
              </div>
              <span className="px-2 py-1 text-xs font-mono font-medium rounded-md bg-muted text-muted-foreground">
                {project.key}
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2"></p>
            <div className="flex items-center justify-between">
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsPage;
