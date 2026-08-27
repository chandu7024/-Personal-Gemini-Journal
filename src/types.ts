export type ReflectionMode = "mindful" | "socratic" | "brainstorm" | "gratitude" | "executive";

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
  pinned?: boolean;
}

export interface ThreatModelItem {
  threatZone: "Input Surfaces" | "Planning & Reasoning" | "Tool Execution" | "Memory & State" | "Inter-System Communication";
  riskDescription: string;
  owaspCategory: string;
  implementedCountermeasure: string;
  status: "Enforced" | "Active";
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLogin: string;
}
