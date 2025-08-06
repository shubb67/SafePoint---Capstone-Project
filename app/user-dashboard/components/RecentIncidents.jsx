import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import injuryIcon from "../../assets/image/injury.png";
import hazardIcon from "../../assets/image/safety-hazards.png";
import nearMissIcon from "../../assets/image/danger.png";
import propertyIcon from "../../assets/image/property-damage.png";


const imgUrl = img => (img && (img.src || img.default)) || img || "";
const incidentTypeIcons = {
  injury: injuryIcon,
  safetyHazard: hazardIcon,
  nearMiss: nearMissIcon,
  propertyDamage: propertyIcon,
};
const iconBg = {
  injury: "bg-red-500",
  safetyHazard: "bg-blue-600",
  nearMiss: "bg-yellow-400",
  propertyDamage: "bg-yellow-500",
};

function timeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const then = typeof date === "object" && date.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function RecentNotifications({ userCompany }) {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userCompany) return;

    async function fetchNotifications() {
      setIsLoading(true);
      const q = query(
        collection(db, "notifications"),
        where("company", "==", userCompany),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        let title = "";
        if (data.incidentType === "injury") {
          title = `Injury Reported in ${data.location || "Unknown Location"}`;
        } else if (data.incidentType === "safetyHazard") {
          title = `Safety Hazard in ${data.location || "Unknown Location"}`;
        } else if (data.incidentType === "nearMiss") {
          title = `Near Miss in ${data.location || "Unknown Location"}`;
        } else if (data.incidentType === "propertyDamage") {
          title = `Property Damage in ${data.location || "Unknown Location"}`;
        } else {
          title = `Incident in ${data.location || "Unknown Location"}`;
        }
        return {
          id: doc.id,
          iconSrc: incidentTypeIcons[data.incidentType] || propertyIcon,
          bg: iconBg[data.incidentType] || "bg-gray-400",
          title,
          description: data.notifyMessage || "No description provided.",
          time: timeAgo(data.createdAt),
          isNew: data.status === "active",
        };
      });
      setIncidents(items);
      setIsLoading(false);
    }
    fetchNotifications();
  }, [userCompany]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 max-h-[360px] overflow-y-auto min-w-[330px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Incidents</h3>
      <hr className="border-gray-200 mb-4" />
      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No notifications found.</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {incidents.map(({ id, iconSrc, bg, title, description, time, isNew }) => (
            <div key={id} className="flex items-start py-4">
              <div className="flex-none">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center`}>
                  <img src={imgUrl(iconSrc)} alt="" className="w-10 h-10 object-fill border rounded-lg" />
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
                <p className="text-xs text-gray-400 mt-2">{time}</p>
              </div>
              {isNew && (
                <span className="ml-2 mt-1 h-2 w-2 bg-yellow-400 rounded-full flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
