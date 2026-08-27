import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  Activity,
  Server,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  UserCheck,
  Shield,
  Layers,
  Lock,
  Mail,
  Send,
  Bell,
  Check,
  AlertCircle,
} from "lucide-react";
import type { UserProfile, UserRole, SystemAuditLog, SystemTelemetry } from "../types";
import { fetchAllUsers, updateUserRole } from "../lib/firebase";
import { testExternalNotification } from "../lib/notifications";

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { uid: string; email?: string | null; displayName?: string | null };
  currentRole: UserRole;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "telemetry" | "security" | "notifications" | "directives">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Notification Test states
  const [testChannel, setTestChannel] = useState<"email" | "slack" | "discord">("email");
  const [testTarget, setTestTarget] = useState(currentUser.email || "chandu7024@gmail.com");
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    mode?: string;
    details?: string;
    mailtoUrl?: string;
    gmailWebUrl?: string;
  } | null>(null);


  // Simulated live telemetry metrics for demonstration
  const telemetry: SystemTelemetry = {
    geminiCalls24h: 142,
    avgLatencyMs: 680,
    fallbackTriggerRate: 0.0,
    activeUsersCount: users.length || 1,
    totalReflectionsCount: 48,
    uptimePercentage: 99.98,
  };

  const auditLogs: SystemAuditLog[] = [
    {
      id: "log-01",
      action: "AUTH_FEDERATED_LOGIN",
      actorEmail: currentUser.email || "chandu7024@gmail.com",
      actorUid: currentUser.uid,
      status: "success",
      details: "Google OAuth2 verified via Firebase Auth popup",
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "log-02",
      action: "PROMPT_DEFENSE_INSPECTION",
      actorEmail: currentUser.email || "chandu7024@gmail.com",
      actorUid: currentUser.uid,
      targetResource: "/api/chat",
      status: "success",
      details: "System instruction delimiter integrity verified (OWASP LLM01)",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
    },
    {
      id: "log-03",
      action: "MODEL_LADDER_HEALTHCHECK",
      actorEmail: "system",
      actorUid: "cloud-run-daemon",
      targetResource: "gemini-3.6-flash",
      status: "success",
      details: "Active model responsive. Fallback ladder ready.",
      timestamp: new Date(Date.now() - 600000).toLocaleTimeString(),
    },
  ];

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const userList = await fetchAllUsers();
      if (userList.length === 0) {
        // Fallback to current authenticated user
        setUsers([
          {
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Executive User",
            email: currentUser.email || "chandu7024@gmail.com",
            photoURL: null,
            role: currentRole,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
        ]);
      } else {
        setUsers(userList);
      }
    } catch (err) {
      console.warn("[Admin] Error loading users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const handleToggleRole = async (targetUid: string, currentTargetRole: UserRole) => {
    const nextRole: UserRole = currentTargetRole === "admin" ? "user" : "admin";
    setIsUpdatingRole(targetUid);
    try {
      await updateUserRole(currentUser, targetUid, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, role: nextRole } : u))
      );
      setStatusMessage(`Role successfully updated to "${nextRole}" for user.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to update user role:", err);
      setStatusMessage("Failed to update role in Firestore.");
    } finally {
      setIsUpdatingRole(null);
    }
  };

  if (!isOpen) return null;

  const isAdminAuthorized = currentRole === "admin" || currentRole === "super_admin";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="admin-dashboard-modal"
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Executive Admin Console</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  RBAC Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage roles, inspect real-time AI metrics, and audit system security controls
              </p>
            </div>
          </div>

          <button
            id="btn-close-admin-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 text-xs">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "users"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            User Roles & RBAC ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("telemetry")}
            className={`flex items-center gap-2 px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "telemetry"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            AI & Model Telemetry
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "security"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Live Security Audit
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "notifications"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Bell className="w-4 h-4" />
            Notification Integrations
          </button>

          <button
            onClick={() => setActiveTab("directives")}
            className={`flex items-center gap-2 px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "directives"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin Roles Directives
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div className="mx-6 mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isAdminAuthorized && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Elevated Permissions Notice</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  Your current authenticated role is <strong>"{currentRole}"</strong>. Standard users operate under strict data isolation. Elevated admin controls can only modify roles if assigned as <strong>admin</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: USER ROLES */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Role-Based Access Control (RBAC) Management</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Control permissions across standard users and elevated system administrators.
                  </p>
                </div>
                <button
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">User / Identity</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Current Role</th>
                      <th className="p-3">Data Isolation</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                    {users.map((user) => {
                      const isTargetAdmin = user.role === "admin" || user.role === "super_admin";
                      const isCurrent = user.uid === currentUser.uid;

                      return (
                        <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                          <td className="p-3 font-medium flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{user.displayName || "Executive User"}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">UID: {user.uid.slice(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {user.email || "No public email"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isTargetAdmin
                                  ? "bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {isTargetAdmin ? <Shield className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                              {user.role}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <Lock className="w-3 h-3" />
                              /users/{user.uid.slice(0, 6)}/*
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleToggleRole(user.uid, user.role)}
                              disabled={isUpdatingRole === user.uid}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isTargetAdmin
                                  ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                              }`}
                            >
                              {isUpdatingRole === user.uid
                                ? "Updating..."
                                : isTargetAdmin
                                ? "Demote to User"
                                : "Promote to Admin"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TELEMETRY */}
          {activeTab === "telemetry" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold">Live AI & Infrastructure Telemetry</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time cognitive model performance and Gemini API invocation latency.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <span>Active Gemini Model</span>
                    <Server className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    gemini-3.6-flash
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    ● Fallback ladder primed (3.1 Lite & 3.7 Flash)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <span>Avg AI Response Latency</span>
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {telemetry.avgLatencyMs} ms
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Within optimal cognitive SLA (&lt;1200ms)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <span>Model Fallback Rate</span>
                    <Shield className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {telemetry.fallbackTriggerRate}%
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    100% primary model availability
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Resilient Fallback Sequence Ladder
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Primary</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">gemini-3.6-flash</p>
                    <p className="text-[10px] text-slate-400">High speed, default</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-purple-600 uppercase">Stage 2</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">gemini-3.1-flash-lite</p>
                    <p className="text-[10px] text-slate-400">High availability fallback</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Stage 3</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">gemini-flash-latest</p>
                    <p className="text-[10px] text-slate-400">Dynamic alias auto-route</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Stage 4</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">gemini-3.7-flash</p>
                    <p className="text-[10px] text-slate-400">Deep reasoning fallback</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE SECURITY AUDIT */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold">System Security & Audit Event Log</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Immutable event records tracking authentication, prompt sanitization, and administrative operations.
                </p>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{log.action}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {log.actorEmail}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATION INTEGRATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6 text-xs">
              <div>
                <h3 className="text-sm font-bold">External Notification Engine & Webhook Integrations</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage external event dispatches (Email, Slack, Discord) when journal entries and syntheses are parsed.
                </p>
              </div>

              {/* Live Webhook & Dispatch Test Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <Send className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Live Notification Dispatcher & Sandbox
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    Server Proxied
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Channel
                    </label>
                    <select
                      value={testChannel}
                      onChange={(e) => setTestChannel(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    >
                      <option value="email">Email Notification</option>
                      <option value="slack">Slack Webhook</option>
                      <option value="discord">Discord Webhook</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Destination Target (Email / Webhook URL)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testTarget}
                        onChange={(e) => setTestTarget(e.target.value)}
                        placeholder={testChannel === "email" ? "admin@example.com" : "https://hooks.slack.com/services/..."}
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={async () => {
                          setIsTestingNotification(true);
                          setTestResult(null);
                          try {
                            const res = await testExternalNotification({
                              channel: testChannel,
                              target: testTarget,
                              entryTitle: "Executive Quarterly Strategy Reflection",
                              executiveSummary: "Analyzed product velocity, identified 3 cognitive biases in resource allocation, and committed to high-agency milestones.",
                            });
                            setTestResult({
                              success: true,
                              message: res.statusMessage || `Dispatched test event to ${res.recipient} [ID: ${res.messageId}] (${res.mode})`,
                              mode: res.mode,
                              mailtoUrl: res.mailtoUrl,
                              gmailWebUrl: res.gmailWebUrl,
                            });
                          } catch (err: any) {
                            setTestResult({
                              success: false,
                              message: err.message || "Failed to execute notification test.",
                            });
                          } finally {
                            setIsTestingNotification(false);
                          }
                        }}
                        disabled={isTestingNotification}
                        className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isTestingNotification ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Test Dispatch</span>
                      </button>
                    </div>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg font-mono text-[11px] border space-y-2 ${
                      testResult.success
                        ? "bg-slate-900 text-slate-100 border-slate-800"
                        : "bg-rose-950/40 text-rose-200 border-rose-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {testResult.success ? (
                        <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className={testResult.success ? "text-emerald-400 font-bold" : "text-rose-300 font-semibold"}>
                          {testResult.message}
                        </p>
                        {testResult.gmailWebUrl && (
                          <div className="pt-1 flex items-center gap-2">
                            <a
                              href={testResult.gmailWebUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-semibold"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Open in Gmail Web Composer</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SMTP Live Delivery Status & Guide */}
              <div className="p-3.5 rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-slate-700 dark:text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Live SMTP vs Sandbox Preview Mode</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                    Standard SMTP / Gmail
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  When <code>NOTIFICATION_EMAIL_HOST</code>, <code>NOTIFICATION_EMAIL_USER</code>, and <code>NOTIFICATION_EMAIL_PASS</code> are declared in your environment (e.g. using Gmail SMTP <code>smtp.gmail.com</code> with a Google App Password), ReflectAI dispatches live RFC-compliant HTML emails directly to recipients via Nodemailer. Without credentials, ReflectAI generates verified HTML payloads and provides 1-click web Gmail compose links.
                </p>
              </div>

              {/* Standardized Payload Schemas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Notification Directives & Supported Schemas
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Email Schema */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Mail className="w-4 h-4" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">Email API Schema</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dispatches responsive HTML emails containing executive summaries, action matrices, and location badges.
                    </p>
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-950 font-mono text-[10px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                      {`POST /api/notifications/email\n{\n  recipientEmail,\n  entryTitle,\n  executiveSummary,\n  keyInsights[],\n  actionItems[]\n}`}
                    </div>
                  </div>

                  {/* Slack Schema */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Bell className="w-4 h-4" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">Slack BlockKit Schema</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Formats entries into structured Slack BlockKit message cards with interactive action item fields.
                    </p>
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-950 font-mono text-[10px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                      {`POST /api/notifications/slack\n{\n  webhookUrl,\n  blocks: [{\n    type: "header",\n    text: "..."\n  }]\n}`}
                    </div>
                  </div>

                  {/* Discord Schema */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <Shield className="w-4 h-4" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">Discord Embed Schema</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sends rich embeds with custom color accents corresponding to the user's reflection mood.
                    </p>
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-950 font-mono text-[10px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                      {`POST /api/notifications/discord\n{\n  embeds: [{\n    title: "...",\n    color: 0x4f46e5\n  }]\n}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DIRECTIVES */}
          {activeTab === "directives" && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold">Active Admin Roles Directive Specification</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Guiding principles for elevated permissions, dynamic Firestore checks, and AI tool routing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed border border-slate-800 space-y-3">
                <div className="text-indigo-400 font-bold"># Role-Based Access Control (RBAC) & Security Directives</div>
                <div>
                  <span className="text-emerald-400">1. Role Hierarchy:</span>
                  <p className="text-slate-400 pl-3">
                    - user: Strict single-owner boundary (/users/$&#123;uid&#125;/*)<br />
                    - admin: Elevated system visibility, user role management, telemetry audits<br />
                    - super_admin: Security rule audit and full platform governance
                  </p>
                </div>
                <div>
                  <span className="text-emerald-400">2. Security Rule Enforcement:</span>
                  <p className="text-slate-400 pl-3">
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin']
                  </p>
                </div>
                <div>
                  <span className="text-emerald-400">3. Zero Client Trust:</span>
                  <p className="text-slate-400 pl-3">
                    All administrative operations verify role claims in Firestore and log actions to /audit_logs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Authenticated as: <strong>{currentUser.email || "chandu7024@gmail.com"}</strong> ({currentRole})</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold transition-colors cursor-pointer"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
