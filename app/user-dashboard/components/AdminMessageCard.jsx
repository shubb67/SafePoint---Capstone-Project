"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/_utils/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import clsx from "clsx";


/**
 * Realtime admin message for an incident.
 * - props.incidentId: string (report doc id)
 *
 * Data flow:
 * 1) Listen to reports/{incidentId} to get workspaceId (realtime)
 * 2) When workspaceId available, listen to workspaces/{workspaceId}/requestingInfo/{incidentId} (realtime)
 */
export default function IncidentAdminMessage({ incidentId }) {
  const [loading, setLoading] = useState(true);
  const [messageDoc, setMessageDoc] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!incidentId) return;

    setLoading(true);
    setError("");
    setMessageDoc(null);

    // 1) Listen to the report to resolve workspaceId
    const reportRef = doc(db, "reports", incidentId);
    const unsubReport = onSnapshot(
      reportRef,
      (snap) => {
        if (!snap.exists()) {
          setError("Report not found.");
          setLoading(false);
          return;
        }
        const data = snap.data();
        const workspaceId = data?.workspaceId;

        if (!workspaceId) {
          setError("No workspaceId on this report.");
          setLoading(false);
          return;
        }

        // 2) Now listen to the requestingInfo doc inside that workspace
        const reqRef = doc(db, "workspaces", workspaceId, "requestingInfo", incidentId);

        // Clean up any previous requestingInfo listener before attaching a new one
        // (We capture and return its cleanup from inside this callback.)
        const unsubReq = onSnapshot(
          reqRef,
          (reqSnap) => {
            setLoading(false);
            if (!reqSnap.exists()) {
              setMessageDoc(null);
              setError("No admin message for this incident.");
              return;
            }
            setError("");
            setMessageDoc({ id: reqSnap.id, ...reqSnap.data() });
          },
          (err) => {
            console.error("requestingInfo listener error:", err);
            setLoading(false);
            setError("Failed to subscribe to admin message.");
          }
        );

        // Ensure requestingInfo unsubscribes when either incidentId changes or component unmounts
        return () => unsubReq();
      },
      (err) => {
        console.error("report listener error:", err);
        setLoading(false);
        setError("Failed to subscribe to the report.");
      }
    );

    // Clean up report listener on unmount / incidentId change
    return () => unsubReport();
  }, [incidentId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading admin message…</div>;
  }

  if (error && !messageDoc) {
    return <div className="text-sm text-gray-500">{error}</div>;
  }

  if (!messageDoc) return null;

  // Example shape expected by AdminMessageCard:
  // { message: string, requestedByName?: string, createdAt?: Timestamp, ... }
  return (
    <div
    className={
        [
          // box
          "rounded-md border bg-blue-50",
          // exact border + spacing
          "border-blue-400 p-3",
          // text
          "text-gray-800 text-sm leading-5",
          className
        ].join(" ")
      }
    >
    <p className="font-semibold text-black mb-1">Admin Message:</p>
    <p className="whitespace-pre-line leading-relaxed">{message}</p>
  </div>
);
}
