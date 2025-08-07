// src/IncidentType.js
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../context/IncidentContext";

import injuryIcon   from "../assets/image/injury.png";
import propertyIcon from "../assets/image/property-damage.png";
import nearMissIcon from "../assets/image/danger.png";
import hazardIcon   from "../assets/image/safety-hazards.png";

export default function IncidentType() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useIncidentDispatch();
  const previous = location.state || {};

  const [selectedType, setSelectedType] = useState("");
  const state = useIncidentState();

  const imgUrl = img => (img && (img.src || img.default)) || img || "";

  const handleCardClick = typeKey => {
    setSelectedType(typeKey);
    dispatch({ type: "SET_TYPE", payload: typeKey });
  };

  const handleBack = () => navigate(-1);

  const handleNext = () => {
    if (!selectedType) return;
       const routeMap = {
     injury:         "/injury/personal-info",
     propertyDamage: "/property-damage/personal-info",
     nearMiss:       "/near-miss/personal-info",
     safetyHazard:   "/safety-hazards/personal-info",
   };

   // fall back to personal-info if none matched
   const firstStep = routeMap[selectedType] || "/personal-info";
   navigate(firstStep, {
     state: { ...previous, incidentType: selectedType },
   });
  };

  useEffect(() => {
    console.log("Previous state:", previous);
  }, [previous]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 1 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-1/6 rounded-full" />
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
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">
            Incident Type
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Please choose the most appropriate incident type to start your report.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[
            {
              key: "injury",
              icon: injuryIcon,
              title: "On-site Injury",
              desc: "This category covers any incidents where a person sustains physical harm.",
            },
            {
              key: "propertyDamage",
              icon: propertyIcon,
              title: "Property Damage",
              desc: "This type involves damage to physical assets or property.",
            },
            {
              key: "nearMiss",
              icon: nearMissIcon,
              title: "Near Miss",
              desc: "Was there a risk of potential injury or damage that was avoided?",
            },
            {
              key: "safetyHazard",
              icon: hazardIcon,
              title: "Safety Hazard",
              desc: "Unsafe conditions or situations that pose a risk to health and safety.",
            },
          ].map(({ key, icon, title, desc }) => (
            <div
              key={key}
              onClick={() => handleCardClick(key)}
              className={
                "flex items-start p-4 border rounded-lg cursor-pointer transition shadow-sm " +
                (selectedType === key
                  ? "border-[#192C63] bg-blue-50"
                  : "border-gray-300 hover:shadow-md")
              }
            >
              <img
                src={imgUrl(icon)}
                alt={title}
                className="w-16 h-16 flex-shrink-0 mr-4 object-contain"
              />
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                <p className="text-sm text-gray-600 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={!selectedType}
          className={
            "w-full py-3 rounded-lg text-white font-medium transition " +
            (selectedType
              ? "bg-[#192C63] hover:bg-[#162050]"
              : "bg-gray-400 cursor-not-allowed")
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}
