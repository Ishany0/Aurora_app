import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Download,
  ExternalLink,
  CheckCircle2,
  X,
  Sparkles,
  Shield,
} from "lucide-react";
import type { ActionItem } from "../types.js";

interface CalendarSyncModalProps {
  action: ActionItem;
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  action,
  isOpen,
  onClose,
}) => {
  const [scheduleChoice, setScheduleChoice] = useState<"15min" | "evening" | "tomorrow" | "custom">("15min");
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString().slice(0, 16);
  });
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Parse duration in minutes from effort string (e.g. "5 minutes" -> 5, "15 minutes" -> 15, "30 minutes" -> 30)
  const parseDurationMinutes = (effortStr: string): number => {
    if (effortStr.includes("5")) return 5;
    if (effortStr.includes("15")) return 15;
    if (effortStr.includes("30")) return 30;
    if (effortStr.includes("longer")) return 45;
    return 15;
  };

  const durationMinutes = parseDurationMinutes(action.effort);

  // Compute start and end timestamps based on user selection
  const getEventDates = (): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date(now);

    if (scheduleChoice === "15min") {
      start.setMinutes(now.getMinutes() + 15);
    } else if (scheduleChoice === "evening") {
      start.setHours(19, 0, 0, 0);
      if (start.getTime() <= now.getTime()) {
        start.setDate(start.getDate() + 1);
      }
    } else if (scheduleChoice === "tomorrow") {
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
    } else {
      const parsed = new Date(customDateTime);
      if (!isNaN(parsed.getTime())) {
        start.setTime(parsed.getTime());
      }
    }

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  };

  const { start, end } = getEventDates();

  const formatGoogleCalendarDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };

  const eventTitle = `Aurora Focus: ${action.action}`;
  const eventDetails = `One manageable step from your private reflection: ${action.action}\n\nCategory: ${action.category}\nEstimated duration: ${action.effort}\n\n(Generated privately by Aurora AI Reflection)`;

  // Google Calendar URL Intent
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle
  )}&dates=${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(
    end
  )}&details=${encodeURIComponent(eventDetails)}&location=Private+Focus+Time`;

  // RFC-5545 .ics Calendar File Generator
  const handleDownloadICS = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Aurora Private Reflection//NONSGML v1.0//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@aurora.app`,
      `DTSTAMP:${formatGoogleCalendarDate(new Date())}`,
      `DTSTART:${formatGoogleCalendarDate(start)}`,
      `DTEND:${formatGoogleCalendarDate(end)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDetails.replace(/\n/g, "\\n")}`,
      "LOCATION:Private Focus Time",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora-focus-${action.category || "action"}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl p-6 text-slate-100 relative space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Routine Bridge</span>
            </div>
            <h3 id="calendar-modal-title" className="text-lg font-bold text-white tracking-tight font-display">
              Schedule Your Manageable Step
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Lock in a brief dedicated time block so your reflection translates into real-world follow-through.
            </p>
          </div>
        </div>

        {/* Action Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-teal-300 uppercase tracking-wider">Action Step:</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Clock className="w-3 h-3 text-amber-400" />
              {action.effort} • {action.category}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-100">
            {action.action}
          </p>
          {action.reason && (
            <p className="text-xs text-slate-400 italic">
              {action.reason}
            </p>
          )}
        </div>

        {/* Schedule Time Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Choose Time Block:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScheduleChoice("15min")}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                scheduleChoice === "15min"
                  ? "bg-teal-500/15 border-teal-500/60 text-teal-300 shadow-sm"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="font-semibold">In 15 Minutes</div>
              <div className="text-[10px] text-slate-400">Right after reflection</div>
            </button>

            <button
              type="button"
              onClick={() => setScheduleChoice("evening")}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                scheduleChoice === "evening"
                  ? "bg-teal-500/15 border-teal-500/60 text-teal-300 shadow-sm"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="font-semibold">This Evening</div>
              <div className="text-[10px] text-slate-400">Tonight at 7:00 PM</div>
            </button>

            <button
              type="button"
              onClick={() => setScheduleChoice("tomorrow")}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer col-span-2 sm:col-span-1 ${
                scheduleChoice === "tomorrow"
                  ? "bg-teal-500/15 border-teal-500/60 text-teal-300 shadow-sm"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="font-semibold">Tomorrow Morning</div>
              <div className="text-[10px] text-slate-400">9:00 AM start</div>
            </button>
          </div>

          {/* Custom Date Time input toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setScheduleChoice("custom")}
              className="text-[11px] text-slate-400 hover:text-teal-300 underline cursor-pointer"
            >
              Or pick custom date & time
            </button>
            {scheduleChoice === "custom" && (
              <div className="mt-2 animate-fade-in">
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Selected Event Details Preview */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>
              {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })},{" "}
              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
              {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">({durationMinutes} mins)</span>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>Privacy Guaranteed: Only the specific task title is synced. No raw journal reflections are shared.</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleDownloadICS}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download .ICS (Apple/Outlook)</span>
          </button>

          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
          >
            <span>Add to Google Calendar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
};
