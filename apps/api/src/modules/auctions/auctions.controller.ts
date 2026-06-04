import { Controller, Get, Post, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * AUCTIONS — NOT IMPLEMENTED
 *
 * This feature is out of scope for the current release.
 * No Prisma model, no service layer, no real persistence exists yet.
 *
 * All endpoints intentionally return HTTP 501 Not Implemented so the
 * frontend can render a clear "coming soon" state rather than receiving
 * fake in-memory data that would be lost on every restart.
 *
 * To implement: add `Auction`, `AuctionBid` Prisma models, an
 * AuctionsService, and replace the stubs below with real handlers.
 */
@ApiExcludeController()
@Controller('auctions')
export class AuctionsController {
  private notImplemented(): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.NOT_IMPLEMENTED,
        message: 'Auctions feature is not yet available in this release.',
        feature: 'auctions',
        status: 'planned',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Get()
  findAll() { this.notImplemented(); }

  @Get(':id')
  findOne(@Param('id') _id: string) { this.notImplemented(); }

  @Post()
  create(@Body() _dto: unknown) { this.notImplemented(); }

  @Post(':id/bid')
  placeBid(@Param('id') _id: string, @Body() _dto: unknown) { this.notImplemented(); }
}
