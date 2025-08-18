// src/CompanyDetails.js
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/_utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function CompanyDetails() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Form fields
  const [formData, setFormData] = useState({
    companyName: "",
    companyLocation: "",
    countryCode: "+1",
    phoneNumber: "",
    email: "",
    timezone: "", // Empty to show placeholder
  });

  // Timezone options
  const timezones = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Phoenix", label: "Arizona Time (AZ)" },
    { value: "America/Anchorage", label: "Alaska Time (AK)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
    { value: "Europe/London", label: "British Time (GMT)" },
    { value: "Europe/Paris", label: "Central European Time (CET)" },
    { value: "Asia/Tokyo", label: "Japan Time (JST)" },
    { value: "Australia/Sydney", label: "Australian Eastern Time (AEDT)" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        // Pre-fill email if available
        if (user.email) {
          setFormData(prev => ({ ...prev, email: user.email }));
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    
    if (!formData.companyLocation.trim()) {
      newErrors.companyLocation = "Location is required";
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Generate workspace ID
      const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save to Firestore - initial workspace data
      await setDoc(doc(db, "workspaces", workspaceId), {
        // Company Details (Step 1)
        companyName: formData.companyName,
        companyLocation: formData.companyLocation,
        companyPhone: `${formData.countryCode} ${formData.phoneNumber}`,
        companyEmail: formData.email,
        timezone: formData.timezone,
        
        // Metadata
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        setupStep: 1, // Track which step they're on
        isActive: false, // Will be true after all steps complete
        
        // Placeholders for next steps
        companyLogo: null, // Step 2
        locations: [], // Step 3
        passCodes: [], // Step 4
        members: [userId], // Owner is first member
      });

      // Save workspace ID to user's session/localStorage
      localStorage.setItem("currentWorkspaceSetup", workspaceId);
      
      // Navigate to Step 2
      navigate("/upload-company-logo");
      
    } catch (error) {
      console.error("Error saving company details:", error);
      setErrors({ submit: "Failed to save company details. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left: Form Card - Increased to 7 columns */}
      <div className="col-span-12 lg:col-span-7 bg-[#16244c] flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-xl px-10 sm:px-14 py-8">
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="text-center text-xs text-gray-500 mb-2">
              Step 1 of 4
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-[#1E5BFF] h-1.5 rounded-full transition-all duration-300" style={{ width: "25%" }}></div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-[22px] font-semibold text-[#1a2b5c] mb-2">
            Company Details
          </h1>
          <p className="text-center text-xs text-gray-600 mb-6 max-w-md mx-auto">
            Before you start reporting or managing incidents, we just need a few quick details to create your account.
          </p>

          {/* Form */}
          <div className="space-y-4">
            {/* Company Name and Location Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Company Name */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Name"
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 placeholder:text-gray-400 text-sm text-black focus:ring-[#1E5BFF] focus:border-transparent outline-none transition ${
                    errors.companyName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.companyName && (
                  <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>
                )}
              </div>

              {/* Company Location */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Company Location
                </label>
                <input
                  type="text"
                  name="companyLocation"
                  value={formData.companyLocation}
                  onChange={handleInputChange}
                  placeholder="Location"
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 placeholder:text-gray-400 text-sm text-black focus:ring-[#1E5BFF] focus:border-transparent outline-none transition ${
                    errors.companyLocation ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.companyLocation && (
                  <p className="mt-1 text-xs text-red-500">{errors.companyLocation}</p>
                )}
              </div>
            </div>

            {/* Country Code & Phone Number */}
            <div>
              <div className="grid grid-cols-3 gap-3 mb-1.5">
                <label className="block text-xs text-gray-500">
                  Country Code
                </label>
                <label className="block text-xs text-gray-500 col-span-2">
                  Phone Number
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  className="px-3 py-2.5 border border-gray-300 text-sm text-black rounded-lg focus:ring-2 focus:ring-[#1E5BFF] focus:border-transparent outline-none bg-white"
                >
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+61">+61</option>
                  <option value="+91">+91</option>
                  <option value="+86">+86</option>
                </select>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="(123) 456 6789"
                  className={`col-span-2 px-3 py-2.5 border rounded-lg placeholder:text-gray-400 text-sm text-black focus:ring-2 focus:ring-[#1E5BFF] focus:border-transparent outline-none transition ${
                    errors.phoneNumber ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="example@email.com"
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:ring-2 placeholder:text-gray-400 text-sm text-black focus:ring-[#1E5BFF] focus:border-transparent outline-none transition ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Company Timezone */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Company Timezone
              </label>
              <div className="relative">
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 pr-9 border border-gray-300 text-sm text-gray-600 rounded-lg focus:ring-2 focus:ring-[#1E5BFF] focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="" disabled>Used for report timestamps</option>
                  {timezones.map(tz => (
                    <option key={tz.value} value={tz.value} className="text-black">
                      {tz.label}
                    </option>
                  ))}
                </select>
                <svg 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="mt-4 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full mt-6 h-11 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Next"}
          </button>
        </div>
      </div>

      {/* Right: Image panel (desktop only) - Reduced to 5 columns */}
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