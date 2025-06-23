// src/incident-report/near-miss/NearMissImpact.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";

export default function NearMissImpact() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── Form state ───────────────────────────────
  const [concernType, setConcernType] = useState("");
  const [severity, setSeverity]       = useState("");
  const [response, setResponse]       = useState("");

  // ─── Voice‐note state ─────────────────────────
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [audioUrl, setAudioUrl]       = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

  // animated dots
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

  // ─── Handlers ────────────────────────────────
  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_IMPACT",
      payload: {
        typeOfConcern: concernType,
        severity,
        responseAction: response,
        voice: { url: audioUrl, transcript }
      }
    });
    navigate("/near-miss/upload-evidence");
  };

  // ─── Recording logic ─────────────────────────
  const startRecording = async () => {
    setShowVoiceUI(true);
    setIsRecording(true);
    setProcessing(false);
    setTranscript("");
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

      // 1) Transcribe
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      try {
        const res = await fetch("/api/speech", { method: "POST", body: form });
        const { transcription } = await res.json();
        setTranscript(transcription || "");
      } catch {
        setTranscript("");
      }

      // 2) Upload to S3
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const uploadRes = await fetch("/api/aws", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName:     "voice.webm",
              fileType:     blob.type,
              base64:       reader.result,
              incidentType,
              category:     "voiceNotes",
              step:         "impact-response",
            }),
          });
          const { url } = await uploadRes.json();
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
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col">
      <div className="w-full max-w-lg mx-auto flex flex-col flex-1">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 4 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-2/3 rounded-full transition-all" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="text-2xl text-gray-800"
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="flex-1 text-lg font-semibold text-gray-800 text-center">
            Impact & Response
          </h1>
          <div className="w-6" />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please describe the impact of the incident and any actions taken in response.
        </p>

        <form className="space-y-4 flex-1" onSubmit={handleNext}>
          {/* Type of Concern */}
          <div>
            <label htmlFor="concern" className="block text-sm font-medium text-gray-700 mb-1">
              Type of Concern
            </label>
            <select
              id="concern"
              value={concernType}
              onChange={e => setConcernType(e.target.value)}
              required
              className="block w-full border border-gray-300 rounded-md p-2 text-black"
            >
              <option value="">Select…</option>
              <option value="hazard">Hazard</option>
              <option value="procedure">Procedure</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
              Severity Level
            </label>
            <select
              id="severity"
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              required
              className="block w-full border border-gray-300 rounded-md p-2 text-black"
            >
              <option value="">Select…</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Response Action */}
          <div>
            <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-1">
              Response Action Taken
            </label>
            <textarea
              id="response"
              rows={4}
              placeholder="Write here…"
              value={response}
              onChange={e => setResponse(e.target.value)}
              className="block w-full border border-gray-300 rounded-md p-2 text-black"
            />
          </div>

          {/* Or Divider */}
          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300" />
            <span className="px-2 text-gray-500">Or</span>
            <div className="flex-grow border-t border-gray-300" />
          </div>

          {/* Voice Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Voice Note
            </label>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className="w-full border border-gray-300 rounded-md py-2 text-center, text-black"
            >
              {isRecording ? "Stop Recording" : "Record…"}
            </button>

            {transcript && (
              <div className="mt-2 p-2 bg-white border border-gray-200 rounded">
                <h3 className="text-sm font-semibold mb-1">Transcript</h3>
                <p className="text-sm text-gray-700">{transcript}</p>
              </div>
            )}
          </div>

          {/* Next Button */}
          <button
            type="submit"
            className="mt-4 w-full bg-[#192C63] text-white py-2 rounded-md hover:bg-[#162050] transition"
          >
            Next
          </button>
        </form>
      </div>

      {/* Overlay */}
      {showVoiceUI && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center text-white px-4">
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <Mic className="w-12 h-12 animate-pulse" />
          </div>
          <p className="text-center mb-4">
            {isRecording
              ? "🎙️ Listening..."
              : processing
              ? `⏳ Processing${dots}`
              : transcript
              ? "✔️ Done Listening"
              : "❌ Failed"}
          </p>
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="px-6 py-2 bg-white text-black rounded-md"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => setShowVoiceUI(false)}
              className="px-6 py-2 bg-white text-black rounded-md"
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
