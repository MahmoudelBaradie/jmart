import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto, filters: { status?: string; zoneId?: string }) {
    const where: Prisma.DriverWhereInput = {
      ...(filters.status && { status: filters.status as any }),
      ...(pagination.search && {
        OR: [
          { fullName: { contains: pagination.search, mode: 'insensitive' } },
          { vehiclePlate: { contains: pagination.search, mode: 'insensitive' } },
          { user: { email: { contains: pagination.search, mode: 'insensitive' } } },
        ],
      }),
      ...(filters.zoneId && {
        zoneAssignments: { some: { zoneId: filters.zoneId } },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, phone: true } },
          shippingCompany: { select: { id: true, companyName: true } },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return paginate(data, total, pagination);
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true, status: true } },
        shippingCompany: { select: { id: true, companyName: true } },
        zoneAssignments: { include: { zone: { select: { id: true, zoneName: true } } } },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async updateStatus(id: string, status: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    return this.prisma.driver.update({ where: { id }, data: { status: status as any } });
  }
}
