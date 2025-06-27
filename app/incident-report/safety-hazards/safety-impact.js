"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentState, useIncidentDispatch } from "../../context/IncidentContext";
import VoiceRecorderModal from "../../components/VoiceRecorderModal";
import { Trash2, Volume2 } from "lucide-react";

export default function SafetyHazardImpactResponse() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  const [responseAction, setResponseAction] = useState("");
  const [equipment, setEquipment] = useState("");
  const [impactOps, setImpactOps] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");

  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showRecorder, setShowRecorder] = useState(true);

  const handleBack = () => navigate(-1);

  const handleNext = (e) => {
    e.preventDefault();

    dispatch({
      type: "SET_IMPACT",
      payload: {
        responseAction,
        equipment,
        impactOps,
        severity,
        voice: { url: audioUrl, transcript: transcriptText },
        description: audioUrl ? transcriptText : description,
      },
    });

    navigate("/safety-hazards/upload-evidence");
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
    <div className="min-h-screen bg-gray-50 px-1 py-7 flex flex-col items-center">
      <div className="w-full max-w-lg flex-1">

        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">Step 4 of 6</span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-2/6 rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-4">
          <button onClick={handleBack} className="text-2xl text-gray-800">←</button>
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">Impact & Response</h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please describe the impact of the incident and any actions taken in response.
        </p>

        <form onSubmit={handleNext} className="space-y-5 pb-32">

          {/* Response Action */}
          <div>
            <label className="block text-gray-700 mb-1">Response Actions Taken</label>
            {!audioUrl ? (
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-[#192C63]"
                placeholder="Write here…"
              />
            ) : (
              <div className="bg-gray-100 p-3 rounded-lg">
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

          {/* Voice Recording Option */}
          {showRecorder && (
            <>
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

          {/* Audio preview if submitted */}
          {audioUrl && (
            <div className="p-3 bg-gray-100 rounded flex justify-between items-center">
              <div className="flex items-center gap-2 text-black">
                <Volume2 />
                <div>
                  <p className="text-sm text-black">{audioName}</p>
                  <p className="text-xs text-gray-500">Audio uploaded</p>
                </div>
              </div>
              <button type="button" onClick={handleDeleteAudio}>
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
