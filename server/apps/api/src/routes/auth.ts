import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User, RiskProfile, KillSwitchState } from "../db/models";
import { inMemoryStore } from "../db/inMemoryStore";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { logAuditEvent } from "../services/auditLogger";

export const authRouter = Router();

// Register
authRouter.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: "Missing required fields: email, password, displayName" });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const isDbReady = mongoose.connection.readyState === 1;

    let user: any = null;

    if (isDbReady) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({
        email: cleanEmail,
        passwordHash,
        displayName: displayName.trim(),
        role: "user",
      });

      // Initialize Kill Switch state
      try {
        await KillSwitchState.create({
          userId: user._id,
          isEngaged: false,
        });
      } catch (e) {}
    } else {
      // Offline / standalone in-memory mode
      const existing = await inMemoryStore.findUserByEmail(cleanEmail);
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      user = await inMemoryStore.createUser({
        email: cleanEmail,
        passwordHash,
        displayName: displayName.trim(),
        role: "user",
      });
      console.log(`[Auth] Registered user ${cleanEmail} in in-memory session.`);
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
        eventType: "user_registered",
        entityType: "user",
        entityId: user._id.toString(),
        payload: { email: user.email },
      });
    } catch (e) {}

    res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    console.error("[Auth.register] Error:", err);
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});

// Login
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const isDbReady = mongoose.connection.readyState === 1;

    let user: any = null;

    if (isDbReady) {
      user = await User.findOne({ email: cleanEmail });
      if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }
    } else {
      // In-memory standalone mode when MongoDB Atlas IP is not yet whitelisted
      user = await inMemoryStore.findUserByEmail(cleanEmail);

      if (user) {
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          res.status(401).json({ error: "Invalid email or password." });
          return;
        }
      } else {
        // Auto-provision dev user for seamless testing if no account exists yet
        const passwordHash = await bcrypt.hash(password, 10);
        user = await inMemoryStore.createUser({
          email: cleanEmail,
          passwordHash,
          displayName: cleanEmail.split("@")[0].toUpperCase(),
          role: "user",
        });
        console.log(`[Auth] Auto-created in-memory user account for ${cleanEmail} (MongoDB offline).`);
      }
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
        eventType: "user_login",
        entityType: "user",
        entityId: user._id.toString(),
        payload: { email: user.email },
      });
    } catch (e) {}

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    console.error("[Auth.login] Error:", err);
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

// Logout
authRouter.post("/logout", (req: Request, res: Response) => {
  res.clearCookie(env.SESSION_COOKIE_NAME);
  res.json({ success: true, message: "Logged out successfully." });
});

// Current User Profile
authRouter.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const isDbReady = mongoose.connection.readyState === 1;

    if (isDbReady) {
      const user = await User.findById(req.user!.id).select("-passwordHash");
      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const riskProfile = await RiskProfile.findOne({ userId: user._id });
      const killSwitch = await KillSwitchState.findOne({ userId: user._id });

      res.json({
        user,
        riskProfile,
        killSwitchEngaged: killSwitch?.isEngaged ?? false,
      });
    } else {
      // In-memory fallback
      const user = (await inMemoryStore.findUserById(req.user!.id)) || {
        _id: req.user!.id,
        id: req.user!.id,
        email: req.user!.email,
        displayName: req.user!.displayName,
        role: req.user!.role,
      };

      const riskProfile = inMemoryStore.getRiskProfile(req.user!.id);
      const killSwitchEngaged = inMemoryStore.isKillSwitchEngaged(req.user!.id);

      res.json({
        user,
        riskProfile,
        killSwitchEngaged,
      });
    }
  } catch (err: any) {
    console.error("[Auth.me] Error:", err);
    res.status(500).json({ error: err.message });
  }
});
