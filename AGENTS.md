# Security Threat Model & Defense-in-Depth Guardrails

## 1. Threat Taxonomy & Mitigation Matrix
* **Threat 1: Prompt & Indirect Injection**:
  - *Risk*: Malicious user entries containing instruction overrides or exfiltration payloads attempting to manipulate Gemini system prompts.
  - *Defense*: Pre-execution input sanitization (`sanitizeInput`), strict parameter boundary delimiter wrapping (`"""`), and model output schema validation before rendering or persistence.
* **Threat 2: Credential Exfiltration & Key Leakage**:
  - *Risk*: Exposure of Gemini API keys, SMTP credentials, or Firebase Service Account keys to the browser bundle.
  - *Defense*: Absolute server-proxy barrier. All Gemini generation, SMTP transport, and administrative calls occur exclusively within server-side endpoints (`/api/*`).
* **Threat 3: Cross-Tenant Data Tampering & IDOR**:
  - *Risk*: Malicious actor attempting to read or write another user's journal entries or cognitive profiles.
  - *Defense*: Hardened Firestore security rules enforcing `request.auth.uid == userId` on all subcollection paths (`/users/{userId}/entries/*`) paired with server-side token validation.
* **Threat 4: Audio Eavesdropping & Biometric Capture**:
  - *Risk*: Retained audio recordings or ambient mic eavesdropping.
  - *Defense*: Purely client-ephemeral audio streams. `MediaStream` tracks are immediately stopped upon mute or session close. Only sanitized text transcripts are transmitted.
* **Threat 5: Denial-of-Wallet & Replay Attacks**:
  - *Risk*: Automated script spamming AI inference or email notification endpoints.
  - *Defense*: Token-bucket rate limiting per IP/user and structured validation rejecting oversize payloads.

---

# Admin Console & Administrative RBAC Directive

## 1. Role Hierarchy & Claims Schema
* **Roles Definition**:
  - `user`: Standard access. Strictly isolated to personal reflections (`/users/{userId}/entries/*`).
  - `admin`: Elevated access. Can view aggregated application telemetry, security audit logs, system latency metrics, and user management lists.
  - `super_admin`: Full system governance including role promotion, system policy configuration, and security rule audits.

## 2. Dynamic Firestore Security Enforcement
* Never rely on client-side role checks.
* Security rules must enforce server-authoritative document lookups:
  ```javascript
  function isAdmin() {
    return request.auth != null && 
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
  }
  function isSuperAdmin() {
    return request.auth != null && 
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
  }
  ```

## 3. Server & Administrative API Boundaries
* All administrative endpoints (`/api/admin/*`) must verify Firebase Auth session tokens and validate caller permissions before returning data.
* Every administrative action (role changes, telemetry export, user updates) must produce an immutable audit log record in `/audit_logs`.

---

# Cognitive Radar & Socratic Synthesis Directive

## 1. Cognitive Behavioral Therapy (CBT) Taxonomy Standards
* **Core Distortion Classifications**: Detect and categorize patterns across 10 clinically grounded distortions:
  - *All-or-Nothing Thinking*, *Catastrophizing*, *Mind Reading*, *Emotional Reasoning*, *Fortune Telling*, *Mental Filtering*, *Disqualifying the Positive*, *Should Statements*, *Labeling*, and *Personalization*.
* **Clinical Guardrails & Tone**:
  - AI responses must never provide clinical psychiatric or medical diagnoses.
  - Every detected distortion must be countered with an objective evidence-testing question and an agency-enhancing reframe.
* **Structured Executive Synthesis**:
  - Automatically extract key insights, actionable commitments, emotional valence shifts, and thematic tags upon journal entry completion.

---

# Cognitive Analytics & Longitudinal Growth Directive

## 1. Metric Computation & Psychological Indices
* **Windowing Intervals**: Calculate dynamic windowed analytics (7-Day, 30-Day, 90-Day, All-Time).
* **Core Cognitive Indices (0–100 Scale)**:
  - **Cognitive Flexibility Index**: Measures adaptive thinking; inversely proportional to cognitive rigidity (*All-or-Nothing*, *Should Statements*).
  - **Internal Agency Score**: Ratio of actionable, self-directed commitments vs. externalized fatalistic framing.
  - **Emotional Resilience Score**: Recovery velocity moving from distressed emotional states toward calm or empowered states.
* **Distortion Recurrence Clustering**: Track week-over-week reduction rate (`Δ%`) to highlight personal growth.

## 2. Strict Tenant Isolation
* Historical audits must be strictly scoped to the authenticated user's entries (`/users/{userId}/entries/*`). Cross-user data aggregation without anonymization is strictly prohibited.

---

# Subconscious Timeline & Semantic Constellation Directive

## 1. Multi-Dimensional Semantic Mapping
* **Semantic Constellation**: Construct dynamic node-edge relationship graphs linking journal reflections by latent themes, emotional filters, and breakthrough epiphanies.
* **Subconscious Echo Engine**:
  - Identifies recurring psychological triggers across chronological reflections.
  - Contrasts past anticipated fears with documented actual outcomes to dismantle catastrophic expectations.
* **Visualization Hygiene**:
  - Implement container-responsive D3 force simulations with graceful empty states when fewer than 2 entries exist.

---

# Email Reminders & Notification Engine Directive

## 1. Zero-Client Credential Principle
* SMTP credentials, webhook URLs, and email provider API keys must never be bundled into frontend client assets.
* All notification dispatches must route through authenticated server proxies (`/api/notifications/*`).

## 2. Notification Protocols & Audit Trails
* **Trigger Modalities**:
  - *Scheduled Introspection*: Morning Mindful Grounding, Evening Socratic Inquiry, and Weekly Growth Digests.
  - *Milestone Action Items*: Automatic summaries dispatched when 3+ high-agency commitments are established.
* **Audit & Rate Limiting**:
  - Record recipient hashes, dispatch timestamps, and status codes in `/audit_logs`.
  - Enforce token-bucket throttling to prevent inbox spamming.

---

# Voice Socratic Dialogue & Speech Synthesis Guardrails

## 1. Strict English Language Enforcement
* Browser speech synthesis must filter exclusively for verified English language tags (`en-US`, `en-GB`, `en-AU`, etc.).
* Socratic dialogue prompts must instruct Gemini to respond in calm, measured English prose.

## 2. Ephemeral Audio Streams
* Microphone audio tracks must be destroyed immediately upon session stop or mute. No audio is persisted without explicit user permission.

---

# Executive Theme System & Professional Visual Palettes Directive

## 1. Supported Themes & Aesthetic Spectrum
* **Light (Clinical Slate)**: High-contrast clinical theme with slate neutrals and crisp white surfaces.
* **Dark (Obsidian Night)**: Low-luminance dark theme with `#0b0f17` canvas and `#0f172a` container elevations.
* **Warm Linen (Sand & Paper)**: Executive warm-light theme using organic almond parchment (`#faf7f2`) and terracotta/amber accents.
* **Nordic Sage (Mindful Eucalyptus)**: Calming botanical light theme (`#f4f7f5`) with subtle teal/emerald accents.
* **Executive Ice (Arctic Slate)**: Analytical cool-light theme with glacier mist backgrounds (`#f0f4f8`) and sky-blue anchors.

## 2. Persistence & Accessibility
* Persist theme choices in `localStorage` under `reflectai-theme` and synchronize to the user's Firestore profile.
* Ensure all palette pairings meet WCAG AA contrast standards (minimum 4.5:1 ratio).



