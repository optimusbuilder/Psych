import type { ServiceModule } from "../foundation/types";

export const apiGatewayModule: ServiceModule = {
  name: "api-gateway",
  summary: "Single ingress for auth, validation, and audit context.",
  responsibilities: [
    "Authenticate user and organization context",
    "Apply role-based access control",
    "Validate request payloads",
    "Attach audit metadata to downstream calls",
  ],
  dependsOn: [],
};
