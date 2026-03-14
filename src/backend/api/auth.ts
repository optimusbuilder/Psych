import type { NextFunction, Request, Response } from "express";

export type AppRole =
  | "patient"
  | "caregiver"
  | "intake_coordinator"
  | "clinician"
  | "admin";

const validRoles = new Set<AppRole>([
  "patient",
  "caregiver",
  "intake_coordinator",
  "clinician",
  "admin",
]);

function normalizeRole(value: string) {
  return value.trim().toLowerCase().replace(/-/g, "_");
}

export function getRoleFromRequest(req: Request) {
  const roleHeader = req.header("x-role");
  if (!roleHeader) {
    return null;
  }
  const normalized = normalizeRole(roleHeader);
  return validRoles.has(normalized as AppRole) ? (normalized as AppRole) : null;
}

export function getActorUserId(req: Request) {
  const userId = req.header("x-user-id");
  if (!userId) {
    return null;
  }
  const normalized = userId.trim();
  return normalized.length > 0 ? normalized : null;
}

export function requireRoles(allowedRoles: AppRole[]) {
  const allowed = new Set<AppRole>(allowedRoles);
  return (req: Request, res: Response, next: NextFunction) => {
    const role = getRoleFromRequest(req);
    if (!role) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid x-role header.",
      });
    }
    if (!allowed.has(role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Role does not have access to this endpoint.",
      });
    }
    return next();
  };
}
