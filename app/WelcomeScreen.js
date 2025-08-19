// src/auth/SignUpLanding.jsx
"use client";
import React from "react";
import { Link } from "react-router-dom"; // swap to next/link if needed
import { useNavigate } from "react-router-dom";
import useIsDesktop from "./hooks/useIsDesktop";
import {useEffect} from "react";

export default function SignUpLanding() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop(1024); // desktop if ≥ 1024px or UA says non‑mobile

  // useEffect(() => {
  //   if (isDesktop) {
  //     navigate("/sign-up", { replace: true });
  //   }
  // }, [isDesktop, navigate]);

  // if (isDesktop) return null;
  return (
    <div className="min-h-dvh w-full bg-white flex items-stretch justify-center">
      <div className="w-full max-w-[480px] mx-auto flex flex-col h-dvh">
        {/* HERO - Reduced height */}
        <div className="relative w-full flex-shrink-0" style={{ maxHeight: '40vh' }}>
          <img
            src="assets/images/hero.png"
            alt=""
            className="block w-full h-full object-cover object-bottom select-none"
            draggable="false"
            style={{ maxHeight: '50vh' }}
          />

          {/* Exact gradient: linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFF 83.16%) */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{
              height: "22%", 
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 83.16%)",
            }}
          />

          {/* Centered SP+ badge overlapping image + content */}
          <div className="absolute left-1/2 -translate-x-1/2 translate-y-6 bottom-0">
            <ShieldSPLarge />
          </div>
        </div>

        {/* CONTENT - Scrollable if needed */}
        <div className="flex-1 overflow-y-auto px-5 pt-16 pb-0">
          <h1 className="text-[#192C63] text-center font-extrabold tracking-tight leading-[1.05] text-[42px]">
            Welcome to
            <br />
            SafePoint
          </h1>

          <p className="mt-5 text-center text-[18px] leading-7 text-gray-500">
            Safer worksites start here. Report incidents, upload
            evidence, and keep your team protected.
          </p>
        </div>

        {/* BUTTONS - Fixed at bottom */}
        <div className="flex-shrink-0 px-5 pb-8 pt-6 bg-white">
          <div className="space-y-4">
            <Link to="/join-with-passcode" className="block">
              <button
                type="button"
                className="w-full h-14 rounded-xl bg-gray-100 text-gray-900 font-semibold border border-gray-200 shadow-sm hover:bg-gray-200 active:scale-[0.99] transition"
              >
                Create Account
              </button>
            </Link>

            <Link to="/login" className="block">
              <button
                type="button"
                className="w-full h-14 rounded-xl text-white font-semibold shadow-sm active:scale-[0.99] transition
                           bg-gradient-to-r from-[#192C63] to-[#1E62FF]"
              >
                Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Large SP+ shield like your mock */
function ShieldSPLarge() {
  return (
    <div className="relative drop-shadow-[0_10px_20px_rgba(0,0,0,.25)]">
      
<img src="/assets/images/safepointlogo.png" alt="" className="w-[160px] h-[160px]" />
         
    </div>
  );
}