// src/incident-report/property-damage/ImpactResponse.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { Mic } from "lucide-react";

export default function ImpactResponse() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── Local form state ─────────────────
  const [damaged, setDamaged]           = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [impactOps, setImpactOps]       = useState("");
  const [severity, setSeverity]         = useState("");
  const [responseAction, setResponseAction] = useState("");

  // ─── Voice note UI state ─────────────
  const [showVoiceUI, setShowVoiceUI]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl]             = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

  // animated dots while processing
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

  // ─── Navigation & submit ─────────────
  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    // stash into context
    dispatch({
      type: "SET_IMPACT",
      payload: {
        damaged,
        estimatedValue,
        impactOps,
        severity,
        responseAction,
        voice: {
          url: audioUrl,
          transcript: transcriptText
        }
      }
    });
    navigate("/property-damage/upload-evidence");
  };

  // ─── Recording logic (identical to your other steps) ───
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
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      setIsRecording(false);
      setProcessing(true);

      // 1) transcribe
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

      // 2) upload to S3
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result;
        try {
          const res = await fetch("/api/aws", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName:     "voice.webm",
              fileType:     blob.type,
              base64,
              incidentType, 
              category:     "voiceNotes",
              step:         "impact-response",
              folderPath:   `incidentReport/${incidentType}/impact-response/voiceNotes`
            })
          });
          const { url } = await res.json();
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
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">
            Impact & Response
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please describe the impact of the incident and any actions taken in response.
        </p>

        <form onSubmit={handleNext} className="space-y-4">
          {/* What was damaged? */}
          <div>
            <label htmlFor="damaged" className="block text-sm font-medium text-gray-700">
              What was damaged?
            </label>
            <input
              id="damaged"
              type="text"
              value={damaged}
              onChange={e => setDamaged(e.target.value)}
              placeholder="Write here…"
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#192C63] text-black"
              required
            />
          </div>

          {/* Estimated Value */}
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700">
              Estimated Value?
            </label>
            <input
              id="value"
              type="text"
              value={estimatedValue}
              onChange={e => setEstimatedValue(e.target.value)}
              placeholder="Write here…"
              className="mt-1 block text-black w-full border border-gray-300 rounded-lg px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#192C63]"
              required
            />
          </div>

          {/* Impact on Operations */}
          <div>
            <label htmlFor="impactOps" className="block text-sm font-medium text-gray-700">
              Impact on Operations
            </label>
            <select
              id="impactOps"
              value={impactOps}
              onChange={e => setImpactOps(e.target.value)}
              className="mt-1 block text-black w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#192C63]"
              required
            >
              <option value="">Select…</option>
              <option value="none">None</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </div>

          {/* Severity Level */}
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
              Severity Level
            </label>
            <select
              id="severity"
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="mt-1 block text-black w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#192C63]"
              required
            >
              <option value="">Select…</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Response Action Taken */}
          <div>
            <label htmlFor="response" className="block text-sm font-medium text-gray-700">
              Response Action Taken?
            </label>
            <textarea
              id="response"
              rows={4}
              value={responseAction}
              onChange={e => setResponseAction(e.target.value)}
              placeholder="Write here…"
              className="mt-1 block w-full text-black border border-gray-300 rounded-lg px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#192C63]"
            />
          </div>

          {/* Or divider */}
          <div className="flex items-center my-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="mx-2 text-gray-500">Or</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          {/* Record Voice Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Record Voice Note
            </label>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-center text-gray-700 hover:bg-gray-100"
            >
              🎤 {isRecording ? "Stop Recording" : "Record…"}
            </button>

            {transcriptText && (
              <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-800">
                <strong>Transcript:</strong> {transcriptText}
              </div>
            )}
          </div>

          {/* Next button */}
          <button
            type="submit"
            disabled={!damaged || !estimatedValue || !impactOps || !severity}
            className={`w-full py-3 rounded-lg font-medium text-white transition ${
              damaged && estimatedValue && impactOps && severity
                ? "bg-[#192C63] hover:bg-[#162050]"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Next
          </button>
        </form>
      </div>

      {/* Overlay */}
      {showVoiceUI && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center text-white p-4">
          <div className="bg-gray-800 p-6 rounded-full mb-6">
            <Mic className="w-12 h-12 animate-pulse" />
          </div>
          <p className="text-center text-lg px-4">
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
            className="mt-8 bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200"
          >
            {isRecording ? "Stop" : "Close"}
          </button>
        </div>
      )}
    </div>
  );
}
