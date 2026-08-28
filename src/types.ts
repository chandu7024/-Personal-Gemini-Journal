export type ReflectionMode = "mindful" | "socratic" | "brainstorm" | "gratitude" | "executive";

export interface CognitiveBiasItem {
  id: string;
  name: string;
  category: "Distortion" | "Fallacy" | "Limiting Belief" | "Emotional Filter";
  confidence: "High" | "Moderate" | "Subtle";
  triggerQuote: string;
  underlyingAssumption: string;
  clinicalContext: string;
  socraticReframe: string;
  actionableChallenge: string;
}

export interface CognitiveAnalysisResult {
  flexibilityScore: number; // 0 - 100
  agencyScore: number; // 0 - 100
  emotionalResilienceScore: number; // 0 - 100
  dominantThoughtPattern: string;
  biasesDetected: CognitiveBiasItem[];
  overallCognitiveAssessment: string;
  recommendedReframingTechnique: string;
  analyzedAt: string;
  modelUsed?: string;
}

export interface InstantReframeResult {
  originalThought: string;
  detectedDistortions: string[];
  cognitiveTrap: string;
  reframes: {
    pragmatic: string;
    compassionate: string;
    highAgency: string;
  };
  realityTestingQuestion: string;
}

export interface JournalSummary {
  title: string;
  executiveSummary: string;
  keyInsights: string[];
  actionItems: string[];
  mood: string;
  suggestedTopics: string[];
}

export interface JournalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
  isOptimistic?: boolean;
  failed?: boolean;
}

export interface EntryLocation {
  lat: number;
  lng: number;
  placeName: string;
  formattedAddress?: string;
  placeId?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  snippet?: string;
  mode: ReflectionMode;
  tags: string[];
  mood?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary?: JournalSummary | null;
  cognitiveAnalysis?: CognitiveAnalysisResult | null;
  pinned?: boolean;
  location?: EntryLocation | null;
}

export interface ThreatModelItem {
  threatZone: "Input Surfaces" | "Planning & Reasoning" | "Tool Execution" | "Memory & State" | "Inter-System Communication";
  riskDescription: string;
  owaspCategory: string;
  implementedCountermeasure: string;
  status: "Enforced" | "Active";
}

export type UserRole = "admin" | "user" | "super_admin";

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  totalReflections?: number;
}

export interface SystemAuditLog {
  id: string;
  action: string;
  actorEmail: string;
  actorUid: string;
  targetResource?: string;
  status: "success" | "warning" | "error";
  details: string;
  timestamp: string;
}

export interface SystemTelemetry {
  geminiCalls24h: number;
  avgLatencyMs: number;
  fallbackTriggerRate: number;
  activeUsersCount: number;
  totalReflectionsCount: number;
  uptimePercentage: number;
}

export type NotificationChannel = "email" | "slack" | "discord";

export interface EmailNotificationPayload {
  recipientEmail: string;
  entryTitle: string;
  executiveSummary: string;
  keyInsights: string[];
  actionItems: string[];
  mood?: string;
  tags?: string[];
  locationName?: string;
  formattedDate: string;
}

export interface NotificationDispatchResult {
  success: boolean;
  channel: NotificationChannel;
  recipient: string;
  messageId?: string;
  deliveredAt: string;
  previewHtml?: string;
  mode: "live_smtp_delivered" | "preview_unconfigured";
  smtpConfigured: boolean;
  statusMessage?: string;
  mailtoUrl?: string;
  gmailWebUrl?: string;
  error?: string;
}

export interface NotificationEngineStatus {
  smtpConfigured: boolean;
  smtpHost?: string;
  slackConfigured: boolean;
  discordConfigured: boolean;
}

export type TimeWindow = "7d" | "30d" | "90d" | "all";

export interface RecurringBlindSpot {
  distortionName: string;
  occurrenceCount: number;
  primaryTrigger: string;
  shiftObserved: string;
  recommendedMicroPractice: string;
  trend: "improving" | "increasing" | "stable";
}

export interface VitalityTrendDataPoint {
  id?: string;
  date: string;
  entryTitle: string;
  flexibilityScore: number;
  agencyScore: number;
  resilienceScore: number;
  biasesCount: number;
  mood: string;
}

export interface BehavioralExperiment {
  title: string;
  hypothesis: string;
  actionSteps: string[];
  targetDistortion?: string;
}

export interface LongitudinalAuditResult {
  timeRangeAnalyzed: string;
  entriesCount: number;
  growthSummary: string;
  keyBreakthroughMilestones: string[];
  topRecurringBlindSpots: RecurringBlindSpot[];
  vitalityTrends: {
    flexibilityDelta: string;
    agencyDelta: string;
    resilienceDelta: string;
  };
  customBehavioralExperiment: BehavioralExperiment;
  analyzedAt: string;
  modelUsed?: string;
}


