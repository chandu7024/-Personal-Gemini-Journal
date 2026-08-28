# ReflectAI — Multi-Modal Socratic Journal & Cognitive Reflection Engine

[![Google Cloud Run](https://img.shields.io/badge/Deployed%20on-Google%20Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini 3.6 Flash](https://img.shields.io/badge/AI%20Engine-Gemini%203.6%20Flash%20API-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase Auth & Firestore](https://img.shields.io/badge/Database-Cloud%20Firestore%20%26%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Submission for Google Cloud & Gemini AI Challenge / Ideathon**  
> **Repository**: [https://github.com/chandu7024/-Personal-Gemini-Journal](https://github.com/chandu7024/-Personal-Gemini-Journal)  
> **Live Architecture**: Full-Stack Containerized React + Express + Cloud Firestore + Gemini API on Google Cloud Run  
> **Live Preview**: [https://ais-pre-si7eyej7thivbiagautnfv-272632357176.asia-southeast1.run.app](https://ais-pre-si7eyej7thivbiagautnfv-272632357176.asia-southeast1.run.app)

---

## 🎯 Why ReflectAI?

Most AI assistants answer questions. Most journaling applications store static thoughts.

**ReflectAI connects reflection with action.**

A user's private reflection evolves through a structured transformation lifecycle:

$$\text{Reflection} \longrightarrow \text{Socratic Dialogue} \longrightarrow \text{Cognitive Insight} \longrightarrow \text{Action Commitment} \longrightarrow \text{Longitudinal Growth}$$

**ReflectAI** is a cloud-native, multi-modal AI reflection companion that combines Gemini-powered Socratic conversations, real-time voice journaling, cognitive pattern analysis, longitudinal psychological vitality analytics, subconscious semantic theme discovery, location-aware journaling, and reflection-to-action workflows.

Unlike generic chatbots, ReflectAI is built around a user's private, authenticated reflection history and provides an enterprise zero-trust security architecture using **Firebase Authentication**, **Cloud Firestore (UID-isolated rules & RBAC)**, **Google Cloud Run**, and **Google Cloud Secret Manager**.

> ⚠️ **Important Disclaimer**: ReflectAI is a self-awareness and reflective growth tool, not a medical or mental health diagnostic service. Its AI-generated patterns and reframing exercises are exploratory and designed for personal productivity, mindfulness, and cognitive clarity.

---

## 🏆 What Makes ReflectAI Different?

ReflectAI extends beyond a standard digital journal through key differentiators:

- 🧠 **Socratic Voice Reflection** — Hands-free, natural voice-based reflective conversations with dynamic sinusoidal audio visualizers.
- 🌌 **Subconscious Semantic Constellation** — Discovers latent themes and cross-temporal "echoes" across past reflections using an interactive D3 force simulation.
- 📈 **Longitudinal Vitality Hub** — Tracks Cognitive Flexibility, Internal Agency, and Resilience scores over 7d, 30d, 90d, and All-Time intervals.
- 🎯 **Reflection-to-Action Pipeline** — Converts abstract self-talk into structured, checkable executive action steps and behavioral experiments.
- 📍 **Location-Aware Context Memory** — Links reflections with physical sanctuaries via Google Maps Platform integration.
- 🔔 **Multi-Channel Proactive Reminders** — Automated email, Slack BlockKit, and Discord webhook dispatching with bespoke Gemini Socratic prompts.
- 🛡️ **Zero-Trust Security & RBAC** — Dynamic role hierarchy (`user`, `admin`, `super_admin`), immutable `/audit_logs`, and zero client-side credential exposure.
- 🔐 **OWASP-Compliant Threat Modeling** — Countermeasures embedded for prompt injection (LLM01), credential leakage (LLM02), and broken access control (A01).

---

## 🚀 Key Feature Matrix

### 🎙️ 1. Real-Time Socratic Voice Journaling
- **Sinusoidal Waveform Visualizer**: Live multi-wave frequency visualizer powered by the Web Audio API (`AudioContext` + `AnalyserNode`) responding dynamically to microphone volume and spoken assistant turns.
- **Hands-Free Socratic Dialogue**: Natural conversational turn-taking with Gemini 3.6 Flash calibrated for concise 1–3 sentence reflective inquiries.
- **Dual-Mode Synchrony**: Spoken dialogue automatically synchronizes with active reflection transcripts stored in Firestore.
- **Microphone Safety & Ephemeral Processing**: Ephemeral in-memory audio buffers with zero disk logging; safe audio lifecycle tear-down on modal unmount.

### 🧠 2. Cognitive Pattern Detection & Reflection Engine
- **Cognitive Pattern Radar**: Identifies 10+ clinical distortion patterns (*Catastrophizing*, *All-or-Nothing Thinking*, *Mind Reading*, *Imposter Phenomenon*, *Should Statements*, etc.) with severity scores and confidence indices.
- **Empathetic Socratic Reframing**: Formulates objective perspective shifts and actionable micro-practices to overcome identified blind spots.
- **Adaptive Persona Modes**: Seamlessly switch between **Mindful**, **Socratic Questioner**, **Strategic Brainstorm**, **Gratitude**, and **Action Architect**.

### 📈 3. Longitudinal Cognitive Growth Hub
- **Vitality Index Tracking**: Rolling moving averages for:
  - **Cognitive Flexibility Index** (0–100): Inverse correlation with rigid distortions (*All-or-Nothing*, *Should Statements*).
  - **Internal Agency Score** (0–100): Ratio of proactive action commitments vs. learned helplessness framing.
  - **Emotional Resilience Score** (0–100): Velocity of recovery across negative-to-empowered mood states.
- **Distortion Recurrence Clustering**: Week-over-week reduction metrics ($\Delta\%$) across specific thinking patterns.
- **Behavioral Experiments**: AI-synthesized micro-challenges tailored to observed behavioral trends.

### 🌌 4. Subconscious Semantic Constellation (D3 Echo Graph)
- **Interactive D3 Force-Directed Simulation**: Visualizes a 2D cosmos of interconnected thoughts, latent psychological themes, emotional filters, and breakthrough anchors.
- **Subconscious Echo Detection**: Uncovers deep psychological resonances where earlier dilemmas mirror or evolve into later reflections across weeks or months.
- **Node & Echo Inspector**: Interactive drawer revealing underlying evidence quotes, connected reflection IDs, and cognitive category badges with smooth pan/zoom physics.
- **Dynamic Time Slicing**: Explore 7-day, 30-day, 90-day, or All-Time cosmic perspectives.

### 📍 5. Location-Aware Reflection Grounding
- **Google Maps Platform Integration**: Initialized dynamically via `@googlemaps/js-api-loader` with HTTP referrer restriction support.
- **Sanctuary Pinning**: Pin physical environments (workplace, nature trails, cafes, travel retreats) to reflective sessions with geocoded coordinates.
- **Zero-Client Geocoding Secret**: Server-side proxy (`/api/maps/geocode`) for reverse geocoding and place metadata without frontend credential leakage.

### 🔔 6. Automated Reflection Reminders & Multi-Channel Dispatch
- **Customizable Reminder Engine**: Configure daily, weekly, or weekday reminder cadences, preferred time, timezone auto-detection, and tailored themes (*Morning Clarity*, *Evening Unwinding*, *Weekly Strategic Synthesis*, *Overcoming Imposter Syndrome*, *Deep Gratitude*).
- **Dynamic Socratic Prompt Synthesis**: Gemini synthesizes bespoke reflection inquiries and centering exercises in real time for each dispatched reminder.
- **Zero-Client Credential Principle**: SMTP credentials, Slack webhooks, and Discord endpoints are handled exclusively server-side.
- **Rich Payload Formatting**: Slack BlockKit formatting, Discord rich embeds, and responsive HTML email templates with key insights, action steps, and mood metadata.

### 🛡️ 7. Role-Based Access Control (RBAC) & Audit Console
- **Role Hierarchy**: Strict separation between `user` (isolated journal access), `admin` (system telemetry & latency analytics), and `super_admin` (role promotion & audit inspection).
- **Immutable Server-Side Audit Trail**: Security events, login actions, and notification webhooks are recorded to `/audit_logs` exclusively via trusted backend proxies (`/api/audit/log`).

---

## 🏗️ Technical Architecture & Stack

```text
                         ┌─────────────────────────┐
                         │      User Browser       │
                         └────────────┬────────────┘
                                      │
                                Firebase Auth
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   React 18 + Vite UI    │
                         │   • Web Audio API       │
                         │   • D3 Force Graph      │
                         │   • Lucide / Tailwind   │
                         └────────────┬────────────┘
                                      │
                           Authenticated REST (JSON)
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Cloud Run / Express   │
                         │   • Token Verification  │
                         │   • OWASP LLM01 Guard   │
                         │   • Multi-Model Ladder  │
                         │   • Zero-Client Proxies │
                         │   • Immutable Audit API │
                         └──────┬────────────┬─────┘
                                │            │
                ┌───────────────┘            └───────────────┐
                ▼                                            ▼
       ┌──────────────────┐                         ┌──────────────────┐
       │ Cloud Firestore  │                         │  Gemini API SDK  │
       │ • UID-Bound Rules│                         │ • 3.6 Flash      │
       │ • RBAC Hierarchy │                         │ • 3.1 Flash-Lite │
       │ • Immutable Logs │                         │ • 3.7 Flash      │
       └──────────────────┘                         └──────────────────┘
                │                                            │
                └─────────────────────┬──────────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │ Google Cloud Secrets    │
                         │ • GEMINI_API_KEY        │
                         │ • GOOGLE_MAPS_KEY       │
                         │ • Webhook Secrets       │
                         └─────────────────────────┘
```

---

## 🤖 Gemini Processing & Fallback Architecture

ReflectAI uses Gemini as the core cognitive reasoning layer for reflection analysis, Socratic dialogue, cognitive distortion detection, goal extraction, and longitudinal synthesis.

```text
User Reflection / Voice Input
       │
       ▼
React / Vite Client
       │
       ▼
Express API Proxy (/api/chat, /api/analytics, /api/notifications)
       │
       ├── Firebase Auth Token Verification
       ├── Input Sanitization & Undefined Stripping
       └── Context Retrieval (Historical Transcripts & Active Entry)
       │
       ▼
System & Socratic Prompt Construction
       │
       ├── Persona Directives (Mindful, Socratic, Strategic, etc.)
       ├── OWASP LLM01 Injection Boundary Delimiters
       └── Historical Cognitive Baseline
       │
       ▼
Resilient Gemini Fallback Ladder
       │
       ├── [Primary] gemini-3.6-flash
       ├── [Fallback 1] gemini-3.1-flash-lite
       ├── [Fallback 2] gemini-flash-latest
       └── [Fallback 3] gemini-3.7-flash
       │
       ▼
Response Validation & Schema Parsing
       │
       ├── Valid JSON / Content → Parse & Format
       └── Transient Error / Quota (429/503) → Step Down Ladder & Cooldown
       │
       ▼
Cloud Firestore Document Write (Owner Isolated)
       │
       ▼
Executive Insights / Socratic Turns / Action Steps
```

### Gemini Capabilities Mapping

| Capability | Input | Output | Model Configuration |
| :--- | :--- | :--- | :--- |
| **Socratic Voice & Chat** | Reflection draft + conversation turns | Single, concise Socratic inquiry (1–3 sentences) | `gemini-3.6-flash` (Temp: 0.7) |
| **Cognitive Distortion Diagnostic** | Reflection entry text | Distortions detected, severity scores, reframings | `gemini-3.6-flash` (JSON Schema) |
| **Reflection-to-Action Synthesis** | Full reflection transcript | Executive summary, key themes, checkable actions | `gemini-3.6-flash` (Structured Output) |
| **Subconscious Constellation** | Multi-entry reflection batch | Thematic clusters, cross-temporal echoes, anchors | `gemini-3.6-flash` (Temp: 0.4) |
| **Longitudinal Vitality Audit** | Time-series reflection history | Flexibility, Agency, and Resilience deltas + experiment | `gemini-3.7-flash` (Deep Reasoning) |
| **Dynamic Reminder Synthesis** | User preferences + past themes | Personalized mindfulness prompt + centering exercise | `gemini-3.1-flash-lite` (Low Latency) |

---

## 🚀 Logical Data Model

```text
/users/{userId}
    ├── uid: string
    ├── displayName: string
    ├── email: string
    ├── role: "user" | "admin" | "super_admin"
    ├── reminderSettings: { enabled, frequency, time, timezone, theme, channel }
    ├── createdAt: timestamp
    └── lastLogin: timestamp

    /entries/{entryId}
        ├── userId: string
        ├── title: string
        ├── snippet: string
        ├── mode: "socratic" | "brainstorm" | "gratitude" | "executive" | "mindful"
        ├── mood: string
        ├── tags: string[]
        ├── location: { lat, lng, placeName, formattedAddress }
        ├── synthesis: { executiveSummary, keyInsights[], actionItems[], cognitiveBiases[] }
        ├── pinned: boolean
        ├── createdAt: ISO timestamp
        └── updatedAt: ISO timestamp

        /messages/{messageId}
            ├── role: "user" | "assistant"
            ├── content: string
            ├── timestamp: ISO timestamp
            └── modelUsed: string

/audit_logs/{logId}
    ├── action: string
    ├── actorEmail: string
    ├── actorUid: string
    ├── targetResource?: string
    ├── status: "success" | "warning" | "failure"
    ├── details: string
    └── timestamp: ISO timestamp
```

---

## 🛡️ Agentic Threat Model & Security Architecture

ReflectAI is engineered following the **5 Threat Zones** and the **OWASP Top 10 for LLM Applications**:

| Threat Zone | Identified Risk Scenario | OWASP Mapping | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection, malicious audio transcripts, payload overruns | OWASP LLM01 / LLM02 | Express JSON body sanitization, deep `undefined` stripping, strict character length capping, and parameterized system prompts. |
| **Planning & Reasoning** | System prompt bypass, hallucinations, model rate limits | OWASP LLM07 / LLM01 | 5-Tier Resilient Fallback Ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with error cooldown recovery. |
| **Tool Execution** | Dynamic evaluation risks, privilege escalation, SSRF | OWASP Top 10 A01 / A03 | Strictly typed REST endpoints without `eval()`; server-only dispatch proxies; container ingress restricted to `0.0.0.0:3000`. |
| **Memory & State** | Cross-tenant journal access, session hijacking | OWASP A01 Broken Access Control | Granular Firestore security rules enforcing `request.auth.uid == userId` for all document read/writes. |
| **Inter-System Communication** | API token / webhook leakage in frontend bundles | OWASP A02 Cryptographic Failures | Zero client-side credentials. Gemini API keys, Maps server keys, and notification webhooks are retrieved securely via environment variables or Secret Manager. |

> ⚠️ **SECURITY NOTICE**: Never commit `.env`, API keys, service-account JSON files, access tokens, webhook URLs, or other credentials to GitHub. The `.env` file is for local development only. Production Cloud Run deployments retrieve sensitive credentials through Google Cloud Secret Manager.

---

## 🔒 Cloud Firestore Security Rules & RBAC

Deploy the following rules in `firestore.rules` to enforce strict tenant isolation, role immutability, and server-side audit logs:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Default-deny all unspecified routes
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper: Check if caller is authenticated
    function isSignedIn() {
      return request.auth != null;
    }

    // Helper: Check if caller is verified Super Admin
    function isSuperAdmin() {
      return isSignedIn() && (
        (request.auth.token.email == "chandu7024@gmail.com" && request.auth.token.email_verified == true) ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin')
      );
    }

    // Helper: Check if caller has administrative privileges (admin or super_admin)
    function isAdmin() {
      return isSignedIn() && (
        isSuperAdmin() ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'])
      );
    }

    // User profiles & RBAC
    match /users/{userId} {
      // Users can read their own profile; Admins can view all profiles
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());

      // Create: Users register with default 'user' role. SuperAdmin can initialize administrative profiles.
      // Normal users CANNOT self-assign 'admin' or 'super_admin' roles.
      allow create: if isSignedIn() && (
        isSuperAdmin() ||
        (request.auth.uid == userId && (
          !('role' in request.resource.data) || 
          request.resource.data.role == 'user' ||
          (request.auth.token.email == "chandu7024@gmail.com" && request.auth.token.email_verified == true)
        ))
      );

      // Update: SuperAdmin can modify all fields including roles.
      // Normal users can update profile info (displayName, lastLogin, reminders) ONLY IF 'role' remains unchanged.
      allow update: if isSignedIn() && (
        isSuperAdmin() ||
        (request.auth.uid == userId && (
          !('role' in request.resource.data) || 
          request.resource.data.role == resource.data.role ||
          (request.auth.token.email == "chandu7024@gmail.com" && request.auth.token.email_verified == true)
        ))
      );

      // Deletion strictly limited to SuperAdmin
      allow delete: if isSuperAdmin();

      // Personal journal entries collection: Strictly owner-isolated
      match /entries/{entryId} {
        allow read, write: if isSignedIn() && request.auth.uid == userId;

        // Multi-turn reflective messages subcollection
        match /messages/{messageId} {
          allow read, write: if isSignedIn() && request.auth.uid == userId;
        }
      }
    }

    // System security audit logs:
    // Read: Allowed only for verified Admins and Super Admins
    // Write/Update/Delete: DENIED to all direct client writes (immutable server-side dispatch only)
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow write: if false;
    }
  }
}
```

---

## 🚀 Deployment & Installation Guide

### Prerequisites
- Node.js 18+ & npm
- [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install)
- Firebase Project with Firestore & Google Authentication enabled

---

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/chandu7024/-Personal-Gemini-Journal.git
   cd -Personal-Gemini-Journal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   PORT=3000
   NODE_ENV=development
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GOOGLE_MAPS_API_KEY=your_client_maps_key
   GOOGLE_MAPS_SERVER_API_KEY=your_server_maps_key
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### Deploying to Google Cloud Run

1. **Authenticate and configure Google Cloud**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID

   # Enable required GCP APIs
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     cloudbuild.googleapis.com
   ```

