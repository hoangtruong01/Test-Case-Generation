import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useAppContext } from "@/context/AppContext";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FolderOpen,
  KeyRound,
  Layers,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const resolveUrl = (
  url?: string | { raw?: string; host?: string[]; path?: string[] },
): string => {
  if (!url) return "";
  if (typeof url === "string") return url;
  if (url.raw) return url.raw;
  const host = Array.isArray(url.host) ? url.host.join(".") : "";
  const path = Array.isArray(url.path) ? url.path.join("/") : "";
  if (host && path) return `${host}/${path}`;
  return host || path || "";
};

interface Workspace {
  id: string;
  name: string;
  type?: string;
}

interface Collection {
  id: string;
  name: string;
  createdAt?: string;
}

interface FlatRequest {
  id?: string;
  name?: string;
  _folder?: string;
  request?: {
    method?: string;
    url?: string | { raw?: string; host?: string[]; path?: string[] };
    description?: string;
    body?: { mode?: string; raw?: string };
  };
}

const PostmanFlowPage = () => {
  const navigate = useNavigate();
  const { loginPostmanBackendSession, isPostmanBackendSession } = useAuth();
  const { setGeneratedTestcases } = useAppContext();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null,
  );

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);

  const [requests, setRequests] = useState<FlatRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [generating, setGenerating] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    setWorkspaceLoading(true);
    try {
      const res = await api.getPostmanWorkspaces();
      if ("error" in res) {
        toast.error(res.error);
        setWorkspaces([]);
        return;
      }
      setWorkspaces(res.workspaces || []);
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPostmanBackendSession) void loadWorkspaces();
  }, [isPostmanBackendSession, loadWorkspaces]);

  const handleStartSession = async () => {
    if (!apiKey.trim()) {
      toast.error("Enter your Postman API key");
      return;
    }
    setConnecting(true);
    try {
      const out = await api.postmanStartSession(apiKey.trim());
      loginPostmanBackendSession(out.session_token, {
        name: out.display_name || out.email,
        email: out.email,
      });
      try {
        localStorage.setItem("postman_apiKey", apiKey.trim());
        localStorage.setItem("postman_apikey", apiKey.trim());
      } catch {
        /* ignore */
      }
      toast.success("Connected to Postman");
      await loadWorkspaces();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setConnecting(false);
    }
  };

  const loadCollections = async (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setSelectedCollection(null);
    setRequests([]);
    setSelectedIds(new Set());
    setCollectionsLoading(true);
    try {
      const res = await api.getPostmanCollections(ws.id);
      if ("error" in res) {
        toast.error(res.error);
        setCollections([]);
        return;
      }
      setCollections(res.collections || []);
    } finally {
      setCollectionsLoading(false);
    }
  };

  const loadRequests = async (col: Collection) => {
    setSelectedCollection(col);
    setRequestsLoading(true);
    setSelectedIds(new Set());
    try {
      const res = await api.getPostmanRequests(col.id);
      if ("error" in res) {
        toast.error(res.error);
        setRequests([]);
        return;
      }
      const raw = (res.requests as FlatRequest[]) || [];
      setRequests(
        raw.map((r, idx) =>
          r.id ? r : { ...r, id: `__noid_${col.id}_${idx}` },
        ),
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      const url = resolveUrl(r.request?.url);
      return (
        (r.name || "").toLowerCase().includes(q) ||
        url.toLowerCase().includes(q) ||
        (r.request?.method || "").toLowerCase().includes(q)
      );
    });
  }, [requests, search]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedIds);
    const allSelected = filteredRequests.every((r) =>
      next.has(String(r.id || "")),
    );
    if (allSelected) {
      filteredRequests.forEach((r) => next.delete(String(r.id || "")));
    } else {
      filteredRequests.forEach((r) => {
        if (r.id) next.add(String(r.id));
      });
    }
    setSelectedIds(next);
  };

  const buildEndpointPayload = () => {
    if (!selectedWorkspace || !selectedCollection) return [];
    return requests
      .filter((r) => r.id && selectedIds.has(String(r.id)))
      .map((r) => {
        const bodyRaw = r.request?.body?.raw;
        const rid = String(r.id || "");
        return {
          id: rid.startsWith("__noid_") ? undefined : rid,
          name: r.name || "",
          method: String(r.request?.method || "GET"),
          url: resolveUrl(r.request?.url),
          description:
            typeof r.request?.description === "string"
              ? r.request.description
              : "",
          body_excerpt:
            typeof bodyRaw === "string" ? bodyRaw.slice(0, 2000) : "",
          folder: typeof r._folder === "string" ? r._folder : "",
        };
      })
      .filter((e) => e.url);
  };

  const handleGenerate = async () => {
    const endpoints = buildEndpointPayload();
    if (!selectedWorkspace || !selectedCollection) {
      toast.error("Select a workspace and collection");
      return;
    }
    if (endpoints.length === 0) {
      toast.error("Select at least one endpoint");
      return;
    }
    setGenerating(true);
    try {
      const res = (await api.generateTestcasesFromPostman({
        postman_workspace: selectedWorkspace.name,
        postman_workspace_id: selectedWorkspace.id,
        postman_collection: selectedCollection.name,
        postman_collection_id: selectedCollection.id,
        endpoints,
        think: false,
      })) as { testcases?: unknown[] };
      const tcs = res?.testcases || [];
      setGeneratedTestcases(tcs as never[]);
      toast.success("Test cases generated");
      navigate("/dashboard/testcases");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Generate tests from Postman
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your API key, pick a workspace and collection, select requests,
          then generate structured test cases and export to Excel.
        </p>
      </div>

      {/* Step 1 — API key */}
      <section className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound className="w-4 h-4 text-primary" />
          1. Postman API key
        </div>
        {!isPostmanBackendSession ? (
          <>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="PMAK-…"
                className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              disabled={connecting}
              onClick={() => void handleStartSession()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Connect
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" />
            Signed in with Postman
          </div>
        )}
      </section>

      {/* Step 2 — Workspace */}
      <section className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="w-4 h-4 text-primary" />
          2. Workspace
        </div>
        {!isPostmanBackendSession ? (
          <p className="text-sm text-muted-foreground">Connect first.</p>
        ) : workspaceLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workspaces found.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => void loadCollections(ws)}
                className={`text-left p-4 rounded-lg border transition-colors ${
                  selectedWorkspace?.id === ws.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="font-medium text-foreground">{ws.name}</div>
                {ws.type ? (
                  <div className="text-xs text-muted-foreground">{ws.type}</div>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Step 3 — Collection */}
      {selectedWorkspace && (
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FolderOpen className="w-4 h-4 text-primary" />
            3. Collection in {selectedWorkspace.name}
          </div>
          {collectionsLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collections.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {collections.map((c, i) => (
                <motion.button
                  key={c.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => void loadRequests(c)}
                  className={`text-left p-4 rounded-lg border transition-colors flex items-start gap-2 ${
                    selectedCollection?.id === c.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">{c.name}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 4 — Endpoints */}
      {selectedCollection && (
        <section className="glass-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">
              4. Select endpoints — {selectedCollection.name}
            </div>
            <button
              type="button"
              onClick={selectAllFiltered}
              className="text-sm text-primary hover:underline"
            >
              Select all (filtered)
            </button>
          </div>
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
          {requestsLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <ul className="max-h-80 overflow-auto space-y-2 border border-border rounded-lg p-2">
              {filteredRequests.length === 0 ? (
                <li className="text-sm text-muted-foreground p-2">
                  No matching requests.
                </li>
              ) : (
                filteredRequests.map((r) => {
                  const id = String(r.id || "");
                  if (!id) return null;
                  const url = resolveUrl(r.request?.url);
                  return (
                    <li key={id}>
                      <label className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(id)}
                          onChange={() => toggleId(id)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <span className="font-mono text-xs uppercase text-muted-foreground">
                            {r.request?.method || "—"}
                          </span>
                          <div className="font-medium text-foreground truncate">
                            {r.name || url || "Request"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {url}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          )}
          <button
            type="button"
            disabled={generating || selectedIds.size === 0}
            onClick={() => void handleGenerate()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Generate test cases
          </button>
        </section>
      )}
    </div>
  );
};

export default PostmanFlowPage;
