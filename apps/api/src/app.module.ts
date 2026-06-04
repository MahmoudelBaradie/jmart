import { Module } from '@nestjs/common';
import { SmsService } from './common/services/sms.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { redisConfig } from './config/redis.config';
import { storageConfig } from './config/storage.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FarmersModule } from './modules/farmers/farmers.module';
import { BuyersModule } from './modules/buyers/buyers.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { GeoZonesModule } from './modules/geo-zones/geo-zones.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { ShipmentBidsModule } from './modules/shipment-bids/shipment-bids.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { QualityModule } from './modules/quality/quality.module';
import { FinancialModule } from './modules/financial/financial.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { BannersModule } from './modules/banners/banners.module';
import { SocialModule } from './modules/social/social.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, authConfig, redisConfig, storageConfig],
    }),

    // Rate limiting
    //   short / medium / long → global per-IP defaults
    //   auth                  → strict cap for /auth/login + /auth/register
    //                           (slows down credential-stuffing / spraying)
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 300 },
      { name: 'auth', ttl: 60000, limit: 30 },
    ]),

    // Events
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Queue
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
      }),
    }),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    FarmersModule,
    BuyersModule,
    DriversModule,
    GeoZonesModule,
    InventoryModule,
    OrdersModule,
    ContractsModule,
    LogisticsModule,
    ShipmentBidsModule,
    WarehousesModule,
    QualityModule,
    FinancialModule,
    DisputesModule,
    WorkflowModule,
    NotificationsModule,
    AuditModule,
    DashboardModule,
    CategoriesModule,
    ProductsModule,
    RatingsModule,
    AuctionsModule,
    BannersModule,
    SocialModule,
  ],
  providers: [
    SmsService,
    // Enforce rate limits globally. ThrottlerModule alone REGISTERS the
    // limits but does not apply them — without this APP_GUARD entry, the
    // limits above (20/s · 100/10s · 300/min) silently never trigger.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [SmsService],
})
export class AppModule {}