2. **Configure Secret Manager for the Gemini API Key**:
   ```bash
   gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
   echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

   # Grant Cloud Run default compute service account access to Secret Manager
   PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
   gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Build & Deploy Container to Cloud Run**:
   ```bash
   gcloud run deploy reflect-ai \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
   ```

4. **Apply Mandatory Challenge Verification Label**:
   ```bash
   gcloud run services update reflect-ai \
     --update-labels=dev-tutorial=cloud-run-ai-challenge \
     --region=us-central1
   ```

---

## 📤 How to Sync / Push Code to GitHub

You can sync your application code to **[https://github.com/chandu7024/-Personal-Gemini-Journal](https://github.com/chandu7024/-Personal-Gemini-Journal)**:

### Method A: One-Click AI Studio Export (Recommended)
1. In the **Google AI Studio** header, click the **Settings / Export** menu (top right).
2. Select **Export to GitHub**.
3. Connect your GitHub account and repository: `chandu7024/-Personal-Gemini-Journal`.
4. Click **Export / Commit Changes** to sync to the `main` branch.

### Method B: Git CLI Push
```bash
# Initialize git repository
git init

# Add all files
git add .

# Create production release commit
git commit -m "feat: ReflectAI production release with Socratic Voice, Reminders, and Cognitive Diagnostics"

