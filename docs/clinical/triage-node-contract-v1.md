# Clinical Decision Contract v1
Status: Design spec (no-code)  
Scope: Deterministic triage logic for ages 0-25 using protocol nodes 1-7  
Reference question bank: [triage-detailed-question-bank.md](/Users/oluwaferanmioyelude/Documents/Psych/docs/clinical/triage-detailed-question-bank.md)

## 1. Purpose
This document defines the exact decision contract the system must implement so that:
- decisions are deterministic and explainable
- safety override behavior is consistent
- routing does not collapse into a single generic outcome
- every decision can be audited with reason codes

## 2. Global Invariants
- Safety is always first and always override-capable.
- No LLM output can directly set risk level, pathway, or discharge.
- Mixed/unclear presentations never auto-finalize; they require clinician review.
- Highest functional impairment domain drives severity tier.
- Clinician override is allowed at every node and must require rationale.
- Every node decision writes audit metadata with timestamp and actor.

## 2.1 Threshold Encoding Standard
To avoid implementation drift, all engines must use the same numeric encoding:
- Frequency values: `Never=0`, `Rarely=1`, `Sometimes=2`, `Often=3`, `Nearly daily=4`
- Family module score: arithmetic mean of answered items for that family
- Domain sub-item score: arithmetic mean of answered impairment sub-items for domain, then linearly mapped to 0..10
- Missing-data rule: any required section with >30% unanswered items is `insufficient_data=true`
- Tie tolerance for family ranking: `delta <= 0.5` is a tie unless a tie-break rule resolves it

## 2.2 Required Tie-Break Order (Global)
When two candidates are tied at a node, resolve in this order:
1. Safety-relevant candidate wins (if clinically plausible)
2. Higher functional impairment domain linkage wins
3. Respondent-designated most impairing concern (FAM-03) wins
4. More cross-setting evidence wins (home + school/work + peer)
5. If still tied: set `mixed_unclear=true`

## 3. Canonical Inputs and Outputs
## 3.1 Canonical Input Groups
- `context`: CTX-01..CTX-14
- `safety`: SAF-01..SAF-42
- `age`: AGE-01..AGE-04
- `communication`: COM-01..COM-12
- `neurodevelopmental`: NDEV-01..NDEV-13
- `symptom_family`: FAM-01..FAM-05 + family modules (MOO/ANX/ADHD/BD/CD/ASD/TRM/EAT/SUB/PM/MIX)
- `impairment`: IMP-H, IMP-S, IMP-P, IMP-L, IMP-O
- `instrument_prep`: INS-01..INS-20

## 3.2 Canonical Output Object
- `safety_gate`: `clear | urgent | immediate`
- `age_band`: `early_childhood | school_age | adolescent | transitional_young_adult | out_of_range`
- `rater_model`: `caregiver_only | caregiver_plus_patient | patient_primary_caregiver_optional | clinician_required`
- `communication_profile`: `verbal_typical | limited_verbal | nonverbal | unknown`
- `neurodevelopmental_modifier`: `true | false`
- `primary_symptom_family`: one of the 11 protocol families
- `secondary_families`: array
- `is_mixed_unclear`: boolean
- `domain_scores`: `home, school, peer, safety_legal` in 0..10
- `severity_tier`: `mild | moderate | severe | unclear`
- `instrument_plan`: list of assignments
- `recommended_pathway`: protocol pathway enum
- `requires_clinician_review`: boolean
- `urgency_level`: `routine | priority | urgent | immediate`
- `reason_codes`: array of deterministic reason codes

## 4. Node Contracts
## 4.1 Node 1 Safety Screen Contract
### Inputs
- SAF-01..SAF-42

### Derived Flags
- `suicidal_risk_positive`: any of SAF-05..SAF-12 = yes
- `violence_risk_positive`: any of SAF-15..SAF-20 = yes
- `psychosis_mania_risk_positive`: any of SAF-21..SAF-26 = yes
- `severe_conduct_danger_positive`: SAF-29 or SAF-30 = yes
- `medical_urgency_positive`: SAF-02 or SAF-32 or SAF-33 or SAF-34 = yes
- `abuse_neglect_positive`: any of SAF-35..SAF-38 = yes
- `immediate_danger_now`: SAF-01 = yes

### Decision Logic (strict order)
1. If `immediate_danger_now` or `medical_urgency_positive`: `safety_gate = immediate`.
2. Else if any risk flag above is positive: `safety_gate = urgent`.
3. Else: `safety_gate = clear`.
4. If gate is `urgent` or `immediate`: suspend normal auto-routing.

### High-Acuity Escalation Thresholds
The following conditions force `safety_gate=immediate`:
- SAF-01 yes (immediate danger)
- SAF-09 yes (suicidal plan) or SAF-08 yes (suicidal intent)
- SAF-11 yes (attempt in past 3 months)
- SAF-17 yes (violent plan) or SAF-16 yes with SAF-18 yes (target + means)
- SAF-29 yes (fire-setting) or SAF-30 yes (weapon use/access for harm)
- SAF-21/22/23 yes with severe functional breakdown reported in safety/legal domain
- SAF-32/33/34 yes (intoxication/withdrawal/overdose medical danger)

