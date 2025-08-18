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
import { NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { PlusCircle, ClipboardCheck, ShieldCheck, Award } from "lucide-react";



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

  const auth = getAuth();


  const handleLogout = () => {
    signOut(auth);
    navigate('/login');
  };


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
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
  <div className="max-w-7xl  px-2 sm:px-3 md:px-4">
    <div className="h-12 flex items-center gap-3">

      {/* Brand */}
      <Link to="/admin-dashboard" className="flex items-center gap-2 group">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full
                     bg-gradient-to-br from-blue-600 to-blue-400 text-white text-[11px] font-black shadow-sm"
          aria-hidden
        >
          SP
        </span>
        <span className="text-sm sm:text-base font-semibold text-blue-600 group-hover:text-blue-700">
          SafePoint
        </span>
      </Link>

      {/* Search (desktop) */}
      <div className="hidden md:flex ml-auto mr-2 relative w-60 lg:w-72 xl:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300/70
                     text-sm text-gray-800 placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                     bg-white"
        />
      </div>

      {/* Icons */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md
                       text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                           bg-red-500 text-white text-[10px] leading-4 text-center font-semibold"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Panel */}
          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-[20rem] sm:w-[22rem] md:w-[24rem] bg-white rounded-xl shadow-2xl
                         ring-1 ring-black/5 overflow-hidden z-50"
            >
              <div className="bg-gray-50/60 backdrop-blur px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                <span className="text-xs text-gray-500">{unreadCount} unread</span>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition
                                  ${!n.isRead ? "bg-blue-50/40" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 text-xl mt-0.5">{getNotificationIcon(n.type)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                            {!n.isRead && (
                              <span className="ml-auto mt-1 h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.description}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-gray-400">{n.time}</span>
                            <div className="flex gap-2">
                              {n.actions.map((action, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleAction(n.id, action)}
                                  className={`px-2.5 py-1 text-xs rounded-md ${getActionButtonClass(action)}`}
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-3 bg-gray-50 text-center border-t">
                <Link
                  to="/notifications"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Help & User */}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md
                     text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
          aria-label="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <Link to="/admin-profile" >
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-full
                     bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          aria-label="Account"
        >
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

<aside className="w-60 h-screen bg-white border-r">
  <div className="h-full flex flex-col">
    {/* Org header */}
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center gap-3">
        {companyPhotoUrl ? (
          <img
            src={companyPhotoUrl}
            alt={companyName || "Organization"}
            className="w-9 h-9 rounded object-cover ring-1 ring-gray-200"
          />
        ) : (
          <div className="w-9 h-9 rounded bg-gray-200 ring-1 ring-gray-200" />
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 truncate">
            {companyName || "Smith Industries"}
          </p>
          <p className="text-[12px] text-gray-500 truncate">
            {companySiteLocation || "Calgary"}
          </p>
        </div>
      </div>
    </div>

    {/* Nav */}
    <nav className="px-2 py-2 space-y-1">
      <NavLink
        to="/admin-dashboard"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
           ${isActive
             ? "bg-blue-50 text-blue-700"
             : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"}`
        }
      >
        <Home className="w-4 h-4" />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/reports"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
           ${isActive
             ? "bg-blue-50 text-blue-700"
             : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"}`
        }
      >
        <FileText className="w-4 h-4" />
        <span>Incident Reports</span>
      </NavLink>

      <NavLink
        to="/chat"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
           ${isActive
             ? "bg-blue-50 text-blue-700"
             : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"}`
        }
      >
        <MessageSquare className="w-4 h-4" />
        <span>Chats</span>
      </NavLink>
    </nav>

    {/* Footer */}
    <div className="mt-110 px-2 pb-3">
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-[13px]
                   text-gray-600 hover:bg-gray-50 hover:text-red-600 transition"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        <span>Log Out</span>
      </button>

      {/* Current user chip */}
      <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-2 py-2">
        <img
          src={companyPhotoUrl || "/assets/avatar.png"}
          alt=""
          className="w-5 h-5 rounded-full object-cover"
        />
        <span className="text-[12px] font-medium text-blue-900 truncate">
          {adminName || "Megan Portello"}
        </span>
      </div>
    </div>
  </div>
</aside>


   {/* Main Content */}
   {currentView === 'dashboard' ? (
        <main className="flex-1 p-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Incident Tracker */}
<div className="bg-transparent">
  <h2 className="text-sm font-semibold mb-1 text-gray-800">Incident Tracker</h2>
  <div className="flex gap-2.5">
    {/* New Incidents */}
    <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-700">New Incidents</span>
        <span className="h-6 w-6 rounded-md bg-[#D0D1FB] flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
  <path d="M14.1022 6.36975C14.8462 6.73226 15.6889 6.83954 16.5 6.675V15C16.5 15.1989 16.421 15.3897 16.2803 15.5303C16.1397 15.671 15.9489 15.75 15.75 15.75H2.25C2.05109 15.75 1.86032 15.671 1.71967 15.5303C1.57902 15.3897 1.5 15.1989 1.5 15V3C1.5 2.80109 1.57902 2.61032 1.71967 2.46967C1.86032 2.32902 2.05109 2.25 2.25 2.25H12.075C12.025 2.493 12 2.743 12 3C11.9988 3.89104 12.3161 4.75317 12.8948 5.43075L9.04575 8.76225L4.23525 4.6785L3.26475 5.8215L9.05475 10.7378L14.1022 6.36975ZM15.75 5.25C15.4545 5.25 15.1619 5.1918 14.889 5.07873C14.616 4.96566 14.3679 4.79992 14.159 4.59099C13.9501 4.38206 13.7843 4.13402 13.6713 3.86104C13.5582 3.58806 13.5 3.29547 13.5 3C13.5 2.70453 13.5582 2.41194 13.6713 2.13896C13.7843 1.86598 13.9501 1.61794 14.159 1.40901C14.3679 1.20008 14.616 1.03434 14.889 0.921271C15.1619 0.808198 15.4545 0.75 15.75 0.75C16.3467 0.75 16.919 0.987053 17.341 1.40901C17.7629 1.83097 18 2.40326 18 3C18 3.59674 17.7629 4.16903 17.341 4.59099C16.919 5.01295 16.3467 5.25 15.75 5.25Z" fill="#6465F1"/>
</svg>
        </span>
      </div>
      <div className="mt-1.5 text-3xl font-semibold leading-none text-black">
        {recentStats.last7Days}
      </div>
    </div>

    {/* Under Review */}
    <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-700">Under Review</span>
        <span className="h-6 w-6 rounded-md bg-[#FCE2B6] flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
  <path d="M16.5 1.5H1.5V16.5L4.5 13.5H16.5V1.5ZM4.5 10.5V8.6475L9.66 3.4875C9.81 3.3375 10.0425 3.3375 10.1925 3.4875L11.52 4.815C11.67 4.965 11.67 5.1975 11.52 5.3475L6.3525 10.5H4.5ZM13.5 10.5H7.875L9.375 9H13.5V10.5Z" fill="#F69D0D"/>
</svg>
        </span>
      </div>
      <div className="mt-1.5 text-3xl font-semibold leading-none text-black">
        1
      </div>
    </div>
  </div>
</div>

{/* Safety Record */}
<div className="bg-transparent">
  <h2 className="text-sm font-semibold mb-1 text-gray-800">Safety Record</h2>
  <div className="flex gap-2.5">
    {/* Days Without Incident */}
    <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-700">Days Without Incident</span>
        <span className="h-6 w-6 rounded-md bg-[#BDEECF] flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
  <g clipPath="url(#clip0_3017_60478)">
    <path d="M12 12.75L12.1575 12.9075C12.4342 13.1842 12.5722 13.3223 12.7395 13.3125C12.9067 13.3035 13.029 13.1513 13.2735 12.8453L14.25 11.625M12.1282 5.9325V7.125M12.1282 5.9325C12.1282 5.367 12.6037 4.90875 13.1895 4.90875C13.7745 4.90875 14.25 5.367 14.25 5.93175V7.125M12.1282 5.9325V3.88575C12.1282 3.321 11.6535 2.86275 11.0677 2.86275C10.482 2.86275 10.0065 3.32025 10.0065 3.88575M10.0065 3.88575V7.125M10.0065 3.88575V2.523C10.0065 1.9575 9.53246 1.5 8.94596 1.5C8.35946 1.5 7.88546 1.9575 7.88546 2.523V4.5675M7.88546 4.5675C7.88546 4.00275 7.40996 3.5445 6.82421 3.5445C6.23921 3.5445 5.76371 4.002 5.76371 4.5675V9.47775C5.76371 9.78975 5.36396 9.9375 5.14646 9.7065L3.42896 7.87725C3.28296 7.70803 3.08725 7.58923 2.86975 7.53779C2.65225 7.48634 2.42406 7.50488 2.21771 7.59075C1.46171 7.9035 1.28396 9.00675 1.77521 9.64275C2.61671 10.7318 3.47771 12.2175 4.17371 13.5278C5.11871 15.3075 6.98246 16.5 9.05396 16.5M7.88546 4.5675V7.125M9.74996 11.5905V11.88C9.74996 12.7815 9.74996 13.2323 9.86096 13.6448C9.99965 14.1564 10.2606 14.6266 10.6215 15.015C10.914 15.3315 11.301 15.5775 12.0742 16.0703C12.42 16.2908 12.5932 16.401 12.7777 16.4528C13.005 16.5158 13.2457 16.5158 13.473 16.4528C13.6567 16.401 13.83 16.2908 14.1757 16.0703C14.949 15.5775 15.336 15.3315 15.6285 15.015C15.9893 14.6266 16.2503 14.1564 16.389 13.6448C16.5 13.2323 16.5 12.7823 16.5 11.88V11.5905C16.5 11.0295 16.5 10.749 16.3935 10.512C16.3266 10.3657 16.2327 10.2334 16.1167 10.122C15.927 9.942 15.6577 9.843 15.1192 9.64575L14.0137 9.24075C13.5742 9.08025 13.3545 9 13.125 9C12.8955 9 12.6757 9.08025 12.2362 9.2415L11.1307 9.6465C10.5922 9.843 10.323 9.94125 10.1332 10.122C10.0169 10.2333 9.92276 10.3656 9.85571 10.512C9.74996 10.749 9.74996 11.0295 9.74996 11.5905Z" stroke="#22C560" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </g>
  <defs>
    <clipPath id="clip0_3017_60478">
      <rect width="18" height="18" fill="white"/>
    </clipPath>
  </defs>
</svg>
        </span>
      </div>
      <div className="mt-1.5 text-3xl font-semibold leading-none text-black">
        {safetyRecord.currentStreak}
      </div>
    </div>

    {/* Previous Record */}
    <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-700">Previous Record</span>
        <span className="h-6 w-6 rounded-md bg-[#3B82F6] flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="18" viewBox="0 0 14 18" fill="none">
  <g clipPath="url(#clip0_3017_60486)">
    <path d="M3.54091 12.749C3.22408 12.4435 3.38924 12.5296 2.62507 12.3324C2.27835 12.2427 1.97356 12.0705 1.69794 11.8641L0.043822 15.7749C-0.11623 16.1535 0.182728 16.5649 0.606374 16.5494L2.52736 16.4787L3.84861 17.8245C4.14028 18.1212 4.65216 18.0288 4.81221 17.6501L6.70986 13.1635C6.31466 13.3758 5.87606 13.5003 5.42252 13.5003C4.71158 13.5003 4.04367 13.2334 3.54091 12.749ZM13.9563 15.7749L12.3022 11.8641C12.0266 12.0708 11.7218 12.2427 11.3751 12.3324C10.6069 12.5307 10.7753 12.4442 10.4592 12.749C9.95648 13.2334 9.2882 13.5003 8.57726 13.5003C8.12372 13.5003 7.68512 13.3755 7.28992 13.1635L9.18757 17.6501C9.34762 18.0288 9.85986 18.1212 10.1512 17.8245L11.4728 16.4787L13.3938 16.5494C13.8174 16.5649 14.1164 16.1532 13.9563 15.7749ZM9.58861 11.9534C10.1457 11.4067 10.2095 11.4538 11.0028 11.2454C11.5092 11.1121 11.9052 10.7236 12.0408 10.2265C12.3135 9.2281 12.2428 9.34868 12.9869 8.61814C13.3577 8.25427 13.5024 7.72376 13.3668 7.22665C13.0944 6.22892 13.0941 6.36813 13.3668 5.36935C13.5024 4.87224 13.3577 4.34173 12.9869 3.97786C12.2428 3.24731 12.3135 3.36755 12.0408 2.36946C11.9052 1.87235 11.5092 1.48388 11.0028 1.35064C9.98638 1.0831 10.1089 1.15306 9.36403 0.422158C8.99325 0.0582913 8.45257 -0.0840915 7.94617 0.0491507C6.93007 0.316338 7.0719 0.31669 6.05398 0.0491507C5.54757 -0.0840915 5.0069 0.0579397 4.63611 0.422158C3.892 1.15271 4.0145 1.0831 2.99768 1.35064C2.49127 1.48388 2.09533 1.87235 1.95971 2.36946C1.68736 3.36755 1.75773 3.24731 1.01361 3.97786C0.642832 4.34173 0.497728 4.87224 0.633718 5.36935C0.906062 6.36638 0.906426 6.22716 0.633718 7.2263C0.498093 7.72341 0.642832 8.25392 1.01361 8.61814C1.75773 9.34868 1.687 9.2281 1.95971 10.2265C2.09533 10.7236 2.49127 11.1121 2.99768 11.2454C3.81361 11.4598 3.8745 11.4261 4.41153 11.9534C4.89387 12.427 5.64528 12.5117 6.22497 12.158C6.45678 12.0161 6.72568 11.9408 7.00025 11.9408C7.27483 11.9408 7.54373 12.0161 7.77554 12.158C8.35486 12.5117 9.10627 12.427 9.58861 11.9534ZM3.56059 6.18638C3.56059 4.32204 5.10059 2.81067 7.00007 2.81067C8.89955 2.81067 10.4396 4.32204 10.4396 6.18638C10.4396 8.05071 8.89955 9.56208 7.00007 9.56208C5.10059 9.56208 3.56059 8.05071 3.56059 6.18638Z" fill="white"/>
  </g>
  <defs>
    <clipPath id="clip0_3017_60486">
      <rect width="14" height="18" fill="white"/>
    </clipPath>
  </defs>
</svg>
        </span>
      </div>
      <div className="mt-1.5 text-3xl font-semibold leading-none text-black">
        {safetyRecord.previousRecord}
      </div>
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