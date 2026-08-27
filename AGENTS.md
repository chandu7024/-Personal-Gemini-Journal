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

