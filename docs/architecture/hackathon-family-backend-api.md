# Hackathon Family Backend API
Status: Implemented (question-spec + legacy compatible)  
Date: March 14, 2026

## Base
All endpoints are served from `/api/v1`.

## 1) Question Catalog
`GET /api/v1/family-referrals/question-spec`

### Response
```json
{
  "version": "question-spec-v1",
  "questions": [
    {
      "id": "1B.1",
      "node": 1,
      "label": "Caregiver Self-Harm Concern",
      "prompt": "...",
      "responseType": "yes_no_unclear",
      "raters": ["CG"],
      "ageTargets": ["all"],
      "required": true
    }
  ]
}
```

## 2) Create Referral
`POST /api/v1/family-referrals`

### Request body
- Accepts either:
1. Legacy condensed payload (existing fields):
  - `childAge`
  - `childGender`
  - `primaryConcerns`
  - `concernDuration`
  - `moodChanges`
  - `sleepIssues`
  - `selfHarmThoughts`
  - `suicidalIdeation`
  - `familyHistory`
  - `previousTreatment`
  - `preferredApproach`
2. Question-spec payload:
   - `responses` (array of `{questionId,rater,answer,answeredAt?}`)
   - Optional: `childName`, `metadata`

### Response
```json
{
  "referralId": "family-ref-...",
  "status": "completed",
  "createdAt": "2026-03-14T...",
  "intakeMode": "question_spec_v1",
  "intake": {},
  "recommendation": {
    "safetyGate": "clear",
    "urgencyLevel": "priority",
    "pathwayKey": "targeted_screening_and_clinician_review",
    "specialtyTrack": "mood_anxiety_track",
    "specialistType": "Pediatric Psychologist",
    "specialistDescription": "...",
    "reasonCodes": [],
    "rationale": [],
    "nextSteps": [],
    "instrumentPack": [],
    "engineVersion": "rules-v1.1.0",
    "aiExplanation": null
  },
  "report": {
    "pdfUrl": "/api/v1/family-referrals/<id>/pdf"
  },
  "disclaimer": "...",
  "emergency": {
    "call911": false,
    "call988": false
  }
}
```

## 3) Get Referral
`GET /api/v1/family-referrals/:id`

Returns the same response model as create.

## 4) Download PDF
`GET /api/v1/family-referrals/:id/pdf`

### Response
- Content-Type: `application/pdf`
- Attachment filename: `cura-referral-<id>.pdf`

## 5) AI Explanation
`POST /api/v1/family-referrals/:id/ai-explain`

### Request body (optional)
```json
{
  "regenerate": true
}
```

### Response
```json
{
  "referralId": "family-ref-...",
  "aiExplanation": "...",
  "generated": true,
  "usedModel": "gemini-2.5-flash"
}
```

If `GEMINI_API_KEY` is not set, endpoint returns a deterministic fallback explanation and sets:
- `"usedModel": "fallback"`

## Notes
1. Final safety gate, urgency, and specialist routing are deterministic (rules engine).
2. AI explanation does not override deterministic routing output.
3. Node 7 instrument recommendations are returned in `recommendation.instrumentPack`.
4. Family referral data is stored in:
   - `family_referrals`
   - `family_referral_intakes`
   - `family_referral_decisions`
   - `family_referral_reports`
