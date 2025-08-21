// src/UserOnboarded.js
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/_utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function UserOnboarded() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  useEffect(() => {
    // Check if user is authenticated and get their display name
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Extract first name from display name
        const firstName = user.displayName?.split(" ")[0] || "there";
        setUserName(firstName);
        setLoading(false);
      } else {
        // Redirect to login if not authenticated
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCreateWorkspace = () => {
    navigate("/create-workspace");
  };

  const handleJoinWorkspace = () => {
    navigate("/join-with-passcode");
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
      {/* Left: Welcome Card */}
      <div className="col-span-12 lg:col-span-6 bg-[#16244c] grid place-items-center px-6 lg:px-10">
        <div className="w-full max-w-[680px] bg-white rounded-2xl shadow-xl px-6 sm:px-10 py-8 sm:py-10">
          
          {/* Back Arrow */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="text-xl text-gray-700 hover:text-gray-900"
              aria-label="Back"
            >
              ←
            </button>
          </div>

          {/* Title */}
          <h1 className="text-center text-[22px] font-semibold text-[#1a2b5c]">
            Welcome, {userName}
          </h1>
          <p className="text-center text-sm text-gray-500 mt-2 mb-8">
            Let's connect you to your workspace on SafePoint.
          </p>

          {/* Create New Workspace - Blue Card */}
          <button 
            onClick={handleCreateWorkspace}
            className="w-full bg-gray-100 hover:bg-[#3B82F6] hover:text-white rounded-xl p-8 transition-all duration-200 group mb-4"
          >
            <div className="flex flex-col items-center justify-center text-black hover:text-white">
              {/* Icon */}
              <div className="w-20 h-20  bg-transparent rounded-lg flex items-center justify-center mb-4 text-black ">
              <svg xmlns="http://www.w3.org/2000/svg" width="100" height="101" viewBox="0 0 100 101" fill="none">
  <path d="M87.5 59.0833V79.9167C87.5 82.1268 86.622 84.2464 85.0592 85.8092C83.4964 87.372 81.3768 88.25 79.1667 88.25H20.8333C18.6232 88.25 16.5036 87.372 14.9408 85.8092C13.378 84.2464 12.5 82.1268 12.5 79.9167V21.5833C12.5 19.3732 13.378 17.2536 14.9408 15.6908C16.5036 14.128 18.6232 13.25 20.8333 13.25H41.6667V21.5833H20.8333V79.9167H79.1667V59.0833H87.5Z" fill="black"/>
  <path d="M87.5 29.9167H70.8333V13.25H62.5V29.9167H45.8333V38.25H62.5V54.9167H70.8333V38.25H87.5V29.9167Z" fill="black"/>
</svg> </div>
              <span className="text-base font-semibold">
                Create New Workspace
              </span>
            </div>
          </button>

          {/* Join Existing Workspace - Gray Card */}
          <button 
            onClick={handleJoinWorkspace}
            className="w-full bg-gray-100 hover:bg-gray-200 rounded-xl p-8 transition-all duration-200 group"
          >
            <div className="flex flex-col items-center justify-center text-gray-700">
              {/* Building Icon */}
              <div className="w-20 h-20 bg-transparent rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="100" height="101" viewBox="0 0 100 101" fill="none">
  <path d="M75 62.75H66.6666V71.0833H75M75 46.0833H66.6666V54.4167H75M83.3333 79.4167H50V71.0833H58.3333V62.75H50V54.4167H58.3333V46.0833H50V37.75H83.3333M41.6666 29.4167H33.3333V21.0833H41.6666M41.6666 46.0833H33.3333V37.75H41.6666M41.6666 62.75H33.3333V54.4167H41.6666M41.6666 79.4167H33.3333V71.0833H41.6666M25 29.4167H16.6666V21.0833H25M25 46.0833H16.6666V37.75H25M25 62.75H16.6666V54.4167H25M25 79.4167H16.6666V71.0833H25M50 29.4167V12.75H8.33331V87.75H91.6667V29.4167H50Z" fill="black"/>
</svg>
              </div>
              <span className="text-base font-semibold">
                Join Existing Workspace
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Right: Image panel (desktop only) */}
      <div className="hidden lg:block col-span-6 relative">
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