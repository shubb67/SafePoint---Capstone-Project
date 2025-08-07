import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { collection, getDocs, where, query, orderBy } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";

const IncidentsByLocation = () => {
  const [timeRange, setTimeRange] = useState('1M');
  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

      // Get current admin's data
      const adminSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", currentUser.uid)));
      const admin = adminSnap.docs[0]?.data();
      const adminCompany = admin?.company;
      
      if (!adminCompany) {
        setError("Company not found");
        setLoading(false);
        return;
      }

      // Get all users from the company
      const orgUsersSnap = await getDocs(query(collection(db, "users"), where("company", "==", adminCompany)));
      const orgUserIds = orgUsersSnap.docs.map(doc => doc.id);

      if (orgUserIds.length === 0) {
        setLocationData([]);
        setLoading(false);
        return;
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
      }

      // Fetch incidents from all users in the organization
      // Note: Firestore has a limit of 10 items for 'in' queries, so we might need to batch
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
          
          // Filter by date range
          if (createdAt >= startDate && createdAt <= endDate) {
            allIncidents.push({
              ...data,
              id: doc.id,
              createdAt: createdAt
            });
          }
        });
      }

      // Process location data
      const processedData = processLocationData(allIncidents);
      setLocationData(processedData);
      
    } catch (err) {
      console.error("Error fetching location data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processLocationData = (incidents) => {
    // Group incidents by location
    const locationCounts = {};
    let totalIncidents = 0;

    incidents.forEach(incident => {
      const location = incident.incidentDetails?.location || 'Other';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
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
      
      topLocations.push({
        name: 'Other',
        value: parseFloat(otherTotal.toFixed(1)),
        count: otherCount
      });
      
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">Incidents by Location</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (locationData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">Incidents by Location</h2>
          <div className="flex gap-2 text-xs">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 rounded ${
                  timeRange === range ? 'bg-gray-200 text-black' : 'text-black'
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-black">Incidents by Location</h2>
        <div className="flex gap-2 text-xs">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 rounded ${
                timeRange === range ? 'bg-gray-200 text-black' : 'text-black'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-center h-54 gap-6">
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
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></span>
              <span>{item.name}</span>
              <span className="font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IncidentsByLocation;