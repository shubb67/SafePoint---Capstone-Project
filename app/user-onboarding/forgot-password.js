// src/user-onboarding/ForgotPassword.js
"use client";

import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/_utils/firebase";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("We have sent you an email with a link to reset your password");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("No account found for that email.");
      } else if (err.code === "auth/invalid-email") {
        setError("That email address is invalid.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Back Arrow */}
        <button
          onClick={() => navigate(-1)}
          className="text-2xl text-gray-800 mb-6"
          aria-label="Go back"
        >
          ←
        </button>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Forgot Password
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 mb-6">
          Please enter your account email address to reset
        </p>

        {/* Feedback */}
        {error   && <p className="mb-4 text-red-600">{error}</p>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              {/* email icon */}
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  >
                  <path
                    d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M22 6L12 13L2 6"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="example@email.com"
                className="w-full h-12 pl-10 pr-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#192C63] focus:border-[#192C63]"
                required
                />
            </div>
          </div>
                {message && <p className="mb-4 text-gray-500">{message}</p>}

          <div className="absolute bottom-0 pb-6 left-1/2 transform -translate-x-1/2 px-4 w-full max-w-md">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full h-12 flex items-center justify-center text-white font-medium rounded-[6px] transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#192C63] hover:bg-[#162050]"
          }`}
        >
          {loading ? "Submitting…" : "Submit"}
        </button>
      </div>

        </form>
      </div>
    </div>
  );
}
