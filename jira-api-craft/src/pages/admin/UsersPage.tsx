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
import { AdminUser, getUsers, createUser, updateUser, deleteUser, CreateUserPayload } from "@/services/adminService";

const PAGE_SIZE = 10;

const UsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  // Mock Data
  const mockUsers: AdminUser[] = [
    {
      id: "1a2b3c4d5e",
      username: "admin",
      email: "admin@company.com",
      role: "ADMIN",
      jiraConnected: true,
      createdAt: "2024-01-10T10:20:00Z"
    },
    {
      id: "2b3c4d5e6f",
      username: "john_doe",
      email: "john@example.com",
      role: "USER",
      jiraConnected: false,
      createdAt: "2024-02-05T12:00:00Z"
    },
    {
      id: "3c4d5e6f7g",
      username: "anna",
      email: "anna@example.com",
      role: "USER",
      jiraConnected: true,
      createdAt: "2024-02-12T09:30:00Z"
    },
    {
      id: "4d5e6f7g8h",
      username: "mike",
      email: "mike@example.com",
      role: "USER",
      jiraConnected: false,
      createdAt: "2024-03-01T14:10:00Z"
    },
    {
      id: "5e6f7g8h9i",
      username: "sarah",
      email: "sarah@example.com",
      role: "ADMIN",
      jiraConnected: true,
      createdAt: "2024-03-10T08:45:00Z"
    },
    {
      id: "6f7g8h9i0j",
      username: "david",
      email: "david@example.com",
      role: "USER",
      jiraConnected: false,
      createdAt: "2024-03-18T16:25:00Z"
    },
    {
      id: "7g8h9i0j1k",
      username: "lucas",
      email: "lucas@example.com",
      role: "USER",
      jiraConnected: true,
      createdAt: "2024-03-20T11:00:00Z"
    },
    {
      id: "8h9i0j1k2l",
      username: "emma",
      email: "emma@example.com",
      role: "USER",
      jiraConnected: false,
      createdAt: "2024-04-02T13:40:00Z"
    },
    {
      id: "9i0j1k2l3m",
      username: "oliver",
      email: "oliver@example.com",
      role: "USER",
      jiraConnected: true,
      createdAt: "2024-04-10T15:15:00Z"
    },
    {
      id: "0j1k2l3m4n",
      username: "sophia",
      email: "sophia@example.com",
      role: "USER",
      jiraConnected: false,
      createdAt: "2024-04-18T17:30:00Z"
    }
  ];

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<CreateUserPayload>({ username: "", email: "", password: "", role: "USER" });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // const fetchUsers = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await getUsers();
  //     const list = Array.isArray(res) ? res : res.users || [];
  //     setUsers(list);
  //   } catch (e) {
  //     toast.error("Failed to fetch users");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchUsers = async () => {
    setLoading(true);

    try {

      // MOCK DATA
      // Sau này thay bằng API:
      // const res = await getUsers()

      await new Promise((r) => setTimeout(r, 500));

      setUsers(mockUsers);

    } catch (e) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (roleFilter !== "ALL") list = list.filter((u) => u.role === roleFilter);
    return list;
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", email: "", password: "", role: "USER" });
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, password: "", role: u.role });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateUser(editing.id, form);
        toast.success("User updated");
      } else {
        await createUser(form);
        toast.success("User created");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      toast.success("User deleted");
      setDeleteTarget(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    { key: "id", label: "User ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id?.slice(0, 8)}…</span> },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    {
      key: "role", label: "Role",
      render: (r) => <Badge variant={r.role === "ADMIN" ? "default" : "secondary"}>{r.role}</Badge>,
    },
    {
      key: "jiraConnected", label: "Jira",
      render: (r) => <Badge variant={r.jiraConnected ? "default" : "outline"}>{r.jiraConnected ? "Yes" : "No"}</Badge>,
    },
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
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage all users in the system
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New User
        </Button>

      </div>


      {/* ================= MAIN CARD ================= */}
      <div className="bg-card border rounded-xl shadow-sm p-6 space-y-5">

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            {/* Search */}
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search username or email..."
            />

            {/* Role Filter */}
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="USER">User</SelectItem>
              </SelectContent>

            </Select>

          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold">{filtered.length}</span> users
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
        title={editing ? "Edit User" : "Create User"}
        onSubmit={handleSave}
        loading={saving}
      >

        <div className="space-y-4">

          {/* Username */}
          <div>
            <Label>Username</Label>
            <Input
              placeholder="Enter username"
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
            />
          </div>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          {/* Password */}
          <div>
            <Label>
              Password {editing ? "(leave blank to keep)" : ""}
            </Label>

            <Input
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
          </div>

          {/* Role */}
          <div>
            <Label>Role</Label>

            <Select
              value={form.role}
              onValueChange={(v) =>
                setForm({ ...form, role: v as "ADMIN" | "USER" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="USER">User</SelectItem>
              </SelectContent>

            </Select>

          </div>

        </div>

      </AdminModal>


      {/* ================= DELETE CONFIRM ================= */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Are you sure you want to delete "${deleteTarget?.username}"? This action cannot be undone.`}
        loading={deleting}
      />

    </div>
  )
};

export default UsersPage;
