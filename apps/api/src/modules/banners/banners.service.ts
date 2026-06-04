import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ListBannersQueryDto } from './dto/list-banners-query.dto';

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin list view: returns all banners (with optional filters). No
   * date-window filtering — admins see scheduled banners too.
   */
  async findAll(query: ListBannersQueryDto) {
    const where: Prisma.MarketplaceBannerWhereInput = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.geoZoneId) where.geoZoneId = query.geoZoneId;

    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
    const take = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.marketplaceBanner.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: { geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } } },
      }),
      this.prisma.marketplaceBanner.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    };
  }

  /**
   * Public/buyer view: returns banners visible to a user in a given zone.
   *   - isActive = true
   *   - startsAt is null OR <= now
   *   - endsAt is null OR > now
   *   - geoZoneId is null (global) OR matches the user's zone OR
   *     matches an ANCESTOR of the user's zone (so a "Riyadh" banner
   *     shows up to users in "Riyadh Central")
   *
   * Returns up to 10 banners, ordered by priority then createdAt.
   */
  async findVisible(userZoneId?: string) {
    const now = new Date();
    const visibleByDate: Prisma.MarketplaceBannerWhereInput = {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    };

    let zoneFilter: Prisma.MarketplaceBannerWhereInput;
    if (!userZoneId) {
      zoneFilter = { geoZoneId: null };
    } else {
      // Walk up the zone hierarchy to collect all ancestor zone IDs.
      // (Schema allows up to ~3 levels: REGION → CITY → DISTRICT.)
      const zoneChain: string[] = [userZoneId];
      let currentId: string | undefined = userZoneId;
      for (let i = 0; i < 5 && currentId; i++) {
        const zone = await this.prisma.geoZone.findUnique({
          where: { id: currentId },
          select: { parentZoneId: true },
        });
        if (zone?.parentZoneId) {
          zoneChain.push(zone.parentZoneId);
          currentId = zone.parentZoneId;
        } else {
          break;
        }
      }
      zoneFilter = { OR: [{ geoZoneId: null }, { geoZoneId: { in: zoneChain } }] };
    }

    const where: Prisma.MarketplaceBannerWhereInput = { AND: [visibleByDate, zoneFilter] };

    return this.prisma.marketplaceBanner.findMany({
      where,
      take: 10,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        titleAr: true, titleEn: true,
        subtitleAr: true, subtitleEn: true,
        imageUrl: true, emoji: true,
        linkUrl: true,
        backgroundColor: true,
        geoZoneId: true,
      },
    });
  }

  async findOne(id: string) {
    const banner = await this.prisma.marketplaceBanner.findUnique({
      where: { id },
      include: { geoZone: { select: { id: true, zoneName: true, zoneNameAr: true } } },
    });
    if (!banner) throw new NotFoundException(`Banner ${id} not found`);
    return banner;
  }

  async create(dto: CreateBannerDto, createdById?: string) {
    return this.prisma.marketplaceBanner.create({
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.findOne(id); // throws if not found
    return this.prisma.marketplaceBanner.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt === undefined ? undefined : (dto.startsAt ? new Date(dto.startsAt) : null),
        endsAt:   dto.endsAt   === undefined ? undefined : (dto.endsAt   ? new Date(dto.endsAt)   : null),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.marketplaceBanner.delete({ where: { id } });
    return { id, deleted: true };
  }
}
