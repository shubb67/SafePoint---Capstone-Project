"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  HelpCircle, 
  Search, 
  Home, 
  FileText, 
  MessageSquare, 
  Layout,
  User,
  Calendar,
  Map,
  X
} from 'lucide-react';
import { collection, getDocs, where, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import injuryIcon from "../assets/image/injury.png";
import propertyIcon from "../assets/image/property-damage.png";
import nearMissIcon from "../assets/image/danger.png";
import hazardIcon from "../assets/image/safety-hazards.png";
import { calculateSafetyRecord } from '@/_utils/safetyRecordUtils';
import IncidentsByLocation from './components/IncidentByLocation';
import IncidentsOverTime from './components/IncidentOverTime';
import ViewAllIncidents from './components/viewAllIncident';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import ChatsComponent from './components/ChatsSection';
import { useRef } from 'react';


export default function SafePointDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allOrgLocations, setAllOrgLocations] = useState([]); // All unique locations
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [companyName, setCompanyName] = useState("...");
  const [companySiteLocation, setCompanySiteLocation] = useState("...");
  const [companyPhotoUrl, setCompanyPhotoUrl] = useState("");
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [incidentCounts, setIncidentCounts] = useState({
    new: 0,
    underReview: 0,
    closed: 0,
    total: 0
  });
  const [recentStats, setRecentStats] = useState({
    last3Days: 0,
    last7Days: 0,
    last30Days: 0
  });
  const [safetyRecord, setSafetyRecord] = useState({
    currentStreak: 0,
    previousRecord: 0
  });
  const [currentView, setCurrentView] = useState('dashboard'); 
  const navigate = useNavigate();

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
  const handleViewAll = (e) => {
  e.preventDefault(); // Prevent the default anchor behavior
  setCurrentView('viewAll');
};

// Navigate to incident tracker
  const handleIncidentClick = (incidentId) => {
    navigate(`/incident-tracker/${incidentId}`);
  };

  // For safety record calculation
const allIncidentDates = [];

  // Helper function to get the right icon for each incident type
const getIncidentIcon = (type) => {
  switch(type) {
    case 'injury':
      return injuryIcon;
    case 'propertyDamage':
      return propertyIcon;
    case 'nearMiss':
      return nearMissIcon;
    case 'safetyHazard':
      return hazardIcon;
    default:
      return hazardIcon; // Default icon
  }
};

