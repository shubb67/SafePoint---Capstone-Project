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
  Map
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
          if (formattedIncidents.length < 5) {
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
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-semibold">SafePoint</h1>
          <div className="flex items-center gap-4">
            <Bell className="w-5 h-5 cursor-pointer" />
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
              <a href="#" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <Layout className="w-4 h-4" />
                <span>Templates</span>
              </a>
            
            </nav>
            
            
          </div>
        </aside>

   {/* Main Content */}
   {currentView === 'dashboard' ? (
        <main className="flex-1 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incident Tracker */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4 text-black">Incident Tracker</h2>
              <div className="flex gap-3">
                <div className="flex-1 bg-purple-300 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-[#374151]">{recentStats.last7Days}</div>
                  <div className="text-sm text-[#374151]">New Incidents</div>
                </div>
                <div className="flex-1 bg-orange-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-900">1</div>
                  <div className="text-sm text-orange-700">Under Review</div>
                </div>
                <div className="flex-1 bg-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-900">4</div>
                  <div className="text-sm text-green-700">Closed Incidents</div>
                </div>
              </div>
            </div>
{/* Safety Record */}
<div className="bg-white rounded-lg shadow p-5">
  <h2 className="text-lg font-medium mb-3 text-gray-900">Safety Record</h2>
  <div className="flex gap-3">
    <div className="flex-1 bg-indigo-100 rounded-lg p-2">
      <div className="text-center">
        <span className="text-5xl font-semibold text-gray-900">{safetyRecord.currentStreak}</span>
        <span className="text-lg text-gray-600 ml-2">days</span>
      </div>
      <div className="text-sm text-gray-600 text-center mt-2">Without Incident</div>
    </div>
    <div className="flex-1 bg-green-100 rounded-lg p-4">
      <div className="text-center">
        <span className="text-5xl font-semibold text-gray-900">{safetyRecord.previousRecord}</span>
        <span className="text-lg text-gray-600 ml-2">days</span>
      </div>
      <div className="text-sm text-gray-600 text-center mt-2">Previous Record</div>
    </div>
  </div>
</div>
             {/* Submitted Incidents */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#1e293b]">Submitted Incidents</h2>
                <a href="#"  
  onClick={(e) => {
    e.preventDefault();
    setCurrentView('handleViewAll');
  }} className="text-blue-600 text-sm font-medium">View All</a>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-4 mb-4">
                    <div className="text-sm text-gray-400 font-normal">Name</div>
                    <div className="text-sm text-gray-400 font-normal">Date</div>
                    <div className="text-sm text-gray-400 font-normal">Severity</div>
                    <div className="text-sm text-gray-400 font-normal">Status</div>
                  </div>
                  
                  {recentIncidents.length > 0 ? (
                      <div className="space-y-6">
                        {recentIncidents.map(incident => (
                          <div 
                            key={incident.id} 
                            className="grid grid-cols-4 border-t pt-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleIncidentClick(incident.id)}
                          >
                            <div className="flex items-center gap-3">
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
                              <span className="text-[#1e293b] font-medium">
                                {incident.type === 'injury' ? 'Injury' : 
                                 incident.type === 'safetyHazard' ? 'Safety Hazard' : 
                                 incident.type === 'nearMiss' ? 'Near Miss' : 
                                 incident.type === 'propertyDamage' ? 'Property Damage' : 
                                 incident.type.charAt(0).toUpperCase() + incident.type.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </div>
                            <div className="text-gray-400 self-center">{incident.date}</div>
                            <div className="self-center">
                              <span className={`font-medium ${
                                incident.severity === 'high' ? 'text-red-500' : 
                                incident.severity === 'medium' ? 'text-amber-500' : 'text-green-500'
                              }`}>
                                {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                              </span>
                            </div>
                            <div className="self-center">
                              <span className={`px-6 py-2 rounded-full inline-block text-sm font-medium ${
                                incident.status === 'underReview' ? 'bg-amber-100 text-amber-700' : 
                                incident.status === 'new' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {incident.status === 'underReview' ? 'Under Review' : 
                                 incident.status === 'new' ? 'New Incident' : 'Closed'}
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