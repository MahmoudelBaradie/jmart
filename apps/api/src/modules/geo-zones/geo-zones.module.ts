import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeoZonesController } from './geo-zones.controller';
import { GeoZonesService } from './geo-zones.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('auth.jwtAccessSecret'),
        signOptions: { expiresIn: config.get('auth.jwtAccessExpiresIn') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [GeoZonesController],
  providers: [GeoZonesService],
  exports: [GeoZonesService],
})
export class GeoZonesModule {}
