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
  
      // Check each workspace to see if user is in members object
      for (const wsDoc of allWorkspacesSnap.docs) {
        const wsData = wsDoc.data();
        const members = wsData.members || {};
        
        // Check if user is a member of this workspace (members is an object)
        if (members[userId]) {
          const workspace = { id: wsDoc.id, ...wsData };
          userWorkspaces.push(workspace);
          
          // Check if this is the user's current workspace
          if (userData.workspaceId === wsDoc.id || userData.currentWorkspace === wsDoc.id) {
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
  
      // 5) Determine user's role with multiple checks
      // First check if user is the owner
      if (primaryWorkspace.ownerId === userId) {
        userRole = "owner";
      } else {
        // Check members object for role
        const members = primaryWorkspace.members || {};
        const memberData = members[userId];
        
        if (memberData) {
          // Handle different possible role structures
          if (typeof memberData === 'object') {
            // Role might be stored as memberData.role
            if (memberData.role) {
              userRole = memberData.role;
            }
            // Or it might be stored as memberData.userRole
            else if (memberData.userRole) {
              userRole = memberData.userRole;
            }
          } else if (typeof memberData === 'string') {
            // Sometimes role might be stored directly as a string
            userRole = memberData;
          }
        }
        
        // Also check if role is stored in the user document
        if (userData.role) {
          userRole = userData.role;
        }
        
        // Check if there's a workspace-specific role in user data
        if (userData.workspaceRoles && userData.workspaceRoles[primaryWorkspace.id]) {
          userRole = userData.workspaceRoles[primaryWorkspace.id];
        }
      }
  
      // Normalize role string (handle case variations)
      userRole = userRole.toLowerCase().trim();
      
      // Handle role variations
      const adminRoles = ['admin', 'administrator', 'owner', 'superadmin'];
      const employeeRoles = ['employee', 'user', 'member', 'staff'];
      const guestRoles = ['guest', 'viewer', 'visitor'];
      
      let normalizedRole = 'employee'; // default
      
      if (adminRoles.includes(userRole)) {
        normalizedRole = 'admin';
      } else if (employeeRoles.includes(userRole)) {
        normalizedRole = 'employee';
      } else if (guestRoles.includes(userRole)) {
        normalizedRole = 'guest';
      } else {
        // If role doesn't match known types, keep original
        normalizedRole = userRole;
      }
  
      // 6) Update user's last login and current workspace
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        currentWorkspace: primaryWorkspace.id,
        isActive: true
      });
  
      // 7) Update member's last active time in workspace (with error handling)
      try {
        const workspaceRef = doc(db, "workspaces", primaryWorkspace.id);
        await updateDoc(workspaceRef, {
          [`members.${userId}.lastActiveAt`]: serverTimestamp()
        });
      } catch (updateError) {
        console.warn("Could not update member's last active time:", updateError);
        // Continue with login even if this update fails
      }
  
      // 8) Store session data
      localStorage.setItem("currentWorkspaceSetup", primaryWorkspace.id);
      localStorage.setItem("userRole", normalizedRole);
      localStorage.setItem("userId", userId);
      localStorage.setItem("originalRole", userRole); // Store original role for debugging
      
      // Store list of workspaces if user has multiple
      if (userWorkspaces.length > 1) {
        localStorage.setItem("availableWorkspaces", JSON.stringify(
          userWorkspaces.map(ws => ({ id: ws.id, name: ws.companyName || ws.name }))
        ));
      }

      console.log("Login role resolution:", {
        userId,
        originalRole: userRole,
        normalizedRole,
        primaryWorkspaceId: primaryWorkspace?.id,
        isOwner: primaryWorkspace?.ownerId === userId,
        memberData: primaryWorkspace.members?.[userId],
        userData: userData
      });
  
      // 9) Route based on normalized role
      if (normalizedRole === "admin" || normalizedRole === "owner") {
        console.log("Routing to admin dashboard");
        navigate("/admin-dashboard");
      } else if (normalizedRole === "employee") {
        console.log("Routing to user dashboard");
        navigate("/user-dashboard");
      } else if (normalizedRole === "guest") {
        console.log("Routing to guest dashboard");
        navigate("/guest-dashboard");
      } else {
        // Fallback: if role is unrecognized, default to user dashboard
        console.log("Unknown role, defaulting to user dashboard");
        navigate("/user-dashboard");
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
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please try again.");
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
      <div className="relative drop-shadow-[0_10px_20px_rgba(0,0,0,.25)]">
      
      <img src="/assets/images/safepointlogo.png" alt="" className="w-[160px] h-[160px]" />
               
          </div>
      <div className="absolute inset-0 flex items-center justify-center">
   </div>
      </div>
    
  );
}

function ShieldSPLarge() {
  return (
    <div className="relative drop-shadow-[0_10px_20px_rgba(0,0,0,.25)]">
      
<img src="/assets/images/safepointlogo.png" alt="" className="w-[160px] h-[160px]" />
         
    </div>
  );
}