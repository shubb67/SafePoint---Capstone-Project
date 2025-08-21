import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { getAuth } from "firebase/auth";

import injuryIcon from "../../assets/image/injury.png";
import hazardIcon from "../../assets/image/safety-hazards.png";
import nearMissIcon from "../../assets/image/danger.png";
import propertyIcon from "../../assets/image/property-damage.png";

const imgUrl = (img) => (img && (img.src || img.default)) || img || "";
const incidentTypeIcons = {
  injury: injuryIcon,
  safetyHazard: hazardIcon,
  nearMiss: nearMissIcon,
  propertyDamage: propertyIcon,
};

function timeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const then =
    typeof date === "object" && date.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Props:
 * - workspaceId (optional): if omitted, the component will fetch it from the
 *   current user's document (users/{uid}.workspaceId)
 */
export default function RecentNotifications({ workspaceId: propWorkspaceId }) {
  const [workspaceId, setWorkspaceId] = useState(propWorkspaceId || null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Resolve workspaceId if not passed in
  useEffect(() => {
    let mounted = true;
    async function resolveWs() {
      if (propWorkspaceId) {
        setWorkspaceId(propWorkspaceId);
        return;
      }
      const user = getAuth().currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!mounted) return;
      const data = snap.exists() ? snap.data() : null;
      setWorkspaceId(data?.workspaceId || null);
    }
    resolveWs();
    return () => {
      mounted = false;
    };
  }, [propWorkspaceId]);

  // Subscribe to workspace notifications
  useEffect(() => {
    if (!workspaceId) return;
    setIsLoading(true);

    const q = query(
      collection(db, "workspaces", workspaceId, "notify"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((d) => {
          const data = d.data();
          const locName = data.locationName || data.location || "Unknown Location";
          const t = data.incidentType;
          let title = `Incident in ${locName}`;
          if (t === "injury") title = `Injury Reported in ${locName}`;
          else if (t === "safetyHazard") title = `Safety Hazard in ${locName}`;
          else if (t === "nearMiss") title = `Near Miss in ${locName}`;
          else if (t === "propertyDamage")
            title = `Property Damage in ${locName}`;

          return {
            id: d.id,
            iconSrc: incidentTypeIcons[t] || propertyIcon,
            title,
            description: data.notifyMessage || "No description provided.",
            time: timeAgo(data.createdAt),
            isNew: data.status === "active",
          };
        });
        setItems(next);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to fetch workspace notifications:", err);
        setItems([]);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [workspaceId]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 min-w-[330px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Recent Incidents
      </h3>
      <hr className="border-gray-200 mb-4" />
      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No notifications found.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {items.map(({ id, iconSrc, title, description, time, isNew }) => (
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
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {description}
                </p>
                <p className="text-xs text-gray-400 mt-2">{time}</p>
              </div>
              {isNew && (
                <span className="ml-2 mt-1 h-2 w-2 bg-yellow-400 rounded-full" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
