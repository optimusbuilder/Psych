import type { ServiceModule } from "../foundation/types";

export const triageOrchestrationModule: ServiceModule = {
  name: "triage-orchestration",
  summary: "Controls intake flow state and branching logic order.",
  responsibilities: [
    "Run safety checks before all other routing",
    "Track intake step state and completion",
    "Coordinate rule engine and instrument routing",
    "Stop auto-routing when escalation criteria are met",
  ],
  dependsOn: [
    "safety-screening",
    "clinical-rules",
    "instrument-routing",
    "clinical-review",
  ],
};
