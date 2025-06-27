
// src/incident-report/IncidentDetails.js
"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { db } from "@/_utils/firebase";
import VoiceRecorderModal from "../../components/VoiceRecorderModal";
import { Trash2, Volume2 } from "lucide-react";

export default function IncidentDetails() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [locations, setLocations] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [showRecorder, setShowRecorder] = useState(true);

  const humanFileSize = (bytes) => {
  const mb = bytes / 1024 / 1024;
  return mb < 0.1
    ? `${(mb * 1024).toFixed(1)} KB`
    : `${mb.toFixed(1)} MB`;
};

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

  const handleBack = () => navigate(-1);

  const handleNext = (e) => {
    e.preventDefault();
    dispatch({
      type: "SET_DETAILS",
      payload: { date, time, location, description, transcriptText, audioUrl },
    });
    navigate("/injury/impact-info");
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 3 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-1/2 rounded-full" />
          </div>
        </div>

        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="text-2xl text-gray-800 focus:outline-none"
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="flex-1 text-xl font-semibold text-gray-900 text-center">
            Incident Details
          </h1>
          <div className="w-6" />
        </div>

        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please share what happened, where it took place, and when.
        </p>

        <form className="space-y-6" onSubmit={handleNext}>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#192C63] focus:border-[#192C63] text-black"
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#192C63] focus:border-[#192C63] text-black"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              id="location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#192C63] focus:border-[#192C63] text-black"
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
