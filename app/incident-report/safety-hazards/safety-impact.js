// src/incident-report/safety-hazard/ImpactResponse.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { useIncidentState, useIncidentDispatch } from "../../context/IncidentContext";

export default function SafetyHazardImpactResponse() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── Form fields ──────────────────────────
  const [responseAction, setResponseAction] = useState("");
  const [equipment, setEquipment]           = useState("");
  const [impactOps, setImpactOps]           = useState("");
  const [severity, setSeverity]             = useState("");

  // ─── Voice recording ──────────────────────
  const [showVoiceUI, setShowVoiceUI]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl]             = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

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

  // ─── Handlers ─────────────────────────────
  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_IMPACT",
      payload: {
        responseAction,
        equipment,
        impactOps,
        severity,
        voice: { url: audioUrl, transcript: transcriptText },
      },
    });
    navigate("/safety-hazards/upload-evidence"); // or wherever your next route is
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

      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      // 1) Transcribe
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      try {
        const res = await fetch("/api/speech", { method: "POST", body: form });
        const { transcription } = await res.json();
        setTranscriptText(transcription || "");
      } catch {
        setTranscriptText("");
      }
      // 2) Upload to S3 (your /api/aws)
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const { url } = await fetch("/api/aws", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName:    "voice.webm",
              fileType:    blob.type,
              base64:      reader.result,
              incidentType,
              category:    "voiceNotes",
              step:        "impact-response",
            }),
          }).then(r => r.json());
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
      <div className="w-full max-w-lg flex-1">

        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 4 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-2/6 rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-4">
          <button onClick={handleBack} className="text-2xl text-gray-800">←</button>
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">
            Impact & Response
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please describe the impact of the incident and any actions taken in response.
        </p>

        <form onSubmit={handleNext} className="space-y-5">

          {/* Response Action */}
          <div>
            <label className="block text-gray-700 mb-1">Response Action Taken</label>
            <textarea
              value={responseAction}
              onChange={e => setResponseAction(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-[#192C63]"
              placeholder="Write here…"
            />
          </div>

          {/* Or Divider */}
          <div className="flex items-center">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="px-3 text-gray-500">Or</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* Voice Note */}
          <div>
            <label className="block text-gray-700 mb-1">Record Voice Note</label>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className="w-full border border-gray-300 rounded-lg py-2 text-gray-800 hover:border-[#192C63] transition"
            >
              {isRecording ? "Stop Recording" : "Record…"}
            </button>

            {/* Transcript Preview */}
            {transcriptText && (
              <div className="mt-2 bg-gray-100 p-3 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Transcript</h3>
                <p className="text-gray-800 text-sm">{transcriptText}</p>
              </div>
            )}
          </div>

          {/* Equipment Involved */}
          <div>
            <label className="block text-gray-700 mb-1">Equipment Involved</label>
            <input
              type="text"
              value={equipment}
              onChange={e => setEquipment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-[#192C63]"
              placeholder="Write here…"
            />
          </div>

          {/* Impact on Operations */}
          <div>
            <label className="block text-gray-700 mb-1">Impact on Operations</label>
            <select
              value={impactOps}
              onChange={e => setImpactOps(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-[#192C63]"
            >
              <option value="">Select…</option>
              <option value="none">None</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </div>

          {/* Severity Level */}
          <div>
            <label className="block text-gray-700 mb-1">Severity Level</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-[#192C63]"
            >
              <option value="">Select…</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Next */}
          <button
            type="submit"
            className="w-full bg-[#192C63] text-white rounded-lg py-3 font-medium hover:bg-[#162050] transition disabled:bg-gray-400"
            disabled={!responseAction && !equipment}
          >
            Next
          </button>
        </form>
      </div>

      {/* Overlay UI */}
      {showVoiceUI && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center text-white">
          <div className="mb-6">
            <Mic className="h-16 w-16 animate-pulse" />
          </div>
          <p className="text-center px-4">
            {isRecording
              ? "🎙️ Listening..."
              : processing
              ? `⏳ Processing${dots}`
              : transcriptText
              ? "✔️ Done Listening"
              : "❌ Error"}
          </p>
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="mt-8 bg-white text-black px-6 py-2 rounded-full"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => setShowVoiceUI(false)}
              className="mt-8 bg-white text-black px-6 py-2 rounded-full"
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
