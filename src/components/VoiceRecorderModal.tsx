"use client";

import React, { useState, useRef, useEffect } from "react";
import { StaffContact, VoiceParsingResponse } from "@/types";
import { Mic, Square, Sparkles, X, Upload, AlertCircle, RefreshCw, Volume2, CheckCircle2 } from "lucide-react";

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffContact[];
  onTranscriptionComplete: (result: VoiceParsingResponse) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onTranscriptionComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const handleReset = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setIsProcessing(false);
    setProcessingStep("");
    setErrorMessage("");
    setAudioUrl(null);
    setRecordedBlob(null);
    audioChunksRef.current = [];
  };

  const startRecording = async () => {
    setErrorMessage("");
    audioChunksRef.current = [];

    if (staffList.length === 0) {
      setErrorMessage("Please add at least one staff contact to your directory first so Gemini can match names!");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Prefer audio/webm or audio/mp4
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      setErrorMessage(
        err.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone permissions in your browser."
          : `Failed to access microphone: ${err.message}`
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setRecordedBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const processAudioWithGemini = async (blobToProcess?: Blob) => {
    const blob = blobToProcess || recordedBlob;
    if (!blob) {
      setErrorMessage("No audio recorded or selected.");
      return;
    }

    if (staffList.length === 0) {
      setErrorMessage("Please add staff contacts first so Gemini can match names accurately.");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Uploading audio to Gemini Flash Multimodal AI...");

    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const base64Audio = await base64Promise;

      setProcessingStep("Transcribing voice & matching staff names with directory...");

      const response = await fetch("/api/gemini/parse-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: blob.type || "audio/webm",
          staffList: staffList,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to process audio with Gemini");
      }

      setProcessingStep("Task breakdown ready! Launching verification pipeline...");

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
        onTranscriptionComplete(data.data);
      }, 600);
    } catch (err: any) {
      console.error("Gemini voice processing error:", err);
      setErrorMessage(err.message || "Failed to parse audio. Please try again.");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#E5E7EB] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#111827]">
                Voice Task Assignment
              </h3>
              <p className="text-[12px] text-[#6B7280]">
                Powered by Gemini 3.7 Flash Multimodal Voice AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center justify-center space-y-6">
          {errorMessage && (
            <div className="w-full p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-[13px] text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Voice Processing Alert</p>
                <p className="text-[12px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Directory Summary Tag */}
          <div className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3 text-[12px] text-[#4B5563] flex items-center justify-between">
            <span>
              🎯 <strong>{staffList.length} staff contacts</strong> ready for voice name matching
            </span>
            <span className="text-[#4F46E5] font-medium">Auto-Fuzzy Matching ON</span>
          </div>

          {/* Main Visualizer Area */}
          <div className="flex flex-col items-center justify-center py-4 w-full">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-4 py-6">
                <div className="w-20 h-20 rounded-full bg-[#EEF2FF] border-4 border-indigo-200 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-[#4F46E5] animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[15px] font-semibold text-[#111827]">
                    Gemini AI is analyzing your voice...
                  </p>
                  <p className="text-[12px] text-[#6B7280] animate-pulse">
                    {processingStep}
                  </p>
                </div>
              </div>
            ) : isRecording ? (
              <div className="flex flex-col items-center space-y-4">
                {/* Pulsing Mic Circle */}
                <div className="relative">
                  <button
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-200 animate-pulse-ring cursor-pointer hover:bg-red-700 transition-colors"
                  >
                    <Square className="w-8 h-8 fill-current" />
                  </button>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="flex items-center space-x-1.5 h-10">
                  <span className="w-1.5 bg-[#4F46E5] rounded-full animate-wave-1"></span>
                  <span className="w-1.5 bg-[#4F46E5] rounded-full animate-wave-2"></span>
                  <span className="w-1.5 bg-[#4F46E5] rounded-full animate-wave-3"></span>
                  <span className="w-1.5 bg-[#4F46E5] rounded-full animate-wave-4"></span>
                  <span className="w-1.5 bg-[#4F46E5] rounded-full animate-wave-5"></span>
                  <span className="w-1.5 bg-[#4F46E5] rounded-full animate-wave-2"></span>
                  <span className="w-1.5 bg-[#4F46E5] rounded-full animate-wave-4"></span>
                </div>

                <div className="text-center">
                  <span className="text-[24px] font-mono font-bold text-[#111827]">
                    {formatTimer(recordingDuration)}
                  </span>
                  <p className="text-[12px] text-red-600 font-medium mt-1">
                    Recording in progress... Click red button to stop
                  </p>
                </div>
              </div>
            ) : audioUrl ? (
              <div className="flex flex-col items-center space-y-4 w-full">
                <div className="w-16 h-16 rounded-full bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Volume2 className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-[#111827]">
                    Voice note recorded successfully!
                  </p>
                  <p className="text-[12px] text-[#6B7280]">
                    Listen to preview or send to Gemini for automatic parsing
                  </p>
                </div>

                {/* Audio Player */}
                <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={startRecording}
                    className="px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors"
                  >
                    Record Again
                  </button>
                  <button
                    onClick={() => processAudioWithGemini()}
                    className="px-5 py-2 text-[13px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-sm shadow-indigo-200 transition-all flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze with Gemini AI</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-[#4F46E5] text-white flex items-center justify-center shadow-xl shadow-indigo-200 hover:bg-[#4338CA] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Mic className="w-10 h-10" />
                </button>
                <div className="text-center space-y-1">
                  <p className="text-[15px] font-semibold text-[#111827]">
                    Tap to Record Voice Instruction
                  </p>
                  <p className="text-[12px] text-[#6B7280] max-w-xs">
                    Speak naturally. e.g. <em>"Today task for Mudassir is to fix server deployment and contact client by 4pm"</em>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload voice note fallback */}
          {!isRecording && !isProcessing && !audioUrl && (
            <div className="w-full pt-4 border-t border-[#E5E7EB] flex flex-col items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[12px] text-[#6B7280] hover:text-[#4F46E5] font-medium flex items-center space-x-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Or upload an audio file (.m4a, .mp3, .wav, .ogg)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
