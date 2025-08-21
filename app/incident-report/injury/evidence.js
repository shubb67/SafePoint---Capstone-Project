// src/incident-report/Evidence.js
"use client";

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { CloudUpload, Camera, Trash, FileImage, FileText, XCircle } from "lucide-react";
import axios from "axios";

export default function Evidence() {
  const navigate  = useNavigate();
  const dispatch  = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // In-flight/failed tasks:
  // { file, progress, cancel, sizeReadable, status: 'uploading'|'failed', errorMessage?: string, startedAt?: number }
  const [tasks, setTasks] = useState([]);

  // Completed successes: { url, name, sizeReadable, type }
  const [uploads, setUploads] = useState([]);

  // Global banner (e.g., invalid type)
  const [bannerError, setBannerError] = useState("");

  const fileRef   = useRef();
  const cameraRef = useRef();

  const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);
  const ACCEPT_ATTR = "image/*,application/pdf"; // picker filter

  const humanFileSize = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return mb < 0.1 ? `${(mb * 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const pushFailedTask = (file, msg) => {
    const sizeReadable = humanFileSize(file.size);
    setTasks(ts => [
      ...ts,
      { file, progress: 0, cancel: null, sizeReadable, status: "failed", errorMessage: msg }
    ]);
  };

  const DEBUG_UPLOADS = true; // set false in prod if you don’t want verbose console logs

function extractServerError(err) {
  // Axios error anatomy
  const resp     = err?.response;
  const req      = err?.request;
  const status   = resp?.status || 0;

  // Try to pull a meaningful message from JSON or plain text
  let serverMsg = "";
  if (typeof resp?.data === "string") {
    serverMsg = resp.data;
  } else if (resp?.data) {
    serverMsg = resp.data.error || resp.data.message || resp.data.detail?.message || JSON.stringify(resp.data);
  }

  // Common IDs for tracing
  const requestId = resp?.data?.detail?.requestId
                 || resp?.headers?.["x-amz-request-id"]
                 || resp?.headers?.["x-amz-id-2"]
                 || resp?.headers?.["x-vercel-id"]
                 || resp?.headers?.["x-request-id"]
                 || undefined;

  // Axios code like 'ECONNABORTED', 'ERR_NETWORK', etc.
  const code = err?.code || resp?.data?.detail?.name || resp?.data?.name;

  // Network/CORS: no response came back
  if (!resp && req) {
    return {
      status: 0,
      code: code || "NETWORK_ERROR",
      message: err?.message || "Network error (possible CORS or DNS).",
      requestId,
      raw: { err }
    };
  }

  // Fallbacks
  const message = serverMsg || err?.message || "Unknown server error";

  return { status, code, message, requestId, raw: { data: resp?.data, headers: resp?.headers } };
}

const addUploadTask = (file) => {
  // Validate type
  if (!ALLOWED.has(file.type)) {
    pushFailedTask(file, "Invalid file type. Please upload JPG, PNG, or PDF files only.");
    return;
  }

  const cancelSrc   = axios.CancelToken.source();
  const sizeReadable= humanFileSize(file.size);
  const startedAt   = Date.now();

  setTasks(ts => [
    ...ts,
    { file, progress: 0, cancel: cancelSrc.cancel, sizeReadable, status: "uploading", startedAt }
  ]);

  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onloadend = async () => {
    try {
      const res = await axios.post(
        "/api/aws",
        {
          fileName: file.name,
          fileType: file.type,
          base64:   reader.result,
          incidentType,
          category: "evidence",
          step:     "images",
        },
        {
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          timeout: 60_000, // helpful on slow networks
          onUploadProgress: (e) => {
            const total = e.total || file.size || 1; // safer fallback
            const prog  = Math.round((e.loaded * 100) / total);
            setTasks(ts => ts.map(t => (t.file === file ? { ...t, progress: prog } : t)));
          },
          cancelToken: cancelSrc.token
        }
      );

      // success → move to uploads, remove from tasks
      const url = res?.data?.url;
      if (!url || !/^https?:\/\//i.test(url)) {
        // server responded but didn’t provide a usable URL
        throw new Error("Upload succeeded but server did not return a valid file URL.");
      }

      setUploads(u => [
        ...u,
        { url, name: file.name, sizeReadable, type: file.type }
      ]);
      setTasks(ts => ts.filter(t => t.file !== file));

    } catch (err) {
      if (axios.isCancel(err)) {
        // canceled by user → remove card
        setTasks(ts => ts.filter(t => t.file !== file));
        return;
      }

      const info = extractServerError(err);

      if (DEBUG_UPLOADS) {
        console.error("Upload failed (detailed)", {
          status: info.status,
          code: info.code,
          message: info.message,
          requestId: info.requestId,
          raw: info.raw
        });
      }

      // Human-friendly message for the card
      let friendly = info.message;
      if (info.status === 413) {
        friendly = "File too large for server limit. Try a smaller file or switch to direct-to-S3 uploads.";
      } else if (info.status === 403) {
        friendly = "Access denied by S3. Check bucket region, credentials, and policy/ACL.";
      } else if (info.status === 404) {
        friendly = "Upload route not found. Check your deployed base path or API URL.";
      } else if (info.status === 500) {
        friendly = `Server error: ${info.message}`;
      } else if (info.status === 0) {
        friendly = "Network/CORS error — the request didn’t reach the server. Check domain, HTTPS, and CORS.";
      }

      // Append trace id when present (helps debugging without opening DevTools)
      if (info.requestId) {
        friendly += ` (reqId: ${info.requestId})`;
      }

      // Mark the card failed and keep it visible
      setTasks(ts =>
        ts.map(t =>
          t.file === file ? { ...t, status: "failed", errorMessage: friendly } : t
        )
      );
    }
  };
};


  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addUploadTask);
    e.target.value = "";
  };

  const deleteUpload = (idx) => {
    setUploads(u => {
      const copy = [...u];
      copy.splice(idx, 1);
      return copy;
    });
  };

  const deleteTask = (file) => {
    setTasks(ts => ts.filter(t => t.file !== file));
  };

  const handleNext = () => {
    // only successful uploads are saved
    dispatch({ type: "SET_EVIDENCE", payload: uploads });
    navigate("/injury/report-submitted");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 pt-6 pb-8">
      <div className="max-w-md w-full mx-auto flex flex-col flex-1 relative">
        {/* Progress */}
        <div className="space-y-2 mb-6">
          <span className="block text-center text-sm text-gray-700">Step 5 of 6</span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-5/6 rounded-full" />
          </div>
        </div>

        {/* Back + Title */}
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="text-2xl text-gray-800">←</button>
          <h1 className="flex-1 text-center text-xl font-semibold text-gray-900">
            Upload Evidence
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        <p className="text-center text-gray-600 text-sm mb-8">
          This helps us investigate what happened and how to prevent it in the future.
        </p>

        {/* Select / Capture */}
        <div className="space-y-4">
          <button
            onClick={() => fileRef.current.click()}
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 border-2 border-[#192C63] rounded-lg text-[#192C63] hover:bg-[#192C63] hover:text-white transition"
          >
            <CloudUpload size={20} />
            <span>Select a File</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="hidden"
            onChange={handleFiles}
          />

          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <span className="h-px flex-1 bg-gray-300" />
            <span>OR</span>
            <span className="h-px flex-1 bg-gray-300" />
          </div>

          <button
            onClick={() => cameraRef.current.click()}
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 border-2 border-[#192C63] rounded-lg text-[#192C63] hover:bg-[#192C63] hover:text-white transition"
          >
            <Camera size={20} />
            <span>Take a Picture</span>
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFiles}
          />
        </div>

        {/* Documents Panel */}
        {(tasks.length > 0 || uploads.length > 0) && (
          <div className="bg-white rounded-lg shadow p-4 mt-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-800">Documents</h2>
            <div className="space-y-3">
              {/* In‑flight & Failed */}
              {tasks.map((t, i) => {
                const isPdf = t.file.type === "application/pdf";
                const isUploading = t.status === "uploading";
                const isFailed = t.status === "failed";

                return (
                  <div
                    key={`task-${i}`}
                    className={`relative flex items-start space-x-3 p-3 rounded-lg border
                      ${isFailed
                        ? "bg-red-50 border-red-300"
                        : "bg-white border-gray-200"
                      }`}
                  >
                    <div className={`${isFailed ? "text-red-500" : "text-gray-500"} mt-0.5`}>
                      {isPdf ? <FileText size={24} /> : <FileImage size={24} />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-800 break-all">
                          {isFailed ? "Upload Failed" : t.file.name}
                        </div>
                        {isFailed && (
                          <button
                            onClick={() => deleteTask(t.file)}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Remove"
                          >
                            <Trash size={18} />
                          </button>
                        )}
                      </div>

                      <div className={`text-sm ${isFailed ? "text-red-700" : "text-gray-600"}`}>
                        {isFailed
                          ? (t.errorMessage || "Upload failed.")
                          : `Uploading… ${t.progress}% • ${t.sizeReadable}`}
                      </div>

                      {isUploading && (
                        <div className="mt-2 h-1 bg-gray-200 rounded overflow-hidden">
                          <div
                            className="h-full bg-[#192C63]"
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {isUploading && (
                      <button
                        onClick={() => t.cancel?.("User canceled")}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Cancel upload"
                      >
                        <XCircle size={20} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Completed */}
              {uploads.map((u, i) => {
                const isPdf = u.type === "application/pdf";
                return (
                  <div
                    key={`up-${i}`}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-white"
                  >
                    <div className="text-gray-500">
                      {isPdf ? <FileText size={24} /> : <FileImage size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 break-all">{u.name}</div>
                      <div className="text-sm text-gray-600">{u.sizeReadable}</div>
                    </div>
                    <button
                      onClick={() => deleteUpload(i)}
                      className="p-1 text-gray-500 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global error banner (e.g., invalid type) */}
        {bannerError && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 text-sm flex items-start gap-2">
            <XCircle className="min-w-4 min-h-4 mt-0.5" size={16} />
            <div className="flex-1">{bannerError}</div>
            <button
              onClick={() => setBannerError("")}
              className="text-red-700 hover:text-red-900"
              title="Dismiss"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Bottom Next */}
        <div className="absolute bottom-0 pb-6 left-1/2 -translate-x-1/2 px-4 w-full max-w-md">
          <button
            onClick={handleNext}
            disabled={uploads.length === 0}
            className={`w-full py-3 mt-auto rounded-lg font-medium text-white transition ${
              uploads.length
                ? "bg-[#192C63] hover:bg-[#162050]"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
