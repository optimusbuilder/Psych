import type { ServiceModule } from "../foundation/types";

export const clinicalRulesModule: ServiceModule = {
  name: "clinical-rules",
  summary: "Deterministic clinical routing logic for age, severity, and pathway.",
  responsibilities: [
    "Assign age band and respondent/rater logic",
    "Determine primary symptom family",
    "Compute severity from highest functional impairment",
    "Decide clinician-review requirement and recommended pathway",
  ],
  dependsOn: [],
};
