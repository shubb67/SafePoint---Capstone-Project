import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";

export default function IncidentsOverTime() {
  const [range, setRange] = useState("1QR");
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState([]);
  const [series, setSeries] = useState({ nearMiss: [], injury: [], safetyHazard: [], propertyDamage: [] });
  const [error, setError] = useState(null);

  const ranges = ["1M", "1QR", "1Y", "Max"];

  useEffect(() => {
    loadData();
  }, [range]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", currentUser.uid)));
      const user = userSnap.docs[0]?.data();
      const company = user?.company;
      if (!company) throw new Error("Company not found");

      const usersSnap = await getDocs(query(collection(db, "users"), where("company", "==", company)));
      const userIds = usersSnap.docs.map(doc => doc.id);

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
        reportsSnap.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.();
          if (createdAt >= startDate && createdAt <= endDate) {
            allIncidents.push({ ...data, createdAt });
          }
        });
      }

      const processed = processData(allIncidents, startDate, endDate, range);
      setLabels(processed.labels);
      setSeries(processed.data);
    } catch (err) {
      console.error("Chart load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processData = (incidents, start, end, range) => {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const steps = range === "1M" ? 4 : range === "1QR" ? 4 : range === "1Y" ? 12 : 8;
    const intervals = [];
    const msStep = (end - start) / (steps - 1);

    for (let i = 0; i < steps; i++) {
      const time = new Date(start.getTime() + i * msStep);
      intervals.push({
        label: months[time.getMonth()],
        date: time,
        counts: { nearMiss: 0, injury: 0, safetyHazard: 0, propertyDamage: 0 }
      });
    }

    incidents.forEach(incident => {
      let closest = intervals[0];
      let minDiff = Math.abs(incident.createdAt - closest.date);
      for (const point of intervals) {
        const diff = Math.abs(incident.createdAt - point.date);
        if (diff < minDiff) {
          closest = point;
          minDiff = diff;
        }
      }

      const type = (incident.incidentType || "").toLowerCase();
      if (type === "nearmiss") closest.counts.nearMiss++;
      else if (type === "injury") closest.counts.injury++;
      else if (type === "propertydamage") closest.counts.propertyDamage++;
      else closest.counts.safetyHazard++;
    });

    return {
      labels: intervals.map(p => p.label),
      data: {
        nearMiss: intervals.map(p => p.counts.nearMiss),
        injury: intervals.map(p => p.counts.injury),
        safetyHazard: intervals.map(p => p.counts.safetyHazard),
        propertyDamage: intervals.map(p => p.counts.propertyDamage),
      }
    };
  };

  const renderLine = (data, color) => {
    const maxY = Math.max(...Object.values(series).flat(), 5);
    const points = data.map((val, i) => {
      const x = (i / (labels.length - 1)) * 100;
      const y = 100 - (val / maxY) * 100;
      return `${x}%,${y}%`;
    }).join(" ");
    return <polyline fill="none" stroke={color} strokeWidth="2" points={points} />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-60">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Incidents Over Time</h2>
        <div className="flex gap-1 text-xs text-black">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded ${range === r ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-48">
        <svg className="w-full h-full absolute" preserveAspectRatio="none">
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0%"
              y1={`${y}%`}
              x2="100%"
              y2={`${y}%`}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          {renderLine(series.nearMiss, "#facc15")} {/* Yellow */}
          {renderLine(series.injury, "#ef4444")}   {/* Red */}
          {renderLine(series.safetyHazard, "#3b82f6")} {/* Blue */}
          {renderLine(series.propertyDamage, "#f97316")} {/* Orange */}
        </svg>
        {/* X-axis Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-500">
          {labels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6 text-xs text-gray-700">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span>Near Miss</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>Injury & Loss of Life</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Safety Hazard</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Property Damage</span>
        </div>
      </div>
    </div>
  );
}
