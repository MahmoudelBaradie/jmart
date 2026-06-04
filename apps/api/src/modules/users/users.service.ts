import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InternalRole, Prisma } from '@prisma/client';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto, filters: { role?: InternalRole }) {
    const where: Prisma.InternalUserWhereInput = {
      ...(filters.role && { role: filters.role }),
      ...(pagination.search && {
        OR: [
          { fullName: { contains: pagination.search, mode: 'insensitive' } },
          { employeeId: { contains: pagination.search, mode: 'insensitive' } },
          { user: { email: { contains: pagination.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [raw, total] = await Promise.all([
      this.prisma.internalUser.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, phone: true, status: true } } },
      }),
      this.prisma.internalUser.count({ where }),
    ]);

    const data = raw.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.user.email,
      role: u.role,
      department: u.department,
      employeeId: u.employeeId,
      isActive: u.user.status === 'ACTIVE',
      createdAt: u.createdAt,
    }));

    return paginate(data, total, pagination);
  }

  async findOne(id: string) {
    const user = await this.prisma.internalUser.findUnique({
      where: { id },
      include: { user: { select: { email: true, phone: true, status: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: {
    email: string;
    password: string;
    fullName: string;
    role: InternalRole;
    department?: string;
    employeeId?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashed,
        userType: 'INTERNAL',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        internalUser: {
          create: {
            fullName: dto.fullName,
            role: dto.role,
            department: dto.department,
            employeeId: dto.employeeId,
          },
        },
      },
      include: { internalUser: true },
    });

    return user.internalUser;
  }
}
