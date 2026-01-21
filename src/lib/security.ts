'use server';

import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'polyx-dev-secret-change-in-production-min-32-chars'
);
const SALT_ROUNDS = 12;
const TOKEN_EXPIRATION = '7d';

// ═══════════════════════════════════════════════════════════════
// PASSWORD HASHING
// ═══════════════════════════════════════════════════════════════

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hashedPassword - Stored hash to compare against
 * @returns true if password matches
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string | null
): Promise<boolean> {
  if (!hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
}

// ═══════════════════════════════════════════════════════════════
// JWT TOKENS
// ═══════════════════════════════════════════════════════════════

export interface TokenPayload {
  userId: string;
  email: string;
  isGlobalAdmin: boolean;
}

/**
 * Create a signed JWT token
 * @param payload - User data to encode
 * @returns Signed JWT string
 */
export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT string to verify
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      isGlobalAdmin: payload.isGlobalAdmin as boolean
    };
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like a bcrypt hash
 * @param str - String to check
 * @returns true if it's a bcrypt hash
 */
export async function isBcryptHash(str: string | null): Promise<boolean> {
  if (!str) return false;
  return str.startsWith('$2b$') || str.startsWith('$2a$');
}
