// src/incident-report/ImpactInfo.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Mic } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { db } from "@/_utils/firebase";
import VoiceRecorderModal from "../../components/VoiceRecorderModal";
import { Trash2, Volume2 } from "lucide-react";


export default function ImpactInfo() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { impactInfo, incidentType } = useIncidentState();
  const [modalOpen, setModalOpen] = useState(false);
  const [audioName, setAudioName] = useState("voice.webm");


  // Form state (prefilled if available)
  const [emergency, setEmergency]           = useState(impactInfo.emergency || "");
  const [impactOps, setImpactOps]           = useState(impactInfo.impactOps || "");
  const [severity, setSeverity]             = useState(impactInfo.severity || "");
  const [responseAction, setResponseAction] = useState(impactInfo.responseAction || "");

  // Voice recording state
  const [showVoiceUI, setShowVoiceUI]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
   const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl]             = useState("");
    const [showRecorder, setShowRecorder] = useState(true);


  // Animated dots while processing
  const useDots = () => {
    const [dots, setDots] = useState("");
    useEffect(() => {
      if (!processing) return;
      const iv = setInterval(() => setDots(d => (d.length >= 3 ? "" : d + ".")), 500);
      return () => clearInterval(iv);
    }, [processing]);
    return dots;
  };
  const dots = useDots();

  // Fetch locations if needed (not shown in UI)
  const [locations, setLocations] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading locations:", err);
      }
    })();
  }, []);

  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_IMPACT",
      payload: {
        emergency,
        impactOps,
        severity,
        responseAction,
        voice: { url: audioUrl, transcript: transcriptText },
      },
    });
    navigate("/injury/evidence");
  };

  const handleModalSubmit = ({ audioBlob, transcriptText }) => {
    setTranscriptText(transcriptText);

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64 = reader.result;
      try {
        const res = await fetch("/api/aws", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "voice.webm",
            fileType: audioBlob.type,
            base64,
            incidentType,
            category: "voiceNotes",
            step: "impact-info",
          }),
        });
        const { url } = await res.json();
        setAudioUrl(url);
        setAudioName("voice.webm");
        setShowRecorder(false);
      } catch (err) {
        console.error("S3 upload failed:", err);
      }
    };

    setModalOpen(false);
  };

  const handleDeleteAudio = () => {
    setAudioUrl("");
    setAudioName("");
    setTranscriptText("");
    setShowRecorder(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 4 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-2/3 rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-4">
          <button onClick={handleBack} className="text-2xl text-gray-800" aria-label="Go back">
            ←
          </button>
          <h1 className="flex-1 text-xl font-semibold text-gray-900 text-center">
            Impact & Response
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please describe the impact of the incident and any actions taken in response.
        </p>

        {/* Form */}
        <form onSubmit={handleNext} className="space-y-5">
          {/* Emergent Response */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Was emergent response activated?
            </label>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setEmergency("yes")}
                className={
                  "flex-1 py-2 border rounded-lg text-center font-medium transition " +
                  (emergency === "yes"
                    ? "bg-[#192C63] text-white border-[#192C63]"
                    : "bg-white text-gray-700 border-gray-300 hover:shadow-sm")
                }
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setEmergency("no")}
                className={
                  "flex-1 py-2 border rounded-lg text-center font-medium transition " +
                  (emergency === "no"
                    ? "bg-[#3B82F6] text-white "
                    : "bg-white text-gray-700 border-gray-300 hover:shadow-sm")
                }
              >
                No
              </button>
            </div>
          </div>

          {/* Impact on Operations */}
          <div>
            <label htmlFor="impactOps" className="block text-sm font-medium text-gray-700 mb-1">
              Impact on Operations
            </label>
            <select
              id="impactOps"
              value={impactOps}
              onChange={e => setImpactOps(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2
                         focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            >
              <option value="">Select…</option>
              <option value="none">None</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </div>

          {/* Severity Level */}
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
              Severity Level
            </label>
            <select
              id="severity"
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2
                         focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            >
              <option value="">Select…</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

 {!audioUrl && (
            <>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Response Actions Taken
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Write here…"
                  value={responseAction}
                  onChange={e => setResponseAction(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] text-black"
                />
              </div>

              <div className="flex items-center">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="px-3 text-gray-500">Or</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Don’t want to type? Just speak.
                </label>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="w-full px-4 py-3 gap-[10px] text-white bg-gradient-to-r from-[#192C63] to-[#006EFE] rounded-[5px] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#192C63]"
                >
                  Describe by Voice
                </button>
              </div>
            </>
          )}

          {audioUrl && (
            <div className="p-3 bg-gray-100 rounded flex justify-between items-center">
              <div className="flex items-center gap-2 text-black">
                <Volume2 />
                <div>
                  <p className="text-sm text-black">{audioName}</p>
                  <p className="text-xs text-gray-500">Audio uploaded</p>
                </div>
              </div>
              <button onClick={handleDeleteAudio}>
                <Trash2 className="text-red-500" />
              </button>
            </div>
          )}
              
        
          <button
            type="submit"
            className="w-full py-3 bg-[#3B82F6] text-white rounded-md font-medium mt-8 hover:bg-[#162050] focus:outline-none focus:ring-2 focus:ring-[#162050]"
          >
            Next
          </button>
         
        </form>
      </div>

      <VoiceRecorderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
