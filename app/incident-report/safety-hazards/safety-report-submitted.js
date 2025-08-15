// src/incident-report/Submit.js
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/_utils/firebase";
import { useIncidentState, useIncidentDispatch } from "../../context/IncidentContext";
import { collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDoc, doc } from "firebase/firestore";

export default function ReportSubmitted() {
  const navigate = useNavigate();
  const incident = useIncidentState();
  const dispatch = useIncidentDispatch();

   const { reportId } = useIncidentState();

  const didSubmitRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  

  // on mount: write a new report doc
  useEffect(() => {
    if (didSubmitRef.current) return;
      didSubmitRef.current = true;

    async function submitReport() {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data();
        const orgId = userSnap.data()?.organizationId || null;
        const reportRef = await addDoc(collection(db, "reports"), {
          reportId:       null, // will be set after doc creation
          userId:         user.uid,
          organizationId: orgId,
          ...incident,
          createdAt: serverTimestamp(),
        });
       await updateDoc(reportRef, { reportId: reportRef.id });
        // now store it in context:
        dispatch({ type: "SET_REPORT_ID", payload: reportRef.id  });

                // create a notification for the reporter (you)
                const incidentType = incident?.incidentType || "incident";
                const location =
                  incident?.incidentDetails?.location ||
                  incident?.incidentDetails?.locationId ||
                  "Unknown Location";
        
                await addDoc(collection(db, "notifications"), {
                  toUserId: user.uid,                    // recipient
                  fromUserId: user.uid,                  // who triggered it
                  fromUserName: userData.firstName || "You",
                  company: userData.company || null,
                  incidentId: reportRef.id,              // link target
                  type: "report",                        // used by NotificationCenter
                  title: "Your Incident Report Was Submitted",
                  message: `Your ${incidentType} report from ${location} has been successfully submitted.`,
                  status: "unread",
                  createdAt: serverTimestamp(),
                });
                
        setLoading(false);
      } catch (e) {
        console.error("Submit error:", e);
        setError(e.message);
        setLoading(false);
      }
    }
    submitReport();
  }, []);

  useEffect(() => {
    const audio = new Audio("/assets/sounds/success.mp3");
    audio.play().catch((e) => console.warn("Audio play failed:", e));
  }, []);

  const handleDone = () => {
    // you could also clear context here if desired
    navigate("/");
  };

  return (
 <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg text-center">
        {/* Step Indicator */}
        <div className="mb-6">
          <span className="block text-sm text-gray-700 mb-2">
            Step 6 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-full rounded-full" />
          </div>
        </div>

        {/* Header */}
        <h1 className="text-xl font-semibold text-gray-900 mb-1 mt-15">
          Your Report has been<br />Submitted
        </h1>

        {/* Report ID */}
       <p className="text-sm text-gray-500 mb-6">
          Report ID: <span className="font-semibold">{reportId || "#0000"}</span>
        </p>

        {/* Check Icon Circle */}
        <div className="w-60 h-60 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-40 w-40 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20.285 6.709a1 1 0 00-1.414-1.418L9 15.166l-3.871-3.87a1 1 0 10-1.414 1.414l4.578 4.578a1 1 0 001.414 0l10.578-10.579z" />
          </svg>
        </div>

        {/* Back Button */}
                       <div className="absolute bottom-2 pb-6 left-1/2 transform -translate-x-1/2 px-4 w-full max-w-lg">
        
        <button
          onClick={handleDone}
          className="w-full py-3 bg-[#192C63] text-white rounded-md font-medium
                     hover:bg-[#162050] focus:outline-none focus:ring-2 focus:ring-[#162050]"
        >
          Back to Home
        </button>
        </div>
      </div>
    </div>
  );
}