// src/UploadPhoto.js
"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "@/_utils/firebase"; // Adjust the import path as needed

export default function UploadPhoto() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    firstName,
    surname,
    email,
    countryCode,
    phoneNumber,
    password,
    company,
    jobTitle,
    siteLocation
  } = state || {};

  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Upload helper: POSTs base64 + folderPath to your /api/aws route
  const uploadToAws = (file, folderPath) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const res = await fetch("/api/aws", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName:   file.name,
              fileType:   file.type,
              base64:     reader.result,
              folderPath,               // <-- use this instead of incidentType/category
            })
          });
          const { url } = await res.json();
          resolve(url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File read error"));
    });

  const handleComplete = async skip => {
    setError("");
    setLoading(true);

    try {
      // 1) Create the Auth user
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = cred.user;
      const uid  = user.uid;

      // 2) If they picked a photo, upload it under users/{uid}/profile/images/
      let photoUrl = "";
      if (!skip && photoFile) {
        photoUrl = await uploadToAws(
          photoFile,
          `users/${uid}/profile/images`
        );
      }

      // 3) Update their Auth profile (displayName + photoURL)
      await updateProfile(user, {
        displayName: `${firstName} ${surname}`,
        photoURL:    photoUrl || ""
      });

      // 4) Write the full user document in Firestore
      await setDoc(
        doc(db, "users", uid),
        {
          firstName,
          surname,
          email,
          phone:         `${countryCode} ${phoneNumber}`,
          company,
          jobTitle,
          siteLocation,
          photoUrl:      photoUrl || null,
          createdAt:     serverTimestamp()
        },
        { merge: true }
      );

      // 5) Finally, navigate home or to your dashboard
      navigate("/user-onboarded");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 3 of 3
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-full rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-2xl text-gray-800"
            aria-label="Go back"
          >←</button>
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">
            Add a Profile Photo
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          Add a profile picture so coworkers know who’s reporting and reviewing incidents.
        </p>

        {/* Photo chooser */}
        <div className="flex justify-center mb-6">
          <label className="relative w-36 h-36 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer">
            {photoFile ? (
              <img
                src={URL.createObjectURL(photoFile)}
                className="w-full h-full object-cover"
                alt="Preview"
              />
            ) : (
              <svg
                className="w-16 h-16 text-[#192C63]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="2" />
                <path d="M12 8v8M8 12h8" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0"
              onChange={e => setPhotoFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}

        {/* Skip */}
        <button
          onClick={() => handleComplete(true)}
          disabled={loading}
          className="w-full py-3 mb-3 border border-[#192C63] rounded-lg text-[#192C63] font-medium
                     hover:bg-gray-100 transition disabled:opacity-50"
        >
          Skip &amp; Create Account
        </button>

        {/* Upload & Create */}
        <button
          onClick={() => handleComplete(false)}
          disabled={loading}
          className="w-full py-3 bg-[#192C63] text-white rounded-lg font-medium
                     hover:bg-[#162050] transition disabled:opacity-50"
        >
          {loading ? "Creating…" : "Upload & Create Account"}
        </button>
      </div>
    </div>
  );
}
