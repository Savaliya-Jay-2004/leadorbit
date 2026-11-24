import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const raw =
    process.env.APP_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'leadorbit-default-fallback-key-32';
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypts sensitive API credentials using AES-256-GCM before storing in MongoDB.
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts encrypted API credentials server-side only.
 */
export function decryptSecret(cipherPayload: string): string {
  if (!cipherPayload || !cipherPayload.includes(':')) return '';
  try {
    const [ivHex, tagHex, encHex] = cipherPayload.split(':');
    if (!ivHex || !tagHex || !encHex) return '';
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Produces a safe masked preview (e.g. sk-a••••••••8f2a) for Admin UI display.
 */
export function maskSecret(plainText: string): string {
  if (!plainText) return '';
  if (plainText.length <= 8) return '••••••••';
  const start = plainText.slice(0, 4);
  const end = plainText.slice(-4);
  return `${start}${'•'.repeat(10)}${end}`;
}

