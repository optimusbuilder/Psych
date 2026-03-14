import type { ServiceModule } from "../foundation/types";

export const instrumentRoutingModule: ServiceModule = {
  name: "instrument-routing",
  summary: "Protocol instrument assignment and scoring lifecycle management.",
  responsibilities: [
    "Select instruments by age, symptom family, and severity",
    "Track assignment and completion state",
    "Capture score/cutoff interpretations",
    "Return normalized instrument outputs to orchestration",
  ],
  dependsOn: ["clinical-rules"],
};
