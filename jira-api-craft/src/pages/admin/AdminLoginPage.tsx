import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminLoginPage = () => {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    //   const handleLogin = async () => {

    //     // gọi API login admin
    //     const res = await fetch("http://localhost:8080/api/admin/login", {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       body: JSON.stringify({ username, password })
    //     });

    //     if (res.ok) {
    //       const data = await res.json();
    //       localStorage.setItem("admin_token", data.token);
    //       navigate("/admin/users");
    //     } else {
    //       alert("Login failed");
    //     }
    //   };

    const handleLogin = () => {

        if (username === "admin" && password === "1") {

            localStorage.setItem("admin_token", "fake-admin-token");

            navigate("/admin/dashboard");

        } else {

            alert("Invalid admin credentials");

        }

    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">

            <div className="w-[380px] bg-white rounded-xl shadow-xl p-8 space-y-6">

                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Admin Panel
                    </h1>
                    <p className="text-sm text-gray-500">
                        Sign in to continue
                    </p>
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

                    <button
                        onClick={handleLogin}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Login
                    </button>

                </div>

                <p className="text-center text-xs text-gray-400">
                    Demo login: admin / 1
                </p>

            </div>

        </div>
    );
};

export default AdminLoginPage;