import { Router, Request, Response } from "express";
import { apiCredentialSchema, ApiCredentialProvider } from "@confluence/shared-schemas";
import { ApiCredential } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { encryptCredential, decryptCredential, maskKey } from "../services/encryption";
import { logAuditEvent } from "../services/auditLogger";

export const credentialsRouter = Router();

// Save or update an encrypted API key
credentialsRouter.post(
  "/credentials",
  requireAuth,
  validateBody(apiCredentialSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { provider, key, secret } = req.body;

      const encKey = encryptCredential(key);
      const encSec = secret ? encryptCredential(secret) : undefined;

      await ApiCredential.findOneAndUpdate(
        { userId: req.user!.id, provider },
        {
          userId: req.user!.id,
          provider,
          encryptedKey: encKey.ciphertext,
          encryptedSecret: encSec?.ciphertext,
          keyIv: encKey.iv,
          keyAuthTag: encKey.authTag,
        },
        { upsert: true, new: true }
      );

      await logAuditEvent({
        userId: req.user!.id,
        eventType: "credential_saved",
        entityType: "api_credential",
        payload: { provider, maskedKey: maskKey(key) },
      });

      res.status(201).json({
        success: true,
        provider,
        maskedKey: maskKey(key),
        hasSecret: !!secret,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get list of credentials with masked values (NEVER returns raw keys)
credentialsRouter.get(
  "/credentials",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const credentials = await ApiCredential.find({ userId: req.user!.id });

      const maskedList = credentials.map((cred) => {
        try {
          const rawKey = decryptCredential(cred.encryptedKey, cred.keyIv, cred.keyAuthTag);
          return {
            id: cred._id,
            provider: cred.provider,
            maskedKey: maskKey(rawKey),
            hasSecret: !!cred.encryptedSecret,
            createdAt: cred.createdAt,
          };
        } catch (e) {
          return {
            id: cred._id,
            provider: cred.provider,
            maskedKey: "••••-••••",
            hasSecret: !!cred.encryptedSecret,
            createdAt: cred.createdAt,
          };
        }
      });

      res.json(maskedList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Delete a credential
credentialsRouter.delete(
  "/credentials/:provider",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const provider = req.params.provider as ApiCredentialProvider;
      await ApiCredential.findOneAndDelete({ userId: req.user!.id, provider });

      await logAuditEvent({
        userId: req.user!.id,
        eventType: "credential_deleted",
        entityType: "api_credential",
        payload: { provider },
      });

      res.json({ success: true, message: `Credential for ${provider} removed.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
