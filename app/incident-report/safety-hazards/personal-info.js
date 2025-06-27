// src/incident-report/property-damage/PersonalInfo.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";

export default function SafetyHazardPersonalInfo() {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const { incidentType } = useIncidentState();
  const previous = useLocation().state || {};

  // form state
  const [yourName, setYourName]   = useState("");
  const [witnesses, setWitnesses] = useState("");
  const [users, setUsers]         = useState([]);

  // load users for dropdowns
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    })();
  }, []);

  const handleBack = () => navigate(-1);

  const handleNext = e => {
    e.preventDefault();
    // stash into context under this incidentType
    dispatch({
      type: "SET_STEP_DATA",
      payload: {
        step: "personalInfo",
        data: { yourName, witnesses }
      }
    });
    // go to step 3 of your flow
    navigate("/safety-hazards/incident-details", { state: { ...previous, incidentType } });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 2 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-2/6 rounded-full" />
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
          Help us understand what happened by sharing who was involved.
        </p>

        {/* Form */}
        <form onSubmit={handleNext} className="space-y-6">
          {/* Your Name */}
          <div>
            <label
              htmlFor="yourName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <select
              id="yourName"
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

          {/* Witness/es */}
          <div>
            <label
              htmlFor="witnesses"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Witness/s
            </label>
            <select
              id="witnesses"
              value={witnesses}
              onChange={e => setWitnesses(e.target.value)}
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

          {/* Next */}
                         <div className="absolute bottom-0 pb-6 left-1/2 transform -translate-x-1/2 px-4 w-full max-w-lg">
        
          <button
            type="submit"
            disabled={!(yourName && witnesses)}
            className={
              `w-full py-3 rounded-lg text-white font-medium transition ` +
              (yourName && witnesses
                ? "bg-[#192C63] hover:bg-[#162050]"
                : "bg-gray-400 cursor-not-allowed")
            }
          >
            Next
          </button>
          </div>
        </form>
      </div>
    </div>
  );
}
