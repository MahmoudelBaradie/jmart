import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';

export interface SendNotificationDto {
  recipientId: string;
  recipientType: string;
  notificationType: string;
  title: string;
  body: string;
  channels?: string[];
  priority?: string;
  data?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyNotifications(recipientId: string, dto: { page?: number; limit?: number; unreadOnly?: boolean | string }) {
    const where: any = {
      recipientId,
      ...(dto.unreadOnly === true || dto.unreadOnly === 'true' ? { isRead: false } : {}),
    };

    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const take = dto.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async markAsRead(id: string, recipientId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    if (notification.recipientId !== recipientId) throw new ForbiddenException();

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(recipientId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(recipientId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientId, isRead: false },
    });
    return { count };
  }

  async send(dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        recipientType: dto.recipientType,
        notificationType: dto.notificationType,
        title: dto.title,
        body: dto.body,
        channels: dto.channels ?? ['IN_APP'],
        priority: dto.priority ?? 'NORMAL',
        data: dto.data,
        deliveries: {
          create: (dto.channels ?? ['IN_APP']).map((channel) => ({
            channel: channel as any,
            status: DeliveryStatus.PENDING,
          })),
        },
      },
    });
    return notification;
  }

  async sendToMany(recipientIds: string[], recipientType: string, notificationType: string, title: string, body: string) {
    const notifications = await this.prisma.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        recipientId,
        recipientType,
        notificationType,
        title,
        body,
        channels: ['IN_APP'],
      })),
    });
    return { sent: notifications.count };
  }
}
