// src/auth/SignupDesktop.jsx
"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/_utils/firebase"; // <-- your firebase init

// You can keep whatever image import you're using for the right-side hero
// import heroImg from "@/assets/helmet-hero.jpg";

export default function SignupDesktop() {
  const navigate = useNavigate();

  // form state
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleLoginClick = () => navigate("/login");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validations (same spirit as your CreateAccount.js)
    if (!firstName.trim() || !surname.trim() || !email.trim() || !phone.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setChecking(true);
      const methods = await fetchSignInMethodsForEmail(auth, email.trim().toLowerCase());
      if (methods.length) {
        setError("Email already in use.");
        return;
      }

      // Pass data to the next step
      navigate("/add-profile", {
        state: {
          firstName: firstName.trim(),
          surname: surname.trim(),
          email: email.trim().toLowerCase(),
          countryCode,
          phoneNumber: phone.trim(),
          password,
        },
      });
    } catch (err) {
      console.error(err);
      setError("Failed to verify email. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left: form card */}
      <div className="col-span-12 lg:col-span-6 bg-[#16244c] grid place-items-center px-6 lg:px-10">
        <div className="w-full max-w-[680px] bg-white rounded-2xl shadow-xl px-6 sm:px-10 py-8 sm:py-10">
          <h1 className="text-[34px] sm:text-[40px] font-bold text-[#16244c] text-center">
            Welcome to SafePoint
          </h1>
          <p className="mt-2 text-center text-gray-500 text-sm">
            To get started, please set up your admin account so you can create
            your company workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 text-black"
                  placeholder="Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Surname *</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 text-black"
                  placeholder="Surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>
            </div>

            {/* email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  {/* mail icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="#6b7280" strokeWidth="2"/>
                    <path d="m22 6-10 7L2 6" stroke="#6b7280" strokeWidth="2"/>
                  </svg>
                </span>
                <input
                  className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 text-black"
                  placeholder="example@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* phone */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Country Code</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+91">+91 (IN)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    {/* phone icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38l2.06-2.06a.9.9 0 0 1 .73-.26 17 17 0 0 0 3.17.3c.39 0 .73.34.73.73v4.82c0 .39-.34.73-.73.73C9.5 21.59 2.41 14.5 2.41 4.83c0-.39.34-.73.73-.73h4.82c.39 0 .73.34.73.73 0 1.09.09 2.16.28 3.18a.9.9 0 0 1-.26.73l-2.09 2.05Z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <input
                    className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 text-black"
                    placeholder="(123) 456 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
              <div className="relative">
                <input
                  className="w-full rounded-md border border-gray-300 pr-10 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 text-black"
                  placeholder="Must be 8 characters"
                  type={showPass1 ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass1((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                  aria-label="Toggle password visibility"
                >
                  {showPass1 ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* confirm password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password *</label>
              <div className="relative">
                <input
                  className="w-full rounded-md border border-gray-300 pr-10 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 text-black"
                  placeholder="Repeat password"
                  type={showPass2 ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass2((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                  aria-label="Toggle confirm password visibility"
                >
                  {showPass2 ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* error */}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* buttons */}
            <button
              type="submit"
              disabled={checking}
              className={`w-full h-11 rounded-lg font-medium transition ${
                checking ? "bg-gray-300 cursor-not-allowed" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {checking ? "Checking…" : "Next"}
            </button>

            <button
              type="button"
              onClick={handleLoginClick}
              className="w-full h-11 rounded-lg text-white font-semibold bg-gradient-to-r from-[#1a2b5c] to-[#0a63ff] hover:opacity-95"
            >
              Login
            </button>
          </form>
        </div>
      </div>

      {/* Right: image panel (kept responsive & non-stretched) */}
      <div className="hidden lg:block col-span-6 relative">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('/assets/images/hero.png')`, // replace with your image path
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        <div className="absolute bottom-10 right-10">
          <p className="text-white text-4xl font-semibold leading-tight drop-shadow">
            Incident Reporting, <br /> Simplified.
          </p>
        </div>
      </div>
    </div>
  );
}
