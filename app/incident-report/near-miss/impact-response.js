// src/incident-report/near-miss/NearMissImpact.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import VoiceRecorderModal from "../../components/VoiceRecorderModal";
import { Trash2, Volume2 } from "lucide-react";

export default function NearMissImpact() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── Form state ───────────────────────────────
  const [concernType, setConcernType] = useState("");
  const [severity, setSeverity]       = useState("");
  const [response, setResponse]       = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [audioName, setAudioName] = useState("voice.webm");
      const [processing, setProcessing]         = useState(false);



  // ─── Voice‐note state ─────────────────────────
    const [transcriptText, setTranscriptText] = useState("");
     const [description, setDescription] = useState("");
    const [audioUrl, setAudioUrl]             = useState("");
      const [showRecorder, setShowRecorder] = useState(true);



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
        voice: { url: audioUrl, transcriptText }
      }
    });
    navigate("/near-miss/upload-evidence");
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
              <option value="unsafeact">Unsafe Act</option>
              <option value="unsafearea">Unsafe Area</option>
              <option value="unsafeequipmentconditions">Unsafe Equipment Conditions</option>
              <option value="unsafeuseofequipment">Unsafe Use of Equipment</option>
              <option value="safetypolicyviolation">Safety Policy Violation</option>
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
