"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, X, Trash2, Volume2 } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import VoiceRecorderModal from "../../components/VoiceRecorderModal";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "@/_utils/firebase";

export default function NearMissIncidentDetails() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── form state ─────────────────────────────
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");        // store locationId (or text)
  const [description, setDescription] = useState("");

  // ─── location dropdown (Firestore) ─────────
  const [locations, setLocations] = useState([]);      // [{locationId, name, isMainLocation,...}]
  const [locationInput, setLocationInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // ─── voice recording state ─────────────────
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [audioName, setAudioName] = useState("");
  const [showRecorder, setShowRecorder] = useState(true);

  // Feature flag (Google Places disabled)
  const ENABLE_GOOGLE_PLACES = false;

  // Fetch workspace locations for current user
  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const wsId = userSnap.data()?.workspaceId;
        if (!wsId) return;

        const wsSnap = await getDoc(doc(db, "workspaces", wsId));
        if (wsSnap.exists()) {
          const locs = (wsSnap.data()?.locations ?? [])
            .filter(Boolean)
            .map(l => ({
              locationId: l.locationId ?? "",
              name: (l.name ?? "").trim(),
              isMainLocation: !!l.isMainLocation,
            }))
            .filter(l => l.name);
          // sort: main first, then A→Z
          locs.sort((a, b) => {
            if (a.isMainLocation && !b.isMainLocation) return -1;
            if (!a.isMainLocation && b.isMainLocation) return 1;
            return a.name.localeCompare(b.name);
          });
          setLocations(locs);
        }
      } catch (err) {
        console.error("Failed to load locations:", err);
      }
    })();
  }, []);

  // Filtered list based on input
  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(locationInput.trim().toLowerCase())
  );

  const handleInputChange = (e) => {
    setLocationInput(e.target.value);
    setShowDropdown(true);
    setSelectedIndex(-1);
    // While typing free text, keep plain text in `location`
    setLocation(e.target.value);
  };

  const handleClear = () => {
    setLocationInput("");
    setLocation("");
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelect = (loc) => {
    setLocationInput(loc.name);
    setLocation(loc.locationId || loc.name); // prefer id, fallback to name
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredLocations.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredLocations.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev <= 0 ? filteredLocations.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(filteredLocations[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const onDocClick = (e) => {
      const inInput = inputRef.current && inputRef.current.contains(e.target);
      const inDrop = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inInput && !inDrop) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleBack = () => navigate(-1);

  const handleNext = (e) => {
    e.preventDefault();
    dispatch({
      type: "SET_STEP_DATA",
      payload: {
        step: "incidentDetails",
        data: {
          date,
          time,
          location,             // id or text
          locationName: locationInput,
          description,
          audioUrl,
          transcriptText
        }
      }
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

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={i} className="font-semibold">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">Step 3 of 6</span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-1/2 rounded-full" />
          </div>
        </div>

        {/* header */}
        <div className="flex items-center mb-4">
          <button onClick={handleBack} className="text-2xl text-gray-800" aria-label="Go back">←</button>
          <h1 className="flex-1 text-xl font-semibold text-gray-900 text-center">Incident Details</h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please share what happened, where it took place, and when.
        </p>

        <form onSubmit={handleNext} className="space-y-5">
          {/* date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date (DD/MM/YYYY)</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            />
          </div>

          {/* time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
            />
          </div>

          {/* location dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={locationInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowDropdown(true)}
                placeholder="Select workspace location..."
                required
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
                autoComplete="off"
              />
              {locationInput && (
                <button type="button" onClick={handleClear} className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto"
              >
                {filteredLocations.length === 0 && (
                  <div className="px-4 py-3 text-gray-500 text-sm">No locations available</div>
                )}
                {filteredLocations.map((loc, idx) => {
                  const isHighlighted = idx === selectedIndex;
                  return (
                    <div
                      key={loc.locationId || loc.name}
                      onClick={() => handleSelect(loc)}
                      className={`px-4 py-3 cursor-pointer flex items-start gap-3 transition-colors ${
                        isHighlighted ? "bg-[#192C63]/10" : "hover:bg-gray-50"
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-black font-medium">
                          {highlightMatch(loc.name, locationInput)}
                        </div>
                        {loc.isMainLocation && (
                          <div className="text-xs text-gray-500">Main location</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  Don&apos;t want to type? Just speak.
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
              <button type="button" onClick={handleDeleteAudio}>
                <Trash2 className="text-red-500" />
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#3B82F6] text-white rounded-md font-medium mt-8 hover:bg-[#162050] focus:outline-none focus:ring-2 focus:ring-[#162050]"
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
