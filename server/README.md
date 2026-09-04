# ReflectAI Backend Architecture

This directory and `server.ts` comprise the **Backend Code** of ReflectAI running on Node.js, Express, and Google Cloud Run.

## 🛡️ Key Backend Responsibilities

1. **AI Inference & Resilient Fallback Ladder (`/api/ai/*`)**:
   - Multi-turn Socratic dialogue (`/api/ai/chat`)
   - 10-class Cognitive Distortion Radar & Reframing (`/api/ai/analyze-bias`)
   - Structured Executive Reflection Summarization (`/api/ai/summarize`)
   - Automatic fallback across `gemini-3.1-flash-lite`, `gemini-flash-latest`, and `gemini-3.8-flash`.

2. **Longitudinal Cognitive Vitality & Subconscious Constellation (`/api/analytics/*`)**:
   - Rolling moving averages for Cognitive Flexibility, Internal Agency, and Emotional Resilience.
   - Dynamic D3 force graph data generator clustering subconscious echoes and themes.

3. **External Notifications & Reminders (`/api/notifications/*`)**:
   - Secure SMTP email dispatches with bespoke Socratic prompts.
   - Slack BlockKit and Discord rich embed webhooks.
   - Absolute zero-client credential exposure.

4. **Security, RBAC & Audit Logging (`/api/audit/*`, `/api/admin/*`)**:
   - Immutable security audit logging to `/audit_logs`.
   - Admin telemetry, latency metrics, and user management endpoints.
   - OWASP LLM01 boundary sanitization and token-bucket rate limiting.

## 📁 Entrypoint & Deployment
- Entrypoint: `server.ts` (bundled via esbuild to `dist/server.cjs` in production)
- Dev runner: `tsx server.ts`
- Cloud Run Port: `3000` (bridged via Nginx on `8080`)
