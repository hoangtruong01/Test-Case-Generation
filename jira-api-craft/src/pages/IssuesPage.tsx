import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  CheckSquare,
  Square,
  Search,
  LogIn,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/apiconfig";
import { JiraIssue } from "@/types/jira";
import PostmanCollectionPicker from "@/components/PostmanCollectionPicker";

const STATUS_CLASS_MAP: Record<string, string> = {
  "TO DO": "bg-muted text-muted-foreground",
  "IN PROGRESS": "bg-primary/10 text-primary",
  "IN REVIEW": "bg-primary/10 text-primary",
  DONE: "bg-success/10 text-success",
};

const getStatusClass = (name?: string) => {
  if (!name) return "bg-muted text-muted-foreground";
  const key = String(name).trim().toUpperCase();
  return STATUS_CLASS_MAP[key] || "bg-muted text-muted-foreground";
};

const formatStatusLabel = (name?: string) => {
  if (!name) return "";
  return String(name)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
};

const IssuesPage = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const {
    issues,
    setIssues,
    setProjects,
    projects,
    selectedProject,
    setGeneratedTestcases,
  } = useAppContext();
  const { isJiraAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projectInput, setProjectInput] = useState("");
  const [error, setError] = useState("");
  const [generatingTests, setGeneratingTests] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [pendingIssueDescriptions, setPendingIssueDescriptions] = useState<
    string[]
  >([]);
  const navigate = useNavigate();

  // Use the route param `projectName` (display name) as the project identifier.
  // We'll call the backend with the display name instead of resolving to the project key.
  const projectIdentifier = projectName || "";

  const fetchInProgress = useRef(false);

  useEffect(() => {
    if (!projectName) {
      setLoading(false);
      return;
    }

    if (!isJiraAuthenticated) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        if (fetchInProgress.current) return;
        fetchInProgress.current = true;
        // Ensure projects are loaded so we can resolve names/keys reliably
        if (!projects || projects.length === 0) {
          try {
            const fetched = await api.getProjects();
            // Only set if the call returned an array
            if (Array.isArray(fetched)) {
              setProjects(fetched as any);
            }
          } catch (err) {
            console.debug("Could not prefetch projects:", err);
          }
        }

        // We'll use the project display name directly for issue queries
        const resolvedName = projectName;

        // If issues are already loaded for the selected project, skip refetch
        if (
          selectedProject?.name === resolvedName &&
          issues &&
          issues.length > 0
        ) {
          setLoading(false);
          return;
        }

        const i = await api.getIssues(resolvedName);
        setIssues(i);
        setError("");
      } catch (err: any) {
        console.error("Failed to load issues:", err);
        setError(err?.message || "Failed to load issues");
        toast.error("Failed to load issues. Please try logging in again.");
      } finally {
        setLoading(false);
        fetchInProgress.current = false;
      }
    };

    load();
    // Only re-run when the route/projectName, auth state, or selected project key changes.
    // Avoid including `projects`/`issues`/setters which caused repeated re-runs.
  }, [projectName, isJiraAuthenticated, selectedProject?.key]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };

  const handleGenerateSelected = async () => {
    const descs = (issues || [])
      .filter((i: JiraIssue) => selected.has(i.id))
      .map((i: JiraIssue) => i.fields?.description || i.fields?.summary || "")
      .filter(Boolean);

    if (descs.length === 0) {
      toast.error("No issue descriptions selected");
      return;
    }

    // Use the project's display name (not the key). Try `selectedProject` first,
    // then resolve by project KEY (route may have provided a key), then by name.
    // This prevents "Missing project name" when the URL contains the key.
    const jira_project_name =
      (selectedProject && selectedProject.name) ||
      projects.find((p) => p.key === projectKeyResolved)?.name ||
      projects.find((p) => p.name === projectName)?.name ||
      "";
    if (!jira_project_name) {
      toast.error("Missing project name");
      return;
    }

    setGeneratingTests(true);
    try {
      const res = await api.generateTestcases(jira_project_name, descs);
      // normalize returned testcases
      const tcs =
        res?.testcases ||
        res?.testCases ||
        res?.data ||
        (Array.isArray(res) ? res : null) ||
        [];
      try {
        setGeneratedTestcases(tcs);
      } catch (e) {
        /* ignore if context not available */
      }
      toast.success("Testcases generated");
      navigate(`/dashboard/testcases`);
    } catch (e) {
      console.error("generateTestcases failed", e);
      toast.error("Failed to generate testcases");
    } finally {
      setGeneratingTests(false);
    }
  };

  const filtered = (issues || []).filter(
    (issue) =>
      String(issue.fields?.summary || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(issue.key || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(issue.fields?.description || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(issue.fields?.statusCategory?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

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

  if (!projectName) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Enter Project Name
        </h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          Type the Jira project key (e.g. AUTH) to load issues for that project.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectInput}
            onChange={(e) => setProjectInput(e.target.value)}
            placeholder="Project key or name e.g. AUTH or Auth Service"
            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground"
          />
          <button
            onClick={() => {
              const input = projectInput.trim();
              if (!input) return;
              // Try to resolve by key first, then by name (case-insensitive)
              const byKey = projects.find(
                (p) => p.key.toLowerCase() === input.toLowerCase(),
              );
              const byName = projects.find(
                (p) => p.name.toLowerCase() === input.toLowerCase(),
              );
              const targetKey = byKey ? byKey.key : byName ? byName.key : input;
              navigate(`/dashboard/projects/${encodeURIComponent(targetKey)}`);
            }}
            disabled={!projectInput.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Load Issues
          </button>
        </div>
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
          Please log in to Jira to access project issues.
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
          Failed to Load Issues
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/dashboard/projects")}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
          >
            Back to Projects
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
    <>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard/projects")}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {projectName} Issues
              </h1>
              <p className="text-muted-foreground text-sm">
                {selected.size} of {filtered.length} selected
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateSelected}
              disabled={generatingTests || selected.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-bg text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingTests ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckSquare className="w-4 h-4" />
              )}
              Generate Testcases
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left">
                    <button
                      onClick={toggleAll}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {selected.size === filtered.length &&
                      filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Key
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((issue, i) => (
                  <motion.tr
                    key={issue.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => toggleSelect(issue.id)}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      selected.has(issue.id)
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <td className="p-4">
                      {selected.has(issue.id) ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-4 text-sm font-mono font-medium text-foreground">
                      {issue.key}
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {issue.fields?.summary || "No summary"}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {issue.fields?.description || "No description"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block max-w-[140px] whitespace-nowrap truncate px-3 py-1 text-xs font-medium rounded-md ${getStatusClass(issue.fields?.statusCategory?.name)}`}
                      >
                        {formatStatusLabel(issue.fields?.statusCategory?.name)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Postman collection picker modal used to select a collection for AI generation */}
        {pushModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl p-6 bg-background rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Select Postman Collection
                </h3>
                <div>
                  <button
                    onClick={() => setPushModalOpen(false)}
                    className="px-3 py-1 rounded-md border border-border"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default IssuesPage;
