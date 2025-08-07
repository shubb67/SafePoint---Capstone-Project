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
  ArrowUp,
  AlertTriangle,
  Clock,
  FileQuestion,
  ChevronDown,
} from 'lucide-react';
import { collection, getDocs, where, query, orderBy, limit, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import { Link } from 'react-router-dom';
import { useNavigate, useParams } from 'react-router-dom';
import injuryIcon from "../../assets/image/injury.png";
import propertyIcon from "../../assets/image/property-damage.png";
import nearMissIcon from "../../assets/image/danger.png";
import hazardIcon from "../../assets/image/safety-hazards.png";
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import NotifyAllEmployees from './NotifyEmployees';
import { Listbox } from '@headlessui/react'






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
  const [reporterName, setReporterName] = useState(null);
  const [injuredNames, setInjuredNames] = useState(null);
  const [witnessNames, setWitnessNames] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [closeMessage, setCloseMessage] = useState({ type: '', text: '' });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const [notifyMessage, setNotifyMessage] = useState('');
  const [requestUserOptions, setRequestUserOptions] = useState([]);




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

  const handleSendNotification = () => {
    console.log('Sending notification to all employees:', notifyMessage);
    // Add your notification logic here
  };
  const handleSendRequest = () => {
    // Handle send request logic here
    console.log('Sending request to:', selectedUser);
    console.log('Message:', message);
    // Reset form after sending
    setSelectedUser('');
    setMessage('');
    setShowRequestDetails(false);
  };

function asUidArray(val) {
  if (!val) return [];
  // If already an array, flatten to UIDs
  if (Array.isArray(val)) {
    return val
      .map(item => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          if (item.uid) return item.uid;
          if (item.id) return item.id;
          // If it's a Firestore DocumentReference
          if (item.path) return item.id || item.path.split('/').pop();
        }
        return null;
      })
      .filter(Boolean);
  }
  // If string and looks like comma separated
  if (typeof val === "string" && val.includes(',')) return val.split(',').map(s => s.trim()).filter(Boolean);
  // If object (single), try extract UID
  if (typeof val === "object") {
    if (val.uid) return [val.uid];
    if (val.id) return [val.id];
    if (val.path) return [val.id || val.path.split('/').pop()];
    return [];
  }
  // Otherwise, treat as string UID
  return [val];
}


  // Handle Under Review status
  const handleUnderReview = async () => {
    setIsUpdatingStatus(true);
    setCloseMessage({ type: '', text: '' });

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!incidentId) {
        throw new Error('No incident ID provided');
      }

      // Update incident status to under review
      const incidentRef = doc(db, 'reports', incidentId);
      await updateDoc(incidentRef, {
        status: 'underReview',
        reviewStartedAt: serverTimestamp(),
        reviewedBy: currentUser.uid,
        lastUpdated: serverTimestamp(),
        reviewInfo: {
          reviewerName: currentUser.displayName || adminName || 'Admin',
          reviewerEmail: currentUser.email,
          reviewStartDate: new Date().toISOString()
        }
      });

      setCloseMessage({ 
        type: 'success', 
        text: 'Incident status updated to Under Review.' 
      });

      // Update local state
      setIncidentData(prev => ({ ...prev, status: 'underReview' }));

    } catch (error) {
      console.error('Error updating incident status:', error);
      setCloseMessage({ 
        type: 'error', 
        text: `Error: ${error.message}` 
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Reject Report
  const handleRejectReport = async () => {
    const rejectionReason = window.prompt('Please provide a reason for rejecting this report:');
    
    if (!rejectionReason || rejectionReason.trim() === '') {
      alert('Rejection reason is required.');
      return;
    }

    if (!window.confirm('Are you sure you want to reject this report? This action cannot be undone.')) {
      return;
    }

    setIsRejecting(true);
    setCloseMessage({ type: '', text: '' });

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!incidentId) {
        throw new Error('No incident ID provided');
      }

      // Update incident status to rejected
      const incidentRef = doc(db, 'reports', incidentId);
      await updateDoc(incidentRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser.uid,
        lastUpdated: serverTimestamp(),
        rejectionInfo: {
          rejectedByName: currentUser.displayName || adminName || 'Admin',
          rejectedByEmail: currentUser.email,
          rejectionReason: rejectionReason,
          rejectedDate: new Date().toISOString()
        }
      });

      setCloseMessage({ 
        type: 'success', 
        text: 'Report has been rejected.' 
      });

      // Update local state
      setIncidentData(prev => ({ ...prev, status: 'rejected' }));

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/reports');
      }, 2000);

    } catch (error) {
      console.error('Error rejecting report:', error);
      setCloseMessage({ 
        type: 'error', 
        text: `Error: ${error.message}` 
      });
    } finally {
      setIsRejecting(false);
    }
  };

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

 useEffect(() => {
    async function fetchNames() {
      // 1) Reporter
      const reporterIds = asUidArray(incidentData?.personalInfo?.yourName);
      if (reporterIds.length > 0) {
        try {
          const snap = await getDoc(doc(db, 'users', reporterIds[0]));
          setReporterName(snap.exists() ? snap.data().firstName : 'Unknown Reporter');
        } catch {
          setReporterName('Unknown Reporter');
        }
      } else {
        setReporterName(null);
      }

   
 // 2) Injured Persons
      const injuredIds = asUidArray(incidentData?.personalInfo?.injuredPersons);
      if (injuredIds.length > 0) {
        try {
          const injuredSnaps = await Promise.all(
            injuredIds.map(uid => getDoc(doc(db, 'users', uid)))
          );
          const names = injuredSnaps
            .map(snap => (snap.exists() ? snap.data().firstName : null))
            .filter(Boolean);
          setInjuredNames(names.join(', ') || 'Unknown Reporter');
        } catch {
          setInjuredNames('Unknown Reporter');
        }
      } else {
        setInjuredNames(null);
      }

    // 3) Witnesses
      const witnessIds = asUidArray(incidentData?.personalInfo?.witnesses);
      if (witnessIds.length > 0) {
        try {
          const witnessSnaps = await Promise.all(
            witnessIds.map(uid => getDoc(doc(db, 'users', uid)))
          );
          const names = witnessSnaps
            .map(snap => (snap.exists() ? snap.data().firstName : null))
            .filter(Boolean);
          setWitnessNames(names.join(', ') || 'Unknown Reporter');
        } catch {
          setWitnessNames('Unknown Reporter');
        }
      } else {
        setWitnessNames(null);
      }
    }
       if (incidentData) {
      fetchNames();
       }
 }, [incidentData]);

  useEffect(() => {
  async function fetchRequestUsers() {
    if (!companyName || companyName === "..." || !incidentData) return;

    // Step 1: Build involved user IDs list
const involvedUserIds = [
  ...asUidArray(incidentData?.personalInfo?.yourName),
  ...asUidArray(incidentData?.personalInfo?.injuredPersons),
  ...asUidArray(incidentData?.personalInfo?.witnesses)
].filter(Boolean);

    const uniqueInvolvedUserIds = [...new Set(involvedUserIds)].filter(Boolean);
    if (!uniqueInvolvedUserIds.length) {
      setRequestUserOptions([]);
      return;
    }

    // Step 2: Fetch those users in company
    // We fetch by UID (Firestore doc ID), then filter by company
    const userPromises = uniqueInvolvedUserIds.map(uid =>
      getDoc(doc(db, "users", uid))
    );
    const userSnaps = await Promise.all(userPromises);
    const users = userSnaps
      .filter(snap => snap.exists() && snap.data().company === companyName)
      .map(snap => {
        const d = snap.data();
        return {
          uid: snap.id,
          firstName: d.firstName || '',
          lastName: d.surname || '',
          photoUrl: d.photoUrl || '',
          email: d.email || '',
        };
      });
    setRequestUserOptions(users);
  }
  fetchRequestUsers();
}, [companyName, incidentData]);


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

  // Helper to convert 24-hour time to 12-hour time format


  const getStatusBadge = (status) => {
    switch(status) {
      case 'new':
        return { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle, text: 'Pending Review' };
      case 'underReview':
        return { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle, text: 'Under Review' };
      case 'closed':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, text: 'Closed' };
      case 'rejected':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, text: 'Rejected' };
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
   const getStatusBadgeColor = (status) => {
    switch(incidentData?.status) {
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'underReview':
        return 'text-yellow-600 bg-yellow-100';
      case 'closed':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const statusBadge = getStatusBadge(incidentData?.status);


  // Handle close incident
  const handleCloseIncident = async () => {
    if (!window.confirm('Are you sure you want to close this incident? This action cannot be undone.')) {
      return;
    }

    setIsClosing(true);
    setCloseMessage({ type: '', text: '' });

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!incidentId) {
        throw new Error('No incident ID provided');
      }

      // Update incident status to closed
      const incidentRef = doc(db, 'reports', incidentId);
      await updateDoc(incidentRef, {
        status: 'closed',
        closedAt: serverTimestamp(),
        closedBy: currentUser.uid,
        lastUpdated: serverTimestamp(),
        resolution: {
          closedByName: currentUser.displayName || adminName || 'Admin',
          closedByEmail: currentUser.email,
          closureReason: 'Incident resolved',
          finalNotes: ''
        }
      });

      setCloseMessage({ 
        type: 'success', 
        text: 'Incident has been closed successfully.' 
      });

      // Update local state
      setIncidentData(prev => ({ ...prev, status: 'closed' }));


    } catch (error) {
      console.error('Error closing incident:', error);
      setCloseMessage({ 
        type: 'error', 
        text: `Error: ${error.message}` 
      });
    } finally {
      setIsClosing(false);
    }
  };

  // const statusBadge = getStatusBadge(incidentData?.status);

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
              
            </nav>
          </div>
        </aside>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-9xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-500 mb-6">
          <Home className="w-4 h-4 mr-1" />
          <ChevronRight className="w-4 h-4 mx-1" />
          <span>Reports</span>
          <ChevronRight className="w-4 h-4 mx-1" />
          <span className="text-gray-900">{getIncidentTypeTitle(incidentData?.incidentType)}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
