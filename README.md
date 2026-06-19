# MedBridge AI

MedBridge AI is a community health navigator that helps people make sense of symptoms, patient history, and local health signals in one place. Instead of leaving a user to guess, it turns fragmented information into a clear risk assessment, a doctor-ready briefing, and a simple next step.

It was built for the Microsoft Agents League Hackathon to show how reasoning agents can do more than answer a prompt. They can coordinate multiple sources of context, stay cautious, and produce something genuinely useful for real people.

## Why It Matters

Health questions are usually messy. A person may have symptoms, an old diagnosis, medications, allergies, and a local outbreak happening nearby, but none of that is visible in a single conversation. MedBridge AI brings those signals together so the response is more grounded, more useful, and easier to act on.

That makes it valuable for:

- People who want fast triage guidance without a wall of medical jargon.
- Clinicians who need a compact summary before a visit.
- Hackathon reviewers who want to see a practical agent with real reasoning, not just a chatbot wrapper.
- Teams evaluating how Microsoft Foundry can support multi-layer agent workflows.

## What MedBridge AI Does

MedBridge AI combines three reasoning layers:

- Foundry IQ: grounds symptom interpretation with cautious, cited medical guidance.
- Work IQ: recalls patient history such as prior visits, diagnoses, medications, allergies, and upcoming appointments.
- Fabric IQ: adds community health context such as outbreak signals and clinic proximity.

From those layers, the app produces:

- A risk level: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- An emergency flag when danger signs appear.
- A short reasoning trace that shows how the result was formed.
- A doctor briefing that is easy to hand off.
- Citations so reviewers can verify where the medical language came from.

## What Makes It Useful

MedBridge AI is designed to be useful in the real world, not just impressive in a demo:

- It reduces confusion by turning symptom noise into a structured assessment.
- It helps users know when something may need urgent care.
- It gives doctors a cleaner starting point and avoids repeated intake questions.
- It shows how regional health trends can influence the interpretation of symptoms.
- It keeps the language cautious and always frames medical output as guidance, not diagnosis.

## Demo Highlights

The public demo is built to be visually clear and easy to judge:

- A real entry gate with `Sign in`, `Create account`, and `Judge pass` modes.
- Scenario buttons for `Low`, `Outbreak`, and `Emergency`.
- A large risk card with a visible emergency flag when needed.
- A parallel IQ panel that shows the three information layers side by side.
- A Work IQ timeline with patient context.
- A Fabric IQ panel with regional signal and clinic context.
- A doctor briefing panel that reads like a handoff note.
- A reasoning trace that makes the agent’s thought process easy to inspect.

## For Reviewers

If you are analyzing the project, these are the main things to look at:

- The agent is built around parallel reasoning, not one long prompt.
- The output is structured for usefulness, not just conversation.
- The safety posture is explicit: MedBridge AI does not diagnose and always recommends a licensed medical professional.
- The frontend is intentionally polished so the story is easy to understand in under a minute.
- The backend is Foundry-ready, while the public demo stays quota-safe so the project remains accessible.
- If the live API is unavailable, the frontend falls back to the local deterministic triage engine so the demo still works.

## How To Enter

- New users can create a browser-local account with email and password.
- Returning users can sign in with the same email and password.
- Judges can use the free-entry pass to get straight to the dashboard without a password.
- The demo session stays in the browser, which keeps the hackathon flow fast and repeatable.

## Live Demo

Public app: https://frontend-anandh0us-projects.vercel.app

GitHub repository: https://github.com/anandh0u/medbridge-ai

## Tech Stack

- Python 3.13
- FastAPI
- Microsoft Foundry Agent Service
- `azure-ai-projects`
- `azure-identity`
- React
- Vite
- TypeScript

## Environment

- `VITE_MEDBRIDGE_API_URL` points the frontend to the live triage API when it is available.
- `VITE_MEDBRIDGE_JUDGE_PASS` sets the shared judge pass for the free-entry mode.

## Safety

MedBridge AI is a community health navigator, not a diagnostic system. It uses cautious language such as “this may indicate” and always recommends consulting a licensed medical professional.
