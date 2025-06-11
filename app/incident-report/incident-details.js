"use client";
import { collection, getDocs } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/IncidentDetails.css";
import { db } from "@/_utils/firebase"; // Ensure you have the correct Firebase config

const IncidentDetails = () => {
  const navigate = useNavigate();
  const previousState = useLocation().state || {};

  // Form state
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
const [locations, setLocations] = useState([]);
  const [description, setDescription] = useState("");
  const [recording, setRecording] = useState(false);

  // Back and Next handlers
  const handleBack = () => navigate(-1);
  useEffect(() => {
  const loadLocations = async () => {
    const snapshot = await getDocs(collection(db, "location"));
    setLocations(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  };
  loadLocations();
}, []);

  const handleNext = (e) => {
    e.preventDefault();
    navigate("/step-4", {
      state: {
        ...previousState,
        date,
        time,
        locations,
        description,
        // recording data would go here
      },
    });
  };

  return (
    <div className="incident-details-container">
      {/* Progress Bar */}
      <div className="progress-section">
        <span className="progress-text">Step 3 of 6</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner-3 step3"></div>
        </div>
      </div>

      {/* Header */}
      <div className="header-section">
        <button
          type="button"
          className="back-button"
          onClick={handleBack}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="page-title">Incident Details</h1>
      </div>

      {/* Subtitle */}
      <p className="subtitle">
        To tailor SafePoint to your team, we just need a few details about the incident.
      </p>

      {/* Form */}
      <form className="form-section" onSubmit={handleNext}>
        {/* Date */}
        <div className="form-group full-width">
           <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* Time */}
        <div className="form-group full-width">
  <label htmlFor="time">Time</label>
  <input
    type="time"
    id="time"
    value={time}
    onChange={(e) => setTime(e.target.value)}
    required
  />
</div>

        {/* Location */}
        <div className="form-group full-width">
          <label htmlFor="location">Location</label>
          <select
            id="location"
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            required
          >
            <option value="">Select…</option>
           {locations.map(loc => (
  <option key={loc.id} value={loc.id}>{loc.name}</option>
))}
          </select>
        </div>

        {/* Description */}
        <div className="form-group full-width">
          <label htmlFor="description">Describe what happened</label>
          <textarea
            id="description"
            placeholder="Write here…"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Or Record Voice Note */}
        <div className="form-group full-width">
          <label>Or Record Voice Note</label>
          <button
            type="button"
            className="record-button"
            onClick={() => setRecording(!recording)}
          >
            {recording ? "Stop Recording" : "Record…"}
          </button>
        </div>

        {/* Next Button */}
        <button type="submit" id="det-btn" className="btn btn-primary next-button">
          Next
        </button>
      </form>
    </div>
  );
};

export default IncidentDetails;
