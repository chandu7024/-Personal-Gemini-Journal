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

---

# Voice Socratic Dialogue & Speech Synthesis Guardrails

## 1. Strict English Language Enforcement
* **Phonetic & Voice Filter**: Browser speech synthesis must strictly filter for verified English language tags (`en-US`, `en-GB`, `en-AU`, etc.). All foreign language synthesis engines must be excluded to prevent accidental non-English voice-overs.
* **Server Directives**: All Socratic conversation prompts dispatched to the Gemini engine must mandate spoken responses exclusively in English with measured, contemplative cadence.
* **Fallback Safety**: If the requested voice URI is unavailable, fall back to the highest-scoring natural English voice, never an arbitrary default system voice.

## 2. Audio & Stream Security
* **Ephemeral Audio**: Client-side microphone streams must be destroyed immediately upon session close or mute toggle. No raw audio recordings are stored on disk or in cloud databases without explicit user initiation.
* **Transcript Sanitization**: Real-time transcribed interim text must be sanitized to eliminate command injection patterns before passing to reflection handlers.

---

# Cognitive Distortion Radar & CBT Reframing Directive

## 1. Cognitive Behavioral Taxonomy Standards
* **Core Distortion Types**: Standardize detection across the 10 clinically recognized distortions:
  - *All-or-Nothing Thinking*, *Catastrophizing*, *Mind Reading*, *Emotional Reasoning*, *Fortune Telling*, *Mental Filtering*, *Disqualifying the Positive*, *Should Statements*, *Labeling*, and *Personalization*.
* **Constructive Socratic Reframing**:
  - AI responses must never offer medical or psychiatric diagnoses.
  - Every identified distortion must be paired with an empowering, agency-enhancing reframe and an evidence-testing question.

## 2. Ephemeral Analysis & Sanitization
* Automated cognitive analysis must be performed server-side (`/api/ai/analyze-bias`) via secure proxy.
* Transcripts and reflections submitted for bias analysis must be sanitized to strip direct identifiers and third-party entity names.

---

# Longitudinal Growth & Vitality Indices Directive

## 1. Tenant Scoping & Isolation
* **Strict Tenant Isolation**: Multi-entry longitudinal queries must strictly target documents belonging exclusively to the authenticated user (`/users/{userId}/entries/*`). Cross-user trend comparisons without explicit anonymization are strictly prohibited.
* **Ephemeral Synthesis**: When batching multi-entry historical summaries for longitudinal audits, all entry payloads must be stripped of external PII.

## 2. Metric Computation Standards
* **Windowing Intervals**: Support dynamic time intervals (7-Day, 30-Day, 90-Day, All-Time).
* **Cognitive Indices**: Calculate rolling moving averages for:
  - **Cognitive Flexibility Index** (0–100): Inverse correlation with rigid distortion frequency (*All-or-Nothing*, *Should Statements*).
  - **Internal Agency Score** (0–100): Proportion of high-agency action steps vs. fatalistic framing.
  - **Emotional Resilience Score** (0–100): Recovery velocity across negative-to-empowered mood states.
* **Distortion Recurrence Clustering**: Track week-over-week reduction rate (`Δ%`) per distortion type.

## 3. Server-Side Audit Endpoint (`/api/analytics/longitudinal-audit`)
* Enforce authentication token verification (`request.auth != null`).
* Sanitize entry snippets against indirect prompt injection before batch reasoning.
* Render accessible empty states when fewer than 2 completed entries exist.

---

# Subconscious Timeline & Semantic Constellation Directive

## 1. Multi-Entry Echo Architecture
* **Subconscious Mapping**: Transform chronological reflections into a multi-dimensional semantic graph connecting core beliefs, recurring psychological triggers, breakthroughs, and emotional filters.
* **Echo Detection Engine (`/api/analytics/constellation-graph`)**:
  - Server endpoint parses historical reflections to extract latent thematic clusters.
  - Generates cross-entry "Subconscious Echoes" identifying repeating psychological patterns and contrasting past fears with observed outcomes.

