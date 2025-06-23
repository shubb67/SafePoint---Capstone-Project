// src/incident-report/Submit.js
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/_utils/firebase";
import { useIncidentState, useIncidentDispatch } from "../../context/IncidentContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function PropertyReportSubmitted() {
  const navigate = useNavigate();
  const incident = useIncidentState();
  const dispatch = useIncidentDispatch();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
 const didSubmitRef = useRef(false);

  // on mount: write a new report doc
  useEffect(() => {
    if (didSubmitRef.current) return;
      didSubmitRef.current = true;
    async function submitReport() {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");

        const reportRef = await addDoc(collection(db, "reports"), {
          reportId:  null, // Firestore will auto-generate this
          userId:    user.uid,
          ...incident,
          createdAt: serverTimestamp(),
        });
       console.log("Firestore gave me reportId:", reportRef.id);
        // now store it in context:
        dispatch({ type: "SET_REPORT_ID", payload: reportRef.id });
         setLoading(false);
      } catch (e) {
        console.error("Submit error:", e);
        setError(e.message);
         setLoading(false);
      }
    }
    submitReport();
  }, []);

  const handleDone = () => {
    // you could also clear context here if desired
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 pt-6 pb-8">
      <div className="max-w-md w-full mx-auto flex flex-col flex-1">
        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <span className="block text-center text-sm text-gray-700">
            Step 6 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            {/* full width once loading=false */}
            <div
              className={`h-full bg-[#192C63] transition-all duration-500 ${
                loading ? "w-5/6" : "w-full"
              } rounded-full`}
            />
          </div>
        </div>

        {/* Back & Title */}
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-2xl text-gray-800"
          >
            ←
          </button>
          <h1 className="flex-1 text-center text-xl font-semibold text-gray-900">
            {error ? "Submission Error" : "Report Submitted"}
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-8">
          {error
            ? error
            : "We appreciate you taking the time to help keep the workplace safe. Our team will review the information and follow up if needed."}
        </p>

        {/* Placeholder / Illustration */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-64 bg-gray-300 rounded-lg" />
        </div>

        {/* Done Button */}
        <button
          onClick={handleDone}
          className="w-full py-3 mt-8 bg-[#192C63] text-white rounded-lg font-medium hover:bg-[#162050] transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
