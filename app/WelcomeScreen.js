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
      <div className="w-full max-w-[480px] mx-auto flex flex-col">
        {/* HERO */}
        <div className="relative w-full">
  <img
    src="assets/images/hero.png"
    alt=""
    className="block w-full h-auto object-contain select-none"
    draggable="false"
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

        {/* CONTENT */}
        <div className="px-5 pt-16 pb-8">
          <h1 className="text-[#192C63] text-center font-extrabold tracking-tight leading-[1.05] text-[42px]">
            Welcome to
            <br />
            SafePoint
          </h1>

          <p className="mt-5 text-center text-[18px] leading-7 text-gray-500">
            Safer worksites start here. Report incidents, upload
            evidence, and keep your team protected.
          </p>

          {/* Buttons */}
          <div className="mt-8 space-y-4">
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
      <svg
        className="w-[120px] h-[132px]"
        viewBox="0 0 70 78"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="spg" x1="0" y1="0" x2="70" y2="78">
            <stop offset="0" stopColor="#2F5BFF" />
            <stop offset="1" stopColor="#1631B2" />
          </linearGradient>
        </defs>
        <path
          d="M35 2c9.8 6 19.6 6 29.4 0 1.1-.7 2.6.1 2.6 1.5V41c0 12.4-8.6 23.7-20.6 28.2L35 75l-11.4-5.8C11.6 64.7 3 53.4 3 41V3.5C3 2.1 4.5 1.3 5.6 2 15.4 8 25.2 8 35 2Z"
          fill="url(#spg)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="leading-none text-white font-extrabold -mt-[4px]">
          <span className="text-[40px]">SP</span>
          <span className="ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white">
            <span className="text-[#1b2a63] text-[18px] font-black">+</span>
          </span>
        </div>
      </div>
    </div>
  );
}
