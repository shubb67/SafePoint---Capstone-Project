import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, addDoc, query, orderBy, onSnapshot, where, serverTimestamp, getDocs, doc, getDoc,
} from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft, Phone, Search, User, Send, Plus, Mic, Bell, MoreHorizontal, Archive, ArchiveRestore
} from "lucide-react";
import { Link } from "react-router-dom";
import { Home, FileText, MessageSquare } from "lucide-react";

/* ---------- Firestore helpers (workspace-scoped) ---------- */
const msgCol = (wsId, chatId) =>
  collection(db, "workspaces", wsId, "chats", chatId, "messages");

/* ---------- Time helpers ---------- */
const timeLabel = (date) => {
  const now = new Date();
  const d = new Date(date);
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diff = (now - d) / 86400000;
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" }); // Friday
  return d.toLocaleDateString();
};

const dateStamp = (date) =>
  new Date(date).toLocaleDateString([], { day: "2-digit", month: "long" });

/* ---------- Local archive helpers ---------- */
const archiveKey = (uid) => `archivedChats_${uid}`;
const loadArchived = (uid) => {
  try {
    const raw = localStorage.getItem(archiveKey(uid));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};
const saveArchived = (uid, set) => {
  try {
    localStorage.setItem(archiveKey(uid), JSON.stringify(Array.from(set)));
  } catch {}
};

/* ---------- Component ---------- */
export default function MobileWorkspaceChat() {
  const auth = getAuth();
  const [workspaceId, setWorkspaceId] = useState(null);
  const [me, setMe] = useState(null);

  // list screen
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All"); // All | Read | Unread | Archived
  const [people, setPeople] = useState([]); // users in workspace (except me)
  const [lastMsgs, setLastMsgs] = useState({}); // { userId: {text,timestamp,senderId} }
  const [archived, setArchived] = useState(new Set()); // chatId strings
  const [loading, setLoading] = useState(true);

  // chat screen
  const [active, setActive] = useState(null); // user object
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  /* Load me + workspace */
  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) return;
      const snap = await getDoc(doc(db, "users", u.uid));
      if (!snap.exists()) return;
      const data = snap.data();
      setWorkspaceId(data.workspaceId || null);
      setMe({
        id: u.uid,
        name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.displayName || data.email || "Me",
        email: data.email,
        photoUrl: data.photoUrl || "",
        role: data.role || "user",
      });
      setArchived(loadArchived(u.uid));
    })();
  }, []);

  /* Fetch workspace users (list screen) */
  useEffect(() => {
    (async () => {
      if (!workspaceId || !me) return;
      setLoading(true);
      const qs = query(collection(db, "users"), where("workspaceId", "==", workspaceId));
      const s = await getDocs(qs);
      const all = s.docs
        .filter((d) => d.id !== me.id)
        .map((d) => ({
          id: d.id,
          name:
            `${d.data().firstName || ""} ${d.data().lastName || ""}`.trim() ||
            d.data().displayName ||
            d.data().email,
          email: d.data().email,
          photoUrl: d.data().photoUrl || "",
        }));
      setPeople(all);
      setLoading(false);

      // Fetch last message for each
      const fetchLasts = async () => {
        const result = {};
        for (const p of all) {
          const chatId = [me.id, p.id].sort().join("_");
          const qRef = query(msgCol(workspaceId, chatId), orderBy("timestamp", "desc"));
          const snap = await getDocs(qRef);
          if (!snap.empty) {
            const m = snap.docs[0].data();
            const t = m.timestamp?.toDate?.() || new Date();
            result[p.id] = { text: m.text || "", timestamp: t, senderId: m.senderId };
          }
        }
        setLastMsgs(result);
      };
      fetchLasts();
    })();
  }, [workspaceId, me]);

  /* Live subscription for active chat */
  useEffect(() => {
    if (!active || !workspaceId || !me) return;
    const chatId = [me.id, active.id].sort().join("_");
    const qRef = query(msgCol(workspaceId, chatId), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(qRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(list);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => unsub();
  }, [active, workspaceId, me]);

  /* Actions */
  const openChat = (user) => setActive(user);
  const backToList = () => setActive(null);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active || !workspaceId || !me) return;
    const chatId = [me.id, active.id].sort().join("_");
    await addDoc(msgCol(workspaceId, chatId), {
      text: text.trim(),
      senderId: me.id,
      senderName: me.name,
      timestamp: serverTimestamp(),
      read: false,
    });
    setText("");
  };

  /* Archive / Unarchive (client-side) */
  const toggleArchive = (userId) => {
    if (!me) return;
    const chatId = [me.id, userId].sort().join("_");
    const next = new Set(archived);
    if (next.has(chatId)) next.delete(chatId);
    else next.add(chatId);
    setArchived(next);
    saveArchived(me.id, next);
  };

  /* Derive filters */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const base = people.filter((p) => {
      if (!term) return true;
      return (
        (p.name || "").toLowerCase().includes(term) ||
        (p.email || "").toLowerCase().includes(term) ||
        (lastMsgs[p.id]?.text || "").toLowerCase().includes(term)
      );
    });

    if (tab === "All") return base;

    return base.filter((p) => {
      const chatId = [me?.id, p.id].sort().join("_");
      const last = lastMsgs[p.id];

      if (tab === "Archived") return archived.has(chatId);
      if (!last) return false;

      const unread = last.senderId && last.senderId !== me?.id;
      return tab === "Unread" ? unread : !unread; // "Read"
    });
  }, [people, search, lastMsgs, tab, archived, me?.id]);

  /* ------------------- UI ------------------- */
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-md bg-white">
        {!active ? (
          /* ---------- Chats list (mobile) ---------- */
          <div className="flex flex-col min-h-screen">
            <header className="bg-white px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
                <button className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200">
                  <Bell className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-gray-50 text-base text-gray-900 pl-10 pr-4 py-3 rounded-lg border border-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                {["All", "Read", "Unread", "Archived"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tab === t
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No conversations</div>
              ) : (
                filtered.map((p) => {
                  const last = lastMsgs[p.id];
                  const ts = last?.timestamp ? timeLabel(last.timestamp) : "";
                  const unread = !!last && last.senderId !== me?.id;
                  const chatId = [me?.id, p.id].sort().join("_");
                  const isArchived = archived.has(chatId);

                  return (
                    <div
                      key={p.id}
                      className="group w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                      onClick={() => openChat(p)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        toggleArchive(p.id);
                      }}
                    >
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[15px] font-medium text-gray-900 truncate">{p.name}</span>
                            {unread && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
                            {isArchived && (
                              <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                Archived
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{ts}</span>
                        </div>
                        <div className="text-[13px] text-gray-600 truncate">
                          {last ? (last.senderId === me?.id ? "You: " : "") + last.text : "No messages yet"}
                        </div>
                      </div>

                      {/* quick archive toggle */}
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchive(p.id);
                        }}
                        title={isArchived ? "Unarchive" : "Archive"}
                      >
                        {isArchived ? (
                          <ArchiveRestore className="w-5 h-5 text-gray-600" />
                        ) : (
                          <Archive className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom nav (chats active) */}
            <nav className="bg-white border-t border-gray-200 px-4 py-2 pb-6">
              <div className="flex justify-around">
                <Link to="/user-dashboard" className="flex flex-col items-center py-2 text-gray-500 hover:text-blue-600">
                  <Home className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Home</span>
                </Link>
                <Link to="/my-reports" className="flex flex-col items-center py-2 text-gray-500 hover:text-blue-600">
                  <FileText className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Reports</span>
                </Link>
                <Link to="/workspace-chat" className="flex flex-col items-center py-2 text-blue-600">
                  <MessageSquare className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Chats</span>
                </Link>
                <Link to="/profile" className="flex flex-col items-center py-2 text-gray-500 hover:text-blue-600">
                  <User className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Profile</span>
                </Link>
              </div>
            </nav>
          </div>
        ) : (
          /* ---------- Conversation (mobile) ---------- */
          <div className="flex flex-col min-h-screen">
            <header className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <button onClick={backToList} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>

                <div className="flex items-center gap-3">
                  {active.photoUrl ? (
                    <img src={active.photoUrl} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <span className="text-[16px] font-semibold text-gray-900">{active.name}</span>
                </div>

                <button className="p-2 -mr-2 rounded-full hover:bg-gray-100">
                  <Phone className="w-6 h-6 text-blue-600" />
                </button>
              </div>
            </header>

            <div className="flex-1 bg-white overflow-y-auto px-4 py-4">
              {/* Date chip (first group) */}
              {messages.length > 0 && (
                <div className="flex justify-center mb-4">
                  <span className="text-[11px] text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {dateStamp(messages[0].timestamp?.toDate?.() || new Date())}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((m, idx) => {
                  const mine = m.senderId === me?.id;
                  const t = m.timestamp?.toDate?.() || new Date();
                  const prev = messages[idx - 1];
                  const showDate =
                    idx === 0 ||
                    dateStamp(prev?.timestamp?.toDate?.() || new Date()) !== dateStamp(t);

                  return (
                    <div key={m.id}>
                      {showDate && idx !== 0 && (
                        <div className="flex justify-center mb-4">
                          <span className="text-[11px] text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            {dateStamp(t)}
                          </span>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}

                        <div className="flex flex-col max-w-[75%]">
                          <div
                            className={`px-4 py-2.5 text-[14px] leading-relaxed ${
                              mine
                                ? "bg-blue-600 text-white rounded-2xl rounded-br-md shadow-sm"
                                : "bg-white text-gray-900 rounded-2xl rounded-bl-md border border-gray-200"
                            }`}
                          >
                            {!mine && (
                              <div className="text-[12px] font-semibold text-gray-700 mb-1">
                                {m.senderName || active.name}
                              </div>
                            )}
                            <div>{m.text}</div>
                          </div>

                          <div className={`text-[11px] text-gray-500 mt-1 ${mine ? "text-right" : "text-left"}`}>
                            {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        {mine && (
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div ref={endRef} />
            </div>

            {/* Composer */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <form onSubmit={send} className="flex items-center gap-2">
                <button type="button" className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
                  <Plus className="w-6 h-6" />
                </button>

                <div className="flex-1 bg-gray-100 rounded-full px-4 py-3 flex items-center gap-2 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(e);
                      }
                    }}
                    placeholder="Message"
                    className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-500"
                  />
                  <button type="button" className="p-1.5 text-gray-500 rounded-full hover:bg-gray-200">
                    <Mic className="w-5 h-5" />
                  </button>
                </div>

                <button type="submit" className="p-2 text-blue-600 rounded-full hover:bg-blue-50">
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
