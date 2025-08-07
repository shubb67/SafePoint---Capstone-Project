import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import injuryIcon from "../../assets/image/injury.png";
import propertyIcon from "../../assets/image/property-damage.png";
import nearMissIcon from "../../assets/image/danger.png";
import hazardIcon from "../../assets/image/safety-hazards.png";
import { Bell, Play, Home, FileText, MessageSquare, User } from "lucide-react";

const incidentTypeIcons = {
  injury: injuryIcon,
  propertyDamage: propertyIcon,
  nearMiss: nearMissIcon,
  safetyHazard: hazardIcon,
};

function getIncidentTypeTitle(type) {
  switch (type) {
    case "injury":
      return "Injury Report";
    case "propertyDamage":
      return "Property Damage";
    case "nearMiss":
      return "Near Miss";
    case "safetyHazard":
      return "Safety Hazard";
    default:
      return "Incident";
  }
}

export default function IncidentReportDetailMobile() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  // Replace with your actual fetch logic
  useEffect(() => {
    async function fetchIncident() {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, "reports", id));
        setIncident(docSnap.exists() ? docSnap.data() : null);
      } catch (err) {
        setIncident(null);
      }
      setLoading(false);
    }
    fetchIncident();
  }, [id]);

  // Utility
  function formatDate(ts) {
    if (!ts) return "";
    if (typeof ts === "string") return ts;
    if (ts.toDate) return ts.toDate().toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  }

  function getEvidenceArr() {
    if (!incident?.evidence) return [];
    if (Array.isArray(incident.evidence)) return incident.evidence;
    return [incident.evidence];
  }

  if (loading)
    return <div className="flex items-center justify-center h-96">Loading...</div>;

  if (!incident)
    return <div className="flex items-center justify-center h-96">No incident found.</div>;

  // Destructure commonly used fields with safe fallbacks
  const type = incident.incidentType || "injury";
  const icon = incidentTypeIcons[type] || hazardIcon;

  // --- FIELD VARIANTS FOR DIFFERENT INCIDENT TYPES ---
  // These will display different content depending on the incident type.
  function renderPersonalInfo() {
    return (
      <div className="mb-4">
        <div className="font-bold text-[16px] mb-2">Personal Information</div>
        <div className="grid grid-cols-2 border rounded-lg divide-x divide-gray-200 bg-white">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-1">Reporter Name</div>
            <div className="font-medium text-sm">
              {incident.personalInfo?.reporterName || incident.personalInfo?.yourName || "-"}
            </div>
          </div>
          {type === "injury" && (
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-1">Injured Person(s)</div>
              <div className="font-medium text-sm">
                {incident.personalInfo?.injuredPersons || "-"}
              </div>
            </div>
          )}
          {type === "propertyDamage" && (
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-1">What was damaged</div>
              <div className="font-medium text-sm">
                {incident.personalInfo?.damagedItem || "-"}
              </div>
            </div>
          )}
          {type === "nearMiss" && (
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-1">Type of Concern</div>
              <div className="font-medium text-sm">
                {incident.personalInfo?.concernType || "-"}
              </div>
            </div>
          )}
          {type === "safetyHazard" && (
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-1">Equipment Involved</div>
              <div className="font-medium text-sm">
                {incident.personalInfo?.equipmentInvolved || "-"}
              </div>
            </div>
          )}

          {/* Second row */}
          {type === "injury" && (
            <div className="p-2 border-t col-span-1">
              <div className="text-xs text-gray-500 mb-1">Lost Time Injury?</div>
              <div className="font-medium text-sm text-red-500">
                {incident.personalInfo?.wasInjured || "-"}
              </div>
            </div>
          )}
          {type === "propertyDamage" && (
            <div className="p-2 border-t col-span-1">
              <div className="text-xs text-gray-500 mb-1">Impact on Operation</div>
              <div className="font-medium text-sm">
                {incident.personalInfo?.impactOnOperation || "-"}
              </div>
            </div>
          )}
          {type === "nearMiss" && (
            <div className="p-2 border-t col-span-1">
              <div className="text-xs text-gray-500 mb-1">Severity</div>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                {incident.personalInfo?.severity || "-"}
              </span>
            </div>
          )}
          {type === "safetyHazard" && (
            <div className="p-2 border-t col-span-1">
              <div className="text-xs text-gray-500 mb-1">Impact on Operation</div>
              <div className="font-medium text-sm">
                {incident.personalInfo?.impactOnOperation || "-"}
              </div>
            </div>
          )}
          {/* Witnesses always shown */}
          <div className="p-2 border-t col-span-1">
            <div className="text-xs text-gray-500 mb-1">Witness/es</div>
            <div className="font-medium text-sm">
              {Array.isArray(incident.personalInfo?.witnesses)
                ? incident.personalInfo?.witnesses.join(", ")
                : incident.personalInfo?.witnesses || "-"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- END PERSONAL INFO VARIANTS ---

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white shadow-sm border-b">
        <img src={icon} alt="icon" className="w-9 h-9 rounded bg-red-100" />
        <div className="flex-1">
          <div className="font-semibold text-sm">{getIncidentTypeTitle(type)}</div>
          <div className="text-xs text-gray-500">Report ID: #{id}</div>
        </div>
        <div className="relative">
          <Bell className="w-6 h-6 text-[#1a2b5c]" />
          <span className="absolute -top-2 -right-2 bg-yellow-400 text-white rounded-full px-1 text-xs font-bold">2</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-3 pt-3">
        {/* Personal Information */}
        {renderPersonalInfo()}

        {/* Incident Details */}
        <div className="mb-4">
          <div className="font-bold text-[16px] mb-2">Incident Details</div>
          <div className="grid grid-cols-2 border rounded-lg divide-x divide-gray-200 bg-white">
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-1">Date:</div>
              <div className="font-medium text-sm">
                {incident.incidentDetails?.date || formatDate(incident.createdAt)}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-1">Time:</div>
              <div className="font-medium text-sm">
                {incident.incidentDetails?.time || "-"}
              </div>
            </div>
            <div className="p-2 border-t col-span-1">
              <div className="text-xs text-gray-500 mb-1">Location</div>
              <div className="font-medium text-sm">
                {incident.incidentDetails?.location || "-"}
              </div>
            </div>
            <div className="p-2 border-t col-span-1">
              <div className="text-xs text-gray-500 mb-1">Severity</div>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                {incident.incidentDetails?.severity ||
                  incident.impactInfo?.severity ||
                  "-"}
              </span>
            </div>
          </div>
          {/* AI Summary */}
          <div className="bg-white mt-2 px-2 py-2 rounded-lg">
            <div className="text-xs text-gray-500 font-medium mb-1">AI Summary</div>
            <div className="text-sm text-gray-800 leading-snug">
              {incident.incidentDetails?.description || "-"}
            </div>
            <a href="#" className="text-blue-700 text-xs font-medium mt-1 block">
              View Full Description
            </a>
          </div>
        </div>

        {/* Audio Description */}
        {incident.incidentDetails?.audioUrl && (
          <div className="mb-4">
            <div className="font-bold text-[16px] mb-2">Audio Description</div>
            <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2">
              <Play className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="font-medium text-xs text-black truncate">
                  {incident.incidentDetails.audioUrl.split("/").pop()}
                </div>
                <div className="text-xs text-gray-400">1 min 38 sec</div>
              </div>
              {/* <audio controls src={incident.incidentDetails.audioUrl}></audio> */}
            </div>
          </div>
        )}

        {/* Evidence */}
        <div className="mb-2">
          <div className="font-bold text-[16px] mb-2">Evidence</div>
          <div className="grid grid-cols-2 gap-2">
            {getEvidenceArr().map((img, i) => (
              <img
                key={i}
                src={typeof img === "string" ? img : img.url}
                alt={"evidence" + i}
                className="w-full h-24 object-cover rounded-lg border"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto flex justify-between px-2 py-1">
          <button className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center text-[#192C63]">
            <FileText className="w-6 h-6" />
            <span className="text-xs">Reports</span>
          </button>
          <button className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs">Chats</span>
          </button>
          <button className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
