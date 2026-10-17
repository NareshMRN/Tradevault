import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "user" | "admin";
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: Verifies JWT token from httpOnly cookie or Authorization header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.[env.SESSION_COOKIE_NAME] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    res.status(401).json({ error: "Authentication required. No session token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired session token." });
  }
}

/**
 * Middleware: Optionally attaches authenticated user if valid token exists.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.[env.SESSION_COOKIE_NAME] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    } catch (err) {}
  }
  next();
}

