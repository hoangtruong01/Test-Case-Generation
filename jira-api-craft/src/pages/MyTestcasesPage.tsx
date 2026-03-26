import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileDown,
  TableIcon,
  Loader2,
  FolderOpen,
  RefreshCw,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Passed: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  Failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  Pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
  Blocked: <AlertCircle className="w-3.5 h-3.5 text-orange-500" />,
};

function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const cls = PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{priority}</span>;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface DbTestcaseRow {
  id: string;
  user: string;
  jira_project_name: string | null;
  postman_workspace: string | null;
  postman_collection: string | null;
  testsuite: any[] | null;
  created_at: string;
}

// ── inline test-case card ─────────────────────────────────────────────────────

const TcCard = ({ tc }: { tc: any }) => {
  const [open, setOpen] = useState(false);
  const steps: any[] = Array.isArray(tc.test_steps) ? tc.test_steps : [];
  const pre: string[] = Array.isArray(tc.pre_conditions) ? tc.pre_conditions : [];
  const post: string[] = Array.isArray(tc.post_conditions) ? tc.post_conditions : [];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-2 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="text-xs font-mono text-muted-foreground">{tc.test_case_id}</span>
            <PriorityBadge priority={tc.priority} />
            {tc.module && <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tc.module}</span>}
          </div>
          <div className="text-sm font-medium text-foreground">{tc.title || tc.test_case_id}</div>
          {tc.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tc.description}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {STATUS_ICON[tc.status ?? ""] ?? <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
            {tc.status ?? "Pending"}
          </span>
          <button onClick={() => setOpen(v => !v)} className="p-0.5 rounded hover:bg-muted">
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-3 text-sm">
          {pre.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Pre-conditions</div>
              <ul className="list-disc pl-4 space-y-0.5 text-foreground text-xs">{pre.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {steps.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Steps</div>
              <div className="space-y-1.5">
                {steps.map((s: any, i: number) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{s.step_number ?? i + 1}</span>
                    <div className="flex-1">
                      <div className="text-foreground text-xs">{s.action || s}</div>
                      {s.test_data && <div className="mt-0.5 text-xs font-mono bg-muted rounded px-1.5 py-0.5 text-muted-foreground">{s.test_data}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tc.expected_result && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Expected Result</div>
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2 py-1.5 text-xs text-foreground">{tc.expected_result}</div>
            </div>
          )}
          {post.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Post-conditions</div>
              <ul className="list-disc pl-4 space-y-0.5 text-foreground text-xs">{post.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {tc.metadata && typeof tc.metadata === "object" && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(tc.metadata).map(([k, v]) => (
                <span key={k} className="text-xs text-muted-foreground">{k}: <span className="text-foreground font-medium">{String(v)}</span></span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── suite row ─────────────────────────────────────────────────────────────────

const SuiteRow = ({ row }: { row: DbTestcaseRow }) => {
  const [open, setOpen] = useState(false);
  const suite = Array.isArray(row.testsuite) ? row.testsuite : [];
  const source = row.postman_collection
    ? `${row.postman_workspace ?? ""} / ${row.postman_collection}`
    : row.jira_project_name ?? "—";

  const exportSuiteCsv = () => {
    if (suite.length === 0) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["test_case_id", "title", "priority", "module", "status", "expected_result", "steps"].join(",");
    const lines = suite.map((tc: any) => {
      const steps = (tc.test_steps || []).map((s: any) => s.action || s).join(" | ");
      return [tc.test_case_id, tc.title, tc.priority, tc.module, tc.status, tc.expected_result, steps].map(esc).join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `testcases_${row.id.slice(0, 8)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const exportSuiteExcel = async () => {
    if (suite.length === 0) return;
    try {
      await api.downloadTestcasesExcel(suite, `testcases_${row.id.slice(0, 8)}.xlsx`);
      toast.success("Downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* suite header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setOpen(v => !v)} className="p-1 rounded hover:bg-muted shrink-0">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        <FolderOpen className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{source}</div>
          <div className="text-xs text-muted-foreground">
            {suite.length} test case{suite.length !== 1 ? "s" : ""} · {new Date(row.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => void exportSuiteExcel()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={exportSuiteCsv}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border hover:bg-muted text-xs font-medium transition-colors"
          >
            <TableIcon className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* expanded test cases */}
      {open && (
        <div className="border-t border-border p-4 space-y-2 bg-muted/20">
          {suite.length === 0 ? (
            <div className="text-sm text-muted-foreground">No test cases in this suite.</div>
          ) : (
            suite.map((tc: any, i: number) => <TcCard key={tc.test_case_id || i} tc={tc} />)
          )}
        </div>
      )}
    </div>
  );
};

// ── page ──────────────────────────────────────────────────────────────────────

const MyTestcasesPage = () => {
  const [rows, setRows] = useState<DbTestcaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getMyTestcases();
      if ("error" in res) {
        toast.error(res.error);
        setRows([]);
      } else {
        setRows((res.testcases as unknown as DbTestcaseRow[]) || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.postman_collection ?? "").toLowerCase().includes(q) ||
      (r.postman_workspace ?? "").toLowerCase().includes(q) ||
      (r.jira_project_name ?? "").toLowerCase().includes(q)
    );
  });

  const totalCases = rows.reduce((acc, r) => acc + (Array.isArray(r.testsuite) ? r.testsuite.length : 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Test Cases</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} suite{rows.length !== 1 ? "s" : ""} · {totalCases} total test cases
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <input
        type="search"
        placeholder="Search by workspace, collection or project…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {search ? "No suites match your search." : "No test cases generated yet. Go to 'From Postman' to get started."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => <SuiteRow key={row.id} row={row} />)}
        </div>
      )}
    </div>
  );
};

export default MyTestcasesPage;
