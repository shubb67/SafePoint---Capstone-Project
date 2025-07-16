import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { User, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const AdminChatsSection = ({ companyName }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyName) return;

    const q = query(
      collection(db, "companies", companyName, "chats"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyName]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#1a2b5c]" /> Active Chats
        </h2>
        <Link
          to="/admin-chats"
          className="text-sm text-blue-600 hover:underline"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading chats...</p>
      ) : chats.length === 0 ? (
        <p className="text-gray-500 text-sm">No active chats found.</p>
      ) : (
        <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
          {chats.map((chat) => (
            <li key={chat.id} className="py-3 flex items-start gap-3">
              <div className="flex-shrink-0">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {chat.participants.join(", ")}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {chat.lastMessage?.text || "No messages yet"}
                </p>
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap">
                {chat.lastMessage?.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminChatsSection;
