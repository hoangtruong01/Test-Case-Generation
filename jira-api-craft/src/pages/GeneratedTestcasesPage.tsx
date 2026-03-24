import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { api } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const GeneratedTestcasesPage = () => {
  const { generatedTestcases } = useAppContext();
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const navigate = useNavigate();

  const toggleExpanded = (id: string | number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectSelectedRaw = (): unknown[] => {
    const all = generatedTestcases || [];
    const pick = selectedIds.size === 0 ? null : selectedIds;
    const out: unknown[] = [];
    all.forEach((tc: any) => {
      if (tc.tests && Array.isArray(tc.tests)) {
        tc.tests.forEach((t: any) => {
          const id = t.test_case_id || t.id || "";
          if (pick === null || pick.has(id)) out.push(t);
        });
      } else {
        const id = tc.test_case_id || tc.id || "";
        if (pick === null || pick.has(id)) out.push(tc);
      }
    });
    return out;
  };

  const exportExcel = async () => {
    const rows = collectSelectedRaw();
    if (rows.length === 0) {
      toast.error("No test cases to export");
      return;
    }
    try {
      await api.downloadTestcasesExcel(rows);
      toast.success("Downloaded testcases.xlsx");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Excel export failed");
    }
  };

  const exportSelectedAsCsv = () => {
    const all = generatedTestcases || [];
    const pick = new Set(selectedIds);
    const rows: string[] = [];
    // header
    rows.push(
      [
        "test_case_id",
        "title",
        "expected_result",
        "actual_result",
        "status",
        "steps",
        "metadata",
      ].join(","),
    );

    const pushRow = (tc: any, t?: any) => {
      const id =
        (t && (t.test_case_id || t.id)) || tc.test_case_id || tc.id || "";
      const title = (t && (t.title || t.name)) || tc.title || tc.name || "";
      const expected =
        (t && (t.expected_result || t.expected)) ||
        tc.expected_result ||
        tc.expected ||
        "";
      const actual = (t && t.actual_result) || tc.actual_result || "";
      const status = (t && t.status) || tc.status || "";
      const stepsArr =
        (t && (t.test_steps || t.steps)) || tc.test_steps || tc.steps || [];
      const steps = Array.isArray(stepsArr)
        ? stepsArr.map((s: any) => s.action || s).join(" | ")
        : String(stepsArr);
      const metadata = JSON.stringify((t && t.metadata) || tc.metadata || {});
      rows.push(
        [
          `"${String(id).replace(/"/g, '""')}"`,
          `"${String(title).replace(/"/g, '""')}"`,
          `"${String(expected).replace(/"/g, '""')}"`,
          `"${String(actual).replace(/"/g, '""')}"`,
          `"${String(status).replace(/"/g, '""')}"`,
          `"${String(steps).replace(/"/g, '""')}"`,
          `"${metadata.replace(/"/g, '""')}"`,
        ].join(","),
      );
    };

    all.forEach((tc: any) => {
      if (tc.tests && Array.isArray(tc.tests)) {
        tc.tests.forEach((t: any) => {
          const id = t.test_case_id || t.id || "";
          if (selectedIds.size === 0 || pick.has(id)) pushRow(tc, t);
        });
      } else {
        const id = tc.test_case_id || tc.id || "";
        if (selectedIds.size === 0 || pick.has(id)) pushRow(tc);
      }
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated_testcases.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">Generated Testcases</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void exportExcel()}
            className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={exportSelectedAsCsv}
            className="px-3 py-1 rounded-lg border hover:bg-muted text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {generatedTestcases.length === 0 ? (
        <div className="text-muted-foreground">No generated testcases yet.</div>
      ) : (
        <div className="space-y-4">
          {generatedTestcases.map((tc: any, idx: number) => {
            // If the backend returned grouped testcases by issue (tc.tests array), render as group
            if (tc.tests && Array.isArray(tc.tests)) {
              return (
                <div
                  key={`${tc.issueKey || idx}-group`}
                  className="glass-card p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Issue</div>
                      <div className="font-semibold text-foreground">
                        {tc.issueKey || tc.issue?.key || `Issue ${idx + 1}`}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tc.tests.length} tests
                    </div>
                  </div>

                  {tc.tests.map((t: any, i: number) => {
                    const tid = t.test_case_id || t.id || `${idx}-${i}`;
                    const isOpen = expanded.has(tid);
                    return (
                      <div
                        key={tid}
                        className="border-t border-border pt-3 mt-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(tid)}
                              onChange={() => toggleSelect(tid)}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium">
                                {t.title || t.name || t.test_case_id}
                              </div>
                              {t.test_case_id && (
                                <div className="text-xs text-muted-foreground">
                                  ID: {t.test_case_id}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {t.type || ""}
                            </div>
                            <button
                              onClick={() => toggleExpanded(tid)}
                              className="text-xs text-primary underline"
                            >
                              {isOpen ? "Hide details" : "View details"}
                            </button>
                          </div>
                        </div>

                        {t.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {t.description}
                          </div>
                        )}

                        {isOpen && (
                          <div className="mt-3 text-sm text-muted-foreground">
                            {t.test_steps && (
                              <>
                                <div className="font-medium text-foreground mb-1">
                                  Steps
                                </div>
                                <ol className="list-decimal pl-5">
                                  {t.test_steps.map((s: any, si: number) => (
                                    <li
                                      key={si}
                                      className="mb-1 text-foreground"
                                    >
                                      {s.action || s}
                                    </li>
                                  ))}
                                </ol>
                              </>
                            )}

                            {t.steps && (
                              <>
                                <div className="font-medium text-foreground mb-1">
                                  Steps
                                </div>
                                <ol className="list-decimal pl-5">
                                  {t.steps.map((s: string, si: number) => (
                                    <li
                                      key={si}
                                      className="mb-1 text-foreground"
                                    >
                                      {s}
                                    </li>
                                  ))}
                                </ol>
                              </>
                            )}

                            {t.expected_result && (
                              <div className="mt-3">
                                <div className="font-medium text-foreground">
                                  Expected:
                                </div>
                                <div className="text-foreground">
                                  {t.expected_result}
                                </div>
                              </div>
                            )}

                            {t.actual_result !== undefined && (
                              <div className="mt-2">
                                <div className="font-medium text-foreground">
                                  Actual:
                                </div>
                                <div className="text-foreground">
                                  {t.actual_result || ""}
                                </div>
                              </div>
                            )}

                            {t.status && (
                              <div className="mt-2">
                                <div className="font-medium text-foreground">
                                  Status:
                                </div>
                                <div className="text-foreground">
                                  {t.status}
                                </div>
                              </div>
                            )}

                            {t.post_conditions && (
                              <div className="mt-2">
                                <div className="font-medium text-foreground">
                                  Post-conditions:
                                </div>
                                <div className="text-foreground">
                                  {String(t.post_conditions)}
                                </div>
                              </div>
                            )}

                            {t.metadata && typeof t.metadata === "object" && (
                              <div className="mt-2">
                                <div className="font-medium text-foreground">
                                  Metadata:
                                </div>
                                <div className="text-foreground">
                                  {Object.entries(t.metadata).map(([k, v]) => (
                                    <div key={k} className="text-sm">
                                      {k}: {String(v)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Otherwise treat tc as a single testcase object (flat list)
            const title =
              tc.title || tc.name || tc.test_case_id || `Testcase ${idx + 1}`;
            const id = tc.test_case_id || tc.id || idx;
            const expected =
              tc.expected_result || tc.expected || tc.actual_result || "";
            const steps = Array.isArray(tc.test_steps)
              ? tc.test_steps.map((s: any) => s.action || s)
              : Array.isArray(tc.test_steps?.steps)
                ? tc.test_steps.steps
                : [];

            const isOpen = expanded.has(id);

            return (
              <div key={`${id}-${idx}`} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(id)}
                      onChange={() => toggleSelect(id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Testcase
                      </div>
                      <div className="font-semibold text-foreground">
                        {title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {expected ? "Has expected result" : "No expected result"}
                    </div>
                    <button
                      onClick={() => toggleExpanded(id)}
                      className="text-xs text-primary underline"
                    >
                      {isOpen ? "Hide details" : "View details"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {expected && (
                      <div className="mb-2">
                        <div className="font-medium text-foreground">
                          Expected
                        </div>
                        <div className="text-foreground">{expected}</div>
                      </div>
                    )}

                    {tc.actual_result !== undefined && (
                      <div className="mb-2">
                        <div className="font-medium text-foreground">
                          Actual
                        </div>
                        <div className="text-foreground">
                          {tc.actual_result || ""}
                        </div>
                      </div>
                    )}

                    {tc.status && (
                      <div className="mb-2">
                        <div className="font-medium text-foreground">
                          Status
                        </div>
                        <div className="text-foreground">{tc.status}</div>
                      </div>
                    )}

                    {tc.post_conditions && (
                      <div className="mb-2">
                        <div className="font-medium text-foreground">
                          Post-conditions
                        </div>
                        <div className="text-foreground">
                          {String(tc.post_conditions)}
                        </div>
                      </div>
                    )}

                    {tc.metadata && typeof tc.metadata === "object" && (
                      <div className="mb-2">
                        <div className="font-medium text-foreground">
                          Metadata
                        </div>
                        <div className="text-foreground">
                          {Object.entries(tc.metadata).map(([k, v]) => (
                            <div key={k} className="text-sm">
                              {k}: {String(v)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {steps.length > 0 && (
                      <>
                        <div className="font-medium text-foreground mb-1">
                          Steps
                        </div>
                        <ol className="list-decimal pl-5">
                          {steps.map((s: string, si: number) => (
                            <li key={si} className="mb-1 text-foreground">
                              {s}
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GeneratedTestcasesPage;
