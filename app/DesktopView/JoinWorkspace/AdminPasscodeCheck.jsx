// AdminPasscodeCheck.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "@/_utils/firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";


export default function AdminPasscodeCheck() {
  const navigate = useNavigate();
  const { state } = useLocation(); // expect { workspaceId, workspaceName } if already verified
  const [errors, setErrors] = useState({});

  // Input state
  const [raw, setRaw] = useState("");
  const formatted = useMemo(() => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    return digits.replace(/(\d{3})(\d{0,3})/, (_, a, b) => (b ? `${a} ${b}` : a));
  }, [raw]);
  const cleaned = formatted.replace(/\s/g, "");
  const isValid = cleaned.length === 6;

  // UI state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [verified, setVerified] = useState(null); // { workspaceId, workspaceName }

  // 🔹 If previous page already verified, hydrate from router state or sessionStorage.
  useEffect(() => {
    if (state?.workspaceId) {
      setVerified({
        workspaceId: state.workspaceId,
        workspaceName: state.workspaceName || "your company",
      });
      return;
    }
    const already = sessionStorage.getItem("adminAccess") === "true";
    if (already) {
      const wsId = sessionStorage.getItem("adminWorkspaceId");
      const wsName = sessionStorage.getItem("adminWorkspaceName") || "your company";
      if (wsId) setVerified({ workspaceId: wsId, workspaceName: wsName });
    }
  }, [state]);

  async function verifyAdminCode() {
    if (!isValid || loading) return;
    setErr(null);
    setLoading(true);

    try {
      // Read all workspaces and search their passCodes array for an active admin code
      const wsSnap = await getDocs(collection(db, "workspaces"));
      let found = null;

      wsSnap.forEach((docSnap) => {
        if (found) return;
        const data = docSnap.data() || {};
        const passCodes = Array.isArray(data.passCodes) ? data.passCodes : [];

        const match = passCodes.find((p) => {
          const type = String(p?.type || "").toLowerCase();
          const label = String(p?.label || "").toLowerCase();
          return (
            p?.code === cleaned &&
            p?.isActive === true &&
            (type === "admin" || label.includes("admin"))
          );
        });

        if (match) {
          found = {
            workspaceId: docSnap.id,
            workspaceName: data?.companyName || "your company",
          };
        }
      });

      if (!found) {
        setErr("Invalid admin pass code, or the code is inactive.");
        return;
      }

      setVerified(found); // show success view
    } catch (e) {
      console.error("Verify admin code failed:", e);
      setErr("Something went wrong while verifying the pass code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

// 🔷 Write membership on Continue
async function handleContinue() {
    if (!verified) return;

    const user = auth.currentUser;
    if (!user) {
      setErr("You must be signed in to continue.");
      return;
    }

    const { workspaceId, workspaceName } = verified;
    const now = serverTimestamp();

    try {
      // users/{uid} — upsert core membership fields
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const isFirstJoin = !userSnap.exists() || !userSnap.data()?.workspaceId;

      await (userSnap.exists()
        ? updateDoc(userRef, {
            workspaceId,
            role: "admin",
            // keep joinedAt if already set
          })
        : setDoc(userRef, {
            workspaceId,
            role: "admin",
            joinedAt: now,
            lastActive: now,
            email: user.email || null,
            uid: user.uid,
          }, { merge: true })
      );

       // ---- workspaces/{ws} members map ----
       const wsRef = doc(db, "workspaces", workspaceId);
       const wsSnap = await getDoc(wsRef);
       const existing = wsSnap.exists() ? wsSnap.data()?.members?.[user.uid] : null;
 
       // build a single update object using field paths
       const updates = {
         [`members.${user.uid}.userId`]: user.uid,
         [`members.${user.uid}.role`]: "admin",
         [`members.${user.uid}.lastActiveAt`]: now,
       };
       if (!existing?.joinedAt) {
         updates[`members.${user.uid}.joinedAt`] = now;
       }
 
       await updateDoc(wsRef, updates);

      // persist session + navigate
      sessionStorage.setItem("adminAccess", "true");
      sessionStorage.setItem("adminWorkspaceId", workspaceId);
      sessionStorage.setItem("adminWorkspaceName", workspaceName);

      navigate("/admin-dashboard", {
        state: { isAdmin: true, workspaceId, workspaceName },
      });
    } catch (e) {
      console.error("Failed to save membership:", e);
      setErr("Could not save your admin access. Please try again.");
    }
  }



  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      {/* Left panel */}
      <div className="col-span-12 lg:col-span-7 bg-[#16244c] flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-xl px-10 sm:px-14 py-8">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="mb-6 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1a2b5c] hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {verified ? (
            // Success screen
            <div className="text-center">
              <h2 className="text-[18px] font-semibold text-[#1a2b5c]">Pass code accepted</h2>
              <p className="mt-1 text-xs text-gray-600">
                You’re about to join{" "}
                <span className="font-medium">{verified.workspaceName}</span> as an admin.
              </p>

              <div className="mt-8 mb-10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-28 w-28 text-green-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="w-full h-10 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#306fe0] transition"
              >
                Continue
              </button>
            </div>
          ) : (
            // Entry form
            <>
              <h1 className="text-center text-[22px] font-semibold text-[#1a2b5c] mb-2">
                Enter Admin Pass Code to Join Company
              </h1>
              <p className="text-center text-xs text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Enter the 6-digit admin pass code you received from your company’s SafePoint administrator.
                This will give you access to manage incidents, locations, and team members.
              </p>

              <div className="space-y-2">
                <label className="block text-[11px] text-gray-500">
                  Employee Pass Code <span className="italic">(required)</span>
                </label>
                <input
                  value={formatted}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    if (err) setErr(null);
                  }}
                  inputMode="numeric"
                  placeholder="XXX XXX"
                  className={[
                    "w-full px-4 py-3 border rounded-lg text-sm",
                    "placeholder:text-gray-400 font-mono tracking-wider text-black",
                    "focus:outline-none focus:ring-2 focus:ring-[#1a2b5c]/20 focus:border-[#1a2b5c]",
                    err ? "border-red-500" : "border-gray-300",
                  ].join(" ")}
                />
                {err && <p className="text-xs text-red-600">{err}</p>}
              </div>

              <button
                onClick={verifyAdminCode}
                disabled={!isValid || loading}
                className={[
                  "mt-10 w-full rounded-lg py-3 text-sm font-medium transition",
                  !isValid || loading
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-[#1a2b5c] text-white hover:opacity-95",
                ].join(" ")}
              >
                {loading ? "Verifying…" : "Next"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right hero image */}
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
