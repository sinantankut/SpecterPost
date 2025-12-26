/**
 * Authentication Service - Direct API Authentication
 *
 * "Specter" Architecture: All authentication happens on-device.
 * No middleware required.
 *
 * Ghost: JWT tokens signed locally using jose
 * WordPress: Basic Auth with Application Passwords
 */

import * as jose from 'jose';

// Token cache to avoid regenerating tokens unnecessarily
let cachedGhostToken = null;
let ghostTokenExpiresAt = 0;

// Buffer time before token expiry to refresh (30 seconds)
const TOKEN_REFRESH_BUFFER = 30 * 1000;

/**
 * Convert hex string to Uint8Array
 * Ghost Admin API secrets are hex-encoded
 */
const hexToBytes = (hex) => {
  const bytes = hex.match(/.{1,2}/g);
  if (!bytes) {
    throw new Error('Invalid hex string');
  }
  return Uint8Array.from(bytes.map((byte) => parseInt(byte, 16)));
};

/**
 * Sign a Ghost Admin API JWT token locally using jose
 *
 * @param {string} adminKey - Ghost Admin API key in format "id:secret"
 * @returns {Promise<string>} Signed JWT token
 */
export const signGhostToken = async (adminKey) => {
  if (!adminKey || !adminKey.includes(':')) {
    throw new Error('Invalid Admin Key format. Expected: id:secret');
  }

  const [id, secret] = adminKey.split(':');

  if (!id || !secret) {
    throw new Error('Invalid Admin Key: missing id or secret');
  }

  if (secret.length < 64) {
    throw new Error('Invalid Admin Key: secret should be at least 64 hex characters');
  }

  try {
    // Convert hex secret to bytes
    const secretBytes = hexToBytes(secret);

    // Create and sign JWT using jose
    const token = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'HS256', kid: id, typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .setAudience('/admin/')
      .sign(secretBytes);

    return token;
  } catch (error) {
    if (error.message.includes('Invalid hex')) {
      throw new Error('Invalid Admin Key: secret contains invalid hex characters');
    }
    throw new Error(`Failed to sign token: ${error.message}`);
  }
};

/**
 * Get a valid Ghost API token (with caching)
 * Returns cached token if still valid, otherwise generates a new one
 *
 * @param {string} adminKey - Ghost Admin API key
 * @returns {Promise<string>} Valid JWT token
 */
export const getGhostToken = async (adminKey) => {
  const now = Date.now();

  // Return cached token if still valid (with buffer)
  if (cachedGhostToken && ghostTokenExpiresAt > now + TOKEN_REFRESH_BUFFER) {
    return cachedGhostToken;
  }

  // Generate new token
  const token = await signGhostToken(adminKey);

  // Cache the token (expires in 5 minutes)
  cachedGhostToken = token;
  ghostTokenExpiresAt = now + (5 * 60 * 1000);

  return token;
};

/**
 * Clear the Ghost token cache
 * Call this when credentials change
 */
export const clearGhostTokenCache = () => {
  cachedGhostToken = null;
  ghostTokenExpiresAt = 0;
};

/**
 * Create WordPress Basic Auth header
 *
 * @param {string} username - WordPress username
 * @param {string} appPassword - WordPress Application Password
 * @returns {string} Authorization header value
 */
export const createWordPressAuthHeader = (username, appPassword) => {
  if (!username || !appPassword) {
    throw new Error('WordPress username and application password are required');
  }

  // btoa is globally available in React Native (Hermes engine)
  const credentials = `${username}:${appPassword}`;
  const encoded = btoa(credentials);

  return `Basic ${encoded}`;
};

/**
 * Validate Ghost Admin Key format
 *
 * @param {string} adminKey - Ghost Admin API key
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateGhostAdminKey = (adminKey) => {
  if (!adminKey) {
    return { valid: false, error: 'Admin Key is required' };
  }

  if (!adminKey.includes(':')) {
    return { valid: false, error: 'Admin Key must be in format id:secret' };
  }

  const [id, secret] = adminKey.split(':');

  if (!id || id.length < 24) {
    return { valid: false, error: 'Admin Key ID appears to be invalid' };
  }

  if (!secret || secret.length < 64) {
    return { valid: false, error: 'Admin Key secret should be at least 64 hex characters' };
  }

  // Check if secret is valid hex
  if (!/^[a-fA-F0-9]+$/.test(secret)) {
    return { valid: false, error: 'Admin Key secret contains invalid characters (must be hex)' };
  }

  return { valid: true };
};

/**
 * Validate Ghost URL format
 *
 * @param {string} url - Ghost site URL
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateGhostUrl = (url) => {
  if (!url) {
    return { valid: false, error: 'Ghost URL is required' };
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: 'Ghost URL must start with http:// or https://' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

/**
 * Validate WordPress credentials format
 *
 * @param {string} siteUrl - WordPress site URL
 * @param {string} username - WordPress username
 * @param {string} appPassword - Application Password
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateWordPressCredentials = (siteUrl, username, appPassword) => {
  if (!siteUrl) {
    return { valid: false, error: 'WordPress site URL is required' };
  }

  if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
    return { valid: false, error: 'Site URL must start with http:// or https://' };
  }

  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (!appPassword) {
    return { valid: false, error: 'Application Password is required' };
  }

  // Application passwords are typically 24 characters with spaces
  const cleanPassword = appPassword.replace(/\s/g, '');
  if (cleanPassword.length < 20) {
    return { valid: false, error: 'Application Password appears to be too short' };
  }

  return { valid: true };
};
