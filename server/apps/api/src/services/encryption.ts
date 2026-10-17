import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from MASTER_ENCRYPTION_KEY using scrypt.
 */
function getDerivedKey(): Buffer {
  return crypto.scryptSync(env.MASTER_ENCRYPTION_KEY, "confluence_salt_v1", 32);
}

export interface EncryptedPayload {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Encrypts sensitive text (e.g. API keys, secrets) using AES-256-GCM.
 */
export function encryptCredential(plainText: string): EncryptedPayload {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    authTag,
  };
}

/**
 * Decrypts ciphertext in-memory using AES-256-GCM.
 * Never persists or exposes the decrypted text.
 */
export function decryptCredential(
  ciphertext: Buffer,
  iv: Buffer,
  authTag: Buffer
): string {
  const key = getDerivedKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Masks an API key for safe display (e.g. "••••••••-a1b2").
 * Returns only the last 4 characters, preceded by bullets.
 */
export function maskKey(rawKey: string): string {
  if (!rawKey || rawKey.length < 4) {
    return "••••";
  }
  const last4 = rawKey.slice(-4);
  return `••••-••••-${last4}`;
}
