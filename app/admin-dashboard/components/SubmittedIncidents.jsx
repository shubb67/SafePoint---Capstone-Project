import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/_utils/firebase";

export default function SubmittedIncidents() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const orgId = userSnap.data()?.organizationId;
        if (!orgId) return;

        const q = query(
          collection(db, "reports"),
          where("organizationId", "==", orgId),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const snapshot = await getDocs(q);
       const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setIncidents(data);
      } catch (error) {
        console.error("Failed to load submitted incidents", error);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Submitted Incidents</h2>
      <ul className="divide-y divide-gray-200">
        {incidents.map((incident) => (
          <li key={incident.id} className="py-2 text-sm text-gray-700">
            <p className="font-medium">{incident.incidentType || "Unknown Type"}</p>
            <p className="text-xs text-gray-500">{incident.incidentDetails?.locationId || "Unknown Location"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
