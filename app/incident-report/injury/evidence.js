// src/incident-report/Evidence.js
"use client";

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { CloudUpload, Camera, Trash, FileImage, FileVideo } from "lucide-react";
import axios from "axios";

export default function Evidence() {
  const navigate  = useNavigate();
  const dispatch  = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // In-flight upload tasks: { file, progress, cancel, sizeReadable }
  const [tasks, setTasks]     = useState([]);
  // Completed uploads:    { url, name, sizeReadable, type }
  const [uploads, setUploads] = useState([]);

  const fileRef   = useRef();
  const cameraRef = useRef();

  // helper: bytes → human-readable
  const humanFileSize = bytes => {
    const mb = bytes / 1024 / 1024;
    return mb < 0.1
      ? `${(mb * 1024).toFixed(1)} KB`
      : `${mb.toFixed(1)} MB`;
  };

  // start one upload task
  const addUploadTask = file => {
    const cancelSrc = axios.CancelToken.source();
    const sizeReadable = humanFileSize(file.size);

    setTasks(ts => [
      ...ts,
      { file, progress: 0, cancel: cancelSrc.cancel, sizeReadable }
    ]);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const res = await axios.post(
          "/api/aws",
          {
            fileName:     file.name,
            fileType:     file.type,
            base64:       reader.result,
            incidentType,
            category:     "evidence",
            step:         "images",
          },
          {
            headers: { "Content-Type": "application/json" },
            onUploadProgress: e => {
              const prog = Math.round((e.loaded * 100) / e.total);
              setTasks(ts =>
                ts.map(t =>
                  t.file === file ? { ...t, progress: prog } : t
                )
              );
            },
            cancelToken: cancelSrc.token
          }
        );

        // move to completed
        setUploads(u => [
          ...u,
          {
            url:  res.data.url,
            name: file.name,
            sizeReadable,
            type: file.type
          }
        ]);
      } catch (err) {
        if (!axios.isCancel(err)) console.error("Upload error:", err);
      } finally {
        setTasks(ts => ts.filter(t => t.file !== file));
      }
    };
  };

  // handle selection from file picker or camera
  const handleFiles = e => {
    const files = Array.from(e.target.files || []);
    files.forEach(addUploadTask);
    e.target.value = "";
  };

  // remove a completed upload
  const deleteUpload = idx => {
    setUploads(u => {
      const copy = [...u];
      copy.splice(idx, 1);
      return copy;
    });
  };

  // finish step
  const handleNext = () => {
    dispatch({ type: "SET_EVIDENCE", payload: uploads });
    navigate("/submit"); // adjust path to your next route
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 pt-6 pb-8">
      <div className="max-w-md w-full mx-auto flex flex-col flex-1">
        {/* Progress */}
        <div className="space-y-2 mb-6">
          <span className="block text-center text-sm text-gray-700">
            Step 5 of 6
          </span>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#192C63] w-5/6 rounded-full" />
          </div>
        </div>

        {/* Back + Title */}
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-2xl text-gray-800"
          >
            ←
          </button>
          <h1 className="flex-1 text-center text-xl font-semibold text-gray-900">
            Upload Evidence
          </h1>
          <div style={{ width: "1.5rem" }} />
        </div>

        <p className="text-center text-gray-600 text-sm mb-8">
          This helps us investigate what happened and how to prevent it in the future.
        </p>

        {/* Select / Capture Buttons */}
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
            accept="image/*,video/*"
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
              {/* In-flight */}
              {tasks.map((t, i) => {
                const isImage = t.file.type.startsWith("image/");
                return (
                  <div
                    key={i}
                    className="relative flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="text-gray-500">
                      {isImage ? <FileImage size={24} /> : <FileVideo size={24} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{t.file.name}</div>
                      <div className="text-sm text-gray-600">
                        Uploading… {t.progress}%
                      </div>
                    </div>
                    <button
                      onClick={() => t.cancel("User canceled")}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Trash size={20} />
                    </button>
                    <div className="absolute bottom-1 left-1 right-1 h-1 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#192C63]"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Completed */}
              {uploads.map((u, i) => {
                const isImage = u.type.startsWith("image/");
                return (
                  <div
                    key={i}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="text-gray-500">
                      {isImage ? <FileImage size={24} /> : <FileVideo size={24} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{u.name}</div>
                      <div className="text-sm text-gray-600">{u.sizeReadable}</div>
                    </div>
                    <button
                      onClick={() => deleteUpload(i)}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Trash size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Button */}
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
  );
}
