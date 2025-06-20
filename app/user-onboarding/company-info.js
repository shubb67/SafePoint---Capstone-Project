// src/CompanyInformation.js
"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function CompanyInformation() {
  const navigate = useNavigate();
  const { state: prev } = useLocation();
  const [company, setCompany]         = useState("");
  const [jobTitle, setJobTitle]       = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [error, setError]             = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    if (!company || !jobTitle || !siteLocation) {
      setError("All fields are required.");
      return;
    }
    setError("");
    navigate("/upload-photo", {
      state: { ...prev, company, jobTitle, siteLocation }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <span className="block text-center text-sm text-gray-700 mb-2">
            Step 2 of 3
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-2/3 rounded-full" />
          </div>
        </div>
        {/* Header */}
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-2xl text-gray-800"
            aria-label="Go back"
          >←</button>
          <h1 className="flex-1 text-xl font-semibold text-gray-800 text-center">
            Company Information
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>
        <p className="text-center text-gray-600 text-sm mb-6 px-2">
          To tailor SafePoint to your team, we just need a few details about
          your company and job site.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {["Company","Job Title","Site Location"].map((lbl, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-gray-700">
                {lbl}
              </label>
              <input
                type="text"
                placeholder={lbl + (i===0? " Name": i===1? "…": "")}
                value={[company,jobTitle,siteLocation][i]}
                onChange={e => [setCompany,setJobTitle,setSiteLocation][i](e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg p-2
                           focus:border-blue-600 focus:ring focus:ring-blue-200 text-black"
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
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