All other safety-positive screens are `urgent` and still suspend auto-routing.

### Required Outputs
- escalation level
- suspend auto-routing boolean
- structured reason codes
- immediate action set (ED, urgent psychiatry, mandatory reporting, medical triage)

### Required Audit Events
- `safety_screen_completed`
- `safety_flagged` (if not clear)
- `auto_routing_suspended` (if not clear)

## 4.2 Node 2 Age Group Classification Contract
### Inputs
- CTX-04, AGE-01..AGE-04

### Rules
- `0-5`: `early_childhood`, caregiver-only
- `6-12`: `school_age`, caregiver-only
- `13-17`: `adolescent`, caregiver + patient reconciled
- `18-25`: `transitional_young_adult`, patient primary caregiver optional
- outside range: clinician-required

### Required Audit Events
- `age_band_assigned`

## 4.3 Node 3 Communication and Developmental Capacity Contract
### Inputs
- COM-01..COM-12

### Rules
- `limited_verbal` or `nonverbal` forces caregiver-primary reporting for symptom modules.
- known developmental delay/ID sets `developmental_capacity_adjusted = true`.
- prior autism diagnosis or active autism concern pre-signals Node 4 evaluation.

### Rater Weight Contract
- ages 0-12: caregiver weight = 1.0, patient weight = 0.0
- ages 13-17: caregiver weight = 0.5, patient weight = 0.5 (unless communication limits apply)
- ages 18-25: patient weight = 0.8, caregiver weight = 0.2 (if caregiver input exists)
- limited/nonverbal profile: caregiver weight = 1.0 regardless of age

### Required Outputs
- communication profile
- self-report enabled boolean
- caregiver weight multiplier
- adaptation requirements (language/accessibility/length)

### Required Audit Events
- `communication_profile_assigned`

## 4.4 Node 4 Neurodevelopmental/Autism Modifier Contract
### Inputs
- NDEV-01..NDEV-13 and COM-05/COM-06

### Rules
- Flag modifier true when 2 or more of NDEV-01..NDEV-08 are yes.
- Also flag true when prior autism diagnosis is yes.
- Modifier does not replace primary symptom routing; it runs in parallel.

### Required Outputs
- `neurodevelopmental_modifier = true/false`
- age-appropriate autism/developmental screen routing recommendations

### Required Audit Events
- `neurodevelopmental_modifier_set`

## 4.5 Node 5 Symptom Family Contract
### Inputs
- FAM-01..FAM-05
- family-specific modules (MOO/ANX/ADHD/BD/CD/ASD/TRM/EAT/SUB/PM)
- MIX-01..MIX-05

### Scoring Contract
- For each endorsed family, compute mean frequency across answered module items.
- Mark family as candidate if mean score >= 1.5 or explicit preselection in FAM-01.
- Use FAM-03 (most impairing concern) as first tie-break when valid.
- If top two family scores differ by <= 0.5, or MIX-01/MIX-02 is yes, set mixed/unclear.

### Family Selection Tight Thresholds
- Minimum item completeness per selected family: at least 2 answered items; otherwise `insufficient_data`
- Primary family hard threshold: top family score >= 2.0
- Secondary family threshold: score >= 1.75
- Mixed/unclear forced conditions:
- top two scores within 0.5 and both >= 2.0
- 3 or more families with scores >= 1.75 and no dominant top family (>0.75 lead)
- MIX-01 or MIX-02 yes
- insufficient family data in >1 selected family

### Conduct Escalation Thresholds
For conduct-type families, do not treat as routine externalizing if any are true:
- CD-03 yes (cruelty)
- CD-04 yes (fire-setting)
- CD-08 yes (weapon incident)
- CD-07 yes with recent serious violence history

If any above is true, force `requires_clinician_review=true` and minimum urgency `urgent`.

### Required Outputs
- `primary_symptom_family`
- `secondary_families`
- `is_mixed_unclear`

### Required Audit Events
- `symptom_family_assigned`
- `mixed_unclear_flagged` (if true)

## 4.6 Node 6 Severity and Functional Impairment Contract
### Inputs
- IMP-H, IMP-S, IMP-P, IMP-L, IMP-O

### Domain Score Contract
- Each domain score is 0..10.
- Highest domain score determines severity tier:
- `0-3`: mild
- `4-6`: moderate
- `7-10`: severe
- missing/invalid required domain: unclear

### Severity Tightening Rules
- Severe if any of:
- any domain >= 8
- safety/legal domain >= 7
- 2 or more domains >= 7
- Moderate if any of:
- highest domain in 4..7
- 2 or more domains >= 4
- Mild only if all domains <= 3 and no red-flag conduct/psychosis markers

### Trajectory Modifier
If CTX-14 indicates rapid worsening and current tier is moderate, bump urgency one level:
- moderate + rapid worsening => urgency from `priority` to `urgent`
- mild + rapid worsening does not bypass safety rules but sets mandatory follow-up window <=14 days

