import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ErrorLoggerInterceptor } from './common/interceptors/error-logger.interceptor';

async function bootstrap() {
  // In production, suppress `log` and `debug` to reduce attack-surface
  // (request bodies, query params, internal state). Errors/warnings stay on.
  const nodeEnvEarly = process.env.NODE_ENV ?? 'development';
  const app = await NestFactory.create(AppModule, {
    logger: nodeEnvEarly === 'production'
      ? ['error', 'warn']
      : ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS — strict allowlist in production, permissive on localhost in dev
  // so the Preview MCP and other ad-hoc dev tools (which spawn servers on
  // random ports) can hit the API without needing an env update each time.
  const allowList = configService.get<string>('CORS_ORIGINS', 'http://localhost:3001,http://localhost:3002,http://localhost:3003').split(',');
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      if (nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // API versioning
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api/v1');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor(), new ErrorLoggerInterceptor());

  // Swagger (only in non-production)
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Jmart API')
      .setDescription('Geo-Based Agricultural Supply Chain Platform API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Auth', 'Authentication & Authorization')
      .addTag('Users', 'User Management')
      .addTag('Farmers', 'Farmer Operations')
      .addTag('Buyers', 'Buyer Operations')
      .addTag('Drivers', 'Driver Operations')
      .addTag('Geo Zones', 'Geographic Zone Management')
      .addTag('Inventory', 'Inventory & Catalog Management')
      .addTag('Orders', 'Order Management')
      .addTag('Contracts', 'Supply Contract Management')
      .addTag('Logistics', 'Shipment & Logistics')
      .addTag('Warehouses', 'Warehouse Operations')
      .addTag('Quality', 'Quality Control')
      .addTag('Financial', 'Financial Settlement')
      .addTag('Disputes', 'Dispute Management')
      .addTag('Workflow', 'Tasks & Approvals')
      .addTag('Notifications', 'Notifications & Comms')
      .addTag('Audit', 'Audit & Activity Logs')
      .addTag('Dashboard', 'Internal Dashboards')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`🚀 Jmart API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
