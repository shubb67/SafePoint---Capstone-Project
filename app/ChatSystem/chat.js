import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  serverTimestamp,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import {
  Send,
  Search,
  User,
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Image,
  Paperclip,
  Smile,
  AtSign,
  MoreHorizontal,
  Menu,
  X,
  ArrowLeft,
  Home as HomeIcon,
} from "lucide-react";
import { Bell, HelpCircle, Home, FileText, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

/** Build the workspace-scoped messages collection path */
const msgCol = (workspaceId, chatId) =>
  collection(db, "workspaces", workspaceId, "chats", chatId, "messages");

const ChatSystem = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [userRole, setUserRole] = useState("user");
  const messagesEndRef = useRef(null);
  const auth = getAuth();

  const [siteLocation, setSiteLocation] = useState("Main Office");
  const [workspacePhotoUrl, setWorkspacePhotoUrl] = useState("");

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load current user + workspace basics
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const meSnap = await getDoc(doc(db, "users", user.uid));
        if (!meSnap.exists()) {
          setIsLoading(false);
          return;
        }
        const me = meSnap.data();
        const wsId = me?.workspaceId || null;

        setCurrentUser({
          id: user.uid,
          name: `${me.firstName || ""} ${me.lastName || ""}`.trim() || me.displayName || me.email || "Me",
          email: me.email,
          photoUrl: me.photoUrl || "",
        });
        setUserRole(me?.role || "user");
        setWorkspaceId(wsId);

        if (wsId) {
          const wsSnap = await getDoc(doc(db, "workspaces", wsId));
          if (wsSnap.exists()) {
            const w = wsSnap.data();
            setWorkspaceName(w?.companyName || w?.name || "Workspace");
            setSiteLocation(w?.defaultSiteName || "Main Office");
            setWorkspacePhotoUrl(w?.companyLogo || "");
          }
        }
      } catch (e) {
        console.error("Failed loading user/workspace:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch chat list: users in the SAME WORKSPACE (excluding me)
  useEffect(() => {
    (async () => {
      if (!workspaceId || !currentUser) return;
      try {
        setIsLoading(true);
        const usersQ = query(collection(db, "users"), where("workspaceId", "==", workspaceId));
        const usersSnap = await getDocs(usersQ);
        const users = usersSnap.docs
          .map((d) => ({
            id: d.id,
            name:
              `${d.data().firstName || ""} ${d.data().lastName || ""}`.trim() ||
              d.data().displayName ||
              d.data().email,
            email: d.data().email,
            photoUrl: d.data().photoUrl || "",
            isOnline: false, // placeholder
          }))
          .filter((u) => u.id !== currentUser.id);

        setChatList(users);
      } catch (e) {
        console.error("Error fetching chat list:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [workspaceId, currentUser]);

  // Fetch last messages for each chat (workspace-scoped)
  useEffect(() => {
    if (!currentUser || !workspaceId || chatList.length === 0) return;

    (async () => {
      const last = {};
      for (const chat of chatList) {
        const chatId = [currentUser.id, chat.id].sort().join("_");
        try {
          const qRef = query(msgCol(workspaceId, chatId), orderBy("timestamp", "desc"));
          const snap = await getDocs(qRef);
          if (!snap.empty) {
            const m = snap.docs[0].data();
            last[chat.id] = {
              text: m.text,
              timestamp: m.timestamp,
              senderId: m.senderId,
            };
          }
        } catch (e) {
          console.error("Error last message:", chatId, e);
        }
      }
      setLastMessages(last);
    })();
  }, [currentUser, workspaceId, chatList]);

  // Live messages for selected chat (workspace-scoped)
  useEffect(() => {
    if (!selectedChat || !currentUser || !workspaceId) return;

    const chatId = [currentUser.id, selectedChat.id].sort().join("_");
    const qRef = query(msgCol(workspaceId, chatId), orderBy("timestamp", "asc"));

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(list);
      },
      (e) => console.error("Listen messages error:", e)
    );

    return () => unsub();
  }, [selectedChat, currentUser, workspaceId]);

  // Send a message (workspace-scoped)
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !currentUser || !workspaceId) return;

    const chatId = [currentUser.id, selectedChat.id].sort().join("_");
    try {
      await addDoc(msgCol(workspaceId, chatId), {
        text: newMessage,
        senderId: currentUser.id,
        senderName: currentUser.name,
        timestamp: serverTimestamp(),
        read: false,
      });
      setNewMessage("");
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  // Helpers
  const filteredChatList = useMemo(
    () =>
      chatList.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (lastMessages[c.id]?.text || "").toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [chatList, searchQuery, lastMessages]
  );

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
    };
  const formatLastMessageTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (day < 7) return `${day}d ago`;
    return d.toLocaleDateString();
  };
  const getMessageDisplayName = (m) => (m.senderId === currentUser?.id ? "You" : m.senderName || selectedChat?.name || "Unknown");
  const getMessagePhoto = (m) => (m.senderId === currentUser?.id ? currentUser?.photoUrl : selectedChat?.photoUrl);

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    if (window.innerWidth < 768) setShowChatList(false);
  };
  const handleBackToList = () => {
    setShowChatList(true);
    setSelectedChat(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#1a2b5c] text-white">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            {userRole === "admin" && (
              <button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden p-1">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg sm:text-xl font-semibold">{workspaceName}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Bell className="w-4 sm:w-5 h-4 sm:h-5 cursor-pointer" />
            <User className="w-4 sm:w-5 h-4 sm:h-5 cursor-pointer" />
            <HelpCircle className="w-4 sm:w-5 h-4 sm:h-5 cursor-pointer hidden sm:block" />
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 rounded text-black text-sm w-40 lg:w-64"
              />
            </div>
            <button className="bg-[#4267b2] px-3 sm:px-4 py-1.5 rounded text-sm">☰</button>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar for admins */}
        {userRole === "admin" && (
          <>
            <aside
              className={`fixed lg:static inset-y-0 left-0 z-50 w-54 bg-white shadow-md h-screen transform transition-transform duration-300 ${
                showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {workspacePhotoUrl ? (
                      <img src={workspacePhotoUrl} alt={workspaceName} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-yellow-500 rounded" />
                    )}
                    <span className="text-sm font-medium text-black">{siteLocation}</span>
                  </div>
                  <button onClick={() => setShowSidebar(false)} className="lg:hidden p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-3">
                  <Link to="/admin-dashboard" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                  <Link to="/reports" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                    <FileText className="w-4 h-4" />
                    <span>Incident Reports</span>
                  </Link>
                  <a href="#" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                    <MessageSquare className="w-4 h-4" />
                    <span>Chats</span>
                  </a>
                </nav>
              </div>
            </aside>
            {showSidebar && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />}
          </>
        )}

        {/* Chat container */}
        <div className={`flex-1 flex ${userRole === "user" ? "pb-16" : ""}`}>
          {/* Chat list */}
          <div
            className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${
              !showChatList && selectedChat ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-gray-100">
              <h1 className="text-lg font-medium text-gray-900 mb-3">Chats</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find a Message"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading chats...</div>
              ) : filteredChatList.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No conversations found</div>
              ) : (
                filteredChatList.map((chat) => {
                  const lastMsg = lastMessages[chat.id];
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                        selectedChat?.id === chat.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
                          {chat.photoUrl ? (
                            <img src={chat.photoUrl} alt={chat.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{chat.name || chat.email}</h3>
                            <span className="text-xs text-gray-500">
                              {lastMsg ? formatLastMessageTime(lastMsg.timestamp) : ""}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate leading-relaxed">
                            {lastMsg ? <>{lastMsg.senderId === currentUser?.id ? "You: " : ""}{lastMsg.text}</> : "No messages yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Main chat area */}
          <div className={`flex-1 flex flex-col ${showChatList && !selectedChat ? "hidden md:flex" : "flex"}`}>
            {selectedChat ? (
              <>
                <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button onClick={handleBackToList} className="md:hidden p-1">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    {selectedChat.photoUrl ? (
                      <img src={selectedChat.photoUrl} alt={selectedChat.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <h2 className="text-base sm:text-lg font-medium text-gray-900">{selectedChat.name || selectedChat.email}</h2>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-gray-50">
                  <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">Today</span>
                  </div>

                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 mt-10">
                        <p>No messages yet. Start a conversation!</p>
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className="flex items-start space-x-3">
                          {getMessagePhoto(m) ? (
                            <img
                              src={getMessagePhoto(m)}
                              alt={getMessageDisplayName(m)}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{getMessageDisplayName(m)}</span>
                              {m.senderId === currentUser?.id && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">(You)</span>
                              )}
                              <span className="text-xs text-gray-500">{formatTime(m.timestamp)}</span>
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed break-words">
                              {m.text.split("@").map((part, i) => {
                                if (i === 0) return part;
                                const [mention, ...rest] = part.split(" ");
                                return (
                                  <span key={i}>
                                    <span className="text-blue-600 font-medium">@{mention}</span>
                                    {rest.length > 0 && ` ${rest.join(" ")}`}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
                  <form onSubmit={sendMessage} className="space-y-3">
                    <div className="border border-gray-300 rounded-lg">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedChat.name || selectedChat.email}`}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-t-lg focus:outline-none text-sm text-black"
                      />
                      <div className="flex items-center justify-between px-2 sm:px-3 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center space-x-1 overflow-x-auto">
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                            <Bold className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                            <Italic className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded hidden sm:block">
                            <Underline className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded hidden sm:block">
                            <Code className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-300 mx-1 hidden md:block" />
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded hidden md:block">
                            <List className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded hidden md:block">
                            <ListOrdered className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-300 mx-1 hidden md:block" />
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                            <Image className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500 hidden sm:inline">Aa</span>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                            <AtSign className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded hidden sm:block">
                            <Smile className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="submit" className="p-1 sm:p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center text-gray-500">
                  <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium mb-2">Welcome to SafePoint Chat</h3>
                  <p className="text-sm sm:text-base">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav (users) */}
      {userRole === "user" && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="max-w-lg mx-auto flex justify-between px-8 py-3">
            <Link to="/" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
              <HomeIcon className="w-6 h-6" />
              <span className="text-xs">Home</span>
            </Link>
            <Link to="/reports" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
              <FileText className="w-6 h-6" />
              <span className="text-xs">Reports</span>
            </Link>
            <Link to="/chat" className="flex flex-col items-center text-[#192C63]">
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs">Chats</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
              <User className="w-6 h-6" />
              <span className="text-xs">Profile</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
};

export default ChatSystem;
