import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import injuryIcon from "../../assets/image/injury.png";
import propertyIcon from "../../assets/image/property-damage.png";
import nearMissIcon from "../../assets/image/danger.png";
import hazardIcon from "../../assets/image/safety-hazards.png";
import { Bell, Home, FileText, MessageSquare, User } from "lucide-react";
import { Link } from "react-router-dom";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Drafts", value: "draft" },
  { label: "Closed", value: "closed" },
  { label: "Under Review", value: "underReview" },
  { label: "Rejected", value: "rejected" },
];

// Util for img url (support for import style)
const imgUrl = img => (img && (img.src || img.default)) || img || "";

const incidentTypeIcons = {
  injury: injuryIcon,
  safetyHazard: hazardIcon,
  propertyDamage: propertyIcon,
  nearMiss: nearMissIcon,
};

function statusBadge(status) {
  switch (status) {
    case "draft":
      return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs font-medium">Draft</span>;
    case "addInfo":
      return <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-md text-xs font-medium">Add Info</span>;
    case "rejected":
      return <span className="bg-red-100 text-red-500 px-3 py-1 rounded-md text-xs font-medium">Rejected</span>;
    case "underReview":
      return <span className="bg-orange-100 text-orange-500 px-3 py-1 rounded-md text-xs font-medium">Under Review</span>;
    case "closed":
      return <span className="bg-green-100 text-green-600 px-3 py-1 rounded-md text-xs font-medium">Closed</span>;
    default:
      return null;
  }
}

function MyReportsScreen() {
  const [filter, setFilter] = useState("all");
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Firestore: fetch user's reports
  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const q = query(
          collection(db, "reports"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(data);
      } catch (err) {
        console.error("Error loading reports", err);
      }
      setLoading(false);
    }
    fetchReports();
  }, []);

  // Filtering
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      search.trim() === "" ||
      r.incidentType?.toLowerCase().includes(search.trim().toLowerCase()) ||
      r.status?.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === "all" || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Date formatting utility
  function formatDate(ts) {
    if (!ts) return "";
    if (typeof ts === "string") return ts;
    if (ts.toDate) return ts.toDate().toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  }
  function formatRelative(ts) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = Math.round((now - date) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 120) return `1 hour ago`;
    if (diff < 1440) return `${Math.floor(diff/60)} hours ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="bg-white min-h-screen flex flex-col p-2 ">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-1">
        <h1 className="text-2xl font-bold text-black">My Reports</h1>
        <div className="relative">
          <Bell className="w-7 h-7 text-gray-800" />
          <span className="absolute -top-2 -right-1 bg-yellow-400 text-white rounded-full px-1.5 text-xs font-bold">2</span>
        </div>
      </div>
      {/* Search Input */}
      <div className="px-4 mt-2">
        <input
          className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-800 text-sm outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 mt-3 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === f.value
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* Reports List */}
      <div className="flex-1 overflow-y-auto mt-2 px-2 pb-24">
        {loading && <div className="text-center text-gray-400 py-8">Loading...</div>}
        {!loading && filteredReports.length === 0 && (
          <div className="text-center text-gray-400 py-8">No reports found.</div>
        )}
        {filteredReports.map((r, idx) => (
          <div
            key={r.id || idx}
            className="flex items-start gap-3 bg-white border-b py-3 px-2"
          >
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center mt-1
                ${
                  r.incidentType === "injury"
                    ? "bg-red-100"
                    : r.incidentType === "propertyDamage"
                    ? "bg-indigo-50"
                    : r.incidentType === "nearMiss"
                    ? "bg-yellow-100"
                    : "bg-blue-100"
                }
              `}
            >
              <img
                src={imgUrl(incidentTypeIcons[r.incidentType])}
                alt={r.incidentType}
                className="w-10 h-10 object-fill border rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-black text-base">
                  {r.incidentType === "injury"
                    ? "Injury Report"
                    : r.incidentType === "propertyDamage"
                    ? "Property Damage"
                    : r.incidentType === "nearMiss"
                    ? "Near Miss"
                    : r.incidentType === "safetyHazard"
                    ? "Safety Hazard"
                    : "Incident"}
                </span>
                {r.status && statusBadge(r.status)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {r.status === "draft"
                  ? `Last edited: ${formatRelative(r.lastEditedAt || r.createdAt)}`
                  : `Submitted: ${formatDate(r.createdAt)}`}
              </div>
            </div>
            {/* Edit buttons */}
            {["draft", "addInfo"].includes(r.status) && (
              <div className="flex flex-col gap-2">
                <button className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-medium border border-blue-100">
                  {r.status === "addInfo" ? "Add Info" : "Edit"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow pb-4">
        <div className="max-w-lg mx-auto flex justify-between px-8 py-3">
          <Link to="/user-dashboard" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/my-reports" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <FileText className="w-6 h-6" />
            <span className="text-xs">Reports</span>
          </Link>
          <Link to="/chat" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default MyReportsScreen;