<h1 className="text-xl font-semibold text-gray-900 mb-1">
                    {incidentData?.incidentType === 'injury' ? 'Injury Report' : 
                     incidentData?.incidentType === 'safetyHazard' ? 'Safety Hazard Report' : 
                     incidentData?.incidentType === 'nearMiss' ? 'Near Miss Report' : 
                     incidentData?.incidentType === 'propertyDamage' ? 'Property Damage Report' : 
                     'Incident Report'}
                  </h1>
              <p className="text-sm text-gray-500 mt-1">
                Report ID: #{incidentId || 'INC-2025-001'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Submitted {incidentData?.createdAt?.toDate?.()?.toLocaleString() || '2 hours ago'}
              </span>
              <span className={`inline-flex items-center gap-2 px-5 py-1 ${getStatusBadgeColor(
              incidentData?.status || 'medium'
            )} rounded-full text-sm font-medium`}>
                {statusBadge.icon && <statusBadge.icon className="w-4 h-4" />}
                {incidentData?.status.charAt(0).toUpperCase() + incidentData?.status.slice(1) || 'Pending Review'}
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
    {/* Title */}
    <h2 className="text-lg font-semibold text-gray-900 mb-4">
      Personal Information
    </h2>

    {/* Four‐column row with vertical dividers */}
  <div
    className={`grid ${
      [
        "injury",
        "propertyDamage",
        "nearMiss",
        "safetyHazard",
      ].includes(incidentData?.incidentType)
        ? "grid-cols-4"
        : "grid-cols-3"
    } divide-x divide-gray-200`}
  >

  {/* Reporter Name (ALL) */}
  <div className="px-4">
    <p className="text-sm font-medium text-gray-700 mb-1">Reporter Name</p>
    <p className="text-sm text-gray-900">
      {reporterName != null
        ? reporterName
        : incidentData?.personalInfo?.yourName || 'Unknown Reporter'}
    </p>
  </div>

  {/* --- Incident-type-specific fields --- */}
  {incidentData?.incidentType === 'injury' && (
    <>
      {/* Injured Person(s) */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Injured Person(s)</p>
        <p className="text-sm text-gray-900">
          {injuredNames != null
            ? injuredNames
            : incidentData?.personalInfo?.injuredPersons || 'None'}
        </p>
      </div>
      {/* Time Lost Injury? */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Time Lost Injury?</p>
        <p className="text-sm font-medium text-red-600">
          {incidentData?.personalInfo?.wasInjured || 'No'}
        </p>
      </div>
    </>
  )}

  {incidentData?.incidentType === 'propertyDamage' && (
    <>
      {/* What Was Damaged */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">What Was Damaged</p>
        <p className="text-sm text-gray-900">
          {incidentData?.impactInfo?.damaged.charAt(0).toUpperCase() + incidentData?.impactInfo?.damaged.slice(1).replace(/([A-Z])/g, ' $1').trim() || 'Not specified'}
        </p>
      </div>
      {/* Impact on Operations */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Impact on Operations</p>
        <p className="text-sm text-gray-900">
          {incidentData?.impactInfo?.impactOps.charAt(0).toUpperCase() + incidentData?.impactInfo?.impactOps.slice(1).replace(/([A-Z])/g, ' $1').trim() || 'Not specified'}
        </p>
      </div>
    </>
  )}

  {incidentData?.incidentType === 'nearMiss' && (
    <>
      {/* Type of Concern */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Type of Concern</p>
        <p className="text-sm text-gray-900">
          {incidentData?.impactInfo?.typeOfConcern.charAt(0).toUpperCase() + incidentData?.impactInfo?.typeOfConcern.slice(1).replace(/([A-Z])/g, ' $1').trim() || 'Not specified'}
        </p>
      </div>
      {/* Severity */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Severity</p>
        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(incidentData?.personalInfo?.severity)}`}>
          {incidentData?.impactInfo?.severity.charAt(0).toUpperCase() + incidentData?.impactInfo?.severity.slice(1).replace(/([A-Z])/g, ' $1').trim()  || 'Not specified'}
        </span>
      </div>
    </>
  )}

  {incidentData?.incidentType === 'safetyHazard' && (
    <>
      {/* Equipment Involved */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Equipment Involved</p>
        <p className="text-sm text-gray-900">
          {incidentData?.impactInfo?.equipment.charAt(0).toUpperCase() + incidentData?.impactInfo?.equipment.slice(1).replace(/([A-Z])/g, ' $1').trim()  || 'Not specified'}
        </p>
      </div>
      {/* Impact on Operation */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Impact on Operation</p>
        <p className="text-sm text-gray-900">
          {incidentData?.impactInfo?.impactOps.charAt(0).toUpperCase() + incidentData?.impactInfo?.impactOps.slice(1).replace(/([A-Z])/g, ' $1').trim()  || 'Not specified'}
        </p>
      </div>
    </>
  )}

  {/* Witness/es (ALL) */}
  <div className="px-4">
    <p className="text-sm font-medium text-gray-700 mb-1">Witness/es</p>
    <p className="text-sm text-gray-900">
      {witnessNames != null
        ? witnessNames
        : incidentData?.personalInfo?.witnesses || 'None'}
    </p>
  </div>
</div>
  </div>
</div>




             {/* Incident Details */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200">
  <div className="p-6">
    {/* Title */}
    <h2 className="text-lg font-semibold text-gray-900 mb-4">
      Incident Details
    </h2>

    {/* Top row: Date / Time / Location / Severity */}
    <div className="grid grid-cols-4 gap-6 mb-6">
      {/* Date */}
      <div>
        <p className="text-sm font-medium text-gray-700">Date</p>
        <p className="mt-1 text-sm text-gray-900">
          {incidentData?.incidentDetails?.date || 'March 15, 2024'}
        </p>
      </div>

      {/* Time */}
      <div>
        <p className="text-sm font-medium text-gray-700">Time</p>
        <p className="mt-1 text-sm text-gray-900">
          {incidentData?.incidentDetails?.time.toDate?.()?.toLocaleString() || '2:30 PM'}
        </p>
      </div>

      {/* Location */}
      <div>
        <p className="text-sm font-medium text-gray-700">Location</p>
        <p className="mt-1 text-sm text-gray-900">
          {incidentData?.incidentDetails?.location ||
            'Construction Site – Building A, Level 3'}
        </p>
      </div>

      {/* Severity */}
      <div>
        <p className="text-sm font-medium text-gray-700">Severity</p>
        <span
          className={`
            inline-flex items-center
            px-2 py-1 rounded-full text-xs font-medium
            ${getSeverityColor(
              incidentData?.impactInfo?.severity || 'medium'
            )}
          `}
        >
          {incidentData?.impactInfo?.severity
            ? incidentData.impactInfo.severity[0].toUpperCase() +
              incidentData.impactInfo.severity.slice(1)
            : 'Medium'}
        </span>
      </div>
    </div>

    {/* AI Summary Description */}
    <div className="mb-6">
      <p className="text-sm font-medium text-gray-700">
        AI Summary Description
      </p>
      <p className="mt-1 text-sm text-gray-900 leading-relaxed">
        {incidentData?.incidentDetails?.description ||
          'Worker fell from scaffolding while installing safety barriers. The scaffolding appeared to be improperly secured. Emergency services were called immediately. Worker sustained injuries to leg and back.'}
      </p>
      <a
        href="#"
        className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        View Full Description
      </a>
    </div>

    {/* Audio Description */}
    {incidentData?.incidentDetails?.audioUrl && (
      <div>
         <p className="text-sm font-medium text-gray-700 mb-2">Audio Description</p>
        <div className="bg-gray-50 p-2 rounded-lg">
          <audio
            controls
            src={incidentData.incidentDetails.audioUrl}
            className="h-10"
          >
            Your browser does not support the audio element.
          </audio>
          <p className="mt-1 text-xs text-gray-500 truncate">
            {/* display the filename */}
            {incidentData.incidentDetails.audioUrl.split('/').pop()}
         </p>
        </div>
      </div>
    )}
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
           <button 
                      onClick={handleCloseIncident}
                      disabled={isClosing || incidentData?.status === 'closed'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#BDEECF] text-[#22C560] rounded-lg hover:bg-green-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isClosing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : incidentData?.status === 'closed' ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Incident Closed
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Close Incident
                        </>
                      )}
                    </button>
          
<button 
                      onClick={handleUnderReview}
                      disabled={isUpdatingStatus || incidentData?.status === 'underReview' || incidentData?.status === 'closed' || incidentData?.status === 'rejected'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FCE2B6] text-[#F69D0D] rounded-lg hover:bg-orange-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingStatus ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : incidentData?.status === 'underReview' ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          Already Under Review
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          Under Review
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={handleRejectReport}
                      disabled={isRejecting || incidentData?.status === 'rejected' || incidentData?.status === 'closed'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FFA7A5] text-[#EE433F] rounded-lg hover:bg-red-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : incidentData?.status === 'rejected' ? (
                        <>
                          <XCircle className="w-5 h-5" />
                          Report Rejected
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          Reject Report
                        </>
                      )}
                    </button>
          <button 
            onClick={() => setShowRequestDetails(!showRequestDetails)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#D0D1FB]  rounded-lg hover:bg-blue-400 hover:text-white transition-colors ${
              showRequestDetails 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            <FileQuestion className="w-5 h-5" />
            Request Details
            <ChevronDown className={`w-4 h-4 transition-transform ${showRequestDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Request Details Dropdown */}
        {showRequestDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Details From:
                </label>
                <div className="relative">
               <Listbox value={selectedUser} onChange={setSelectedUser}>
  <div className="relative">
    <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border border-gray-300 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
      <span className="flex items-center">
        {selectedUser ? (
          (() => {
            const u = requestUserOptions.find(x => x.uid === selectedUser);
            return u ? (
              <>
                {u.photoUrl
                  ? <img src={u.photoUrl} alt="" className="w-7 h-7 rounded-full mr-2" />
                  : <div className="w-7 h-7 bg-gray-200 rounded-full mr-2 flex items-center justify-center text-gray-500 font-bold">{u.firstName?.charAt(0) || "?"}</div>
                }
                <span className="block truncate text-black">{u.firstName} {u.lastName}</span>
              </>
            ) : <span className="text-gray-400">Select User</span>;
          })()
        ) : (
          <span className="text-gray-400">Select User</span>
        )}
      </span>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </span>
    </Listbox.Button>
    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto  bg-white py-1 shadow-lg ring-1  ring-opacity-5 focus:outline-none">
      {requestUserOptions.map((u) => (
        <Listbox.Option
          key={u.uid}
          value={u.uid}
          className={({ active }) =>
            `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
              active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
            }`
          }
        >
          {({ selected, active }) => (
            <>
              <span className={`absolute left-2 top-2 flex items-center`}>
                {u.photoUrl
                  ? <img src={u.photoUrl} alt="" className="w-7 h-7 rounded-full mr-2" />
                  : <div className="w-7 h-7 bg-gray-200 rounded-full mr-2 flex items-center justify-center text-gray-500 font-bold">{u.firstName?.charAt(0) || "?"}</div>
                }
              </span>
              <span className={`ml-2 block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                {u.firstName} {u.lastName}
              </span>
            </>
          )}
        </Listbox.Option>
      ))}
    </Listbox.Options>
  </div>
</Listbox>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please type request here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none placeholder-gray-400 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <button
                onClick={handleSendRequest}
                disabled={!selectedUser || !message.trim()}
                className="w-full py-3 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Send Request
              </button>
            </div>
          </div>         
        )}
      </div>
      <NotifyAllEmployees 
      incidentId={incidentId} 
      incidentData={incidentData}
      />
    </div>
          </div>
        </div>
      </div>
      </div>
    
    </div>
  );
}