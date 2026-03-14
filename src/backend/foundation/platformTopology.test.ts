import { describe, expect, it } from "vitest";
import {
  platformTopology,
  requiredModuleNames,
  validatePlatformTopology,
} from "./platformTopology";

describe("Phase 1 backend foundation topology", () => {
  it("includes all required service modules", () => {
    const moduleNames = new Set(platformTopology.map((module) => module.name));

    for (const requiredName of requiredModuleNames) {
      expect(moduleNames.has(requiredName)).toBe(true);
    }
  });

  it("contains valid dependency wiring", () => {
    const result = validatePlatformTopology(platformTopology);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("keeps triage orchestration wired to clinical flow modules", () => {
    const triageModule = platformTopology.find(
      (module) => module.name === "triage-orchestration",
    );

    expect(triageModule).toBeDefined();
    expect(triageModule?.dependsOn).toEqual(
      expect.arrayContaining([
        "safety-screening",
        "clinical-rules",
        "instrument-routing",
        "clinical-review",
      ]),
    );
  });
});
