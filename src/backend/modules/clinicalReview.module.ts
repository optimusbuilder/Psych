import type { ServiceModule } from "../foundation/types";

export const clinicalReviewModule: ServiceModule = {
  name: "clinical-review",
  summary: "Provider review queue, override controls, and final disposition.",
  responsibilities: [
    "Queue cases for clinician review",
    "Support override with rationale capture",
    "Finalize disposition and status transitions",
    "Record audit events for review actions",
  ],
  dependsOn: [],
};
