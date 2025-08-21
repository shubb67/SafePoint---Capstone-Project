// src/user-dashboard/components/NotificationCenter.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc as fsDoc,
  updateDoc,
  getDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(s / 3600);
  const day = Math.floor(s / 86400);
  if (day > 0) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (m > 0) return `${m} minute${m > 1 ? "s" : ""} ago`;
  return "just now";
}

function TypeIcon({ type }) {
  if (type === "report") return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
  if (type === "update") return <Info className="w-5 h-5 text-slate-500" />;
  if (type === "status") return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  if (type === "rejected") return <AlertTriangle className="w-5 h-5 text-red-600" />;
  if (type === "review") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  if (type === "infoRequest" || type === "requestMoreInfo")
    return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  return <Bell className="w-5 h-5 text-slate-400" />;
}

function titleFor(n) {
  if (n.title) return n.title;
  switch (n.type) {
    case "requestMoreInfo":
    case "infoRequest":
      return "Your Report Needs More Information";
    case "report":
      return "Your Incident Report Was Submitted";
    case "update":
      return "Your Report Was Updated";
    case "status":
      return "Incident Status Updated";
    case "rejected":
      return "Your Report Was Rejected";
    case "review":
      return "Your Report Was Assigned for Review";
    default:
      return "Notification";
  }
}

// unified unread check across schemas
function isUnread(n, uid) {
  const statusUnread = (n.status || "").toLowerCase() === "unread";
  const boolFlags = n.isRead === false || n.read === false;
  const notInReadBy = Array.isArray(n.readBy) ? !n.readBy.includes(uid) : true;
  const explicitlyRead =
    n.isRead === true || n.read === true || (n.status || "").toLowerCase() === "read";
  if (explicitlyRead) return false;
  if (Array.isArray(n.readBy)) return notInReadBy;
  return statusUnread || boolFlags;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  // workspace-first state
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaceName, setWorkspaceName] = useState("");

  // UI filters
  const [tab, setTab] = useState("all"); // "all" | "unread" | "reports"
  const [search, setSearch] = useState("");

  // streams
  const [personalToUser, setPersonalToUser] = useState([]);
  const [personalUserId, setPersonalUserId] = useState([]);
  const [personalRecipient, setPersonalRecipient] = useState([]);
  const [wsNotify, setWsNotify] = useState([]); // workspaces/{workspaceId}/notify
  const [wsRequestingInfo, setWsRequestingInfo] = useState([]); // workspaces/{workspaceId}/requestingInfo

  // 1) Get user's workspace once
  useEffect(() => {
    (async () => {
      if (!uid) return;
      const u = await getDoc(doc(db, "users", uid));
      if (u.exists()) {
        const data = u.data();
        const wid = data?.workspaceId || data.currentWorkspace || null;
        setWorkspaceId(wid);
        if (wid) {
          const wsSnap = await getDoc(doc(db, "workspaces", wid));
          if (wsSnap.exists()) setWorkspaceName(wsSnap.data()?.name || "");
        }
      }
    })();
  }, [uid]);

  // 2) Personal notifications in root /notifications
  //    a) toUserId == uid
  useEffect(() => {
    if (!uid) return;
    const q1 = query(
      collection(db, "notifications"),
      where("toUserId", "==", uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q1, (snap) => {
      setPersonalToUser(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _src: { kind: "root", path: ["notifications", d.id] },
      })));
    });
  }, [uid]);

  //    b) legacy: userId == uid
  useEffect(() => {
    if (!uid) return;
    const q2 = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q2, (snap) => {
      setPersonalUserId(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _src: { kind: "root", path: ["notifications", d.id] },
      })));
    });
  }, [uid]);

  //    c) legacy alt: recipientId == uid
  useEffect(() => {
    if (!uid) return;
    const q3 = query(
      collection(db, "notifications"),
      where("recipientId", "==", uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q3, (snap) => {
      setPersonalRecipient(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _src: { kind: "root", path: ["notifications", d.id] },
      })));
    });
  }, [uid]);

  // 4) Workspace info-requests: workspaces/{workspaceId}/requestingInfo
  useEffect(() => {
    if (!workspaceId) return;
    const qReq = query(
      collection(db, "workspaces", workspaceId, "requestingInfo"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      qReq,
      (snap) => {
        setWsRequestingInfo(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: "infoRequest",
              title: data.title || null,
              message: data.message || data.text || "",
              incidentId: data.incidentId || null,
              createdAt: data.createdAt || null,
              readBy: Array.isArray(data.readBy) ? data.readBy : [],
              status: data.status || "unread",
              isRead: data.isRead ?? false,
              read: data.read ?? false,
              _src: { kind: "workspace", path: ["workspaces", workspaceId, "requestingInfo", d.id] },
            };
          })
        );
      },
      (err) => console.error("requestingInfo snapshot error", err)
    );
  }, [workspaceId]);

  // 5) Merge, de-dupe, sort
  const allItems = useMemo(() => {
    const map = new Map();
    [
      ...personalToUser,
      ...personalUserId,
      ...personalRecipient,
      ...wsNotify,
      ...wsRequestingInfo,
    ].forEach((n) => {
      map.set(`${n._src?.path?.join("/")}`, n);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return arr;
  }, [personalToUser, personalUserId, personalRecipient, wsNotify, wsRequestingInfo]);

  // 6) Filters
  const filtered = useMemo(() => {
    let list = allItems;
    if (tab === "unread") list = list.filter((n) => isUnread(n, uid));
    if (tab === "reports") list = list.filter((n) => n.type === "report" || !!n.incidentId);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (n) =>
          (titleFor(n) || "").toLowerCase().includes(s) ||
          (n.message || "").toLowerCase().includes(s) ||
          (n.incidentId || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [allItems, tab, search, uid]);

  // 7) Mark as read across sources
  const markAsRead = async (n) => {
    try {
      if (!n || !uid || !n._src?.path) return;
      const p = n._src.path; // e.g. ["workspaces", wid, "notify", id] OR ["notifications", id]
      const ref = fsDoc(db, ...p);
      await updateDoc(ref, {
        status: "read",
        isRead: true,
        read: true,
        readBy: arrayUnion(uid),
      });
    } catch (e) {
      console.error("markAsRead error", e);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h1 className="text-xl font-bold text-black">Notifications</h1>
          <div className="relative p-2">
            <Bell className="w-5 h-5 text-gray-700" />
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none">
              <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            {["all", "unread", "reports"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  tab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-3 pb-24">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 mt-6 text-center">No notifications.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map((n) => (
              <li key={n._src?.path?.join("/") || n.id} className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-none mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <TypeIcon type={n.type} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="font-semibold text-gray-900 text-[15px] leading-5">
                        {titleFor(n)}
                      </p>
                      {isUnread(n, uid) && (
                        <span className="ml-auto h-2.5 w-2.5 rounded-full bg-yellow-400 mt-1" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {n.message || "—"}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>

                      {n.incidentId ? (
                        <Link
                          to={`/incident-report/${n.incidentId}`}
                          onClick={() => markAsRead(n)}
                          className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          View
                        </Link>
                      ) : (
                        <button
                          onClick={() => markAsRead(n)}
                          className="text-xs font-semibold px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-black"
                        >
                          Got it
                        </button>
                      )}
                    </div>

                    {/* tiny source hint (optional) */}
                    {workspaceName && n._src?.kind === "workspace" && (
                      <div className="mt-1 text-[11px] text-gray-400">
                        From workspace: {workspaceName}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
