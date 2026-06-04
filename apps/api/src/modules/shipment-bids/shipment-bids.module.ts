import { Module } from '@nestjs/common';
import { ShipmentBidsController } from './shipment-bids.controller';
import { ShipmentBidsService } from './shipment-bids.service';
import { ShipmentBidsListener } from './shipment-bids.listener';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShipmentBidsController],
  providers: [ShipmentBidsService, ShipmentBidsListener],
  exports: [ShipmentBidsService],
})
export class ShipmentBidsModule {}
