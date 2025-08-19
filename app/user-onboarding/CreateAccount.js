// src/CreateAccount.js
"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/_utils/firebase";



export default function CreateAccount() {
  // ─── State ─────────────────────────
  const [firstName, setFirstName]       = useState("");
  const [surname, setSurname]           = useState("");
  const [email, setEmail]               = useState("");
  const [countryCode, setCountryCode]   = useState("+1");
  const [phoneNumber, setPhoneNumber]   = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]               = useState("");
  const [jobTitle, setJobTitle]         = useState("");
  const [siteLocation, setSiteLocation] = useState("");



  const navigate  = useNavigate();
  const { state } = useLocation();
  


  // Passed from JoinWorkplace (employee flow). When not present, we fall back to admin flow.
  const joinMode       = state?.joinMode || null;                 // "employee" | null
  const workspaceId    = state?.workspaceId || null;
  const workspaceName  = state?.workspaceName || null;
  const passCode       = state?.passCode || null;


  // ─── Helpers ─────────────────────────
  const passwordsMatch = () => password === confirmPassword;

  // ─── Submit ─────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation (unchanged)
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
      setError("The passwords you entered do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Check if email already exists
    try {
      const methods = await fetchSignInMethodsForEmail(
        auth,
        email.trim().toLowerCase()
      );
      if (methods.length) {
        setError("Email already in use.");
        return;
      }
    } catch (err) {
      console.error("Email check error:", err);
      setError("Failed to verify email. Please try again.");
      return;
    }

    // 🚦 Routing changes based on design/flow:
    // If coming from the passcode screen (employee joining an existing workspace),
    // we skip the company-information step and go straight to Upload Photo.
    const payload = {
      // collected on this screen
      firstName:   firstName.trim(),
      surname:     surname.trim(),
      email:       email.trim().toLowerCase(),
      countryCode,
      phoneNumber: phoneNumber.trim(),
      password,
      jobTitle:    jobTitle?.trim() || "",
      siteLocation: siteLocation?.trim() || "",
      // context from JoinWorkplace (if present)
      joinMode: joinMode || undefined,
      workspaceId: workspaceId || undefined,
      workspaceName: workspaceName || undefined,
      passCode: passCode || undefined,
    };

    if (joinMode === "employee" && workspaceId) {
      // Employee flow → go directly to Upload Photo
      navigate("/upload-photo", { state: payload });
    } else {
      // Admin (create-workspace) flow → proceed to company info (unchanged)
      navigate("/company-information", { state: payload });
    }
  };

  // ─── Render ─────────────────────────
// ─── Render ─────────────────────────
return (
  <div className="min-h-screen bg-white flex flex-col">
    {/* Top bar with progress */}
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="text-xl text-[#1A2B5C] -ml-1 mb-18"
        >
          ←
        </button>

        <div className="flex-1">
          <p className="text-[13px] text-[#6B7280] font-medium mb-2 text-center">Step 1 of 2</p>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            {/* ~40% like the comp; tweak as needed */}
            <div className="h-full w-[50%] rounded-full bg-[#1A2B5C]" />
          </div>
        </div>

        <span className="w-6" />
      </div>
    </div>

    {/* Scrollable content */}
    <div className="flex-1 overflow-y-auto px-4 pb-26">
      <h1 className="text-[26px] font-bold text-[#1A2B5C]  text-center">
        Create Account
      </h1>
      <p className="text-[15px] text-[#6B7280] mt-2">
        Before you start reporting or managing incidents, we just need a few
        quick details to create your account.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] text-[#4B5563] mb-1">
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              placeholder="Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-11 rounded-md border border-[#D1D5DB] px-3 text-[15px] text-black
                         focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
            />
          </div>
          <div>
            <label className="block text-[13px] text-[#4B5563] mb-1">
              Surname *
            </label>
            <input
              id="surname"
              type="text"
              placeholder="Surname"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="w-full h-11 rounded-md border border-[#D1D5DB] px-3 text-[15px] text-black
                         focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
            />
          </div>
        </div>

        {/* Job + Site */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] text-[#4B5563] mb-1">
              Job Title
            </label>
            <input
              id="jobTitle"
              type="text"
              placeholder="Safety Manager"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full h-11 rounded-md border border-[#D1D5DB] px-3 text-[15px] text-black
                         focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
            />
          </div>
          <div>
            <label className="block text-[13px] text-[#4B5563] mb-1">
              Site Location
            </label>
            <input
              id="siteLocation"
              type="text"
              placeholder="Calgary"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="w-full h-11 rounded-md border border-[#D1D5DB] px-3 text-[15px] text-black
                         focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] text-[#4B5563] mb-1">
            Email Address *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="#6B7280" strokeWidth="2"/>
                <path d="M22 6 12 13 2 6" stroke="#6B7280" strokeWidth="2"/>
              </svg>
            </span>
            <input
              id="email"
              type="email"
              placeholder="danielsmith.yyc@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-md border border-[#D1D5DB] pl-10 pr-3 text-[15px] text-black
                         focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[13px] text-[#4B5563] mb-1">
              Country Code
            </label>
            <select
              id="countryCode"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full h-11 rounded-md border border-[#D1D5DB] px-2 text-[15px] text-black
                         focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
            >
              <option value="+1">+1 (US)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+91">+91 (IN)</option>
              <option value="+61">+61 (AU)</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-[13px] text-[#4B5563] mb-1">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.27 15.32c.2-.2.48-.28.73-.24 1.01.19 2.08.28 3.17.28.39 0 .73.34.73.73v4.82a.73.73 0 0 1-.73.73C9.5 21.64 2.35 14.49 2.35 4.82c0-.39.34-.73.73-.73H7.9c.39 0 .73.34.73.73 0 1.09.09 2.16.28 3.18.04.25-.04.53-.24.73l-2.05 2.06Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="(123) 456 6789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full h-11 rounded-md border border-[#D1D5DB] pl-10 pr-3 text-[15px] text-black
                           focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
              />
            </div>
          </div>
        </div>

        {/* Passwords */}
        <div>
          <label className="block text-[13px] text-[#4B5563] mb-1">
            Password *
          </label>
          <input
            id="password"
            type="password"
            placeholder="Must be 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 rounded-md border border-[#D1D5DB] px-3 text-[15px] text-black
                       focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"
          />
        </div>

        {(() => {
          const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
          return (
            <div>
              <label className="block text-[13px] text-[#4B5563] mb-1">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full h-11 rounded-md px-3 text-[15px] text-black focus:outline-none
                           focus:ring-2 ${mismatch
                    ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                    : "border-[#D1D5DB] focus:ring-[#1A2B5C]/20 focus:border-[#1A2B5C]"}`}
                aria-invalid={mismatch ? "true" : "false"}
                aria-describedby={mismatch ? "pwd-mismatch" : undefined}
              />
              {mismatch && (
                <p id="pwd-mismatch" className="mt-1 text-[13px] text-red-600 flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-[16px] text-center">!</span>
                  The passwords you entered do not match.
                </p>
              )}
            </div>
          );
        })()}

        {/* Any existing error from your previous logic */}
        {error && <p className="text-[13px] text-red-600">{error}</p>}
      </form>
    </div>

    {/* Fixed bottom CTA */}
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 px-4 py-3">
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full h-12 rounded-md bg-[#1A2B5C] text-white text-[15px] font-semibold
                   hover:bg-[#172554] active:scale-[.99] transition"
      >
        Next
      </button>
    </div>
  </div>
);

}
