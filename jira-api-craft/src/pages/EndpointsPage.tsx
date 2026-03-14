import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Loader2, AlertCircle, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface Collection {
    id: string;
    name: string;
    createdAt?: string;
}

interface RequestItem {
    id?: string;
    name?: string;
    request?: {
        method?: string;
        url?: string | { raw?: string; host?: string[]; path?: string[] };
        header?: Array<{ key: string; value: string }>;
        body?: { mode?: string; raw?: string };
        description?: string;
    };
}

const METHOD_COLORS: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    POST: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    PUT: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    PATCH: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    DELETE: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const getMethodClass = (method?: string) => {
    if (!method) return "bg-muted text-muted-foreground";
    return METHOD_COLORS[method.toUpperCase()] || "bg-muted text-muted-foreground";
};

const resolveUrl = (url?: string | { raw?: string; host?: string[]; path?: string[] }): string => {
    if (!url) return "";

    // case: url là string
    if (typeof url === "string") {
        return url;
    }

    // case: postman raw url
    if (url.raw) {
        return url.raw;
    }

    // build từ host + path
    const host = Array.isArray(url.host) ? url.host.join(".") : "";
    const path = Array.isArray(url.path) ? url.path.join("/") : "";

    if (host && path) {
        return `${host}/${path}`;
    }

    if (host) {
        return host;
    }

    return path || "";
};

const EndpointsPage = () => {
    const navigate = useNavigate();

    // Collection state
    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionsLoading, setCollectionsLoading] = useState(true);
    const [collectionsError, setCollectionsError] = useState("");
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

    // Requests state
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    // Load collections on mount
    useEffect(() => {
        api.getPostmanCollections()
            .then((res) => {
                if (res && "error" in res) {
                    setCollectionsError(res.error);
                } else if (res && "collections" in res) {
                    setCollections(res.collections);
                } else {
                    setCollections([]);
                }
            })
            .catch((err) => {
                setCollectionsError(err.message || "Failed to load collections");
            })
            .finally(() => setCollectionsLoading(false));
    }, []);

    // Load requests when a collection is selected
    const handleSelectCollection = (collection: Collection) => {
        setSelectedCollection(collection);
        setRequests([]);
        setRequestsError("");
        setRequestsLoading(true);
        setExpandedId(null);
        setSearch("");

        api.getPostmanRequests(collection.id)
            .then((res) => {
                if ("error" in res) {
                    setRequestsError(res.error);
                } else {
                    setRequests(res.requests as RequestItem[]);
                }
            })
            .catch((err) => {
                setRequestsError(err.message || "Failed to load requests");
            })
            .finally(() => setRequestsLoading(false));
    };

    const handleBack = () => {
        setSelectedCollection(null);
        setRequests([]);
        setRequestsError("");
        setSearch("");
        setExpandedId(null);
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard");
        } catch {
            toast.error("Failed to copy");
        }
    };

    const filtered = requests.filter((r) => {
        const q = search.toLowerCase();
        return (
            (r.name || "").toLowerCase().includes(q) ||
            (r.request?.method || "").toLowerCase().includes(q) ||
            resolveUrl(r.request?.url).toLowerCase().includes(q)
        );
    });

    // --- Collections List View ---
    if (!selectedCollection) {
        if (collectionsLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            );
        }

        if (collectionsError) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
                    <p className="text-muted-foreground mb-4">{collectionsError}</p>
                    <button
                        onClick={() => navigate("/dashboard/postman")}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                    >
                        Connect Postman
                    </button>
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">API Endpoints</h1>
                    <p className="text-muted-foreground text-sm mt-1">Select a collection to view its endpoints</p>
                </div>

                {collections.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No collections found.</p>
                        <button
                            onClick={() => navigate("/dashboard/postman")}
                            className="mt-3 text-sm text-primary hover:underline"
                        >
                            Connect Postman first
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {collections.map((c, i) => (
                            <motion.button
                                key={c.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                onClick={() => handleSelectCollection(c)}
                                className="glass-card p-5 text-left hover:border-primary/40 transition-all group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <FolderOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                            {c.name}
                                        </h3>
                                        {c.createdAt && (
                                            <p className="text-xs text-muted-foreground mt-1">{c.createdAt}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- Endpoints View ---
    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{selectedCollection.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            {requestsLoading ? "Loading..." : `${filtered.length} endpoint${filtered.length !== 1 ? "s" : ""}`}
                        </p>
                    </div>
                </div>
            </div>

            {requestsLoading && (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            )}

            {requestsError && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                    <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                    <p className="text-muted-foreground">{requestsError}</p>
                </div>
            )}

            {!requestsLoading && !requestsError && (
                <>
                    {/* Search */}
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search endpoints..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>

                    {/* Endpoints list */}
                    <div className="space-y-2">
                        {filtered.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No endpoints found.</div>
                        ) : (
                            filtered.map((req, i) => {
                                const id = req.id || `req-${i}`;
                                const isExpanded = expandedId === id;
                                const urlStr = resolveUrl(req.request?.url);

                                return (
                                    <motion.div
                                        key={id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="glass-card overflow-hidden"
                                    >
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : id)}
                                            className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                            )}
                                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase shrink-0 ${getMethodClass(req.request?.method)}`}>
                                                {req.request?.method || "???"}
                                            </span>
                                            <span className="font-mono text-sm text-foreground truncate flex-1">{urlStr || "No URL"}</span>
                                            <span className="text-sm text-muted-foreground truncate max-w-[200px] hidden sm:inline">{req.name}</span>
                                        </button>

                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className="border-t border-border px-4 pb-4"
                                            >
                                                {req.name && (
                                                    <div className="pt-3 pb-2">
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</span>
                                                        <p className="text-sm text-foreground mt-1">{req.name}</p>
                                                    </div>
                                                )}
                                                {req.request?.description && (
                                                    <div className="pb-2">
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                                                        <p className="text-sm text-muted-foreground mt-1">{req.request?.description}</p>
                                                    </div>
                                                )}
                                                <div className="pb-2">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">{urlStr}</code>
                                                        <button onClick={() => copyToClipboard(urlStr)} className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {req.request?.header && req.request?.header.length > 0 && (
                                                    <div className="pb-2">
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headers</span>
                                                        <div className="mt-1 space-y-1">
                                                            {req.request?.header.map((h, hi) => (
                                                                <div key={hi} className="flex gap-2 text-xs font-mono">
                                                                    <span className="text-foreground font-medium">{h.key}:</span>
                                                                    <span className="text-muted-foreground">{h.value}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {req.request?.body?.raw && (
                                                    <div className="pb-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body</span>
                                                            <button onClick={() => copyToClipboard(req.request?.body?.raw)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <pre className="mt-1 p-3 rounded bg-muted text-xs font-mono overflow-auto max-h-48">{req.request?.body?.raw}</pre>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default EndpointsPage;
