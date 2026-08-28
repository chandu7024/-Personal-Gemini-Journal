# ReflectAI — Multi-Modal Socratic Journal & Cognitive Reflection Engine

[![Google Cloud Run](https://img.shields.io/badge/Deployed%20on-Google%20Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini 3.6 Flash](https://img.shields.io/badge/AI%20Engine-Gemini%203.6%20Flash%20API-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase Auth & Firestore](https://img.shields.io/badge/Database-Cloud%20Firestore%20%26%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Submission for Google Cloud & Gemini AI Challenge / Ideathon**  
> **Repository**: [https://github.com/chandu7024/-Personal-Gemini-Journal](https://github.com/chandu7024/-Personal-Gemini-Journal)  
> **Live Architecture**: Full-Stack Containerized React + Express + Cloud Firestore + Gemini API on Google Cloud Run

---

## 🌟 Executive Summary

**ReflectAI** is not a passive digital diary or generic chatbot wrapper. It is a cloud-native, multi-modal **Socratic Mirror and Cognitive Growth Platform** grounded in clinical Cognitive Behavioral Therapy (CBT) principles. 

ReflectAI actively parses user reflections to detect cognitive distortions (such as *Catastrophizing*, *All-or-Nothing Thinking*, *Mind Reading*, and *Imposter Phenomenon*), challenges underlying assumptions through real-time **voice & text Socratic dialogue**, tracks **longitudinal psychological vitality**, maps recurring mental themes on a **Subconscious Semantic Constellation**, and translates unstructured self-talk into clear executive action steps—all wrapped within an enterprise-grade, zero-trust security architecture.

---

## 🚀 Key Feature Matrix

### 🎙️ 1. Real-Time Socratic Voice Journaling
- **Interactive Sinusoidal Waveform**: Live multi-wave frequency visualizer powered by the Web Audio API (`AudioContext` + `AnalyserNode`) responding dynamically to microphone volume and spoken assistant turns.
- **Hands-Free Socratic Dialogue**: Natural conversational turn-taking with Gemini 3.6 Flash calibrated for concise 1–3 sentence reflective inquiries.
- **Dual-Mode Synchrony**: Spoken interactions automatically synchronize with the active reflection entry in Firestore.
- **Microphone Safety & Ephemeral Processing**: Ephemeral in-memory audio buffers with zero disk logging; safe audio lifecycle tear-down on unmount.

### 🧠 2. Cognitive Distortion Diagnostic Engine
- **Clinical Bias Radar**: Automatically identifies 10+ cognitive distortions with severity scoring and confidence indices.
- **Empathetic Socratic Reframing**: Formulates objective perspective shifts and actionable micro-practices to overcome identified blind spots.
- **Multi-Persona Modes**: Adapt reflection style on the fly between **Mindful**, **Socratic Questioner**, **Strategic Brainstorm**, **Gratitude**, and **Action Architect**.

### 📈 3. Longitudinal Cognitive Growth Hub
- **Vitality Index Tracking**: Rolling moving averages for:
  - **Cognitive Flexibility Index** (0–100): Inverse correlation with rigid distortions (*All-or-Nothing*, *Should Statements*).
  - **Internal Agency Score** (0–100): Ratio of proactive action commitments vs. learned helplessness framing.
  - **Emotional Resilience Score** (0–100): Velocity of recovery across negative-to-empowered mood states.
- **Distortion Recurrence Clustering**: Week-over-week reduction metrics ($\Delta\%$) across specific thinking patterns.
- **Behavioral Experiments**: AI-synthesized micro-challenges tailored to observed behavioral trends.

### 🌌 4. The "Subconscious Timeline" (AI Semantic Constellation & Echo Graph)
- **Interactive D3 Force-Directed Simulation**: Renders a 2D cosmos of interconnected thoughts, latent psychological themes, emotional filters, and breakthrough anchors.
- **Subconscious Echo Detection**: Discovers deep psychological resonances where earlier dilemmas mirror or evolve into later reflections across weeks or months.
- **Node & Echo Inspector**: Interactive drawer revealing underlying evidence quotes, connected reflection IDs, and cognitive category badges with smooth pan/zoom physics.
- **Dynamic Time Filtering**: Zoom into 7-day, 30-day, 90-day, or All-Time cosmic perspectives.

### 📍 5. Location-Aware Reflection Grounding
- **Google Maps Platform Integration**: Built using `@googlemaps/js-api-loader` with HTTP referrer restriction support.
- **Sanctuary Pinning**: Pin physical environments (study, nature trails, cafes, travel retreats) to reflective sessions with geocoded coordinates.
- **Zero-Client Geocoding Secret**: Server-side proxy (`/api/maps/geocode`) for reverse geocoding and place metadata.

### 🔔 6. Automated Reflection Reminders & Multi-Channel Dispatch
- **Daily & Weekly Reflection Reminders**: User configuration panel with customizable frequencies (Daily, Weekly, Weekdays), preferred time, timezone auto-detection, and tailored cognitive themes (*Morning Clarity*, *Evening Unwinding*, *Weekly Strategic Synthesis*, *Overcoming Imposter Syndrome*, *Deep Gratitude*).
- **Dynamic Socratic Prompt Synthesis**: Gemini synthesizes bespoke reflection inquiries and centering exercises in real time for each dispatched reminder.
- **Zero-Client Credential Principle**: SMTP credentials, Slack webhooks, and Discord endpoints are handled exclusively server-side.
- **Rich Output Formatting**: Slack BlockKit payloads, Discord rich embeds, and responsive HTML email templates with key insights, action steps, and mood metadata.
- **Event-Driven Triggers**: Dispatches summaries upon breakthrough discoveries, 3+ action commitments, or direct user requests.

### 🛡️ 7. Role-Based Access Control (RBAC) & Audit Console
- **Role Hierarchy**: Strict separation between `user` (isolated journal access), `admin` (system telemetry & latency analytics), and `super_admin` (role promotion & audit inspection).
- **Immutable Audit Trail**: Administrative actions and notification events are recorded to an isolated `/audit_logs` collection.

---

## 🛡️ Agentic Threat Model & Security Architecture

ReflectAI is engineered following the **5 Threat Zones** and the **OWASP Top 10 for LLM Applications**:

| Threat Zone | Identified Risk Scenario | OWASP Mapping | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection, malicious audio transcripts, payload overruns | OWASP LLM01 / LLM02 | Express JSON body sanitization, deep `undefined` stripping, strict character length capping, and parameterized system prompts. |
| **Planning & Reasoning** | System prompt bypass, hallucinations, model rate limits | OWASP LLM07 / LLM01 | 5-Tier Resilient Fallback Ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash` &rarr; `gemini-2.5-flash`) with error cooldown recovery. |
| **Tool Execution** | Dynamic evaluation risks, privilege escalation, SSRF | OWASP Top 10 A01 / A03 | Strictly typed REST endpoints without `eval()`; server-only dispatch proxies; container ingress restricted to `0.0.0.0:3000`. |
| **Memory & State** | Cross-tenant journal access, session hijacking | OWASP A01 Broken Access Control | Granular Firestore security rules enforcing `request.auth.uid == userId` for all document read/writes. |
| **Inter-System Communication** | API token / webhook leakage in frontend bundles | OWASP A02 Cryptographic Failures | Zero client-side credentials. Gemini API keys, Maps server keys, and notification webhooks are retrieved securely via environment variables or Secret Manager. |
> ⚠️ SECURITY: Never commit `.env`, API keys, service-account JSON files, access tokens, webhook URLs, or other credentials to GitHub. The `.env` file is for local development only. Production Cloud Run deployments retrieve sensitive credentials through Google Cloud Secret Manager.
---

## 🔒 Cloud Firestore Security Rules

Deploy the following rules in `firestore.rules` to enforce data isolation and RBAC:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // RBAC Helper: Dynamic document lookup
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
    }

    // User Profile Document & Private Settings
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Personal Journal Entries Collection (Owner-Isolated)
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Multi-Turn Spoken / Text Messages Subcollection
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }

    // System Telemetry & Audit Logs (Admin-Only Access)
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🏗️ Technical Architecture & Stack

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 18 + Vite)               │
│   • Tailwind CSS  • Lucide Icons  • Web Audio API      │
│   • Socratic Voice Engine  • Longitudinal Analytics    │
│   • D3 Constellation Simulation • Reminder Config      │
└───────────────────────────▲────────────────────────────┘
                            │ (Authenticated REST / JSON)
┌───────────────────────────▼────────────────────────────┐
│         Backend Proxy Layer (Express / Node.js)        │
│   • Resilient Gemini AI Fallback Ladder                │
│   • Zero-Client Notification Proxies (Slack/Discord)   │
│   • Server Geocoding Proxy  • Audit Log Dispatcher     │
│   • Automated Socratic Prompt Generator                │
└───────────────────────────▲────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     Google Gemini AI SDK      │   │   Firebase Auth & Firestore   │
│  • gemini-3.6-flash (Primary) │   │  • Owner-Bound Path Isolation │
│  • gemini-3.1-flash-lite      │   │  • Real-Time Synchrony        │
│  • Socratic Persona System    │   │  • Dynamic RBAC Claims        │
└───────────────────────────────┘   └───────────────────────────────┘
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

   # Grant Cloud Run service account access to Secret Manager
   PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
   gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Build & Deploy Container**:
   ```bash
   gcloud run deploy reflect-ai \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
   ```

4. **Apply Challenge Verification Label**:
   ```bash
   gcloud run services update reflect-ai \
     --update-labels=dev-tutorial=cloud-run-ai-challenge \
     --region=us-central1
   ```

---

## 📤 How to Sync / Push Code to GitHub

You can sync your latest application code to **[https://github.com/chandu7024/-Personal-Gemini-Journal](https://github.com/chandu7024/-Personal-Gemini-Journal)** using either method below:

### Method A: One-Click AI Studio Export (Recommended)
1. In the **Google AI Studio** workspace header, click the **Settings / Export** icon (top right).
2. Select **Export to GitHub** (or **Download ZIP**).
3. Connect your GitHub account and target repository: `chandu7024/-Personal-Gemini-Journal`.
4. Click **Export / Commit Changes** to update the `main` branch.

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
| **TC-01** | **Authentication** | Open app unauthenticated & click **"Sign in with Google"**. | Completes Firebase OAuth popup, bootstraps `/users/{uid}` profile, and smoothly transitions into private dashboard. |
| **TC-02** | **Socratic Voice Journal** | Click **"Voice Journal"** on navbar & speak a reflective thought. | Visualizes live sinusoidal audio waveform, processes speech via Gemini 3.6 Flash, speaks back concise inquiry, and saves transcript to Firestore. |
| **TC-03** | **Multi-Turn Chat** | Type a reflection prompt into the textarea and press Enter. | Message is immediately persisted (`role: 'user'`), queries `/api/chat` through resilient fallback ladder, and renders streaming response (`role: 'assistant'`). |
| **TC-04** | **Cognitive Radar** | Submit an entry containing an all-or-nothing statement (e.g. *"I failed this demo, so I'm completely useless"*). | AI Cognitive Bias Diagnostic highlights *All-or-Nothing Thinking*, assigns severity score, and generates a structured Socratic reframing. |
| **TC-05** | **Executive Synthesis** | Open reflection insights & click **"Generate AI Synthesis"**. | Generates a 2-3 sentence executive summary, extractable key themes, interactive checkable action steps, and mood badges. |
| **TC-06** | **Longitudinal Hub** | Click **"Analytics"** from the top navigation bar. | Computes rolling moving averages for Cognitive Flexibility, Internal Agency, and Resilience scores across 7d/30d/90d windows. |
| **TC-07** | **Subconscious Constellation** | Click **"Subconscious"** icon on the top navigation bar. | Renders interactive D3 force-directed cosmos of thoughts, psychological echoes, and breakthrough anchors with zoom/pan physics. |
| **TC-08** | **Reflection Reminders** | Click **"Reminders"** (bell icon) and save daily/weekly schedule. | Configures frequency, timezone, and cognitive themes; tests instant Gemini Socratic email synthesis with responsive HTML preview. |
| **TC-09** | **Maps Grounding** | Click **"+ Location"** inside an active entry workspace. | Opens the Google Maps Sanctuary Picker. Selecting a location pins coordinates and formatted address to the journal document. |
| **TC-10** | **External Notification** | Click **"Share / Notify"** & dispatch an Email / Slack summary. | Calls secure `/api/notifications/*` proxy; formats BlockKit / Embeds; logs immutable event to `/audit_logs`. |
| **TC-11** | **User Data Isolation** | Sign in with User A, create entries, sign out, and sign in with User B. | User B sees zero entries from User A. Firestore rules reject cross-tenant subcollection queries (`request.auth.uid == userId`). |
| **TC-12** | **Admin Security Console** | Promote account to `admin` and open **"Admin Console"**. | Displays real-time system latency, Gemini API health, error telemetry, and security audit logs. |
| **TC-13** | **Threat Model Viewer** | Click **"Threat Model"** in the top navbar. | Opens interactive modal detailing active countermeasures against OWASP Top 10 for LLM Applications. |

---

## 👥 Authors & Acknowledgments

- **Lead Developer**: Chandu ([@chandu7024](https://github.com/chandu7024))
- **Built With**: Google Gemini API, Google Cloud Run, Cloud Firestore, Firebase Authentication, React 18, Tailwind CSS, Web Audio API, and Google Maps Platform.
- **License**: Released under the MIT License.

