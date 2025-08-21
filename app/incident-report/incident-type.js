// src/IncidentType.js
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../context/IncidentContext";
import { useMemo } from "react";


// import your existing images (same paths you used in other files)
import injuryIcon from "../assets/image/injury.png";
import propertyIcon from "../assets/image/property-damage.png";
import nearMissIcon from "../assets/image/danger.png";
import hazardIcon from "../assets/image/safety-hazards.png";

export default function IncidentType() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useIncidentDispatch();
  const previous = location.state || {};

  const [selectedType, setSelectedType] = useState("");
  const state = useIncidentState();


  const handleCardClick = (typeKey) => {
    setSelectedType(typeKey);
    dispatch({ type: "SET_TYPE", payload: typeKey });
  };

    // Helpers
    const imgUrl = (img) => (img && (img.src || img.default)) || img || "";
    const incidentTypeIcons = useMemo(
      () => ({
        injury: injuryIcon,
        safetyHazard: hazardIcon,
        propertyDamage: propertyIcon,
        nearMiss: nearMissIcon,
      }),
      []
    );

  const handleBack = () => navigate(-1);

  const handleNext = () => {
    if (!selectedType) return;
       const routeMap = {
     injury:         "/injury/personal-info",
     propertyDamage: "/property-damage/personal-info",
     nearMiss:       "/near-miss/personal-info",
     safetyHazard:   "/safety-hazards/personal-info",
   };


    const firstStep = routeMap[selectedType] || "/personal-info";
    navigate(firstStep, {
      state: { ...previous, incidentType: selectedType },
    });
  };

  useEffect(() => {
    console.log("Previous state:", previous);
  }, [previous]);

  // centralize card config (bg + icon)
  const CARD_CONFIG = {
    injury: {
      bgColor: "bg-red-500",
      title: "On-site Injury",
      desc:
        "This category covers any incidents where a person sustains physical harm.",
      icon: injuryIcon,
    },
    propertyDamage: {
      bgColor: "bg-orange-500",
      title: "Property Damage",
      desc: "This type involves damage to physical assets or property.",
      icon: propertyIcon,
    },
    nearMiss: {
      bgColor: "bg-yellow-400",
      title: "Near Miss",
      desc:
        "A risk of potential injury or damage that was avoided.",
      icon: nearMissIcon,
    },
    safetyHazard: {
      bgColor: "bg-blue-500",
      title: "Safety Hazard",
      desc:
        "Unsafe conditions or situations that pose a risk to health and safety.",
      icon: hazardIcon,
    },
  };

  const cardOrder = ["injury", "propertyDamage", "nearMiss", "safetyHazard"];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Progress */}
        <div className="mb-8">
          <span className="block text-center text-gray-500 text-sm mb-3">
            Step 1 of 5
          </span>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-1/5 rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="text-3xl text-gray-700 font-light"
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="flex-1 text-2xl font-semibold text-gray-900 text-center">
            Incident Type
          </h1>
          <div style={{ width: "2rem" }} />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 mb-8 px-4">
          Select the type of incident to help us respond appropriately.
        </p>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {cardOrder.map((key) => {
            const { bgColor, title, desc, icon } = CARD_CONFIG[key];
            const isSelected = selectedType === key;
            return (
              <div
                key={key}
                onClick={() => handleCardClick(key)}
                role="button"
                aria-pressed={isSelected}
                  className={`flex items-center border rounded-lg cursor-pointer transition-all bg-white shadow-sm hover:shadow-md ${
                selectedType === key ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {/* Icon box */}
                <div
                  className="flex items-center justify-center w-26 h-26 rounded-l-lg"
                >
                  {/* Actual icon image */}
                  <img
                        src={imgUrl(icon)}
                        className="w-26 h-26 object-contain text-white rounded-l-lg"
                      />
                </div>

                <div className="flex-1 p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4">
  <button
    onClick={handleNext}
    disabled={!selectedType}
    className={`w-full py-4 rounded-lg font-medium text-lg transition-all ${
      selectedType
        ? "bg-[#3B82F6] text-white hover:bg-gray-700"
        : "bg-gray-200 text-gray-400 cursor-not-allowed"
    }`}
  >
    Next
  </button>
      </div>
      </div>
    </div>
  );
}
