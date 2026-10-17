import { Request, Response, NextFunction } from "express";

/**
 * Middleware: Enforces specific roles (e.g. 'admin').
 */
export function requireRole(role: "user" | "admin") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: `Access denied. Requires '${role}' role.` });
      return;
    }
    next();
  };
}