// Helper to format image URL
const imgUrl = img => (img && (img.src || img.default)) || img || "";

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

        // Count incidents by status
        const incidentStatusCounts = {
          new: 0,
          underReview: 0,
          closed: 0,
          total: 0
        };
        
        // Time thresholds for recent incidents
        const now = new Date();
        const threeDaysAgo = new Date(now);
        threeDaysAgo.setDate(now.getDate() - 3);
        
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        // Count recent incidents
        const recentIncidentStats = {
          last3Days: 0,
          last7Days: 0,
          last30Days: 0
        };
        
        // Format incidents for display and count by status
        const formattedIncidents = [];
        incidentsSnap.docs.forEach(doc => {
          const data = doc.data();
          const incidentType = data.incidentType || 'Unknown';
          const status = data.status || 'new';
          const severity = data.impactInfo?.severity || 'medium';
          const createdAt = data.createdAt?.toDate?.() || new Date();
          allIncidentDates.push(createdAt);
          
          // Count incidents by status
          if (status === 'new') incidentStatusCounts.new++;
          else if (status === 'underReview') incidentStatusCounts.underReview++;
          else if (status === 'closed') incidentStatusCounts.closed++;
          incidentStatusCounts.total++;
          
          // Count recent incidents
          if (createdAt >= threeDaysAgo) {
            recentIncidentStats.last3Days++;
          }
          if (createdAt >= sevenDaysAgo) {
            recentIncidentStats.last7Days++;
          }
          if (createdAt >= thirtyDaysAgo) {
            recentIncidentStats.last30Days++;
          }
          
          
          // Count incidents by status
          if (status === 'new') incidentStatusCounts.new++;
          else if (status === 'underReview') incidentStatusCounts.underReview++;
          else if (status === 'closed') incidentStatusCounts.closed++;
          
          // Only take the first 5 for display in the table
          if (formattedIncidents.length < 3) {
            formattedIncidents.push({
              id: doc.id,
              type: incidentType,
              date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              severity: severity,
              status: status,
              location: data.incidentDetails?.location || 'Unknown Location'
            });
          }
        });

        const safetyRecordData = calculateSafetyRecord(allIncidentDates);


        
        setIncidentCounts(incidentStatusCounts);
        setRecentStats(recentIncidentStats);
        setSafetyRecord(safetyRecordData);
        setRecentIncidents(formattedIncidents);

        
        // Extract all unique locations from reports
        const uniqueLocations = new Set();
        incidentsSnap.docs.forEach(doc => {
          const data = doc.data();
          const location = data.incidentDetails?.location;
          if (location && typeof location === 'string') {
            uniqueLocations.add(location);
          }
        });
        
        // Store all unique locations from the organization
        const allLocations = Array.from(uniqueLocations);
        console.log("All organization locations:", allLocations);
        setAllOrgLocations(allLocations);
      } catch (err) {
        console.error("Dashboard data error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  


  return (
    <div className="min-h-screen bg-[#f6f9ff]">
      {/* Header */}
     <header className="bg-[#1a2b5c] text-white">
        <div className="flex items-center justify-between px-4 py-1.5">
          <h1 className="text-xl font-semibold">SafePoint</h1>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationRef}>
              <Bell 
                className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => setShowNotifications(!showNotifications)}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-1 w-96 bg-white rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{unreadCount} unread</span>
                      <X 
                        className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700"
                        onClick={() => setShowNotifications(false)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 px-4 py-2 border-b">
                    <button className="px-3 py-1 text-sm bg-[#1a2b5c] text-white rounded">All</button>
                    <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Unread</button>
                    <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Reports</button>
                  </div>
                  
                  <div className="max-h-[450px] overflow-y-auto">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`px-4 py-3 border-b hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-xl mt-1">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-800">
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {notification.time}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-2"></div>
                              )}
                            </div>
                            <div className="flex gap-2 mt-3">
                              {notification.actions.map((action, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleAction(notification.id, action)}
                                  className={`px-3 py-1 text-xs rounded transition-colors ${getActionButtonClass(action)}`}
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-4 py-3 bg-gray-50 text-center border-t">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            <User className="w-5 h-5 cursor-pointer" />
            <HelpCircle className="w-5 h-5 cursor-pointer" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 rounded text-black text-sm w-64"
              />
            </div>
            <button className="bg-[#4267b2] px-4 py-1.5 rounded text-sm">
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-54 bg-white shadow-md h-screen">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-6">
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
            <nav className="space-y-3">
              <a href="#" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </a>
              <Link to="/reports" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <FileText className="w-4 h-4" />
                <span>Incident Reports</span>
              </Link>
              <Link to="/chat"  className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <MessageSquare className="w-4 h-4" />
                <span>Chats</span>
              </Link>
            </nav>
            
            
          </div>
        </aside>

   {/* Main Content */}
   {currentView === 'dashboard' ? (
        <main className="flex-1 p-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Incident Tracker */}
            <div className="bg-white rounded-md shadow p-2.5">
              <h2 className="text-lg font-semibold mb-0.5 text-black">Incident Tracker</h2>
              <div className="flex gap-2">
                <div className="flex-1 bg-purple-300 rounded-lg p-1.5 text-center">
                  <div className="text-4xl font-bold text-[#374151]">{recentStats.last7Days}</div>
                  <div className="text-sm text-[#374151]">New Incidents</div>
                </div>
                <div className="flex-1 bg-orange-200 rounded-lg p-1.5 text-center">
                  <div className="text-4xl font-bold text-[#374151]">1</div>
                  <div className="text-sm text-[#374151]">Under Review</div>
                </div>
                <div className="flex-1 bg-green-200 rounded-lg p-1.5 text-center">
                  <div className="text-4xl font-bold text-[#374151]">4</div>
                  <div className="text-sm text-[#374151]">Closed Incidents</div>
                </div>
              </div>
            </div>
{/* Safety Record */}
<div className="bg-white rounded-lg shadow p-4">
  <h2 className="text-lg font-semibold mb-2 text-gray-900">Safety Record</h2>
  <div className="flex gap-2">
    <div className="flex-1 bg-indigo-100 rounded-lg p-2">
      <div className="text-center">
        <span className="text-4xl font-semibold text-gray-900">{safetyRecord.currentStreak}</span>
        <span className="text-lg text-gray-600 ml-2">days</span>
      </div>
      <div className="text-sm text-gray-600 text-center mt-2">Without Incident</div>
    </div>
    <div className="flex-1 bg-green-100 rounded-md p-3">
      <div className="text-center">
        <span className="text-4xl font-semibold text-gray-900">{safetyRecord.previousRecord}</span>
        <span className="text-lg text-gray-600 ml-2">days</span>
      </div>
      <div className="text-sm text-gray-600 text-center mt-2">Previous Record</div>
    </div>
  </div>
</div>
             {/* Submitted Incidents */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-[#1e293b]">Submitted Incidents</h2>
                <a href="#"  
  onClick={(e) => {
    e.preventDefault();
    setCurrentView('handleViewAll');
  }} className="text-blue-600 text-sm font-medium">View All</a>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-5">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-4 mb-3">
                    <div className="text-sm text-gray-400 font-normal">Name</div>
                    <div className="text-sm text-gray-400 font-normal">Date</div>
                    <div className="text-sm text-gray-400 font-normal">Severity</div>
                    <div className="text-sm text-gray-400 font-normal">Status</div>
                  </div>
                  
                  {recentIncidents.length > 0 ? (
                      <div className="space-y-2">
                        {recentIncidents.map(incident => (
                          <div 
                            key={incident.id} 
                            className="grid grid-cols-4 border-t pt-2 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleIncidentClick(incident.id)}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                                incident.type === 'injury' ? '' : 
                                incident.type === 'safetyHazard' ? 'bg-blue-100' : 
                                incident.type === 'nearMiss' ? 'bg-yellow-100' : 'bg-orange-100'
                              }`}>
                                <img 
                                  src={imgUrl(getIncidentIcon(incident.type))}
                                  alt={incident.type}
                                  className="w-8 h-8 object-fill border rounded-md"
                                />
                              </div>
                              <span className="text-[#1e293b] font-medium text-sm">
                                {incident.type === 'injury' ? 'Injury' : 
                                 incident.type === 'safetyHazard' ? 'Safety Hazard' : 
                                 incident.type === 'nearMiss' ? 'Near Miss' : 
                                 incident.type === 'propertyDamage' ? 'Property Damage' : 
                                 incident.type.charAt(0).toUpperCase() + incident.type.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </div>
                            <div className="text-gray-400 self-center text-sm">{incident.date}</div>
                            <div className="self-center">
                              <span className={`font-medium text-sm ${
                                incident.severity === 'high' ? 'text-red-500' : 
                                incident.severity === 'medium' ? 'text-amber-500' : 'text-green-500'
                              }`}>
                                {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                              </span>
                            </div>
                           <div className="self-center">
  <span className={`px-6 py-2 rounded-full inline-block text-sm font-medium ${
    incident.status === 'new' ? 'bg-indigo-100 text-indigo-700' : 
    incident.status === 'underReview' ? 'bg-amber-100 text-amber-700' : 
    incident.status === 'closed' ? 'bg-green-100 text-green-700' : 
    incident.status === 'rejected' ? 'bg-red-100 text-red-700' : 
    'bg-gray-100 text-gray-700'
  }`}>
    {incident.status === 'new' ? 'New Incident' : 
     incident.status === 'underReview' ? 'Under Review' : 
     incident.status === 'closed' ? 'Closed' : 
     incident.status === 'rejected' ? 'Rejected' : 
     'Pending'}
  </span>
</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-gray-500">No incidents found</div>
                    )}
                  </div>
              )}
            </div>

            {/* Chats */}
            <ChatsComponent />
           
            {/* Incidents by Location */}
              <IncidentsByLocation/>

            {/* Incidents Over Time */}
            <IncidentsOverTime />  
          </div>
        </main>
         ) : (
        <main className="flex-1">
          <ViewAllIncidents onBack={() => setCurrentView('dashboard')} />
        </main>
      )}
      </div>
    </div>
  );
}