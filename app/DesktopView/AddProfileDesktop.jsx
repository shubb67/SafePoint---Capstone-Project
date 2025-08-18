// src/UploadPhoto.js
"use client";

import React, { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { auth, db } from "@/_utils/firebase";

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
  } = state || {};

  // ---- UI state (3-step flow) ---------------------------------------------
  // "idle" -> shows Skip & Create + Add Photo (blue)
  // "picker" -> shows two gray buttons Select / Take a Picture
  // "picked" -> shows preview + Change Photo (gray) + Add Photo (blue)
  const [view, setView] = useState("idle");

  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [tooLarge, setTooLarge] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickRef = useRef(null);
  const cameraRef = useRef(null);

  // ---- helpers -------------------------------------------------------------
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
              fileName: file.name,
              fileType: file.type,
              base64: reader.result,
              folderPath,
            }),
          });
          if (!res.ok) throw new Error(`Upload failed (${res.status})`);
          const data = await res.json();
          if (!data?.url) throw new Error("Invalid upload response");
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File read error"));
    });

  const validateAndSet = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setTooLarge(true);
      setError(
        "Upload Failed: Image is too large. Max size is 5 MB. Please resize and try again."
      );
      setPhotoFile(null);
      // Stay in picker so user can choose again
      setView("picker");
      return;
    }
    setTooLarge(false);
    setError("");
    setPhotoFile(file);
    setView("picked");
  };

  const handleFileChange = (e) => validateAndSet(e.target.files?.[0] || null);

  // ---- submit --------------------------------------------------------------
  const completeAccount = async (usePhoto) => {
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const uid = user.uid;

      let photoUrl = "";
      if (usePhoto && photoFile) {
        photoUrl = await uploadToAws(photoFile, `users/${uid}/profile/images`);
      }

      await updateProfile(user, {
        displayName: `${firstName} ${surname}`,
        photoURL: photoUrl || null,
      });

      await setDoc(
        doc(db, "users", uid),
        {
          firstName,
          surname,
          email,
          phone: `${countryCode} ${phoneNumber}`,
          photoUrl: photoUrl || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )

      navigate("/create-join-workspace");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ---- render --------------------------------------------------------------
  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left: form card */}
      <div className="col-span-12 lg:col-span-6 bg-[#16244c] grid place-items-center px-6 lg:px-10">
        <div className="w-full max-w-[680px] bg-white rounded-2xl shadow-xl px-6 sm:px-10 py-8 sm:py-10">
            {/* Back */}
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="text-xl text-gray-700 hover:text-gray-900"
                aria-label="Back"
              >
                ←
              </button>
              <div className="flex-1" />
            </div>

            {/* Title */}
            <h1 className="mt-6 text-center text-[22px] font-semibold text-[#1a2b5c]">
              Add a Profile Photo
            </h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              Add a profile picture so coworkers know who’s reporting and reviewing incidents.
            </p>

            {/* Avatar */}
            <div className="mt-8 flex justify-center">
              <div
                className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex items-center justify-center overflow-hidden ${
                  tooLarge ? "ring-2 ring-red-500 border-2 border-red-500" : "border-0"
                }`}
                style={{ background: "#F3F4F6" }}
              >
                {photoFile ? (
                  <img
                    src={URL.createObjectURL(photoFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    width="72"
                    height="72"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-400"
                  >
                    <path
                      d="M12 12c2.485 0 4.5-2.015 4.5-4.5S14.485 3 12 3 7.5 5.015 7.5 7.5 9.515 12 12 12Z"
                      fill="currentColor"
                      opacity="0.5"
                    />
                    <path
                      d="M4 20.4c.908-3.34 4.073-5.4 8-5.4s7.092 2.06 8 5.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 mt-[2px]" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* ACTIONS (switch by view) */}
            <div className="mt-6 space-y-3">
              {view === "idle" && (
                <>
                  <p className="text-center text-xs text-gray-400 mt-1">
                    By clicking ‘Create Account’, I am agreeing to SafePoint’s{" "}
                    <u>Legal Agreements</u> and <u>Terms &amp; Conditions</u>.
                  </p>
                  <button
                    onClick={() => completeAccount(false)} // skip photo
                    disabled={loading}
                    className="w-full h-11 rounded-lg border-2 border-[#192C63] text-[#192C63] font-semibold hover:bg-[#192C63] hover:text-white transition"
                  >
                    Skip &amp; Create Account
                  </button>
                  <button
                    onClick={() => setView("picker")}
                    className="w-full h-11 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition"
                  >
                    Add Photo
                  </button>
                </>
              )}

              {view === "picker" && (
                <>
                  <button
                    type="button"
                    onClick={() => pickRef.current?.click()}
                    className="w-full h-11 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium flex items-center justify-center gap-2"
                  >
                    <span aria-hidden>🖼️</span>
                    Select a File
                  </button>
                  <input
                    ref={pickRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="w-full h-11 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium flex items-center justify-center gap-2"
                  >
                    <span aria-hidden>📷</span>
                    Take a Picture
                  </button>
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}

              {view === "picked" && (
                <>
                  <button
                    type="button"
                    onClick={() => setView("picker")}
                    className="w-full h-11 rounded-lg border-2 border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition"
                  >
                    Change Photo
                  </button>
                  <button
                    onClick={() => completeAccount(true)}
                    disabled={loading}
                    className="w-full h-11 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition disabled:opacity-50"
                  >
                    {loading ? "Creating…" : "Add Photo"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Image panel (desktop only) */}
        <div className="hidden lg:block col-span-6 relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url('/assets/images/hero.png')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40" />
          <div className="absolute bottom-10 right-10">
            <p className="text-white text-4xl font-semibold leading-tight drop-shadow">
              Incident Reporting, <br /> Simplified.
            </p>
          </div>
        </div>
      </div>
  );
}
