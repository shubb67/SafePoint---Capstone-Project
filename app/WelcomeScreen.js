// src/WelcomeScreen.js
"use client";

import React from "react";
import { Link } from "react-router-dom";

export default function WelcomeScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[#fafafa] box-border">
      <div className="w-full max-w-4xl px-4 box-border">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
          
          {/* Left Panel */}
          <div className="w-full text-center md:w-1/2 md:text-left">
            <h1 className="text-[2rem] font-bold text-[#1a2634] mb-2 md:text-[2.5rem] lg:text-[3rem]">
              Welcome to SafePoint
            </h1>
            <p className="text-[1rem] text-[#555] max-w-[360px] mx-auto md:mx-0 
                          md:text-[1.1rem] lg:text-[1.2rem] md:max-w-[400px] lg:max-w-[500px] leading-relaxed">
              Safer worksites start here. Report incidents, upload evidence, and keep
              your team protected—all in one place.
            </p>
          </div>

          {/* Right Panel */}
          <div className="w-full flex flex-col items-center md:w-1/2 md:items-start">
            {/* Image placeholder */}
            <div className="w-full max-w-[360px] aspect-square bg-gray-200 rounded-lg mb-6 
                            md:max-w-[400px] lg:max-w-[500px]"></div>

            {/* Create New Account */}
            <Link
              to="/create-account"
              className="w-full max-w-[360px] mb-3 px-0 py-3 text-base text-center font-semibold
                         text-[#192C63] border-2 border-[#192C63] rounded-lg
                         hover:bg-[#192C63] hover:text-white transition
                         md:max-w-[400px] lg:max-w-[500px]"
            >
              Create New Account
            </Link>

            {/* Login to Existing Account */}
            <Link
              to="/login"
              className="w-full max-w-[360px] px-0 py-3 text-base text-center font-semibold
                         bg-[#192C63] text-white rounded-lg hover:bg-[#16202a]
                         transition md:max-w-[400px] lg:max-w-[500px]"
            >
              Login to Existing Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
