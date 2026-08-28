# Role-Based Access Control (RBAC) & Admin Security Directive

## 1. Role Hierarchy & Claims Schema
* **Roles Definition**:
  - `user`: Standard access. Can only read/write their own personal reflection documents (`/users/{userId}/entries/*`).
  - `admin`: Elevated access. Can view aggregated application telemetry, security audit logs, system latency metrics, and user management lists.
  - `super_admin`: Full system control including role promotion and security rule audits.

## 2. Secure Firestore Rules for RBAC
* Never rely solely on client-side role checks.
* Security rules must check dynamic document lookup or custom auth claims:
  ```javascript
  function isAdmin() {
    return request.auth != null && 
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
  }
  ```

## 3. Server & AI Boundary Checks
* When executing administrative AI diagnostics or fetching system-wide telemetry, API routes (`/api/admin/*`) must verify the user's role before processing payloads.
* Admin endpoints must log administrative actions to an isolated `/audit_logs` collection.

# External Notifications (Slack / Discord / Email) & Notification API Directive

## 1. Zero-Client Credential Principle & Proxy Architecture
* **Server-Side Dispatching Only**: All third-party notification tokens (SMTP credentials, Slack Webhooks, Discord Webhooks, SendGrid/Resend API keys) MUST NEVER be exposed to the frontend or bundled in client-side code.
* **API Route Proxy**: Client triggers must call secure `/api/notifications/*` endpoints. The server extracts credentials dynamically from environment variables or Google Cloud Secret Manager.
* **Authentication Verification**: Notification endpoints must verify the requester is authenticated (`request.auth != null` / verified user session) and that the parsed entry belongs to the requesting user.

## 2. Event Trigger & Parsing Directives
Notifications should be dispatched or queued when specific journal entry parsing criteria are met:
* **Trigger A: High-Agency Action Items**: When an entry is synthesized with 3+ committed action steps.
* **Trigger B: Milestone / Breakthrough Insights**: When Gemini Cognitive Engine extracts high-priority emotional breakthroughs or strategic executive summaries.
* **Trigger C: Explicit User Request**: When the user clicks "Email Summary" or enables automated dispatch for completed reflection sessions.

## 3. Standardized Notification Payload Schemas
### A. Email Schema (`/api/notifications/email`)
```json
{
  "recipientEmail": "user@example.com",
  "entryTitle": "Quarterly Vision & Strategy",
  "executiveSummary": "Synthesized 2-3 sentence overview...",
  "keyInsights": ["Insight 1", "Insight 2"],
  "actionItems": ["Action item 1", "Action item 2"],
  "mood": "Empowered",
  "tags": ["strategy", "planning"],
  "locationName": "San Francisco, CA",
  "formattedDate": "Aug 27, 2026"
}
```

### B. Slack BlockKit Schema (`/api/notifications/slack`)
```json
{
  "webhookUrl": "https://hooks.slack.com/services/...",
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🧠 ReflectAI Summary: {entryTitle}" }
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*Executive Summary:*\n{executiveSummary}" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Mood:* {mood}" },
        { "type": "mrkdwn", "text": "*Location:* {locationName}" }
      ]
    }
  ]
}
```

### C. Discord Webhook Embed Schema (`/api/notifications/discord`)
```json
{
  "embeds": [
    {
      "title": "🧠 ReflectAI: {entryTitle}",
      "description": "{executiveSummary}",
      "color": 5195493,
      "fields": [
        { "name": "Key Insights", "value": "{keyInsightsList}", "inline": false },
        { "name": "Action Steps", "value": "{actionItemsList}", "inline": false }
      ],
      "footer": { "text": "ReflectAI • Protected by Firestore RBAC" }
    }
  ]
}
```

## 4. Audit Trail & Rate Limiting
* All dispatched notifications must produce an immutable record in `/audit_logs` detailing channel, recipient hash, timestamp, and delivery status.
* Limit repetitive webhook dispatches to prevent notification spam or quota exhaustion.

# Longitudinal Cognitive Growth & Distortion Analytics Directive

## 1. User Isolation & Privacy Guardrails
* **Strict Tenant Scoping**: Longitudinal aggregation across multiple journal entries must strictly query only documents belonging to the authenticated user (`/users/{userId}/entries/*`). Cross-user trend comparisons or aggregated behavioral tracking without explicit anonymization are strictly prohibited.
* **Ephemeral Synthesis Payloads**: When dispatching multi-entry historical summaries to the Gemini API for longitudinal audits, all entry payloads must be sanitized to strip external PII and limit raw token exposure.

## 2. Metric Computation & Time-Series Standards
* **Windowing Intervals**: Support dynamic time-slices (7-Day, 30-Day, 90-Day, All-Time).
* **Cognitive Vitality Indices**: Calculate rolling moving averages for:
  - **Cognitive Flexibility Index** (0–100): Inverse correlation with rigid distortion frequency (*All-or-Nothing*, *Should Statements*).
  - **Internal Agency Score** (0–100): Proportion of high-agency action steps vs. fatalistic framing (*Fortune Telling*, *Learned Helplessness*).
  - **Emotional Resilience Score** (0–100): Recovery velocity across negative-to-empowered mood states.
* **Distortion Recurrence Clustering**: Track week-over-week reduction rate (`Δ%`) per distortion type (e.g., Catastrophizing, Sunk Cost Fallacy, Imposter Phenomenon).

## 3. Server-Side Multi-Entry Longitudinal Audit Endpoint (`/api/analytics/longitudinal-audit`)
* **Authentication Enforcement**: Verify user authentication token (`request.auth != null`).
* **Resilient Prompt Architecture**: Sanitize all entry snippets against indirect prompt injection before batch reasoning.
* **Standardized JSON Schema**:
  ```json
  {
    "timeRangeAnalyzed": "Last 30 Days",
    "entriesCount": 12,
    "growthSummary": "2-3 sentence overview of psychological trajectory...",
    "keyBreakthroughMilestones": ["Overcame all-or-nothing thinking in product launches..."],
    "topRecurringBlindSpots": [
      {
        "distortionName": "Catastrophizing",
        "occurrenceCount": 5,
        "primaryTrigger": "High-stakes deliverables",
        "shiftObserved": "Decreased by 35% over last 2 weeks",
        "recommendedMicroPractice": "5-minute probability reality-check"
      }
    ],
    "vitalityTrends": {
      "flexibilityDelta": "+18%",
      "agencyDelta": "+24%",
      "resilienceDelta": "+12%"
    },
    "customBehavioralExperiment": {
      "title": "The Imperfect Launch Challenge",
      "hypothesis": "Shipping a 90% draft will generate constructive feedback without catastrophe.",
      "actionSteps": ["Share draft early", "Log emotional reaction", "Review actual outcome"]
    }
  }
  ```

## 4. Zero-Crash & Sparse Data Fallback Hygiene
* If a user has fewer than 2 completed reflection entries, the analytics dashboard must render an accessible, non-blocking empty state with proactive guidance rather than failing or rendering broken charts.


