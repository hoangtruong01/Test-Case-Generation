import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useAppContext, EndpointResult } from "@/context/AppContext";
import { API_BASE_URL } from "@/config/apiconfig";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FolderOpen,
  KeyRound,
  Layers,
  Loader2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ── helpers ───────────────────────────────────────────────────────────────────

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

const getWsBase = () => {
  const http = API_BASE_URL.replace(/\/$/, "");
  return http.replace(/^https?/, (p) => (p === "https" ? "wss" : "ws"));
};

const getSessionToken = () => {
  try {
    return localStorage.getItem("jira_session") || localStorage.getItem("jira_token") || null;
  } catch {
    return null;
  }
};

const METHOD_COLOR: Record<string, string> = {
  GET: "text-green-600 dark:text-green-400",
  POST: "text-blue-600 dark:text-blue-400",
  PUT: "text-yellow-600 dark:text-yellow-400",
  PATCH: "text-orange-600 dark:text-orange-400",
  DELETE: "text-red-600 dark:text-red-400",
};

// ── types ─────────────────────────────────────────────────────────────────────

interface Workspace { id: string; name: string; type?: string }
interface Collection { id: string; name: string; createdAt?: string }
interface FlatRequest {
  id?: string;
  name?: string;
  _folder?: string;
  request?: {
    method?: string;
    url?: string | { raw?: string; host?: string[]; path?: string[] };
    description?: string;
    header?: Array<{ key?: string; value?: string }>;
    body?: { mode?: string; raw?: string };
  };
}

type EndpointStatus = "pending" | "running" | "done" | "error";

interface LiveEndpoint {
  index: number;
  name: string;
  method: string;
  url: string;
  status: EndpointStatus;
  status_code: number | null;
  error: string;
}

// ── component ─────────────────────────────────────────────────────────────────

