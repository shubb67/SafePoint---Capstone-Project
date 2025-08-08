"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, X } from "lucide-react";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import VoiceRecorderModal from "../../components/VoiceRecorderModal";
import { Trash2, Volume2 } from "lucide-react";

export default function NearMissIncidentDetails() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // ─── form state ─────────────────────────────
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // ─── Google Places autocomplete state (disabled for now) ─────────
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const locationInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const autocompleteService = useRef(null);
  const sessionToken = useRef(null);
  
  // Feature flag - set to true awaiting Google API key
  const ENABLE_GOOGLE_PLACES = false;

  // ─── voice recording state ─────────────────
  const [showVoiceUI, setShowVoiceUI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [audioName, setAudioName] = useState("");
  const [showRecorder, setShowRecorder] = useState(true);

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

  // Initialize Google Places Autocomplete Service (only when enabled)
  useEffect(() => {
    if (!ENABLE_GOOGLE_PLACES) return;
    
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
    } else {
      // Load Google Maps script if not already loaded
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
      };
      document.head.appendChild(script);
    }
  }, []);

  // Handle clicks outside of suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !locationInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Fetch Google Places suggestions (only when enabled)
  const fetchSuggestions = debounce((input) => {
    if (!ENABLE_GOOGLE_PLACES || !autocompleteService.current || input.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    const request = {
      input: input,
      sessionToken: sessionToken.current,
      // You can add more options here like:
      // types: ['establishment'], // Limit to businesses
      // componentRestrictions: { country: 'us' }, // Limit to specific country
      // bounds: new google.maps.LatLngBounds(...), // Limit to specific area
    };

    autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
      setIsLoadingSuggestions(false);
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setSuggestions(predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    });
  }, 300);

  const handleLocationInputChange = (e) => {
    const value = e.target.value;
    setLocationInput(value);
    setLocation(value); // For manual input, store the text directly
    
    if (ENABLE_GOOGLE_PLACES && value.trim()) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleLocationSelect = (place) => {
    if (ENABLE_GOOGLE_PLACES) {
      setLocationInput(place.description);
      setLocation(place.place_id); // Store Google Place ID when enabled
      // Reset session token after selection
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleLocationSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleLocationFocus = () => {
    if (locationInput.trim() !== "" && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleClearLocation = () => {
    setLocationInput("");
    setLocation("");
    setSuggestions([]);
    setShowSuggestions(false);
    locationInputRef.current?.focus();
  };

  const highlightMatch = (text, query) => {
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={index} className="font-semibold">{part}</span> : 
        part
    );
  };

  const handleBack = () => navigate(-1);
  
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_STEP_DATA",
      payload: {
        step: "incidentDetails",
        data: { 
          date, 
          time, 
          location: location, // This will be the manually entered address (or Google Place ID when enabled)
          locationName: locationInput, // Also store the readable name
          description, 
          audioUrl, 
          transcriptText 
        }
      }
    });
    navigate("/safety-hazards/safety-impact");
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
            Safety Hazard Details
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

          {/* location with manual input (Google Places disabled) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={locationInputRef}
                type="text"
                value={locationInput}
                onChange={handleLocationInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleLocationFocus}
                placeholder="Enter location address..."
                required={!location}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg
                           focus:border-[#192C63] focus:ring focus:ring-[#192C63]/30 text-black"
                autoComplete="off"
              />
              {locationInput && (
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Google Places suggestions dropdown (only shows when enabled) */}
            {ENABLE_GOOGLE_PLACES && showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto"
              >
                {isLoadingSuggestions && (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    Searching...
                  </div>
                )}
                {!isLoadingSuggestions && suggestions.map((place, index) => {
                  const isHighlighted = index === selectedIndex;
                  const mainText = place.structured_formatting.main_text;
                  const secondaryText = place.structured_formatting.secondary_text;

                  return (
                    <div
                      key={place.place_id}
                      onClick={() => handleLocationSelect(place)}
                      className={`px-4 py-3 cursor-pointer flex items-start gap-3 transition-colors ${
                        isHighlighted ? "bg-[#192C63]/10" : "hover:bg-gray-50"
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-black font-medium">
                          {highlightMatch(mainText, locationInput)}
                        </div>
                        {secondaryText && (
                          <div className="text-sm text-gray-500">
                            {secondaryText}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!isLoadingSuggestions && suggestions.length === 0 && locationInput.trim() && (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    No locations found
                  </div>
                )}
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