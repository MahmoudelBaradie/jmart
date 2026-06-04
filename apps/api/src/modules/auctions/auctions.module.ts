import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';

@Module({
  controllers: [AuctionsController],
})
export class AuctionsModule {}
