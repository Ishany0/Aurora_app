/**
 * Aurora Voice Journaling Utility
 * Implements Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * with robust browser detection, explicit lifecycle management,
 * user-gesture initiation, and empathetic error fallbacks.
 *
 * NOTE: SpeechRecognition requires an HTTPS context in production (e.g. Google Cloud Run)
 * and direct access to the browser's speech recognition backend service.
 */

export interface SpeechRecognitionResultState {
  transcript: string;
  isFinal: boolean;
}

export type VoiceState =
  | "idle"
  | "requesting"
  | "listening"
  | "processing"
  | "unsupported"
  | "network_error"
  | "permission_error";

/**
 * Checks if the Web Speech Recognition API is supported in the current browser window.
 * Supports standard SpeechRecognition and webkitSpeechRecognition (Chrome, Edge, Safari 14.1+).
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Returns the SpeechRecognition constructor if available in the current browser.
 */
export function getSpeechRecognitionConstructor(): any {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

/**
 * Maps Web Speech API error codes to empathetic, actionable, user-friendly messages.
 * Never exposes raw internal error objects to the user.
 */
export function getFriendlySpeechErrorMessage(error: string): {
  message: string;
  type: "network" | "permission" | "audio" | "no_speech" | "aborted" | "generic";
} {
  switch (error) {
    case "not-allowed":
    case "permission-denied":
    case "service-not-allowed":
      return {
        message: "Microphone or speech recognition permission is blocked. Check browser site settings.",
        type: "permission",
      };
    case "network":
      return {
        message: "Your browser could not reach its speech recognition service. Try Chrome, disable VPN/proxy, or type your reflection instead.",
        type: "network",
      };
    case "no-speech":
      return {
        message: "No speech detected. Please try again.",
        type: "no_speech",
      };
    case "audio-capture":
      return {
        message: "No microphone was found. Check your microphone connection.",
        type: "audio",
      };
    case "aborted":
      return {
        message: "",
        type: "aborted",
      };
    default:
      return {
        message: "Voice input is temporarily unavailable. You can still type your reflection.",
        type: "generic",
      };
  }
}


