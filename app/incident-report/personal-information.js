// src/incident-report/PersonalInfo.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/_utils/firebase"; 
import "../styles/PersonalInfo.css";

const PersonalInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const previousState = location.state || {};

  // 1) Form state
  const [yourName, setYourName]         = useState("");
  const [wasInjured, setWasInjured]     = useState(""); // "yes" or "no"
  const [injuredPersons, setInjuredPersons] = useState("");
  const [witnesses, setWitnesses]       = useState("");

  // 2) Users fetched from Firestore
  const [users, setUsers] = useState([]);

  // 3) Load users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const list = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setUsers(list);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    loadUsers();
  }, []);

  // 4) Back and Next
  const handleBack = () => navigate(-1);
  const handleNext = () => {
    navigate("/incident-details", {
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
      {/* Progress */}
      <div className="progress-section">
        <span className="progress-text">Step 2 of 6</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner-2 step2"></div>
        </div>
      </div>

      {/* Header */}
      <div className="header-section">
        <button className="back-button" onClick={handleBack} aria-label="Go back">←</button>
        <h1 className="page-title">Personal Information</h1>
      </div>

      <p className="subtitle">
        To tailor SafePoint to your team, we just need a few details about the incident.
      </p>

      {/* Form */}
      <form className="form-section" onSubmit={e => { e.preventDefault(); handleNext(); }}>
        {/* Your Name */}
        <div className="form-group full-width">
          <label htmlFor="yourName">Your Name</label>
          <select
            id="yourName"
            value={yourName}
            onChange={e => setYourName(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid}>
                {u.firstName} {u.surname}
              </option>
            ))}
          </select>
        </div>

        {/* Was anyone injured? */}
        <div className="form-group full-width">
          <label>Was anyone injured?</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-button${wasInjured==="yes"?" selected":""}`}
              onClick={() => setWasInjured("yes")}
            >Yes</button>
            <button
              type="button"
              className={`toggle-button${wasInjured==="no"?" selected":""}`}
              onClick={() => setWasInjured("no")}
            >No</button>
          </div>
        </div>

        {/* Injured Person/s */}
        <div className="form-group full-width">
          <label htmlFor="injuredPersons">Injured Person/s</label>
          <select
            id="injuredPersons"
            value={injuredPersons}
            onChange={e => setInjuredPersons(e.target.value)}
            disabled={wasInjured !== "yes"}
            required={wasInjured === "yes"}
          >
            <option value="">Select…</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid}>
                {u.firstName} {u.surname}
              </option>
            ))}
          </select>
        </div>

        {/* Witness/es */}
        <div className="form-group full-width">
          <label htmlFor="witnesses">Witness/es</label>
          <select
            id="witnesses"
            value={witnesses}
            onChange={e => setWitnesses(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid}>
                {u.firstName} {u.surname}
              </option>
            ))}
          </select>
        </div>

        {/* Next */}
        <button
          type="submit"
          className="btn btn-primary next-button"
          disabled={
            !yourName ||
            !wasInjured ||
            (wasInjured==="yes" && !injuredPersons) ||
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
