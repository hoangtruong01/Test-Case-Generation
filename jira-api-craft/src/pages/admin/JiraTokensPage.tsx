import { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchInput from "@/components/admin/SearchInput";
import Pagination from "@/components/admin/Pagination";
import { JiraToken, getJiraTokens, revokeToken } from "@/services/adminService";

const PAGE_SIZE = 10;

const JiraTokensPage = () => {
  const [tokens, setTokens] = useState<JiraToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [revokeTarget, setRevokeTarget] = useState<JiraToken | null>(null);
  const [revoking, setRevoking] = useState(false);

  // const fetchTokens = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await getJiraTokens();
  //     setTokens(Array.isArray(res) ? res : res.tokens || []);
  //   } catch {
  //     toast.error("Failed to fetch tokens");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // ================= MOCK DATA =================
  // TODO: Replace with API getJiraTokens() later
  const mockTokens: JiraToken[] = [
    {
      id: "tok_1",
      username: "khoa",
      jiraAccountId: "5f8d123abc001",
      refreshToken: "ATJIRA-7d93f4d8b92d9e123456abcdef0987",
      expiresAt: "2026-05-10T10:00:00Z",
      createdAt: "2026-01-10T08:20:00Z",
    },
    {
      id: "tok_2",
      username: "anna",
      jiraAccountId: "5f8d123abc002",
      refreshToken: "ATJIRA-2c93a2f9a8b1a222223456abcdef987",
      expiresAt: "2026-04-01T12:00:00Z",
      createdAt: "2026-01-15T09:10:00Z",
    },
    {
      id: "tok_3",
      username: "john",
      jiraAccountId: "5f8d123abc003",
      refreshToken: "ATJIRA-9aa1f1c98b2d9e888823456abcdef111",
      expiresAt: "2025-12-01T12:00:00Z",
      createdAt: "2025-11-02T11:30:00Z",
    },
    {
      id: "tok_4",
      username: "lucas",
      jiraAccountId: "5f8d123abc004",
      refreshToken: "ATJIRA-2ab8f2f98b2d9e777723456abcdef222",
      expiresAt: "2026-06-20T10:00:00Z",
      createdAt: "2026-02-01T14:40:00Z",
    },
    {
      id: "tok_5",
      username: "emma",
      jiraAccountId: "5f8d123abc005",
      refreshToken: "ATJIRA-7c9c2f9a8b2d9e666623456abcdef333",
      expiresAt: "2026-03-18T10:00:00Z",
      createdAt: "2026-01-28T17:00:00Z",
    },
    {
      id: "tok_6",
      username: "sarah",
      jiraAccountId: "5f8d123abc006",
      refreshToken: "ATJIRA-5bc9f1c98b2d9e555523456abcdef444",
      expiresAt: "2026-07-12T10:00:00Z",
      createdAt: "2026-02-20T13:10:00Z",
    },
    {
      id: "tok_7",
      username: "david",
      jiraAccountId: "5f8d123abc007",
      refreshToken: "ATJIRA-0bc9f1c98b2d9e444423456abcdef555",
      expiresAt: "2026-08-02T10:00:00Z",
      createdAt: "2026-02-25T15:45:00Z",
    },
    {
      id: "tok_8",
      username: "oliver",
      jiraAccountId: "5f8d123abc008",
      refreshToken: "ATJIRA-3bc9f1c98b2d9e333323456abcdef666",
      expiresAt: "2026-09-10T10:00:00Z",
      createdAt: "2026-03-01T09:30:00Z",
    },
  ];

  const fetchTokens = async () => {
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 500)); 
      setTokens(mockTokens);
    } catch {
      toast.error("Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTokens(); }, []);

  const filtered = useMemo(() => {
    if (!search) return tokens;
    const q = search.toLowerCase();
    return tokens.filter((t) => t.username?.toLowerCase().includes(q) || t.jiraAccountId?.toLowerCase().includes(q));
  }, [tokens, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleVisible = (id: string) => {
    setVisibleTokens((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeToken(revokeTarget.id);
      toast.success("Token revoked");
      setRevokeTarget(null);
      fetchTokens();
    } catch (e: any) {
      toast.error(e.message || "Revoke failed");
    } finally {
      setRevoking(false);
    }
  };

  const maskToken = (token: string) => token ? `${token.slice(0, 6)}${"•".repeat(20)}${token.slice(-4)}` : "—";

  const columns: Column<JiraToken>[] = [
    { key: "id", label: "Token ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id?.slice(0, 8)}…</span> },
    { key: "username", label: "Username" },
    { key: "jiraAccountId", label: "Jira Account ID", render: (r) => <span className="font-mono text-xs">{r.jiraAccountId}</span> },
    {
      key: "refreshToken", label: "Refresh Token",
      render: (r) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[200px] truncate">
            {visibleTokens.has(r.id) ? r.refreshToken : maskToken(r.refreshToken)}
          </code>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisible(r.id)}>
            {visibleTokens.has(r.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        </div>
      ),
    },
    {
      key: "expiresAt", label: "Expires At",
      render: (r) => {
        const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
        return (
          <Badge variant={expired ? "destructive" : "secondary"}>
            {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—"}
          </Badge>
        );
      },
    },
    { key: "createdAt", label: "Created At", render: (r) => <span className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</span> },
    {
      key: "actions", label: "Actions",
      render: (r) => (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRevokeTarget(r)}>
          <ShieldOff className="w-4 h-4 mr-1" />Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold">Jira Refresh Tokens</h1>
          <p className="text-sm text-muted-foreground">
            Manage Jira OAuth refresh tokens connected to the system
          </p>
        </div>

      </div>


      {/* ================= MAIN CARD ================= */}
      <div className="bg-card border rounded-xl shadow-sm p-6 space-y-5">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">

          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by username or Jira account..."
          />

          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold">{filtered.length}</span> tokens
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


      {/* ================= CONFIRM DIALOG ================= */}
      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Token"
        description={`Revoke the refresh token for "${revokeTarget?.username}"? The user will need to re-authenticate with Jira.`}
        confirmLabel="Revoke"
        loading={revoking}
      />

    </div>
  );
};

export default JiraTokensPage;
