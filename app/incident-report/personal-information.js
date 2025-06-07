import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/PersonalInfo.css";

const PersonalInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1) State for each field
  const [yourName, setYourName] = useState("");
  const [wasInjured, setWasInjured] = useState(""); // "yes" or "no"
  const [injuredPersons, setInjuredPersons] = useState("");
  const [witnesses, setWitnesses] = useState("");

  // If you passed previous state from Step 1, grab it:
  const previousState = location.state || {};

  // 2) Back button
  const handleBack = () => {
    navigate(-1);
  };

  // 3) Next button: merge this step’s data into location.state
  const handleNext = () => {
    navigate("/incident-photos", {
      state: {
        ...previousState,
        yourName,
        wasInjured,
        injuredPersons,
        witnesses,
      },
    });
  };

  return (
    <div className="personal-container">
      {/* === Progress Bar === */}
      <div className="progress-section">
        <span className="progress-text">Step 2 of 6</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner step2"></div>
        </div>
      </div>

      {/* === Header w/ Back & Title === */}
      <div className="header-section">
        <button
          type="button"
          className="back-button"
          onClick={handleBack}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="page-title">Personal Information</h1>
      </div>

      {/* === Subtitle === */}
      <p className="subtitle">
        To tailor SafePoint to your team, we just need a few details about the incident.
      </p>

      {/* === Form Fields === */}
      <form className="form-section" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        {/* Your Name Dropdown */}
        <div className="form-group full-width">
          <label htmlFor="yourName">Your Name</label>
          <select
            id="yourName"
            name="yourName"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            required
          >
            <option value="">Select…</option>
            <option value="alice">Alice Johnson</option>
            <option value="bob">Bob Smith</option>
            <option value="charlie">Charlie Nguyen</option>
            {/* Add more names as needed */}
          </select>
        </div>

        {/* Was anyone injured? Toggle */}
        <div className="form-group full-width">
          <label>Was anyone injured?</label>
          <div className="toggle-group">
            <button
              type="button"
              className={"toggle-button" + (wasInjured === "yes" ? " selected" : "")}
              onClick={() => setWasInjured("yes")}
            >
              Yes
            </button>
            <button
              type="button"
              className={"toggle-button" + (wasInjured === "no" ? " selected" : "")}
              onClick={() => setWasInjured("no")}
            >
              No
            </button>
          </div>
        </div>

        {/* Injured Person/s Dropdown */}
        <div className="form-group full-width">
          <label htmlFor="injuredPersons">Injured Person/s</label>
          <select
            id="injuredPersons"
            name="injuredPersons"
            value={injuredPersons}
            onChange={(e) => setInjuredPersons(e.target.value)}
            required={wasInjured === "yes"} 
            disabled={wasInjured !== "yes"}
          >
            <option value="">Select…</option>
            <option value="alice">Alice Johnson</option>
            <option value="bob">Bob Smith</option>
            <option value="charlie">Charlie Nguyen</option>
            {/* Populate dynamically if needed */}
          </select>
        </div>

        {/* Witness/es Dropdown */}
        <div className="form-group full-width">
          <label htmlFor="witnesses">Witness/es</label>
          <select
            id="witnesses"
            name="witnesses"
            value={witnesses}
            onChange={(e) => setWitnesses(e.target.value)}
            required
          >
            <option value="">Select…</option>
            <option value="alice">Alice Johnson</option>
            <option value="bob">Bob Smith</option>
            <option value="charlie">Charlie Nguyen</option>
          </select>
        </div>

        {/* Next Button */}
        <button
          type="submit"
          className="btn btn-primary next-button"
          disabled={
            !yourName ||
            !wasInjured ||
            (wasInjured === "yes" && !injuredPersons) ||
            !witnesses
          }
        >
          Next
        </button>
      </form>
    </div>
  );
};

export default PersonalInfo;
