"use client";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/_utils/firebase"; // make sure auth & db are exported
import "../styles/step3.css";

const Step3 = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const fileInputRef = useRef(null);
  const navigate     = useNavigate();

  // 1) Open file selector
  const handlePlaceholderClick = () => {
    fileInputRef.current.click();
  };

  // 2) Show a quick preview (before resizing)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (jpg/png).");
      return;
    }
    setError("");
    setSelectedFile(file);
    setPreviewURL(URL.createObjectURL(file));
  };

  // Helper: take a File, draw to a 200×200 canvas, return compressed JPEG DataURL
  const resizeFileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create a 200×200 canvas (square)
        const canvas = document.createElement("canvas");
        const ctx    = canvas.getContext("2d");
        const size   = 200; // 200px square

        canvas.width  = size;
        canvas.height = size;

        // Compute aspect fit
        let sx, sy, sw, sh;
        const aspect = img.width / img.height;

        if (aspect > 1) {
          // Landscape: crop sides
          sw = img.height;
          sh = img.height;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          // Portrait or square: crop top/bottom
          sw = img.width;
          sh = img.width;
          sx = 0;
          sy = (img.height - sh) / 2;
        }

        // Draw the cropped square region into 200×200
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

        // Export as JPEG @ quality .7 (70%)
        const dataURL = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataURL);
      };
      img.onerror = (err) => reject(err);
      img.src = URL.createObjectURL(file);
    });
  };

  // 3) Skip & Create Account
  const handleSkip = () => {
    navigate("/final-step");
  };

  // 4) Resize→upload the small JPEG to Firestore, then go to Step 4
  const handleUploadAndCreate = async () => {
    setError("");
    if (!selectedFile) {
      setError("Please select a photo or click Skip.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError("No authenticated user. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      // Resize + compress, get e.g. "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD…"
      const smallDataURL = await resizeFileToDataURL(selectedFile);

      // Save to Firestore under users/{uid}.photoURL
      const uid = user.uid;
      await updateDoc(doc(db, "users", uid), {
        photoURL: smallDataURL,
      });

      navigate("/final-step"); // Adjust path if needed
    } catch (err) {
      console.error("Error processing photo:", err);
      setError("Failed to save photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-container">
      {/* ==== Progress Bar (Step 3 of 3) ==== */}
      <div className="progress-section">
        <span className="progress-text">Step 3 of 3</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner step3"></div>
        </div>
      </div>

      {/* ==== Header with Back Arrow ==== */}
      <div className="header-section">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="page-title">Add a Profile Photo</h1>
      </div>

      {/* ==== Subtitle ==== */}
      <p className="subtitle">
        Add a profile picture so coworkers know who’s reporting and reviewing incidents.
      </p>

      {/* ==== Photo Placeholder & Hidden File Input ==== */}
      <div className="photo-placeholder-wrapper">
        <div className="photo-placeholder" onClick={handlePlaceholderClick}>
          {previewURL ? (
            <img src={previewURL} alt="Selected" className="photo-preview" />
          ) : (
            <div className="photo-icon-wrapper">
              {/* Camera + plus SVG icon */}
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="#1a2634"
                  strokeWidth="2"
                />
                <path
                  d="M12 8V14"
                  stroke="#1a2634"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 11H15"
                  stroke="#1a2634"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="16.5" cy="7.5" r="3.5" fill="#1a2634" />
                <path
                  d="M16.5 5V8"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 6.5H18"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* ==== Legal Agreements ==== */}
      <p className="legal-text">
        By clicking ‘Create Account’, I am agreeing to SafePoint’s{" "}
        <a href="/legal-agreements" target="_blank" rel="noopener noreferrer">
          Legal Agreements
        </a>{" "}
        and{" "}
        <a
          href="/terms-and-conditions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms & Conditions
        </a>
        .
      </p>

      {error && <p className="error-text">{error}</p>}

      {/* ==== Buttons ==== */}
      <button
        type="button"
        className="btn btn-secondary skip-button"
        onClick={handleSkip}
        disabled={loading}
      >
        Skip & Create Account
      </button>
      <button
        type="button"
        className="btn btn-primary next-button"
        onClick={handleUploadAndCreate}
        disabled={loading}
      >
        {loading ? "Saving…" : "Upload & Create Account"}
      </button>
    </div>
  );
};

export default Step3;
