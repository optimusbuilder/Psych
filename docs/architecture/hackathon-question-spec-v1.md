# Question Spec v1 + Routing Mapping (No-Code Design)
Status: Design artifact (pre-implementation)  
Date: March 14, 2026  
Source question bank: `/Users/oluwaferanmioyelude/Downloads/ChildPsych_Triage_QuestionBank.docx`

## 1) Purpose
Define:
1. Canonical JSON schema for question definitions and responses.
2. Deterministic mapping from each question ID to derived facts used by routing.
3. How Node 1-6 drive final specialist/urgency and Node 7 drives instrument recommendations.

## 2) Canonical Derived Facts (Target State Object)
```json
{
  "safety": {
    "any_positive_or_ambiguous": false,
    "suicidal_risk_positive": false,
    "self_harm_positive": false,
    "homicidal_risk_positive": false,
    "psychosis_mania_positive": false,
    "severe_aggression_positive": false,
    "fire_setting_positive": false,
    "weapon_threat_positive": false,
    "asq": {
      "required": false,
      "q1_positive": false,
      "q2_positive": false,
      "q3_positive": false,
      "q4_positive": false,
      "q5_positive": false,
      "high_risk_decline": false
    },
    "safety_gate": "clear"
  },
  "age": {
    "dob": null,
    "age_years": null,
    "age_band": "out_of_range",
    "rater_model": "clinician_review_required",
    "caregiver_available_for_collateral": null
  },
  "communication": {
    "self_report_enabled": true,
    "communication_profile": "unknown",
    "developmental_delay_or_id": false,
    "autism_known_or_suspected": false
  },
  "neurodevelopmental": {
    "criteria_count": 0,
    "criteria_flags": {},
    "modifier_active": false
  },
  "symptom": {
    "family_scores": {},
    "primary_family": "mixed_unclear",
    "secondary_families": [],
    "mixed_unclear": false,
    "cross_setting_adhd": false,
    "school_refusal_signal": false,
    "conduct_high_risk_signal": false
  },
  "impairment": {
    "home": null,
    "school_work": null,
    "peer_social": null,
    "safety_legal": null,
    "highest_domain": null,
    "severity_tier": "unclear"
  },
  "instruments": {
    "consent_caregiver": null,
    "consent_patient": null,
    "teacher_form_available": null,
    "recommended_pack": []
  }
}
```

## 3) Question Spec JSON Schema (Catalog Rows)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "QuestionSpecV1",
  "type": "object",
  "required": [
    "id",
    "node",
    "label",
    "prompt",
    "askWhen",
    "raters",
    "responseType",
    "required",
    "derive"
  ],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^(ASQ-[1-5]|[1-7][A-Z]?\\.[0-9]+|5\\.0)$"
    },
    "node": {
      "type": "integer",
      "minimum": 1,
      "maximum": 7
    },
    "label": { "type": "string" },
    "prompt": { "type": "string" },
    "askWhen": {
      "type": "object",
      "required": ["ageBands"],
      "properties": {
        "ageBands": {
          "type": "array",
          "items": {
            "enum": [
              "all",
              "0-5",
              "6-12",
              "13-17",
              "18-25",
              "12+",
              "13+",
              "16-30m",
              "school-age+"
            ]
          }
        },
        "conditionalOn": { "type": "string" }
      }
    },
    "raters": {
      "type": "array",
      "items": { "enum": ["CG", "PT", "CG+PT"] }
    },
    "responseType": {
      "enum": [
        "ack",
        "yes_no",
        "yes_no_unclear",
        "open_text",
        "mild_mod_severe",
        "date_or_age",
        "confirm"
      ]
    },
    "required": { "type": "boolean" },
    "branch": {
      "type": "object",
      "properties": {
        "askIf": { "type": "string" },
        "skipIf": { "type": "string" }
      }
    },
    "derive": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["target", "action"],
        "properties": {
          "target": { "type": "string" },
          "action": {
            "enum": ["set_true_if_yes", "set_if_value", "increment_if_yes", "append_text", "trigger"]
          },
          "value": {}
        }
      }
    }
  }
}
```

## 4) Response Event Schema (Saved Per Answer)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "QuestionResponseEventV1",
  "type": "object",
  "required": [
    "sessionId",
    "questionId",
    "node",
    "rater",
    "answer",
    "answeredAt"
  ],
  "properties": {
    "sessionId": { "type": "string" },
    "questionId": { "type": "string" },
    "node": { "type": "integer" },
    "rater": { "enum": ["CG", "PT"] },
    "answer": {
      "oneOf": [
        { "type": "object", "required": ["kind", "value"], "properties": { "kind": { "const": "yes_no" }, "value": { "enum": ["yes", "no", "unclear", "declined"] } } },
        { "type": "object", "required": ["kind", "value"], "properties": { "kind": { "const": "open_text" }, "value": { "type": "string" } } },
        { "type": "object", "required": ["kind", "value"], "properties": { "kind": { "const": "mild_mod_severe" }, "value": { "enum": ["mild", "moderate", "severe"] } } },
        { "type": "object", "required": ["kind", "value"], "properties": { "kind": { "const": "date_or_age" }, "value": { "type": "string" } } },
        { "type": "object", "required": ["kind", "value"], "properties": { "kind": { "const": "ack" }, "value": { "type": "string" } } }
      ]
    },
    "answeredAt": { "type": "string", "format": "date-time" },
    "meta": {
      "type": "object",
      "properties": {
        "ambiguous": { "type": "boolean" },
        "source": { "enum": ["manual", "ai-assisted"] }
      }
    }
  }
}
```

