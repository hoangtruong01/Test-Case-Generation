import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Landing from "./pages/Landing";
import DashboardLayout from "./layouts/DashboardLayout";
import ProjectsPage from "./pages/ProjectsPage";
import IssuesPage from "./pages/IssuesPage";
import PostmanPage from "./pages/PostmanPage";
import PostmanCollectionPage from "./pages/PostmanCollectionPage";
import SettingsPage from "./pages/SettingsPage";
import EndpointsPage from "./pages/EndpointsPage";
import NotFound from "./pages/NotFound";
import JiraAuthPage from "./pages/JiraAuthPage";
import UsersPage from "./pages/admin/UsersPage";
import JiraTokensPage from "./pages/admin/JiraTokensPage";
import AdminProjectsPage from "./pages/admin/ProjectsPage";
import TestSuitesPage from "./pages/admin/TestSuitesPage";
import TestCasesPage from "./pages/admin/TestCasesPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoute from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <Routes>

                <Route path="/" element={<Landing />} />

                {/* USER DASHBOARD */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="projects" replace />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:projectKey" element={<IssuesPage />} />
                  <Route path="postman" element={<PostmanPage />} />
                  <Route path="postman/collection/:collectionId" element={<PostmanCollectionPage />} />
                  <Route path="endpoints" element={<EndpointsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* ADMIN LOGIN */}
                <Route path="/admin/login" element={<AdminLoginPage />} />

                {/* ADMIN PANEL */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<Navigate to="users" />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="projects" element={<AdminProjectsPage />} />
                  <Route path="test-suites" element={<TestSuitesPage />} />
                  <Route path="test-cases" element={<TestCasesPage />} />
                  <Route path="jira-tokens" element={<JiraTokensPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />

              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;