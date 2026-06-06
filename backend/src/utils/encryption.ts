import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derive a 32-byte key from the config encryption key.
 * Uses SHA-256 to ensure consistent key length regardless of input.
 */
function getKey(): Buffer {
  return crypto.createHash('sha256').update(config.encryption.key).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded string in format: iv:encrypted:authTag
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Input format: iv:encrypted:authTag (all hex-encoded)
 */
export function decrypt(encryptedData: string): string {
  const key = getKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string looks like it's already encrypted (hex:hex:hex format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[0-9a-f]+$/i.test(part));
}
