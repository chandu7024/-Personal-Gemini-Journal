# ReflectAI — User-Authenticated Journal & Reflection Assistant

> **Baseline Release**: `v1.0.0 — Working Secure ReflectAI`  
> **Status**: Verified Production Ready & Secure Baseline  
> **Build Target**: Google Cloud Run & GitHub Export

A production-ready, cloud-native web application built with **React**, **Node.js/Express**, **Gemini 3.6 Flash API**, **Firebase Authentication**, and **Cloud Firestore**.

ReflectAI provides a private, multi-turn reflective journaling space where thoughts, cognitive explorations, and AI-synthesized takeaways are strictly isolated to each authenticated user.

---

## 🛡️ Architecture & Threat Modeling Summary

The application adheres to the **5 Threat Zones** and **OWASP Top 10 for LLM Applications**:

| Threat Zone | Identified Risk Scenario | OWASP Mapping | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection, malicious payloads, buffer overruns | OWASP LLM01 / LLM02 | Express JSON deserialization with size limits, strict 50k character length capping, and parameterized system instructions. |
| **Planning & Reasoning** | System prompt leakage, guideline bypass, model outages | OWASP LLM07 / LLM01 | Resilient Model Fallback Ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with defensive temperature bounding. |
| **Tool Execution** | Dynamic evaluation risks, privilege escalation, SSRF | OWASP Top 10 A01 / A03 | Strictly typed REST endpoints without dynamic `eval()`; bound exclusively to container ingress `0.0.0.0:3000`. |
| **Memory & State** | Cross-tenant data leaks, unauthorized access to user journals | OWASP A01 Broken Access Control | Granular Firestore security rules enforcing `request.auth.uid == userId` for all paths. Deep undefined-stripping prior to document writes. |
| **Inter-System Communication** | Gemini API key token leakage in client bundles | OWASP A02 Cryptographic Failures | Zero client-side key exposure. `GEMINI_API_KEY` is strictly managed server-side via environment variables / Secret Manager. |

---

## 🔒 Cloud Firestore Security Rules

Deploy the following owner-bound security rules in `firestore.rules` to enforce absolute user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Journal entries collection isolated strictly to the authenticated user
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Multi-turn messages / reflections subcollection
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

---

## 🚀 Google Cloud Setup & Deployment Guide

### 1. Prerequisites & API Activation

Ensure you have the [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed and authenticated:

```bash
# Authenticate gcloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud services
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Secret Manager Configuration

Store your Gemini API key in Google Cloud Secret Manager and grant access to the Cloud Run compute service account:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Cloud Run

Build and deploy the application container to Cloud Run with Secret Manager environment injection:

```bash
# Build and deploy service
gcloud run deploy reflect-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 4. Apply Verification Label

Apply the mandatory challenge verification label to your deployed Cloud Run service:

```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Test Verification Scenarios

| Test Case | Interaction / Step | Expected Outcome |
| :--- | :--- | :--- |
| **TC-01: Landing & Auth Guard** | Open the application while unauthenticated. | Displays the high-contrast landing page with Google Sign-In button and security architecture badge. Protected journal data is inaccessible. |
| **TC-02: Google Sign-In** | Click **"Sign In with Google"** and complete OAuth popup. | Successfully authenticates user, creates/updates `/users/{userId}` in Firestore, and transitions smoothly into the private dashboard. |
| **TC-03: Create New Entry** | Click **"New Reflection"** in the top navbar or sidebar. | Instantly creates a new document in `/users/{userId}/entries` with default mode `mindful`, updates sidebar list in real time, and opens the reflection workspace. |
| **TC-04: Multi-Turn Reflection** | Type a reflection prompt into the textarea and press Enter. | Message is immediately persisted to Firestore (`role: 'user'`), triggers backend `/api/chat` with Gemini 3.6 Flash fallback ladder, and renders streaming assistant response (`role: 'assistant'`). |
| **TC-05: Mode Switcher** | Click between **"Mindful"**, **"Socratic"**, **"Brainstorm"**, **"Gratitude"**, or **"Action"** tabs. | Updates entry mode in Firestore; subsequent Gemini responses adapt their perspective and questioning style according to the chosen persona. |
| **TC-06: Inline Title & Tags** | Click the entry title to rename, or click **"+ Tag"** to add `#work` or `#gratitude`. | Updates Firestore document in real-time, instantly reflected across the sidebar and history search index. |
| **TC-07: AI Synthesis & Action Steps** | Click **"Insights & Synthesis"** &rarr; **"Generate AI Synthesis"**. | Triggers `/api/summarize`, which generates structured executive summaries, key themes, interactive checkable action steps, and mood badges stored directly in Firestore. |
| **TC-08: Cross-User Isolation** | Sign in as User A, create entries, then sign out and sign in as User B. | User B only sees their own entries. Firestore rules strictly reject attempts to read or mutate User A's subcollections (`request.auth.uid == userId`). |
| **TC-09: Delete Entry** | Click the trash icon on a past entry and confirm **"Delete Forever"**. | Deletes entry document and its message subcollection from Firestore; seamlessly shifts active view to next available entry. |
| **TC-10: Threat Model Viewer** | Click the **"Threat Model"** button on the navbar or landing page. | Displays the full 5 Threat Zones modal detailing active mitigations for OWASP Top 10 and LLM vulnerabilities. |
