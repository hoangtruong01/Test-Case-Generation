import React from "react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { getUsers, getTestCases } from "@/services/adminService";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [totalTestCases, setTotalTestCases] = useState<number>(0);
  const [dailyData, setDailyData] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [projectData, setProjectData] = useState<
    Array<{ project: string; tests: number }>
  >([]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">(
    "day",
  );
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, tcsRes] = await Promise.all([
          getUsers(),
          getTestCases(),
        ]);

        const users = Array.isArray(usersRes)
          ? usersRes
          : usersRes?.data || usersRes?.users || [];

        let tcs: any[] = [];
        if (Array.isArray(tcsRes)) tcs = tcsRes;
        else if (tcsRes?.testcases) tcs = tcsRes.testcases;
        else if (tcsRes?.testCases) tcs = tcsRes.testCases;
        else if (tcsRes?.data) tcs = tcsRes.data;

        const projectsSet = new Set<string>();
        let suiteCount = 0;
        let totalTestCases = 0;

        tcs.forEach((tc: any) => {
          if (tc.jira_project_name) projectsSet.add(tc.jira_project_name);
          if (Array.isArray(tc.testsuite)) {
            suiteCount += tc.testsuite.length;
            tc.testsuite.forEach((s: any) => {
              if (Array.isArray(s.test_steps))
                totalTestCases += s.test_steps.length || 0;
            });
          }
          if (typeof tc.testcase_count === "number")
            totalTestCases += tc.testcase_count;
        });

        const projectMap: Record<string, number> = {};
        tcs.forEach((tc: any) => {
          const name = tc.jira_project_name || "Unknown";
          projectMap[name] =
            (projectMap[name] || 0) +
            (tc.testcase_count ||
              (Array.isArray(tc.testsuite) ? tc.testsuite.length : 0));
        });

        const computedProjectData = Object.entries(projectMap).map(
          ([project, tests]) => ({ project, tests }),
        );

        // compute totals and daily counts
        let total = 0;
        const daily: Record<string, number> = {};
        tcs.forEach((tc: any) => {
          // determine created date
          const created =
            tc.created_at ||
            tc.createdAt ||
            tc.createdAtDate ||
            tc.created ||
            null;
          const dateStr = created
            ? new Date(created).toISOString().slice(0, 10)
            : "unknown";

          // determine count for this record
          let countForRecord = 0;
          if (typeof tc.testcase_count === "number") {
            countForRecord = tc.testcase_count;
          } else if (Array.isArray(tc.testsuite)) {
            // sum test_steps lengths across suites
            tc.testsuite.forEach((s: any) => {
              if (Array.isArray(s.test_steps))
                countForRecord += s.test_steps.length || 0;
              else countForRecord += 1;
            });
          } else if (Array.isArray(tc.tests)) {
            countForRecord = tc.tests.length;
          } else {
            countForRecord = 1;
          }

          total += countForRecord;
          daily[dateStr] = (daily[dateStr] || 0) + countForRecord;
        });

        // normalize daily data into sorted array (last 14 days if many)
        const dailyArr = Object.entries(daily)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => (a.date > b.date ? 1 : -1));

        if (mounted) {
          setUsersCount(Array.isArray(users) ? users.length : 0);
          setTotalTestCases(total);
          setDailyData(dailyArr);
          setProjectData(computedProjectData);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Aggregate dailyData according to current granularity for reuse in charts
  const aggregatedData = (() => {
    const map: Record<string, number> = {};
    const toWeekStart = (isoDate: string) => {
      const d = new Date(isoDate);
      const day = d.getUTCDay();
      const diff = (day + 6) % 7;
      const monday = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff),
      );
      return monday.toISOString().slice(0, 10);
    };

    dailyData.forEach((r) => {
      const date = r.date;
      if (!date || date === "unknown") return;
      let key = date;
      if (granularity === "week") key = toWeekStart(date);
      else if (granularity === "month") key = date.slice(0, 7);
      map[key] = (map[key] || 0) + r.count;
    });

    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  })();

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="text-sm text-muted-foreground">Users</div>
          <div className="text-2xl font-bold">{usersCount}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-muted-foreground">Total Testcases</div>
          <div className="text-2xl font-bold">{totalTestCases}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-muted-foreground">Projects</div>
          <div className="text-2xl font-bold">
            {projectData ? projectData.length : 0}
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Testcases Created</h3>
          <div className="inline-flex gap-2">
            <button
              onClick={() => setGranularity("day")}
              className={`px-3 py-1 rounded ${granularity === "day" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Day
            </button>
            <button
              onClick={() => setGranularity("week")}
              className={`px-3 py-1 rounded ${granularity === "week" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Week
            </button>
            <button
              onClick={() => setGranularity("month")}
              className={`px-3 py-1 rounded ${granularity === "month" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Month
            </button>
            <div className="w-px bg-border mx-2" />
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1 rounded ${chartType === "bar" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-3 py-1 rounded ${chartType === "line" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Line
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height={240}>
            {chartType === "bar" ? (
              <BarChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            ) : (
              <LineChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
