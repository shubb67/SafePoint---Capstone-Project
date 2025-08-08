import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import injuryIcon from "../../assets/image/injury.png";
import propertyIcon from "../../assets/image/property-damage.png";
import nearMissIcon from "../../assets/image/danger.png";
import hazardIcon from "../../assets/image/safety-hazards.png";
import { Bell, Play, Home, FileText, MessageSquare, User } from "lucide-react";

// Helper for images (works with require or ES import)
const imgUrl = img => (img && (img.src || img.default)) || img || "";

const incidentTypeIcons = {
  injury: injuryIcon,
  safetyHazard: hazardIcon,
  propertyDamage: propertyIcon,
  nearMiss: nearMissIcon,
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

  const type = incident.incidentType || "injury";
  const icon = incidentTypeIcons[type] || hazardIcon;

  // Single bordered grid for personal info
 function renderPersonalInfo() {
  // List of all possible fields for all types (customize as needed)
  const fields = [
    { label: "Reporter Name", value: incident.personalInfo?.reporterName || incident.personalInfo?.yourName },
    { label: "Injured Person(s)", value: incident.personalInfo?.injuredPersons },
    { label: "What was damaged", value: incident.personalInfo?.damagedItem },
    { label: "Type of Concern", value: incident.personalInfo?.concernType },
    { label: "Equipment Involved", value: incident.personalInfo?.equipmentInvolved },
    { label: "Lost Time Injury?", value: incident.personalInfo?.wasInjured },
    { label: "Impact on Operation", value: incident.personalInfo?.impactOnOperation },
    { label: "Severity", value: incident.personalInfo?.severity },
    {
      label: "Witness/es",
      value: Array.isArray(incident.personalInfo?.witnesses)
        ? incident.personalInfo?.witnesses.join(", ")
        : incident.personalInfo?.witnesses
    },
  ];

  // Filter to only show fields with value, always show "Witness/es" (last)
  const visibleFields = fields.filter(
    (f, idx) => (f.value && String(f.value).trim() !== "") || idx === fields.length - 1
  );

  return (
    <div className="mb-4">
      <div className="font-bold text-[16px] mb-2 text-black">Personal Information</div>
      <div className="grid grid-cols-2 border border-gray-200 rounded-lg divide-x divide-gray-200 bg-white overflow-hidden">
        {visibleFields.map((field, idx) => (
          <div
            key={field.label}
            className={`p-2 ${idx >= 2 ? "border-t border-gray-200" : ""}`}
          >
            <div className="text-xs text-black mb-1">{field.label}</div>
            <div className={`font-medium text-sm ${field.label === "Lost Time Injury?" ? "text-red-500" : "text-black"}`}>
              {field.value || "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 px-3 py-2 pt-10">
        <img src={imgUrl(icon)} alt="icon" className="w-9 h-9 rounded bg-red-100" />
        <div className="flex-1">
          <div className="font-semibold text-sm text-black">{getIncidentTypeTitle(type)}</div>
          <div className="text-xs text-gray-500">Report ID: #{id}</div>
        </div>
        <div className="relative">
          <Bell className="w-6 h-6 text-[#1a2b5c]" />
          <span className="absolute -top-2 -right-2 bg-yellow-400 text-white rounded-full px-1 text-xs font-bold">2</span>
        </div>
      </div>
      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 px-3 pt-3">
        {/* Personal Info */}
        {renderPersonalInfo()}
        {/* Incident Details in one border */}
        <div className="mb-4">
          <div className="font-bold text-[16px] mb-2 text-black">Incident Details</div>
          <div className="grid grid-cols-2 border border-gray-200 rounded-lg divide-x divide-gray-200 bg-white overflow-hidden">
            <div className="p-2">
              <div className="text-xs text-black mb-1">Date</div>
              <div className="font-medium text-sm text-gray-600">
                {incident.incidentDetails?.date || formatDate(incident.createdAt)}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-black mb-1">Time</div>
              <div className="font-medium text-sm text-gray-600">
                {incident.incidentDetails?.time || "-"}
              </div>
            </div>
            <div className="p-2 border-t border-gray-200 col-span-1">
              <div className="text-xs mb-1 text-black">Location</div>
              <div className="font-medium text-sm text-gray-600">
                {incident.incidentDetails?.location || "-"}
              </div>
            </div>
            <div className="p-2 border-t border-gray-200 col-span-1">
              <div className="text-xs text-black mb-1">Severity</div>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                {incident.incidentDetails?.severity ||
                  incident.impactInfo?.severity ||
                  "-"}
              </span>
            </div>
          </div>
        </div>
        {/* AI Summary */}
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4">
          <div className="text-xs text-gray-800 font-medium mb-1">AI Summary</div>
          <div className="text-sm text-gray-600 leading-snug">
            {incident.incidentDetails?.description || "-"}
          </div>
          <a href="#" className="text-blue-700 text-xs font-medium mt-1 block">
            View Full Description
          </a>
        </div>
        {/* Audio Description */}
        {incident.incidentDetails?.audioUrl && (
          <div className="mb-4">
            <div className="font-bold text-[16px] mb-2">Audio Description</div>
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
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
        {getEvidenceArr().length > 0 && (
          <div className="mb-2">
            <div className="font-bold text-[16px] mb-2 text-black">Evidence</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {getEvidenceArr().map((img, i) => (
                <img
                  key={i}
                  src={typeof img === "string" ? img : img.url}
                  alt={"evidence" + i}
                  className="w-full h-48 object-contain rounded-lg border border-gray-200"
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto flex justify-between px-2 py-1">
          <Link to="/user-dashboard" className="flex flex-col items-center text-gray-500 hover:text-[#192C63]">
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </Link>
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
