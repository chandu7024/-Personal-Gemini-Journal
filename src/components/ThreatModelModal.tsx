import React from "react";
import { ShieldCheck, X, AlertTriangle, Lock, Server, Cpu, Database, Network } from "lucide-react";
import type { ThreatModelItem } from "../types";

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THREAT_MODEL_DATA: ThreatModelItem[] = [
  {
    threatZone: "Input Surfaces",
    riskDescription: "Untrusted user prompt injection, payload tampering, or oversized text vectors aimed at hijacking model instructions.",
    owaspCategory: "OWASP LLM01 / LLM02",
    implementedCountermeasure: "Strict schema validation via express middleware, payload length bounding (50k chars), and explicit systemInstruction isolation parameterization.",
    status: "Enforced",
  },
  {
    threatZone: "Planning & Reasoning",
    riskDescription: "System prompt leak, adversarial override of persona/guidelines, or hallucinations leading to unauthorized actions.",
    owaspCategory: "OWASP LLM07 / LLM01",
    implementedCountermeasure: "Server-side strict prompt framing with role demarcation, multi-model fallback ladder, and deterministic temperature controls.",
    status: "Enforced",
  },
  {
    threatZone: "Tool Execution",
    riskDescription: "Privilege escalation via server endpoints, SSRF, or dynamic code evaluation vulnerabilities.",
    owaspCategory: "OWASP Top 10 A01 / A03",
    implementedCountermeasure: "Zero dynamic eval; fixed REST endpoints with typed handler boundaries; strict CORS/Host 0.0.0.0 binding.",
    status: "Enforced",
  },
  {
    threatZone: "Memory & State",
    riskDescription: "Cross-tenant data exposure, unauthorized read/writes across user journal subcollections, or session hijacking.",
    owaspCategory: "OWASP A01 Broken Access Control",
    implementedCountermeasure: "Firestore security rules enforce owner-bound isolation (/users/{userId}/... restricted to request.auth.uid == userId). Recursive undefined-stripping ensures zero DB driver crashes.",
    status: "Enforced",
  },
  {
    threatZone: "Inter-System Communication",
    riskDescription: "Gemini API key exposure in client bundles or network transit interception.",
    owaspCategory: "OWASP A02 Cryptographic Failures",
    implementedCountermeasure: "GEMINI_API_KEY resides strictly server-side (no VITE_ exposure). Client communicates exclusively via secure backend proxy endpoints.",
    status: "Enforced",
  },
];

const ZONE_ICONS: Record<string, React.ReactNode> = {
  "Input Surfaces": <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
  "Planning & Reasoning": <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  "Tool Execution": <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  "Memory & State": <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
  "Inter-System Communication": <Network className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
};

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="threat-model-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="threat-model-dialog"
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Agentic Threat Model & Security Architecture
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active countermeasures mapped to the 5 Production Threat Zones (OWASP LLM & Web Top 10)
              </p>
            </div>
          </div>
          <button
            id="btn-close-threat-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {THREAT_MODEL_DATA.map((item) => (
              <div
                key={item.threatZone}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    {ZONE_ICONS[item.threatZone]}
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {item.threatZone}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.owaspCategory}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 self-start sm:self-auto">
                    <Lock className="w-3 h-3" />
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <span className="font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                      Identified Risk Scenario:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.riskDescription}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 block mb-0.5">
                      Active Defense Countermeasure:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.implementedCountermeasure}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Continuous Security Verification</p>
              <p className="text-indigo-700 dark:text-indigo-300 mt-0.5 leading-relaxed">
                All Firestore operations strictly enforce client-side token verification and owner-matching rules. All Gemini API traffic is proxied through the server fallback ladder with resilient failover.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <button
            id="btn-threat-modal-dismiss"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Close Threat Model
          </button>
        </div>
      </div>
    </div>
  );
};
