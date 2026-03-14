# Hackathon MVP Spec: Family Self-Service Mental Health Specialist Referral
Status: Design spec (no-code)  
Audience: Hackathon build team  
Date: March 14, 2026

## 1. Product Goal
Build a simple family-facing assistant that recommends the right child/adolescent mental health specialist type on the first try, then generates a downloadable referral PDF families can use to book the correct appointment.

## 2. Core Principle
No clinician-in-the-loop in the product workflow.

## 3. In Scope (MVP)
1. Family/caregiver intake form.
2. Deterministic rule-based routing to specialty type.
3. Urgency classification (`routine`, `priority`, `urgent`, `immediate`).
4. Plain-language recommendation screen.
5. Downloadable PDF referral summary.
6. Safety escalation screen for crisis-positive responses.

## 4. Out of Scope (MVP)
1. Provider dashboard, queue, or clinician override.
2. Doctor/referrer-facing workflows.
3. EHR integration.
4. In-app appointment booking integrations.
5. AI/LLM-based decision making for final routing.

## 5. User Journey (Single Session)
1. Family starts intake.
2. Completes demographics, safety, symptoms, and functioning.
3. System runs deterministic triage rules.
4. If safety-positive immediate risk: show emergency instructions and stop routine routing.
5. Otherwise show:
   - primary specialist type
   - urgency
   - optional secondary specialist type
   - rationale summary
6. Family downloads referral PDF.
7. Family uses PDF to book with the recommended specialist.

## 6. Safety Guardrails (Must Have)
1. If immediate danger is flagged:
   - show `Call 911 now` (US context)
   - show `Call or text 988` for mental health crisis support
   - stop normal referral output
2. If urgent risk is flagged (but not immediate):
   - show urgent same-day/24h recommendation
   - set urgency to `urgent`
   - still produce PDF with urgent labeling
3. Add legal disclaimer on every result page and PDF:
   - “This tool does not provide diagnosis or emergency care.”

## 7. Canonical Inputs (MVP Data Contract)
1. `patient`
   - first name, last name, DOB, age band, sex at birth (optional)
2. `respondent`
   - caregiver relationship, contact info
3. `safety`
   - suicidal thoughts/plan/attempt
   - violence intent/plan/means
   - psychosis/mania danger signs
   - immediate danger now
4. `symptoms`
   - selected families (multi-select)
   - family-specific frequency items (0-4 scale)
5. `functional_impact`
   - home (0-10)
   - school/work (0-10)
   - peer/social (0-10)
   - safety/legal (0-10)
   - rapid worsening (yes/no)
6. `modifiers`
   - communication profile (`verbal_typical`, `limited_verbal`, `nonverbal`, `unknown`)
   - developmental/autism concern (yes/no)

## 8. MVP Question Set (Lean, Family-Friendly)
Use short sections with progress bar and plain language.

1. Section A: About child
   - age, school grade, caregiver relationship
2. Section B: Safety now (required first)
   - immediate danger
   - suicide/self-harm risk signals
   - harm-to-others risk signals
   - severe psychosis/mania signals
3. Section C: Main concerns
   - “Choose top concerns” from symptom families
   - “Which concern causes most problems right now?”
4. Section D: Symptom details (dynamic)
   - 3 to 6 frequency questions for selected families
5. Section E: Daily functioning
   - home, school, social, safety/legal domain impact scores
6. Section F: Final checks
   - rapid worsening
   - optional notes for referral PDF

## 9. Provider Taxonomy (MVP Target Outputs)
1. Child & Adolescent Psychiatrist
2. Pediatric Psychologist
3. Child Therapist/Counselor (LCSW/LMFT/LPC)
4. Developmental-Behavioral Pediatrician
5. Neuropsychologist
6. Autism/Neurodevelopment Specialist Team
7. Trauma-Focused Therapist
8. Eating Disorder Specialist Team
9. Adolescent Substance Use Program
10. Occupational Therapist (OT)
11. Speech-Language Pathologist (SLP)

## 10. Symptom Families (Routing Inputs)
1. Mood/Depression/Irritability
2. Anxiety/Worry/Panic/OCD-like
3. ADHD/Inattention/Hyperactivity/Impulsivity
4. Behavioral Dysregulation/Defiance/Aggression
5. Conduct-Type Behaviors (high-risk acts)
6. Autism/Developmental/Social Communication
7. Trauma/Stress-Related
8. Eating/Body Image
9. Substance Use
10. Psychosis/Mania-Like
11. Mixed/Unclear

