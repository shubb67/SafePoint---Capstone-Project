import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateAccount.css";

const CreateAccount = () => {
  // ─── State hooks for each field ────────────────────────────────
  const [firstName, setFirstName]       = useState("");
  const [surname, setSurname]           = useState("");
  const [email, setEmail]               = useState("");
  const [countryCode, setCountryCode]   = useState("+1"); // default +1
  const [phoneNumber, setPhoneNumber]   = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]               = useState("");

  const navigate = useNavigate(); // to navigate to Step 2

  // Helper: check if passwords match
  const passwordsMatch = () => password === confirmPassword;

  // ─── onSubmit handler (no longer creating Auth user here) ─────
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (
      !firstName.trim() ||
      !surname.trim() ||
      !email.trim() ||
      !phoneNumber.trim()
    ) {
      setError("All fields are required.");
      return;
    }
    if (!passwordsMatch()) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Pass all personal info to Step 2 via state
    navigate("/company-information", {
      state: {
        firstName:   firstName.trim(),
        surname:     surname.trim(),
        email:       email.trim().toLowerCase(),
        countryCode: countryCode,
        phoneNumber: phoneNumber.trim(),
        password:    password,
      },
    });
  };

  return (
    <div className="create-container">
      {/* ==== Progress Bar Section ==== */}
      <div className="progress-section">
        <span className="progress-text">Step 1 of 3</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner step1"></div>
        </div>
      </div>

      {/* ==== Header with Back Arrow & Centered Title ==== */}
      <div className="header-section">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="page-title">Create Account</h1>
      </div>

      {/* ==== Subtitle ==== */}
      <p className="subtitle">
        Before you start reporting or managing incidents, we just need a few quick details to create
        your account.
      </p>

      {/* ==== Form Fields ==== */}
      <form className="form-section" onSubmit={handleSubmit}>
        {/* Row: First Name & Surname */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              placeholder="Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="surname">Surname *</label>
            <input
              type="text"
              id="surname"
              name="surname"
              placeholder="Surname"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Email Address Field */}
        <div className="form-group full-width">
          <label htmlFor="email">Email Address *</label>
          <div className="input-with-icon">
            <span className="icon email-icon" aria-hidden="true">
              {/* Inline SVG for email icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                  stroke="#555"
                  strokeWidth="2"
                />
                <path
                  d="M22 6L12 13L2 6"
                  stroke="#555"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <input
              type="email"
              id="email"
              name="email"
              className="email-input"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Phone Number with Country Code Dropdown */}
<div className="form-group full-width">
  <label htmlFor="phone">Phone Number *</label>
  <div className="phone-combo">
    {/* 1) Country Code dropdown */}
    <select
      id="countryCode"
      name="countryCode"
      value={countryCode}
      onChange={(e) => setCountryCode(e.target.value)}
      placeholder="Select Country Code"
      required
      className="country-select"
    >
      <option value="+1">+1 (US)</option>
      <option value="+44">+44 (UK)</option>
      <option value="+91">+91 (IN)</option>
      <option value="+61">+61 (AU)</option>
      {/* Add more codes as needed */}
    </select>

    {/* 2) Phone input with icon */}
    <div className="input-with-icon phone-input-wrapper">
      <span className="icon phone-icon" aria-hidden="true">
        {/* Inline SVG for phone icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.27 15.32C15.47 15.12 15.75 15.04 16 15.08C17.01 15.27 18.08 15.36 19.17 15.36C19.56 15.36 19.9 15.7 19.9 16.09V20.91C19.9 21.3 19.56 21.64 19.17 21.64C9.5 21.64 2.35 14.49 2.35 4.82C2.35 4.43 2.69 4.09 3.08 4.09H7.9C8.29 4.09 8.63 4.43 8.63 4.82C8.63 5.91 8.72 6.98 8.91 8C8.95 8.25 8.87 8.53 8.67 8.73L6.62 10.79Z"
            stroke="#555"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <input
        type="tel"
        id="phoneNumber"
        name="phoneNumber"
        placeholder="123 456 7890"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        pattern="[0-9\s\-]+"
        required
        className="phone-input"
      />
    </div>
  </div>
</div>
        {/* Password Field */}
        <div className="form-group full-width">
          <label htmlFor="password">Password *</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Must be 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Confirm Password Field */}
        <div className="form-group full-width">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {/* Display validation error */}
        {error && <p className="error-text">{error}</p>}

        {/* Next Button */}
        <button type="submit" className="btn btn-primary next-button">
          Next
        </button>
      </form>
    </div>
  );
};

export default CreateAccount;
