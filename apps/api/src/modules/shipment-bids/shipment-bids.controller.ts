/**
 * REST surface for the shipment-bidding marketplace.
 *
 * Driver routes:
 *   GET    /shipment-bids/open                 — open shipments to bid on
 *   GET    /shipment-bids/mine                 — my bids (across shipments)
 *   POST   /shipments/:shipmentId/bids         — submit a bid
 *   DELETE /shipment-bids/:bidId               — withdraw my bid
 *
 * Buyer routes:
 *   GET    /shipments/:shipmentId/bids         — list bids on my shipment
 *   POST   /shipment-bids/:bidId/accept        — accept a bid
 */
import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
  ParseUUIDPipe, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ShipmentBidStatus } from '@prisma/client';
import { ShipmentBidsService, SubmitBidDto } from './shipment-bids.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

@ApiTags('Shipment Bids')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class ShipmentBidsController {
  constructor(private readonly bids: ShipmentBidsService) {}

  // ── Driver: list open shipments to bid on ─────────────────────────────────
  @Get('shipment-bids/open')
  @ApiOperation({ summary: 'List shipments still awaiting bids (driver view)' })
  async listOpen(@CurrentUser() user: AuthenticatedUser) {
    const driverId = (user as any).driver?.id;
    if (!driverId) throw new ForbiddenException('هذه الخدمة لسائقي الشحن فقط');
    return this.bids.listOpenShipments(driverId);
  }

  // ── Driver: my bids ───────────────────────────────────────────────────────
  @Get('shipment-bids/mine')
  @ApiOperation({ summary: 'List my bids (driver)' })
  @ApiQuery({ name: 'status', enum: ShipmentBidStatus, required: false })
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: ShipmentBidStatus,
  ) {
    const driverId = (user as any).driver?.id;
    if (!driverId) throw new ForbiddenException('هذه الخدمة لسائقي الشحن فقط');
    return this.bids.listMyBids(driverId, status);
  }

  // ── Driver: submit a bid ──────────────────────────────────────────────────
  @Post('shipments/:shipmentId/bids')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a bid for a shipment (driver)' })
  async submit(
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @Body() dto: SubmitBidDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const driverId = (user as any).driver?.id;
    if (!driverId) throw new ForbiddenException('فقط السائقون يمكنهم تقديم العروض');
    return this.bids.submitBid(shipmentId, driverId, dto);
  }

  // ── Driver: withdraw bid ──────────────────────────────────────────────────
  @Delete('shipment-bids/:bidId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw my bid (driver)' })
  async withdraw(
    @Param('bidId', ParseUUIDPipe) bidId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const driverId = (user as any).driver?.id;
    if (!driverId) throw new ForbiddenException('فقط السائقون يمكنهم سحب العروض');
    return this.bids.withdrawBid(bidId, driverId);
  }

  // ── Buyer: see bids on my shipment ────────────────────────────────────────
  @Get('shipments/:shipmentId/bids')
  @ApiOperation({ summary: 'List bids on my shipment (buyer) — sorted cheapest first' })
  async listForShipment(
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bids.listBidsForShipment(shipmentId, {
      buyerId: user.buyer?.id ?? null,
      internalUserId: user.internalUser?.id ?? null,
    });
  }

  // ── Buyer: accept a bid ───────────────────────────────────────────────────
  @Post('shipment-bids/:bidId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a bid (buyer chooses winning driver)' })
  async accept(
    @Param('bidId', ParseUUIDPipe) bidId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bids.acceptBid(bidId, {
      buyerId: user.buyer?.id ?? null,
      internalUserId: user.internalUser?.id ?? null,
    });
  }
}
