import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchInput from "@/components/admin/SearchInput";
import Pagination from "@/components/admin/Pagination";
import { AdminTestSuite, AdminProject, getTestSuites, createTestSuite, updateTestSuite, deleteTestSuite, getProjects, CreateTestSuitePayload } from "@/services/adminService";

const PAGE_SIZE = 10;

const TestSuitesPage = () => {
  const [suites, setSuites] = useState<AdminTestSuite[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTestSuite | null>(null);
  const [form, setForm] = useState<CreateTestSuitePayload>({ suiteName: "", projectId: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTestSuite | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mock data
  // Mock Data
  const mockProjects: AdminProject[] = [
    {
      id: "p1",
      projectName: "Postbot Automation",
      description: "Automation testing for Postman collections",
      owner: "khoa",
      totalTestSuites: 8,
      createdAt: "2024-03-01"
    },
    {
      id: "p2",
      projectName: "AI Test Generator",
      description: "AI powered test generation",
      owner: "anna",
      totalTestSuites: 5,
      createdAt: "2024-03-05"
    },
    {
      id: "p3",
      projectName: "Payment Service",
      description: "Payment microservice testing",
      owner: "john",
      totalTestSuites: 12,
      createdAt: "2024-03-10"
    },
    {
      id: "p4",
      projectName: "Auth Service",
      description: "Authentication and JWT testing",
      owner: "emma",
      totalTestSuites: 6,
      createdAt: "2024-03-15"
    }
  ];

  const mockSuites: AdminTestSuite[] = [
    {
      id: "s1",
      suiteName: "User Authentication",
      projectId: "p4",
      projectName: "Auth Service",
      totalTestCases: 12,
      description: "Login / Register / JWT tests",
      createdAt: "2024-03-01",
    },
    {
      id: "s2",
      suiteName: "Payment API",
      projectId: "p3",
      projectName: "Payment Service",
      totalTestCases: 8,
      description: "Stripe payment flow",
      createdAt: "2024-03-05",
    },
    {
      id: "s3",
      suiteName: "Collection Import",
      projectId: "p1",
      projectName: "Postbot Automation",
      totalTestCases: 6,
      description: "Import Postman collection",
      createdAt: "2024-03-12",
    },
    {
      id: "s4",
      suiteName: "AI Test Generation",
      projectId: "p2",
      projectName: "AI Test Generator",
      totalTestCases: 15,
      description: "AI generated test cases",
      createdAt: "2024-03-20",
    },
    {
      id: "s5",
      suiteName: "Webhook Testing",
      projectId: "p1",
      projectName: "Postbot Automation",
      totalTestCases: 9,
      description: "Webhook triggers",
      createdAt: "2024-04-01",
    },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {

      await new Promise((r) => setTimeout(r, 500));

      setSuites(mockSuites);
      setProjects(mockProjects);

    } catch {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // const fetchData = async () => {
  //   setLoading(true);
  //   try {
  //     const [sRes, pRes] = await Promise.all([getTestSuites(), getProjects()]);
  //     setSuites(Array.isArray(sRes) ? sRes : sRes.testSuites || []);
  //     setProjects(Array.isArray(pRes) ? pRes : pRes.projects || []);
  //   } catch { toast.error("Failed to fetch data"); } finally { setLoading(false); }
  // };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let list = suites;
    if (search) { const q = search.toLowerCase(); list = list.filter((s) => s.suiteName?.toLowerCase().includes(q)); }
    if (projectFilter !== "ALL") list = list.filter((s) => s.projectId === projectFilter || s.projectName === projectFilter);
    return list;
  }, [suites, search, projectFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditing(null); setForm({ suiteName: "", projectId: projects[0]?.id || "", description: "" }); setModalOpen(true); };
  const openEdit = (s: AdminTestSuite) => { setEditing(s); setForm({ suiteName: s.suiteName, projectId: s.projectId, description: s.description }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await updateTestSuite(editing.id, form); toast.success("Test suite updated"); }
      else { await createTestSuite(form); toast.success("Test suite created"); }
      setModalOpen(false); fetchData();
    } catch (e: any) { toast.error(e.message || "Save failed"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteTestSuite(deleteTarget.id); toast.success("Deleted"); setDeleteTarget(null); fetchData(); }
    catch (e: any) { toast.error(e.message); } finally { setDeleting(false); }
  };

  const columns: Column<AdminTestSuite>[] = [
    { key: "id", label: "Suite ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id?.slice(0, 8)}…</span> },
    { key: "suiteName", label: "Suite Name", render: (r) => <span className="font-medium">{r.suiteName}</span> },
    { key: "projectName", label: "Project" },
    { key: "totalTestCases", label: "Test Cases", render: (r) => <Badge variant="secondary">{r.totalTestCases ?? 0}</Badge> },
    { key: "createdAt", label: "Created At", render: (r) => <span className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</span> },
    {
      key: "actions", label: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold">Test Suites</h1>
          <p className="text-sm text-muted-foreground">
            Manage automated test suites
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Test Suite
        </Button>

      </div>


      {/* ================= MAIN CARD ================= */}
      <div className="bg-card border rounded-xl shadow-sm p-6 space-y-5">

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between">

          <div className="flex items-center gap-3">

            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search test suites..."
            />

            <Select
              value={projectFilter}
              onValueChange={(v) => {
                setProjectFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>

                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectName}
                  </SelectItem>
                ))}

              </SelectContent>
            </Select>

          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold">{filtered.length}</span> suites
          </div>

        </div>


        {/* ================= TABLE ================= */}
        <div className="border rounded-lg overflow-hidden bg-background">

          <AdminTable
            columns={columns}
            data={paginated}
            loading={loading}
          />

        </div>


        {/* ================= PAGINATION ================= */}
        <div className="flex items-center justify-between">

          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />

        </div>

      </div>


      {/* ================= MODAL ================= */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Test Suite" : "Create Test Suite"}
        onSubmit={handleSave}
        loading={saving}
      >

        <div className="space-y-4">

          <div>
            <Label>Suite Name</Label>
            <Input
              placeholder="Enter suite name"
              value={form.suiteName}
              onChange={(e) =>
                setForm({ ...form, suiteName: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Project</Label>

            <Select
              value={form.projectId}
              onValueChange={(v) =>
                setForm({ ...form, projectId: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>

              <SelectContent>

                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectName}
                  </SelectItem>
                ))}

              </SelectContent>
            </Select>

          </div>

          <div>
            <Label>Description</Label>

            <Input
              placeholder="Short description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

        </div>

      </AdminModal>


      {/* ================= DELETE ================= */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Test Suite"
        description={`Delete "${deleteTarget?.suiteName}"? All test cases in this suite will be removed.`}
        loading={deleting}
      />

    </div>
  );
};

export default TestSuitesPage;
