import type { ServiceModule } from "../foundation/types";

export const safetyScreeningModule: ServiceModule = {
  name: "safety-screening",
  summary: "Universal first-gate risk screening and escalation decisions.",
  responsibilities: [
    "Evaluate immediate safety flags",
    "Raise urgent review events",
    "Suspend standard routing when risk is present",
    "Emit traceable safety reason codes",
  ],
  dependsOn: [],
};
