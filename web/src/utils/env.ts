/**
 * Environment variable utilities
 * Works consistently across dev, preview, and production modes
 */

/**
 * Get environment variable value
 * Tries multiple sources to ensure it works in all Qwik/Vite modes
 * Prioritizes process.env for SSR to avoid Qwik warnings
 */
export function getEnv(key: string, fallback?: string): string | undefined {
  // Try process.env first (SSR and Node.js context - most reliable)
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }
  
  // Try import.meta.env as fallback (client-side, but causes warnings in SSR)
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    const value = import.meta.env[key];
    if (value !== undefined && value !== null) {
      return value as string;
    }
  }
  
  return fallback;
}

/**
 * Get environment variable with type safety
 */
export function requireEnv(key: string, fallback?: string): string {
  const value = getEnv(key, fallback);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}
