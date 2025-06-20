// src/incident-report/ImpactInfo.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Mic } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { db } from "@/_utils/firebase";

export default function ImpactInfo() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { impactInfo, incidentType } = useIncidentState();

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
  const [audioUrl, setAudioUrl]             = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

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

  // S3 upload helper
  const uploadToS3 = async ({ fileName, fileType, base64, category, step }) => {
    const res = await fetch("/api/aws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileType, base64, incidentType, category, step }),
    });
    const { url } = await res.json();
    return url;
  };

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
    navigate("/evidence");
  };

  const startRecording = async () => {
    setShowVoiceUI(true);
    setIsRecording(true);
    setProcessing(false);
    setTranscriptText("");
    setAudioUrl("");
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => {
      if (e.data.size) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setIsRecording(false);
      setProcessing(true);

      // Transcription
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      try {
        const r = await fetch("/api/speech", { method: "POST", body: form });
        const { transcription } = await r.json();
        setTranscriptText(transcription || "");
      } catch {
        setTranscriptText("");
      }

      // S3 Upload
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const url = await uploadToS3({
            fileName: "voice.webm",
            fileType: blob.type,
            base64:   reader.result,
            category: "voiceNotes",
            step:     "impact-info",
          });
          setAudioUrl(url);
        } catch (err) {
          console.error("Upload failed:", err);
        } finally {
          setProcessing(false);
        }
      };
    };

    recorder.start();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
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
                    ? "bg-[#192C63] text-white border-[#192C63]"
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

          {/* Response Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Action Taken
            </label>
            <textarea
              rows={4}
              placeholder="Write here…"
              value={responseAction}
              onChange={e => setResponseAction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2
                         focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            />
          </div>

          {/* OR Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="px-3 text-gray-500">Or</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* record voice note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Voice Note
            </label>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={
                "w-full border border-gray-300 rounded-lg px-3 py-2 text-center font-medium transition " +
                (isRecording
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-700 hover:shadow-sm")
              }
            >
              {isRecording ? "Stop Recording" : "Record…"}
            </button>

            {/* Transcript Preview */}
            {transcriptText && (
              <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  Transcript
                </h3>
                <p className="text-gray-800 text-sm">{transcriptText}</p>
              </div>
            )}
          </div>

          {/* Next Button */}
          <button
            type="submit"
            className="w-full py-3 bg-[#192C63] text-white rounded-lg font-medium
                       hover:bg-[#162050] transition"
          >
            Next
          </button>
        </form>
      </div>

      {/* Overlay UI */}
      {showVoiceUI && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white px-4">
          <Mic className="h-16 w-16 animate-pulse mb-6" />
          <p className="text-lg text-center">
            {isRecording
              ? "🎙️ Listening..."
              : processing
              ? `⏳ Processing${dots}`
              : transcriptText
              ? "✔️ Done Listening"
              : "❌ Failed"}
          </p>
          <button
            onClick={isRecording ? stopRecording : () => setShowVoiceUI(false)}
            className="mt-8 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition"
          >
            {isRecording ? "Done" : "Close"}
          </button>
        </div>
      )}
    </div>
  );
}
