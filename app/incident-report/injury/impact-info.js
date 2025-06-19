import React, { useState, useEffect, useRef} from "react";
import { useNavigate } from "react-router-dom";
import { useIncidentDispatch, useIncidentState } from "../../context/IncidentContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import "../../styles/ImpactInfo.css";
import { Mic } from "lucide-react";

const ImpactInfo = () => {
  const navigate = useNavigate();
  const dispatch = useIncidentDispatch();
  const state = useIncidentState();
  const { incidentType } = useIncidentState();

  // Local state, prefilled from context if available
  const [emergency, setEmergency]           = useState(state.impactInfo.emergency || "");
  const [impactOps, setImpactOps]           = useState(state.impactInfo.impactOps || "");
  const [severity, setSeverity]             = useState(state.impactInfo.severity || "");
  const [responseAction, setResponseAction] = useState(state.impactInfo.responseAction || "");
  const [locations, setLocations]           = useState([]);


  // Voice recording state
  const [showVoiceUI, setShowVoiceUI]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [audioUrl, setAudioUrl]             = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

  // Animated dots while processing
  const useDots = () => {
    const [dots, setDots] = useState("");
    useEffect(() => {
      if (!processing) return;
      const iv = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
      return () => clearInterval(iv);
    }, [processing]);
    return dots;
  };
  const dots = useDots();

  // Helper to upload base64 → S3
  const uploadToS3 = async ({ fileName, fileType, base64, category, step }) => {
    const res = await fetch("/api/aws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileType, base64, incidentType, category, step })
    });
    const { url } = await res.json();
    return url;
 };
  // Fetch any dynamic options if needed (e.g. location list)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading locations:", err);
      }
    })();
  }, []);

  const handleBack = () => navigate(-1);
  const handleNext = e => {
    e.preventDefault();
    dispatch({
      type: "SET_IMPACT",
      payload: { emergency, impactOps, severity, responseAction, voice: { url: audioUrl, transcript: transcriptText }
   } });
    navigate("/evidence");
  };

  // Start recording
  const startRecording = async () => {
    setShowVoiceUI(true);
    setIsRecording(true);
    setProcessing(false);
    setTranscriptText("");
    setAudioUrl("");
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size) audioChunksRef.current.push(e.data) };
    recorder.onstop = async () => {
      setIsRecording(false);
      setProcessing(true);

      // Transcribe
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      try {
        const r = await fetch("/api/speech", { method: "POST", body: form });
        const { transcription } = await r.json();
        setTranscriptText(transcription || "");
      } catch {
        setTranscriptText("");
      }

      // Upload voice note
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const url = await uploadToS3({
            fileName: "voice.webm",
            fileType: blob.type,
            base64:   reader.result,
            category: "voiceNotes",
            step:     "impact-info"
          });
          setAudioUrl(url);
        } catch (err) {
         console.error("Upload failed:", err);
        } finally {
          setProcessing(false);
        }
      };
    };

    recorder.start();
  };
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };
  return (
    <div className="impact-container">
      {/* Progress Bar */}
      <div className="progress-section">
        <span className="progress-text">Step 4 of 6</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner step4"></div>
        </div>
      </div>

      {/* Header */}
      <div className="header-section">
        <button className="back-button" onClick={handleBack} aria-label="Go back">
          ←
        </button>
        <h1 className="page-title">Impact & Response</h1>
      </div>

      {/* Subtitle */}
      <p className="subtitle">
        Please describe the impact of the incident and any actions taken in response.
      </p>

      {/* Form */}
      <form className="form-section" onSubmit={handleNext}>
        {/* Emergent Response Toggle */}
        <div className="form-group full-width">
          <label>Was emergent response activated?</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-button${emergency === "yes" ? " selected" : ""}`}
              onClick={() => setEmergency("yes")}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-button${emergency === "no" ? " selected" : ""}`}
              onClick={() => setEmergency("no")}
            >
              No
            </button>
          </div>
        </div>

        {/* Impact on Operations */}
        <div className="form-group full-width">
          <label htmlFor="impactOps">Impact on Operations</label>
          <select
            id="impactOps"
            value={impactOps}
            onChange={e => setImpactOps(e.target.value)}
            required
          >
            <option value="">Select…</option>
            <option value="none">None</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
          </select>
        </div>

        {/* Severity Level */}
        <div className="form-group full-width">
          <label htmlFor="severity">Severity Level</label>
          <select
            id="severity"
            value={severity}
            onChange={e => setSeverity(e.target.value)}
            required
          >
            <option value="">Select…</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Response Action Taken */}
        <div className="form-group full-width">
          <label htmlFor="responseAction">Response Action Taken</label>
          <textarea
            id="responseAction"
            placeholder="Write here…"
            rows={4}
            value={responseAction}
            onChange={e => setResponseAction(e.target.value)}
          />
        </div>

        {/* Or Divider */}
        <div className="or-divider">Or</div>

 {/* Record Voice Note */}
        <div className="form-group full-width">
          <label>Record Voice Note</label>
          <button
            type="button"
            className="record-button"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? "Stop Recording" : "Record…"}
          </button>

          {/* Transcript preview */}
          {transcriptText && (
            <div className="transcript-container">
              <h3 className="transcript-header">Transcript</h3>
              <div className="transcript-content">{transcriptText}</div>
            </div>
          )}
        </div>

        {/* Next */}
        <button type="submit" className="btn btn-primary next-button">
          Next
        </button>
      </form>
       {/* Overlay UI */}
     {showVoiceUI && (
        <div className="overlay fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center text-white">
          <div className="mic-circle mb-6">
            <Mic className="mic-icon animate-pulse" />
          </div>
          <p className="overlay-text text-center px-4">
            {isRecording
              ? "🎙️ Listening..."
              : processing
              ? `⏳ Processing${dots}`
              : transcriptText
              ? "✔️ Done Listening"
              : "❌ Failed"}
          </p>
          {isRecording && (
            <button onClick={stopRecording} className="done-button">
              Done
            </button>
          )}
          {!isRecording && !processing && (
            <button onClick={() => setShowVoiceUI(false)} className="done-button">
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImpactInfo;
