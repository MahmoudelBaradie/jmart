import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KycStatus, Prisma } from '@prisma/client';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { CreateFarmDto } from './dto/create-farm.dto';
import { KycReviewDto } from './dto/kyc-review.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class FarmersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateFarmerDto) {
    const existingFarmer = await this.prisma.farmer.findUnique({ where: { userId } });
    if (existingFarmer) throw new ConflictException('Farmer profile already exists');

    const farmer = await this.prisma.farmer.create({
      data: {
        userId,
        businessName: dto.businessName,
        farmerType: dto.farmerType,
        nationalId: dto.nationalId,
        commercialRegNo: dto.commercialRegNo,
        contactPersonName: dto.contactPersonName,
        contactPhone: dto.contactPhone,
        bankAccountIban: dto.bankAccountIban,
        bankName: dto.bankName,
      },
      include: { user: { select: { email: true, phone: true } } },
    });

    this.eventEmitter.emit('farmer.registered', { farmerId: farmer.id, userId });
    return farmer;
  }

  async findAll(pagination: PaginationDto, filters: { kycStatus?: KycStatus; zoneId?: string }) {
    const where: Prisma.FarmerWhereInput = {
      ...(filters.kycStatus && { kycStatus: filters.kycStatus }),
      ...(pagination.search && {
        OR: [
          { businessName: { contains: pagination.search, mode: 'insensitive' } },
          { contactPersonName: { contains: pagination.search, mode: 'insensitive' } },
          { contactPhone: { contains: pagination.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.farmer.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: pagination.sortOrder || 'desc' },
        include: {
          user: { select: { email: true, status: true } },
          _count: { select: { farms: true, catalogItems: true } },
        },
      }),
      this.prisma.farmer.count({ where }),
    ]);

    return paginate(data, total, pagination);
  }

  async findOne(id: string) {
    const farmer = await this.prisma.farmer.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true, status: true, createdAt: true } },
        farms: { include: { geoZone: true } },
        catalogItems: {
          where: { isListed: true },
          include: { product: true },
          take: 10,
        },
        _count: { select: { inventoryLots: true, orderItems: true } },
      },
    });
    if (!farmer) throw new NotFoundException('Farmer not found');
    return farmer;
  }

  async findByUserId(userId: string) {
    const farmer = await this.prisma.farmer.findUnique({
      where: { userId },
      include: {
        farms: { include: { geoZone: true } },
        catalogItems: { where: { isListed: true }, include: { product: true } },
      },
    });
    if (!farmer) throw new NotFoundException('Farmer profile not found');
    return farmer;
  }

  async update(id: string, dto: UpdateFarmerDto) {
    await this.findOne(id);
    return this.prisma.farmer.update({
      where: { id },
      data: dto,
    });
  }

  async reviewKyc(id: string, dto: KycReviewDto, reviewerId: string) {
    const farmer = await this.findOne(id);
    if (farmer.kycStatus === KycStatus.APPROVED)
      throw new BadRequestException('Farmer already approved');

    const updated = await this.prisma.farmer.update({
      where: { id },
      data: {
        kycStatus: dto.status,
        kycReviewedById: reviewerId,
        kycReviewedAt: new Date(),
        kycRejectionReason: dto.rejectionReason,
        onboardedAt: dto.status === KycStatus.APPROVED ? new Date() : undefined,
      },
    });

    this.eventEmitter.emit('farmer.kyc.reviewed', {
      farmerId: id,
      status: dto.status,
      reviewerId,
    });

    return updated;
  }

  async suspend(id: string, reason: string, operatorId: string) {
    await this.findOne(id);
    const farmer = await this.prisma.farmer.update({
      where: { id },
      data: { user: { update: { status: 'SUSPENDED' } } },
    });
    this.eventEmitter.emit('farmer.suspended', { farmerId: id, reason, operatorId });
    return farmer;
  }

  // ─── Farms ──────────────────────────────────────────────

  async createFarm(farmerId: string, dto: CreateFarmDto) {
    await this.findOne(farmerId);
    const zone = await this.prisma.geoZone.findUnique({ where: { id: dto.geoZoneId } });
    if (!zone) throw new NotFoundException('Geo zone not found');

    return this.prisma.farmerFarm.create({
      data: { farmerId, ...dto },
      include: { geoZone: true },
    });
  }

  async getFarms(farmerId: string) {
    return this.prisma.farmerFarm.findMany({
      where: { farmerId },
      include: { geoZone: true },
    });
  }

  // ─── KYC Documents ──────────────────────────────────────

  async getKycDocuments(farmerId: string) {
    return this.prisma.kycDocument.findMany({
      where: { ownerId: farmerId, ownerType: 'FARMER' },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async addKycDocument(
    farmerId: string,
    dto: { documentType: string; fileUrl: string; fileName?: string; expiresAt?: string },
  ) {
    return this.prisma.kycDocument.create({
      data: {
        ownerId: farmerId,
        ownerType: 'FARMER',
        documentType: dto.documentType,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  // ─── Stats ──────────────────────────────────────────────

  async getStats(farmerId: string) {
    if (!farmerId) return { totalOrders: 0, activeContracts: 0, activeListings: 0, pendingPayouts: 0, openDisputes: 0 };
    const [totalOrders, activeContracts, activeListings, pendingPayouts, openDisputes] = await Promise.all([
      this.prisma.orderItem.count({ where: { farmerId } }),
      this.prisma.supplyContract.count({
        where: { farmerId, status: 'ACTIVE' },
      }),
      this.prisma.farmerCatalogItem.count({ where: { farmerId, isListed: true } }),
      this.prisma.payout.count({
        where: { recipientId: farmerId, status: 'QUEUED' },
      }),
      this.prisma.dispute.count({
        where: {
          status: { notIn: ['CLOSED', 'EXECUTED'] },
          OR: [
            { filedById: farmerId, filedByType: 'FARMER' },
            { againstId: farmerId, againstType: 'FARMER' },
          ],
        },
      }),
    ]);

    return { totalOrders, activeContracts, activeListings, pendingPayouts, openDisputes };
  }
}
