// src/components/VoiceRecorderModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, RotateCcw } from 'lucide-react';

const VoiceRecorderModal = ({ isOpen, onClose, onSubmit }) => {
  // ─── state ──────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep]   = useState(0);
  const [isRecording, setIsRecording]   = useState(false);
  const [audioBlob, setAudioBlob]       = useState(null);
  const [audioUrl, setAudioUrl]         = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // ─── refs ────────────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);

  // ─── reset when opening ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl('');
      setTranscriptText('');
      setUploadProgress(0);
      audioChunksRef.current = [];
    }
  }, [isOpen]);

  // ─── start capturing audio ──────────────────────────────────────────────
  const startRecording = async () => {
    // advance to “Listening” screen
    setCurrentStep(2);
    setIsRecording(true);
    setTranscriptText('');
    setAudioBlob(null);
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setIsRecording(false);

      // build blob + preview URL
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));

      // next step: ready to submit
      setCurrentStep(3);

      // send to your Next.js API (AssemblyAI)
      const form = new FormData();
      form.append('audio', blob, 'voice.webm');
      try {
        const res = await fetch('/api/speech', { method: 'POST', body: form });
        const { transcription } = await res.json();
        setTranscriptText(transcription || '');
      } catch (err) {
        console.error('Transcription error:', err);
        setTranscriptText('[Error transcribing]');
      }
    };

    recorder.start();
  };

  // ─── stop recording ─────────────────────────────────────────────────────
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  // ─── retry from the beginning ────────────────────────────────────────────
  const restartRecording = () => {
    setCurrentStep(1);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl('');
    setTranscriptText('');
    audioChunksRef.current = [];
  };

  // ─── submit the voice note up to S3 (or however you do it) ───────────────
  const handleSubmit = async () => {
    setCurrentStep(4);
    // (you can swap this fake‐upload for your real upload code)
    for (let p of [25, 50, 75, 100]) {
      setUploadProgress(p);
      await new Promise(r => setTimeout(r, 300));
    }
    setCurrentStep(5);
    // hand back both the final blob + the transcript
    onSubmit({ audioBlob, transcriptText });
    setTimeout(onClose, 1500);
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  // ─── the 6 “steps” screens ───────────────────────────────────────────────
  const steps = [
    {
      title: 'Allow Microphone Access',
      content: (
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-black">
            <Mic className="w-12 h-12 text-gray-600" />
          </div>
          <p className="text-gray-600 mb-8">
            We need access to your microphone to record your voice note.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Later
            </button>
            <button
              onClick={() => setCurrentStep(1)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Allow
            </button>
          </div>
        </div>
      ),
      titleClassName: "text-black",
    },
    {
      title: 'Describe the Incident',
      content: (
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mic className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-8">
            Tap to start recording and describe what happened.
          </p>
          <button
            onClick={startRecording}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            🎙️ Tap to Start Recording
          </button>
        </div>
      ),
      titleClassName: "text-black",
    },
    {
      title: 'Listening…',
      content: (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 h-16">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 40 + 10}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            )

            )
            }
          </div>
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={restartRecording}
              className="px-6 py-2 bg-white border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition"
            >
              Restart
            </button>
            <button
              onClick={stopRecording}
              className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center gap-2 transition"
            >
              ● Stop Recording
            </button>
          </div>
        </div>
      ),
      titleClassName: "text-black",
    },
    {
      title: 'Ready to Submit?',
      content: (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 h-16">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full"
                style={{ height: '4px' }}
              />
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={restartRecording}
              className="px-6 py-2 bg-white border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </button>
            <button
              onClick={handleSubmit}
              className="px-8 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 flex items-center gap-2 transition"
            >
              ⬆️ Submit
            </button>
          </div>
        </div>
      ),
      titleClassName: "text-black",
    },
    {
      title: 'Uploading…',
      content: (
        <div className="text-center">
          <div className="relative mb-6">
            <svg width={120} height={120} className="transform -rotate-90">
              <circle
                cx={60}
                cy={60}
                r={56}
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx={60}
                cy={60}
                r={56}
                stroke="#3b82f6"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={
                  2 * Math.PI * 56 * (1 - uploadProgress / 100)
                }
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">
                {uploadProgress}%
              </span>
            </div>
          </div>
          <p className="text-gray-600">Waiting…</p>
        </div>
      ),
      titleClassName: "text-black",
    },
    {
      title: 'Voice Recording Submitted',
      content: (
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
                <div className="text-white text-4xl font-bold">✓</div>
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse"></div>
          </div>
          <p className="text-gray-600">Done</p>
        </div>
      ),
      titleClassName: "text-black",
    },
  ];

  const step = Math.min(Math.max(currentStep, 0), steps.length - 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-6 h-6" />
        </button>

<h2 className={`text-xl font-semibold text-center mb-8  ${steps[step].titleClassName || ""}`}>
          {steps[step].title}
        </h2>
        {steps[step].content}
      </div>
    </div>
  );
};

export default VoiceRecorderModal;
