"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Home, FileText, MessageSquare, User } from "lucide-react";
import Image from "next/image";

import NewIncidentIcon from "../assets/image/icon456.png";
import injuryIcon   from "../assets/image/injury.png";
import propertyIcon from "../assets/image/property-damage.png";
import nearMissIcon from "../assets/image/danger.png";
import hazardIcon   from "../assets/image/safety-hazards.png";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/_utils/firebase";

import { calculateSafetyRecord } from "@/_utils/safetyRecordUtils";
import RecentIncidents from "./components/RecentIncidents";
import NotificationCenter from "./components/NotificationCenter";

export default function UserDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const uid = auth.currentUser?.uid || null;

  // UI state (kept same)
  const [showIncidents, setShowIncidents] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Header & cards state
  const [userName, setUserName] = useState("User");
  const [workspaceName, setWorkspaceName] = useState("…");
  const [projectSite, setProjectSite] = useState("…");

  // Data state
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [safetyRecord, setSafetyRecord] = useState({ currentStreak: 0, previousRecord: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Helpers
  const imgUrl = (img) => (img && (img.src || img.default)) || img || "";
  const incidentTypeIcons = useMemo(
    () => ({
      injury: injuryIcon,
      safetyHazard: hazardIcon,
      propertyDamage: propertyIcon,
      nearMiss: nearMissIcon,
    }),
    []
  );

  // ── Notifications: unread counter for this user
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", uid),
      where("read", "==", false)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setUnreadCount(snap.size),
      (err) => console.error("Notification listener error:", err)
    );
    return () => unsub();
  }, [uid]);

  // ── Load dashboard data via workspace
  useEffect(() => {
    if (!uid) return;

    (async () => {
      try {
        setIsLoading(true);

        // 1) Get the user
        const userDoc = await getDoc(doc(db, "users", uid));
        const user = userDoc.exists() ? userDoc.data() : null;
        if (!user) {
          setIsLoading(false);
          return;
        }

        setUserName(user.firstName || "User");
        setProjectSite(user.siteLocation || "Unknown Site");

        const workspaceId = user.workspaceId || null;
        if (!workspaceId) {
          // User hasn’t joined a workspace yet
          setWorkspaceName("No Workspace");
          setRecentIncidents([]);
          setSafetyRecord({ currentStreak: 0, previousRecord: 0 });
          setIsLoading(false);
          return;
        }

        // 2) Fetch workspace details
        const wsSnap = await getDoc(doc(db, "workspaces", workspaceId));
        const ws = wsSnap.exists() ? wsSnap.data() : null;
        setWorkspaceName(ws?.companyName || "Your Workspace");

        // 3) Pull recent incidents by workspaceId
        const incidentsQ = query(
          collection(db, "reports"),
          where("workspaceId", "==", workspaceId),
          orderBy("createdAt", "desc"),
          limit(40) // generous for safety record; we'll slice for UI
        );
        const incidentsSnap = await getDocs(incidentsQ);

        // Build safety record inputs + display items
        const allIncidentDates = [];
        const items = [];
        const timeSince = (createdAt) => {
          if (!createdAt) return "";
          const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          const diff = Math.floor((Date.now() - date.getTime()) / 1000);
          const hrs = Math.floor(diff / 3600);
          const days = Math.floor(diff / 86400);
          return days > 0 ? `${days} day${days > 1 ? "s" : ""} ago` : `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
        };

        incidentsSnap.forEach((d) => {
          const data = d.data();
          allIncidentDates.push(data.createdAt?.toDate?.() || new Date());
          items.push({
            id: d.id,
            type: data.incidentType,
            location: data.incidentDetails?.location || "N/A",
            ago: timeSince(data.createdAt),
            reportedBy: data.userId || "—",
            isCurrentUser: data.userId === uid,
          });
        });

        // Safety record
        setSafetyRecord(calculateSafetyRecord(allIncidentDates));

        // Only show top 5 in the card
        setRecentIncidents(items.slice(0, 5));
      } catch (err) {
        console.error("Dashboard data (workspace) error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid]);

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cards = [
    {
      title: "New Incident Report",
      icon: (
        <Image
          src={NewIncidentIcon}
          alt="New Incident"
          width={118}
          height={118}
          className="object-contain"
        />
      ),
      onClick: () => navigate("/incident-type"),
    },
    {
      title: "View Your Reports",
      icon: <FileText className="w-28 h-28 text-[#192C63]" />,
      onClick: () => navigate("/my-reports"),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {!showNotifications ? (
        <>
          {/* Header */}
          <div className="px-4 pt-6">
            <div className="flex items-center justify-between relative">
              <div>
                <p className="text-sm text-gray-500">{formattedDate}</p>
                <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                  Good morning, {userName}!
                </h2>
              </div>

              <button
                aria-label="Open notifications"
                className="p-2 rounded-full bg-white shadow relative"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-6 h-6 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Stats card */}
          <div className="mt-4 px-2">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="flex justify-between mb-2">
                <div className="text-left">
                  <p className="text-sm text-gray-500">{workspaceName}</p>
                  <p className="text-md text-black font-bold">{projectSite}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-black">Safety Record</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-purple-300 text-[#374151] rounded-lg p-4 text-center">
                  <p className="text-5xl font-bold">{safetyRecord.currentStreak}</p>
                  <p className="text-xs">Incident‑Free</p>
                </div>
                <div className="flex-1 bg-green-200 text-black rounded-lg p-4 text-center">
                  <p className="text-5xl font-bold">{safetyRecord.previousRecord}</p>
                  <p className="text-xs">Previous Record</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 px-4 grid grid-cols-2 gap-4">
            {cards.map(({ title, icon, onClick }) => (
              <button
                key={title}
                onClick={onClick}
                className="flex flex-col justify-center text-gray-800 items-left gap-[14px] p-4 pb-8 rounded-[8px] bg-white shadow-md transition hover:shadow-lg w-full h-full"
              >
                {icon}
                <span className="text-lg font-medium text-black text-left">{title}</span>
              </button>
            ))}
          </div>

          {/* Recent Incidents */}
          <div className="bg-gray-100 rounded-xl shadow-sm p-3 mt-6 mx-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Recent Incidents</h3>
              <button
                onClick={() => setShowIncidents(true)}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {recentIncidents.map(({ id, type, location, ago }) => (
                <div
                  key={id}
                  onClick={() => navigate(`/incident-report/${id}`)}
                  className="bg-white rounded-xl shadow p-4 flex items-center justify-between transition hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100">
                      <img
                        src={imgUrl(incidentTypeIcons[type])}
                        alt={type}
                        className="w-10 h-10 object-fill border rounded-lg"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-black">
                        {type ? type.charAt(0).toUpperCase() + type.slice(1) : "Incident"}
                      </p>
                      <p className="text-xs text-gray-500">{location}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{ago}</p>
                </div>
              ))}
            </div>

            {isLoading && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Loading incidents...</p>
              </div>
            )}
            {!isLoading && recentIncidents.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No recent incidents in your workspace</p>
              </div>
            )}
          </div>

          {/* Full incidents view (optional) */}
          {showIncidents && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="w-full max-w-md">
                {/* You can adapt RecentIncidents to accept workspaceId instead of company */}
                <RecentIncidents workspaceMode />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowIncidents(false)}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Back to dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // Notifications (hide the rest)
        <NotificationCenter />
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-4">
        <div className="max-w-lg mx-auto flex justify-between px-8 py-3">
          <Link to="/user-dashboard" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/reports" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
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
