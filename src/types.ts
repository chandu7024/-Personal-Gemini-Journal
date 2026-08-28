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

// Subconscious Timeline & Semantic Constellation Types
export type ConstellationNodeType = 
  | "core_belief" 
  | "breakthrough" 
  | "emotional_filter" 
  | "recurring_trigger" 
  | "life_domain"
  | "identity_anchor";

export type EmotionalValence = "empowered" | "reflective" | "vulnerable" | "anxious" | "creative" | "neutral";

export interface ConstellationNode {
  id: string;
  label: string;
  type: ConstellationNodeType;
  valence: EmotionalValence;
  strength: number; // 1 - 10 (influences radius & mass)
  mentionCount: number;
  firstObservedDate: string;
  lastObservedDate: string;
  associatedEntryIds: string[];
  associatedEntryTitles: string[];
  subconsciousInsight: string;
  socraticInquiry: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface ConstellationLink {
  source: string | ConstellationNode;
  target: string | ConstellationNode;
  relationship: string; // e.g. "triggers", "reinforces", "evolved_into", "counterbalances", "co_occurs"
  strength: number; // 0.1 to 1.0
  insight: string;
}

export interface SemanticEcho {
  id: string;
  currentTheme: string;
  pastEntryId: string;
  pastEntryTitle: string;
  pastEntryDate: string;
  resonanceScore: number; // 0 - 100
  echoDescription: string;
  observedEvolution: string;
  recommendedAnchor: string;
}

export interface SubconsciousTimelineData {
  timeframe: string;
  totalEntriesAnalyzed: number;
  subconsciousThemeSummary: string;
  nodes: ConstellationNode[];
  links: ConstellationLink[];
  echoes: SemanticEcho[];
  coreEvolutionStatement: string;
  analyzedAt: string;
  modelUsed?: string;
}

// Reflection Email Reminder Settings & Payloads
export type ReminderFrequency = "daily" | "weekly" | "off";
export type ReminderDayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type ReminderTheme = "mindful" | "socratic" | "gratitude" | "executive" | "reframe";

export interface EmailReminderSettings {
  enabled: boolean;
  recipientEmail: string;
  frequency: ReminderFrequency;
  dayOfWeek: ReminderDayOfWeek;
  time: string; // e.g. "08:30" (24-hour format)
  timezone: string; // e.g. "America/New_York", "UTC"
  theme: ReminderTheme;
  customIntent?: string;
  includeSocraticPrompt: boolean;
  lastDispatchedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderDispatchPayload {
  recipientEmail: string;
  frequency: ReminderFrequency;
  dayOfWeek?: ReminderDayOfWeek;
  theme: ReminderTheme;
  time?: string;
  timezone?: string;
  customIntent?: string;
  includeSocraticPrompt?: boolean;
  isTest?: boolean;
  appUrl?: string;
}

export interface ReminderThemeMetadata {
  id: ReminderTheme;
  label: string;
  tagline: string;
  samplePrompt: string;
  recommendedTime: string;
  badgeColor: string;
}




