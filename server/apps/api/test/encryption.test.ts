import { describe, it, expect } from "vitest";
import { encryptCredential, decryptCredential, maskKey } from "../src/services/encryption";

describe("AES-256-GCM Credential Encryption & Masking", () => {
  it("should encrypt and successfully decrypt sensitive API keys", () => {
    const rawApiKey = "gsk_groq_production_test_secret_key_123456789";
    const encrypted = encryptCredential(rawApiKey);

    expect(encrypted.ciphertext).toBeInstanceOf(Buffer);
    expect(encrypted.iv).toHaveLength(12);
    expect(encrypted.authTag).toHaveLength(16);
    expect(encrypted.ciphertext.toString("utf8")).not.toContain("groq");

    const decrypted = decryptCredential(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(rawApiKey);
  });

  it("should mask API keys displaying only the last 4 characters", () => {
    const rawApiKey = "alpaca_live_key_987654321_ABCD";
    const masked = maskKey(rawApiKey);

    expect(masked).toBe("••••-••••-ABCD");
    expect(masked).not.toContain("987654321");
  });

  it("should handle short keys safely in maskKey", () => {
    expect(maskKey("xyz")).toBe("••••");
  });
});
