import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, RefreshCw, AlertCircle, ChevronDown, ChevronUp, CheckCircle, WifiOff } from "lucide-react";
import {
  isSpeechRecognitionSupported,
  getSpeechRecognitionConstructor,
  getFriendlySpeechErrorMessage,
  type VoiceState,
} from "../lib/voice.js";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onInterimChange?: (interim: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: string | null) => void;
  disabled?: boolean;
  language?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  onInterimChange,
  onListeningChange,
  onError,
  disabled = false,
  language = "en-IN",
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNetworkHelp, setShowNetworkHelp] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef<boolean>(false);

  // Initialize and bind SpeechRecognition instance once on mount
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setVoiceState("unsupported");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after utterance to avoid runaway sessions
      recognition.interimResults = true; // Stream interim transcripts
      recognition.maxAlternatives = 1;
      recognition.lang = language || (typeof navigator !== "undefined" && navigator.language) || "en-IN";

      recognition.onstart = () => {
        isStartingRef.current = false;
        setVoiceState("listening");
        onListeningChange?.(true);
        setErrorMessage(null);
        onError?.(null);
      };

      recognition.onaudiostart = () => {
        setVoiceState("listening");
      };

      recognition.onspeechstart = () => {
        setVoiceState("listening");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || "";
          if (item.isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
          onInterimChange?.(interim);
        }

        if (final) {
          setVoiceState("processing");
          onTranscript(final.trim());
          setInterimText("");
          onInterimChange?.("");
        }
      };

      recognition.onerror = (event: any) => {
        isStartingRef.current = false;
        const errType = event?.error || "unknown";
        const { message, type } = getFriendlySpeechErrorMessage(errType);

        if (type === "aborted") {
          setVoiceState("idle");
          setInterimText("");
          onListeningChange?.(false);
          onInterimChange?.("");
          return;
        }

        if (type === "network") {
          setVoiceState("network_error");
          setErrorMessage(message);
          onError?.(message);
        } else if (type === "permission") {
          setVoiceState("permission_error");
          setErrorMessage(message);
          onError?.(message);
        } else {
          setVoiceState("idle");
          setErrorMessage(message || "Voice input is temporarily unavailable.");
          onError?.(message);
        }

        setInterimText("");
        onListeningChange?.(false);
        onInterimChange?.("");
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        setInterimText("");
        onListeningChange?.(false);
        onInterimChange?.("");

        setVoiceState((prev) => {
          if (prev === "network_error" || prev === "permission_error" || prev === "unsupported") {
            return prev;
          }
          return "idle";
        });
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("[Aurora Voice] SpeechRecognition initialization error:", err);
      setVoiceState("unsupported");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [language, onListeningChange, onInterimChange, onTranscript, onError]);

  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    }
    setVoiceState("idle");
    setInterimText("");
    onListeningChange?.(false);
    onInterimChange?.("");
  }, [onListeningChange, onInterimChange]);

  const startListening = useCallback(() => {
    if (voiceState === "unsupported" || !recognitionRef.current) {
      onError?.("Voice input is not supported in this browser. You can still type your reflection.");
      return;
    }

    if (isStartingRef.current || voiceState === "listening") {
      return;
    }

    isStartingRef.current = true;
    setVoiceState("requesting");
    setErrorMessage(null);
    onError?.(null);

    // Directly trigger start() from user click gesture to maintain browser user-activation context
    try {
      recognitionRef.current.start();
    } catch (err: any) {
      isStartingRef.current = false;
      // Handle InvalidStateError if already started or active
      if (err?.name === "InvalidStateError") {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
        setVoiceState("idle");
        return;
      }
      console.warn("[Aurora Voice] Direct recognition.start() error:", err);
      const { message, type } = getFriendlySpeechErrorMessage(err?.error || "generic");
      if (type === "network") {
        setVoiceState("network_error");
      } else if (type === "permission") {
        setVoiceState("permission_error");
      } else {
        setVoiceState("idle");
      }
      setErrorMessage(message);
      onError?.(message);
      onListeningChange?.(false);
    }
  }, [voiceState, onError, onListeningChange]);

  const handleButtonClick = () => {
    if (voiceState === "listening" || voiceState === "requesting") {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleReset = () => {
    stopListening();
    setErrorMessage(null);
    onError?.(null);
    setShowNetworkHelp(false);
    setVoiceState("idle");
  };

  if (voiceState === "unsupported") {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          disabled
          title="Voice input is not supported in this browser. You can still type your reflection."
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-medium cursor-not-allowed opacity-60"
          aria-label="Voice unavailable in this browser"
        >
          <MicOff className="w-3.5 h-3.5" />
          <span>Voice unavailable in this browser</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex flex-col">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled || voiceState === "processing"}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
            voiceState === "listening"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900"
              : voiceState === "requesting"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : voiceState === "processing"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
              : voiceState === "network_error"
              ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30"
              : voiceState === "permission_error"
              ? "bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-transparent"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          aria-label={
            voiceState === "listening"
              ? "Listening… tap to stop"
              : voiceState === "requesting"
              ? "Checking microphone…"
              : voiceState === "processing"
              ? "Transcribing…"
              : voiceState === "network_error"
              ? "Speech service unavailable"
              : voiceState === "permission_error"
              ? "Microphone permission blocked"
              : "Use voice"
          }
        >
          {voiceState === "listening" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <MicOff className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Listening… tap to stop</span>
            </>
          ) : voiceState === "requesting" ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
              <span>Checking microphone…</span>
            </>
          ) : voiceState === "processing" ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-300" />
              <span>Transcribing…</span>
            </>
          ) : voiceState === "network_error" ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Speech service unavailable</span>
            </>
          ) : voiceState === "permission_error" ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Microphone blocked</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-teal-400" />
              <span>Use voice</span>
            </>
          )}
        </button>

        {/* Action button to expand help or reset if in error state */}
        {(voiceState === "network_error" || voiceState === "permission_error") && (
          <button
            type="button"
            onClick={() => setShowNetworkHelp((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-0.5 rounded hover:bg-slate-800 transition-colors"
            title="Troubleshoot speech service connection"
          >
            {showNetworkHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Network / Connection Recovery Panel */}
      {voiceState === "network_error" && showNetworkHelp && (
        <div className="mt-2 p-3 rounded-xl bg-slate-900/95 border border-amber-500/30 text-slate-300 text-xs shadow-xl z-20 max-w-sm animate-fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1.5">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Voice recognition could not connect</span>
          </div>
          <p className="text-slate-400 mb-2 leading-relaxed">
            Your browser could not reach its speech recognition endpoint. Try these steps:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 mb-3 text-[11px]">
            <li>Open the app directly on its HTTPS Cloud Run URL (not an insecure embed).</li>
            <li>Use the latest version of Chrome, Edge, or Safari.</li>
            <li>Ensure microphone permission is granted in your browser site settings.</li>
            <li>Disable VPN/proxy or try another network.</li>
            <li>Type your reflection manually — full AI reflection remains 100% available.</li>
          </ul>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-500">Keyboard typing is always enabled</span>
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Permission Blocked Panel */}
      {voiceState === "permission_error" && showNetworkHelp && (
        <div className="mt-2 p-3 rounded-xl bg-slate-900/95 border border-rose-500/30 text-slate-300 text-xs shadow-xl z-20 max-w-sm animate-fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-rose-300 mb-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Microphone permission blocked</span>
          </div>
          <p className="text-slate-400 mb-2 leading-relaxed text-[11px]">
            Please enable microphone permissions in your browser's site settings or address bar icon, then click "Try again". You can also type your reflection directly.
          </p>
          <div className="flex items-center justify-end pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