## 5) Deterministic Safety Policy (Locked)
1. Any Node 1 positive or ambiguous answer sets `safety.any_positive_or_ambiguous=true`.
2. `safety_gate=immediate` for high-acuity conditions (plan/intent/current danger/recent attempt/weapon/fire-setting/ASQ-5 yes/high-risk declines).
3. `safety_gate=urgent` for other safety-positive findings.
4. `safety_gate=clear` only when all required Node 1 items are negative without ambiguity.

## 6) Mapping Table (Question ID -> Derived Facts)
Columns:
1. `Question ID`
2. `Derived Fact(s) Written`
3. `Deterministic Rule / Routing Effect`

### Node 1
| Question ID | Derived Fact(s) Written | Deterministic Rule / Routing Effect |
|---|---|---|
| `1A.1` | `meta.safety_intro_delivered=true` | No routing change. |
| `1B.1` | `safety.suicidal_risk_positive`, `safety.self_harm_positive` | `yes/unclear -> any_positive_or_ambiguous=true`; if age>=8, `asq.required=true`. |
| `1B.2` | `safety.suicidal_risk_positive`, `safety.self_harm_positive` | `yes/unclear -> any_positive_or_ambiguous=true`; `asq.required=true`. |
| `1B.3` | `safety.suicide_attempt_history=true` | `yes -> any_positive_or_ambiguous=true`; if age>=8, `asq.required=true`. |
| `1B.4` | `safety.suicide_attempt_history=true` | `yes -> any_positive_or_ambiguous=true`; `asq.required=true`. |
| `1C.1` | `safety.homicidal_risk_positive=true` | `yes/unclear -> any_positive_or_ambiguous=true`; minimum gate `urgent`. |
| `1C.2` | `safety.homicidal_risk_positive=true` | `yes/unclear -> any_positive_or_ambiguous=true`; minimum gate `urgent`. |
| `1C.3` | `safety.identified_target=true` | `yes -> any_positive_or_ambiguous=true`; minimum gate `urgent`. |
| `1D.1` | `safety.psychosis_mania_positive=true` | `yes/unclear -> any_positive_or_ambiguous=true`; minimum gate `urgent`. |
| `1D.2` | `safety.psychosis_mania_positive=true` | `yes/unclear -> any_positive_or_ambiguous=true`; minimum gate `urgent`. |
| `1D.3` | `safety.psychosis_mania_positive=true` | `yes/unclear -> any_positive_or_ambiguous=true`; minimum gate `urgent`. |
| `1D.4` | `safety.psychosis_mania_positive=true` | `yes/unclear -> any_positive_or_ambiguous=true`; minimum gate `urgent`. |
| `1E.1` | `safety.severe_aggression_positive=true` | `yes -> safety_gate=immediate` (crisis/ED path). |
| `1E.2` | `safety.fire_setting_positive=true` | `yes -> minimum gate urgent`; if recent/active intent metadata exists -> immediate. |
| `1E.3` | `safety.weapon_threat_positive=true` | `yes -> safety_gate=immediate`. |
| `ASQ-1` | `safety.asq.q1_positive=true` | `yes -> minimum gate urgent`; marks immediate clinician review requirement. |
| `ASQ-2` | `safety.asq.q2_positive=true` | `yes -> minimum gate urgent`; marks immediate clinician review requirement. |
| `ASQ-3` | `safety.asq.q3_positive=true` | `yes/declined -> safety_gate=immediate`. |
| `ASQ-4` | `safety.asq.q4_positive=true` | `yes -> force ask ASQ-5`; minimum gate urgent. |
| `ASQ-5` | `safety.asq.q5_positive=true` | `yes/declined -> safety_gate=immediate` highest urgency. |

