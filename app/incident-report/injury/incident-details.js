"use client";

import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { db } from "@/_utils/firebase";
import "../../styles/IncidentDetails.css";
export default function IncidentDetails() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── Form state ───────────────────────────────
  const [date, setDate]                   = useState("");
  const [time, setTime]                   = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [description, setDescription]     = useState("");
  const [locations, setLocations]         = useState([]);

  // ─── Recording UI state ───────────────────────
  const [showVoiceUI, setShowVoiceUI]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl]             = useState("");

  // Animated dots while processing
  const useDotAnimation = () => {
    const [dots, setDots] = useState("");
    useEffect(() => {
      if (!processing) return;
      const iv = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(iv);
    }, [processing]);
    return dots;
  };
  const processingDots = useDotAnimation();

  // MediaRecorder refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

  // Load location options
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "location"));
        setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    })();
  }, []);

  // Navigate back
  const handleBack = () => navigate(-1);

  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_DETAILS",
      payload: {
        date,
        time,
        locationId:    locationValue,
        description,
        transcriptText,
        audioUrl
      }
    });
    navigate("/impact-info");
  };

  // Start recording
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

      // Transcribe via your /api/speech route
      const speechForm = new FormData();
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      speechForm.append("audio", blob, "voice.webm");
      try {
        const r = await fetch("/api/speech", { method: "POST", body: speechForm });
        const { transcription } = await r.json();
        setTranscriptText(transcription || "");
      } catch {
        setTranscriptText("");
      }

      // Upload to S3 via our new API
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result;
        try {
          const resp = await fetch("/api/aws", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: "voice.webm",
              fileType: blob.type,
              base64,
              incidentType,              // from useIncidentState()
              category:   "voiceNotes",
              step:       "incident-details"
            })
          });
          const { url } = await resp.json();
          setAudioUrl(url);
        } catch (err) {
          console.error("Upload to S3 failed:", err);
        } finally {
          setProcessing(false);
        }
      };
    };

    recorder.start();
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  return (
    <div className="incident-details-container">
      {/* Progress Bar */}
      <div className="progress-section">
        <span className="progress-text">Step 3 of 6</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner step3"></div>
        </div>
      </div>

      {/* Header */}
      <div className="header-section">
        <button className="back-button" onClick={handleBack} aria-label="Go back">←</button>
        <h1 className="page-title">Incident Details</h1>
      </div>

      {/* Subtitle */}
      <p className="subtitle">
        To tailor SafePoint to your team, we just need a few details about the incident.
      </p>

      {/* Form */}
      <form className="form-section" onSubmit={handleNext}>
        {/* Date */}
        <div className="form-group full-width">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* Time */}
        <div className="form-group full-width">
          <label htmlFor="time">Time</label>
          <input
            type="time"
            id="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            required
          />
        </div>

        {/* Location */}
        <div className="form-group full-width">
          <label htmlFor="location">Location</label>
          <select
            id="location"
            value={locationValue}
            onChange={e => setLocationValue(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {locations.map(loc =>
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            )}
          </select>
        </div>

        {/* Description */}
        <div className="form-group full-width">
          <label htmlFor="description">Describe what happened</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Write here…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Voice Note */}
        <div className="form-group full-width">
          <label>Or Record Voice Note</label>
          <button
            type="button"
            className="record-button"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? "Stop Recording" : "Record…"}
          </button>

         {/* Transcript preview */}
       {transcriptText && (
          <div className="transcript-container">
            <h3 className="transcript-header">Transcript</h3>
            <div className="transcript-content">
              {transcriptText}
            </div>
          </div>
        )}
        </div>

        {/* Next */}
        <button type="submit" className="btn btn-primary next-button">
          Next
        </button>
      </form>

      {/* Overlay */}
      {showVoiceUI && (
        <div className="overlay fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center text-white">
          <div className="mic-circle mb-6">
            <Mic className="mic-icon animate-pulse" />
          </div>
          <p className="overlay-text text-center px-4">
            {isRecording
              ? "🎙️ Listening..."
              : processing
              ? `⏳ Processing${processingDots}`
              : transcriptText
              ? "✔️ Done Listening"
              : "❌ Failed"}
          </p>
          {/* When recording, show a Done button to stop */}
        {isRecording && (
           <button
             onClick={stopRecording}
             className="mt-8 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition"
           >
             Done
           </button>
         )}
          {!isRecording && !processing && (
            <button
              onClick={() => setShowVoiceUI(false)}
              className="mt-8 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition"
            >
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}
