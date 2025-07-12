"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft,
  ChevronDown
} from 'lucide-react';
import { collection, getDocs, where, query, orderBy } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";
import injuryIcon from "../../assets/image/injury.png";
import propertyIcon from "../../assets/image/property-damage.png";
import nearMissIcon from "../../assets/image/danger.png";
import hazardIcon from "../../assets/image/safety-hazards.png";

export default function ViewAllIncidents({ onBack }) {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

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

  // Fetch all incidents
  useEffect(() => {
    fetchAllIncidents();
  }, []);

  const fetchAllIncidents = async () => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      // Get current admin's data
      const adminSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", currentUser.uid)));
      const admin = adminSnap.docs[0]?.data();
      const adminCompany = admin?.company;
      
      if (!adminCompany) {
        console.warn("Admin company not found");
        setIsLoading(false);
        return;
      }

      // Get all users from the company
      const orgUsersSnap = await getDocs(query(collection(db, "users"), where("company", "==", adminCompany)));
      const orgUserIds = orgUsersSnap.docs.map(doc => doc.id);
      const userMap = {};
      orgUsersSnap.docs.forEach(doc => {
        userMap[doc.id] = doc.data();
      });

      if (orgUserIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch all incidents from all users in the organization
      const allIncidents = [];
      
      // Process in batches of 10 due to Firestore limitation
      for (let i = 0; i < orgUserIds.length; i += 10) {
        const batch = orgUserIds.slice(i, i + 10);
        const incidentsSnap = await getDocs(
          query(
            collection(db, "reports"),
            where("userId", "in", batch),
            orderBy("createdAt", "desc")
          )
        );
        
        incidentsSnap.docs.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          const userData = userMap[data.userId] || {};
          
          allIncidents.push({
            id: doc.id,
            type: data.incidentType || 'Unknown',
            date: createdAt,
            dateString: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            severity: data.severity || 'medium',
            status: data.status || 'new',
            location: data.incidentDetails?.location || 'Unknown Location',
            submittedBy: {
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User',
              avatar: userData.photoUrl || null
            }
          });
        });
      }

      setIncidents(allIncidents);
    } catch (err) {
      console.error("Error fetching incidents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sort incidents
  const sortedIncidents = [...incidents].sort((a, b) => {
    let aValue, bValue;
    
    switch(sortField) {
      case 'date':
        aValue = a.date;
        bValue = b.date;
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'severity':
        const severityOrder = { high: 0, medium: 1, low: 2 };
        aValue = severityOrder[a.severity];
        bValue = severityOrder[b.severity];
        break;
      case 'status':
        const statusOrder = { new: 0, underReview: 1, closed: 2 };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
        break;
      default:
        aValue = a[sortField];
        bValue = b[sortField];
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getIncidentTypeColor = (type) => {
    switch(type) {
      case 'injury':
        return 'bg-red-500';
      case 'safetyHazard':
        return 'bg-blue-500';
      case 'nearMiss':
        return 'bg-yellow-400';
      case 'propertyDamage':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-white">
       
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onBack ? onBack() : window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            <ChevronLeft className="w-5 h-5 " />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">All Incidents</h1>
        </div>
      </div>

      {/* Table */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-normal text-sm text-gray-500">Incident Type</th>
                  <th 
                    className="text-left py-3 px-4 font-normal text-sm text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        sortField === 'date' && sortDirection === 'asc' ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-normal text-sm text-gray-500">Submitted by</th>
                  <th className="text-left py-3 px-4 font-normal text-sm text-gray-500">Location</th>
                  <th 
                    className="text-left py-3 px-4 font-normal text-sm text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('severity')}
                  >
                    <div className="flex items-center gap-1">
                      Severity
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        sortField === 'severity' && sortDirection === 'asc' ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-normal text-sm text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        sortField === 'status' && sortDirection === 'asc' ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedIncidents.map((incident) => (
                  <tr key={incident.id} className="border-b hover:bg-gray-50 cursor-pointer">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${getIncidentTypeColor(incident.type)} rounded-lg flex items-center justify-center`}>
                          <img 
                            src={imgUrl(getIncidentIcon(incident.type))}
                            alt={incident.type}
                            className="w-10 h-10 object-fill border rounded-lg"
                          />
                        </div>
                        <span className="font-medium text-gray-900">
                          {incident.type === 'injury' ? 'Injury Incident' : 
                           incident.type === 'safetyHazard' ? 'Safety Hazard' : 
                           incident.type === 'nearMiss' ? 'Near Miss' : 
                           incident.type === 'propertyDamage' ? 'Property Damage' : 
                           'Unknown Type'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{incident.dateString}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {incident.submittedBy.avatar ? (
                          <img 
                            src={incident.submittedBy.avatar} 
                            alt={incident.submittedBy.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            {incident.submittedBy.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                        )}
                        <span className="text-gray-700">{incident.submittedBy.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{incident.location}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        incident.severity === 'high' ? 'bg-red-100 text-red-700' : 
                        incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        incident.status === 'underReview' ? 'bg-orange-100 text-orange-700' : 
                        incident.status === 'new' ? 'bg-blue-100 text-blue-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {incident.status === 'underReview' ? 'Under Review' : 
                         incident.status === 'new' ? 'New Incident' : 'Closed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedIncidents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No incidents found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}