// src/AdminProfilePage.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  limit,
  arrayRemove,

} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/_utils/firebase";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { PlusCircle, ClipboardCheck, ShieldCheck, Award, Bell, 
  HelpCircle, 
  Search, 
  Home, 
  FileText, 
  MessageSquare, 
  Layout,
  User,
  Calendar,
  Map,
  X } from "lucide-react";
import { getAuth } from "firebase/auth";




export default function AdminProfilePage() {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [ws, setWs] = useState(null);
  const [team, setTeam] = useState([]); // [{uid, name, email, phone, photoURL, role}]
  const [searchQuery, setSearchQuery] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([
      {
        id: 1,
        type: 'incident',
        title: 'New Incident Report Submitted',
        description: 'Workplace safety incident reported by John Smith in Manufacturing Floor A',
        time: '2 minutes ago',
        isRead: false,
        actions: ['Review', 'Assign']
      },
      {
        id: 2,
        type: 'info',
        title: 'Additional Information Provided',
        description: 'Report #IR-2025-001 has been updated with requested documentation',
        time: '3 hours ago',
        isRead: false,
        actions: ['Review', 'Details']
      },
      {
        id: 3,
        type: 'assignment',
        title: 'Report Assigned to You',
        description: 'Equipment malfunction report assigned by Sarah Johnson - requires immediate attention',
        time: '1 day ago',
        isRead: true,
        actions: ['Accept', 'Decline']
      },
      {
        id: 4,
        type: 'update',
        title: 'Report Status Update',
        description: 'Report #IR-2025-001 requires additional information',
        time: '2 days ago',
        isRead: true,
        actions: ['View']
      }
    ]);
  
    const auth = getAuth();
  
  
    const handleLogout = () => {
      signOut(auth);
      navigate('/login');
    };
  
  
    const notificationRef = useRef(null);
  
    // Close notification panel when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target)) {
          setShowNotifications(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    const unreadCount = notifications.filter(n => !n.isRead).length;
  
    const markAsRead = (id) => {
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    };
  
    const handleAction = (notificationId, action) => {
      console.log(`Action "${action}" clicked for notification ${notificationId}`);
      markAsRead(notificationId);
      // Handle specific actions here
    };
  
    const getNotificationIcon = (type) => {
      switch(type) {
        case 'incident':
          return '⚠️';
        case 'assignment':
          return '📋';
        case 'update':
          return '🔄';
        default:
          return 'ℹ️';
      }
    };
  
    const getActionButtonClass = (action) => {
      switch(action.toLowerCase()) {
        case 'accept':
          return 'bg-green-500 hover:bg-green-600 text-white';
        case 'decline':
          return 'bg-red-500 hover:bg-red-600 text-white';
        case 'view':
          return 'bg-blue-500 hover:bg-blue-600 text-white';
        default:
          return 'bg-gray-200 hover:bg-gray-300 text-gray-800';
      }
    };


  // --- Auth + workspace bootstrap ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
        return;
      }
      setAuthUser(u);

      // 1) Use currentWorkspaceSetup if present
      const stored = localStorage.getItem("currentWorkspaceSetup");
      let wId = stored || null;

      // 2) Fallback: find a workspace by ownerId
      if (!wId) {
        const q = query(
          collection(db, "workspaces"),
          where("ownerId", "==", u.uid),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) wId = snap.docs[0].id;
      }

      if (!wId) {
        setLoading(false);
        return;
      }

      setWorkspaceId(wId);

      // Load workspace document
      const wsDoc = await getDoc(doc(db, "workspaces", wId));
      if (wsDoc.exists()) {
        const data = { id: wsDoc.id, ...wsDoc.data() };
        setWs(data);

        // Load team members (users collection)
        const members = Array.isArray(data.members) ? data.members : [];
        const loadedTeam = await Promise.all(
          members.map(async (uid) => {
            const userDoc = await getDoc(doc(db, "users", uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            return {
              uid,
              name:
                userData.name ||
                auth?.currentUser?.displayName ||
                "Unknown User",
              email: userData.email || userData.mail || "unknown@example.com",
              phone:
                userData.phone ||
                userData.phoneNumber ||
                "(000) 000 0000",
              photoURL:
                userData.photoUrl ||
                "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=User",
              role: uid === data.ownerId ? "Admin" : "User",
            };
          })
        );
        setTeam(loadedTeam);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

  const owner = useMemo(
    () => team.find((m) => m.uid === ws?.ownerId),
    [team, ws?.ownerId]
  );

  const currentUserRow = useMemo(
    () => team.find((m) => m.uid === authUser?.uid),
    [team, authUser?.uid]
  );

  // Helpers to format
  const firstName = useMemo(() => {
    const full = currentUserRow?.name || authUser?.displayName || "—";
    return full.split(" ")[0] || "—";
  }, [currentUserRow?.name, authUser?.displayName]);

  const surname = useMemo(() => {
    const full = currentUserRow?.name || authUser?.displayName || "";
    const parts = full.trim().split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "—";
  }, [currentUserRow?.name, authUser?.displayName]);

  const formatPhone = (p) => {
    if (!p) return "(—)";
    // Keep simple – if already formatted, return
    if (p.includes("(") || p.includes("-")) return p;
    const digits = p.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return p;
  };

  const userPass = useMemo(
    () =>
      ws?.passCodes?.find((c) => c?.type === "employee")?.code ||
      ws?.passCodes?.find((c) => /user/i.test(c?.label || ""))?.code ||
      "—",
    [ws?.passCodes]
  );
  const adminPass = useMemo(
    () =>
      ws?.passCodes?.find((c) => c?.type === "admin")?.code ||
      ws?.passCodes?.find((c) => /admin/i.test(c?.label || ""))?.code ||
      "—",
    [ws?.passCodes]
  );

  // Remove team member (not owner)
  const removeMember = async (uid) => {
    if (!workspaceId || !ws) return;
    if (uid === ws.ownerId) return; // never remove owner
    try {
      await updateDoc(doc(db, "workspaces", workspaceId), {
        members: arrayRemove(uid),
      });
      setTeam((prev) => prev.filter((m) => m.uid !== uid));
    } catch (e) {
      console.error("Failed to remove member:", e);
      alert("Failed to remove member. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
        <div className="mt-4 h-48 w-full bg-gray-100 rounded" />
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">
          No active workspace found. Please create a workspace first.
        </p>
      </div>
    );
  }

  return (
<div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4">
          <div className="h-12 flex items-center gap-3">
      
            {/* Brand */}
            <Link to="/admin-dashboard" className="flex items-center gap-2 group">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full
                           bg-gradient-to-br from-blue-600 to-blue-400 text-white text-[11px] font-black shadow-sm"
                aria-hidden
              >
                SP
              </span>
              <span className="text-sm sm:text-base font-semibold text-blue-600 group-hover:text-blue-700">
                SafePoint
              </span>
            </Link>
      
            {/* Search (desktop) */}
            <div className="hidden md:flex ml-auto mr-2 relative w-60 lg:w-72 xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300/70
                           text-sm text-gray-800 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                           bg-white"
              />
            </div>
      
            {/* Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
      
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-md
                             text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                                 bg-red-500 text-white text-[10px] leading-4 text-center font-semibold"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
      
                {/* Panel */}
                {showNotifications && (
                  <div
                    className="absolute right-0 mt-2 w-[20rem] sm:w-[22rem] md:w-[24rem] bg-white rounded-xl shadow-2xl
                               ring-1 ring-black/5 overflow-hidden z-50"
                  >
                    <div className="bg-gray-50/60 backdrop-blur px-4 py-3 border-b flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                      <span className="text-xs text-gray-500">{unreadCount} unread</span>
                    </div>
      
                    <div className="max-h-[420px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition
                                        ${!n.isRead ? "bg-blue-50/40" : ""}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 text-xl mt-0.5">{getNotificationIcon(n.type)}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                                  {!n.isRead && (
                                    <span className="ml-auto mt-1 h-2 w-2 rounded-full bg-blue-500" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.description}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-xs text-gray-400">{n.time}</span>
                                  <div className="flex gap-2">
                                    {n.actions.map((action, i) => (
                                      <button
                                        key={i}
                                        onClick={() => handleAction(n.id, action)}
                                        className={`px-2.5 py-1 text-xs rounded-md ${getActionButtonClass(action)}`}
                                      >
                                        {action}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
      
                    <div className="px-4 py-3 bg-gray-50 text-center border-t">
                      <Link
                        to="/notifications"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>
      
              {/* Help & User */}
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md
                           text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                aria-label="Help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              
              <Link to="/admin-profile">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full
                             bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                  aria-label="Account"
                >
                  <User className="w-5 h-5" />
                </button>
              </Link>
      
              {/* Mobile search button */}
              <div className="md:hidden">
                <Search className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 h-screen bg-white border-r">
          <div className="h-full flex flex-col">
            {/* Org header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-3">
                {ws?.companyLogo ? (
                  <img
                    src={ws.companyLogo}
                    alt={ws.companyName || "Organization"}
                    className="w-9 h-9 rounded object-cover ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded bg-gray-200 ring-1 ring-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                      {ws?.companyName?.slice(0, 2)?.toUpperCase() || "CO"}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">
                    {ws?.companyName || "Company"}
                  </p>
                  <p className="text-[12px] text-gray-500 truncate">
                    {ws?.companyLocation || "Location"}
                  </p>
                </div>
              </div>
            </div>
      
            {/* Nav */}
            <nav className="px-2 py-2 space-y-1 flex-1">
              <NavLink
                to="/admin-dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
                   ${isActive
                     ? "bg-blue-50 text-blue-700"
                     : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"}`
                }
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </NavLink>
      
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
                   ${isActive
                     ? "bg-blue-50 text-blue-700"
                     : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"}`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Incident Reports</span>
              </NavLink>
      
              <NavLink
                to="/chat"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
                   ${isActive
                     ? "bg-blue-50 text-blue-700"
                     : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"}`
                }
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chats</span>
              </NavLink>
            </nav>
      
            {/* Footer */}
            <div className="px-2 pb-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
                           text-gray-600 hover:bg-gray-50 hover:text-red-600 transition"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                <span>Log Out</span>
              </button>
      
              {/* Current user chip */}
              <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-2 py-2">
                <img
                  src={currentUserRow?.photoURL || "/assets/avatar.png"}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-[12px] font-medium text-blue-900 truncate">
                  {currentUserRow?.name || authUser?.email || "Admin"}
                </span>
              </div>
            </div>
          </div>
        </aside>
        <div className="flex-1 p-4 sm:p-6 max-w-5xl">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-4 sm:gap-6">
                {/* Left Profile */}
          <div className="flex items-center gap-4 sm:gap-6 flex-1">
            <img
              src={
                currentUserRow?.photoURL ||
                "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=User"
              }
              alt="profile"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
            />
            <div>
              <div className="text-lg sm:text-xl font-semibold text-black">
                {currentUserRow?.name || "—"}
              </div>
              <div className="text-sm text-gray-600">Admin</div>
              <button
                className="mt-1 text-xs text-[#2B6BEA] hover:underline"
                onClick={() => {/* open upload modal */}}
              >
                Edit Profile Picture
              </button>
            </div>
          </div>

          {/* Right Company Logo + name */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
              {ws.companyLogo ? (
                <img
                  src={ws.companyLogo}
                  alt="company logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-gray-500">
                  {ws.companyName?.slice(0, 5)?.toUpperCase() || "LOGO"}
                </span>
              )}
            </div>
            <div>
              <div className="text-lg sm:text-xl font-semibold text-black">
                {ws.companyName || "—"}
              </div>
              <div className="text-sm text-gray-600">{ws.companyLocation || "—"}</div>
              <button
                className="mt-1 text-xs text-[#2B6BEA] hover:underline"
                onClick={() => {/* open upload modal */}}
              >
                Edit Profile Picture
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <SectionCard title="Personal Information" onEdit={() => {/* navigate to edit */}}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-sm">
          <Field label="First Name" value={firstName} />
          <Field label="Surname" value={surname} />
          <Field label="Email" value={currentUserRow?.email || "—"} />
          <Field label="Phone Number" value={formatPhone(currentUserRow?.phone)} />
        </div>
      </SectionCard>

      {/* Company Information */}
      <SectionCard title="Company Information" onEdit={() => {/* navigate to edit */}}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-sm">
          <Field label="Company Name" value={ws.companyName || "—"} />
          <Field label="Location" value={ws.companyLocation || "—"} />
          <Field label="Email" value={ws.companyEmail || "—"} />
          <Field label="Phone Number" value={formatPhone(ws.companyPhone)} />
        </div>
      </SectionCard>

      {/* Company Password */}
      <SectionCard title="Company Password" onEdit={() => {/* navigate to edit */}}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-sm">
          <Field label="User Passcode" value={userPass} />
          <Field label="Admin Passcode" value={adminPass} />
        </div>
      </SectionCard>

      {/* Manage Team Members */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="text-sm font-semibold text-black">Manage Team Members</div>
          <button
            className="text-xs text-[#2B6BEA] hover:underline inline-flex items-center gap-1"
            onClick={() => navigate("/team")}
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Header row */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2 text-xs text-gray-500">
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Remove User</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {team.map((m) => (
            <div key={m.uid} className="grid grid-cols-12 items-center px-4 py-3">
              <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
                <img
                  src={m.photoURL}
                  alt={m.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="text-sm">{m.name}</div>
              </div>

              <div className="col-span-12 sm:col-span-4 text-sm text-gray-700 mt-2 sm:mt-0">
                {m.email}
              </div>

              <div className="col-span-8 sm:col-span-2 mt-2 sm:mt-0">
                <span
                  className={[
                    "inline-flex items-center justify-center h-6 min-w-[60px] rounded-md px-2 text-xs font-medium",
                    m.role === "Admin"
                      ? "bg-[#2B6BEA] text-white"
                      : "bg-gray-200 text-gray-800",
                  ].join(" ")}
                >
                  {m.role}
                </span>
              </div>

              <div className="col-span-4 sm:col-span-2 mt-2 sm:mt-0 text-right">
                <button
                  disabled={m.uid === ws.ownerId}
                  onClick={() => removeMember(m.uid)}
                  className={`inline-flex items-center justify-center h-7 px-3 rounded-md text-xs font-medium ${
                    m.uid === ws.ownerId
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-[#F87171] text-white hover:bg-[#ef4444]"
                  }`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">No team members yet.</div>
          )}
        </div>
      </div>
    </div>
    </div>
    </div>
  
  );
}

/* ————— Small presentational helpers ————— */

function SectionCard({ title, onEdit, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="text-sm font-semibold">{title}</div>
        <button
          className="text-xs text-[#2B6BEA] hover:underline"
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[12px] text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}
