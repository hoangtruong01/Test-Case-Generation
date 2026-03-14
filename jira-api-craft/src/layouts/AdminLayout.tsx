import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition
  ${
    isActive
      ? "bg-white text-black"
      : "text-gray-300 hover:bg-gray-800 hover:text-white"
  }`;

const AdminLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold tracking-wide">
            Admin Panel
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4 flex-1">

          <NavLink to="/admin/dashboard" className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/admin/users" className={linkClass}>
            Users
          </NavLink>

          <NavLink to="/admin/projects" className={linkClass}>
            Projects
          </NavLink>

          <NavLink to="/admin/test-suites" className={linkClass}>
            Test Suites
          </NavLink>

          <NavLink to="/admin/test-cases" className={linkClass}>
            Test Cases
          </NavLink>

          <NavLink to="/admin/jira-tokens" className={linkClass}>
            Jira Tokens
          </NavLink>

        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

      </aside>

      {/* Content */}
      <main className="flex-1 p-6 bg-muted">
        <Outlet />
      </main>

    </div>
  );
};

export default AdminLayout;