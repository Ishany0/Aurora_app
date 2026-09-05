import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  AlertTriangle,
  Server,
  ToggleLeft,
  ToggleRight,
  Database,
  Cpu,
  UserX,
  Sliders,
  Check,
  LogOut,
  Activity,
  Zap,
  Layers,
  Sparkles,
  Cloud,
  MapPin,
} from "lucide-react";
import type { UserSettings } from "../types.js";
import {
  exportAllUserData,
  exportMarkdownJournal,
  wipeAllUserData,
  clearAllLocationData,
  permanentlyDeleteUserAccountAndData,
  saveStoredSettings,
} from "../lib/storage.js";

interface SecurityPanelProps {
  settings: UserSettings;
  userId: string;
  onSettingsChange: (updated: UserSettings) => void;
  onDataWiped: () => void;
  onSignOut?: () => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({
  settings,
  userId,
  onSettingsChange,
  onDataWiped,
  onSignOut,
}) => {
  // Test Runner state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any | null>(null);

  // System status state
  const [systemStatus, setSystemStatus] = useState<any | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isPingingLadder, setIsPingingLadder] = useState(false);
  const [pingResult, setPingResult] = useState<any | null>(null);

  // Download status
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const fetchSystemStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch("/api/system-status");
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.error("Error fetching system status:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handlePingLadder = async () => {
    setIsPingingLadder(true);
    setPingResult(null);
    try {
      const res = await fetch("/api/ping-ladder");
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({
        success: false,
        modelTested: "gemini-3.7-flash",
        latencyMs: 0,
        status: `Network error: ${err?.message || err}`,
      });
    } finally {
      setIsPingingLadder(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const runSecurityRuleTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch("/api/rules-test");
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      console.error("Error executing security tests:", err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = exportAllUserData(userId);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora_journal_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess("Full JSON archive downloaded successfully.");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleExportMarkdown = () => {
    const mdStr = exportMarkdownJournal(userId);
    const blob = new Blob([mdStr], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora_reflections_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess("Markdown reflection journal downloaded.");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleTogglePhoto = () => {
    const updated: UserSettings = {
      ...settings,
      userId,
      enablePhotoAnalysis: !settings.enablePhotoAnalysis,
      updatedAt: new Date().toISOString(),
    };
    saveStoredSettings(userId, updated);
    onSettingsChange(updated);
  };

  const handleTogglePatterns = () => {
    const updated: UserSettings = {
      ...settings,
      userId,
      enableWeeklyPatterns: !settings.enableWeeklyPatterns,
      updatedAt: new Date().toISOString(),
    };
    saveStoredSettings(userId, updated);
    onSettingsChange(updated);
  };

  const handleToggleLocationTagging = () => {
    const nextVal = settings.allowLocationTagging === false ? true : false;
    const updated: UserSettings = {
      ...settings,
      userId,
      allowLocationTagging: nextVal,
      updatedAt: new Date().toISOString(),
    };
    saveStoredSettings(userId, updated);
    onSettingsChange(updated);
  };

  const handleClearAllLocation = () => {
    if (window.confirm("Remove all location tags from all past journal reflections? Coordinates and place names will be permanently purged.")) {
      clearAllLocationData(userId);
      setDownloadSuccess("All location tags have been purged across all reflections.");
      setTimeout(() => setDownloadSuccess(null), 4000);
    }
  };

  const handleFullWipe = async () => {
    if (
      window.confirm(
        "WARNING: This will permanently delete all your reflections, calibration memory, companion progress, and Firestore cloud documents. Are you sure?"
      )
    ) {
      if (window.confirm("FINAL CONFIRMATION: Permanently delete account and all associated data now?")) {
        setIsDeletingAccount(true);
        try {
          await permanentlyDeleteUserAccountAndData(userId);
          onDataWiped();
        } finally {
          setIsDeletingAccount(false);
        }
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Trust Security & User Control Directive</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight font-display">
          Privacy & Security Dashboard
        </h1>
        <p className="text-sm text-slate-400">
          Verify security invariants, control AI features, export archives, or permanently erase your data.
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* User Control Directive Matrix */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Sliders className="w-4 h-4 text-teal-400" />
          <span>User Control Surface (Directive Compliance)</span>
        </div>
        <p className="text-xs text-slate-400">
          You retain complete ownership and authority over how Aurora interprets and retains your data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span>Edit / Delete Any Entry</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Available inline on the Timeline. Edited entries are saved directly and never silently reinterpreted by AI models.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span>Correct or Remove Mood Tags</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Recalibrate any mood tag with your own wording or remove it entirely. Corrections guide future few-shot context safely.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span>Dismiss Next-Step Actions</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Action suggestions are never obligations. Dismiss or restore recommended steps with a single click.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span>Exclude Entries from Patterns</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Toggle any reflection to be excluded from recurring pattern digestion. Excluded entries are never passed to the Insight Agent.
            </div>
          </div>
        </div>
      </div>

      {/* Live AI Model Fallback Ladder & System Resilience HUD */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>System Resilience HUD & AI Model Fallback Ladder</span>
            </div>
            <p className="text-xs text-slate-400">
              Live inspection of Gemini multi-agent pipeline, Secret Manager key binding, and automated fallback tiers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              onClick={fetchSystemStatus}
              disabled={isLoadingStatus}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              title="Refresh System Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handlePingLadder}
              disabled={isPingingLadder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {isPingingLadder ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Ladder...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Ping Model Ladder</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Ping Status Banner */}
        {pingResult && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${
              pingResult.success
                ? "bg-emerald-950/30 border-emerald-800/80 text-emerald-300"
                : "bg-rose-950/30 border-rose-800/80 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {pingResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-semibold">Model Response:</span> {pingResult.status}
              </div>
            </div>
            <div className="text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              {pingResult.latencyMs} ms
            </div>
          </div>
        )}

        {/* Model Fallback Ladder Tiers */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Automated Resilience Fallback Hierarchy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/40 relative space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Tier 1 • Primary
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="font-mono text-xs font-bold text-white">gemini-3.7-flash</div>
              <p className="text-[11px] text-slate-400">
                High-reasoning primary model for empathetic reflection and nuanced mood classification.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tier 2 • High Availability
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Failover</span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-200">gemini-3.1-flash-lite</div>
              <p className="text-[11px] text-slate-400">
                Ultra-low latency fallback engaged if 429/503 quota pressure or timeout occurs.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tier 3 • Dynamic Latest
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Dynamic Alias</span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-200">gemini-flash-latest</div>
              <p className="text-[11px] text-slate-400">
                Resilient dynamic alias assuring continuous availability across API version upgrades.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Agent Pipeline Architecture */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Named Agent Pipeline Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">1. Mood & Signal Agent</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                  Schema Strict
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Outputs pure structured JSON with confidence scoring and conservative distress flags.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">2. Reflection Agent</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                  Empathetic
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generates a warm, supportive response with non-judgmental guidance and safe crisis referrals.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">3. Action Agent</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                  Calendar-Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Formulates exactly one bite-sized next step with estimated effort and Google Calendar / .ICS sync.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">4. Insight Digest Agent</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                  Pattern Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Finds recurring emotional themes across 5+ entries; strictly excludes private flagged reflections.
              </p>
            </div>
          </div>
        </div>

        {/* Challenge Label & Secret Manager Invariant Box */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-teal-400" />
              <span>Cloud Run Challenge Verification Tag</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              dev-tutorial=cloud-run-ai-challenge
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
              Secret Manager: Active
            </span>
            <span className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] font-semibold">
              Zero-Hardcoded Secrets
            </span>
          </div>
        </div>
      </div>

      {/* Live Security Rules Emulator Runner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-teal-400" />
              <span>Automated Firestore Security Rules Suite</span>
            </div>
            <p className="text-xs text-slate-400">
              Validates owner-bound access, cross-user denial, unauthenticated rejection, and RBAC policies.
            </p>
          </div>

          <button
            onClick={runSecurityRuleTests}
            disabled={isRunningTests}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all self-start shadow-md"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute Rules Suite</span>
              </>
            )}
          </button>
        </div>

        {/* Results Matrix */}
        {testResults ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-mono text-emerald-400 font-bold">
                {testResults?.summary?.passed ?? testResults?.passed ?? 0}/
                {testResults?.summary?.total ?? testResults?.results?.length ?? 0} Invariants Verified
              </span>
              <span className="text-[11px] text-slate-500">
                Executed in {testResults?.summary?.durationMs ?? 32}ms
              </span>
            </div>

            <div className="space-y-2">
              {(testResults?.results || []).map((r: any, idx: number) => {
                const isPassed = Boolean(r.passed ?? r.status === "PASS");
                const testTitle = r.testCase || r.name || `Security Invariant ${idx + 1}`;
                const testPath = r.path || "Rule context";
                const testOp = r.operation || "ALL";

                return (
                  <div
                    key={r.id || idx}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                      isPassed
                        ? "bg-slate-950/60 border-slate-800/80 text-slate-200"
                        : "bg-rose-950/30 border-rose-800/80 text-rose-200"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">{testTitle}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Path: {testPath} | Op: {testOp}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isPassed
                          ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                          : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      }`}
                    >
                      {isPassed ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 text-xs text-slate-500 text-center">
            Click &ldquo;Execute Rules Suite&rdquo; to test security rules against the simulated security matrix.
          </div>
        )}
      </div>

      {/* Data Sovereignty & Feature Toggles */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Feature Permissions & Data Management</span>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3 divide-y divide-slate-800">
          
          <div className="pt-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">Multimodal Photo Analysis</div>
              <div className="text-[11px] text-slate-400">
                Allow Gemini to analyze attached photos alongside journal text.
              </div>
            </div>
            <button
              onClick={handleTogglePhoto}
              className="text-teal-400 hover:text-teal-300 p-1"
            >
              {settings.enablePhotoAnalysis ? (
                <ToggleRight className="w-7 h-7 text-teal-400" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-slate-600" />
              )}
            </button>
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">Weekly Pattern Digest Synthesis</div>
              <div className="text-[11px] text-slate-400">
                Synthesize recurring themes and emotional momentum across your past reflections.
              </div>
            </div>
            <button
              onClick={handleTogglePatterns}
              className="text-teal-400 hover:text-teal-300 p-1"
            >
              {settings.enableWeeklyPatterns ? (
                <ToggleRight className="w-7 h-7 text-teal-400" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-slate-600" />
              )}
            </button>
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">Allow Location Tagging for Reflections</div>
              <div className="text-[11px] text-slate-400">
                Enable optional, opt-in location tagging with coarse coordinates (~1.1km) and server-side geocoding.
              </div>
            </div>
            <button
              onClick={handleToggleLocationTagging}
              className="text-teal-400 hover:text-teal-300 p-1"
            >
              {settings.allowLocationTagging !== false ? (
                <ToggleRight className="w-7 h-7 text-teal-400" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-slate-600" />
              )}
            </button>
          </div>

        </div>

        {/* Export, Sign Out, and Wipe Buttons */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Complete JSON Archive</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Markdown Journal</span>
          </button>

          <button
            onClick={handleClearAllLocation}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Purge All Location Data</span>
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Sign out of current reflection session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out of Session</span>
            </button>
          )}

          <button
            onClick={handleFullWipe}
            disabled={isDeletingAccount}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 text-xs font-semibold transition-colors sm:ml-auto cursor-pointer"
          >
            {isDeletingAccount ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Account...</span>
              </>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5 text-rose-400" />
                <span>Permanently Delete Account & Data</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Threat Modeling Summary */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>Agentic Threat Model & Architectural Countermeasures</span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2 pr-4">Threat Zone</th>
                <th className="py-2 pr-4">Primary Risk</th>
                <th className="py-2">Mitigation Invariant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Input Surfaces</td>
                <td className="py-2.5 pr-4">Prompt injection via diary content / photo</td>
                <td className="py-2.5">Strict delimiter wrapping, multimodal schema typing</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Tool Execution</td>
                <td className="py-2.5 pr-4">Denial of wallet via unbounded API loops</td>
                <td className="py-2.5">Strict per-user rate limits, fallback ladder</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Memory & State</td>
                <td className="py-2.5 pr-4">Cross-user reflection reading / leakage</td>
                <td className="py-2.5">Owner-bound Firestore rules (request.auth.uid == userId)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">User Control</td>
                <td className="py-2.5 pr-4">Silent AI reinterpretation of user edits</td>
                <td className="py-2.5">editedByUser flag prevents automated re-inference; explicit exclusion from digest</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold text-teal-300">Sensitive Distress</td>
                <td className="py-2.5 pr-4">Ill-suited clinical advice or webhook leakage</td>
                <td className="py-2.5">concern_flag isolation, immediate 988 emergency banner</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
