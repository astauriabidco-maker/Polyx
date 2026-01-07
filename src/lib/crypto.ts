/**
 * Crypto Utility for Secure API Key Storage
 * Uses AES-256-GCM encryption with environment-based secret key
 * 
 * IMPORTANT: Set ENCRYPTION_SECRET in your .env (32+ characters)
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get or derive the encryption key from environment
 */
function getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'polyx-default-secret-change-me-in-production';

    if (secret === 'polyx-default-secret-change-me-in-production') {
        console.warn('[CRYPTO] ⚠️ Using default encryption secret! Set ENCRYPTION_SECRET in .env for production.');
    }

    // Derive a 32-byte key using scrypt
    return scryptSync(secret, 'polyx-salt', 32);
}

/**
 * Encrypt a plaintext string
 * Returns: base64 encoded string containing IV + Tag + Ciphertext
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) return '';

    try {
        const key = getEncryptionKey();
        const iv = randomBytes(IV_LENGTH);

        const cipher = createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        // Combine: IV (16) + Tag (16) + Ciphertext
        const combined = Buffer.concat([
            iv,
            tag,
            Buffer.from(encrypted, 'hex')
        ]);

        return combined.toString('base64');
    } catch (error) {
        console.error('[CRYPTO] Encryption failed:', error);
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt an encrypted string
 * Expects: base64 encoded string containing IV + Tag + Ciphertext
 */
export function decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedData, 'base64');

        // Extract components
        const iv = combined.subarray(0, IV_LENGTH);
        const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[CRYPTO] Decryption failed:', error);
        return ''; // Return empty on failure (key might have changed)
    }
}

/**
 * Mask a sensitive value for display (show first and last 4 chars)
 */
export function maskSensitive(value: string | null | undefined): string {
    if (!value || value.length < 10) return '••••••••';
    return `${value.substring(0, 4)}${'•'.repeat(Math.min(value.length - 8, 12))}${value.substring(value.length - 4)}`;
}

/**
 * Check if a value is encrypted (basic check)
 */
export function isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    try {
        const decoded = Buffer.from(value, 'base64');
        return decoded.length > IV_LENGTH + TAG_LENGTH;
    } catch {
        return false;
    }
}
