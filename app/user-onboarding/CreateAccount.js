// src/CreateAccount.js
"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const navigate = useNavigate();

  // ─── Helpers & Handlers ─────────────────────────
  const passwordsMatch = () => password === confirmPassword;

  const handleSubmit = e => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() ||
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

    navigate("/company-information", {
      state: {
        firstName:   firstName.trim(),
        surname:     surname.trim(),
        email:       email.trim().toLowerCase(),
        countryCode,
        phoneNumber: phoneNumber.trim(),
        password,
      },
    });
  };

  // ─── Render ─────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 1 of 3
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-900 w-1/3 rounded-full" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-2xl text-gray-800 pr-4"
          >
            ←
          </button>
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">
            Create Account
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 mb-6 text-sm">
          Before you start reporting or managing incidents, we just need a few
          quick details to create your account.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2
                           focus:border-blue-600 focus:ring focus:ring-blue-200"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="surname"
                className="block text-sm font-medium text-gray-700"
              >
                Surname *
              </label>
              <input
                id="surname"
                type="text"
                placeholder="Surname"
                value={surname}
                onChange={e => setSurname(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2
                           focus:border-blue-600 focus:ring focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address *
            </label>
            <div className="mt-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                {/* Email SVG */}
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
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10 pr-3 py-2 block w-full border border-gray-300 rounded-md
                           focus:border-blue-600 focus:ring focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="flex gap-4">
            <div className="w-1/3">
              <label
                htmlFor="countryCode"
                className="block text-sm font-medium text-black"
              >
                Country Code
              </label>
              <select
                id="countryCode"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="mt-1 block w-full text-gray-400 border border-gray-300 rounded-md p-2
                           focus:border-blue-600 focus:ring focus:ring-blue-200"
              >
                <option>+1 (US)</option>
                <option>+44 (UK)</option>
                <option>+91 (IN)</option>
                <option>+61 (AU)</option>
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  {/* Phone SVG */}
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
                  id="phoneNumber"
                  type="tel"
                  placeholder="123 456 7890"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="pl-10 pr-3 py-2 block w-full border border-gray-300 rounded-md
                             focus:border-blue-600 focus:ring focus:ring-blue-200"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password *
            </label>
            <input
              id="password"
              type="password"
              placeholder="Must be 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2
                         focus:border-blue-600 focus:ring focus:ring-blue-200"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2
                         focus:border-blue-600 focus:ring focus:ring-blue-200"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}

          {/* Next Button */}
          <button
            type="submit"
            className="w-full py-3 bg-[#192C63] text-white rounded-lg font-medium hover:bg-[#162050] transition"
   >
            Next
          </button>
        </form>
      </div>
    </div>
  );
}
