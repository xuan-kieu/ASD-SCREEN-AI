NeuroScreen AI
1. Project Overview NeuroScreen AI is a research-grade, non-invasive developmental risk screening tool designed to assess behavioral markers in early childhood. By leveraging a "serious game" stimulus engine and computer vision-based behavioral analysis, the system captures subtle phenotypic features (gaze patterns, affective states, motor coordination) without storing raw biometric data.
The system utilizes an AI-orchestrated pipeline to analyze temporal behavioral sequences, providing explainable, non-diagnostic insights to clinicians to support early intervention decision-making.

2. System Architecture
The application is structured as a modular system (simulated within a React client for the MVP):

Functional Modules
Game & Stimulus Engine (components/GameSession.tsx): Delivers standardized elicitation tasks (e.g., "Catch the Sun") designed to trigger specific neuro-developmental responses such as joint attention, motor planning, and impulse control.
Capture & Sensor Service: Manages access to browser MediaStreams (Camera/Microphone) and buffers transient behavioral frames in memory.
Feature Extraction & Inference Service (services/geminiService.ts): Serves as a proxy for an L-TCN-inspired temporal behavioral modeling pipeline. It utilizes multimodal Large Language Models (Gemini 2.5 Flash) In the MVP phase, Gemini is used strictly as a high-level multimodal analysis proxy to validate system orchestration, not as a finalized clinical model. To analyze chronological frame sequences alongside game event logs to extract high-level behavioral phenotypes.
Longitudinal Memory Service (services/mockDatabase.ts): Manages the retrieval of historical subject data, allowing for the tracking of developmental trajectories over months or years.
Clinician Dashboard (components/Dashboard.tsx): A visual interface for reviewing session results, comparing them against longitudinal baselines, and reading explainable AI outputs.
Data Flow
Stimulus: Child engages with the game engine -> Game Events (clicks, spawns) are logged.
Capture: Sensor service captures video frames at 1.5s intervals -> Buffered in RAM (Transient).
Inference: Buffered Frames + Event Log are sent to the Inference Service.
Analysis: The model estimates attention, affect, and coordination.
Destruction: Raw video frames are discarded immediately after inference. 6. Persistence: Only the structured, anonymized Analysis Result is stored.
3. Privacy & Ethics Guarantees
NeuroScreen AI is built upon a "Privacy by Design" philosophy:

No Raw Data Persistence: Video and audio streams are processed in near-real-time. Raw biometric data is never written to persistent storage (disk/database).
No Diagnostic Labels: The system is explicitly constrained to avoid medical diagnoses (e.g., "Autism", "ADHD"). It provides only phenotypic descriptions (e.g., "Low visual engagement", "Delayed motor response") to assist, not replace, clinical judgment.
Anonymization: All records are referenced by randomized Subject IDs.
Explainability: All AI outputs must include a text-based rationale ("rawExplanation") linking the score to observable behaviors.
4. Folder Structure
src/
components/
GameSession.tsx: Interactive canvas-based game and video capture logic. * Dashboard.tsx: Recharts-based visualization of patient history.
PrivacyGuard.tsx: UI component displaying active security layers.
services/
geminiService.ts: Integration with Google Gemini API for multimodal behavioral analysis.
mockDatabase.ts: Simulated encrypted backend for longitudinal records.
types.ts: TypeScript definitions for behavioral frames, game events, and clinical records.
App.tsx: Main application state machine (Landing -> Consent -> Game -> Analysis -> Dashboard).
5. How to Run
Prerequisites:
Node.js (v18+)
Google Cloud Project with Gemini API enabled.
Configuration:
Ensure the API_KEY environment variable is set to your Google GenAI API key.
Installation & Start: bash npm install npm start
Permissions:
Allow Camera access when prompted by the browser.
6. Development Roadmap
Phase 1: MVP (Current)
Single stimulus task ("Catch the Sun").
Client-side sensor simulation.
Cloud-based inference using Gemini 2.5 Flash.
Transient memory implementation.
Phase 2: Pilot Deployment
Edge AI: Integration of TensorFlow.js for local face tracking to reduce API bandwidth usage.
Multi-Modal Tasks: Addition of audio-response tasks (e.g., name call response).
Security: HIPAA-compliant backend integration for the Longitudinal Memory Service.
Phase 3: Research Deployment
Clinical Validation: Large-scale study to correlate system-derived behavioral indices with standardized clinical observational instruments (e.g., ADOS-2) for research validation

Federated Learning: Model fine-tuning mechanism that updates weights without centralizing patient data."

7. Disclaimer
NeuroScreen AI is a research and decision-support system. It is not a medical device and must not be used as a standalone diagnostic tool. All outputs require interpretation by qualified professionals within an appropriate clinical and ethical framework.