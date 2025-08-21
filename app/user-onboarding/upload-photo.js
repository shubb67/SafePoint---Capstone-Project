// src/account/AddProfilePhoto.js
"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/_utils/firebase";
import { updateDoc } from "firebase/firestore";


export default function AddProfilePhoto() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    firstName,
    surname,
    email,
    countryCode,
    phoneNumber,
    password,
    workspaceId,
    jobTitle,
    siteLocation,
  } = state || {};

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- Upload helper (unchanged) ----------
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
          const data = await res.json();
          if (!res.ok || !data?.url) throw new Error("Upload failed");
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File read error"));
    });

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setShowPicker(false);
  };

  const complete = async (skip) => {
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      let photoUrl = "";
      if (!skip && photoFile) {
        photoUrl = await uploadToAws(photoFile, `users/${user.uid}/profile/images`);
      }

      await updateProfile(user, {
        displayName: `${firstName} ${surname}`,
        photoURL: photoUrl || null,
      });

      await setDoc(
        doc(db, "users", user.uid),
        {
          firstName,
          surname,
          email,
          phone: `${countryCode} ${phoneNumber}`,
          jobTitle,
          siteLocation,
          workspaceId,
          role: "employee",
          photoUrl: photoUrl || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Add user to workspace members
    if (workspaceId) {
      const workspaceRef = doc(db, "workspaces", workspaceId);
      await updateDoc(workspaceRef, {
        [`members.${user.uid}`]: {
          role: "employee",
          joinedAt: serverTimestamp()
        }

      });
    }

      navigate("/user-onboarded");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="relative min-h-screen bg-white">
      {/* Scrollable content */}
      <div className="mx-auto max-w-md px-5 pt-6 pb-40 overflow-y-auto">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="text-xl text-gray-700 hover:text-gray-900"
          aria-label="Back"
        >
          ←
        </button>

        {/* Step / Progress with gradient */}
        <p className="mt-2 text-center text-xs text-gray-500">Step 2 of 2</p>
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-700" />
        </div>

        {/* Title */}
        <h1 className="mt-6 text-center text-[18px] font-semibold text-black">
          Add a Profile Photo
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Add a profile picture so coworkers know who’s reporting and reviewing incidents.
        </p>

        {/* Avatar / Preview */}
        <div className="mt-8 flex justify-center">
          <div className="w-40 h-40 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <svg
                className="w-16 h-16 text-gray-400"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
              </svg>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur-sm"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-md px-5 pt-3">
          {/* Button sets per state */}
          {!photoFile && !showPicker && (
            <div className="space-y-3">
              {/* Legal text - moved above buttons */}
              <p className="text-center text-[11px] leading-4 text-gray-400 pb-2">
              By clicking &apos;Create Account&apos;, I am agreeing to SafePoint&apos;s{" "}
                <u className="cursor-pointer hover:text-gray-600">Legal Agreements</u> and{" "}
                <u className="cursor-pointer hover:text-gray-600">Terms & Conditions</u>.
              </p>
              
              <button
                onClick={() => complete(true)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-50"
              >
                Skip & Create Account
              </button>
              <button
                onClick={() => setShowPicker(true)}
                disabled={loading}
                className="w-full rounded-lg bg-[#1a4ddb] py-3 text-sm font-semibold text-white hover:bg-[#163fc0] disabled:opacity-50"
              >
                Add Photo
              </button>
            </div>
          )}

          {showPicker && (
            <div className="space-y-3">
              <label className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-100 py-3 text-center text-sm font-semibold text-gray-800 hover:bg-gray-200">
                <span className="flex items-center justify-center gap-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="19" 
                    height="19" 
                    viewBox="0 0 19 19" 
                    fill="none"
                    className="inline-block"
                  >
                    <path 
                      d="M1 13.7345C1.01788 14.7563 1.43639 15.7301 2.16537 16.4463C2.89435 17.1625 3.87549 17.5638 4.89744 17.5636H8.28822M1 13.7345V4.89732C1 3.86369 1.41062 2.87239 2.14153 2.1415C2.87245 1.41061 3.86378 1 4.89744 1H13.6667C14.7004 1 15.6917 1.41061 16.4226 2.1415C17.1535 2.87239 17.5641 3.86369 17.5641 4.89732V8.288M1 13.7345L1.17344 13.5396L4.29724 9.81088C4.48014 9.59259 4.70867 9.41704 4.96674 9.2966C5.22481 9.17615 5.50614 9.11373 5.79093 9.11373C6.07572 9.11373 6.35706 9.17615 6.61512 9.2966C6.87319 9.41704 7.10172 9.59259 7.28463 9.81088L8.49478 11.2548" 
                      stroke="black" 
                      strokeWidth="1.84615" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Select a File</span>
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
              </label>
              
              <label className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-100 py-3 text-center text-sm font-semibold text-gray-800 hover:bg-gray-200">
                <span className="flex items-center justify-center gap-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="21" 
                    height="20" 
                    viewBox="0 0 21 20" 
                    fill="none"
                    className="inline-block"
                  >
                    <g clipPath="url(#clip0_3017_56713)">
                      <path 
                        d="M17.3571 18.2813H3.64286C2.80932 18.2813 2.00992 17.9502 1.42052 17.3608C0.831121 16.7714 0.5 15.972 0.5 15.1384V8.28128C0.5 7.44775 0.831121 6.64835 1.42052 6.05895C2.00992 5.46955 2.80932 5.13843 3.64286 5.13843H4.32857L5.67714 3.13843C5.96567 2.7093 6.35527 2.3577 6.81165 2.11456C7.26803 1.87142 7.77718 1.74422 8.29429 1.74414H12.7057C13.2228 1.74422 13.732 1.87142 14.1883 2.11456C14.6447 2.3577 15.0343 2.7093 15.3229 3.13843L16.6714 5.13843H17.3571C18.1907 5.13843 18.9901 5.46955 19.5795 6.05895C20.1689 6.64835 20.5 7.44775 20.5 8.28128V15.1384C20.5 15.972 20.1689 16.7714 19.5795 17.3608C18.9901 17.9502 18.1907 18.2813 17.3571 18.2813ZM3.64286 6.85271C3.26398 6.85271 2.90061 7.00322 2.6327 7.27113C2.3648 7.53904 2.21429 7.9024 2.21429 8.28128V15.1384C2.21429 15.5173 2.3648 15.8807 2.6327 16.1486C2.90061 16.4165 3.26398 16.567 3.64286 16.567H17.3571C17.736 16.567 18.0994 16.4165 18.3673 16.1486C18.6352 15.8807 18.7857 15.5173 18.7857 15.1384V8.28128C18.7857 7.9024 18.6352 7.53904 18.3673 7.27113C18.0994 7.00322 17.736 6.85271 17.3571 6.85271H16.2143C16.0744 6.85246 15.9366 6.81795 15.8131 6.75221C15.6896 6.68647 15.5841 6.59149 15.5057 6.47557L13.9286 4.06414C13.8036 3.87338 13.6345 3.7156 13.4355 3.60418C13.2366 3.49276 13.0136 3.431 12.7857 3.42414H8.29429C8.06635 3.431 7.84344 3.49276 7.64448 3.60418C7.44552 3.7156 7.27638 3.87338 7.15143 4.06414L5.49429 6.47557C5.41593 6.59149 5.31039 6.68647 5.18688 6.75221C5.06336 6.81795 4.92563 6.85246 4.78571 6.85271H3.64286Z" 
                        fill="black"
                      />
                      <path 
                        d="M10.4999 14.8524C9.76532 14.8524 9.0472 14.6346 8.43639 14.2264C7.82557 13.8183 7.34951 13.2382 7.06838 12.5595C6.78725 11.8808 6.7137 11.134 6.85702 10.4135C7.00033 9.69299 7.35408 9.03117 7.87354 8.51172C8.39299 7.99227 9.05481 7.63852 9.77531 7.4952C10.4958 7.35188 11.2426 7.42544 11.9213 7.70656C12.6 7.98769 13.1801 8.46376 13.5882 9.07457C13.9964 9.68538 14.2142 10.4035 14.2142 11.1381C14.2112 12.1223 13.8189 13.0653 13.123 13.7612C12.4271 14.4571 11.4841 14.8494 10.4999 14.8524ZM10.4999 9.13812C10.1044 9.13812 9.71769 9.25541 9.38879 9.47518C9.05989 9.69494 8.80355 10.0073 8.65217 10.3727C8.5008 10.7382 8.46119 11.1403 8.53836 11.5283C8.61553 11.9163 8.80601 12.2726 9.08572 12.5523C9.36542 12.832 9.72179 13.0225 10.1098 13.0997C10.4977 13.1769 10.8998 13.1372 11.2653 12.9859C11.6308 12.8345 11.9431 12.5782 12.1629 12.2493C12.3826 11.9204 12.4999 11.5337 12.4999 11.1381C12.4969 10.6086 12.2853 10.1016 11.9108 9.72722C11.5364 9.35279 11.0294 9.14112 10.4999 9.13812Z" 
                        fill="black"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_3017_56713">
                        <rect width="20" height="20" fill="white" transform="translate(0.5)"/>
                      </clipPath>
                    </defs>
                  </svg>
                  <span>Take a Picture</span>
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
              </label>
              

            </div>
          )}

          {/* Photo selected state */}
          {photoFile && !showPicker && (
            <div className="space-y-3">
              {/* Legal text - moved above buttons */}
              <p className="text-center text-[11px] leading-4 text-gray-400 pb-2">
              By clicking &apos;Create Account&apos;, I am agreeing to SafePoint&apos;s{" "}
                <u className="cursor-pointer hover:text-gray-600">Legal Agreements</u> and{" "}
                <u className="cursor-pointer hover:text-gray-600">Terms & Conditions</u>.
              </p>
              
              <button
                onClick={() => complete(false)}
                disabled={loading}
                className="w-full rounded-lg bg-[#1a4ddb] py-3 text-sm font-semibold text-white hover:bg-[#163fc0] disabled:opacity-50"
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setPhotoFile(null);
                  setShowPicker(true);
                }}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Change Photo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    
  );
}
