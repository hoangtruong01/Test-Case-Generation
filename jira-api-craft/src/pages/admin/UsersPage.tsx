import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserX, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchInput from "@/components/admin/SearchInput";
import Pagination from "@/components/admin/Pagination";
import {
  AdminUser,
  getUsers,
  banUser,
  unbanUser,
} from "@/services/adminService";

const PAGE_SIZE = 10;

const UsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Action state (ban/unban)
  const [actionTarget, setActionTarget] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<"ban" | "unban" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      const list = Array.isArray(res) ? res : res.users || [];
      setUsers(list);
    } catch (e) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.user?.toLowerCase().includes(q));
    }
    return list;
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleConfirmAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "ban") {
        await banUser(actionTarget.id);
        toast.success("User banned");
      } else {
        await unbanUser(actionTarget.id);
        toast.success("User unbanned");
      }
      // Optimistically update UI immediately
      const targetId = actionTarget.id;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetId ? { ...u, is_banned: actionType === "ban" } : u,
        ),
      );
      setActionTarget(null);
      setActionType(null);
      // Refresh in background to ensure server-state sync
    } catch (e) {
      toast.error(e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "id",
      label: "User ID",
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.id?.slice(0, 8)}…
        </span>
      ),
    },
    { key: "user", label: "Name" },
    {
      key: "is_banned",
      label: "Banned",
      render: (r) => (
        <Badge variant={r.is_banned ? "default" : "outline"}>
          {r.is_banned ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "last_logged_in",
      label: "Last Logged In",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.last_logged_in
            ? new Date(r.last_logged_in).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          {r.is_banned ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setActionTarget(r);
                setActionType("unban");
              }}
            >
              <UserCheck className="w-4 h-4 text-foreground" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setActionTarget(r);
                setActionType("ban");
              }}
            >
              <UserX className="w-4 h-4 text-destructive" />
            </Button>
          )}
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
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name or email..."
            />
          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold">{filtered.length}</span>{" "}
            users
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <div className="border rounded-lg overflow-hidden bg-background">
          <AdminTable columns={columns} data={paginated} loading={loading} />
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

      {/* ================= ACTION CONFIRM ================= */}
      <ConfirmDialog
        open={!!actionTarget}
        onClose={() => {
          setActionTarget(null);
          setActionType(null);
        }}
        onConfirm={handleConfirmAction}
        title={actionType === "ban" ? "Ban User" : "Unban User"}
        description={`Are you sure you want to ${actionType === "ban" ? "ban" : "unban"} "${actionTarget?.user}"?`}
        loading={actionLoading}
      />
    </div>
  );
};

export default UsersPage;
