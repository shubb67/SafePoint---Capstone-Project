import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const SOFT_BLUE = "#CBD5FE"; // match screenshot bar color

export default function IncidentsOverTime() {
  const [range, setRange] = useState("1QR");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);

  const ranges = [
    { label: "1M", value: "1M" },
    { label: "1QR", value: "1QR" },
    { label: "1Y", value: "1Y" },
    { label: "Max", value: "Max" },
  ];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [range]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userSnap = await getDocs(
        query(collection(db, "users"), where("__name__", "==", currentUser.uid))
      );
      const user = userSnap.docs[0]?.data();
      const company = user?.company;
      if (!company) throw new Error("Company not found");

      const usersSnap = await getDocs(
        query(collection(db, "users"), where("company", "==", company))
      );
      const userIds = usersSnap.docs.map((doc) => doc.id);

      const endDate = new Date();
      let startDate = new Date();
      switch (range) {
        case "1M":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "1QR":
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case "1Y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case "Max":
          startDate = new Date("2020-01-01");
          break;
      }

      // fetch all incidents
      const allIncidents = [];
      for (let i = 0; i < userIds.length; i += 10) {
        const batch = userIds.slice(i, i + 10);
        const reportsSnap = await getDocs(
          query(
            collection(db, "reports"),
            where("userId", "in", batch),
            orderBy("createdAt", "desc")
          )
        );
        reportsSnap.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.();
          if (createdAt >= startDate && createdAt <= endDate) {
            allIncidents.push({ ...data, createdAt });
          }
        });
      }

      // bucket by month
      setChartData(generateChartData(allIncidents, startDate, endDate, range));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function generateChartData(incidents, start, end, range) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let result = [];

    // Decide periods (by month for "1Y", "Max", else week)
    if (range === "1Y" || range === "Max" || range === "1QR") {
      // Fill each month in range
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      let until = new Date(end.getFullYear(), end.getMonth(), 1);
      while (current <= until) {
        result.push({
          name: months[current.getMonth()],
          year: current.getFullYear(),
          count: 0,
        });
        current.setMonth(current.getMonth() + 1);
      }
      // Assign incidents to months
      incidents.forEach((incident) => {
        const d = incident.createdAt;
        const idx = result.findIndex(
          (r) => r.year === d.getFullYear() && r.name === months[d.getMonth()]
        );
        if (idx !== -1) result[idx].count += 1;
      });
      // Remove year for x-axis label (matches screenshot)
      result = result.map((r) => ({ name: r.name, count: r.count }));
    } else if (range === "1M") {
      // Split into 4 weeks of past month
      const step = (end - start) / 4;
      for (let i = 0; i < 4; i++) {
        const periodStart = new Date(start.getTime() + i * step);
        result.push({
          name: `${periodStart.getDate()}/${periodStart.getMonth() + 1}`,
          count: 0,
        });
      }
      incidents.forEach((incident) => {
        const d = incident.createdAt;
        for (let i = 0; i < 4; i++) {
          const periodStart = new Date(start.getTime() + i * step);
          const periodEnd = new Date(start.getTime() + (i + 1) * step);
          if (d >= periodStart && d < periodEnd) {
            result[i].count += 1;
            break;
          }
        }
      });
    }
    return result;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6" style={{ minHeight: 320 }}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-[#1B253D]">Incidents Over Time</h2>
        <div className="flex gap-1 text-xs">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 rounded font-medium transition ${
                range === r.value
                  ? "bg-white border shadow text-[#1B253D]"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={{
                border: range === r.value ? "1px solid #E2E8F0" : "none",
                boxShadow: range === r.value ? "0 1px 4px rgba(0,0,0,0.04)" : "none",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="flex items-center justify-center h-40 text-red-600">{error}</div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-b-2 border-indigo-400 rounded-full"></div>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#313B52", fontSize: 15, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                domain={[0, (dataMax) => Math.max(11, dataMax)]}
                allowDecimals={false}
                tick={{ fill: "#CBD5E1", fontSize: 14 }}
                interval="preserveStartEnd"
              />
              <Tooltip
                cursor={{ fill: "#E0E7FF", opacity: 0.3 }}
                contentStyle={{
                  borderRadius: 8,
                  background: "#fff",
                  border: "none",
                  boxShadow: "0 1px 4px #bcd",
                }}
                labelStyle={{ color: "#64748B", fontWeight: 500 }}
                formatter={(value) => [`${value} incidents`, "Total"]}
              />
              <Bar
                dataKey="count"
                fill={SOFT_BLUE}
                radius={[10, 10, 0, 0]}
                barSize={48}
                maxBarSize={52}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
