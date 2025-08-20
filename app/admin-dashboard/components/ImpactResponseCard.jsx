// components/ImpactResponseCard.jsx
"use client";
import React from "react";
import { AlertTriangle, CheckCircle2, Play, Volume2 } from "lucide-react";

/** Props:
 *  emergency: boolean
 *  impact: "Minimal"|"Low"|"Medium"|"High"|"Critical" (or any string)
 *  summary: string
 *  onViewFull: () => void
 *  audio?: { url: string; name?: string; durationLabel?: string }
 *  barWidth?: number | string   // NEW: control the impact pill width (e.g., 120, "10rem")
 */
export default function ImpactResponseCard({
  emergency = false,
  impact = "Minimal",
  summary = "",
  onViewFull,
  audio,
  barWidth = 140, // default narrower width
}) {
  const impactMeta = getImpactMeta(impact);

  return (
    <section className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Impact &amp; Response</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Emergency + Impact */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          {/* Emergency */}
          <div className="min-w-[180px]">
            <div className="text-xs font-medium text-gray-500 mb-1">Emergency</div>
            <div className="flex items-center gap-2">
              {emergency ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  emergency ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {emergency ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-10 w-px bg-gray-200" />
          <div className="sm:hidden h-px w-full bg-gray-200" />

          {/* Impact pill bar */}
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500 mb-1">Impact</div>
            <div
              className="h-7 rounded-full bg-gray-100 relative overflow-hidden"
              
              style={{
                // Narrower overall bar width (controls total pill size)
                width: typeof barWidth === "number" ? `${barWidth}px` : barWidth,
              }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: impactMeta.width, // percentage of the overall pill
                  backgroundColor: impactMeta.bg,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold" style={{ color: impactMeta.fg }}>
                  {impactMeta.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Response Actions (AI Summary) */}
        <div>
          <div className="text-sm font-semibold text-gray-900 mb-1">
            Response Actions <span className="text-gray-400 font-normal">(AI Summary)</span>
          </div>
          <p className="text-sm text-gray-700 leading-6">{summary || "—"}</p>
          {onViewFull && (
            <button
              type="button"
              onClick={onViewFull}
              className="mt-2 text-xs font-medium text-blue-700 hover:underline"
            >
              View Full Description
            </button>
          )}
        </div>

        {/* Audio Description */}
        {audio?.url && (
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">Audio Description</div>

            <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <div className="h-9 w-9 rounded-md bg-gray-100 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                  {audio.name || audio.url.split("/").pop() || "audio"}
                </div>
                <div className="text-xs text-gray-500">{audio.durationLabel || ""}</div>
              </div>

              <a
                href={audio.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center justify-center h-8 w-8 rounded-md bg-gray-100 hover:bg-gray-200"
                aria-label="Play audio"
              >
                <Play className="w-4 h-4 text-gray-700" />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getImpactMeta(raw) {
  const value = String(raw || "").toLowerCase();
  const base = { label: capitalize(raw || "Minimal"), width: "100%", bg: "#DCFCE7", fg: "#065F46" };

  // Visual width ramp in % of the (now smaller) pill
  if (value.startsWith("min")) return { label: "Minimal", width: "100%", bg: "#DCFCE7", fg: "#065F46" };
  if (value.startsWith("low")) return { label: "Low", width: "75%", bg: "#E0F2FE", fg: "#075985" };
  if (value.startsWith("med")) return { label: "Medium", width: "55%", bg: "#FEF3C7", fg: "#92400E" };
  if (value.startsWith("high")) return { label: "High", width: "35%", bg: "#FEE2E2", fg: "#991B1B" };
  if (value.startsWith("crit")) return { label: "Critical", width: "20%", bg: "#FECACA", fg: "#7F1D1D" };
  return base;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
