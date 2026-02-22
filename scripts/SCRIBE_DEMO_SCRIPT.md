# Scribe Demo Script

Use this script when demonstrating the Scribe feature. It tells you exactly what to say and do for a smooth demo.

---

## Before You Start

1. **Start backend:** `cd aidcare-backend && uvicorn main:app --reload --port 8000`
2. **Start frontend:** `cd aidcare-copilot && npm run dev`
3. **Open:** http://localhost:3000
4. **Log in:** chioma@lasuth.ng / demo1234
5. **Start a shift:** Dashboard → **Start shift** (if not already active)
6. **Allow microphone** when the browser prompts

---

## Demo Flow Overview

1. Go to **Scribe** (or Patients → **New Consultation**)
2. Select a patient
3. Click the **red microphone** to record
4. Speak the consultation (doctor + patient dialogue)
5. Click **Stop** when done
6. **Check:** Transcript and SOAP note appear

---

## Scenario A: English Consultation (Pneumonia)

**Best for:** First demo, shows full SOAP structure.

### What to Say (in order)

| Speaker | Phrase |
|---------|--------|
| **Doctor** | "Good morning. What brings you in today?" |
| *Pause 1–2 seconds* | |
| **Patient** | "I have had a cough and fever for three days. My chest hurts when I cough." |
| **Doctor** | "Any difficulty breathing? Are you on any medications?" |
| **Patient** | "A little short of breath. I take amoxicillin from the pharmacy." |
| **Doctor** | "I'll listen to your chest. Breathe in and out. I hear some crackles on the right. I'm assessing right lower lobe pneumonia. We'll start you on Co-amoxiclav and paracetamol. Return in 48 hours if no improvement." |

### After Recording

- **Check:** Transcript appears with DR/PT labels
- **Check:** SOAP sections fill in:
  - **Subjective:** Chief complaint, history
  - **Objective:** Examination findings (crackles)
  - **Assessment:** Diagnosis (pneumonia)
  - **Plan:** Medications, follow-up

---

## Scenario B: Short Consultation (URTI)

**Best for:** Quick demo when time is limited.

### What to Say

1. **Doctor:** "Good morning. What brings you in today?"
2. **Patient:** "I have a sore throat and runny nose for two days."
3. **Doctor:** "I'm assessing upper respiratory tract infection. I'll prescribe paracetamol and advise rest. Drink plenty fluids."

### After Recording

- **Check:** SOAP note shows URTI assessment and plan

---

## Scenario C: Pidgin / Mixed Language

**Best for:** Showing multilingual support.

### What to Say

1. **Doctor:** "How far, wetin dey do you?"
2. **Patient:** "Belle dey pain me and head dey bang me since yesterday."
3. **Doctor:** "Body dey pain you for where? Belle dey run you?"
4. **Patient:** "Yes, I no fit sleep."
5. **Doctor:** "Okay, I go give you medicine. Make you drink plenty water."
6. **Say (as doctor):** "I'm assessing gastroenteritis. Prescribe ORS and paracetamol."

### After Recording

- **Check:** "Pidgin Detected" badge appears
- **Check:** SOAP note is generated

---

## Scenario D: With Medication Changes

**Best for:** Showing flags and medication tracking.

### What to Say

1. **Doctor:** "What medications are you currently on?"
2. **Patient:** "I take amoxicillin from the pharmacy."
3. **Doctor:** "I'm stopping the amoxicillin and starting Co-amoxiclav. Also add paracetamol for fever."
4. **Patient:** "Okay doctor."
5. **Doctor:** "Return in 48 hours if no improvement."

### After Recording

- **Check:** Medication changes appear in the SOAP/consultation

---

## Quick Reference: Phrases to Say

| Scenario | Doctor phrase | Patient phrase |
|----------|----------------|----------------|
| **Opening** | "Good morning. What brings you in today?" | "I have a cough and fever." |
| **History** | "Any difficulty breathing? Are you on any medications?" | "A little short of breath. I take amoxicillin." |
| **Examination** | "I'll listen to your chest. Breathe in and out. I hear crackles on the right." | — |
| **Assessment** | "I'm assessing right lower lobe pneumonia." | — |
| **Plan** | "We'll start you on Co-amoxiclav and paracetamol. Return in 48 hours." | — |
| **Pidgin** | "Wetin dey do you? … I go give you medicine." | "Belle dey pain me. I no fit sleep." |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No mic permission | Allow microphone in browser and refresh |
| "No patient selected" | Click **Select a patient** and choose from list |
| No active shift | Dashboard → **Start shift** |
| Transcript empty | Speak clearly, close to mic; check backend logs |
| SOAP not filling | Wait 10–30 seconds; processing uses AI |

---

## Demo Order (Scribe-Only)

1. **Login** → Dashboard → **Start shift**
2. **Scribe** → Select patient (e.g. Tunde Bakare)
3. **Record** → Scenario A (English pneumonia)
4. **Stop** → Verify transcript and SOAP
5. **Optional:** Scenario C (Pidgin) for multilingual demo

---

## Tips for a Smooth Demo

- **Speak clearly** and pause between doctor/patient turns
- **Keep each phrase 5–15 seconds** — avoid very long monologues
- **Include a diagnosis** — e.g. "I'm assessing pneumonia" — so the SOAP Assessment fills
- **Include a plan** — e.g. "Prescribe paracetamol" — so the SOAP Plan fills
- **Test once** before the actual demo to confirm mic and backend work
