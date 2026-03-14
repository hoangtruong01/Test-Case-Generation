import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function AdminDashboard() {

  /* -------------------------
     MOCK STATS DATA
     Sau này thay bằng API:
     GET /api/admin/dashboard
  --------------------------*/

  const [stats, setStats] = useState({
    users: 128,
    projects: 12,
    suites: 46,
    testCases: 312
  });

  /* -------------------------
     MOCK CHART DATA
     Sau này replace bằng API
  --------------------------*/

  const testExecutionData = [
    { day: "Mon", tests: 40 },
    { day: "Tue", tests: 65 },
    { day: "Wed", tests: 80 },
    { day: "Thu", tests: 55 },
    { day: "Fri", tests: 90 },
    { day: "Sat", tests: 50 },
    { day: "Sun", tests: 30 }
  ];

  const projectTestData = [
    { project: "Auth API", tests: 120 },
    { project: "User API", tests: 90 },
    { project: "Payment API", tests: 60 },
    { project: "Order API", tests: 42 }
  ];

  /* -------------------------
     MOCK ACTIVITY
     Sau này replace bằng API
     GET /api/admin/activity
  --------------------------*/

  const activities = [
    { id: 1, text: "John created project Auth API" },
    { id: 2, text: "Admin created Test Suite Login Tests" },
    { id: 3, text: "Anna executed test case GET /users" },
    { id: 4, text: "Mike added 5 new test cases" }
  ];

  useEffect(() => {

    /* ---------------------------------------
       Sau này gọi API dashboard ở đây
       
       axios.get("/api/admin/dashboard")
       .then(res => setStats(res.data))
    ----------------------------------------*/

  }, []);

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <h1 className="text-2xl font-bold">
        Admin Dashboard
      </h1>


      {/* STATS CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Users</p>
          <p className="text-3xl font-bold">{stats.users}</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Projects</p>
          <p className="text-3xl font-bold">{stats.projects}</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Test Suites</p>
          <p className="text-3xl font-bold">{stats.suites}</p>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Test Cases</p>
          <p className="text-3xl font-bold">{stats.testCases}</p>
        </div>

      </div>


      {/* CHARTS */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


        {/* TEST EXECUTION CHART */}

        <div className="bg-white border rounded-xl p-5 shadow-sm">

          <h2 className="font-semibold mb-4">
            Test Executions This Week
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={testExecutionData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="day" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="tests"
                stroke="#6366f1"
                strokeWidth={3}
              />

            </LineChart>
          </ResponsiveContainer>

        </div>


        {/* TESTS PER PROJECT */}

        <div className="bg-white border rounded-xl p-5 shadow-sm">

          <h2 className="font-semibold mb-4">
            Test Cases Per Project
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectTestData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="project" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="tests"
                fill="#10b981"
              />

            </BarChart>
          </ResponsiveContainer>

        </div>

      </div>


      {/* RECENT ACTIVITY */}

      <div className="bg-white border rounded-xl p-5 shadow-sm">

        <h2 className="font-semibold mb-4">
          Recent Activity
        </h2>

        <ul className="space-y-2">

          {activities.map((a) => (
            <li
              key={a.id}
              className="text-sm text-gray-600 border-b pb-2"
            >
              {a.text}
            </li>
          ))}

        </ul>

      </div>


      {/* QUICK ACTIONS */}

      <div className="bg-white border rounded-xl p-5 shadow-sm">

        <h2 className="font-semibold mb-4">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-3">

          <Button>
            Manage Users
          </Button>

          <Button>
            Manage Projects
          </Button>

          <Button>
            Manage Test Suites
          </Button>

          <Button>
            Manage Test Cases
          </Button>

        </div>

      </div>

    </div>
  );
}