import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  ttl: {
    zoneCatalog: 300,        // 5 minutes
    zoneShippingRates: 3600, // 1 hour
    driverLocation: 30,      // 30 seconds
    priceLock: 900,          // 15 minutes
    session: 86400,          // 24 hours
    zoneCapacity: 60,        // 1 minute
    farmerCatalog: 600,      // 10 minutes
  },
}));
