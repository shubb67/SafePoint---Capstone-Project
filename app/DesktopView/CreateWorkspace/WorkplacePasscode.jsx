// src/WorkplacePasscodes.js
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/_utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default function WorkplacePasscodes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [error, setError] = useState("");
  
  // Passcode fields
  const [passcodes, setPasscodes] = useState({
    employee: "",
    admin: "",
    guest: ""
  });

  const [errors, setErrors] = useState({
    employee: "",
    admin: "",
    guest: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        
        // Get workspace ID from localStorage
        const wsId = localStorage.getItem("currentWorkspaceSetup");
        if (wsId) {
          setWorkspaceId(wsId);
          
          // Check if workspace exists
          try {
            const wsDoc = await getDoc(doc(db, "workspaces", wsId));
            if (!wsDoc.exists()) {
              navigate("/company-details");
            } else {
              // Generate default passcodes
              generateDefaultPasscodes();
            }
          } catch (error) {
            console.error("Error fetching workspace:", error);
            navigate("/company-details");
          }
        } else {
          navigate("/company-details");
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const generatePasscode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let passcode = '';
    for (let i = 0; i < 8; i++) {
      if (i === 3) {
        passcode += ' '; // Add space in middle for readability
      }
      passcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return passcode;
  };

  const generateDefaultPasscodes = () => {
    setPasscodes({
      employee: generatePasscode(),
      admin: generatePasscode(),
      guest: generatePasscode()
    });
  };

  const handlePasscodeChange = (type, value) => {
    // Format input: uppercase, allow only alphanumeric and space
    let formatted = value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    
    // Auto-add space after 3 characters if not present
    if (formatted.length === 3 && !formatted.includes(' ')) {
      formatted += ' ';
    }
    
    // Limit to 8 characters (including space)
    if (formatted.replace(/\s/g, '').length <= 8) {
      setPasscodes(prev => ({
        ...prev,
        [type]: formatted
      }));
      
      // Clear error for this field
      if (errors[type]) {
        setErrors(prev => ({ ...prev, [type]: "" }));
      }
    }
  };

  const validatePasscodes = () => {
    let isValid = true;
    const newErrors = {};
    
    // Check each passcode
    Object.entries(passcodes).forEach(([type, code]) => {
      const cleanCode = code.replace(/\s/g, '');
      
      if (!cleanCode) {
        newErrors[type] = "Passcode is required";
        isValid = false;
      } else if (cleanCode.length < 6) {
        newErrors[type] = "Passcode must be at least 6 characters";
        isValid = false;
      }
    });
    
    // Check for duplicate passcodes
    const codes = Object.values(passcodes).map(c => c.replace(/\s/g, ''));
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) {
      setError("Each passcode must be unique");
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleNext = async () => {
    if (!validatePasscodes()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Format passcodes for database
      const formattedPasscodes = [
        {
          code: passcodes.employee.replace(/\s/g, ''),
          type: "employee",
          label: "Employee Pass Code",
          permissions: ["create_incident", "view_own_incidents"],
          createdAt: new Date().toISOString(),
          isActive: true,
          usageLimit: null, // unlimited
          usedCount: 0
        },
        {
          code: passcodes.admin.replace(/\s/g, ''),
          type: "admin",
          label: "Admin Pass Code",
          permissions: ["create_incident", "view_all_incidents", "manage_incidents", "view_reports"],
          createdAt: new Date().toISOString(),
          isActive: true,
          usageLimit: null,
          usedCount: 0
        },
        {
          code: passcodes.guest.replace(/\s/g, ''),
          type: "guest",
          label: "Guest Pass Code",
          permissions: ["create_incident"],
          createdAt: new Date().toISOString(),
          isActive: true,
          usageLimit: 10, // Limited uses for guests
          usedCount: 0
        }
      ];

      // Update workspace document
      await updateDoc(doc(db, "workspaces", workspaceId), {
        passCodes: formattedPasscodes,
        updatedAt: serverTimestamp(),
        setupStep: 4,
        isSetupComplete: true,
        isActive: true
      });

      // Clear setup workspace from localStorage
      localStorage.removeItem("currentWorkspaceSetup");
      
      // Navigate to success/dashboard
      navigate("/workspace-created");
    } catch (error) {
      console.error("Error saving passcodes:", error);
      setError("Failed to save passcodes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const regeneratePasscode = (type) => {
    setPasscodes(prev => ({
      ...prev,
      [type]: generatePasscode()
    }));
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left: Form Card */}
      <div className="col-span-12 lg:col-span-7 bg-[#16244c] flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-xl px-10 sm:px-14 py-8">
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="text-center text-xs text-gray-500 mb-2">
              Step 4 of 4
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-[#1E5BFF] h-1.5 rounded-full transition-all duration-300" style={{ width: "100%" }}></div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-[22px] font-semibold text-[#1a2b5c] mb-2">
            Create Your Workplace Pass Codes
          </h1>
          <p className="text-center text-xs text-gray-600 mb-8 max-w-md mx-auto">
            Pass codes let employees and admins join your workspace securely. 
            Share them only with people you trust.
          </p>

          {/* Passcode Fields */}
          <div className="space-y-5">
            {/* Employee Pass Code */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Employee Pass Code (required)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={passcodes.employee}
                  onChange={(e) => handlePasscodeChange('employee', e.target.value)}
                  placeholder="XXX XXX"
                  className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 placeholder:text-gray-400 text-sm font-mono tracking-wider text-black focus:ring-[#1E5BFF] focus:border-transparent outline-none transition ${
                    errors.employee ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => regeneratePasscode('employee')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Generate new code"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {errors.employee && (
                <p className="mt-1 text-xs text-red-500">{errors.employee}</p>
              )}
            </div>

            {/* Admin Pass Code */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Admin Pass Code (required)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={passcodes.admin}
                  onChange={(e) => handlePasscodeChange('admin', e.target.value)}
                  placeholder="XXX XXX"
                  className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 placeholder:text-gray-400 text-sm font-mono tracking-wider text-black focus:ring-[#1E5BFF] focus:border-transparent outline-none transition ${
                    errors.admin ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => regeneratePasscode('admin')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Generate new code"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {errors.admin && (
                <p className="mt-1 text-xs text-red-500">{errors.admin}</p>
              )}
            </div>

            {/* Guest Pass Code */}
         
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Keep these codes secure. You can change them anytime from your workspace settings.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full mt-6 h-11 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Workspace..." : "Next"}
          </button>
        </div>
      </div>

      {/* Right: Image panel */}
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