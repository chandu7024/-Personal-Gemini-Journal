import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Brain,
  MessageSquare,
  HelpCircle,
  Play,
  Square,
  Radio,
} from "lucide-react";
import type { JournalEntry, JournalMessage, UserRole } from "../types";
import { sendVoiceSocraticTurn } from "../lib/geminiApi";

interface SocraticVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEntry: JournalEntry | null;
  onSaveSpokenTurn?: (userText: string, aiText: string) => Promise<void>;
  onNewVoiceEntry?: (initialPrompt: string) => Promise<string>;
}

type AudioState = "idle" | "listening" | "thinking" | "speaking" | "error";

export const SocraticVoiceModal: React.FC<SocraticVoiceModalProps> = ({
  isOpen,
  onClose,
  activeEntry,
  onSaveSpokenTurn,
  onNewVoiceEntry,
}) => {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ role: "user" | "assistant"; text: string; time: string }>>([]);
  const [currentInterimText, setCurrentInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHandsFree, setIsHandsFree] = useState(false); // Default to safe Tap-to-Speak mode to prevent unwanted background listening
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronization refs to eliminate stale closure bugs during asynchronous audio events
  const isHandsFreeRef = useRef(false);
  isHandsFreeRef.current = isHandsFree;
  const audioStateRef = useRef<AudioState>("idle");
  audioStateRef.current = audioState;
  const isRecognitionActiveRef = useRef(false);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setCurrentInterimText(interim);
        }

        if (final.trim()) {
          setCurrentInterimText("");
          handleUserSpokenFinal(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[Voice Recognition] Error event:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permissions in your browser.");
          setAudioState("error");
          isRecognitionActiveRef.current = false;
        }
      };

      recognition.onend = () => {
        // ONLY auto-restart if hands-free mode is explicitly turned on AND audioState is actively listening AND AI is not speaking
        if (
          isRecognitionActiveRef.current &&
          isHandsFreeRef.current &&
          audioStateRef.current === "listening" &&
          !isSpeakingRef.current
        ) {
          try {
            recognition.start();
          } catch {
            // ignore restart collision
          }
        } else {
          isRecognitionActiveRef.current = false;
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("[Voice Recognition] Web Speech API not supported in this browser.");
    }

    // Handle Escape key to safely close voice modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopAllAudio();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      stopAllAudio();
    };
  }, [isOpen]);

  // Clean up on modal close or pause
  const stopAllAudio = () => {
    isRecognitionActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isSpeakingRef.current = false;
    setAudioState("idle");
    setCurrentInterimText("");
  };

  // Start Mic & Audio Visualization
  const startListeningSession = async () => {
    setErrorMessage(null);
    isRecognitionActiveRef.current = true;
    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      // 2. Initialize AudioContext for waveform visualization
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsAudioContextReady(true);
      setAudioState("listening");

      // 3. Start Waveform Animation Loop
      startVisualizerAnimation();

      // 4. Start Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (recErr) {
          console.warn("Recognition start warning:", recErr);
        }
      }
    } catch (err: any) {
      isRecognitionActiveRef.current = false;
      console.error("Microphone setup failed:", err);
      setErrorMessage("Could not activate microphone. Please check your browser microphone permissions.");
      setAudioState("error");
    }
  };

  // Waveform Visualizer Canvas Renderer
  const startVisualizerAnimation = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let phase = 0;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      // Compute average volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / bufferLength;
      const normalizedVol = Math.min(averageVolume / 128, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Render Dynamic Sine Waves
      phase += 0.05 + normalizedVol * 0.08;

      const waves = [
        { color: "rgba(99, 102, 241, 0.8)", amplitude: (15 + normalizedVol * 45), frequency: 0.03, phaseOffset: 0 },
        { color: "rgba(168, 85, 247, 0.6)", amplitude: (10 + normalizedVol * 35), frequency: 0.02, phaseOffset: Math.PI / 3 },
        { color: "rgba(56, 189, 248, 0.5)", amplitude: (8 + normalizedVol * 25), frequency: 0.04, phaseOffset: Math.PI / 1.5 },
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.lineWidth = isSpeakingRef.current ? 3 : 2;
        ctx.strokeStyle = wave.color;

        for (let x = 0; x < width; x++) {
          const distanceToCenter = 1 - Math.abs((x - width / 2) / (width / 2));
          const envelope = Math.pow(Math.max(distanceToCenter, 0), 1.5);
          const y = centerY + Math.sin(x * wave.frequency + phase + wave.phaseOffset) * wave.amplitude * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Subtle Center Pulse Glow
      if (normalizedVol > 0.05 || isSpeakingRef.current) {
        const glowRadius = Math.max(12, normalizedVol * 36);
        const gradient = ctx.createRadialGradient(width / 2, centerY, 0, width / 2, centerY, glowRadius);
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(width / 2, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    render();
  };

  // Handle final user speech turn
  const handleUserSpokenFinal = async (text: string) => {
    if (!text.trim() || isSpeakingRef.current) return;

    // Immediately stop speech recognition while ReflectAI processes
    isRecognitionActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userTurn = { role: "user" as const, text, time: timeString };

    setTranscriptHistory((prev) => [...prev, userTurn]);
    setAudioState("thinking");

    try {
      // Build conversation payload for Gemini Audio Engine
      const historyPayload = transcriptHistory.map((t) => ({
        role: t.role,
        content: t.text,
      }));

      const response = await sendVoiceSocraticTurn({
        transcript: text,
        history: historyPayload,
        tone: "socratic",
        mood: activeEntry?.mood,
      });

      if (response.success && response.text) {
        const spokenText = response.spokenText || response.text;
        const aiTurn = {
          role: "assistant" as const,
          text: spokenText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setTranscriptHistory((prev) => [...prev, aiTurn]);

        // Auto-save to Firestore if activeEntry and handler provided
        if (onSaveSpokenTurn) {
          onSaveSpokenTurn(text, spokenText).catch((err) => {
            console.warn("[Voice Journal] Firestore sync warning:", err);
          });
        }

        // Speak the Socratic response
        await speakText(spokenText);
      } else {
        throw new Error(response.error || "Could not generate Socratic response.");
      }
    } catch (err: any) {
      console.error("[Voice Journal] Processing failed:", err);
      setErrorMessage(err?.message || "Failed to process reflection turn.");
      isRecognitionActiveRef.current = false;
      setAudioState("idle");
    }
  };

  // Speak AI response with SpeechSynthesis
  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      const handleSpeechDone = () => {
        isSpeakingRef.current = false;
        if (isHandsFreeRef.current) {
          // In Hands-Free mode, auto-listen for next reflection
          isRecognitionActiveRef.current = true;
          setAudioState("listening");
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // ignore
            }
          }
        } else {
          // In Tap-to-Speak mode (Default), return safely to idle with mic OFF
          isRecognitionActiveRef.current = false;
          setAudioState("idle");
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {
              // ignore
            }
          }
        }
        resolve();
      };

      if (!window.speechSynthesis || isMuted) {
        handleSpeechDone();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Contemplative, measured pace
      utterance.pitch = 1.0;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice =
        voices.find((v) => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setAudioState("speaking");
      };

      utterance.onend = () => {
        handleSpeechDone();
      };

      utterance.onerror = (e) => {
        console.warn("[SpeechSynthesis] Error:", e);
        handleSpeechDone();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  // Manual save all turns into a new reflection if no active entry
  const handleSaveAsNewReflection = async () => {
    if (transcriptHistory.length === 0 || !onNewVoiceEntry) return;
    setIsSaving(true);
    try {
      const summaryText = transcriptHistory
        .map((t) => `${t.role === "assistant" ? "Socratic Guide" : "My Thoughts"}: ${t.text}`)
        .join("\n\n");
      await onNewVoiceEntry(summaryText);
      onClose();
    } catch (err) {
      console.error("Failed to create voice reflection:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopAllAudio();
          onClose();
        }
      }}
    >
      <div
        id="modal-socratic-voice-journal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Socratic Voice Journaling
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  Interactive Audio
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeEntry ? `Linked to: "${activeEntry.title}"` : "Guided reflective dialogue with ReflectAI"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: Tap to Speak vs Continuous */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700 text-xs">
              <button
                id="btn-mode-tap-to-speak"
                onClick={() => {
                  setIsHandsFree(false);
                  isHandsFreeRef.current = false;
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  !isHandsFree
                    ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Tap to Speak: Microphone only activates when you click Start Speaking"
              >
                Tap to Speak
              </button>
              <button
                id="btn-mode-continuous"
                onClick={() => {
                  setIsHandsFree(true);
                  isHandsFreeRef.current = true;
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  isHandsFree
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Continuous Mode: Microphone automatically resumes listening after AI finishes speaking"
              >
                Continuous
              </button>
            </div>

            <button
              id="btn-toggle-voice-mute"
              onClick={() => {
                if (!isMuted && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                setIsMuted(!isMuted);
              }}
              className={`p-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isMuted
                  ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              }`}
              title={isMuted ? "Unmute Spoken Voice" : "Mute Spoken Voice"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              id="btn-close-voice-modal"
              onClick={() => {
                stopAllAudio();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Live Waveform Visualizer & State Badge */}
        <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-[#0f172a] border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="w-full h-28 relative flex items-center justify-center rounded-xl bg-slate-950/5 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80 overflow-hidden mb-4 shadow-inner">
            <canvas
              ref={canvasRef}
              width={600}
              height={112}
              className="w-full h-full object-contain"
            />

            {audioState === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xs gap-1 text-center px-4">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Microphone is currently off
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isHandsFree
                    ? "Continuous mode enabled. Tap Start Speaking to begin your dialogue."
                    : "Tap 'Start Speaking' below whenever you want to share a thought."}
                </span>
              </div>
            )}
          </div>

          {/* Audio State Indicator Badge & Action Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                audioState === "listening"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse shadow-xs"
                  : audioState === "thinking"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  : audioState === "speaking"
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-xs"
                  : audioState === "error"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {audioState === "listening" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Listening to your thoughts...</span>
                </>
              )}
              {audioState === "thinking" && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                  <span>Synthesizing Socratic inquiry...</span>
                </>
              )}
              {audioState === "speaking" && (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-bounce" />
                  <span>ReflectAI is speaking...</span>
                </>
              )}
              {audioState === "idle" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Microphone Paused</span>
                </>
              )}
              {audioState === "error" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Microphone Access Required</span>
                </>
              )}
            </div>

            {/* Main Interactive Controls */}
            {audioState === "idle" ? (
              <button
                id="btn-start-voice-session"
                onClick={startListeningSession}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all cursor-pointer ring-2 ring-purple-500/20"
              >
                <Mic className="w-4 h-4" />
                <span>Start Speaking</span>
              </button>
            ) : audioState === "listening" ? (
              <div className="flex items-center gap-2">
                {currentInterimText && (
                  <button
                    id="btn-submit-speech-now"
                    onClick={() => {
                      if (currentInterimText.trim()) {
                        const captured = currentInterimText.trim();
                        setCurrentInterimText("");
                        handleUserSpokenFinal(captured);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done Speaking</span>
                  </button>
                )}
                <button
                  id="btn-pause-voice-session"
                  onClick={stopAllAudio}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-rose-500" />
                  <span>Pause Mic</span>
                </button>
              </div>
            ) : audioState === "speaking" ? (
              <button
                id="btn-skip-speech"
                onClick={() => {
                  if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  isSpeakingRef.current = false;
                  if (isHandsFreeRef.current) {
                    setAudioState("listening");
                    isRecognitionActiveRef.current = true;
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.start();
                      } catch {
                        // ignore
                      }
                    }
                  } else {
                    setAudioState("idle");
                    isRecognitionActiveRef.current = false;
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
              >
                <span>Skip Spoken Audio</span>
              </button>
            ) : (
              <button
                id="btn-reset-voice-session"
                onClick={stopAllAudio}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Current Live Interim Speech Bubble */}
          {currentInterimText && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 text-xs text-purple-900 dark:text-purple-200 animate-pulse text-center max-w-lg">
              <span className="font-semibold mr-1.5">Hearing:</span> "{currentInterimText}"
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 text-center max-w-lg">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Spoken Dialogue Transcript History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-[160px] max-h-[280px] bg-white dark:bg-[#0f172a]">
          {transcriptHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 space-y-2">
              <Brain className="w-8 h-8 text-purple-400/60" />
              <p className="text-xs">
                Speak your stream of consciousness naturally. ReflectAI will listen, validate your state, and ask focused Socratic questions.
              </p>
            </div>
          ) : (
            transcriptHistory.map((item, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {item.role === "assistant" && (
                  <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${
                    item.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-xs"
                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60"
                  }`}
                >
                  <p>{item.text}</p>
                  <span
                    className={`block text-[9px] mt-1 ${
                      item.role === "user" ? "text-indigo-200 text-right" : "text-slate-400"
                    }`}
                  >
                    {item.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Audio is processed ephemerally with zero persistent disk storage</span>
          </div>

          <div className="flex items-center gap-2">
            {!activeEntry && transcriptHistory.length > 0 && (
              <button
                id="btn-save-as-new-reflection"
                onClick={handleSaveAsNewReflection}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Save to New Entry</span>
              </button>
            )}

            <button
              id="btn-done-voice-modal"
              onClick={() => {
                stopAllAudio();
                onClose();
              }}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
