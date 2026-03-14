import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SearchInput from "@/components/admin/SearchInput";
import Pagination from "@/components/admin/Pagination";
import { AdminTestCase, AdminTestSuite, CreateTestCasePayload } from "@/services/adminService";

const PAGE_SIZE = 10;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PATCH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
};

const TestCasesPage = () => {
  const [cases, setCases] = useState<AdminTestCase[]>([]);
  const [suites, setSuites] = useState<AdminTestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suiteFilter, setSuiteFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTestCase | null>(null);
  const [form, setForm] = useState<CreateTestCasePayload>({ testCaseName: "", suiteId: "", httpMethod: "GET", endpoint: "", requestBody: "", expectedStatus: 200, expectedResponse: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTestCase | null>(null);
  const [deleting, setDeleting] = useState(false);


  // ==============================
  // MOCK DATA
  // ==============================

  // TODO: Replace with API later

  // ==============================
  // MOCK DATA
  // ==============================
  // TODO: Replace with API later

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

  const mockCases: AdminTestCase[] = [

    // ==============================
    // s1 - User Authentication
    // ==============================

    {
      id: "case-1",
      projectName: "Auth Service",
      testCaseName: "Login success",
      suiteId: "s1",
      suiteName: "User Authentication",
      httpMethod: "POST",
      endpoint: "/api/auth/login",
      requestBody: `{
  "email": "user@mail.com",
  "password": "123456"
}`,
      expectedStatus: 200,
      expectedResponse: `{
  "token": "jwt_token"
}`,
      createdAt: "2025-03-03"
    },

    {
      id: "case-2",
      projectName: "Auth Service",
      testCaseName: "Login invalid password",
      suiteId: "s1",
      suiteName: "User Authentication",
      httpMethod: "POST",
      endpoint: "/api/auth/login",
      requestBody: `{
  "email": "user@mail.com",
  "password": "wrong"
}`,
      expectedStatus: 401,
      expectedResponse: `{
  "message": "Invalid credentials"
}`,
      createdAt: "2025-03-03"
    },

    {
      id: "case-3",
      projectName: "Auth Service",
      testCaseName: "Register new user",
      suiteId: "s1",
      suiteName: "User Authentication",
      httpMethod: "POST",
      endpoint: "/api/auth/register",
      requestBody: `{
  "email": "new@mail.com",
  "password": "123456"
}`,
      expectedStatus: 201,
      expectedResponse: `{
  "message": "User created"
}`,
      createdAt: "2025-03-04"
    },

    // ==============================
    // s2 - Payment API
    // ==============================

    {
      id: "case-4",
      projectName: "Payment Service",
      testCaseName: "Create payment intent",
      suiteId: "s2",
      suiteName: "Payment API",
      httpMethod: "POST",
      endpoint: "/api/payments/create-intent",
      requestBody: `{
  "amount": 5000,
  "currency": "usd"
}`,
      expectedStatus: 200,
      expectedResponse: `{
  "clientSecret": "stripe_secret"
}`,
      createdAt: "2025-03-05"
    },

    {
      id: "case-5",
      projectName: "Payment Service",
      testCaseName: "Payment success webhook",
      suiteId: "s2",
      suiteName: "Payment API",
      httpMethod: "POST",
      endpoint: "/api/payments/webhook",
      requestBody: `{
  "event": "payment_intent.succeeded"
}`,
      expectedStatus: 200,
      expectedResponse: `{
  "received": true
}`,
      createdAt: "2025-03-05"
    },

    // ==============================
    // s3 - Collection Import
    // ==============================

    {
      id: "case-6",
      projectName: "Postbot Automation",
      testCaseName: "Import Postman collection",
      suiteId: "s3",
      suiteName: "Collection Import",
      httpMethod: "POST",
      endpoint: "/api/postman/import",
      requestBody: `{
  "collectionUrl": "https://postman.com/example"
}`,
      expectedStatus: 200,
      expectedResponse: `{
  "message": "Collection imported"
}`,
      createdAt: "2025-03-10"
    },

    {
      id: "case-7",
      projectName: "Postbot Automation",
      testCaseName: "Invalid collection format",
      suiteId: "s3",
      suiteName: "Collection Import",
      httpMethod: "POST",
      endpoint: "/api/postman/import",
      requestBody: `{
  "collectionUrl": "invalid"
}`,
      expectedStatus: 400,
      expectedResponse: `{
  "error": "Invalid collection"
}`,
      createdAt: "2025-03-11"
    },

    // ==============================
    // s4 - AI Test Generation
    // ==============================

    {
      id: "case-8",
      projectName: "AI Test Generator",
      testCaseName: "Generate test cases with AI",
      suiteId: "s4",
      suiteName: "AI Test Generation",
      httpMethod: "POST",
      endpoint: "/api/ai/generate-tests",
      requestBody: `{
  "endpoint": "/api/users"
}`,
      expectedStatus: 200,
      expectedResponse: `{
  "testsGenerated": 5
}`,
      createdAt: "2025-03-20"
    },

    {
      id: "case-9",
      projectName: "AI Test Generator",
      testCaseName: "Generate tests for invalid endpoint",
      suiteId: "s4",
      suiteName: "AI Test Generation",
      httpMethod: "POST",
      endpoint: "/api/ai/generate-tests",
      requestBody: `{
  "endpoint": ""
}`,
      expectedStatus: 400,
      expectedResponse: `{
  "error": "Endpoint required"
}`,
      createdAt: "2025-03-20"
    },

    // ==============================
    // s5 - Webhook Testing
    // ==============================

    {
      id: "case-10",
      projectName: "Postbot Automation",
      testCaseName: "Trigger webhook",
      suiteId: "s5",
      suiteName: "Webhook Testing",
      httpMethod: "POST",
      endpoint: "/api/webhook/trigger",
      requestBody: `{
  "event": "build.completed"
}`,
      expectedStatus: 200,
      expectedResponse: `{
  "status": "sent"
}`,
      createdAt: "2025-04-01"
    },

    {
      id: "case-11",
      projectName: "Postbot Automation",
      testCaseName: "Webhook retry on failure",
      suiteId: "s5",
      suiteName: "Webhook Testing",
      httpMethod: "POST",
      endpoint: "/api/webhook/retry",
      requestBody: `{
  "webhookId": "123"
}`,
      expectedStatus: 200,
      expectedResponse: `{
  "retry": true
}`,
      createdAt: "2025-04-01"
    }

  ];

  const fetchData = async () => {
    setLoading(true);

    try {
      // simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCases(mockCases);
      setSuites(mockSuites);

    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let list = cases;
    if (search) { const q = search.toLowerCase(); list = list.filter((c) => c.testCaseName?.toLowerCase().includes(q) || c.endpoint?.toLowerCase().includes(q)); }
    if (suiteFilter !== "ALL") list = list.filter((c) => c.suiteId === suiteFilter || c.suiteName === suiteFilter);
    return list;
  }, [cases, search, suiteFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditing(null); setForm({ testCaseName: "", suiteId: suites[0]?.id || "", httpMethod: "GET", endpoint: "", requestBody: "", expectedStatus: 200, expectedResponse: "" }); setModalOpen(true); };
  const openEdit = (c: AdminTestCase) => { setEditing(c); setForm({ testCaseName: c.testCaseName, suiteId: c.suiteId, httpMethod: c.httpMethod, endpoint: c.endpoint, requestBody: c.requestBody, expectedStatus: c.expectedStatus, expectedResponse: c.expectedResponse }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (editing) {

        const updated = cases.map((c) =>
          c.id === editing.id ? { ...c, ...form } : c
        );

        setCases(updated);
        toast.success("Test case updated");

      } else {

        const suite = suites.find((s) => s.id === form.suiteId);

        const newCase: AdminTestCase = {
          id: crypto.randomUUID(),
          projectName: suite?.projectName || "",
          suiteName: suite?.suiteName || "",
          createdAt: new Date().toISOString(),
          ...form,
        };

        setCases([newCase, ...cases]);

        toast.success("Test case created");
      }

      setModalOpen(false);

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

      setCases(cases.filter((c) => c.id !== deleteTarget.id));

      toast.success("Deleted");

      setDeleteTarget(null);

    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<AdminTestCase>[] = [
    { key: "id", label: "Case ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id?.slice(0, 8)}…</span> },
    { key: "testCaseName", label: "Test Case", render: (r) => <span className="font-medium">{r.testCaseName}</span> },
    { key: "suiteName", label: "Suite" },
    {
      key: "httpMethod", label: "Method",
      render: (r) => <span className={`text-xs font-bold px-2 py-1 rounded border ${METHOD_COLORS[r.httpMethod] || ""}`}>{r.httpMethod}</span>,
    },
    { key: "endpoint", label: "Endpoint", render: (r) => <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{r.endpoint}</code> },
    { key: "expectedStatus", label: "Status", render: (r) => <Badge variant="outline">{r.expectedStatus}</Badge> },
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
          <h1 className="text-2xl font-bold">Test Cases</h1>
          <p className="text-sm text-muted-foreground">
            Manage API test cases in the system
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Test Case
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
            placeholder="Search test cases..."
          />

          {/* Suite Filter */}
          <Select
            value={suiteFilter}
            onValueChange={(v) => {
              setSuiteFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Suites" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All Suites</SelectItem>

              {suites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.suiteName}
                </SelectItem>
              ))}
            </SelectContent>

          </Select>

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
        title={editing ? "Edit Test Case" : "Create Test Case"}
        onSubmit={handleSave}
        loading={saving}
      >

        <div className="space-y-4">

          <div>
            <Label>Test Case Name</Label>
            <Input
              value={form.testCaseName}
              onChange={(e) =>
                setForm({ ...form, testCaseName: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Test Suite</Label>
            <Select
              value={form.suiteId}
              onValueChange={(v) =>
                setForm({ ...form, suiteId: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select suite" />
              </SelectTrigger>

              <SelectContent>
                {suites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.suiteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>
              <Label>HTTP Method</Label>
              <Select
                value={form.httpMethod}
                onValueChange={(v) =>
                  setForm({ ...form, httpMethod: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expected Status</Label>
              <Input
                type="number"
                value={form.expectedStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expectedStatus: Number(e.target.value),
                  })
                }
              />
            </div>

          </div>

          <div>
            <Label>Endpoint</Label>
            <Input
              value={form.endpoint}
              placeholder="/api/v1/resource"
              onChange={(e) =>
                setForm({ ...form, endpoint: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Request Body</Label>
            <Textarea
              rows={3}
              className="font-mono text-xs"
              placeholder='{"key": "value"}'
              value={form.requestBody}
              onChange={(e) =>
                setForm({ ...form, requestBody: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Expected Response</Label>
            <Textarea
              rows={3}
              className="font-mono text-xs"
              placeholder='{"result": "ok"}'
              value={form.expectedResponse}
              onChange={(e) =>
                setForm({
                  ...form,
                  expectedResponse: e.target.value,
                })
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
        title="Delete Test Case"
        description={`Delete "${deleteTarget?.testCaseName}"?`}
        loading={deleting}
      />

    </div>
  );
};

export default TestCasesPage;