### Node 2
| Question ID | Derived Fact(s) Written | Deterministic Rule / Routing Effect |
|---|---|---|
| `2.1` | `age.dob`, `age.age_years`, `age.age_band`, `age.rater_model` | Age band assignment: `0-5`, `6-12`, `13-17`, `18-25`, `out_of_range`. |
| `2.2` | `age.caregiver_available_for_collateral` | If `18-25` and caregiver unavailable -> patient-only collateral model. |

### Node 3
| Question ID | Derived Fact(s) Written | Deterministic Rule / Routing Effect |
|---|---|---|
| `3.1` | `communication.communication_profile`, `communication.self_report_enabled` | `no -> caregiver-only; profile=limited/nonverbal`. |
| `3.2` | `communication.communication_profile`, `communication.self_report_enabled` | `yes -> caregiver-only adaptation`. |
| `3.3` | `communication.developmental_delay_or_id=true` | Activates developmental accommodation; supports Node 4 modifier. |
| `3.4` | `communication.autism_known_or_suspected=true` | Pre-activates neurodevelopmental pathway. |
| `3.5` | `communication.self_report_enabled` | PT decline reduces/turns off self-report routing. |

### Node 4
| Question ID | Derived Fact(s) Written | Deterministic Rule / Routing Effect |
|---|---|---|
| `4.1` | `neurodevelopmental.criteria_flags.sensory=true` | `yes -> criteria_count +1`. |
| `4.2` | `neurodevelopmental.criteria_flags.transition_distress=true` | `yes -> criteria_count +1`. |
| `4.3` | `neurodevelopmental.criteria_flags.repetitive_behavior=true` | `yes -> criteria_count +1`. |
| `4.4` | `neurodevelopmental.criteria_flags.restricted_interests=true` | `yes -> criteria_count +1`. |
| `4.5` | `neurodevelopmental.criteria_flags.social_communication=true` | `yes -> criteria_count +1`. |
| `4.6` | `neurodevelopmental.criteria_flags.mchat_joint_attention=false_if_no` | `no -> criteria_count +1`; toddler-specific autism signal. |
| `4.7` | `neurodevelopmental.criteria_flags.mchat_point_following=false_if_no` | `no -> criteria_count +1`; toddler-specific autism signal. |

Rule after Node 4:
1. If `criteria_count >= 2` OR `communication.autism_known_or_suspected=true`, set `neurodevelopmental.modifier_active=true`.
2. Modifier runs in parallel; it does not erase primary symptom-family routing.

### Node 5
| Question ID | Derived Fact(s) Written | Deterministic Rule / Routing Effect |
|---|---|---|
| `5.0` | `symptom.presenting_concern_raw` | Alias placeholder; treated as `5A.1` if encountered. |
| `5A.1` | `symptom.presenting_concern_cg_text` | Narrative only; can influence screening order. |
| `5A.2` | `symptom.presenting_concern_pt_text` | Narrative only; disagreement with CG sets reconciliation flag. |
| `5B.1` | `symptom.family_scores.mood += 1` | Mood evidence. |
| `5B.2` | `symptom.family_scores.mood += 1` | Mood evidence (irritability profile). |
| `5B.3` | `symptom.family_scores.mood += 1` | Mood evidence (anhedonia). |
| `5B.4` | `symptom.family_scores.mood += 1` (if positive language) | Open-text coded deterministically by rubric. |
| `5C.1` | `symptom.family_scores.anxiety += 1` | Anxiety evidence. |
| `5C.2` | `symptom.family_scores.anxiety += 1` | Anxiety somatic evidence. |
| `5C.3` | `symptom.family_scores.anxiety += 1`, `symptom.school_refusal_signal` | Avoidance; school refusal flag when school-specific. |
| `5C.4` | `symptom.family_scores.anxiety += 1` | OCD-like evidence. |
| `5C.5` | `symptom.family_scores.anxiety += 1` (if positive language) | PT narrative signal. |
| `5D.1` | `symptom.family_scores.adhd += 1` | ADHD inattentive evidence. |
| `5D.2` | `symptom.family_scores.adhd += 1` | Hyperactivity evidence. |
| `5D.3` | `symptom.family_scores.adhd += 1` | Impulsivity evidence. |
| `5D.4` | `symptom.cross_setting_adhd=true` | Cross-setting evidence for ADHD pathway confidence. |
| `5E.1` | `symptom.family_scores.behavioral_dysreg += 1` | Dysregulation evidence. |
| `5E.2` | `symptom.family_scores.behavioral_dysreg += 1` | ODD/defiance evidence. |
| `5E.3` | `symptom.family_scores.behavioral_dysreg += 1` | Aggression evidence; severity handled in Node 6/Node 1. |
| `5F.1` | `symptom.family_scores.conduct += 1` | Conduct evidence; requires clinician review path in full clinical model. |
| `5F.2` | `symptom.family_scores.conduct += 1`, `symptom.conduct_high_risk_signal=true` | `yes -> safety escalation` (urgent/immediate by severity metadata). |
| `5F.3` | `symptom.family_scores.conduct += 1`, `impairment.legal_context=true` | Conduct + legal risk context. |
| `5F.4` | `symptom.family_scores.conduct += 1` | Conduct evidence (property destruction). |
| `5G.1` | `symptom.family_scores.trauma += 1` | Trauma exposure signal. |
| `5G.2` | `symptom.family_scores.trauma += 1` | Re-experiencing signal. |
| `5G.3` | `symptom.family_scores.trauma += 1` | Avoidance signal. |
| `5G.4` | `symptom.family_scores.trauma += 1` (if positive language) | PT narrative trauma signal. |
| `5H.1` | `symptom.family_scores.eating += 1` | Eating concern evidence. |
| `5H.2` | `symptom.family_scores.eating += 1` | Eating-compensatory behavior; if medical concern metadata present -> urgency bump. |
| `5H.3` | `symptom.family_scores.eating += 1` | Body image preoccupation signal. |
| `5I.1` | `symptom.family_scores.substance += 1` | Any substance use -> substance pathway candidate. |
| `5I.2` | `symptom.family_scores.substance += 1` | Caregiver suspected use signal. |
| `5J.1` | `symptom.family_scores.psychosis_mania += 1` | Mania-like evidence. |
| `5J.2` | `symptom.family_scores.psychosis_mania += 1` | Decreased sleep + high energy signal. |
| `5J.3` | `symptom.family_scores.psychosis_mania += 1` | PT mania-like signal. |

