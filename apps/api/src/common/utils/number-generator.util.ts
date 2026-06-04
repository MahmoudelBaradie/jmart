import { PrismaService } from '../../prisma/prisma.service';

export async function generateOrderNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateContractNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.supplyContract.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `CTR-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateShipmentNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.shipment.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `SHP-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateInvoiceNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateDisputeNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.dispute.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `DSP-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateTaskNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.task.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `TSK-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateLotNumber(farmerId: string, prisma: PrismaService): Promise<string> {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const prefix = `LOT-${dateStr}-`;
  // Lot numbers are GLOBALLY unique (DB constraint). Count today's lots
  // across all farmers, not just this one, so we don't collide with another
  // farmer's same-day lot.
  const count = await prisma.inventoryLot.count({ where: { lotNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}
