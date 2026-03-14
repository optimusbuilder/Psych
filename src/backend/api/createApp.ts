import express from "express";
import { z } from "zod";
import {
  clinicianOverrideSchema,
  createSessionSchema,
  functionalImpactSchema,
  createReferralSchema,
  referringProviderSchema,
  safetySchema,
  scoreInstrumentSchema,
  symptomSchema,
} from "../intake/contracts";
import { IntakeRepository, type SqlClient } from "../intake/repository";
import { familyReferralSubmissionSchema } from "../family/contracts";
import { FamilyReferralRepository, type FamilyReferralRecord } from "../family/repository";
import { generateReferralPdf } from "../family/pdf";
import {
  FAMILY_QUESTION_SPECS,
  FAMILY_QUESTION_SPEC_VERSION,
} from "../family/questionSpec";
import {
  createFamilyRoutingOutputFromSubmission,
  isQuestionnaireSubmission,
} from "../family/submissionRouting";
import { TriageAIService } from "../ai/service";
import { getActorUserId, getRoleFromRequest, requireRoles } from "./auth";

const intakeWriteRoles = ["patient", "caregiver", "intake_coordinator", "admin"] as const;
const intakeReadRoles = [
  "patient",
  "caregiver",
  "intake_coordinator",
  "clinician",
  "admin",
] as const;
const providerRoles = ["intake_coordinator", "clinician", "admin"] as const;
const instrumentOpsRoles = [
  "patient",
  "caregiver",
  "intake_coordinator",
  "clinician",
  "admin",
] as const;

const respondentSchema = z.object({
  type: z.enum(["patient", "caregiver", "clinician"]),
  relationshipToPatient: z.string().optional(),
  communicationProfile: z
    .enum(["verbal_typical", "limited_verbal", "nonverbal", "unknown"])
    .optional(),
  developmentalDelayConcern: z.boolean().optional(),
  autismConcern: z.boolean().optional(),
});

interface BackendAppOptions {
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
  };
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

interface ProviderActorContext {
  userId: string;
  role: "intake_coordinator" | "clinician" | "admin";
  organizationId: string | null;
  isAdmin: boolean;
}

function createRateLimiter(windowMs: number, maxRequests: number) {
  const buckets = new Map<string, RateLimitState>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith("/api/v1/")) {
      return next();
    }

    const now = Date.now();
    const roleKey = req.header("x-role")?.trim().toLowerCase() ?? "anonymous";
    const userKey = req.header("x-user-id")?.trim();
    const identityKey = userKey && userKey.length > 0 ? userKey : req.ip;
    const bucketKey = `${roleKey}:${identityKey}`;

    const current = buckets.get(bucketKey);
    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("retry-after", retryAfterSeconds.toString());
      return res.status(429).json({
        error: "RateLimitExceeded",
        message: "Too many requests. Please retry shortly.",
        retryAfterSeconds,
      });
    }

    current.count += 1;
    buckets.set(bucketKey, current);
    return next();
  };
}