### Pathway Contract by Severity
- severe: urgent specialty/psychiatry pathway
- moderate: targeted screening + clinician review
- mild: PCP/community therapy monitoring
- unclear: clinician review required

### Required Audit Events
- `functional_impairment_scored`
- `severity_tier_assigned`

## 4.7 Node 7 Instrument Routing Contract
### Inputs
- age band, rater model, primary family, severity tier, neurodevelopmental modifier, safety status

### Broad Screen Rules
- 0-5: PPSC or SWYC/ASQ:SE-2 per age range
- 6-18: PSC-17 (+ SDQ optional/teacher when configured)
- 13-25: add self-report broad screen path where applicable

### Family-Specific Routing Rules
- anxiety: PAS (3-5), SCARED (8-18 child+caregiver), GAD-7 (13-25)
- mood: PHQ-A (13-17), PHQ-9 (18-25), ASQ when suicidality criteria present
- ADHD/ODD/externalizing: Vanderbilt parent + teacher (4-18), externalizing subscale logic
- autism/developmental: M-CHAT-R/F (16-30 months), SWYC POSI (16-35 months), formal referral >36 months
- substance: CRAFFT (12-25)
- eating/body image: SCOFF (13-25), ARFID workflow flag where applicable

### Override Rules
- If safety gate not clear, instrument routing does not block urgent review.
- Severe conduct danger bypasses routine battery until clinician safety confirmation.

### Required Audit Events
- `instrument_plan_generated`
- `instrument_assigned`
- `instrument_scored`

## 5. Final Disposition Synthesis Contract
## Priority Order
1. Safety gate (`immediate`/`urgent`) always wins.
2. Psychosis/mania urgent routing.
3. Severe conduct danger routing.
4. Severity tier routing.
5. Family-specific referral overrides (substance/eating/developmental).
6. Mixed/unclear forces clinician review hold.

## 5.1 Route Diversification Contract
To prevent clinically distinct moderate cases from collapsing into one generic output, decision output must include:
- `recommended_pathway` (coarse)
- `specialty_track` (fine-grained), one of:
- `mood_anxiety_track`
- `adhd_externalizing_track`
- `conduct_high_risk_track`
- `trauma_track`
- `developmental_autism_track`
- `substance_track`
- `eating_track`
- `psychosis_mania_track`
- `mixed_unclear_track`

Moderate cases may share the same coarse pathway but must differ by `specialty_track` and reason codes.

## 5.2 Mandatory Reason-Code Minimums
Each final decision must include at least:
- 1 safety status code
- 1 family selection code
- 1 severity code
- 1 routing code

Example minimum set:
- `SAFETY_CLEAR`
- `PRIMARY_FAMILY_ANXIETY`
- `SEVERITY_MODERATE`
- `ROUTE_TARGETED_SCREENING`

## Disposition Output Set
- `immediate_urgent_review`
- `urgent_specialty_psychiatry`
- `targeted_screening_and_clinician_review`
- `pcp_therapy_monitoring`
- `developmental_evaluation_referral`
- `substance_use_counseling_referral`
- `eating_disorder_referral`
- `clinician_review_required`

## 6. Gemini Usage Boundaries (Hard Policy)
## Allowed
- summarize structured intake for clinician handoff
- generate patient-friendly explanation text from deterministic outputs
- detect contradictions or missing fields and request clarification

## Not Allowed
- set risk flags
- set severity tier
- choose final pathway
- interpret safety disposition autonomously
- override clinician decisions

## 7. Minimum Persistence Contract
The system must persist:
- raw question responses by node and question ID
- derived flags and scores
- final decision output with reason codes
- actor and timestamp for every state transition
- override rationale and before/after decision snapshot

## 8. Conformance Test Contract (next implementation phase)
- A protocol conformance matrix test must validate each node against fixtures.
- Negative tests must verify safety override suspension behavior.
- Mixed/unclear fixtures must always produce clinician review requirement.
- Snapshot tests must verify reason-code determinism.

## 8.1 Threshold Calibration and Drift Guards
- Add a fixed fixture suite for threshold boundaries (`n-1`, `n`, `n+1` around each cutoff).
- Add route-diversification tests: moderate fixtures across at least 6 families must produce distinct `specialty_track` outputs.
- Add red-flag conduct tests proving immediate/urgent escalation behavior.
- Add missing-data tests proving `insufficient_data` routes to clinician review.

## 8.2 Release Gate Metrics (Deterministic)
- Safety-positive false negative tolerance: 0 in fixture suite.
- Mixed/unclear false auto-route tolerance: 0 in fixture suite.
- Non-safety pathway collapse guard: no single non-safety coarse pathway >70% in synthetic stratified validation cohort.

## 9. Current Gap Statement (for implementation planning)
- Current backend is deterministic but only partial vs this full contract.
- Current frontend captures richer data, but only part is currently consumed by decisioning.
- Next code phase should implement this contract exactly, then lock with conformance tests.
