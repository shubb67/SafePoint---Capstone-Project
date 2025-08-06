import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  serverTimestamp,
  getDocs,
  collectionGroup,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/_utils/firebase';
import { getAuth } from 'firebase/auth';
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
  Home as HomeIcon
} from 'lucide-react';
import { Bell, HelpCircle, Home, FileText, Layout, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';


const ChatSystem = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [userRole, setUserRole] = useState('user'); // Add user role state
  const messagesEndRef = useRef(null);
  const auth = getAuth();
  const [adminName, setAdminName] = useState('');
  const [companyName, setCompanyName] = useState('Company Name');
  const [companySiteLocation, setCompanySiteLocation] = useState('Main Office');
  const [companyPhotoUrl, setCompanyPhotoUrl] = useState('');

  // Fetch organization data including locations
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsLoading(false);
          return;
        }

        // Get current admin's data first
        const adminSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", currentUser.uid)));
        const admin = adminSnap.docs[0]?.data();
        const adminCompany = admin?.company;
        
        setAdminName(admin?.firstName || "Admin");
        setCompanyName(adminCompany || "Company Name");
        setCompanySiteLocation(admin?.siteLocation || "Main Office");
        setCompanyPhotoUrl(admin?.photoUrl || "");
        setUserRole(admin?.role || "user"); // Set user role

        if (!adminCompany) {
          console.warn("Admin company not found, cannot fetch organization data");
          setIsLoading(false);
          return;
        }

        // Get all users from the company
        const orgUsersSnap = await getDocs(query(collection(db, "users"), where("company", "==", adminCompany)));
        const orgUserIds = orgUsersSnap.docs.map(doc => doc.id);

        if (orgUserIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // Fetch incidents from all users in the organization
        const incidentsSnap = await getDocs(
          query(
            collection(db, "reports"),
            where("userId", "in", orgUserIds.slice(0, 10)), // Take first 10 users due to Firestore limitation
            orderBy("createdAt", "desc")
          )
        );
        const incidents = incidentsSnap.docs.map(doc => ({
          id: doc.id, 
          ...doc.data()
        }));
            
      } catch (error) {
        console.error("Error fetching organization data:", error);
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          // Get user details from Firestore
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
            photoUrl: doc.data().photoUrl || '',
            isOnline: Math.random() > 0.5, // Mock online status for now
            lastSeen: new Date(Date.now() - Math.random() * 3600000) // Mock last seen
          }))
          .filter(user => user.id !== currentUser.id); // Exclude current user
          
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
            // limit(1) - if you want to add limit
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

  // Listen to messages for selected chat
  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const chatId = [currentUser.id, selectedChat.id].sort().join('_');
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesList);
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    return () => unsubscribe();
  }, [selectedChat, currentUser]);

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !currentUser) return;

    const chatId = [currentUser.id, selectedChat.id].sort().join('_');
    
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: newMessage,
        senderId: currentUser.id,
        senderName: currentUser.name,
        timestamp: serverTimestamp(),
        read: false
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Filter chat list based on search
  const filteredChatList = chatList.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lastMessages[chat.id]?.text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Format last message time
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Get display name for message
  const getMessageDisplayName = (message) => {
    if (message.senderId === currentUser?.id) {
      return 'You';
    }
    return message.senderName || selectedChat?.name || 'Unknown';
  };

  // Get profile photo for message
  const getMessagePhoto = (message) => {
    if (message.senderId === currentUser?.id) {
      return currentUser.photoUrl;
    }
    return selectedChat?.photoUrl;
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    // On mobile, hide chat list when a chat is selected
    if (window.innerWidth < 768) {
      setShowChatList(false);
    }
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
            {userRole === 'admin' && (
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-1"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg sm:text-xl font-semibold">SafePoint</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Bell className="w-4 sm:w-5 h-4 sm:h-5 cursor-pointer" />
            <User className="w-4 sm:w-5 h-4 sm:h-5 cursor-pointer" />
            <HelpCircle className="w-4 sm:w-5 h-4 sm:h-5 cursor-pointer hidden sm:block" />
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 rounded text-black text-sm w-40 lg:w-64"
              />
            </div>
            <button className="bg-[#4267b2] px-3 sm:px-4 py-1.5 rounded text-sm">
              ☰
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex relative">
        {/* Sidebar - Only for Admin */}
        {userRole === 'admin' && (
          <>
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-54 bg-white shadow-md h-screen transform transition-transform duration-300 ${
              showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {companyPhotoUrl ? (
                      <img 
                        src={companyPhotoUrl} 
                        alt={companyName}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-yellow-500 rounded"></div>
                    )}
                    <span className="text-sm font-medium text-black">{companySiteLocation}</span>
                  </div>
                  <button 
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden p-1"
                  >
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

            {/* Mobile sidebar backdrop */}
            {showSidebar && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={() => setShowSidebar(false)}
              />
            )}
          </>
        )}

        {/* Chat Container */}
        <div className={`flex-1 flex ${userRole === 'user' ? 'pb-16' : ''}`}>
          {/* Left Chat List */}
          <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${
            !showChatList && selectedChat ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <h1 className="text-lg font-medium text-gray-900 mb-3">Chats</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find a Message"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading chats...</div>
              ) : filteredChatList.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No conversations found</div>
              ) : (
                filteredChatList.map(chat => {
                  const lastMsg = lastMessages[chat.id];
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                        selectedChat?.id === chat.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
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
                          {chat.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {chat.name || chat.email}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {lastMsg ? formatLastMessageTime(lastMsg.timestamp) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate leading-relaxed">
                            {lastMsg ? (
                              <>
                                {lastMsg.senderId === currentUser?.id ? 'You: ' : ''}
                                {lastMsg.text}
                              </>
                            ) : (
                              'No messages yet'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`flex-1 flex flex-col ${
            showChatList && !selectedChat ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleBackToList}
                      className="md:hidden p-1"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    {selectedChat.photoUrl ? (
                      <img
                        src={selectedChat.photoUrl}
                        alt={selectedChat.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <h2 className="text-base sm:text-lg font-medium text-gray-900">
                      {selectedChat.name || selectedChat.email}
                    </h2>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-gray-50">
                  {/* Date Divider */}
                  <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">Today</span>
                  </div>

                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 mt-10">
                        <p>No messages yet. Start a conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="flex items-start space-x-3">
                          {getMessagePhoto(message) ? (
                            <img
                              src={getMessagePhoto(message)}
                              alt={getMessageDisplayName(message)}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">
                                {getMessageDisplayName(message)}
                              </span>
                              {message.senderId === currentUser?.id && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">(You)</span>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed break-words">
                              {message.text.split('@').map((part, index) => {
                                if (index === 0) return part;
                                const [mention, ...rest] = part.split(' ');
                                return (
                                  <span key={index}>
                                    <span className="text-blue-600 font-medium">@{mention}</span>
                                    {rest.length > 0 && ` ${rest.join(' ')}`}
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

                {/* Message Input */}
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
                      
                      {/* Formatting Toolbar */}
                      <div className="flex items-center justify-between px-2 sm:px-3 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center space-x-1 overflow-x-auto">
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0">
                            <Bold className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0">
                            <Italic className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 hidden sm:block">
                            <Underline className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 hidden sm:block">
                            <Code className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 hidden md:block">
                            <Link className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-300 mx-1 hidden sm:block"></div>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 hidden md:block">
                            <List className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 hidden md:block">
                            <ListOrdered className="w-3 sm:w-4 h-3 sm:h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-300 mx-1 hidden md:block"></div>
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0">
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
                          <button type="button" className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                            <Paperclip className="w-3 sm:w-4 h-3 sm:h-4" />
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
      
      {/* Bottom Navigation for User Role */}
      {userRole === 'user' && (
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