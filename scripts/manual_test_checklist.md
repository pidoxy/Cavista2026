# AidCare Manual Testing Checklist

Use this checklist to test the frontend and key user flows. Check each item as you complete it.

---

## Prerequisites

- [ ] Backend running: `cd aidcare-backend && uvicorn main:app --reload`
- [ ] Frontend running: `cd aidcare-copilot && npm run dev`
- [ ] Database seeded: `cd aidcare-backend && python seed_demo.py`
- [ ] Login: `chioma@lasuth.ng` / `demo1234`

---

## 1. Login & Auth

- [ ] Open http://localhost:3000/login
- [ ] Sign in with chioma@lasuth.ng / demo1234
- [ ] Redirects to dashboard
- [ ] Header shows user name and avatar
- [ ] Sign out (if available) and sign back in
- [ ] Try invalid password → shows error
- [ ] Try register tab → form works, can create account

---

## 2. Dashboard

- [ ] Dashboard loads
- [ ] "Patients in Ward" shows a number (or 0)
- [ ] "Shift Status" shows Active or No active shift
- [ ] "Start shift" button works when no shift
- [ ] All 4 cards (Triage, Scribe, Patients, Handover) are clickable
- [ ] Navigation links work

---

## 3. Patients Page

- [ ] Navigate to /patients
- [ ] Patient list appears in left sidebar (or "No patients found")
- [ ] Click a patient → detail loads (header, vitals, AI summary, SOAP history)
- [ ] AI-Summarized History loads (or "Analyzing...")
- [ ] Search in SOAP notes works
- [ ] "New Consultation" button goes to Scribe with patient pre-selected

---

## 4. Scribe Page

- [ ] Navigate to /scribe (no patient)
- [ ] Shows "No patient selected" and "Select a patient"
- [ ] Click "Select a patient" → modal with patient list
- [ ] Select a patient → patient info loads in left panel
- [ ] Or go from Patients → "New Consultation" → patient pre-selected
- [ ] Click mic → recording starts (browser may ask permission)
- [ ] Click stop → processing spinner → transcript and SOAP appear
- [ ] SOAP sections (S, O, A, P) show content
- [ ] "Change patient" works
- [ ] Language dropdown works (English, Pidgin, Hausa, etc.)

---

## 5. Triage Page

- [ ] Navigate to /triage
- [ ] Language selection shows (English, Hausa, Yoruba, Igbo, Pidgin)
- [ ] Select a language → conversation starts, AI greeting appears
- [ ] Type a message and Send → AI responds
- [ ] Add staff note (e.g. "BP 120/80") → appears in chat
- [ ] Click "Complete Assessment" → results screen
- [ ] Results show: urgency, risk level, symptoms, recommended actions
- [ ] "Assign to Patient Record" → patient picker modal
- [ ] Select patient → assigns (modal closes)
- [ ] "New Triage" resets flow
- [ ] Mic button: record → stop → processes (if supported)

---

## 6. Handover Page

- [ ] Navigate to /handover
- [ ] If no shift: shows "You need an active shift"
- [ ] If shift active: "Generate Report" button visible
- [ ] Click Generate → report loads
- [ ] Report shows: critical, stable, discharged sections
- [ ] Print button works
- [ ] Back to Dashboard works

---

## 7. Cross-Browser / Responsive

- [ ] Test in Chrome
- [ ] Test in Safari or Firefox (if available)
- [ ] Resize window → layout adapts
- [ ] Mobile view (narrow) → no broken layout

---

## 8. Error Handling

- [ ] Stop backend → frontend shows errors (e.g. "Something went wrong")
- [ ] Invalid API URL in .env → requests fail gracefully
- [ ] 401 (expired token) → redirects to login

---

## Notes for Tester

Record any bugs or odd behavior here:

| Page / Flow | Issue |
|-------------|-------|
|             |       |
|             |       |
