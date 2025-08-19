// src/onboarding/JoinWorkplace.jsx
"use client";

import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { ChevronLeft, HelpCircle } from "lucide-react";

export default function JoinWorkplace() {
  const navigate = useNavigate();

  const [pin, setPin] = useState("");                 // raw (no space), max 6
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState("default"); // "default" | "keyboard" | "custom"
  const [keyboardMode, setKeyboardMode] = useState("numeric");
  const inputRef = useRef(null);

  // "ABC 123" presentation
  const prettyPin = useMemo(() => {
    const clean = pin.slice(0, 6);
    return clean.replace(/^(.{0,3})(.{0,3}).*$/, (_, a, b) =>
      [a, b].filter(Boolean).join(" ")
    );
  }, [pin]);

  const handlePinInput = (val) => {
    const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    setPin(clean);
    setError("");
  };

  const disabled = pin.length !== 6 || checking;

  /**
   * Try to find a workspace that contains this pass code.
   * First with a helper array field "passCodesCodes" (if you maintain it),
   * otherwise scan a small batch and check passCodes array.
   */
  async function findWorkspaceByCode(code) {
    // fast path (optional helper field)
    try {
      const fastQ = query(
        collection(db, "workspaces"),
        where("passCodesCodes", "array-contains", code),
        limit(1)
      );
      const fastSnap = await getDocs(fastQ);
      if (!fastSnap.empty) {
        const d = fastSnap.docs[0];
        return { id: d.id, data: d.data() };
      }
    } catch (_) {
      // ignore and fall back to scan
    }

    // fallback: small scan
    const scanSnap = await getDocs(query(collection(db, "workspaces"), limit(50)));
    for (const d of scanSnap.docs) {
      const data = d.data();
      const arr = Array.isArray(data.passCodes) ? data.passCodes : [];
      if (arr.some((p) => (p?.code || "").toUpperCase() === code)) {
        return { id: d.id, data };
      }
    }
    return null;
  }

  // Validate the employee pass entry using your structure
  function validatePassEntry(entry) {
    if (!entry) return "Invalid code.";
    if ((entry.type || "").toLowerCase() !== "employee") {
      return "This code is not for employees.";
    }
    if (entry.isActive === false) {
      return "This code is inactive.";
    }
    if (
      entry.usageLimit != null &&
      typeof entry.usedCount === "number" &&
      entry.usedCount >= entry.usageLimit
    ) {
      return "This code has reached its usage limit.";
    }
    return null;
  }

  async function handleEnter() {
    if (disabled) return;
    const code = pin.toUpperCase();

    try {
      setChecking(true);
      setError("");

      // 1) Locate workspace
      const ws = await findWorkspaceByCode(code);
      if (!ws) {
        setError("We couldn’t find a workplace with that pass code.");
        return;
      }
      const { id: workspaceId, data } = ws;

      // 2) Find the matching pass entry
      const passCodes = Array.isArray(data.passCodes) ? data.passCodes : [];
      const pass = passCodes.find((p) => (p?.code || "").toUpperCase() === code);

      // 3) Validate (employee only + active + limits)
      const vErr = validatePassEntry(pass);
      if (vErr) {
        setError(vErr);
        return;
      }

      // 4) No auth writes here — this is pre-signup.
      //    Just carry context forward to Create Account.
      //    (You’ll attach user->workspace and increment usedCount after account creation.)
      const ctx = {
        joinMode: "employee",
        workspaceId,
        workspaceName: data.name || data.title || "Workspace",
        passCode: code,
        passPermissions: Array.isArray(pass.permissions) ? pass.permissions : [],
        organizationId: data.organizationId || null,
      };

      // Optional: put a tiny backup in sessionStorage in case of a refresh
      try {
        sessionStorage.setItem("signupWorkspaceCtx", JSON.stringify(ctx));
      } catch {}

      navigate("/create-account", { state: ctx, replace: true });
    } catch (e) {
      console.error(e);
      setError("Couldn’t verify the code. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#142651] text-white flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center px-4 gap-3">
        <button onClick={() => nav(-1)} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Join Workplace</h1>
        <div className="ml-auto p-1" title="Help">
          <HelpCircle className="w-5 h-5 opacity-80" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-between pb-8">
        {/* PIN field */}
        <div className="mt-[18vh] text-[40px] font-semibold tracking-[0.1em]">
          <input
            ref={inputRef}
            value={prettyPin}
            onChange={(e) => handlePinInput(e.target.value)}
            onFocus={() => setInputMode("keyboard")}
            inputMode={keyboardMode === "numeric" ? "numeric" : "text"}
            autoCapitalize="characters"
            maxLength={8} // includes the space
            placeholder="PIN"
            aria-label="Workplace PIN"
            className="bg-transparent outline-none text-center caret-white placeholder:opacity-60 w-[10ch]"
          />
        </div>

        {/* Error */}
        {!!error && (
          <div className="w-full max-w-sm px-4 -mt-6">
            <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="w-full max-w-sm px-4 flex flex-col gap-3">
          <button
            onClick={handleEnter}
            disabled={disabled}
            className={`h-11 rounded-lg font-semibold transition ${
              disabled
                ? "bg-white/20 cursor-not-allowed"
                : "bg-[#2563EB] hover:bg-[#1E4FD6]"
            }`}
          >
            {checking ? "Checking…" : "Enter"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setInputMode("keyboard");
                inputRef.current?.focus();
              }}
              className="h-10 rounded-md bg-white/10 hover:bg-white/15 text-sm"
            >
              ⌨️ Enter Pin
            </button>
            <button
              type="button"
              onClick={() => {
                // hook up your QR scanner route/sheet here
                nav("/scan-qr");
              }}
              className="h-10 rounded-md bg-white/10 hover:bg-white/15 text-sm"
            >
              🧾 Scan QR Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
