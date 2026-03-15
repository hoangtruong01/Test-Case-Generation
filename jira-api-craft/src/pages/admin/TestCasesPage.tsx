import { useState, useEffect, useMemo } from "react";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AdminTestCase, getTestCases } from "@/services/adminService";
import SearchInput from "@/components/admin/SearchInput";
import AdminModal from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/button";

const statusToBadgeVariant = (s?: string) => {
  if (!s) return "outline" as const;
  const st = String(s).toLowerCase();
  if (st.includes("pass") || st.includes("ok") || st.includes("done"))
    return "default" as const;
  if (st.includes("fail") || st.includes("error") || st.includes("broken"))
    return "destructive" as const;
  return "secondary" as const;
};

const statusToBorder = (s?: string) => {
  if (!s) return "border-gray-200";
  const st = String(s).toLowerCase();
  if (st.includes("pass") || st.includes("ok") || st.includes("done"))
    return "border-emerald-200";
  if (st.includes("fail") || st.includes("error") || st.includes("broken"))
    return "border-red-200";
  return "border-yellow-200";
};

const PAGE_SIZE = 10;

const TestCasesPage = () => {
  const [cases, setCases] = useState<AdminTestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>(
    {},
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCase, setModalCase] = useState<AdminTestCase | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getTestCases();
        let items: AdminTestCase[] = [];
        if (Array.isArray(res)) items = res;
        else if (res?.data && Array.isArray(res.data)) items = res.data;
        else if (res?.testCases) items = res.testCases;
        else if (res?.testcases) items = res.testcases; // handle lowercase key from backend

        if (!mounted) return;
        setCases(items);
      } catch (err) {
        toast.error(err?.message || "Failed to load test cases");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return cases;
    const q = search.toLowerCase();
    return cases.filter((c) =>
      [c.id, c.user, c.jira_project_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [cases, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<AdminTestCase>[] = [
    {
      key: "id",
      label: "ID",
      render: (r) => <code className="font-mono text-xs">{r.id}</code>,
    },
    { key: "user", label: "User", render: (r) => <span>{r.user}</span> },
    {
      key: "jira_project_name",
      label: "Project",
      render: (r) => <span>{r.jira_project_name}</span>,
    },
    {
      key: "created_at",
      label: "Created",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "testcase_count",
      label: "Count",
      render: (r) => <Badge variant="outline">{r.testcase_count ?? "-"}</Badge>,
    },
    {
      key: "testsuite",
      label: "Testsuites",
      render: (r) => (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setModalCase(r);
                  setModalOpen(true);
                }}
              >
                View All
              </Button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test Cases</h1>
          <p className="text-sm text-muted-foreground">
            Admin view of test cases
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 pb-[12px]">
            {/* Search */}
            <SearchInput
              placeholder="Search id, user, project..."
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-background">
          <AdminTable columns={columns} data={paginated} loading={loading} />
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <AdminModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalCase(null);
        }}
        title={
          modalCase
            ? `Testcases for ${modalCase.jira_project_name || modalCase.user}`
            : "Testcases"
        }
        onSubmit={() => setModalOpen(false)}
      >
        {modalCase ? (
          <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
            {Array.isArray(modalCase.testsuite) &&
            modalCase.testsuite.length > 0 ? (
              modalCase.testsuite.map((ts, idx) => (
                <div
                  key={idx}
                  className={`p-3 border rounded ${statusToBorder(ts.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">TC: {ts.test_case_id}</div>
                    <Badge variant={statusToBadgeVariant(ts.status)}>
                      {ts.status}
                    </Badge>
                  </div>
                  <div className="font-medium">Name: {ts.title}</div>
                  <div className="text-sm mt-2">
                    Expected: {ts.expected_result}
                  </div>
                  <div className="text-sm">Actual: {ts.actual_result}</div>
                  {Array.isArray(ts.test_steps) && (
                    <ul className="list-decimal pl-6 mt-2">
                      {ts.test_steps.map((step, i: number) => (
                        <li key={i} className="mb-1">
                          <div className="font-medium">
                            Step {step.step_number}
                          </div>
                          <div>Action: {step.action}</div>
                          <div className="text-muted-foreground">
                            Data: {step.test_data}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No testcases</div>
            )}
          </div>
        ) : (
          <div>No testcase selected</div>
        )}
      </AdminModal>
    </div>
  );
};

export default TestCasesPage;
