import express from "express";
import {
  createSessionSchema,
  functionalImpactSchema,
  respondentSchema,
  safetySchema,
  symptomSchema,
} from "../intake/contracts";
import { IntakeRepository, type SqlClient } from "../intake/repository";
import { getActorUserId, requireRoles } from "./auth";

const intakeWriteRoles = ["patient", "caregiver", "intake_coordinator", "admin"] as const;
const intakeReadRoles = [
  "patient",
  "caregiver",
  "intake_coordinator",
  "clinician",
  "admin",
] as const;
const providerRoles = ["intake_coordinator", "clinician", "admin"] as const;

export function createBackendApp(db: SqlClient) {
  const app = express();
  const repository = new IntakeRepository(db);

  const jsonParser = express.json();
  app.use((req, res, next) => {
    if (typeof req.body !== "undefined") {
      return next();
    }
    return jsonParser(req, res, next);
  });

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post(
    "/api/v1/intake-sessions",
    requireRoles([...intakeWriteRoles]),
    async (req, res) => {
      const parseResult = createSessionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      try {
        const session = await repository.createSession(parseResult.data);
        return res.status(201).json(session);
      } catch (error) {
        return res.status(500).json({
          error: "CreateSessionFailed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  app.patch(
    "/api/v1/intake-sessions/:id/respondent",
    requireRoles([...intakeWriteRoles]),
    async (req, res) => {
      const parseResult = respondentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const saved = await repository.saveRespondent(req.params.id, parseResult.data);
      return res.status(200).json(saved);
    },
  );

  app.patch(
    "/api/v1/intake-sessions/:id/safety",
    requireRoles([...intakeWriteRoles]),
    async (req, res) => {
      const parseResult = safetySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const saved = await repository.saveSafety(
        req.params.id,
        parseResult.data,
        getActorUserId(req),
      );
      return res.status(200).json(saved);
    },
  );

  app.patch(
    "/api/v1/intake-sessions/:id/symptoms",
    requireRoles([...intakeWriteRoles]),
    async (req, res) => {
      const parseResult = symptomSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const safetyGate = await repository.getSafetyGateState(req.params.id);
      if (!safetyGate.hasSafetyAssessment) {
        return res.status(409).json({
          error: "SafetyScreenRequired",
          message: "Safety screening must be completed before symptom routing.",
        });
      }
      if (safetyGate.requiresImmediateReview) {
        return res.status(409).json({
          error: "AutoRoutingSuspended",
          message: "Safety-positive case is in urgent review. Normal routing is suspended.",
          escalationLevel: safetyGate.escalationLevel,
        });
      }

      const saved = await repository.saveSymptoms(req.params.id, parseResult.data);
      return res.status(200).json(saved);
    },
  );

  app.patch(
    "/api/v1/intake-sessions/:id/functional-impact",
    requireRoles([...intakeWriteRoles]),
    async (req, res) => {
      const parseResult = functionalImpactSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const safetyGate = await repository.getSafetyGateState(req.params.id);
      if (!safetyGate.hasSafetyAssessment) {
        return res.status(409).json({
          error: "SafetyScreenRequired",
          message: "Safety screening must be completed before functional impact scoring.",
        });
      }
      if (safetyGate.requiresImmediateReview) {
        return res.status(409).json({
          error: "AutoRoutingSuspended",
          message: "Safety-positive case is in urgent review. Normal routing is suspended.",
          escalationLevel: safetyGate.escalationLevel,
        });
      }

      const saved = await repository.saveFunctionalImpact(req.params.id, parseResult.data);
      return res.status(200).json(saved);
    },
  );

  app.get(
    "/api/v1/intake-sessions/:id",
    requireRoles([...intakeReadRoles]),
    async (req, res) => {
      const aggregate = await repository.getSessionAggregate(req.params.id);
      if (!aggregate) {
        return res.status(404).json({ error: "SessionNotFound" });
      }
      return res.status(200).json(aggregate);
    },
  );

  app.get(
    "/api/v1/intake-sessions/:id/audit",
    requireRoles([...providerRoles]),
    async (req, res) => {
      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const logs = await repository.listAuditLogsForSession(req.params.id);
      return res.status(200).json({
        sessionId: req.params.id,
        count: logs.length,
        logs,
      });
    },
  );

  app.post(
    "/api/v1/intake-sessions/:id/submit",
    requireRoles([...intakeWriteRoles]),
    async (req, res) => {
      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const submitted = await repository.submitSession(req.params.id);
      if (!submitted) {
        return res.status(404).json({ error: "SessionNotFound" });
      }
      if (!submitted.submitted) {
        return res.status(409).json({
          error: "IncompleteSession",
          missing: submitted.missing,
        });
      }
      return res.status(200).json(submitted);
    },
  );

  app.get(
    "/api/v1/provider/urgent-cases",
    requireRoles([...providerRoles]),
    async (req, res) => {
      const limitParam = req.query.limit;
      const parsedLimit =
        typeof limitParam === "string" ? Number.parseInt(limitParam, 10) : NaN;
      const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100
          ? parsedLimit
          : 25;

      const cases = await repository.listUrgentCases(limit);
      return res.status(200).json({
        count: cases.length,
        cases,
      });
    },
  );

  return app;
}
