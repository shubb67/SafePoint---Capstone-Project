import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Home,
  FileText,
  MessageSquare,
  User
} from "lucide-react";
import Image from 'next/image';
import NewIncidentIcon from "../assets/image/icon456.png";
import { collection, getDocs, where, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import injuryIcon   from "../assets/image/injury.png";
import propertyIcon from "../assets/image/property-damage.png";
import nearMissIcon from "../assets/image/danger.png";
import hazardIcon   from "../assets/image/safety-hazards.png";
import { calculateSafetyRecord } from '@/_utils/safetyRecordUtils';
import RecentIncidents from "./components/RecentIncidents";


export default function UserDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const userUid = auth.currentUser?.uid;
  const [showIncidents, setShowIncidents] = useState(false);
  const [userName, setUserName] = useState("User");
  const [projectName, setProjectName] = useState("...");
  const [projectSite, setProjectSite] = useState("...");
  const [incidentFreeDays, setIncidentFreeDays] = useState(0);
  const [prevRecordDays, setPrevRecordDays] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allOrgLocations, setAllOrgLocations] = useState([]);
  const [safetyRecord, setSafetyRecord] = useState({
    currentStreak: 0,
    previousRecord: 0
  });
  const [userCompany, setUserCompany] = useState("");


  const imgUrl = img => (img && (img.src || img.default)) || img || "";

  const incidentTypeIcons = {
    injury: injuryIcon,
    safetyHazard: hazardIcon,
    propertyDamage: propertyIcon,
    nearMiss: nearMissIcon,
  };
  
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsLoading(false);
          return;
        }

        // Get current user's data first
        const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", currentUser.uid)));
        const user = userSnap.docs[0]?.data();
        const userCompany = user?.company;
        setUserCompany(userCompany);
        console.log("User Company:", userCompany);
        
        setUserName(user?.firstName || "User");
        setProjectName(userCompany || "Unknown Project");
        setProjectSite(user?.siteLocation || "Unknown Site");

        if (!userCompany) {
          console.warn("User company not found, cannot fetch organization incidents");
          setIsLoading(false);
          return;
        }

        // Get all users from the same company/organization
        const orgUsersSnap = await getDocs(query(collection(db, "users"), where("company", "==", userCompany)));
        const orgUserIds = orgUsersSnap.docs.map(doc => doc.id);

        if (orgUserIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // Fetch incidents from all users in the organization
        const incidentsSnap = await getDocs(
          query(
            collection(db, "reports"),
            where("userId", "in", orgUserIds.slice(0, 10)),
            orderBy("createdAt", "desc")
          )
        );

        // Extract all unique locations from reports
        const uniqueLocations = new Set();
        const allIncidentDates = [];
        
        incidentsSnap.docs.forEach(doc => {
          const data = doc.data();
          const location = data.incidentDetails?.location;
          if (location && typeof location === 'string') {
            uniqueLocations.add(location);
          }
          // Collect incident dates for safety record calculation
          const incidentDate = data.createdAt?.toDate?.() || new Date();
          allIncidentDates.push(incidentDate);
        });
        
        // Store all unique locations from the organization
        const allLocations = Array.from(uniqueLocations);
        console.log("All organization locations:", allLocations);
        setAllOrgLocations(allLocations);

        // Calculate safety record with all incident dates
        const safetyRecordData = calculateSafetyRecord(allIncidentDates);
        setSafetyRecord(safetyRecordData);

        // Create a map of user IDs to user names for display
        const userMap = {};
        orgUsersSnap.docs.forEach(doc => {
          const userData = doc.data();
          userMap[doc.id] = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User';
        });

        const timeSince = (createdAt) => {
          if (!createdAt) return "";
          const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          const seconds = Math.floor((new Date() - date) / 1000);
          const hours = Math.floor(seconds / 3600);
          const days = Math.floor(seconds / 86400);
          return days > 0
            ? `${days} day${days > 1 ? "s" : ""} ago`
            : `${hours} hr${hours > 1 ? "s" : ""} ago`;
        };

        // Only use the first 5 incidents for display
        const formattedIncidents = incidentsSnap.docs.slice(0, 5).map(doc => {
          const data = doc.data();
          const incidentType = data.incidentType;
          const location = data.incidentDetails?.location || "N/A";
          const reportedBy = userMap[data.userId] || "Unknown User";
          const isCurrentUser = data.userId === currentUser.uid;
          
          console.log("Incident Type:", incidentType);
          return {
            id: doc.id,
            type: incidentType,
            location: location,
            ago: timeSince(data.createdAt?.toDate?.()),
            reportedBy: reportedBy,
            isCurrentUser: isCurrentUser
          };
        });

        setRecentIncidents(formattedIncidents);
      } catch (err) {
        console.error("Dashboard data error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cards = [
    {
      title: "New Incident Report",
      icon: (
        <Image
          src={NewIncidentIcon}
          alt="New Incident"
          width={118}
          height={118}
          className="object-contain"
        />
      ),
      onClick: () => navigate("/incident-type"),
    },
    {
      title: "View Your Reports",
      icon: <FileText className="w-28 h-28 text-gray-800" />,
      onClick: () => navigate("/my-reports"),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{formattedDate}</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">
              Good morning, {userName}!
            </h2>
          </div>
          <button className="p-2 rounded-full bg-white shadow">
            <Bell className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>
{!showIncidents ? (
  <>
      <div className="mt-4 px-2">
        <div className="bg-white rounded-xl shadow-sm p-3">
          <div className="flex justify-between mb-4">
            <div className="text-left">
              <p className="text-sm text-gray-500">{projectName}</p>
              <p className="text-md text-black font-bold">{projectSite}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-black">Safety Record</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-purple-300 text-[#374151] rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{safetyRecord.currentStreak}</p>
              <p className="text-xs">Incident-Free</p>
            </div>
            <div className="flex-1 bg-green-200 text-black rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{safetyRecord.previousRecord}</p>
              <p className="text-xs">Previous Record</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 px-4 grid grid-cols-2 gap-4">
        {cards.map(({ title, icon, onClick }) => (
          <button
            key={title}
            onClick={onClick}
            className="flex flex-col justify-center text-gray-800 items-left gap-[14px] p-4 pb-8 rounded-[8px] bg-white shadow-md transition hover:shadow-lg w-full h-full"
          >
            {icon}
            <span className="text-lg font-medium text-black text-left">
              {title}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-gray-100 rounded-xl shadow-sm p-3 mt-6 mx-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-800">Recent Incidents</h3>
          <button
    onClick={() => setShowIncidents(true)}
    className="text-sm font-medium text-blue-600 hover:underline"
  >
    View all
  </button>
   </div>
        <div className="space-y-3">
          {recentIncidents.map(({ id, type, location, ago, reportedBy, isCurrentUser }) => (
            <div
      onClick={() => navigate(`/incident-report/${id}`)}
      key={id}
      className=" bg-white rounded-xl shadow p-4 flex items-center justify-between transition hover:bg-gray-50"
    >
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100">
                  <img
                    src={imgUrl(incidentTypeIcons[type])}
                    alt={type}
                    className="w-10 h-10 object-fill border rounded-lg"
                  />
                </div>
                <div>
                  <p className="font-bold text-black">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
                  <p className="text-xs text-gray-500">{location}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">{ago}</p>
            </div>
          ))}
        </div>
        {isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Loading incidents...</p>
          </div>
        )}
        {!isLoading && recentIncidents.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No recent incidents in your organization</p>
          </div>
        )}
      </div>

      </>
) : (
  // SHOW ONLY THE RECENT INCIDENTS FULL VIEW (like your screenshot)
  <div className="flex flex-col items-center justify-center min-h-[50vh]">
    <div className="w-full max-w-md">
      <RecentIncidents userCompany={userCompany} />
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowIncidents(false)}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  </div>
)}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-4">
        <div className="max-w-lg mx-auto flex justify-between px-8 py-3">
          <Link to="/user-dashboard" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/reports" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <FileText className="w-6 h-6" />
            <span className="text-xs">Reports</span>
          </Link>
          <Link to="/chat" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}