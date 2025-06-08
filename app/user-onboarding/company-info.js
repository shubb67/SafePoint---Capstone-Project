// src/Step2.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "@/_utils/firebase"; // make sure auth & db are exported
import "../styles/step2.css"; // Ensure you have the correct CSS file for styling

const Step2 = () => {
  const location = useLocation();
  const navigate = useNavigate();

    useEffect(() => {
    console.log("Step2 received location.state:", location.state);
  }, [location]);

  //
  // 1) Extract personal info passed from Step 1.
  //
  const personal = location.state || {};

  useEffect(() => {
    // If any required personal value is missing, redirect back to Step 1.
    const {
      firstName,
      surname,
      email,
      countryCode,
      phoneNumber,
      password,
    } = personal;

    if (
      !firstName ||
      !surname ||
      !email ||
      !countryCode ||
      !phoneNumber ||
      !password
    ) {
      navigate("/create-account");
    }
  }, [personal, navigate]);

  //
  // 2) Local state for company fields and errors/loading.
  //
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  //
  // 3) onSubmit: create Auth user and write Firestore.
  //
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate company fields
    if (!company.trim() || !jobTitle.trim() || !siteLocation.trim()) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      // Destructure the personal values we need:
      const {
        firstName,
        surname,
        email,
        countryCode,
        phoneNumber,
        password,
      } = personal;

      // 3.1) Create the user in Firebase Auth:
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const uid = user.uid;

      // 3.2) Update the displayName in Auth to "FirstName Surname"
      await updateProfile(user, {
        displayName: `${firstName} ${surname}`,
      });

      // 3.3) Write all data to Firestore under "users/{uid}"
      await setDoc(doc(db, "users", uid), {
        firstName:    firstName,
        surname:      surname,
        email:        email,
        phone:        `${countryCode} ${phoneNumber}`,
        company:      company.trim(),
        jobTitle:     jobTitle.trim(),
        siteLocation: siteLocation.trim(),
        createdAt:    serverTimestamp(),
      });

      // 3.4) Navigate to Step 3 (/upload-photo)
      navigate("/upload-photo");
    } catch (err) {
      console.error("Error creating account in Step 2:", err);

      // Map some common Firebase Auth errors to friendly messages
        if (err.code === "auth/invalid-email") {
        setError("The email address is invalid.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. It must be at least 8 characters.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-container">
      {/* ==== Progress Bar Section ==== */}
      <div className="progress-section">
        <span className="progress-text">Step 2 of 3</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner step2"></div>
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
        <h1 className="page-title">Company Information</h1>
      </div>

      {/* ==== Subtitle ==== */}
      <p className="subtitle">
        To tailor SafePoint to your team, we just need a few details about your
        company and job site.
      </p>

      {/* ==== Form Fields ==== */}
      <form className="form-section" onSubmit={handleSubmit}>
        {/* Company */}
        <div className="form-group full-width">
          <label htmlFor="company">Company *</label>
          <input
            type="text"
            id="company"
            name="company"
            placeholder="Company Name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
        </div>

        {/* Job Title */}
        <div className="form-group full-width">
          <label htmlFor="jobTitle">Job Title *</label>
          <input
            type="text"
            id="jobTitle"
            name="jobTitle"
            placeholder="Job Title..."
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
          />
        </div>

        {/* Site Location */}
        <div className="form-group full-width">
          <label htmlFor="siteLocation">Site Location *</label>
          <input
            type="text"
            id="siteLocation"
            name="siteLocation"
            placeholder="Site Location"
            value={siteLocation}
            onChange={(e) => setSiteLocation(e.target.value)}
            required
          />
        </div>

        {/* Display validation or Firebase error */}
        {error && <p className="error-text">{error}</p>}

        {/* Create Account button */}
        <button
          type="submit"
          className="btn btn-primary next-button"
          disabled={loading}
        >
          {loading ? "Creating…" : "Create Account"}
        </button>
      </form>
    </div>
  );
};

export default Step2;
