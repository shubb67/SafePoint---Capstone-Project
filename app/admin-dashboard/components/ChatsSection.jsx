import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
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
  const [workspaceName, setWorkspaceName] = useState('');
  const auth = getAuth();

  // Get current user info and workspace
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          // Get user document directly
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const workspaceId = userData.workspaceId;
            
            setCurrentUser({
              id: user.uid,
              name: `${userData.firstName || ''} ${userData.surname || userData.lastName || ''}`.trim(),
              email: userData.email,
              photoUrl: userData.photoUrl || userData.photoURL || '',
              workspaceId: workspaceId
            });

            // Fetch workspace name if workspaceId exists
            if (workspaceId) {
              const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
              if (workspaceDoc.exists()) {
                setWorkspaceName(workspaceDoc.data().companyName || 'Your Workspace');
              }
            }
          }
        } catch (error) {
          console.error('Error fetching current user:', error);
        }
      }
    };
    
    fetchCurrentUser();
  }, [auth.currentUser]);

  // Fetch chat list (other users in same workspace)
  useEffect(() => {
    const fetchChatList = async () => {
      if (!currentUser?.workspaceId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Query users in the same workspace
        const usersQuery = query(
          collection(db, 'users'), 
          where('workspaceId', '==', currentUser.workspaceId)
        );
        const usersSnap = await getDocs(usersQuery);
        
        const users = usersSnap.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: `${data.firstName || ''} ${data.surname || data.lastName || ''}`.trim(),
              email: data.email,
              photoUrl: data.photoUrl || data.photoURL || '',
              role: data.role || 'member',
              department: data.department || '',
              isOnline: data.isOnline || false
            };
          })
          .filter(user => user.id !== currentUser.id) // Exclude current user
          .sort((a, b) => {
            // Sort by name
            const nameA = a.name || a.email || '';
            const nameB = b.name || b.email || '';
            return nameA.localeCompare(nameB);
          });
          
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
        // Create consistent chat ID
        const chatId = [currentUser.id, chat.id].sort().join('_');
        
        try {
          const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'desc')
          );
          const messagesSnap = await getDocs(messagesQuery);
          
          if (!messagesSnap.empty) {
            const lastMessage = messagesSnap.docs[0].data();
            lastMsgs[chat.id] = {
              text: lastMessage.text,
              timestamp: lastMessage.timestamp,
              senderId: lastMessage.senderId,
              read: lastMessage.read || false
            };
          }
        } catch (error) {
          // Silent fail for missing chat collections
          console.debug(`No messages found for chat ${chatId}`);
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
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Format last message preview
  const formatMessagePreview = (message, senderId) => {
    if (!message) return 'No messages yet';
    
    const isCurrentUser = senderId === currentUser?.id;
    const prefix = isCurrentUser ? 'You: ' : '';
    const maxLength = 50;
    
    const text = message.length > maxLength 
      ? message.substring(0, maxLength) + '...' 
      : message;
    
    return prefix + text;
  };

  // Get user initials for avatar
  const getUserInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return parts[0][0] + parts[parts.length - 1][0];
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="justify-center items-center">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
              {workspaceName && (
                <p className="text-sm text-gray-500 mt-1">{workspaceName} Team</p>
              )}
            </div>
            <span className="text-blue-600 text-sm cursor-pointer hover:text-blue-700 transition-colors">
              View All
            </span>
          </div>
        </div>

        {/* Chat List */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-gray-500">Loading team members...</span>
              </div>
            </div>
          ) : chatList.length === 0 ? (
            <div className="p-6 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No team members found</p>
              {!currentUser?.workspaceId && (
                <p className="text-sm text-gray-400 mt-2">
                  You need to be assigned to a workspace to see team members
                </p>
              )}
            </div>
          ) : (
            chatList.map((chat) => {
              const lastMsg = lastMessages[chat.id];
              const hasUnread = lastMsg && !lastMsg.read && lastMsg.senderId !== currentUser?.id;
              
              return (
                <div 
                  key={chat.id} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors relative"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 relative">
                      {chat.photoUrl ? (
                        <img
                          src={chat.photoUrl}
                          alt={chat.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {getUserInitials(chat.name, chat.email)}
                          </span>
                        </div>
                      )}
                      {chat.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {chat.name || chat.email}
                          </h3>
                          {chat.department && (
                            <span className="text-xs text-gray-500">{chat.department}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasUnread && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                          <span className="text-xs text-gray-500">
                            {lastMsg ? formatLastMessageTime(lastMsg.timestamp) : ''}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm line-clamp-1 ${hasUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {lastMsg ? formatMessagePreview(lastMsg.text, lastMsg.senderId) : 'Start a conversation'}
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