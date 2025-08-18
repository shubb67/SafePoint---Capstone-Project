// src/Login.js
"use client";

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/_utils/firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBack = () => navigate(-1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailTrim = email.trim();
    const passwordTrim = password.trim();

    if (!emailTrim || !passwordTrim) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // 1) Sign in with Firebase Auth using email and password
      const userCredential = await signInWithEmailAndPassword(auth, emailTrim, passwordTrim);
      const userId = userCredential.user.uid;

      // 2) Get user document to find their workspaces
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setError("User profile not found. Please contact your administrator.");
        setLoading(false);
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();

      // 3) Find all workspaces where this user is a member
      const workspacesRef = collection(db, "workspaces");
      const allWorkspacesSnap = await getDocs(workspacesRef);
      
      let userWorkspaces = [];
      let primaryWorkspace = null;
      let userRole = "employee"; // default role

      // Check each workspace to see if user is in members array
      for (const wsDoc of allWorkspacesSnap.docs) {
        const wsData = wsDoc.data();
        const members = wsData.members || [];
        
        // Check if user is a member of this workspace
        if (members.includes(userId)) {
          const workspace = { id: wsDoc.id, ...wsData };
          userWorkspaces.push(workspace);
          
          // Check if this is the user's current workspace
          if (userData.currentWorkspace === wsDoc.id) {
            primaryWorkspace = workspace;
          }
        }
      }

      // If no workspaces found, check if user is trying to join one
      if (userWorkspaces.length === 0) {
        setError("You are not a member of any workspace. Please ask your admin to add you or use a join code.");
        setLoading(false);
        await auth.signOut();
        return;
      }

      // 4) If no primary workspace set, use the first one
      if (!primaryWorkspace) {
        primaryWorkspace = userWorkspaces[0];
      }

      // 5) Get user's role in the workspace
      // Check workspace_members subcollection for detailed info
      const memberRef = doc(db, "workspace_members", primaryWorkspace.id, "members", userId);
      const memberDoc = await getDoc(memberRef);
      
      if (memberDoc.exists()) {
        const memberData = memberDoc.data();
        userRole = memberData.role || "employee";
        
        // Update last active
        await updateDoc(memberRef, {
          lastActiveAt: serverTimestamp()
        });
      } else {
        // If no member document, check user's workspaces array for role
        if (userData.workspaces && Array.isArray(userData.workspaces)) {
          const wsInfo = userData.workspaces.find(ws => ws.workspaceId === primaryWorkspace.id);
          if (wsInfo) {
            userRole = wsInfo.role || "employee";
          }
        }
        
        // Check if user is the owner
        if (primaryWorkspace.ownerId === userId) {
          userRole = "owner";
        } else if (primaryWorkspace.adminIds && primaryWorkspace.adminIds.includes(userId)) {
          userRole = "admin";
        }
      }

      // 6) Update user's last login and current workspace
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        currentWorkspace: primaryWorkspace.id,
        isActive: true
      });

      // 7) Store session data
      localStorage.setItem("currentWorkspaceSetup", primaryWorkspace.id);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", userId);
      
      // Store list of workspaces if user has multiple
      if (userWorkspaces.length > 1) {
        localStorage.setItem("availableWorkspaces", JSON.stringify(
          userWorkspaces.map(ws => ({ id: ws.id, name: ws.companyName }))
        ));
      }

      // 8) Route based on role
      const roleType = userRole.toLowerCase();
      
      if (roleType === "owner" || roleType === "admin") {
        navigate("/admin-dashboard");
      } else if (roleType === "employee") {
        navigate("/user-dashboard");
      } else {
        // Guest or viewer roles
        navigate("/guest-dashboard");
      }

    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific Firebase Auth errors
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email address.");
      } else if (err.code === 'auth/wrong-password') {
        setError("Incorrect password. Please try again.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address format.");
      } else if (err.code === 'auth/user-disabled') {
        setError("This account has been disabled. Please contact your administrator.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError("Failed to login. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Top bar with back chevron */}
      <div className="px-4 pt-4">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-900">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="w-full max-w-[520px] mx-auto flex-1 px-5 pb-8">
        {/* Brand */}
        <div className="text-center mt-2">
          <div className="flex justify-center mb-4">
            <ShieldMark />
          </div>
          <h1 className="text-[34px] leading-tight font-extrabold text-[#1B2A63]">
            SafePoint
          </h1>
          <p className="mt-3 text-[18px] leading-7 text-gray-600">
            Log in to your SafePoint account to view and
            submit your incident reports.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M22 7L12 13 2 7" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full h-14 pl-11 pr-3 rounded-xl border text-[16px]
                           border-[#B7C2D0] placeholder:text-[#9AA6B2] text-black
                           focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#1E63FF]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full h-14 pl-11 pr-3 rounded-xl border text-[16px]
                           border-[#B7C2D0] placeholder:text-[#9AA6B2] text-black
                           focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#1E63FF]"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Login CTA */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full h-14 rounded-xl text-white text-[18px] font-semibold shadow-sm transition
                        ${loading
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-[#1B2A63] to-[#1E63FF] hover:brightness-110 active:scale-[0.99]"
                        }`}
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          {/* Links */}
          <div className="space-y-3">
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="inline-block text-[15px] font-semibold text-[#1E63FF] hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#1E63FF] hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Have a workspace join code?{' '}
                <Link
                  to="/join-workspace"
                  className="font-semibold text-[#1E63FF] hover:underline"
                >
                  Join with code
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Compact shield mark */
function ShieldMark() {
  return (
    <div className="inline-block relative">
      <svg className="w-[74px] h-[84px] drop-shadow-[0_6px_14px_rgba(0,0,0,.18)]" viewBox="0 0 70 78" fill="none" aria-hidden>
        <defs>
          <linearGradient id="spg" x1="0" y1="0" x2="70" y2="78">
            <stop offset="0" stopColor="#2F5BFF" />
            <stop offset="1" stopColor="#1B2A63" />
          </linearGradient>
        </defs>
        <path
          d="M35 2c9.8 6 19.6 6 29.4 0 1.1-.7 2.6.1 2.6 1.5V41c0 12.4-8.6 23.7-20.6 28.2L35 75l-11.4-5.8C11.6 64.7 3 53.4 3 41V3.5C3 2.1 4.5 1.3 5.6 2 15.4 8 25.2 8 35 2Z"
          fill="url(#spg)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-black text-[28px] leading-none tracking-tight">SP</span>
      </div>
      <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
        <span className="text-[#1B2A63] text-[14px] font-black leading-none">+</span>
      </div>
    </div>
  );
}