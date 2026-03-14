export type ServiceName =
  | "api-gateway"
  | "triage-orchestration"
  | "safety-screening"
  | "clinical-rules"
  | "instrument-routing"
  | "clinical-review";

export interface ServiceModule {
  name: ServiceName;
  summary: string;
  responsibilities: string[];
  dependsOn: ServiceName[];
}

export interface TopologyValidationResult {
  ok: boolean;
  errors: string[];
}