# Set branch to main
git branch -M main

# Set remote origin
git remote add origin https://github.com/chandu7024/-Personal-Gemini-Journal.git

# Push to repository
git push -u origin main --force
```

---

## 🧪 Comprehensive Test & Verification Scenarios

| Test Case | Feature Module | Test Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Authentication** | Open app unauthenticated & click **"Sign in with Google"**. | Completes Firebase OAuth popup, bootstraps `/users/{uid}` profile, and transitions into private dashboard. |
| **TC-02** | **Socratic Voice Journal** | Click **"Voice Journal"** on navbar & speak a reflective thought. | Visualizes live sinusoidal audio waveform, processes speech via Gemini 3.6 Flash, speaks back concise inquiry, and saves transcript to Firestore. |
| **TC-03** | **Multi-Turn Chat** | Type a reflection prompt into the textarea and press Enter. | Message is persisted (`role: 'user'`), queries `/api/chat` through resilient fallback ladder, and renders streaming response (`role: 'assistant'`). |
| **TC-04** | **Cognitive Radar** | Submit an entry containing an all-or-nothing statement (e.g. *"I failed this demo, so I'm completely useless"*). | AI Cognitive Bias Diagnostic highlights *All-or-Nothing Thinking*, assigns severity score, and generates a structured Socratic reframing. |
| **TC-05** | **Executive Synthesis** | Open reflection insights & click **"Generate AI Synthesis"**. | Generates a 2-3 sentence executive summary, extractable key themes, interactive checkable action steps, and mood badges. |
| **TC-06** | **Longitudinal Hub** | Click **"Analytics"** from the top navigation bar. | Computes rolling moving averages for Cognitive Flexibility, Internal Agency, and Resilience scores across 7d/30d/90d windows. |
| **TC-07** | **Subconscious Constellation** | Click **"Subconscious"** icon on the top navigation bar. | Renders interactive D3 force-directed cosmos of thoughts, psychological echoes, and breakthrough anchors with zoom/pan physics. |
| **TC-08** | **Reflection Reminders** | Click **"Reminders"** (bell icon) and save daily/weekly schedule. | Configures frequency, timezone, and cognitive themes; tests instant Gemini Socratic email synthesis with responsive HTML preview. |
| **TC-09** | **Maps Grounding** | Click **"+ Location"** inside an active entry workspace. | Opens the Google Maps Sanctuary Picker. Selecting a location pins coordinates and formatted address to the journal document. |
| **TC-10** | **External Notification** | Click **"Share / Notify"** & dispatch an Email / Slack summary. | Calls secure `/api/notifications/*` proxy; formats BlockKit / Embeds; logs immutable event to `/audit_logs`. |
| **TC-11** | **User Data Isolation** | Sign in with User A, create entries, sign out, and sign in with User B. | User B sees zero entries from User A. Firestore rules reject cross-tenant subcollection queries (`request.auth.uid == userId`). |
| **TC-12** | **Admin Security Console** | Promote account to `admin` and open **"Admin Console"**. | Displays real-time system latency, Gemini API health, error telemetry, and real-time security audit logs. |
| **TC-13** | **Threat Model Viewer** | Click **"Threat Model"** in the top navbar. | Opens interactive modal detailing active countermeasures against OWASP Top 10 for LLM Applications. |
| **TC-14** | **Audit Log Lockdown** | Attempt direct client-side write to `/audit_logs/{id}` via Firestore SDK. | Rejected with `PERMISSION_DENIED`. Writes are exclusively handled by trusted server proxy (`/api/audit/log`). |
| **TC-15** | **RBAC Privilege Escalation Guard** | Standard authenticated user attempts `updateDoc(users/{uid}, { role: "admin" })`. | Rejected with `PERMISSION_DENIED`. Firestore rules block non-super_admin clients from mutating the `role` field. |

---

## ⚠️ Known Limitations

- **Reflective Guidance Scope**: AI-generated insights should be treated as reflective and productivity guidance, not clinical mental health diagnosis.
- **Data Density Requirements**: Longitudinal analytics and Subconscious Echo detection perform optimally with 3+ historical reflection entries.
- **Browser Audio Context**: Spoken audio synthesis requires user gesture interaction (click/tap) to comply with native browser autoplay security policies.

---

## 👥 Authors & Acknowledgments

- **Lead Developer**: Chandu ([@chandu7024](https://github.com/chandu7024))
- **Built With**: Google Gemini API, Google Cloud Run, Cloud Firestore, Firebase Authentication, React 18, Tailwind CSS, Web Audio API, and Google Maps Platform.
- **License**: Released under the [MIT License](https://opensource.org/licenses/MIT).
