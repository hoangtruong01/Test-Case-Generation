import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { api } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileDown,
  TableIcon,
  Globe,
} from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Passed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  Failed: <XCircle className="w-4 h-4 text-red-500" />,
  Pending: <Clock className="w-4 h-4 text-yellow-500" />,
  Blocked: <AlertCircle className="w-4 h-4 text-orange-500" />,
};

const METHOD_COLOR: Record<string, string> = {
  GET: "text-green-600 dark:text-green-400",
  POST: "text-blue-600 dark:text-blue-400",
  PUT: "text-yellow-600 dark:text-yellow-400",
  PATCH: "text-orange-600 dark:text-orange-400",
  DELETE: "text-red-600 dark:text-red-400",
};

// ── small helpers ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const cls = PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{priority}</span>;
}

function StatusBadge({ status }: { status?: string }) {
  const icon = STATUS_ICON[status ?? ""] ?? <Clock className="w-4 h-4 text-muted-foreground" />;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {icon}
      {status ?? "Pending"}
    </span>
  );
}

// ── test-case card ────────────────────────────────────────────────────────────

interface TestCaseCardProps {
  tc: any;
  selected: boolean;
  onToggleSelect: () => void;
}

const TestCaseCard: React.FC<TestCaseCardProps> = ({ tc, selected, onToggleSelect }) => {
  const [open, setOpen] = useState(false);

  const id = tc.test_case_id || tc.id || "";
  const title = tc.title || tc.name || id || "Untitled";
  const steps: any[] = Array.isArray(tc.test_steps) ? tc.test_steps : [];
  const preConditions: string[] = Array.isArray(tc.pre_conditions) ? tc.pre_conditions : [];
  const postConditions: string[] = Array.isArray(tc.post_conditions) ? tc.post_conditions : [];

  return (
    <div className={`rounded-xl border transition-colors ${selected ? "border-primary/60 bg-primary/5" : "border-border bg-card"}`}>
      {/* header */}
      <div className="flex items-start gap-3 p-4">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="mt-1 accent-primary cursor-pointer" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{id}</span>
            <PriorityBadge priority={tc.priority} />
            {tc.module && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tc.module}</span>
            )}
          </div>
          <div className="font-semibold text-foreground leading-snug">{title}</div>
          {tc.description && (
            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{tc.description}</div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={tc.status} />
          <button onClick={() => setOpen((v) => !v)} className="p-1 rounded hover:bg-muted transition-colors" aria-label={open ? "Collapse" : "Expand"}>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* expanded body */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4 text-sm">
          {preConditions.length > 0 && (
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Pre-conditions</div>
              <ul className="list-disc pl-4 space-y-0.5 text-foreground">
                {preConditions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </section>
          )}

          {steps.length > 0 && (
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Test Steps</div>
              <div className="space-y-2">
                {steps.map((s: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {s.step_number ?? i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-foreground">{s.action || s}</div>
                      {s.test_data && (
                        <div className="mt-0.5 text-xs font-mono bg-muted rounded px-2 py-1 text-muted-foreground">{s.test_data}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tc.expected_result && (
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Expected Result</div>
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-foreground">
                {tc.expected_result}
              </div>
            </section>
          )}

          {tc.actual_result !== undefined && tc.actual_result !== "" && (
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Actual Result</div>
              <div className="rounded-lg bg-muted px-3 py-2 text-foreground">{tc.actual_result}</div>
            </section>
          )}

          {postConditions.length > 0 && (
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Post-conditions</div>
              <ul className="list-disc pl-4 space-y-0.5 text-foreground">
                {postConditions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </section>
          )}

          {tc.metadata && typeof tc.metadata === "object" && (
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Metadata</div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(tc.metadata).map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-muted-foreground">{k}: </span>
                    <span className="text-foreground font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

// ── page ──────────────────────────────────────────────────────────────────────

const GeneratedTestcasesPage = () => {
  const { generatedTestcases, endpointResults } = useAppContext();
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const navigate = useNavigate();

  const flatTestcases: any[] = React.useMemo(() => {
    const out: any[] = [];
    (generatedTestcases || []).forEach((tc: any) => {
      if (tc.tests && Array.isArray(tc.tests)) {
        tc.tests.forEach((t: any) => out.push(t));
      } else {
        out.push(tc);
      }
    });
    return out;
  }, [generatedTestcases]);

  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === flatTestcases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(flatTestcases.map((tc) => tc.test_case_id || tc.id || "")));
    }
  };

  const collectSelected = (): any[] => {
    if (selectedIds.size === 0) return flatTestcases;
    return flatTestcases.filter((tc) => selectedIds.has(tc.test_case_id || tc.id || ""));
  };

  const exportExcel = async () => {
    const rows = collectSelected();
    if (rows.length === 0) { toast.error("No test cases to export"); return; }
    try {
      await api.downloadTestcasesExcel(rows);
      toast.success("Downloaded testcases.xlsx");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Excel export failed");
    }
  };

  const exportCsv = () => {
    const rows = collectSelected();
    if (rows.length === 0) { toast.error("No test cases to export"); return; }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["test_case_id", "title", "priority", "module", "status", "expected_result", "steps"].join(",");
    const lines = rows.map((tc) => {
      const steps = (tc.test_steps || []).map((s: any) => s.action || s).join(" | ");
      return [tc.test_case_id, tc.title, tc.priority, tc.module, tc.status, tc.expected_result, steps].map(esc).join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "testcases.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const exportEndpointResultsCsv = () => {
    if (endpointResults.length === 0) { toast.error("No endpoint results to export"); return; }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["#", "method", "name", "url", "status_code", "error"].join(",");
    const lines = endpointResults.map((ep) =>
      [ep.index + 1, ep.method, ep.name, ep.url, ep.status_code ?? "", ep.error].map(esc).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "endpoint_results.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const allSelected = flatTestcases.length > 0 && selectedIds.size === flatTestcases.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Generated Test Cases</h1>
            <p className="text-sm text-muted-foreground">
              {flatTestcases.length} test case{flatTestcases.length !== 1 ? "s" : ""} generated from API responses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void exportExcel()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-muted text-sm font-medium transition-colors"
          >
            <TableIcon className="w-4 h-4" />
            CSV
          </button>
          {endpointResults.length > 0 && (
            <button
              type="button"
              onClick={exportEndpointResultsCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-muted text-sm font-medium transition-colors"
            >
              <Globe className="w-4 h-4" />
              Run results CSV
            </button>
          )}
        </div>
      </div>

      {/* endpoint summary strip */}
      {endpointResults.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <Globe className="w-3.5 h-3.5" />
            Source endpoints ({endpointResults.length})
          </div>
          <div className="space-y-1.5">
            {endpointResults.map((ep) => (
              <div key={ep.index} className="flex items-center gap-2 text-sm">
                <span className={`font-mono text-xs font-bold shrink-0 ${METHOD_COLOR[ep.method] ?? "text-muted-foreground"}`}>
                  {ep.method}
                </span>
                <span className="text-foreground truncate flex-1">{ep.name || ep.url}</span>
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[260px] hidden sm:block">{ep.url}</span>
                {ep.status_code !== null && (
                  <span className={`text-xs font-mono shrink-0 ${ep.status_code >= 400 ? "text-red-500" : "text-green-500"}`}>
                    {ep.status_code}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Test cases below are derived from the actual responses of these endpoints, not from their definitions.
          </p>
        </div>
      )}

      {flatTestcases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No test cases generated yet. Go back and run your endpoints first.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-1">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-primary cursor-pointer" />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size === 0 ? `Select all (${flatTestcases.length})` : `${selectedIds.size} of ${flatTestcases.length} selected`}
            </span>
          </div>

          <div className="space-y-3">
            {flatTestcases.map((tc: any, idx: number) => {
              const id = tc.test_case_id || tc.id || idx;
              return (
                <TestCaseCard
                  key={`${id}-${idx}`}
                  tc={tc}
                  selected={selectedIds.has(id)}
                  onToggleSelect={() => toggleSelect(id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default GeneratedTestcasesPage;
