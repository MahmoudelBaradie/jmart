import { registerAs } from '@nestjs/config';

/**
 * Read a required secret from env. In production, refuses to fall back to a
 * hardcoded default — a missing secret is a fatal config error, not an
 * inconvenience to silently paper over with a known-public string.
 */
function readSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[auth.config] FATAL: env var ${name} is required in production. ` +
      `Generate one with: openssl rand -hex 64`,
    );
  }
  return devFallback;
}

export const authConfig = registerAs('auth', () => ({
  jwtAccessSecret:  readSecret('JWT_ACCESS_SECRET',  'default_access_secret_change_in_production'),
  jwtRefreshSecret: readSecret('JWT_REFRESH_SECRET', 'default_refresh_secret_change_in_production'),
  jwtAccessExpiresIn:  process.env.JWT_ACCESS_EXPIRES_IN  || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptRounds: 12,
}));
