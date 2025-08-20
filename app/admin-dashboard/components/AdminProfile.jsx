// src/AdminProfilePage.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  doc, getDoc, getDocs, updateDoc, collection, query, where, limit,
  arrayRemove, deleteField, documentId
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/_utils/firebase";
import {
  Bell, HelpCircle, Search, Home, FileText, MessageSquare, User, ChevronRight,
  XCircle
} from "lucide-react";

export default function AdminProfilePage() {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [ws, setWs] = useState(null);

  // [{uid, name, email, phone, photoURL, role}]
  const [team, setTeam] = useState([]);

  // notifications (mocked)
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, type: "incident", title: "New Incident Report Submitted", description: "Incident reported on Site A", time: "2 minutes ago", isRead: false, actions: ["Review", "Assign"] },
    { id: 2, type: "info", title: "Additional Information Provided", description: "Report IR-2025-001 updated", time: "3 hours ago", isRead: false, actions: ["Review", "Details"] },
  ]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [searchQuery, setSearchQuery] = useState("");
  const notificationRef = useRef(null);

  // --- auth + workspace bootstrap ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
        return;
      }
      setAuthUser(u);

      setLoading(true);
      try {
        // 1) Try localStorage workspace
        let wId = localStorage.getItem("currentWorkspaceSetup") || null;

        // 2) Fallback: user doc's currentWorkspace / workspaceId
        if (!wId) {
          const uSnap = await getDoc(doc(db, "users", u.uid));
          const uData = uSnap.exists() ? uSnap.data() : {};
          wId = uData.currentWorkspace || uData.workspaceId || null;
        }

        // 3) Fallback: ownerId lookup
        if (!wId) {
          const qWs = query(collection(db, "workspaces"), where("ownerId", "==", u.uid), limit(1));
          const snap = await getDocs(qWs);
          if (!snap.empty) wId = snap.docs[0].id;
        }

        if (!wId) {
          setWorkspaceId(null);
          setWs(null);
          setTeam([]);
          return;
        }

        setWorkspaceId(wId);

        // Load workspace
        const wsSnap = await getDoc(doc(db, "workspaces", wId));
        if (!wsSnap.exists()) {
          setWs(null);
          setTeam([]);
          return;
        }
        const wsData = { id: wsSnap.id, ...wsSnap.data() };
        setWs(wsData);

        // Build member UID list (supports object OR array schema)
        let memberUids = [];
        if (Array.isArray(wsData.members)) {
          memberUids = wsData.members;
        } else if (wsData.members && typeof wsData.members === "object") {
          memberUids = Object.keys(wsData.members);
        }

        // Batch load user docs (chunk IN queries by 30)
        const CHUNK = 30;
        const chunks = [];
        for (let i = 0; i < memberUids.length; i += CHUNK) {
          chunks.push(memberUids.slice(i, i + CHUNK));
        }

        const users = [];
        for (const ids of chunks) {
          const qUsers = query(collection(db, "users"), where(documentId(), "in", ids));
          const snap = await getDocs(qUsers);
          snap.forEach(d => {
            users.push({ uid: d.id, ...d.data() });
          });
        }

        // In case some user docs are missing, ensure all uids represented
        const usersByUid = new Map(users.map(u => [u.uid, u]));
        const teamRows = memberUids.map(uid => {
          const u = usersByUid.get(uid) || {};
          const mem = (wsData.members && typeof wsData.members === "object") ? wsData.members[uid] : {};
          const role = uid === wsData.ownerId ? "Admin" : (mem?.role || "User");
          return {
            uid,
            name: u.name || u.displayName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown User",
            email: u.email || u.mail || "unknown@example.com",
            phone: u.phone || u.phoneNumber || "",
            photoURL: u.photoUrl || u.photoURL || `https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=${encodeURIComponent(u.name || "User")}`,
            role,
          };
        });

        setTeam(teamRows);
      } catch (e) {
        console.error("AdminProfile bootstrap error:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  // click outside for notifications
  useEffect(() => {
    const onDown = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // computed
  const owner = useMemo(() => team.find(m => m.uid === ws?.ownerId), [team, ws?.ownerId]);
  const currentUserRow = useMemo(() => team.find(m => m.uid === authUser?.uid), [team, authUser?.uid]);

  const firstName = useMemo(() => {
    const full = currentUserRow?.name || authUser?.displayName || "";
    return (full || "—").split(" ")[0] || "—";
  }, [currentUserRow?.name, authUser?.displayName]);

  const surname = useMemo(() => {
    const full = currentUserRow?.surname || authUser?.displayName || "";
    const parts = full.trim().split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "—";
  }, [currentUserRow?.name, authUser?.displayName]);

  const formatPhone = (p) => {
    if (!p) return "—";
    if (p.includes("(") || p.includes("-")) return p;
    const digits = p.replace(/\D/g, "");
    if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)} ${digits.slice(6)}`;
    return p;
  };

  const userPass = useMemo(() => {
    const arr = ws?.passCodes || [];
    return arr.find(c => c?.type === "employee")?.code ||
           arr.find(c => /user/i.test(c?.label || ""))?.code ||
           "—";
  }, [ws?.passCodes]);

  const adminPass = useMemo(() => {
    const arr = ws?.passCodes || [];
    return arr.find(c => c?.type === "admin")?.code ||
           arr.find(c => /admin/i.test(c?.label || ""))?.code ||
           "—";
  }, [ws?.passCodes]);

  // notifications helpers
  const markAsRead = (id) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
  const handleAction = (id, action) => { console.log("notif action", action, id); markAsRead(id); };
  const notifIcon = (type) => (type === "incident" ? "⚠️" : type === "assignment" ? "📋" : type === "update" ? "🔄" : "ℹ️");

  // remove member (supports both schemas)
  const removeMember = async (uid) => {
    if (!workspaceId || !ws) return;
    if (uid === ws.ownerId) return;

    try {
      if (Array.isArray(ws.members)) {
        await updateDoc(doc(db, "workspaces", workspaceId), {
          members: arrayRemove(uid),
        });
      } else {
        await updateDoc(doc(db, "workspaces", workspaceId), {
          [`members.${uid}`]: deleteField(),
        });
      }
      setTeam(t => t.filter(m => m.uid !== uid));
    } catch (e) {
      console.error("Failed to remove member:", e);
      alert("Failed to remove member. Please try again.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
        <div className="animate-pulse h-48 w-full bg-gray-100 rounded" />
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 flex items-start gap-2">
          <XCircle className="mt-0.5" size={16} />
          <div>No active workspace found. Please create or select a workspace.</div>
        </div>
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
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-white text-[11px] font-black shadow-sm">SP</span>
              <span className="text-sm sm:text-base font-semibold text-blue-600 group-hover:text-blue-700">SafePoint</span>
            </Link>

            {/* Search (desktop) */}
            <div className="hidden md:flex ml-auto mr-2 relative w-60 lg:w-72 xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300/70 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>

            {/* Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(s => !s)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-semibold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-[22rem] md:w-[24rem] bg-white rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-50">
                    <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                      <span className="text-xs text-gray-500">{unreadCount} unread</span>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition ${!n.isRead ? "bg-blue-50/40" : ""}`}>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 text-xl mt-0.5">{notifIcon(n.type)}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                                {!n.isRead && <span className="ml-auto mt-1 h-2 w-2 rounded-full bg-blue-500" />}
                              </div>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.description}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-gray-400">{n.time}</span>
                                <div className="flex gap-2">
                                  {n.actions.map((a, i) => (
                                    <button key={i} onClick={() => handleAction(n.id, a)} className="px-2.5 py-1 text-xs rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800">
                                      {a}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 bg-gray-50 text-center border-t">
                      <Link to="/notifications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all notifications</Link>
                    </div>
                  </div>
                )}
              </div>

              <button className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition" aria-label="Help">
                <HelpCircle className="w-5 h-5" />
              </button>

              <Link to="/admin-profile">
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition" aria-label="Account">
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
        <aside className="w-60 min-h-[calc(100vh-48px)] bg-white border-r">
          <div className="h-full flex flex-col">
            {/* Org header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-3">
                {ws?.companyLogo ? (
                  <img src={ws.companyLogo} alt={ws.companyName || "Organization"} className="w-9 h-9 rounded object-cover ring-1 ring-gray-200" />
                ) : (
                  <div className="w-9 h-9 rounded bg-gray-200 ring-1 ring-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                      {ws?.companyName?.slice(0, 2)?.toUpperCase() || "CO"}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{ws?.companyName || "Company"}</p>
                  <p className="text-[12px] text-gray-500 truncate">{ws?.companyLocation || "Location"}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="px-2 py-2 space-y-1 flex-1">
              <SideLink to="/admin-dashboard" label="Home" icon={<Home className="w-4 h-4" />} />
              <SideLink to="/reports" label="Incident Reports" icon={<FileText className="w-4 h-4" />} />
              <SideLink to="/chat" label="Chats" icon={<MessageSquare className="w-4 h-4" />} />
            </nav>

            {/* Footer */}
            <div className="px-2 pb-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-red-600 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                <span>Log Out</span>
              </button>

              {/* Current user chip */}
              <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-2 py-2">
                <img src={currentUserRow?.photoURL || "/assets/avatar.png"} alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-[12px] font-medium text-blue-900 truncate">
                  {currentUserRow?.name || authUser?.email || "Admin"}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl">
          {/* Profile header card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Left: profile */}
              <div className="flex items-center gap-4 sm:gap-6 flex-1">
                <img
                  src={currentUserRow?.photoURL || "https://ui-avatars.com/api/?background=E5E7EB&color=111827&name=User"}
                  alt="profile"
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
                />
                <div>
                  <div className="text-lg sm:text-xl font-semibold text-black">{currentUserRow?.name || "—"}</div>
                  <div className="text-sm text-gray-600">Admin</div>
                  <button className="mt-1 text-xs text-[#2B6BEA] hover:underline">Edit Profile Picture</button>
                </div>
              </div>

              {/* Right: company */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                  {ws.companyLogo ? (
                    <img src={ws.companyLogo} alt="company logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-500">{ws.companyName?.slice(0, 5)?.toUpperCase() || "LOGO"}</span>
                  )}
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-semibold text-black">{ws.companyName || "—"}</div>
                  <div className="text-sm text-gray-600">{ws.companyLocation || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <SectionCard title="Personal Information" className="text-black" onEdit={() => {}}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-sm ">
              <Field label="First Name" value={firstName} />
              <Field label="Surname" value={surname} />
              <Field label="Email" value={currentUserRow?.email || "—"} />
              <Field label="Phone Number" value={formatPhone(currentUserRow?.phone)} />
            </div>
          </SectionCard>

          {/* Company Info */}
          <SectionCard title="Company Information" onEdit={() => {}}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-sm">
              <Field label="Company Name" value={ws.companyName || "—"} />
              <Field label="Location" value={ws.companyLocation || "—"} />
              <Field label="Email" value={ws.companyEmail || "—"} />
              <Field label="Phone Number" value={formatPhone(ws.companyPhone)} />
            </div>
          </SectionCard>

          {/* Passcodes */}
          <SectionCard title="Company Password" onEdit={() => {}}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-sm">
              <Field label="User Passcode" value={userPass} />
              <Field label="Admin Passcode" value={adminPass} />
            </div>
          </SectionCard>

          {/* Team */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="text-sm font-semibold text-black">Manage Team Members</div>
              <button onClick={() => navigate("/team")} className="text-xs text-[#2B6BEA] hover:underline inline-flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* header row */}
            <div className="hidden sm:grid grid-cols-12 px-4 py-2 text-xs text-gray-500">
              <div className="col-span-4">Name</div>
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Remove User</div>
            </div>

            {/* rows */}
            <div className="divide-y divide-gray-100">
              {team.map(m => (
                <div key={m.uid} className="grid grid-cols-12 items-center px-4 py-3">
                  <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
                    <img src={m.photoURL} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                    <div className="text-sm text-black">{m.name}</div>
                  </div>

                  <div className="col-span-12 sm:col-span-4 text-sm text-gray-700 mt-2 sm:mt-0">
                    {m.email}
                  </div>

                  <div className="col-span-8 sm:col-span-2 mt-2 sm:mt-0">
                    <span className={`inline-flex items-center justify-center h-6 min-w-[60px] rounded-md px-2 text-xs font-medium ${
                      m.role === "Admin" ? "bg-[#2B6BEA] text-white" : "bg-gray-200 text-gray-800"
                    }`}>
                      {m.role}
                    </span>
                  </div>

                  <div className="col-span-4 sm:col-span-2 mt-2 sm:mt-0 text-right">
                    <button
                      disabled={m.uid === ws.ownerId}
                      onClick={() => removeMember(m.uid)}
                      className={`inline-flex items-center justify-center h-7 px-3 rounded-md text-xs font-medium ${
                        m.uid === ws.ownerId ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[#F87171] text-white hover:bg-[#ef4444]"
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
        </main>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function SectionCard({ title, onEdit, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="text-sm font-semibold text-black">{title}</div>
        <button className="text-xs text-[#2B6BEA] hover:underline" onClick={onEdit}>
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

function SideLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-[13px] ${
          isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
