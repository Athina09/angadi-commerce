import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import type { Role } from "@prisma/client";

export type AuthedRequest = Request & {
  user?: JwtPayload;
};

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      // Hackathon demo: let customers into vendor hub; routes auto-create a store
      const demo = process.env.AUTH_DEMO_MODE !== "false";
      if (demo && roles.includes("vendor") && req.user.role === "customer") {
        next();
        return;
      }
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
}
