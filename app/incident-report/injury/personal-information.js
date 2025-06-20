// src/incident-report/PersonalInfo.js
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/_utils/firebase";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";

export default function PersonalInfo() {
  const navigate = useNavigate();
  const { state: previous } = useLocation();
  const dispatch = useIncidentDispatch();
  const incidentState = useIncidentState();

  // Form fields
  const [yourName, setYourName]           = useState("");
  const [wasInjured, setWasInjured]       = useState("");
  const [injuredPersons, setInjuredPersons] = useState("");
  const [witnesses, setWitnesses]         = useState("");

  // Load users for dropdowns
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    })();
  }, []);

  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_PERSONAL",
      payload: { yourName, wasInjured, injuredPersons, witnesses },
    });
    navigate("/details", { state: previous });
  };

  const canProceed =
    yourName &&
    wasInjured &&
    (wasInjured === "yes" ? injuredPersons : true) &&
    witnesses;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 2 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-1/3 rounded-full" />
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
            Personal Information
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          To tailor SafePoint to your team, we just need a few details about the incident.
        </p>

        {/* Form */}
        <form onSubmit={handleNext} className="space-y-5">
          {/* Your Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <select
              value={yourName}
              onChange={e => setYourName(e.target.value)}
              required
              className="w-full mt-1 text-black border border-gray-300 rounded-lg p-2
                         focus:border-blue-600 focus:ring focus:ring-blue-200"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Was anyone injured?
            </label>
            <div className="flex gap-2">
              {["yes", "no"].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWasInjured(val)}
                  className={
                    "flex-1 py-2 border rounded-lg text-center font-medium transition " +
                    (wasInjured === val
                      ? "bg-[#192C63] text-white border-[#192C63]"
                      : "bg-white text-gray-700 border-gray-300 hover:shadow-sm")
                  }
                >
                  {val === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>

          {/* Injured Person/s */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injured Person/s
            </label>
            <select
              value={injuredPersons}
              onChange={e => setInjuredPersons(e.target.value)}
              disabled={wasInjured !== "yes"}
              required={wasInjured === "yes"}
              className={
                "w-full mt-1 border rounded-lg p-2 focus:border-blue-600 focus:ring focus:ring-blue-200" +
                (wasInjured === "yes" ? "border-gray-300 text-black" : "bg-gray-100 border-gray-200 cursor-not-allowed")
              }
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Witness/es
            </label>
            <select
              value={witnesses}
              onChange={e => setWitnesses(e.target.value)}
              required
              className="w-full mt-1 border border-gray-300 rounded-lg p-2
                         focus:border-blue-600 focus:ring focus:ring-blue-200 text-black"
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
            disabled={!canProceed}
            className={
              "w-full py-3 rounded-lg text-white font-medium transition " +
              (canProceed
                ? "bg-[#192C63] hover:bg-[#162050]"
                : "bg-gray-400 cursor-not-allowed")
            }
          >
            Next
          </button>
        </form>
      </div>
    </div>
  );
}
