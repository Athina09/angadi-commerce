/**
 * Dummy AES-256-GCM helpers for “secure login” demos.
 * NOT production crypto — fixed demo key, no key rotation / HSM.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const DEMO_SECRET =
  process.env.AES256_LOGIN_SECRET || "angadi-demo-aes256-login-key";

function deriveKey(): Buffer {
  return scryptSync(DEMO_SECRET, "ngc-login-salt", 32);
}

/** Encrypt plaintext → base64(iv:tag:ciphertext) */
export function aes256Encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt payload from aes256Encrypt. Returns null on failure. */
export function aes256Decrypt(payload: string): string | null {
  try {
    const buf = Buffer.from(payload, "base64");
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = deriveKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return null;
  }
}

export const AES256_LOGIN_DUMMY = process.env.AES256_LOGIN_DUMMY !== "false";
