import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateRatingDto {
  orderId: string;
  ratedId: string;     // farmer.id or buyer.id
  ratedType: string;   // 'FARMER' | 'BUYER'
  score: number;       // 1-5
  comment?: string;
}

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRatingDto) {
    // Resolve rater (farmer or buyer)
    const farmer = await this.prisma.farmer.findUnique({ where: { userId } });
    const buyer = await this.prisma.buyer.findUnique({ where: { userId } });
    const raterId = farmer?.id || buyer?.id;
    const raterType = farmer ? 'FARMER' : buyer ? 'BUYER' : null;

    if (!raterId || !raterType) throw new NotFoundException('User profile not found');
    if (dto.score < 1 || dto.score > 5) throw new BadRequestException('Score must be 1-5');

    // Check order exists + include items to derive participating farmers
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: { select: { farmerId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'SETTLED') {
      throw new BadRequestException('Order must be delivered to rate');
    }

    // Authorization: rater MUST be a real participant of this order,
    // and ratedId MUST be the counterparty (no defaming arbitrary parties).
    const orderFarmerIds = new Set(order.items.map((i) => i.farmerId));
    if (raterType === 'BUYER') {
      if (order.buyerId !== raterId) throw new ForbiddenException('Not a participant of this order');
      if (dto.ratedType !== 'FARMER' || !orderFarmerIds.has(dto.ratedId)) {
        throw new ForbiddenException('Can only rate a farmer from this order');
      }
    } else {
      // FARMER rater
      if (!orderFarmerIds.has(raterId!)) throw new ForbiddenException('Not a participant of this order');
      if (dto.ratedType !== 'BUYER' || dto.ratedId !== order.buyerId) {
        throw new ForbiddenException('Can only rate the buyer of this order');
      }
    }

    // Prevent duplicate
    const exists = await this.prisma.rating.findFirst({
      where: { orderId: dto.orderId, raterId, raterType },
    });
    if (exists) throw new ConflictException('Already rated this order');

    return this.prisma.rating.create({
      data: {
        raterId,
        raterType,
        ratedId: dto.ratedId,
        ratedType: dto.ratedType,
        farmerId: dto.ratedType === 'FARMER' ? dto.ratedId : farmer?.id,
        buyerId: dto.ratedType === 'BUYER' ? dto.ratedId : buyer?.id,
        orderId: dto.orderId,
        score: dto.score,
        comment: dto.comment,
      },
    });
  }

  async getFarmerRatings(farmerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { farmerId, ratedType: 'FARMER' };

    const [data, total, agg] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rating.count({ where }),
      this.prisma.rating.aggregate({
        where,
        _avg: { score: true },
        _count: { id: true },
      }),
    ]);

    return {
      data: data.map((r) => ({ ...r, score: Number(r.score) })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: {
        averageScore: agg._avg.score ? Number(Number(agg._avg.score).toFixed(1)) : null,
        totalRatings: agg._count.id,
      },
    };
  }

  async getBuyerRatings(buyerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { buyerId, ratedType: 'BUYER' };

    const [data, total, agg] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rating.count({ where }),
      this.prisma.rating.aggregate({
        where,
        _avg: { score: true },
        _count: { id: true },
      }),
    ]);

    return {
      data: data.map((r) => ({ ...r, score: Number(r.score) })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: {
        averageScore: agg._avg.score ? Number(Number(agg._avg.score).toFixed(1)) : null,
        totalRatings: agg._count.id,
      },
    };
  }

  async getMyRatingForOrder(userId: string, orderId: string) {
    const farmer = await this.prisma.farmer.findUnique({ where: { userId } });
    const buyer = await this.prisma.buyer.findUnique({ where: { userId } });
    const raterId = farmer?.id || buyer?.id;
    const raterType = farmer ? 'FARMER' : 'BUYER';
    if (!raterId) return null;

    const rating = await this.prisma.rating.findFirst({
      where: { orderId, raterId, raterType },
    });
    return rating ? { ...rating, score: Number(rating.score) } : null;
  }
}
