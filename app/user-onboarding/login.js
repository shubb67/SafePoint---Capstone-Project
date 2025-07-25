// src/Login.js
"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/_utils/firebase";
import { Link } from "react-router-dom";
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "@/_utils/firebase";


export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleBack = () => navigate(-1);

  const handleSubmit = async e => {
  e.preventDefault();
  setError("");

  if (!email.trim() || !password) {
    setError("Please enter both email and password.");
    return;
  }

  setLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Fetch user role from Firestore
    const userDoc = await getDoc(doc(collection(db, "users"), user.uid));
    const userData = userDoc.data();

    if (userData?.role === "admin") {
      navigate("/admin-dashboard");
    } else {
      navigate("/user-dashboard");
    }
  } catch (err) {
    console.error("Login error:", err);
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
      setError("Incorrect email or password.");
    } else if (err.code === "auth/invalid-email") {
      setError("Please enter a valid email address.");
    } else {
      setError("Failed to login. Please try again.");
    }
  } finally {
    setLoading(false);
  }
    }
  

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* Back Arrow */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="text-2xl text-gray-800"
            aria-label="Go back"
          >
            ←
          </button>
          <div className="flex-1" />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-sm">
            Enter your credentials to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg
                  width="20"
                  height="20"
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
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg
                           focus:border-blue-600 focus:ring focus:ring-blue-200 text-black"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password *
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter Password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:border-blue-600 focus:ring focus:ring-blue-200 text-black"
            />
          </div>
          <div className="text-center">
            <Link to="/forgot-password" className="text-[#192C63] hover:underline">
            Forgot your password?{" "}
            </Link>
            </div>


          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Login Button */}
                    <div className="absolute bottom-0 pb-6 left-1/2 transform -translate-x-1/2 px-4 w-full max-w-md">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-medium transition
              ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#192C63] hover:bg-[#162050]"
              }`}
          >
            {loading ? "Logging in…" : "Login"}
          </button>
</div>
        </form>
      </div>
    </div>
  );

}
