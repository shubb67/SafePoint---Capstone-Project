import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '@/_utils/firebase';

const ChatsSection = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const chatsRef = collection(db, 'chats');
    const unsubscribe = onSnapshot(
      chatsRef,
      async (snapshot) => {
        try {
          const list = await Promise.all(
            snapshot.docs.map(async (docSnapshot) => {
              const chatId = docSnapshot.id;

              // Fetch latest message
              const msgsRef = collection(db, 'chats', chatId, 'messages');
              const latestQ = query(msgsRef, orderBy('timestamp', 'desc'), limit(1));
              const latestSnap = await getDocs(latestQ);
              let latestData = {
                text: 'No messages yet',
                senderName: 'System',
                timestamp: null,
                read: true
              };
              if (!latestSnap.empty) {
                latestData = latestSnap.docs[0].data();
              }

              // Count unread messages
              const unreadQ = query(msgsRef, where('read', '==', false));
              const unreadSnap = await getDocs(unreadQ);

              return {
                id: chatId,
                latestMessage: {
                  text: latestData.text,
                  senderName: latestData.senderName,
                  timestamp: latestData.timestamp,
                  read: latestData.read
                },
                unreadCount: unreadSnap.size
              };
            })
          );

          // Sort chats by most recent message
          list.sort((a, b) => {
            const timeA =
              a.latestMessage.timestamp?.toDate?.() ||
              a.latestMessage.timestamp ||
              new Date(0);
            const timeB =
              b.latestMessage.timestamp?.toDate?.() ||
              b.latestMessage.timestamp ||
              new Date(0);
            return timeB - timeA;
          });

          setChats(list);
        } catch (err) {
          console.error('Error processing chats:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        Loading chats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-black">Chats</h2>
      </div>

      {chats.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No chats available
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-start gap-3 hover:bg-gray-50 p-2 rounded-lg cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                {chat.latestMessage.senderName
                  ? chat.latestMessage.senderName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  : '?'}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  {chat.latestMessage.senderName || 'Unknown'}
                </h4>
                <p className="text-xs text-gray-500">
                  {chat.latestMessage.text}
                </p>
              </div>
              {chat.unreadCount > 0 && (
                <div className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatsSection;

