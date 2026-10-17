import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  onboardingSchema,
  updateRiskProfileSchema,
  confirmLiveTradingSchema,
} from "@confluence/shared-schemas";
import { User, RiskProfile, ApiCredential, KillSwitchState } from "../db/models";
import { inMemoryStore } from "../db/inMemoryStore";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { encryptCredential } from "../services/encryption";
import { logAuditEvent } from "../services/auditLogger";

export const onboardingRouter = Router();

// Full onboarding flow (User registration + Risk profile + Alpaca Paper credentials, or authenticated onboarding)
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
            allocatableCapital: data.allocatableCapital || 10000,
            maxPositionPct: data.maxPositionPct || 10,
            maxDailyLossPct: data.maxDailyLossPct || 3,
            liveTradingEnabled: false,
          },
          { upsert: true, new: true }
        );

        // Encrypt & Store Alpaca Paper Credentials (if provided)
        if (data.alpacaPaperKey && data.alpacaPaperSecret) {
          try {
            const encryptedKey = encryptCredential(data.alpacaPaperKey);
            const encryptedSecret = encryptCredential(data.alpacaPaperSecret);

            await ApiCredential.findOneAndUpdate(
              { userId: user._id, provider: "alpaca_paper" },
              {
                userId: user._id,
                provider: "alpaca_paper",
                encryptedKey: encryptedKey.ciphertext,
                encryptedSecret: encryptedSecret.ciphertext,
                keyIv: encryptedKey.iv,
                keyAuthTag: encryptedKey.authTag,
              },
              { upsert: true }
            );
          } catch (e) {}
        }

        // Initialize Kill Switch State if not existing
        try {
          await KillSwitchState.findOneAndUpdate(
            { userId: user._id },
            { $setOnInsert: { userId: user._id, isEngaged: false } },
            { upsert: true }
          );
        } catch (e) {}
      } else {
        riskProfile = inMemoryStore.setRiskProfile(user._id.toString(), {
          riskCategory: data.riskCategory || "balanced",
          allocatableCapital: data.allocatableCapital || 10000,
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

      try {
        await logAuditEvent({
          userId: user._id,
          eventType: "onboarding_completed",
          entityType: "risk_profile",
          entityId: riskProfile?._id?.toString() || user._id.toString(),
          payload: {
            riskCategory: data.riskCategory,
            capital: data.allocatableCapital,
            maxPositionPct: data.maxPositionPct,
          },
        });
      } catch (e) {}


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

      try {
        await logAuditEvent({
          userId: req.user!.id,
          eventType: "risk_profile_updated",
          entityType: "risk_profile",
          payload: req.body,
        });
      } catch (e) {}

      res.json(updated);
    } catch (err: any) {
      res.json(inMemoryStore.setRiskProfile(req.user!.id, req.body));
    }
  }
);


// Live Trading Gate Confirmation
onboardingRouter.post(
  "/risk-profile/confirm-live-trading",
  requireAuth,
  validateBody(confirmLiveTradingSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { alpacaLiveKey, alpacaLiveSecret } = req.body;

      // Encrypt live credentials
      const encKey = encryptCredential(alpacaLiveKey);
      const encSec = encryptCredential(alpacaLiveSecret);

      await ApiCredential.findOneAndUpdate(
        { userId: req.user!.id, provider: "alpaca_live" },
        {
          userId: req.user!.id,
          provider: "alpaca_live",
          encryptedKey: encKey.ciphertext,
          encryptedSecret: encSec.ciphertext,
          keyIv: encKey.iv,
          keyAuthTag: encKey.authTag,
        },
        { upsert: true }
      );

      const profile = await RiskProfile.findOneAndUpdate(
        { userId: req.user!.id },
        {
          liveTradingEnabled: true,
          liveTradingConfirmedAt: new Date(),
        },
        { new: true }
      );

      await logAuditEvent({
        userId: req.user!.id,
        eventType: "live_trading_enabled",
        entityType: "risk_profile",
        payload: { confirmedAt: new Date() },
      });

      res.json({
        success: true,
        message: "Live trading successfully enabled with 24-hour expiration window.",
        riskProfile: profile,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