const PostmanFlowPage = () => {
  const navigate = useNavigate();
  const { loginPostmanBackendSession, isPostmanBackendSession } = useAuth();
  const { setGeneratedTestcases, setEndpointResults } = useAppContext();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  const [requests, setRequests] = useState<FlatRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // WebSocket generation state
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "llm" | "done">("idle");
  const [liveEndpoints, setLiveEndpoints] = useState<LiveEndpoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const liveEndpointsRef = useRef<LiveEndpoint[]>([]);

  const loadWorkspaces = useCallback(async () => {
    setWorkspaceLoading(true);
    try {
      const res = await api.getPostmanWorkspaces();
      if ("error" in res) { toast.error(res.error); setWorkspaces([]); return; }
      setWorkspaces(res.workspaces || []);
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPostmanBackendSession) void loadWorkspaces();
  }, [isPostmanBackendSession, loadWorkspaces]);

  const handleStartSession = async () => {
    if (!apiKey.trim()) { toast.error("Enter your Postman API key"); return; }
    setConnecting(true);
    try {
      const out = await api.postmanStartSession(apiKey.trim());
      loginPostmanBackendSession(out.session_token, { name: out.display_name || out.email, email: out.email });
      try {
        localStorage.setItem("postman_apiKey", apiKey.trim());
        localStorage.setItem("postman_apikey", apiKey.trim());
      } catch { /* ignore */ }
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
      if ("error" in res) { toast.error(res.error); setCollections([]); return; }
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
      if ("error" in res) { toast.error(res.error); setRequests([]); return; }
      const raw = (res.requests as FlatRequest[]) || [];
      setRequests(raw.map((r, idx) => r.id ? r : { ...r, id: `__noid_${col.id}_${idx}` }));
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
    const allSelected = filteredRequests.every((r) => next.has(String(r.id || "")));
    if (allSelected) {
      filteredRequests.forEach((r) => next.delete(String(r.id || "")));
    } else {
      filteredRequests.forEach((r) => { if (r.id) next.add(String(r.id)); });
    }
    setSelectedIds(next);
  };

  const buildEndpointPayload = () => {
    if (!selectedWorkspace || !selectedCollection) return [];
    return requests
      .filter((r) => r.id && selectedIds.has(String(r.id)))
      .map((r) => {
        const bodyRaw = r.request?.body?.raw;
        const headers = r.request?.header
          ?.map((h) => ({ key: String(h.key || ""), value: String(h.value || "") }))
          .filter((h) => h.key && h.value !== undefined) || [];
        const rid = String(r.id || "");
        return {
          id: rid.startsWith("__noid_") ? undefined : rid,
          name: r.name || "",
          method: String(r.request?.method || "GET"),
          url: resolveUrl(r.request?.url),
          description: typeof r.request?.description === "string" ? r.request.description : "",
          headers,
          body_raw: typeof bodyRaw === "string" ? bodyRaw.slice(0, 20000) : undefined,
          body_excerpt: typeof bodyRaw === "string" ? bodyRaw.slice(0, 2000) : "",
          folder: typeof r._folder === "string" ? r._folder : "",
        };
      })
      .filter((e) => e.url);
  };

  const handleGenerate = () => {
    const endpoints = buildEndpointPayload();
    if (!selectedWorkspace || !selectedCollection) { toast.error("Select a workspace and collection"); return; }
    if (endpoints.length === 0) { toast.error("Select at least one endpoint"); return; }

    const token = getSessionToken();
    if (!token) { toast.error("Session expired — please reconnect"); return; }

    // Initialise live endpoint list
    const initial: LiveEndpoint[] = endpoints.map((ep, i) => ({
      index: i,
      name: ep.name || ep.url,
      method: ep.method,
      url: ep.url,
      status: "pending",
      status_code: null,
      error: "",
    }));
    setLiveEndpoints(initial);
    liveEndpointsRef.current = initial;
    setPhase("running");
    setGenerating(true);

    const wsUrl = `${getWsBase()}/postman/testcases/generate/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        postman_workspace: selectedWorkspace.name,
        postman_workspace_id: selectedWorkspace.id,
        postman_collection: selectedCollection.name,
        postman_collection_id: selectedCollection.id,
        endpoints,
        think: false,
      }));
    };

    ws.onmessage = (evt) => {
      let event: any;
      try { event = JSON.parse(evt.data); } catch { return; }

      if (event.type === "endpoint_start") {
        setLiveEndpoints((prev) => {
          const next = prev.map((ep) => ep.index === event.index ? { ...ep, status: "running" as EndpointStatus } : ep);
          liveEndpointsRef.current = next;
          return next;
        });
      } else if (event.type === "endpoint_done") {
        setLiveEndpoints((prev) => {
          const next = prev.map((ep) =>
            ep.index === event.index
              ? { ...ep, status: (event.error ? "error" : "done") as EndpointStatus, status_code: event.status_code, error: event.error || "" }
              : ep
          );
          liveEndpointsRef.current = next;
          return next;
        });
      } else if (event.type === "llm_start") {
        setPhase("llm");
      } else if (event.type === "done") {
        const tcs = event.testcases || [];
        setGeneratedTestcases(tcs);
        // Store final endpoint results (with status codes) for the results page
        setEndpointResults(
          liveEndpointsRef.current.map((ep) => ({
            index: ep.index,
            name: ep.name,
            method: ep.method,
            url: ep.url,
            status_code: ep.status_code,
            error: ep.error,
          }))
        );
        setPhase("done");
        setGenerating(false);
        toast.success("Test cases generated");
        navigate("/dashboard/testcases");
      } else if (event.type === "error") {
        toast.error(event.message || "Generation failed");
        setGenerating(false);
        setPhase("idle");
      }
    };

    ws.onerror = () => {
      toast.error("WebSocket error — falling back to HTTP");
      ws.close();
      // Fallback to regular HTTP
      void (async () => {
        try {
          const res = (await api.generateTestcasesFromPostman({
            postman_workspace: selectedWorkspace.name,
            postman_workspace_id: selectedWorkspace.id,
            postman_collection: selectedCollection.name,
            postman_collection_id: selectedCollection.id,
            endpoints,
            think: false,
          })) as { testcases?: unknown[] };
          setGeneratedTestcases((res?.testcases || []) as never[]);
          toast.success("Test cases generated");
          navigate("/dashboard/testcases");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Generation failed");
        } finally {
          setGenerating(false);
          setPhase("idle");
        }
      })();
    };

    ws.onclose = () => {
      if (generating) {
        setGenerating(false);
        setPhase("idle");
      }
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Generate tests from Postman</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your API key, pick a workspace and collection, select requests, then generate structured test cases.
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
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground p-1" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              disabled={connecting}
              onClick={() => void handleStartSession()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
              Connect
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
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
                className={`text-left p-4 rounded-lg border transition-colors ${selectedWorkspace?.id === ws.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
              >
                <div className="font-medium text-foreground">{ws.name}</div>
                {ws.type && <div className="text-xs text-muted-foreground">{ws.type}</div>}
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
                  className={`text-left p-4 rounded-lg border transition-colors flex items-start gap-2 ${selectedCollection?.id === c.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                >
                  <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="font-medium text-foreground">{c.name}</div>
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
            <button type="button" onClick={selectAllFiltered} className="text-sm text-primary hover:underline">
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
            <ul className="max-h-80 overflow-auto space-y-1 border border-border rounded-lg p-2">
              {filteredRequests.length === 0 ? (
                <li className="text-sm text-muted-foreground p-2">No matching requests.</li>
              ) : (
                filteredRequests.map((r) => {
                  const id = String(r.id || "");
                  if (!id) return null;
                  const url = resolveUrl(r.request?.url);
                  const method = (r.request?.method || "GET").toUpperCase();
                  return (
                    <li key={id}>
                      <label className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleId(id)} className="mt-1" />
                        <div className="min-w-0">
                          <span className={`font-mono text-xs font-bold ${METHOD_COLOR[method] ?? "text-muted-foreground"}`}>{method}</span>
                          <div className="font-medium text-foreground truncate">{r.name || url || "Request"}</div>
                          <div className="text-xs text-muted-foreground truncate">{url}</div>
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
            onClick={handleGenerate}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {generating ? "Generating…" : "Generate test cases"}
          </button>
        </section>
      )}

      {/* Live progress panel */}
      <AnimatePresence>
        {generating && liveEndpoints.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {phase === "llm" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Generating test cases with AI…
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Running endpoints…
                </>
              )}
            </div>

            <div className="space-y-2">
              {liveEndpoints.map((ep) => (
                <div key={ep.index} className="flex items-center gap-3 text-sm">
                  <div className="shrink-0 w-5">
                    {ep.status === "pending" && <Clock className="w-4 h-4 text-muted-foreground" />}
                    {ep.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    {ep.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {ep.status === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <span className={`font-mono text-xs font-bold shrink-0 ${METHOD_COLOR[ep.method] ?? "text-muted-foreground"}`}>
                    {ep.method}
                  </span>
                  <span className="text-foreground truncate flex-1">{ep.name || ep.url}</span>
                  {ep.status_code !== null && (
                    <span className={`text-xs font-mono shrink-0 ${ep.status_code >= 400 ? "text-red-500" : "text-green-500"}`}>
                      {ep.status_code}
                    </span>
                  )}
                  {ep.error && (
                    <span className="text-xs text-red-500 truncate max-w-[200px]">{ep.error}</span>
                  )}
                </div>
              ))}
            </div>

            {phase === "llm" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                LLM is analysing responses and writing test cases…
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostmanFlowPage;
