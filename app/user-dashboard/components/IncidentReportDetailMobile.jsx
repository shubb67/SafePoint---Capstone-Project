import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, addDoc
} from "firebase/firestore";
import { db } from "@/_utils/firebase";
import injuryIcon from "../../assets/image/injury.png";
import propertyIcon from "../../assets/image/property-damage.png";
import nearMissIcon from "../../assets/image/danger.png";
import hazardIcon from "../../assets/image/safety-hazards.png";
import { Bell, Play, Home, FileText, MessageSquare, User } from "lucide-react";
import AdminMessageCard from "./AdminMessageCard";
import ImpactResponseCard from "./ImpactResponseCard";

const imgUrl = img => (img && (img.src || img.default)) || img || "";

const incidentTypeIcons = {
  injury: injuryIcon,
  safetyHazard: hazardIcon,
  propertyDamage: propertyIcon,
  nearMiss: nearMissIcon,
};

function getIncidentTypeTitle(type) {
  switch (type) {
    case "injury": return "Injury Report";
    case "propertyDamage": return "Property Damage";
    case "nearMiss": return "Near Miss";
    case "safetyHazard": return "Safety Hazard";
    default: return "Incident";
  }
}

export default function IncidentReportDetailMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store pending changes from navigation state
  const [pendingChanges, setPendingChanges] = useState(null);

  // Resolved display helpers
  const [locationNameById, setLocationNameById] = useState(new Map());
  const [reporterName, setReporterName] = useState("");
  const [witnessNames, setWitnessNames] = useState(null);
  const [injuredNames, setInjuredNames] = useState(null);

  // Related incidents
  const [allIncidentDates, setAllIncidentDates] = useState([]);
  const [items, setItems] = useState([]);

  // Admin message
  const [adminMsg, setAdminMsg] = useState(null);
  const [adminMsgLoading, setAdminMsgLoading] = useState(false);

  // Check for incoming personal info changes from navigation state
  useEffect(() => {
    if (location.state?.personalInfo) {
      setPendingChanges(prev => ({
        ...prev,
        personalInfo: location.state.personalInfo
      }));
      // Clear the state to prevent re-applying on navigation
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Fetch incident data
  useEffect(() => {
    async function fetchIncident() {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, "reports", id));
        if (docSnap.exists()) {
          setIncident(docSnap.data());
        } else {
          setIncident(null);
        }
      } catch (error) {
        console.error("Error fetching incident:", error);
        setIncident(null);
      } finally {
        setLoading(false);
      }
    }
    fetchIncident();
  }, [id]);

  // Merge pending changes with incident data for display
  const displayIncident = useMemo(() => {
    if (!incident) return null;
    if (!pendingChanges) return incident;
    
    return {
      ...incident,
      ...(pendingChanges.personalInfo && {
        personalInfo: {
          ...(incident.personalInfo || {}),
          ...pendingChanges.personalInfo
        }
      }),
      ...(pendingChanges.incidentDetails && {
        incidentDetails: {
          ...(incident.incidentDetails || {}),
          ...pendingChanges.incidentDetails
        }
      }),
      ...(pendingChanges.evidence && {
        evidence: pendingChanges.evidence
      })
    };
  }, [incident, pendingChanges]);

  // Save all pending changes to database
  async function handleSaveAll() {
    if (!pendingChanges) return;
    
    try {
      setSaving(true);
      
      const updateData = {
        ...(pendingChanges.personalInfo && { 
          personalInfo: {
            ...(incident.personalInfo || {}),
            ...pendingChanges.personalInfo
          }
        }),
        ...(pendingChanges.incidentDetails && { 
          incidentDetails: {
            ...(incident.incidentDetails || {}),
            ...pendingChanges.incidentDetails
          }
        }),
        ...(pendingChanges.evidence && { 
          evidence: pendingChanges.evidence 
        }),
        lastUpdated: new Date()
      };
      
      await updateDoc(doc(db, "reports", id), updateData);

      // Send notification to the reporter
      try {
        // Get reporter UID (from personalInfo or userId)
        const reporterUid = incident.personalInfo?.yourName || incident.userId;
        
        if (reporterUid && incident.workspaceId) {
          // Get workspace/company name
          const wsSnap = await getDoc(doc(db, "workspaces", incident.workspaceId));
          const companyName = wsSnap.exists() ? (wsSnap.data()?.name || "Your Company") : "Your Company";
          
          // Send notification
          await addDoc(collection(db, "notifications"), {
            recipientId: reporterUid,
            company: companyName,
            workspaceId: incident.workspaceId,
            type: "update",
            title: "Your Report Was Updated",
            createdAt: new Date(),
            reportId: id,
            message: `Additional information has been added to your report '${id}' as requested`
          });
        }
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
        // Don't fail the save operation if notification fails
      }
      
      
      // Update local state with saved data
      setIncident(prev => ({
        ...prev,
        ...updateData
      }));
      
      // Clear pending changes
      setPendingChanges(null);
      
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Discard pending changes
  function handleDiscard() {
    setPendingChanges(null);
  }

  // Resolve workspace locations + user names once incident is loaded
  useEffect(() => {
    if (!displayIncident) return;

    (async () => {
      try {
        // 1) Resolve location names from workspace
        const wsId = displayIncident.workspaceId;
        if (wsId) {
          const wsSnap = await getDoc(doc(db, "workspaces", wsId));
          if (wsSnap.exists()) {
            const locs = Array.isArray(wsSnap.data()?.locations) ? wsSnap.data().locations : [];
            const map = new Map(
              locs
                .filter(Boolean)
                .map(l => [String(l.locationId || "").trim(), String(l.name || "").trim()])
            );
            setLocationNameById(map);
          }
        }

        // 2) Resolve reporter name from users/{userId}
        const reporterUserId = displayIncident.personalInfo?.yourName || displayIncident.userId;
        if (reporterUserId) {
          const uSnap = await getDoc(doc(db, "users", reporterUserId));
          if (uSnap.exists()) {
            const u = uSnap.data();
            const name =
              u?.name || u?.displayName || [u?.firstName, u?.surname].filter(Boolean).join(" ") || u?.email || "";
            if (name) setReporterName(name);
          }
        }

        // 3) Resolve witnesses & injuredPersons if they are UIDs
        const toArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
        const witnessIds = toArray(displayIncident?.personalInfo?.witnesses);
        const injuredIds = toArray(displayIncident?.personalInfo?.injuredPersons);

        async function resolveUserList(ids) {
          const results = await Promise.all(
            ids.map(async (val) => {
              const idStr = String(val || "").trim();
              if (!idStr) return "";
              try {
                const snap = await getDoc(doc(db, "users", idStr));
                if (snap.exists()) {
                  const u = snap.data();
                  return (
                    u?.name ||
                    u?.displayName ||
                    [u?.firstName, u?.surname].filter(Boolean).join(" ") ||
                    u?.email ||
                    idStr
                  );
                }
              } catch {}
              return idStr;
            })
          );
          return results.filter(s => s && s.trim() !== "");
        }

        if (witnessIds.length) setWitnessNames(await resolveUserList(witnessIds));
        if (injuredIds.length) setInjuredNames(await resolveUserList(injuredIds));
      } catch (e) {
        console.error("Resolve names failed:", e);
      }
    })();
  }, [displayIncident]);

  // Fetch related incidents
  useEffect(() => {
    async function fetchRelatedIncidents() {
      const workspaceId = incident?.workspaceId;
      if (!workspaceId) return;

      try {
        const incidentsQ = query(
          collection(db, "reports"),
          where("workspaceId", "==", workspaceId),
          orderBy("createdAt", "desc"),
          limit(40)
        );
        const incidentsSnap = await getDocs(incidentsQ);

        const newIncidentDates = [];
        const newItems = [];

        incidentsSnap.forEach((d) => {
          const data = d.data();
          newIncidentDates.push(data.createdAt?.toDate?.() || new Date());

          const locIdOrText = String(data?.incidentDetails?.location ?? "").trim();
          const locReadable = String(data?.incidentDetails?.locationName ?? "").trim();

          const resolvedLocationName =
            (locIdOrText && locationNameById.get(locIdOrText)) ||
            (locReadable || locIdOrText) ||
            "N/A";

          newItems.push({ id: d.id, location: resolvedLocationName });
        });

        setAllIncidentDates(newIncidentDates);
        setItems(newItems);
      } catch (err) {
        console.error("Error fetching related incidents:", err);
      }
    }

    fetchRelatedIncidents();
  }, [incident?.workspaceId, locationNameById]);

  // Fetch admin message
  useEffect(() => {
    async function fetchAdminMsg() {
      if (!id) return;
      setAdminMsgLoading(true);
      try {
        const rSnap = await getDoc(doc(db, "reports", id));
        if (!rSnap.exists()) { setAdminMsg(null); return; }
        const workspaceId = rSnap.data()?.workspaceId;
        if (!workspaceId) { setAdminMsg(null); return; }

        const reqCol = collection(db, "workspaces", workspaceId, "requestingInfo");
        const q = query(reqCol, where("incidentId", "==", id), limit(1));
        const qSnap = await getDocs(q);

        if (qSnap.empty) {
          setAdminMsg(null);
        } else {
          const d = qSnap.docs[0].data();
          setAdminMsg(d.text || null);
        }
      } catch (e) {
        console.error("Admin message fetch failed:", e);
        setAdminMsg(null);
      } finally {
        setAdminMsgLoading(false);
      }
    }
    fetchAdminMsg();
  }, [id]);

  function formatDate(ts) {
    if (!ts) return "";
    if (typeof ts === "string") return ts;
    if (ts.toDate) return ts.toDate().toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  }

  function getEvidenceArr() {
    if (!displayIncident?.evidence) return [];
    return Array.isArray(displayIncident.evidence) ? displayIncident.evidence : [displayIncident.evidence];
  }

  function renderPersonalInfo() {
    const reporter =
      reporterName ||
      displayIncident?.personalInfo?.reporterName ||
      displayIncident?.personalInfo?.yourName ||
      displayIncident?.userId ||
      "-";

    const witnessesDisplay = (() => {
      if (witnessNames && witnessNames.length) return witnessNames.join(", ");
      const w = displayIncident?.personalInfo?.witnesses;
      return Array.isArray(w) ? w.join(", ") : (w || "-");
    })();

    const injuredDisplay = (() => {
      if (injuredNames && injuredNames.length) return injuredNames.join(", ");
      const p = displayIncident?.personalInfo?.injuredPersons;
      return Array.isArray(p) ? p.join(", ") : (p || "-");
    })();

    const wasInjuredDisplay = displayIncident?.personalInfo?.wasInjured ? "Yes" : "No";

    const fields = [
      { label: "Reporter Name", value: reporter },
      { label: "Injured Person(s)", value: injuredDisplay },
      { label: "What was damaged", value: displayIncident?.personalInfo?.damagedItem },
      { label: "Type of Concern", value: displayIncident?.personalInfo?.concernType },
      { label: "Equipment Involved", value: displayIncident?.personalInfo?.equipmentInvolved },
      { label: "Lost Time Injury?", value: wasInjuredDisplay },
      { label: "Impact on Operation", value: displayIncident?.personalInfo?.impactOnOperation },
      { label: "Severity", value: displayIncident?.personalInfo?.severity },
      { label: "Witness/es", value: witnessesDisplay },
    ];

    const visibleFields = fields.filter((f) => f.value && String(f.value).trim() !== "" && f.value !== "-");

    return (
      <section className="bg-white rounded-lg mb-4">
        <div className="px-3 sm:px-4 py-2.5 border-gray-200 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-gray-900">Personal Information</h3>
          <button
            type="button"
            onClick={() => navigate(`/incident/${id}/edit/personal`)}
            className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
          >
            Edit
          </button>
        </div>

        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {visibleFields.map((field) => (
              <div key={field.label} className="min-w-0">
                <div className="text-[12px] font-medium text-gray-600">{field.label}</div>
                <div
                  className={`mt-1 text-sm font-medium truncate ${
                    field.label === "Lost Time Injury?" && field.value === "Yes" 
                      ? "text-red-600" 
                      : "text-gray-900"
                  }`}
                  title={String(field.value ?? "—")}
                >
                  {field.value?.toString().trim() || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-96">Loading...</div>;
  if (!displayIncident) return <div className="flex items-center justify-center h-96">No incident found.</div>;

  const type = displayIncident.incidentType || "injury";
  const icon = incidentTypeIcons[type] || hazardIcon;

  const resolvedLocationForIncident = (() => {
    const locIdOrText = String(displayIncident?.incidentDetails?.location ?? "").trim();
    const locReadable = String(displayIncident?.incidentDetails?.locationName ?? "").trim();
    return (
      (locIdOrText && locationNameById.get(locIdOrText)) ||
      (locReadable || locIdOrText) ||
      "-"
    );
  })();

  return (
    <div className="bg-white min-h-screen flex flex-col pb-20">
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
      <div className="overflow-y-auto flex-1 px-3 pt-3" style={{ paddingBottom: pendingChanges ? '80px' : '0' }}>
        {/* Admin Message */}
        {adminMsgLoading ? (
          <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-gray-600">
            Loading admin message…
          </div>
        ) : adminMsg ? (
          <div className="rounded-md border border-blue-400 bg-blue-50 p-3 text-sm leading-5">
            <p className="m-0 font-semibold text-black">Admin Message:</p>
            <p className="m-0 mt-1 whitespace-pre-line text-black">{adminMsg}</p>
          </div>
        ) : null}
        <br />
        
        {renderPersonalInfo()}
        <hr className="border-gray-400" />
        
        {/* Incident Details */}
        <section className="bg-white rounded-lg mb-4">
          <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-gray-900">Incident Details</h3>
            <button
              type="button"
              onClick={() => navigate(`/user-dashboard/edit-report/${id}`)}
              className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          </div>

          <div className="p-3 sm:p-4">
            <div className="flex items-stretch gap-4">
              <div className="flex-1">
                <div className="text-[12px] font-medium text-gray-600">Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {displayIncident?.incidentDetails?.date || formatDate(displayIncident?.createdAt)}
                </div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex-1">
                <div className="text-[12px] font-medium text-gray-600">Time</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {displayIncident?.incidentDetails?.time || "-"}
                </div>
              </div>
            </div>

            <div className="my-3 border-t border-gray-200" />

            <div className="flex items-stretch gap-4">
              <div className="flex-1">
                <div className="text-[12px] font-medium text-gray-600">Location</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {resolvedLocationForIncident}
                </div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="flex-1">
                <div className="text-[12px] font-medium text-gray-600">Severity</div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${(() => {
                      const sev =
                        displayIncident?.incidentDetails?.severity ||
                        displayIncident?.impactInfo?.severity ||
                        "";
                      const s = String(sev).toLowerCase();
                      if (s.startsWith("high")) return "bg-red-100 text-red-700";
                      if (s.startsWith("med")) return "bg-amber-100 text-amber-700";
                      if (s.startsWith("low")) return "bg-green-100 text-green-700";
                      return "bg-yellow-100 text-yellow-700";
                    })()}`}
                  >
                    {displayIncident?.incidentDetails?.severity ||
                      displayIncident?.impactInfo?.severity ||
                      "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="my-3 border-t border-[#9CA3AF]" />
        
        {/* AI Summary */}
        <div className="bg-white rounded-lg px-3 py-2 mb-4">
          <div className="text-xs text-gray-800 font-medium mb-1">AI Summary</div>
          <div className="text-sm text-gray-600 leading-snug">
            {displayIncident.incidentDetails?.description || "-"}
          </div>
          <a href="#" className="text-blue-700 text-xs font-medium mt-1 block text-right">
            View Full Description
          </a>
        </div>
        <hr className="border-gray-400" />
        
        {/* Audio Description */}
        {displayIncident.incidentDetails?.audioUrl && (
          <div className="mb-4">
            <div className="font-bold text-[16px] mb-2">Audio Description</div>
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Play className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="font-medium text-xs text-black truncate">
                  {displayIncident.incidentDetails.audioUrl.split("/").pop()}
                </div>
                <div className="text-xs text-gray-400">1 min 38 sec</div>
              </div>
            </div>
            <hr className="border-gray-400" />
          </div>
        )}

        <ImpactResponseCard
          emergency={Boolean(displayIncident?.impactInfo?.isEmergency)}
          impact={
            displayIncident?.incidentDetails?.severity ||
            displayIncident?.impactInfo?.severity ||
            "Minimal"
          }
          summary={
            displayIncident?.impactInfo?.actionsSummary ||
            displayIncident?.incidentDetails?.description ||
            ""
          }
          onEdit={() => console.log("Edit impact")}
          onViewFull={() => console.log("View full")}
          audio={
            displayIncident?.incidentDetails?.audioUrl
              ? {
                  url: displayIncident.incidentDetails.audioUrl,
                  name: displayIncident.incidentDetails.audioUrl.split("/").pop(),
                  durationLabel: "1 min 38 sec",
                }
              : undefined
          }
        />

        <hr className="border-gray-400 mb-5" />

        {/* Evidence */}
        {(() => {
          const arr = getEvidenceArr();
          return arr.length > 0 ? (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => navigate(`/user-dashboard/edit-report/${id}`)}
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 text-right"
              >
                Edit
              </button>
              <div className="font-bold text-[16px] mb-2 text-black">Evidence</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {arr.map((img, i) => (
                  <img
                    key={i}
                    src={typeof img === "string" ? img : img.url}
                    alt={"evidence" + i}
                    className="w-full h-48 object-contain rounded-lg border border-gray-200"
                  />
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Fixed Save Bar - Shows only when there are pending changes */}
      {pendingChanges && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-300 shadow-lg z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">You have unsaved changes</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-3">
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