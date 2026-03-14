import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchInput from "@/components/admin/SearchInput";
import Pagination from "@/components/admin/Pagination";
import { AdminProject, getProjects, createProject, updateProject, deleteProject, CreateProjectPayload } from "@/services/adminService";

const PAGE_SIZE = 10;

const AdminProjectsPage = () => {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProject | null>(null);
  const [form, setForm] = useState<CreateProjectPayload>({ projectName: "", description: "", owner: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProject | null>(null);
  const [deleting, setDeleting] = useState(false);


  // Mock data
  // ================= MOCK DATA =================
  // TODO: Replace with API getProjects() later

  const mockProjects: AdminProject[] = [
    {
      id: "p1",
      projectName: "Postbot Automation",
      description: "Automation testing for Postman collections",
      owner: "khoa",
      totalTestSuites: 8,
      createdAt: "2024-01-10T10:00:00Z",
    },
    {
      id: "p2",
      projectName: "AI Test Generator",
      description: "Generate API test cases using AI",
      owner: "anna",
      totalTestSuites: 5,
      createdAt: "2024-02-01T08:30:00Z",
    },
    {
      id: "p3",
      projectName: "Payment Service",
      description: "Payment microservice testing",
      owner: "john",
      totalTestSuites: 12,
      createdAt: "2024-02-18T12:15:00Z",
    },
    {
      id: "p4",
      projectName: "E-commerce API",
      description: "Test cases for product & order APIs",
      owner: "lucas",
      totalTestSuites: 6,
      createdAt: "2024-03-05T09:20:00Z",
    },
    {
      id: "p5",
      projectName: "Auth Service",
      description: "Authentication & JWT validation tests",
      owner: "emma",
      totalTestSuites: 4,
      createdAt: "2024-03-11T11:45:00Z",
    },
    {
      id: "p6",
      projectName: "Notification System",
      description: "Email + Push notification testing",
      owner: "sarah",
      totalTestSuites: 7,
      createdAt: "2024-03-20T14:10:00Z",
    },
    {
      id: "p7",
      projectName: "Analytics API",
      description: "Event tracking & analytics endpoints",
      owner: "david",
      totalTestSuites: 3,
      createdAt: "2024-04-01T10:50:00Z",
    },
    {
      id: "p8",
      projectName: "User Service",
      description: "User CRUD + permissions testing",
      owner: "oliver",
      totalTestSuites: 9,
      createdAt: "2024-04-15T16:25:00Z",
    },
  ];

  // const fetchData = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await getProjects();
  //     setProjects(Array.isArray(res) ? res : res.projects || []);
  //   } catch {
  //     toast.error("Failed to fetch projects");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchData = async () => {
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 500));

      setProjects(mockProjects);

    } catch {
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (!search) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => p.projectName?.toLowerCase().includes(q) || p.owner?.toLowerCase().includes(q));
  }, [projects, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditing(null); setForm({ projectName: "", description: "", owner: "" }); setModalOpen(true); };
  const openEdit = (p: AdminProject) => { setEditing(p); setForm({ projectName: p.projectName, description: p.description, owner: p.owner }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await updateProject(editing.id, form); toast.success("Project updated"); }
      else { await createProject(form); toast.success("Project created"); }
      setModalOpen(false); fetchData();
    } catch (e: any) { toast.error(e.message || "Save failed"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteProject(deleteTarget.id); toast.success("Project deleted"); setDeleteTarget(null); fetchData(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); } finally { setDeleting(false); }
  };

  const columns: Column<AdminProject>[] = [
    { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id?.slice(0, 8)}…</span> },
    { key: "projectName", label: "Project Name", render: (r) => <span className="font-medium">{r.projectName}</span> },
    { key: "description", label: "Description", render: (r) => <span className="text-sm text-muted-foreground max-w-[200px] truncate block">{r.description || "—"}</span> },
    { key: "owner", label: "Owner" },
    { key: "totalTestSuites", label: "Test Suites", render: (r) => <Badge variant="secondary">{r.totalTestSuites ?? 0}</Badge> },
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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage all projects in the system
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>

      </div>


      {/* ================= MAIN CARD ================= */}
      <div className="bg-card border rounded-xl shadow-sm p-6 space-y-5">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">

          {/* Search */}
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search project name or owner..."
          />

          {/* Stats */}
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold">{filtered.length}</span> projects
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


      {/* ================= CREATE / EDIT MODAL ================= */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Project" : "Create Project"}
        onSubmit={handleSave}
        loading={saving}
      >

        <div className="space-y-4">

          {/* Project Name */}
          <div>
            <Label>Project Name</Label>
            <Input
              placeholder="Enter project name"
              value={form.projectName}
              onChange={(e) =>
                setForm({ ...form, projectName: e.target.value })
              }
            />
          </div>

          {/* Description */}
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

          {/* Owner */}
          <div>
            <Label>Owner</Label>
            <Input
              placeholder="Project owner"
              value={form.owner}
              onChange={(e) =>
                setForm({ ...form, owner: e.target.value })
              }
            />
          </div>

        </div>

      </AdminModal>


      {/* ================= DELETE CONFIRM ================= */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        description={`Delete "${deleteTarget?.projectName}"? All associated test suites and cases will be removed.`}
        loading={deleting}
      />

    </div>
  );
};

export default AdminProjectsPage;
