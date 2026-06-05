import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';

@Module({
  imports: [PrismaModule],
  providers: [PricingService],
  controllers: [PricingController],
  exports: [PricingService], // Products + Inventory modules consume it
})
export class PricingModule {}