export function createBackendApp(db: SqlClient, options: BackendAppOptions = {}) {
  const app = express();
  const repository = new IntakeRepository(db);
  const familyRepository = new FamilyReferralRepository(db);
  const rateLimitWindowMs = options.rateLimit?.windowMs ?? 60_000;
  const rateLimitMaxRequests = options.rateLimit?.maxRequests ?? 300;

  const jsonParser = express.json();
  app.use((req, res, next) => {
    if (typeof req.body !== "undefined") {
      return next();
    }
    return jsonParser(req, res, next);
  });
  app.use((req, res, next) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type,x-role,x-user-id");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    return next();
  });
  app.use(createRateLimiter(rateLimitWindowMs, rateLimitMaxRequests));

  function rejectRequest(
    res: express.Response,
    status: number,
    payload: Record<string, unknown>,
  ): null {
    res.status(status).json(payload);
    return null;
  }

  function toFamilyReferralApiResponse(referral: FamilyReferralRecord) {
    const questionnaireMode = isQuestionnaireSubmission(referral.intake);
    return {
      referralId: referral.referralId,
      status: referral.status,
      createdAt: referral.createdAt,
      intakeMode: questionnaireMode ? "question_spec_v1" : "legacy_condensed",
      intake: referral.intake,
      recommendation: {
        safetyGate: referral.decision.safetyGate,
        urgencyLevel: referral.decision.urgencyLevel,
        pathwayKey: referral.decision.pathwayKey,
        specialtyTrack: referral.decision.specialtyTrack,
        specialistType: referral.decision.specialistType,
        specialistDescription: referral.decision.specialistDescription,
        reasonCodes: referral.decision.reasonCodes,
        rationale: referral.decision.rationale,
        nextSteps: referral.decision.nextSteps,
        instrumentPack: referral.decision.instrumentPack,
        engineVersion: referral.decision.engineVersion,
        aiExplanation: referral.decision.aiExplanation,
      },
      questionSpec:
        questionnaireMode
          ? {
              version: FAMILY_QUESTION_SPEC_VERSION,
            }
          : undefined,
      report: {
        pdfUrl: `/api/v1/family-referrals/${referral.referralId}/pdf`,
      },
      disclaimer:
        "This tool provides referral guidance only. It is not diagnosis, treatment, or emergency care.",
      emergency: {
        call911: referral.decision.urgencyLevel === "immediate",
        call988:
          referral.decision.urgencyLevel === "immediate" ||
          referral.decision.urgencyLevel === "urgent",
      },
    };
  }

  async function resolveProviderActorContext(
    req: express.Request,
    res: express.Response,
  ): Promise<ProviderActorContext | null> {
    const role = getRoleFromRequest(req);
    if (!role || (role !== "intake_coordinator" && role !== "clinician" && role !== "admin")) {
      return rejectRequest(res, 401, {
        error: "Unauthorized",
        message: "Provider endpoint requires a valid provider role.",
      });
    }

    const actorUserId = getActorUserId(req);
    if (!actorUserId) {
      return rejectRequest(res, 401, {
        error: "ProviderIdentityRequired",
        message: "Provider endpoint requires x-user-id.",
      });
    }

    const profile = await repository.getUserAccessProfile(actorUserId);
    if (!profile) {
      return rejectRequest(res, 401, {
        error: "UnknownUser",
        message: "x-user-id does not match a known user.",
      });
    }

    if (profile.role !== role) {
      return rejectRequest(res, 403, {
        error: "Forbidden",
        message: "x-role does not match the authenticated user's role.",
      });
    }

    if (role !== "admin" && !profile.organizationId) {
      return rejectRequest(res, 403, {
        error: "OrganizationContextRequired",
        message: "Provider user must belong to an organization.",
      });
    }

    return {
      userId: profile.id,
      role,
      organizationId: profile.organizationId,
      isAdmin: role === "admin",
    };
  }

  const requireProviderActor: express.RequestHandler = async (req, res, next) => {
    try {
      const actor = await resolveProviderActorContext(req, res);
      if (!actor) {
        return;
      }
      res.locals.providerActor = actor;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireSessionOrganizationAccess: express.RequestHandler = async (req, res, next) => {
    try {
      const actor = res.locals.providerActor as ProviderActorContext | undefined;
      if (!actor) {
        return res.status(500).json({
          error: "InternalServerError",
          message: "Provider actor context was not initialized.",
        });
      }
      if (actor.isAdmin) {
        return next();
      }
      if (!actor.organizationId) {
        return res.status(403).json({
          error: "OrganizationContextRequired",
          message: "Provider user must belong to an organization.",
        });
      }

      const canAccess = await repository.canOrganizationAccessSession(req.params.id, actor.organizationId);
      if (canAccess === null) {
        return res.status(404).json({ error: "SessionNotFound" });
      }
      if (!canAccess) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Session belongs to a different organization.",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/v1/family-referrals/question-spec", (_req, res) => {
    return res.status(200).json({
      version: FAMILY_QUESTION_SPEC_VERSION,
      questions: FAMILY_QUESTION_SPECS,
    });
  });

  app.post("/api/v1/family-referrals", async (req, res) => {
    const parseResult = familyReferralSubmissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "ValidationError",
        issues: parseResult.error.issues,
      });
    }

    try {
      const created = await familyRepository.createReferral(parseResult.data);
      const saved = await familyRepository.getReferral(created.referralId);
      if (!saved) {
        return res.status(500).json({
          error: "FamilyReferralMissingAfterCreate",
          message: "Referral record was created but could not be read.",
        });
      }
      return res.status(201).json(toFamilyReferralApiResponse(saved));
    } catch (error) {
      return res.status(500).json({
        error: "CreateFamilyReferralFailed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/v1/family-referrals/:id", async (req, res) => {
    const referral = await familyRepository.getReferral(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: "FamilyReferralNotFound" });
    }
    return res.status(200).json(toFamilyReferralApiResponse(referral));
  });

  app.get("/api/v1/family-referrals/:id/pdf", async (req, res) => {
    const referral = await familyRepository.getReferral(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: "FamilyReferralNotFound" });
    }

    const pdfBuffer = generateReferralPdf(referral);
    const fileName = `cura-referral-${referral.referralId}.pdf`;
    await familyRepository.recordPdfGeneration(referral.referralId, fileName);

    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  });

  app.post("/api/v1/family-referrals/:id/ai-explain", async (req, res) => {
    const referral = await familyRepository.getReferral(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: "FamilyReferralNotFound" });
    }

    const explanationRequest = z
      .object({
        regenerate: z.boolean().optional(),
      })
      .optional()
      .safeParse(req.body);
    if (!explanationRequest.success) {
      return res.status(400).json({
        error: "ValidationError",
        issues: explanationRequest.error.issues,
      });
    }

    if (referral.decision.aiExplanation && !explanationRequest.data?.regenerate) {
      return res.status(200).json({
        referralId: referral.referralId,
        aiExplanation: referral.decision.aiExplanation,
        generated: false,
      });
    }

    let aiExplanation = "";
    if (process.env.GEMINI_API_KEY) {
      const routing = createFamilyRoutingOutputFromSubmission(referral.intake);
      aiExplanation = await TriageAIService.generateClinicianSummary(
        routing.rulesInput,
        routing.rulesResult,
      );
    } else {
      aiExplanation = [
        `Recommended specialist: ${referral.decision.specialistType}.`,
        ...referral.decision.rationale.slice(0, 2),
      ].join(" ");
    }

    const saved = await familyRepository.saveAiExplanation(
      referral.referralId,
      aiExplanation,
    );
    if (!saved) {
      return res.status(500).json({
        error: "SaveAiExplanationFailed",
      });
    }

    return res.status(200).json({
      referralId: referral.referralId,
      aiExplanation,
      generated: true,
      usedModel: process.env.GEMINI_API_KEY ? "gemini-2.5-flash" : "fallback",
    });
  });

  app.post(
    "/api/v1/triage/referrals",
    requireRoles([...intakeWriteRoles, ...providerRoles]),
    async (req, res) => {
      const parseResult = createReferralSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      try {
        const referral = await repository.submitReferral(parseResult.data, getActorUserId(req));
        return res.status(201).json(referral);
      } catch (error) {
        return res.status(500).json({
          error: "SubmitReferralFailed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

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

      const providerParse = referringProviderSchema.safeParse({
        providerName: parseResult.data.relationshipToPatient ?? parseResult.data.type,
        clinicalNote: `Respondent type: ${parseResult.data.type}`,
        communicationProfile: parseResult.data.communicationProfile,
        developmentalDelayConcern: parseResult.data.developmentalDelayConcern,
        autismConcern: parseResult.data.autismConcern,
      });
      if (!providerParse.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: providerParse.error.issues,
        });
      }

      const saved = await repository.saveReferringProvider(
        req.params.id,
        providerParse.data,
      );
      return res.status(200).json({
        id: saved.id,
        type: parseResult.data.type,
        relationshipToPatient: parseResult.data.relationshipToPatient ?? null,
      });
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
    "/api/v1/intake-sessions/:id/instrument-assignments",
    requireRoles([...intakeReadRoles]),
    async (req, res) => {
      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const assignments = await repository.listInstrumentAssignments(req.params.id);
      return res.status(200).json({
        sessionId: req.params.id,
        count: assignments.length,
        assignments,
      });
    },
  );

  app.post(
    "/api/v1/intake-sessions/:id/instruments/route",
    requireRoles([...instrumentOpsRoles]),
    async (req, res) => {
      const sessionExists = await repository.ensureSessionExists(req.params.id);
      if (!sessionExists) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      const routed = await repository.routeInstruments(req.params.id);
      if (!routed) {
        return res.status(404).json({ error: "SessionNotFound" });
      }
      if (!routed.routed) {
        return res.status(409).json({
          error: "IncompleteSessionForInstrumentRouting",
          missing: routed.missing,
        });
      }

      return res.status(200).json(routed);
    },
  );

  app.post(
    "/api/v1/instrument-assignments/:assignmentId/complete",
    requireRoles([...instrumentOpsRoles]),
    async (req, res) => {
      const completed = await repository.completeInstrumentAssignment(req.params.assignmentId);
      if (!completed) {
        return res.status(404).json({ error: "InstrumentAssignmentNotFound" });
      }
      if (!completed.completed) {
        return res.status(409).json({
          error: completed.reason,
          currentStatus: completed.currentStatus,
        });
      }
      return res.status(200).json(completed);
    },
  );

  app.post(
    "/api/v1/instrument-assignments/:assignmentId/score",
    requireRoles([...instrumentOpsRoles]),
    async (req, res) => {
      const parseResult = scoreInstrumentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      const scored = await repository.scoreInstrumentAssignment(
        req.params.assignmentId,
        parseResult.data,
      );
      if (!scored) {
        return res.status(404).json({ error: "InstrumentAssignmentNotFound" });
      }
      if (!scored.scored) {
        return res.status(409).json({
          error: scored.reason,
          currentStatus: scored.currentStatus,
        });
      }
      return res.status(200).json(scored.result);
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
    requireProviderActor,
    requireSessionOrganizationAccess,
    async (req, res) => {
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
    requireProviderActor,
    async (req, res) => {
      const limitParam = req.query.limit;
      const parsedLimit =
        typeof limitParam === "string" ? Number.parseInt(limitParam, 10) : NaN;
      const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100
          ? parsedLimit
          : 25;

      const actor = res.locals.providerActor as ProviderActorContext;
      const cases = await repository.listUrgentCases(
        limit,
        actor.isAdmin ? null : actor.organizationId,
      );
      return res.status(200).json({
        count: cases.length,
        cases,
      });
    },
  );

  app.get(
    "/api/v1/provider/review-queue",
    requireRoles([...providerRoles]),
    requireProviderActor,
    async (req, res) => {
      const limitParam = req.query.limit;
      const parsedLimit =
        typeof limitParam === "string" ? Number.parseInt(limitParam, 10) : NaN;
      const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100
          ? parsedLimit
          : 25;

      const statusParam = req.query.status;
      const status =
        statusParam === "awaiting_review" || statusParam === "flagged_urgent"
          ? statusParam
          : "all";

      const actor = res.locals.providerActor as ProviderActorContext;
      const cases = await repository.listReviewQueue(
        status,
        limit,
        actor.isAdmin ? null : actor.organizationId,
      );
      return res.status(200).json({
        status,
        count: cases.length,
        cases,
      });
    },
  );

  app.get(
    "/api/v1/provider/cases/:id",
    requireRoles([...providerRoles]),
    requireProviderActor,
    requireSessionOrganizationAccess,
    async (req, res) => {
      const detail = await repository.getProviderCaseDetail(req.params.id);
      if (!detail) {
        return res.status(404).json({ error: "SessionNotFound" });
      }
      return res.status(200).json(detail);
    },
  );

  app.post(
    "/api/v1/provider/cases/:id/override",
    requireRoles([...providerRoles]),
    requireProviderActor,
    requireSessionOrganizationAccess,
    async (req, res) => {
      const parseResult = clinicianOverrideSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "ValidationError",
          issues: parseResult.error.issues,
        });
      }

      const reviewResult = await repository.applyClinicianReview(
        req.params.id,
        parseResult.data,
        getActorUserId(req),
      );
      if (!reviewResult) {
        return res.status(404).json({ error: "SessionNotFound" });
      }

      return res.status(200).json(reviewResult);
    },
  );

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (res.headersSent) {
        return;
      }

      const detail = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({
        error: "InternalServerError",
        message: "Unexpected server error.",
        detail,
      });
    },
  );

  return app;
}
