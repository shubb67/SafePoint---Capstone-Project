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
  ChevronRight,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUp
} from 'lucide-react';
import { collection, getDocs, where, query, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import { Link } from 'react-router-dom';
import { useNavigate, useParams } from 'react-router-dom';
import injuryIcon from "../../assets/image/injury.png";
import propertyIcon from "../../assets/image/property-damage.png";
import nearMissIcon from "../../assets/image/danger.png";
import hazardIcon from "../../assets/image/safety-hazards.png";

export default function IncidentDetailView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allOrgLocations, setAllOrgLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [companyName, setCompanyName] = useState("...");
  const [companySiteLocation, setCompanySiteLocation] = useState("...");
  const [companyPhotoUrl, setCompanyPhotoUrl] = useState("");
  const [incidentData, setIncidentData] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { incidentId } = useParams();

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
        return hazardIcon;
    }
  };
  
  // Helper to format image URL
  const imgUrl = img => (img && (img.src || img.default)) || img || "";

  // Helper function to determine if URL is an image
  const isImageUrl = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext)) || url.includes('image');
  };

  // Helper function to determine if URL is a video
  const isVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.includes(ext)) || url.includes('video');
  };

  // State for image modal
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch incident data and evidence
  const fetchIncidentData = async () => {
    try {
      setEvidenceLoading(true);
      
      if (!incidentId) {
        console.error("No incident ID provided");
        return;
      }

      // Fetch the incident document
      const incidentDoc = await getDoc(doc(db, 'reports', incidentId));
      
      if (incidentDoc.exists()) {
        const data = incidentDoc.data();
        setIncidentData(data);
        
        // Extract evidence array from the document
        const evidenceData = data.evidence || [];
        setEvidence(evidenceData);
      } else {
        console.error('Incident not found');
        navigate('/incident-tracker');
      }
    } catch (err) {
      console.error('Error fetching incident data:', err);
    } finally {
      setEvidenceLoading(false);
    }
  };

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
            where("userId", "in", orgUserIds.slice(0, 10)),
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

  // Fetch incident data when component mounts or incidentId changes
  useEffect(() => {
    if (incidentId) {
      fetchIncidentData();
    }
  }, [incidentId]);

  const getIncidentTypeTitle = (type) => {
    switch(type) {
      case 'injury':
        return 'Injury & Loss of Life Report';
      case 'safetyHazard':
        return 'Safety Hazard Report';
      case 'nearMiss':
        return 'Near Miss Report';
      case 'propertyDamage':
        return 'Property Damage Report';
      default:
        return 'Incident Report';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'new':
        return { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle, text: 'Pending Review' };
      case 'underReview':
        return { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle, text: 'Pending Review' };
      case 'closed':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, text: 'Closed' };
      default:
        return { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle, text: 'Pending Review' };
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const statusBadge = getStatusBadge(incidentData?.status);

  return (
    <div className="min-h-screen bg-gray-50">
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
              <Link to="/admin-dashboard" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <Link to="/reports" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <FileText className="w-4 h-4" />
                <span>Incident Reports</span>
              </Link>
              <a href="/chats" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <MessageSquare className="w-4 h-4" />
                <span>Chats</span>
              </a>
              <a href="#" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600">
                <Layout className="w-4 h-4" />
                <span>Templates</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <Home className="w-4 h-4 mr-1" />
            <ChevronRight className="w-4 h-4 mx-1" />
            <span>Reports</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-900">{getIncidentTypeTitle(incidentData?.incidentType)}</span>
          </div>

          {/* Header Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    !
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-1">
                    {incidentData?.incidentType === 'injury' ? 'Injury Report' : 
                     incidentData?.incidentType === 'safetyHazard' ? 'Safety Hazard Report' : 
                     incidentData?.incidentType === 'nearMiss' ? 'Near Miss Report' : 
                     incidentData?.incidentType === 'propertyDamage' ? 'Property Damage Report' : 
                     'Incident Report'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Report ID: #{incidentId || 'INC-2025-001'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Submitted {incidentData?.createdAt?.toDate?.()?.toLocaleDateString() || '2 hours ago'}
                </span>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.color}`}>
                  <statusBadge.icon className="w-4 h-4" />
                  {statusBadge.text}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reporter Name</label>
                      <p className="text-sm text-gray-900">{incidentData?.reporterInfo?.name || 'Sarah Johnson'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Injured Person(s)</label>
                      <p className="text-sm text-gray-900">{incidentData?.reporterInfo?.injuredPersons || 'Michael Rodriguez, Construction Worker'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Lost Injury?</label>
                      <p className="text-sm text-red-600 font-medium">{incidentData?.reporterInfo?.timeLostInjury || 'Yes'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Witness/es</label>
                      <p className="text-sm text-gray-900">{incidentData?.reporterInfo?.witnesses || 'Emma Thompson, David Chen'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incident Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Incident Details</h2>
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <p className="text-sm text-gray-900">{incidentData?.incidentDetails?.date || 'March 15, 2024'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <p className="text-sm text-gray-900">{incidentData?.incidentDetails?.time || '2:30 PM'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incidentData?.impactInfo?.severity || 'medium')}`}>
                        {incidentData?.impactInfo?.severity ? incidentData.impactInfo.severity.charAt(0).toUpperCase() + incidentData.impactInfo.severity.slice(1) : 'Medium'}
                      </span>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-sm text-gray-900">{incidentData?.incidentDetails?.location || 'Construction Site - Building A, Level 3'}</p>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {incidentData?.incidentDetails?.description || 'Worker fell from scaffolding while installing safety barriers. The scaffolding appeared to be improperly secured. Emergency services were called immediately. Worker sustained injuries to leg and back.'}
                    </p>
                  </div>
                  
                  {/* Audio Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audio Description</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Play className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">audiorecording.mov</p>
                        <p className="text-xs text-gray-500">1 min 38 sec</p>
                      </div>
                      <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <Play className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Evidence</h2>
                  {evidenceLoading ? (
                    <div className="w-full h-48 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="text-gray-400">Loading evidence...</div>
                    </div>
                  ) : evidence.length === 0 ? (
                    <div className="w-full h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <div className="text-gray-500">No evidence available</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {evidence.slice(0, 4).map((evidenceItem, index) => {
                        const { type, url } = evidenceItem;
                        
                        if (type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || url?.includes('image')) {
                          return (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-100"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden w-full h-48 bg-gray-100 rounded-lg border border-gray-200 items-center justify-center">
                                <div className="text-gray-500 text-center">
                                  <FileText className="w-8 h-8 mx-auto mb-2" />
                                  <p className="text-sm">Image Not Available</p>
                                </div>
                              </div>
                               </div>
                          );
                        }
                        
                        return (
                          <div key={index} className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <div className="text-gray-500 text-center">
                              <FileText className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-sm">File Evidence</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Show default evidence if no data */}
                  {!evidenceLoading && evidence.length === 0 && (
                    <div className="mt-4">
                      <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <div className="text-gray-500 text-center">
                          <FileText className="w-12 h-12 mx-auto mb-3" />
                          <p className="text-sm font-medium">No Evidence Available</p>
                          <p className="text-xs text-gray-400">Evidence will appear here when uploaded</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Actions</h2>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <CheckCircle className="w-5 h-5" />
                    Close Incident
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    <XCircle className="w-5 h-5" />
                    Reject Report
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    <ArrowUp className="w-5 h-5" />
                    Escalate Incident
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <AlertCircle className="w-5 h-5" />
                    Request Details
                  </button>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Another Admin
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Select Admin</option>
                    <option>Daniel Smith</option>
                    <option>Emily Johnson</option>
                  </select>
                  <button className="mt-3 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    Assign Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}