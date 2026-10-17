import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  onboardingSchema,
  updateRiskProfileSchema,
} from "@confluence/shared-schemas";
import { User, RiskProfile } from "../db/models";
import { inMemoryStore } from "../db/inMemoryStore";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const onboardingRouter = Router();

// Full onboarding flow (User registration + Risk profile)
onboardingRouter.post(
  "/onboarding",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body;
      const isDbReady = mongoose.connection.readyState === 1;

      // Check if user is already authenticated via session cookie or Authorization header
      let currentUser: any = null;
      const authToken =
        req.cookies?.[env.SESSION_COOKIE_NAME] ||
        req.headers.authorization?.replace(/^Bearer\s+/i, "");

      if (authToken) {
        try {
          const decoded = jwt.verify(authToken, env.JWT_SECRET) as any;
          if (isDbReady) {
            currentUser = await User.findById(decoded.id);
          } else {
            currentUser = await inMemoryStore.findUserById(decoded.id);
          }
        } catch {
          // Token invalid, proceed with registration flow
        }
      }

      let user = currentUser;

      if (!user) {
        // Unauthenticated flow: require email, password, displayName
        if (!data.email || !data.password || !data.displayName) {
          res.status(400).json({ error: "Missing required registration fields: email, password, displayName." });
          return;
        }

        if (isDbReady) {
          const existing = await User.findOne({ email: data.email.toLowerCase() });
          if (existing) {
            const isMatch = await bcrypt.compare(data.password, existing.passwordHash);
            if (!isMatch) {
              res.status(409).json({ error: "User already exists with this email address." });
              return;
            }
            user = existing;
          } else {
            const passwordHash = await bcrypt.hash(data.password, 10);
            user = await User.create({
              email: data.email.toLowerCase(),
              passwordHash,
              displayName: data.displayName,
              role: "user",
            });
          }
        } else {
          const existing = await inMemoryStore.findUserByEmail(data.email);
          if (existing) {
            const isMatch = await bcrypt.compare(data.password, existing.passwordHash);
            if (!isMatch) {
              res.status(409).json({ error: "User already exists with this email address." });
              return;
            }
            user = existing;
          } else {
            const passwordHash = await bcrypt.hash(data.password, 10);
            user = await inMemoryStore.createUser({
              email: data.email.toLowerCase(),
              passwordHash,
              displayName: data.displayName,
              role: "user",
            });
          }
        }
      }

      // Create or Update Risk Profile
      let riskProfile: any = null;
      if (isDbReady) {
        riskProfile = await RiskProfile.findOneAndUpdate(
          { userId: user._id },
          {
            userId: user._id,
            riskCategory: data.riskCategory || "balanced",
            allocatableCapital: data.allocatableCapital || 1000000,
            maxPositionPct: data.maxPositionPct || 10,
            maxDailyLossPct: data.maxDailyLossPct || 3,
            liveTradingEnabled: false,
          },
          { upsert: true, new: true }
        );
      } else {
        riskProfile = inMemoryStore.setRiskProfile(user._id.toString(), {
          riskCategory: data.riskCategory || "balanced",
          allocatableCapital: data.allocatableCapital || 1000000,
          maxPositionPct: data.maxPositionPct || 10,
          maxDailyLossPct: data.maxDailyLossPct || 3,
        });
      }

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role, displayName: user.displayName },
        env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie(env.SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        user: { id: user._id, email: user.email, displayName: user.displayName },
        riskProfile,
        token,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get current user's risk profile
onboardingRouter.get("/risk-profile", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const isDbReady = mongoose.connection.readyState === 1;
    if (isDbReady) {
      const profile = await RiskProfile.findOne({ userId: req.user!.id });
      if (profile) {
        res.json(profile);
        return;
      }
    }
    res.json(inMemoryStore.getRiskProfile(req.user!.id));
  } catch (err: any) {
    res.json(inMemoryStore.getRiskProfile(req.user!.id));
  }
});

// Update risk profile parameters
onboardingRouter.put(
  "/risk-profile",
  requireAuth,
  validateBody(updateRiskProfileSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const isDbReady = mongoose.connection.readyState === 1;
      let updated: any = null;
      if (isDbReady) {
        updated = await RiskProfile.findOneAndUpdate(
          { userId: req.user!.id },
          { $set: req.body },
          { new: true, upsert: true }
        );
      }
      if (!updated) {
        updated = inMemoryStore.setRiskProfile(req.user!.id, req.body);
      }

      res.json(updated);
    } catch (err: any) {
      res.json(inMemoryStore.setRiskProfile(req.user!.id, req.body));
    }
  }
);
