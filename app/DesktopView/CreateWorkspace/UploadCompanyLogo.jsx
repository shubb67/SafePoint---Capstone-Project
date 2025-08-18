// src/CompanyLogo.js
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/_utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default function CompanyLogo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  
  // UI states
  const [view, setView] = useState("initial"); // "initial", "picked", "text"
  const [logoFile, setLogoFile] = useState(null);
  const [logoText, setLogoText] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [tooLarge, setTooLarge] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        
        // Get workspace ID from localStorage
        const wsId = localStorage.getItem("currentWorkspaceSetup");
        if (wsId) {
          setWorkspaceId(wsId);
          
          // Fetch workspace data to get company name
          try {
            const wsDoc = await getDoc(doc(db, "workspaces", wsId));
            if (wsDoc.exists()) {
              const data = wsDoc.data();
              setCompanyName(data.companyName || "Company");
              // Auto-generate text logo initials
              const initials = data.companyName
                ?.split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || "CO";
              setLogoText(initials);
            }
          } catch (error) {
            console.error("Error fetching workspace:", error);
          }
        } else {
          navigate("/company-details");
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const uploadToAws = (file) =>
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
              folderPath: `workspaces/${workspaceId}/logo`,
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (JPG, PNG, etc.)");
      setTooLarge(true);
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Upload Failed: Image is too large. Max size is 5 MB. Please resize and try again.");
      setTooLarge(true);
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    // Clear errors and set file
    setUploadError("");
    setTooLarge(false);
    setLogoFile(file);
    setView("picked");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const generateTextLogo = () => {
    // Create canvas to generate text logo
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Background circle
    ctx.fillStyle = '#E8F5E9';
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, 2 * Math.PI);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(100, 100, 98, 0, 2 * Math.PI);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#2E7D32';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(logoText.toUpperCase(), 100, 100);

    return canvas.toDataURL('image/png');
  };

  const handleAddPhoto = async () => {
    setLoading(true);
    setUploadError("");

    try {
      let logoUrl = "";

      if (view === "picked" && logoFile) {
        // Upload image logo
        logoUrl = await uploadToAws(logoFile);
      } else if (view === "text") {
        // Generate and upload text logo
        const textLogoDataUrl = generateTextLogo();
        const blob = await (await fetch(textLogoDataUrl)).blob();
        const file = new File([blob], "logo.png", { type: "image/png" });
        logoUrl = await uploadToAws(file);
      }

      // Update workspace document
      await updateDoc(doc(db, "workspaces", workspaceId), {
        companyLogo: logoUrl,
        logoType: view === "text" ? "text" : "upload",
        logoText: view === "text" ? logoText : null,
        updatedAt: serverTimestamp(),
        setupStep: 2,
      });

      // Navigate to Step 3
      navigate("/workplace-locations");
    } catch (error) {
      console.error("Error saving logo:", error);
      setUploadError("Failed to save logo. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left: Form Card */}
      <div className="col-span-12 lg:col-span-7 bg-[#16244c] flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-xl px-10 sm:px-14 py-8">
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="text-center text-xs text-gray-500 mb-2">
              Step 2 of 4
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-[#1E5BFF] h-1.5 rounded-full transition-all duration-300" style={{ width: "50%" }}></div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-[22px] font-semibold text-[#1a2b5c] mb-2">
            Add Company Logo
          </h1>
          <p className="text-center text-xs text-gray-600 mb-8 max-w-md mx-auto">
            Add a profile picture to customize every form, report, and reviewing incidents.
          </p>

          {/* Logo Display Area */}
          <div className="flex justify-center mb-6">
            <div 
              className={`relative w-40 h-40 rounded-full flex items-center justify-center overflow-hidden ${
                tooLarge ? 'ring-2 ring-red-500 border-2 border-red-500' : ''
              }`}
              style={{ backgroundColor: view === "text" || view === "picked" ? 'transparent' : '#F3F4F6' }}
            >
              {view === "picked" && logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Company logo" 
                  className="w-full h-full object-cover"
                />
              ) : view === "text" ? (
                <div className="w-full h-full rounded-full border-2 border-green-500 bg-green-50 flex items-center justify-center">
                  <span className="text-3xl font-semibold text-gray-800">
                    {logoText.toUpperCase()}
                  </span>
                </div>
              ) : (
                <svg 
                  className="w-12 h-12 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1h-5.586l-2.707 2.707a1 1 0 01-1.414 0L7.586 17H4a1 1 0 01-1-1V6a1 1 0 011-1zm4 7a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z" opacity="0.3"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" opacity="0.3"/>
                </svg>
              )}
            </div>
          </div>

          {/* Error Message */}
          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg 
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <p className="text-xs text-red-600">{uploadError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {view === "initial" && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-11 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Select a File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full h-11 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take a Picture
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

              </>
            )}

            {view === "picked" && (
              <>
                <button
                  onClick={() => {
                    setView("initial");
                    setLogoFile(null);
                    setLogoPreview(null);
                    setUploadError("");
                    setTooLarge(false);
                  }}
                  className="w-full h-11 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
                >
                  Change Photo
                </button>

                <button
                  onClick={handleAddPhoto}
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Add Photo"}
                </button>
              </>
            )}

            {view === "text" && (
              <>
                <div className="px-4">
                  <input
                    type="text"
                    value={logoText}
                    onChange={(e) => setLogoText(e.target.value.slice(0, 4).toUpperCase())}
                    className="w-full text-center text-lg font-semibold border-b-2 border-gray-300 focus:border-[#1E5BFF] outline-none pb-1"
                    maxLength={4}
                  />
                </div>
                
                <button
                  onClick={() => {
                    setView("initial");
                    setUploadError("");
                  }}
                  className="w-full h-11 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
                >
                  Change Photo
                </button>

                <button
                  onClick={handleAddPhoto}
                  disabled={loading || !logoText}
                  className="w-full h-11 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Add Photo"}
                </button>
              </>
            )}
          </div>

          {/* Alternative text logo option */}
          {view === "initial" && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setView("text")}
                className="text-sm text-[#1E5BFF] hover:underline"
              >
                Or create a text logo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Image panel */}
      <div className="hidden lg:block col-span-5 relative">
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