import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
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
      try {
        // NEW PATH: notification/{company}/notify
        const q = query(
          collection(db, "notification", userCompany, "notify"),
          orderBy("createdAt", "desc"),
          limit(10)
        );

        const snapshot = await onSnapshot(q);
        const items = snapshot.docs.map((doc) => {
          const data = doc.data();

          const loc = data.location || "Unknown Location";
          const t = data.incidentType;
          let title = `Incident in ${loc}`;
          if (t === "injury") title = `Injury Reported in ${loc}`;
          else if (t === "safetyHazard") title = `Safety Hazard in ${loc}`;
          else if (t === "nearMiss") title = `Near Miss in ${loc}`;
          else if (t === "propertyDamage") title = `Property Damage in ${loc}`;

          return {
            id: doc.id,
            iconSrc: incidentTypeIcons[t] || propertyIcon,
            title,
            description: data.notifyMessage || "No description provided.",
            time: timeAgo(data.createdAt),
            isNew: data.status === "active",
          };
        });

        setIncidents(items);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotifications();
  }, [userCompany]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 min-w-[330px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Incidents</h3>
      <hr className="border-gray-200 mb-4" />
      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No notifications found.</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {incidents.map(({ id, iconSrc, title, description, time, isNew }) => (
            <div key={id} className="flex items-start py-4">
              <div className="flex-none">
                <img
                  src={imgUrl(iconSrc)}
                  alt=""
                  className="w-10 h-10 object-fill border rounded-lg"
                />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
                <p className="text-xs text-gray-400 mt-2">{time}</p>
              </div>
              {isNew && <span className="ml-2 mt-1 h-2 w-2 bg-yellow-400 rounded-full" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
