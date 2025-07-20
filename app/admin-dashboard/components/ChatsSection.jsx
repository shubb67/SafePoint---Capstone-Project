import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '@/_utils/firebase';
import { getAuth } from 'firebase/auth';
import { User } from 'lucide-react';

const ChatSystem = () => {
  const [chatList, setChatList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState({});
  const auth = getAuth();

  // Get current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userQuery = query(collection(db, 'users'), where('__name__', '==', user.uid));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            setCurrentUser({
              id: user.uid,
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
              email: userData.email,
              photoUrl: userData.photoUrl || '',
              company: userData.company
            });
          }
        } catch (error) {
          console.error('Error fetching current user:', error);
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Fetch chat list (other users in same company)
  useEffect(() => {
    const fetchChatList = async () => {
      if (!currentUser?.company) return;
      
      try {
        setIsLoading(true);
        const usersQuery = query(
          collection(db, 'users'), 
          where('company', '==', currentUser.company)
        );
        const usersSnap = await getDocs(usersQuery);
        
        const users = usersSnap.docs
          .map(doc => ({
            id: doc.id,
            name: `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim(),
            email: doc.data().email,
            photoUrl: doc.data().photoUrl || ''
          }))
          .filter(user => user.id !== currentUser.id);
          
        setChatList(users);
      } catch (error) {
        console.error('Error fetching chat list:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchChatList();
    }
  }, [currentUser]);

  // Fetch last messages for each chat
  useEffect(() => {
    if (!currentUser || chatList.length === 0) return;

    const fetchLastMessages = async () => {
      const lastMsgs = {};
      
      for (const chat of chatList) {
        const chatId = [currentUser.id, chat.id].sort().join('_');
        try {
          const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'desc'),
          );
          const messagesSnap = await getDocs(messagesQuery);
          
          if (!messagesSnap.empty) {
            const lastMessage = messagesSnap.docs[0].data();
            lastMsgs[chat.id] = {
              text: lastMessage.text,
              timestamp: lastMessage.timestamp,
              senderId: lastMessage.senderId
            };
          }
        } catch (error) {
          console.error(`Error fetching last message for chat ${chatId}:`, error);
        }
      }
      
      setLastMessages(lastMsgs);
    };

    fetchLastMessages();
  }, [currentUser, chatList]);

  // Format last message time
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 24) return `${hours}hrs ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
   <div className="bg-white rounded-lg shadow">
    <div className="justify-center items-center">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
            <span className="text-blue-600 text-sm cursor-pointer">View All</span>
          </div>
        </div>

        {/* Chat List */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading chats...</div>
          ) : chatList.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No conversations yet</div>
          ) : (
            chatList.map((chat) => {
              const lastMsg = lastMessages[chat.id];
              return (
                <div key={chat.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {chat.photoUrl ? (
                        <img
                          src={chat.photoUrl}
                          alt={chat.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {chat.name || chat.email}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {lastMsg ? formatLastMessageTime(lastMsg.timestamp) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {lastMsg ? lastMsg.text : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSystem;