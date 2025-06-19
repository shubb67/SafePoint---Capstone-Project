"use client";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../context/IncidentContext";
import "../styles/IncidentType.css";

import injuryIcon         from "../assets/image/injury.png";
import propertyIcon       from "../assets/image/property-damage.png";
import nearMissIcon       from "../assets/image/danger.png";
import hazardIcon         from "../assets/image/safety-hazards.png";

const IncidentType = () => {
  const navigate = useNavigate();
  const location = useLocation();
const state = useIncidentState();
const dispatch = useIncidentDispatch();

  // If any previous steps passed data via location.state, grab it here:
  const previousState = location.state || {};

  const [selectedType, setSelectedType] = useState("");

  // 2) Helper to extract a URL string from the imported image object
  const imgUrl = (imgImport) => {
    if (!imgImport) return "";
    if (typeof imgImport === "object" && imgImport.src) {
      return imgImport.src;
    }
    if (typeof imgImport === "object" && imgImport.default) {
      return imgImport.default;
    }
    return imgImport;
  };

  // 3) Card click handler
  const handleCardClick = (typeKey) => {
    setSelectedType(typeKey);
    dispatch({ type: "SET_TYPE", payload: typeKey });
  };

  // 4) Navigate back one step
  const handleBack = () => {
    navigate(-1);
  };

  // 5) “Next” button: only if a type is selected
  const handleNext = () => {
    if (!selectedType) return;

    navigate("/personal-info", {
      state: {
        ...previousState,
        incidentType: selectedType,
      },
    });
  };

  useEffect(() => {
    console.log("Previous state (if any):", previousState);
  }, [previousState]);

  return (
    <div className="incident-type-container">
      {/* === 1. Progress Bar Section === */}
      <div className="progress-section">
        <span className="progress-text">Step 1 of 6</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner-1 step1"></div>
        </div>
      </div>

      {/* === 2. Header with Back Button & Title === */}
      <div className="header-section">
        <button
          type="button"
          className="back-button"
          onClick={handleBack}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="page-title">Incident Type</h1>
      </div>

      {/* === 3. Subtitle === */}
      <p className="subtitle">
        Please choose the most appropriate incident type to start your report.
      </p>

      {/* === 4. Four Selectable Cards === */}
      <div className="cards-wrapper">
        {/* Card 1: Injury & Loss of Life */}
        <div
          className={
            "incident-card" +
            (selectedType === "injury" ? " selected" : "")
          }
          onClick={() => handleCardClick("injury")}
        >
          <img
            src={imgUrl(injuryIcon)}
            alt="Injury & Loss of Life"
            className="card-icon"
          />
          <div className="card-text">
            <h2 className="card-title">Injury & Loss of Life</h2>
            <p className="card-description">
              This category covers any incidents where a person sustains
              physical harm.
            </p>
          </div>
        </div>

        {/* Card 2: Property Damage */}
        <div
          className={
            "incident-card" +
            (selectedType === "propertyDamage" ? " selected" : "")
          }
          onClick={() => handleCardClick("propertyDamage")}
        >
          <img
            src={imgUrl(propertyIcon)}
            alt="Property Damage"
            className="card-icon"
          />
          <div className="card-text">
            <h2 className="card-title">Property Damage</h2>
            <p className="card-description">
              This type involves damage to physical assets or property.
            </p>
          </div>
        </div>

        {/* Card 3: Near Miss */}
        <div
          className={
            "incident-card" +
            (selectedType === "nearMiss" ? " selected" : "")
          }
          onClick={() => handleCardClick("nearMiss")}
        >
          <img
            src={imgUrl(nearMissIcon)}
            alt="Near Miss"
            className="card-icon"
          />
          <div className="card-text">
            <h2 className="card-title">Near Miss</h2>
            <p className="card-description">
              Was there a risk of potential injury or damage that was avoided?
            </p>
          </div>
        </div>

        {/* Card 4: Safety Hazard */}
        <div
          className={
            "incident-card" +
            (selectedType === "safetyHazard" ? " selected" : "")
          }
          onClick={() => handleCardClick("safetyHazard")}
        >
          <img
            src={imgUrl(hazardIcon)}
            alt="Safety Hazard"
            className="card-icon"
          />
          <div className="card-text">
            <h2 className="card-title">Safety Hazard</h2>
            <p className="card-description">
              Unsafe conditions or situations that pose a risk to health and
              safety.
            </p>
          </div>
        </div>
      </div>

      {/* === 5. Next Button (disabled until a card is selected) === */}
      <button
        type="button"
        className={"btn btn-primary next-button" + (!selectedType ? " disabled" : "")}
        onClick={handleNext}
        disabled={!selectedType}
      >
        Next
      </button>
    </div>
  );
};

export default IncidentType;
