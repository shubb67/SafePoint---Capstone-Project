// src/incident-report/Evidence.js
"use client";

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import "../../styles/Evidence.css";
import { CloudUpload, Camera, Trash, FileImage, FileVideo } from "lucide-react";
import axios from "axios";

export default function Evidence() {
  const navigate  = useNavigate();
  const dispatch  = useIncidentDispatch();
  const { incidentType } = useIncidentState();

  // In-flight upload tasks
  // { file, progress, cancel, sizeReadable }
  const [tasks, setTasks]     = useState([]);

  // Completed uploads
  // { url, name, sizeReadable, type }
  const [uploads, setUploads] = useState([]);

  const fileRef   = useRef();
  const cameraRef = useRef();

  // helper: bytes → human readable
  const humanFileSize = bytes => {
    const mb = bytes/1024/1024;
    if (mb < 0.1) return `${(mb*1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
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
            step:         "evidence"
          },
          {
            headers: { "Content-Type": "application/json" },
            onUploadProgress: e => {
              const prog = Math.round((e.loaded*100)/e.total);
              setTasks(ts =>
                ts.map(t =>
                  t.file === file ? { ...t, progress: prog } : t
                )
              );
            },
            cancelToken: cancelSrc.token
          }
        );

        // on success move to completed
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
        // remove from tasks
        setTasks(ts => ts.filter(t => t.file !== file));
      }
    };
  };

  // handle selection from file picker or camera
  const handleFiles = e => {
    const files = Array.from(e.target.files||[]);
    files.forEach(addUploadTask);
    // allow re-select same file
    e.target.value = "";
  };

  // remove a completed upload
  const deleteUpload = idx => {
    setUploads(u => {
      const copy = [...u];
      copy.splice(idx,1);
      return copy;
    });
  };

  // finish step
  const handleComplete = () => {
    dispatch({ type:"SET_EVIDENCE", payload: uploads });
    navigate("/submit");
  };

  return (
    <div className="evidence-container">
      {/* Progress Bar */}
      <div className="progress-section">
        <span className="progress-text">Step 5 of 6</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner step5"></div>
        </div>
      </div>

      {/* Header */}
      <div className="header-section">
        <button className="back-button" onClick={()=>navigate(-1)}>←</button>
        <h1 className="page-title">Upload Evidence</h1>
      </div>
      <p className="subtitle">
        This helps us investigate what happened and how to prevent it in the future.
      </p>

      {/* Buttons */}
      <div className="action-buttons">
        <button className="btn-select" onClick={()=>fileRef.current.click()}>
          <CloudUpload size={20}/> Select a File
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{display:"none"}}
          onChange={handleFiles}
        />

        <div className="or-divider">OR</div>

        <button className="btn-select" onClick={()=>cameraRef.current.click()}>
          <Camera size={20}/> Take a Picture
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{display:"none"}}
          onChange={handleFiles}
        />
      </div>

      {/* Documents Panel */}
      {(tasks.length>0 || uploads.length>0) && (
        <div className="documents-section">
          <h2 className="documents-header">Documents</h2>
          <div className="documents-list">
            {/* in-flight */}
            {tasks.map((t,i)=> {
              const isImage = t.file.type.startsWith("image/");
              return (
                <div key={`task-${i}`} className="document-card">
                  <div className="doc-icon">
                    {isImage
                      ? <FileImage size={24}/>
                      : <FileVideo size={24}/>}
                  </div>
                  <div className="doc-info">
                    <div className="doc-name">{t.file.name}</div>
                    <div className="doc-size">Uploading… {t.progress}%</div>
                  </div>
                  <button
                    className="doc-delete"
                    onClick={()=>t.cancel("User canceled")}
                  >
                    <Trash size={20}/>
                  </button>
                  <div className="upload-progress-bar-outer">
                    <div
                      className="upload-progress-bar-inner"
                      style={{width:`${t.progress}%`}}
                    />
                  </div>
                </div>
              );
            })}

            {/* completed */}
            {uploads.map((u,i)=> {
              const isImage = u.type.startsWith("image/");
              return (
                <div key={`upl-${i}`} className="document-card">
                  <div className="doc-icon">
                    {isImage
                      ? <FileImage size={24}/>
                      : <FileVideo size={24}/>}
                  </div>
                  <div className="doc-info">
                    <div className="doc-name">{u.name}</div>
                    <div className="doc-size">{u.sizeReadable}</div>
                  </div>
                  <button
                    className="doc-delete"
                    onClick={()=>deleteUpload(i)}
                  >
                    <Trash size={20}/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Complete */}
      <button
        className="btn btn-primary complete-button"
        onClick={handleComplete}
        disabled={uploads.length===0}
      >
        Complete
      </button>
    </div>
  );
}