Rule after Node 5:
1. Select `primary_family` by highest score.
2. If top-two delta <= configured tie threshold, set `mixed_unclear=true`.
3. If safety/psychosis/conduct high-risk flags coexist, urgency floor is at least `urgent`.

### Node 6
| Question ID | Derived Fact(s) Written | Deterministic Rule / Routing Effect |
|---|---|---|
| `6A.1` | `impairment.home` | `mild=3`, `moderate=6`, `severe=9` normalization. |
| `6A.2` | `impairment.home_pt_narrative` | Reconciliation context only; may adjust confidence, not deterministic score by itself. |
| `6B.1` | `impairment.school_work` | `mild=3`, `moderate=6`, `severe=9`. |
| `6B.2` | `impairment.school_pt_narrative` | Reconciliation context only. |
| `6B.3` | `impairment.school_work` (18-25 equivalent) | Work/school equivalence for young adults. |
| `6C.1` | `impairment.peer_social` | `mild=3`, `moderate=6`, `severe=9`. |
| `6C.2` | `impairment.peer_pt_narrative` | Reconciliation context only. |
| `6D.1` | `impairment.safety_legal` | `mild=3`, `moderate=6`, `severe=9`; can force safety reevaluation. |
| `6D.2` | `impairment.safety_pt_disclosure` | `yes -> rerun Node 1 checks before finalize`. |

Rule after Node 6:
1. `highest_domain = max(home, school_work, peer_social, safety_legal)`.
2. `severity_tier` from normalized domain scores:
   - `mild` if all <=3
   - `moderate` if highest 4..6
   - `severe` if any >=7
3. `safety_legal >=7` sets urgency floor `urgent`.

### Node 7 (Output Logic and Optional Intake Confirmation)
| Question ID | Derived Fact(s) Written | Deterministic Rule / Routing Effect |
|---|---|---|
| `7.1` | `instruments.consent_caregiver` | If no, still show recommendations in report; mark `consent_pending`. |
| `7.2` | `instruments.consent_patient` | If no, remove PT self-report tools from pack. |
| `7.3` | `instruments.teacher_form_available` | If no, omit teacher-required instruments and note limitation. |
| `7.4` | `instruments.review_confirmed` | Operational confirmation only. |

For current hackathon MVP:
1. Node 7 is rendered as recommendation output.
2. Instrument pack is included in report payload/PDF (not scored in app).

## 7) Family Selection + Pathway Determinism (Post-Mapping)
1. Compute safety gate first.
2. Compute symptom family ranking.
3. Compute functional severity tier.
4. Apply neurodevelopmental modifier in parallel.
5. Produce:
   - `urgency_level`
   - `specialist_type`
   - `reason_codes`
   - `instrument_recommendation_pack`

## 8) Ambiguous / Declined Handling
1. For Node 1 `unclear` or `declined` answers, treat as safety-positive.
2. For ASQ:
   - decline on `ASQ-3` or `ASQ-5` = immediate positive.
3. For non-safety nodes, `declined` contributes to `insufficient_data=true` and can force `mixed_unclear`.

## 9) Versioning Rules
1. Question catalog version: `question-spec-v1`.
2. Routing engine version is stored on every decision row.
3. Any change to mapping table increments `question-spec` minor/major version.
