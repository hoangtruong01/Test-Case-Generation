import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";

const AdminLoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await api.adminLogin(username, password);
      if (res && res.session_token) {
        navigate("/admin/dashboard");
      } else {
        setError("Invalid admin credentials");
      }
    } catch (err) {
      console.error("admin login failed", err);
      setError(err instanceof Error ? err.message : "Failed to login as admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
      <div className="w-[380px] bg-white rounded-xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Username</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {error && (
              <p className="text-center text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