## 2. Force Simulation & Visualization Hygiene
* Physics simulation must gracefully handle container resize without fixed window calculations.
* Minimum threshold: If fewer than 2 completed reflection entries exist, render an accessible non-blocking empty state with actionable guidance.

---

# External Notifications (Slack / Discord / Email) Directive

## 1. Zero-Client Credential Principle
* **Server-Side Dispatching Only**: All third-party notification tokens (SMTP credentials, Slack Webhooks, Discord Webhooks, SendGrid/Resend API keys) MUST NEVER be exposed to the frontend or bundled in client-side code.
* **API Route Proxy**: Client triggers must call secure `/api/notifications/*` endpoints. Server dynamically resolves credentials from environment variables or Google Cloud Secret Manager.
* **Session Verification**: Endpoints must verify `request.auth != null` and ensure the target entry belongs to the requesting user.

## 2. Event Trigger Directives
* **Trigger A: High-Agency Action Items**: Triggered when an entry is synthesized with 3+ committed action steps.
* **Trigger B: Milestone Breakthroughs**: Triggered when Gemini Cognitive Engine extracts high-priority emotional breakthroughs or strategic executive summaries.
* **Trigger C: Explicit User Request**: Triggered when the user clicks "Email Summary" or schedules automated reflection dispatch.

## 3. Audit Trail & Rate Limiting
* All dispatched notifications must produce an immutable record in `/audit_logs` detailing channel, recipient hash, timestamp, and delivery status.
* Enforce token-bucket rate limiting to prevent webhook spam or quota exhaustion.

---

# Geolocation & Spatial Reflection Context Guardrails

## 1. Privacy-Preserving Geolocation
* Geolocation must only be requested with explicit user consent (`requestFramePermissions: ["geolocation"]`).
* Coordinates must be reverse-geocoded to high-level city/locality labels (e.g., "San Francisco, CA") using privacy-preserving endpoints.
* Precise latitude and longitude coordinates must not be shared with external third-party services or stored in unencrypted plain text.

---

# Executive Theme System & Professional Visual Palettes Directive

## 1. Supported Themes & Aesthetic Spectrum
* **Light (Clinical Slate)**: Default high-contrast clinical theme with slate neutrals, crisp white surfaces, and deep indigo focal anchors.
* **Dark (Obsidian Night)**: Low-luminance dark theme utilizing `#0b0f17` canvas and `#0f172a` container elevations with relaxed contrast for nighttime reflection.
* **Warm Linen (Sand & Paper)**: Executive warm-light theme using organic almond parchment (`#faf7f2`), warm stone surfaces (`#fffdf9`), and terracotta/amber accents (`#c2410c`) to minimize blue-light eye strain during extended introspective sessions.
* **Nordic Sage (Mindful Eucalyptus)**: Calming professional light theme featuring serene botanical gray-green tones (`#f4f7f5`), clean white surfaces, and subtle teal/emerald accents (`#0d9488`) inspired by Scandinavian mindfulness journals.
* **Executive Ice (Arctic Slate)**: Analytical crisp cool-light theme with glacier mist backgrounds (`#f0f4f8`), high-clarity slate typography, and sky-blue anchors (`#0284c7`).

## 2. Persistence & Multi-Layer Synchronization
* **Client Instant-Hydration**: Theme preferences must be persisted immediately in `localStorage` under key `reflectai-theme` and initialized on document root (`document.documentElement.setAttribute('data-theme', theme)`) before render to prevent visual flashes.
* **User Profile Synchronization**: When authenticated, theme selections must synchronize with the user's Firestore profile (`/users/{uid}`) under the `theme` field.
* **Dark Mode Utility Parity**: When `dark` is selected, the root element must retain the `.dark` class to ensure all Tailwind `dark:` variants function identically.

## 3. UI Control Specifications
* **Navbar Quick-Picker**: Provide an accessible, compact palette switcher dropdown in the primary navigation bar with visual color swatches, active indicators, and keyboard navigation.
* **Profile Settings Integration**: Allow persistent theme configuration inside the User Profile modal alongside personal identity details.
* **WCAG AA Compliance**: All palettes must strictly maintain a minimum contrast ratio of 4.5:1 for standard body text against their respective background surfaces.



