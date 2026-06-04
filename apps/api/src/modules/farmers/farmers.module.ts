import { Module } from '@nestjs/common';
import { FarmersController } from './farmers.controller';
import { FarmersService } from './farmers.service';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';

@Module({
  controllers: [FarmersController, FarmsController],
  providers: [FarmersService, FarmsService],
  exports: [FarmersService, FarmsService],
})
export class FarmersModule {}
