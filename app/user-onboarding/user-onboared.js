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
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          Let&apos;s Get to Work – Safely
        </h1>
        <p className="text-gray-600 text-sm mb-6 text-center">
          All set! Your SafePoint account is good to go.
        </p>

        {/* Profile Image */}
        <div className="w-48 h-48 rounded-full bg-gray-200 overflow-hidden mb-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            // fallback silhouette
            <svg
              className="w-full h-full text-gray-400 p-8"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.7-9.8 5v2.5h19.6V19.4c0-3.3-6.5-5-9.8-5z" />
            </svg>
          )}
        </div>

        {/* Optional: display user’s name */}
        {displayName && (
          <p className="text-lg font-medium text-gray-800">
            {displayName}
          </p>
        )}
      </div>

      {/* Complete Button */}
      <button
        onClick={handleComplete}
        className="mt-8 w-full max-w-md mx-auto py-3 bg-[#192C63] text-white rounded-lg font-medium hover:bg-[#162050] transition"
      >
        Complete
      </button>
    </div>
  );
}
