// components/ImpactResponseCard.jsx
"use client";
import React from "react";
import { AlertTriangle, CheckCircle2, Play, Volume2 } from "lucide-react";

/**
 * Props:
 *  emergency: boolean
 *  impact: "Minimal"|"Low"|"Medium"|"High"|"Critical"|string
 *  summary: string
 *  onEdit?: () => void
 *  onViewFull?: () => void
 *  audio?: { url: string; name?: string; durationLabel?: string }
 */
export default function ImpactResponseCard({
  emergency = false,
  impact = "Minimal",
  summary = "",
  onEdit,
  onViewFull,
  audio,
}) {
  const { label, barWidth, barBg, barText } = impactMeta(impact);

  return (
    <section className="bg-white rounded-lg">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5  border-[#9CA3AF] flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">Impact &amp; Response</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="p-3 sm:p-4">
        {/* Emergency + Impact */}
        <div className="flex items-stretch gap-4">
          {/* Emergency */}
          <div className="flex-1">
            <div className="text-[12px] font-medium text-gray-600">Emergency?</div>
            <div className="mt-1.5 flex items-center gap-2">
              {emergency ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              <span
                className={`text-[13px] font-semibold ${
                  emergency ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {emergency ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {/* Divider (thin, like the mock) */}
          <div className="w-px bg-gray-200" />

          {/* Impact */}
          <div className="flex-1">
            <div className="text-[12px] font-medium text-gray-600">Impact</div>
            <div className="mt-1.5 h-7 w-[220px] max-w-full rounded-full bg-gray-100 relative overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: barWidth, backgroundColor: barBg }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[12px] font-semibold" style={{ color: barText }}>
                  {label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rule */}
        <div className="my-3 border-t border-gray-200" />

        {/* Response Actions */}
        <div>
          <div className="text-[13px] font-semibold text-gray-900">
            Response Actions{" "}
            <span className="text-gray-400 italic font-normal">(AI Summary)</span>
          </div>
          <p className="mt-1 text-[13px] leading-6 text-gray-800">
            {summary || "—"}
          </p>
          {onViewFull && (
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={onViewFull}
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
              >
                View Full Description
              </button>
            </div>
          )}
        </div>

        {/* Rule */}
        {audio?.url && <div className="my-3 border-t border-gray-200" />}

        {/* Audio */}
        {audio?.url && (
          <div>
            <div className="text-[13px] font-semibold text-gray-900 mb-2">
              Audio Description
            </div>
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <div className="h-9 w-9 rounded-md bg-gray-100 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-gray-900 truncate max-w-[180px]">
                  {audio.name || audio.url.split("/").pop() || "audio"}
                </div>
                {audio.durationLabel && (
                  <div className="text-[12px] text-gray-500">{audio.durationLabel}</div>
                )}
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

function impactMeta(raw) {
  const v = String(raw || "").toLowerCase();
  // pill width kept slim to match the mock
  if (v.startsWith("min"))
    return { label: "Minimal", barWidth: "48%", barBg: "#86EFAC", barText: "#065F46" };
  if (v.startsWith("low"))
    return { label: "Low", barWidth: "40%", barBg: "#BAE6FD", barText: "#075985" };
  if (v.startsWith("med"))
    return { label: "Medium", barWidth: "32%", barBg: "#FDE68A", barText: "#92400E" };
  if (v.startsWith("high"))
    return { label: "High", barWidth: "24%", barBg: "#FCA5A5", barText: "#991B1B" };
  if (v.startsWith("crit"))
    return { label: "Critical", barWidth: "16%", barBg: "#F87171", barText: "#7F1D1D" };
  return { label: capitalize(raw || "Minimal"), barWidth: "48%", barBg: "#86EFAC", barText: "#065F46" };
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
