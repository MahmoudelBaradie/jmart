import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  name: process.env.APP_NAME || 'Jmart API',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
  platformCommissionDefault: parseFloat(process.env.PLATFORM_COMMISSION_DEFAULT || '0.03'),
  disputeWindowHours: parseInt(process.env.DISPUTE_WINDOW_HOURS || '4', 10),
  priceLockMinutes: parseInt(process.env.PRICE_LOCK_MINUTES || '15', 10),
}));
