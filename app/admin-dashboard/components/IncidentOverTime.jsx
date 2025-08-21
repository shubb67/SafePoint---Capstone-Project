import React, { useState, useEffect } from "react";
import { collection, getDocs, getDoc, doc, query, where, orderBy } from "firebase/firestore";
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
      if (!currentUser) {
        setError("User not authenticated");
        return;
      }

      // Get user's workspace ID
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists()) {
        setError("User data not found");
        return;
      }
      
      const userData = userDoc.data();
      const workspaceId = userData.workspaceId;
      
      if (!workspaceId) {
        setError("User not assigned to any workspace");
        return;
      }

      // Calculate date range
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
        default:
          startDate.setMonth(startDate.getMonth() - 3);
      }

      // Fetch all incidents for this workspace
      const reportsQuery = query(
        collection(db, "reports"),
        where("workspaceId", "==", workspaceId),
        where("createdAt", ">=", startDate),
        where("createdAt", "<=", endDate),
        orderBy("createdAt", "desc")
      );

      const reportsSnap = await getDocs(reportsQuery);
      
      const allIncidents = [];
      reportsSnap.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        if (createdAt instanceof Date) {
          allIncidents.push({ 
            ...data, 
            id: doc.id,
            createdAt 
          });
        }
      });

      // Generate chart data
      setChartData(generateChartData(allIncidents, startDate, endDate, range));
    } catch (err) {
      console.error("Error loading incidents data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  function generateChartData(incidents, start, end, range) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let result = [];

    // Monthly grouping for 1QR, 1Y, and Max
    if (range === "1Y" || range === "Max" || range === "1QR") {
      // Fill each month in range
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      let until = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (current <= until) {
        result.push({
          name: months[current.getMonth()],
          year: current.getFullYear(),
          month: current.getMonth(),
          count: 0,
        });
        current.setMonth(current.getMonth() + 1);
      }
      
      // Assign incidents to months
      incidents.forEach((incident) => {
        const d = incident.createdAt;
        const idx = result.findIndex(
          (r) => r.year === d.getFullYear() && r.month === d.getMonth()
        );
        if (idx !== -1) {
          result[idx].count += 1;
        }
      });
      
      // For display, if range spans multiple years, show year with month
      const hasMultipleYears = new Set(result.map(r => r.year)).size > 1;
      result = result.map((r) => ({
        name: hasMultipleYears ? `${r.name} ${r.year.toString().slice(-2)}` : r.name,
        count: r.count
      }));
      
    } else if (range === "1M") {
      // Weekly grouping for 1 month view
      const weekNames = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const step = (end - start) / 4;
      
      for (let i = 0; i < 4; i++) {
        const periodStart = new Date(start.getTime() + i * step);
        const periodEnd = new Date(start.getTime() + (i + 1) * step);
        
        result.push({
          name: weekNames[i],
          count: 0,
          start: periodStart,
          end: periodEnd
        });
      }
      
      // Assign incidents to weeks
      incidents.forEach((incident) => {
        const d = incident.createdAt;
        for (let i = 0; i < 4; i++) {
          if (d >= result[i].start && d < result[i].end) {
            result[i].count += 1;
            break;
          }
        }
      });
      
      // Clean up for display
      result = result.map(r => ({
        name: r.name,
        count: r.count
      }));
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
        <div className="flex items-center justify-center h-40 text-red-600">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-b-2 border-indigo-400 rounded-full"></div>
        </div>
      ) : !error && chartData.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          No incidents found for the selected period
        </div>
      ) : !error ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#313B52", fontSize: 12, fontWeight: 500 }}
                angle={chartData.length > 6 ? -45 : 0}
                textAnchor={chartData.length > 6 ? "end" : "middle"}
                height={chartData.length > 6 ? 60 : 30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                domain={[0, (dataMax) => Math.max(5, Math.ceil(dataMax * 1.1))]}
                allowDecimals={false}
                tick={{ fill: "#CBD5E1", fontSize: 14 }}
                ticks={Array.from({length: 6}, (_, i) => i * 2)}
              />
              <Tooltip
                cursor={{ fill: "#E0E7FF", opacity: 0.3 }}
                contentStyle={{
                  borderRadius: 8,
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ color: "#64748B", fontWeight: 500 }}
                formatter={(value) => [`${value} incident${value !== 1 ? 's' : ''}`, "Total"]}
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
      ) : null}
    </div>
  );
}