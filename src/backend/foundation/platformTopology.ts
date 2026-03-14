import type { ServiceModule, ServiceName, TopologyValidationResult } from "./types";
import { apiGatewayModule } from "../modules/apiGateway.module";
import { triageOrchestrationModule } from "../modules/triageOrchestration.module";
import { safetyScreeningModule } from "../modules/safetyScreening.module";
import { clinicalRulesModule } from "../modules/clinicalRules.module";
import { instrumentRoutingModule } from "../modules/instrumentRouting.module";
import { clinicalReviewModule } from "../modules/clinicalReview.module";

export const requiredModuleNames: ServiceName[] = [
  "api-gateway",
  "triage-orchestration",
  "safety-screening",
  "clinical-rules",
  "instrument-routing",
  "clinical-review",
];

export const platformTopology: ServiceModule[] = [
  apiGatewayModule,
  triageOrchestrationModule,
  safetyScreeningModule,
  clinicalRulesModule,
  instrumentRoutingModule,
  clinicalReviewModule,
];

export function validatePlatformTopology(modules: ServiceModule[]): TopologyValidationResult {
  const errors: string[] = [];
  const names = modules.map((module) => module.name);
  const nameSet = new Set(names);

  if (nameSet.size !== names.length) {
    errors.push("Duplicate service module names found in platform topology.");
  }

  for (const requiredName of requiredModuleNames) {
    if (!nameSet.has(requiredName)) {
      errors.push(`Missing required module: ${requiredName}`);
    }
  }

  for (const module of modules) {
    for (const dependency of module.dependsOn) {
      if (!nameSet.has(dependency)) {
        errors.push(
          `Module "${module.name}" depends on "${dependency}" which is not registered.`,
        );
      }
      if (dependency === module.name) {
        errors.push(`Module "${module.name}" cannot depend on itself.`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
