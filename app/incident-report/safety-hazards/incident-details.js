
"use client";

import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { db } from "@/_utils/firebase";
import VoiceRecorderModal from "../../components/VoiceRecorderModal";
import { Trash2, Volume2 } from "lucide-react";


export default function SafetyHazardsIncidentDetails() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── form state ─────────────────────────────
  const [date, setDate]                   = useState("");
  const [time, setTime]                   = useState("");
  const [location, setLocation]           = useState("");
  const [description, setDescription]     = useState("");
  const [locations, setLocations]         = useState([]);

  // ─── voice recording state ─────────────────
  const [showVoiceUI, setShowVoiceUI]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl]             = useState("");
    const [audioName, setAudioName] = useState("");
    const [showRecorder, setShowRecorder] = useState(true);
      const [modalOpen, setModalOpen] = useState(false);
    

  // animated dots during processing
  const useDotAnimation = () => {
    const [dots, setDots] = useState("");
    useEffect(() => {
      if (!processing) return;
      const iv = setInterval(() => setDots(d => (d.length >= 3 ? "" : d + ".")), 500);
      return () => clearInterval(iv);
    }, [processing]);
    return dots;
  };
  const processingDots = useDotAnimation();

  // media recorder refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

  // fetch locations
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "location"));
        setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_STEP_DATA",
  payload: {
    step: "incidentDetails",
    data: { date, time, location: location, description, audioUrl, transcriptText }
  }
});
navigate("/safety-hazards/safety-impact");
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
            step: "incident-details",
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
        {/* progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 3 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-1/2 rounded-full" />
          </div>
        </div>

        {/* header */}
        <div className="flex items-center mb-4">
          <button onClick={handleBack} className="text-2xl text-gray-800" aria-label="Go back">
            ←
          </button>
          <h1 className="flex-1 text-xl font-semibold text-gray-900 text-center">
            Safety Hazard Details
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        {/* subtitle */}
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please share what happened, where it took place, and when.
        </p>

        {/* form */}
        <form onSubmit={handleNext} className="space-y-5">
          {/* date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date (DD/MM/YYYY)
            </label>
            <input
              type="date"
              placeholder="DD/MM/YYYY"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            />
          </div>

          {/* time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              placeholder="Select Time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            />
          </div>

          {/* location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            >
              <option value="">Select…</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

{!audioUrl && (
            <>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Describe what happened
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Write here…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#192C63] focus:border-[#192C63] text-black"
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
            className="w-full py-3 bg-[#192C63] text-white rounded-md font-medium mt-8 hover:bg-[#162050] focus:outline-none focus:ring-2 focus:ring-[#162050]"
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
