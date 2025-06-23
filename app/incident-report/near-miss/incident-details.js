
"use client";

import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { db } from "@/_utils/firebase";

export default function NearMissIncidentDetails() {
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
    data: { date, time, locationId: location, description, audioUrl, transcriptText }
  }
});
navigate("/near-miss/impact-response");
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
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setIsRecording(false);
      setProcessing(true);

      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      // send to your /api/speech endpoint
      const speechForm = new FormData();
      speechForm.append("audio", blob, "voice.webm");
      try {
        const r = await fetch("/api/speech", { method: "POST", body: speechForm });
        const { transcription } = await r.json();
        setTranscriptText(transcription || "");
      } catch {
        setTranscriptText("");
      }

      // upload to S3
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result;
        try {
          const resp = await fetch("/api/aws", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName:    "voice.webm",
              fileType:    blob.type,
              base64,
              incidentType,
              category:    "voiceNotes",
              step:        "incident-details",
            }),
          });
          const { url } = await resp.json();
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
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
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
            Near Miss Details
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

          {/* description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe what happened
            </label>
            <textarea
              rows={4}
              placeholder="Write here…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            />
          </div>

          {/* OR divider */}
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
                "w-full border border-gray-300 rounded-lg px-3 py-2 font-medium transition text-center" +
                (isRecording
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-700 hover:shadow-sm")
              }
            >
              {isRecording ? "Stop Recording" : "Record…"}
            </button>

            {/* transcript preview */}
            {transcriptText && (
              <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  Transcript
                </h3>
                <p className="text-gray-800 text-sm">{transcriptText}</p>
              </div>
            )}
          </div>

          {/* next */}
          <button
            type="submit"
            className="w-full py-3 bg-[#192C63] text-white rounded-lg font-medium
                       hover:bg-[#162050] transition"
          >
            Next
          </button>
        </form>
      </div>

      {/* voice overlay */}
      {showVoiceUI && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white px-4">
          <Mic className="h-16 w-16 animate-pulse mb-6" />
          <p className="text-lg text-center">
            {isRecording
              ? "🎙️ Listening..."
              : processing
              ? `⏳ Processing${processingDots}`
              : transcriptText
              ? "✔️ Done Listening"
              : "❌ Failed"}
          </p>
          <button
            onClick={isRecording ? stopRecording : () => setShowVoiceUI(false)}
            className="mt-8 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
