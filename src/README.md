# ReflectAI Frontend Architecture

This directory comprises the **Frontend Code** of ReflectAI built with **React 19, Vite, TypeScript, and Tailwind CSS**.

## 🌐 Key Frontend Responsibilities

1. **User Authentication & Identity (`src/lib/firebase.ts`, `src/components/LandingPage.tsx`)**:
   - Google Sign-In via Firebase Auth.
   - Profile bootstrapping and dynamic role awareness (`user`, `admin`, `super_admin`).

2. **Socratic Voice Journal & Web Audio Visualizer (`src/components/VoiceSocraticModal.tsx`)**:
   - Web Audio API integration with `AnalyserNode` generating live sinusoidal multi-wave animations.
   - Hands-free reflective speech synthesis filtered for natural English dialects.

3. **Cognitive Distortion Radar & Reframing (`src/components/Dashboard.tsx`)**:
   - Interactive breakdown of 10 clinical CBT distortions.
   - Socratic evidence-testing questions and empowering reframes.

4. **Subconscious Semantic Constellation (`src/components/SubconsciousConstellationModal.tsx`)**:
   - Interactive D3 force-directed physics graph with dynamic time-slicing and zoom/pan physics.

5. **Longitudinal Cognitive Vitality Hub (`src/components/LongitudinalAuditModal.tsx`)**:
   - Visualizing Cognitive Flexibility, Internal Agency, and Emotional Resilience over 7d/30d/90d.

6. **Admin Console & Threat Model Viewer (`src/components/AdminConsoleModal.tsx`, `src/components/ThreatModelModal.tsx`)**:
   - System latency, API health, user role management, and live audit log stream.

7. **Executive 5-Theme Engine (`src/lib/theme.ts`, `src/components/ThemeSelector.tsx`)**:
   - Clinical Slate, Obsidian Night, Warm Linen, Nordic Sage, Executive Ice.
