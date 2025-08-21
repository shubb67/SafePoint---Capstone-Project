// src/FinalStep.js
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/_utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function FinalStep() {
  const navigate = useNavigate();
  const [photoUrl, setPhotoUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    // Listen for auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1) Try getting photoURL from Auth profile
        if (user.photoURL) {
          setPhotoUrl(user.photoURL);
        }
        // 2) (Optional) fetch any extra fields from Firestore
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.photoUrl) setPhotoUrl(data.photoUrl);
            if (data.firstName && data.surname)
              setDisplayName(`${data.firstName} ${data.surname}`);
          }
        } catch (err) {
          console.error("Error loading user doc:", err);
        }
      }
    });
    return unsubscribe;
  }, []);

  const handleComplete = () => {
    navigate("/user-dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with back arrow and progress */}
      <div className="pt-12 pb-6 px-6">
        <div className="flex items-center mb-4">
          <button className="mr-4">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        {/* Progress text */}
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">Complete</p>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-blue-600 h-2 rounded-full w-full"></div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          Let&apos;s Get to Work - Safely
        </h1>
        
        {/* Subtitle */}
        <p className="text-gray-500 text-base mb-16 text-center">
          All set! Your SafePoint account is good to go.
        </p>

        {/* Green checkmark icon */}
        <div className="mb-20">
          <svg className="w-64 h-64 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-100"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>

      {/* Continue Button */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={handleComplete}
          className="w-full py-4 bg-blue-500 text-white rounded-lg font-semibold text-base hover:bg-blue-600 transition-colors shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}