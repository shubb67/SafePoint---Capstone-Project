// src/WorkplaceLocations.js
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/_utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default function WorkplaceLocations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [error, setError] = useState("");
  
  // Location fields - start with 5 empty locations
  const [locations, setLocations] = useState([
    { id: 1, name: "", isEmpty: true },
    { id: 2, name: "", isEmpty: true },
    { id: 3, name: "", isEmpty: true },
    { id: 4, name: "", isEmpty: true },
    { id: 5, name: "", isEmpty: true },
  ]);

  // Track if we should show error state
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        
        // Get workspace ID from localStorage
        const wsId = localStorage.getItem("currentWorkspaceSetup");
        if (wsId) {
          setWorkspaceId(wsId);
          
          // Check if workspace exists and user has permission
          try {
            const wsDoc = await getDoc(doc(db, "workspaces", wsId));
            if (!wsDoc.exists()) {
              navigate("/company-details");
            }
          } catch (error) {
            console.error("Error fetching workspace:", error);
            navigate("/company-details");
          }
        } else {
          navigate("/company-details");
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLocationChange = (index, value) => {
    const newLocations = [...locations];
    newLocations[index] = {
      ...newLocations[index],
      name: value,
      isEmpty: value.trim() === ""
    };
    setLocations(newLocations);
    
    // Clear error when user starts typing
    if (showError && value.trim() !== "") {
      setShowError(false);
      setError("");
    }
  };

  const addMoreLocations = () => {
    const newId = locations.length + 1;
    setLocations([
      ...locations,
      { id: newId, name: "", isEmpty: true },
      { id: newId + 1, name: "", isEmpty: true },
      { id: newId + 2, name: "", isEmpty: true },
      { id: newId + 3, name: "", isEmpty: true },
      { id: newId + 4, name: "", isEmpty: true },
    ]);
  };

  const validateLocations = () => {
    // Check if at least one location is filled
    const filledLocations = locations.filter(loc => loc.name.trim() !== "");
    
    if (filledLocations.length === 0) {
      setError("Add at least one location so your team can report incidents accurately.");
      setShowError(true);
      return false;
    }
    
    return true;
  };

  const handleNext = async () => {
    if (!validateLocations()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Filter out empty locations and format for database
      const validLocations = locations
        .filter(loc => loc.name.trim() !== "")
        .map((loc, index) => ({
          locationId: `loc_${Date.now()}_${index}`,
          name: loc.name.trim(),
          isMainLocation: index === 0, // First location is main
          createdAt: new Date().toISOString(),
        }));

      // Update workspace document
      await updateDoc(doc(db, "workspaces", workspaceId), {
        locations: validLocations,
        updatedAt: serverTimestamp(),
        setupStep: 3,
      });

      // Navigate to Step 4
      navigate("/workplace-passcodes");
    } catch (error) {
      console.error("Error saving locations:", error);
      setError("Failed to save locations. Please try again.");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left: Form Card */}
      <div className="col-span-12 lg:col-span-7 bg-[#16244c] flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-xl px-10 sm:px-14 py-8">
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="text-center text-xs text-gray-500 mb-2">
              Step 3 of 4
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-[#1E5BFF] h-1.5 rounded-full transition-all duration-300" style={{ width: "75%" }}></div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-[22px] font-semibold text-[#1a2b5c] mb-2">
            Add Your Workplace Locations
          </h1>
          <p className="text-center text-xs text-gray-600 mb-8 max-w-md mx-auto">
            Locations help your team select where they are located when reporting incidents. 
            Add the names of areas, buildings, or sites within your company. Or activities 
            you choose from a map site when reporting.
          </p>

          {/* Location Inputs */}
          <div className="space-y-3 mb-6">
            {locations.map((location, index) => (
              <div key={location.id}>
                <input
                  type="text"
                  value={location.name}
                  onChange={(e) => handleLocationChange(index, e.target.value)}
                  placeholder="Location Name"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 placeholder:text-gray-400 text-sm text-black focus:ring-[#1E5BFF] focus:border-transparent outline-none transition ${
                    showError && location.isEmpty ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Error Message */}
          {showError && error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg 
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                />
              </svg>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Add More Button */}
          <button
            onClick={addMoreLocations}
            className="w-full mb-4 text-sm text-[#1E5BFF] hover:underline font-medium"
          >
            + Add more locations
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full h-11 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Next"}
          </button>
        </div>
      </div>

      {/* Right: Image panel */}
      <div className="hidden lg:block col-span-5 relative">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('/assets/images/hero.png')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40" />
        <div className="absolute bottom-10 right-10">
          <p className="text-white text-4xl font-semibold leading-tight drop-shadow">
            Incident Reporting, <br /> Simplified.
          </p>
        </div>
      </div>
    </div>
  );
}