## 11. Deterministic Routing Logic (MVP)
Order of operations is fixed.

1. Step 1: Safety gate
   - `immediate` if immediate danger, suicidal plan/intent, recent attempt, violent plan+means, severe psychosis disorganization, severe overdose/withdrawal
   - `urgent` if safety-positive but not immediate
   - `clear` otherwise
2. Step 2: Primary symptom family
   - choose highest scoring family
   - if tie or incomplete: `mixed_unclear`
3. Step 3: Severity tier from functional impact
   - `mild`: all domains <= 3
   - `moderate`: highest domain 4 to 6
   - `severe`: any domain >= 7
4. Step 4: Apply modifiers
   - developmental/autism concern can shift recommendation toward developmental/autism specialties
   - rapid worsening bumps urgency one level
5. Step 5: Output primary specialist + urgency

## 12. Routing Table (MVP)
1. `safety = immediate` -> Emergency care + urgent child psychiatry (`immediate`)
2. `safety = urgent` -> Child & adolescent psychiatrist (`urgent`)
3. `psychosis/mania` -> Child & adolescent psychiatrist (`urgent`)
4. `conduct high-risk` -> Child & adolescent psychiatrist (`urgent`)
5. `eating` -> Eating disorder specialist team (`priority` or `urgent` if severe)
6. `substance use` -> Adolescent substance use program (`priority` or `urgent` if severe)
7. `autism/developmental` -> Developmental-behavioral pediatrician or autism specialist team (`routine` to `priority`)
8. `trauma` -> Trauma-focused therapist (`priority` if moderate/severe)
9. `mood/anxiety`
   - mild -> Child therapist/counselor (`routine`)
   - moderate -> Pediatric psychologist (`priority`)
   - severe -> Child psychiatrist + therapist (`urgent`)
10. `ADHD/externalizing`
   - mild/moderate -> Pediatric psychologist or child therapist (`routine` or `priority`)
   - severe -> Child psychiatrist or developmental specialist (`priority`/`urgent`)
11. `mixed/unclear` -> Pediatric psychologist comprehensive evaluation (`priority`)

## 13. Result Object (What UI and PDF Need)
1. `recommended_specialist_primary`
2. `recommended_specialist_secondary` (optional)
3. `urgency_level`
4. `reason_codes` (deterministic)
5. `plain_language_why`
6. `next_steps`
7. `safety_instructions` (if any)
8. `generated_at`

## 14. Referral PDF Template (MVP)
Sections:

1. Header
   - App name, report ID, generated timestamp
2. Child and caregiver info
3. Presenting concerns summary
4. Safety summary
   - risk level
   - flagged items
5. Recommended referral
   - primary specialist type
   - urgency target window
   - optional secondary referral
6. Deterministic rationale
   - top concern family
   - functional impact profile
   - reason codes in plain English
7. Booking handoff text
   - short script family can read when calling clinics
8. Disclaimer
   - not diagnostic
   - not emergency service
   - emergency contacts (911, 988)

## 15. UX Structure (Hackathon-Safe)
1. `/start` -> intro + disclaimer
2. `/intake` -> one continuous form with section anchors
3. `/result` -> recommendation + urgency + download PDF
4. `/safety` -> emergency instructions (blocking page when immediate danger)

## 16. MVP Success Metrics
1. User can finish intake in under 8 minutes.
2. 100% of completed intakes return deterministic output.
3. 100% of outputs can generate a PDF.
4. Safety-positive sessions always bypass routine referral guidance.
5. Families report recommendation clarity >= 4/5 in demo feedback.

## 17. Demo Script (Hackathon)
1. Complete a moderate anxiety case -> recommend pediatric psychologist/therapist, `priority`.
2. Complete autism/developmental case -> recommend developmental/autism specialist, `priority`.
3. Complete acute safety case -> show safety escalation page, no routine referral, urgent crisis instructions.
4. Download PDF for each scenario.

## 18. Implementation Notes for Next Step
1. Reuse existing deterministic rules engine patterns.
2. Remove clinician review dependencies from the MVP runtime path.
3. Keep audit-friendly reason codes for explainability.
4. Keep storage minimal and privacy-first for hackathon environment.
