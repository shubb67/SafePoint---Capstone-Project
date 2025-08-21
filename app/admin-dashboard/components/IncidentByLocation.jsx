import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { collection, getDocs, getDoc, doc, where, query, orderBy } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";

const IncidentsByLocation = () => {
  const [timeRange, setTimeRange] = useState('1M');
  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationNames, setLocationNames] = useState(new Map());
  
  // Colors for different locations
  const colors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'];

  const timeRanges = ['1M', '1QR', '1Y', 'Max'];

  useEffect(() => {
    fetchIncidentsByLocation(timeRange);
  }, [timeRange]);

  const fetchIncidentsByLocation = async (range) => {
    setLoading(true);
    setError(null);
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      // Get user's workspace ID
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists()) {
        setError("User data not found");
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      const workspaceId = userData.workspaceId;
      
      if (!workspaceId) {
        setError("User not assigned to any workspace");
        setLoading(false);
        return;
      }

      // Get workspace data to resolve location names
      const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId));
      if (workspaceDoc.exists()) {
        const workspaceData = workspaceDoc.data();
        const locations = workspaceData.locations || [];
        
        // Create a map of locationId to location name
        const locMap = new Map();
        locations.forEach(loc => {
          if (loc.locationId && loc.name) {
            locMap.set(String(loc.locationId).trim(), String(loc.name).trim());
          }
        });
        setLocationNames(locMap);
      }

      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      switch(range) {
        case '1M':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '1QR':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '1Y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case 'Max':
          startDate = new Date('2020-01-01'); // Or your earliest data
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Fetch all incidents for this workspace
      const incidentsQuery = query(
        collection(db, "reports"),
        where("workspaceId", "==", workspaceId),
        where("createdAt", ">=", startDate),
        where("createdAt", "<=", endDate),
        orderBy("createdAt", "desc")
      );

      const incidentsSnap = await getDocs(incidentsQuery);
      
      const allIncidents = [];
      incidentsSnap.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        
        if (createdAt instanceof Date) {
          allIncidents.push({
            ...data,
            id: doc.id,
            createdAt
          });
        }
      });

      // Process location data with location name resolution
      const processedData = processLocationData(allIncidents, locationNames);
      setLocationData(processedData);
      
    } catch (err) {
      console.error("Error fetching location data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const processLocationData = (incidents, locNameMap) => {
    // Group incidents by location
    const locationCounts = {};
    let totalIncidents = 0;

    incidents.forEach(incident => {
      // Try to get location from incidentDetails
      const locationId = String(incident.incidentDetails?.location || '').trim();
      const locationNameFromData = String(incident.incidentDetails?.locationName || '').trim();
      
      // Resolve location name: try map first, then use provided name, then ID, then 'Other'
      let locationName = 'Other';
      if (locationId && locNameMap.has(locationId)) {
        locationName = locNameMap.get(locationId);
      } else if (locationNameFromData) {
        locationName = locationNameFromData;
      } else if (locationId) {
        locationName = locationId;
      }
      
      locationCounts[locationName] = (locationCounts[locationName] || 0) + 1;
      totalIncidents++;
    });

    if (totalIncidents === 0) return [];

    // Convert to percentages and format for chart
    let chartData = Object.entries(locationCounts).map(([location, count]) => ({
      name: location,
      value: parseFloat(((count / totalIncidents) * 100).toFixed(1)),
      count: count
    }));

    // Sort by value descending
    chartData.sort((a, b) => b.value - a.value);

    // If there are many locations, group smaller ones as "Other"
    if (chartData.length > 4) {
      const topLocations = chartData.slice(0, 3);
      const otherLocations = chartData.slice(3);
      const otherTotal = otherLocations.reduce((sum, loc) => sum + loc.value, 0);
      const otherCount = otherLocations.reduce((sum, loc) => sum + loc.count, 0);
      
      // Check if "Other" already exists in top locations
      const existingOtherIndex = topLocations.findIndex(loc => loc.name === 'Other');
      if (existingOtherIndex !== -1) {
        topLocations[existingOtherIndex].value += otherTotal;
        topLocations[existingOtherIndex].count += otherCount;
      } else {
        topLocations.push({
          name: 'Other',
          value: parseFloat(otherTotal.toFixed(1)),
          count: otherCount
        });
      }
      
      chartData = topLocations;
    }

    // Assign colors
    chartData.forEach((item, index) => {
      item.color = colors[index % colors.length];
    });

    return chartData;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-black">Incidents by Location</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-black">Incidents by Location</h2>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (locationData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-black">Incidents by Location</h2>
          <div className="flex gap-2 text-xs">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeRange === range 
                    ? 'bg-gray-200 text-black font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">No incident data available for the selected period</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-black">Incidents by Location</h2>
        <div className="flex gap-2 text-xs">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 rounded transition-colors ${
                timeRange === range 
                  ? 'bg-gray-200 text-black font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-center h-44 gap-5">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={locationData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                startAngle={90}
                endAngle={450}
                dataKey="value"
              >
                {locationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm space-y-2">
          {locationData.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-black">
              <span 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="truncate max-w-[120px]" title={item.name}>
                {item.name}
              </span>
              <span className="font-medium ml-auto">
                {item.value}%
              </span>
              <span className="text-gray-500 text-xs">
                ({item.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IncidentsByLocation;