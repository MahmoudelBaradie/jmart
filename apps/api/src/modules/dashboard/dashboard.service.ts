import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PayoutStatus, RefundStatus, DisputeStatus, ZoneStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface OrderTrendRow {
  date: string;
  count: bigint | number;
  totalAmount: string | null;
}

interface FarmerTopRow {
  farmer_id: string;
  order_count: bigint;
  total_revenue: string | null;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const expiryThreshold = new Date(now);
    expiryThreshold.setDate(now.getDate() + 30);

    const [
      totalFarmers,
      totalBuyers,
      totalDrivers,
      activeThisMonth,
      totalOrders,
      todayOrders,
      thisWeekOrders,
      ordersByStatus,
      totalContracts,
      activeContracts,
      expiringSoon,
      availableLots,
      lowStockLots,
      totalAvailableKgResult,
      revenueThisMonth,
      pendingPayouts,
      pendingRefunds,
      openDisputes,
      closedDisputesThisMonth,
    ] = await Promise.all([
      this.safeCount(() => this.prisma.farmer.count()),
      this.safeCount(() => this.prisma.buyer.count()),
      this.safeCount(() => this.prisma.driver.count()),
      this.safeCount(() =>
        this.prisma.internalUser.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
      ),
      this.safeCount(() => this.prisma.order.count()),
      this.safeCount(() =>
        this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      ),
      this.safeCount(() =>
        this.prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
      ),
      this.prisma.order
        .groupBy({ by: ['status'], _count: { id: true } })
        .catch(() => []),
      this.safeCount(() => this.prisma.supplyContract.count()),
      this.safeCount(() =>
        this.prisma.supplyContract.count({ where: { status: 'ACTIVE' as any } }),
      ),
      this.safeCount(() =>
        this.prisma.supplyContract.count({
          where: { status: 'ACTIVE' as any, endDate: { lte: expiryThreshold } },
        }),
      ),
      this.safeCount(() =>
        this.prisma.inventoryLot.count({ where: { status: 'AVAILABLE' as any } }),
      ),
      this.safeCount(() =>
        this.prisma.inventoryLot.count({
          where: { status: 'AVAILABLE' as any, qtyAvailable: { lte: 100 } },
        }),
      ),
      this.prisma.inventoryLot
        .aggregate({
          _sum: { qtyAvailable: true },
          where: { status: 'AVAILABLE' as any },
        })
        .catch(() => ({ _sum: { qtyAvailable: null } })),
      this.prisma.invoice
        .aggregate({
          _sum: { totalAmount: true },
          where: { status: InvoiceStatus.PAID, paidAt: { gte: startOfMonth } },
        })
        .catch(() => ({ _sum: { totalAmount: null } })),
      this.safeCount(() =>
        this.prisma.payout.count({
          where: { status: { in: [PayoutStatus.QUEUED, PayoutStatus.PENDING_APPROVAL] } },
        }),
      ),
      this.safeCount(() =>
        this.prisma.refund.count({ where: { status: RefundStatus.PENDING_APPROVAL } }),
      ),
      this.safeCount(() =>
        this.prisma.dispute.count({ where: { status: DisputeStatus.FILED } }),
      ),
      this.safeCount(() =>
        this.prisma.dispute.count({
          where: { status: DisputeStatus.CLOSED, updatedAt: { gte: startOfMonth } },
        }),
      ),
    ]);

    const orderStatusMap: Record<string, number> = {};
    for (const row of ordersByStatus) {
      orderStatusMap[row.status] = row._count.id;
    }

    return {
      users: {
        total: totalFarmers + totalBuyers + totalDrivers,
        farmers: totalFarmers,
        buyers: totalBuyers,
        drivers: totalDrivers,
        activeThisMonth,
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
        thisWeek: thisWeekOrders,
        byStatus: orderStatusMap,
      },
      contracts: { total: totalContracts, active: activeContracts, expiringSoon },
      inventory: {
        availableLots,
        totalAvailableKg: Number(totalAvailableKgResult._sum.qtyAvailable ?? 0),
        lowStock: lowStockLots,
      },
      financial: {
        revenueThisMonth: Number(revenueThisMonth._sum.totalAmount ?? 0),
        pendingPayouts,
        pendingRefunds,
      },
      disputes: { open: openDisputes, closedThisMonth: closedDisputesThisMonth },
    };
  }

  async getOrderTrends(days: number) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<OrderTrendRow[]>(
      Prisma.sql`
        SELECT
          DATE("createdAt") AS date,
          COUNT(*) AS count,
          SUM("totalAmount") AS "totalAmount"
        FROM orders
        WHERE "createdAt" >= ${fromDate}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
    );

    return rows.map((row) => ({
      date: row.date,
      count: Number(row.count),
      totalAmount: Number(row.totalAmount ?? 0),
    }));
  }

  async getTopFarmers(limit: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await this.prisma.$queryRaw<FarmerTopRow[]>(
      Prisma.sql`
        SELECT
          oi."farmerId" AS farmer_id,
          COUNT(DISTINCT oi."orderId") AS order_count,
          SUM(o."totalAmount") AS total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi."orderId"
        WHERE o."createdAt" >= ${startOfMonth}
        GROUP BY oi."farmerId"
        ORDER BY order_count DESC
        LIMIT ${limit}
      `,
    );

    const farmerIds = rows.map((r) => r.farmer_id);
    const farmers = await this.prisma.farmer.findMany({
      where: { id: { in: farmerIds } },
      select: { id: true, businessName: true },
    });
    const farmerMap = new Map(farmers.map((f) => [f.id, f]));

    return rows
      .filter((r) => farmerMap.has(r.farmer_id))
      .map((r) => ({
        farmer: farmerMap.get(r.farmer_id),
        orderCount: Number(r.order_count),
        revenue: Number(r.total_revenue ?? 0),
      }));
  }

  async getTopBuyers(limit: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const results = await this.prisma.order.groupBy({
      by: ['buyerId'],
      where: { createdAt: { gte: startOfMonth } },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    const buyerIds = results.map((r) => r.buyerId);
    const buyers = await this.prisma.buyer.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, businessName: true },
    });
    const buyerMap = new Map(buyers.map((b) => [b.id, b]));

    return results
      .filter((r) => buyerMap.has(r.buyerId))
      .map((r) => ({
        buyer: buyerMap.get(r.buyerId),
        orderCount: r._count.id,
        totalSpent: Number(r._sum.totalAmount ?? 0),
      }));
  }

  async getZoneActivity() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeZones = await this.prisma.geoZone.findMany({
      where: { status: ZoneStatus.ACTIVE },
      select: { id: true, zoneName: true, zoneCode: true },
    });

    const zoneActivity = await Promise.all(
      activeZones.map(async (zone) => {
        const orderCount = await this.safeCount(() =>
          this.prisma.order.count({
            where: { pickupZoneId: zone.id, createdAt: { gte: thirtyDaysAgo } },
          }),
        );

        return {
          zone: { id: zone.id, name: zone.zoneName, code: zone.zoneCode },
          orderCount,
        };
      }),
    );

    return zoneActivity;
  }

  private async safeCount(fn: () => Promise<number>): Promise<number> {
    try {
      return await fn();
    } catch {
      return 0;
    }
  }
}
