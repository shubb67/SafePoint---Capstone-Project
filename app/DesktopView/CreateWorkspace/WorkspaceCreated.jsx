// src/WorkspaceCreated.js
"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/_utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function WorkspaceCreated() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user's workspaces to find the most recent one
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const workspaces = userData.workspaces || [];
            
            if (workspaces.length > 0) {
              // Get the most recent workspace
              const recentWorkspace = workspaces[workspaces.length - 1];
              const wsDoc = await getDoc(doc(db, "workspaces", recentWorkspace.workspaceId));
              
              if (wsDoc.exists()) {
                const wsData = wsDoc.data();
                setCompanyName(wsData.companyName || "Your Company");
                
                // Update user's current workspace
                await updateDoc(doc(db, "users", user.uid), {
                  currentWorkspace: recentWorkspace.workspaceId
                });
              }
            }
          }
        } catch (error) {
          console.error("Error fetching workspace data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleContinue = () => {
    navigate("/admin-dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full grid place-items-center bg-[#16244c]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left: Success Card */}
      <div className="col-span-12 lg:col-span-7 bg-[#16244c] flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-xl px-10 sm:px-14 py-10">
          
          {/* Progress Bar - Complete */}
          <div className="mb-8">
            <div className="text-center text-xs text-gray-500 mb-2">
              Complete
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-[#1E5BFF] h-1.5 rounded-full transition-all duration-500" 
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-[24px] font-semibold text-[#1a2b5c] mb-3">
            Company Setup Complete
          </h1>
          <p className="text-center text-sm text-gray-600 mb-10">
            You've created {companyName ? `[${companyName}]` : 'your company'} on SafePoint.<br />
            Your workspace is now ready for admins and employees to join.
          </p>

          {/* Success Icon */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              {/* Animated circle */}
              <svg 
                className="w-32 h-32 animate-draw-circle"
                viewBox="0 0 128 128"
              >
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="377"
                  strokeDashoffset="377"
                  style={{
                    animation: 'drawCircle 0.6s ease-out forwards'
                  }}
                />
                {/* Checkmark */}
                <path
                  d="M40 64 L56 80 L88 48"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="100"
                  strokeDashoffset="100"
                  style={{
                    animation: 'drawCheck 0.4s ease-out 0.5s forwards'
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full h-12 rounded-lg bg-[#1E5BFF] text-white font-semibold hover:bg-[#154fe6] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Continue
          </button>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">What's Next?</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Share pass codes with your team members</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Start reporting and managing incidents</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Customize your workspace settings</span>
              </li>
            </ul>
          </div>
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

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes drawCircle {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}