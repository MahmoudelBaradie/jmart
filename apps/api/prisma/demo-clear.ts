/**
 * demo-clear.ts — حذف جميع البيانات التجريبية
 * تشغيل: pnpm tsx prisma/demo-clear.ts
 *
 * يحذف كل ما أنشأه demo-seed.ts بناءً على:
 *   • الإيميلات التي تنتهي بـ @demo.jmart.sa
 *   • الأرقام التي تبدأ بـ DEMO-
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  جارٍ حذف البيانات التجريبية...\n');

  // ── 1. جلب معرّفات المستخدمين التجريبيين ──────────────────────────────────
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@demo.jmart.sa' } },
    include: {
      farmer: { select: { id: true } },
      buyer: { select: { id: true } },
      driver: { select: { id: true } },
    },
  });

  const demoUserIds = demoUsers.map((u) => u.id);
  const demoFarmerIds = demoUsers.flatMap((u) => (u.farmer ? [u.farmer.id] : []));
  const demoBuyerIds = demoUsers.flatMap((u) => (u.buyer ? [u.buyer.id] : []));

  if (demoUserIds.length === 0) {
    console.log('ℹ️  لا توجد بيانات تجريبية للحذف.');
    return;
  }

  console.log(`  وُجد ${demoUserIds.length} مستخدمين تجريبيين.`);

  // ── 2. الحذف بترتيب التبعيات ───────────────────────────────────────────────

  // Notifications → references users
  const { count: cN } = await prisma.notification.deleteMany({
    where: { recipientId: { in: demoUserIds } },
  });
  if (cN) console.log(`  🗑  ${cN} إشعار`);

  // Ratings → references users/orders
  const { count: cR } = await prisma.rating.deleteMany({
    where: {
      OR: [
        { raterId: { in: demoUserIds } },
        { ratedId: { in: demoUserIds } },
      ],
    },
  });
  if (cR) console.log(`  🗑  ${cR} تقييم`);

  // QualityInspections → references lots
  const demoLots = await prisma.inventoryLot.findMany({
    where: { lotNumber: { startsWith: 'DEMO-LOT-' } },
    select: { id: true },
  });
  if (demoLots.length > 0) {
    const { count: cQC } = await prisma.qualityInspection.deleteMany({
      where: { lotId: { in: demoLots.map((l) => l.id) } },
    });
    if (cQC) console.log(`  🗑  ${cQC} فحص جودة`);
  }

  // Payouts → references farmers/orders
  const { count: cPY } = await prisma.payout.deleteMany({
    where: {
      OR: [
        { farmerId: { in: demoFarmerIds } },
        { buyerId: { in: demoBuyerIds } },
        { payoutNumber: { startsWith: 'DEMO-PAY-' } },
      ],
    },
  });
  if (cPY) console.log(`  🗑  ${cPY} دفعة مالية`);

  // Disputes → references orders/users
  const { count: c1 } = await prisma.dispute.deleteMany({
    where: {
      OR: [
        { filedById: { in: demoUserIds } },
        { againstId: { in: demoUserIds } },
        { order: { buyerId: { in: demoBuyerIds } } },
      ],
    },
  });
  if (c1) console.log(`  🗑  ${c1} نزاع`);

  // DisputeEvidence — cascade from Dispute (already deleted above)

  // Payments → references invoices
  const demoInvoices = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { startsWith: 'DEMO-' },
    },
    select: { id: true },
  });
  const demoInvoiceIds = demoInvoices.map((i) => i.id);

  if (demoInvoiceIds.length > 0) {
    const { count: c2 } = await prisma.payment.deleteMany({
      where: { invoiceId: { in: demoInvoiceIds } },
    });
    if (c2) console.log(`  🗑  ${c2} دفعة`);
  }

  // Invoices
  const { count: c3 } = await prisma.invoice.deleteMany({
    where: { invoiceNumber: { startsWith: 'DEMO-' } },
  });
  if (c3) console.log(`  🗑  ${c3} فاتورة`);

  // OrderItems → references orders/farmers
  const { count: c4 } = await prisma.orderItem.deleteMany({
    where: {
      OR: [
        { farmerId: { in: demoFarmerIds } },
        { order: { buyerId: { in: demoBuyerIds } } },
      ],
    },
  });
  if (c4) console.log(`  🗑  ${c4} عنصر طلب`);

  // OrderStatusHistory → cascade would handle, but being explicit
  await prisma.orderStatusHistory.deleteMany({
    where: { order: { orderNumber: { startsWith: 'DEMO-' } } },
  }).catch(() => {/* ignore if model not there */});

  // Orders
  const { count: c5 } = await prisma.order.deleteMany({
    where: { orderNumber: { startsWith: 'DEMO-' } },
  });
  if (c5) console.log(`  🗑  ${c5} طلب`);

  // ContractItems + Contracts
  const demoContracts = await prisma.supplyContract.findMany({
    where: { contractNumber: { startsWith: 'DEMO-' } },
    select: { id: true },
  });
  const demoContractIds = demoContracts.map((c) => c.id);

  if (demoContractIds.length > 0) {
    await prisma.contractItem.deleteMany({ where: { contractId: { in: demoContractIds } } });
    await prisma.contractPenaltyClause.deleteMany({ where: { contractId: { in: demoContractIds } } }).catch(() => {});
    const { count: c6 } = await prisma.supplyContract.deleteMany({
      where: { contractNumber: { startsWith: 'DEMO-' } },
    });
    if (c6) console.log(`  🗑  ${c6} عقد`);
  }

  // LotReservations → references InventoryLots
  await prisma.lotReservation.deleteMany({
    where: { lot: { lotNumber: { startsWith: 'DEMO-LOT-' } } },
  }).catch(() => {});

  // InventoryLots
  const { count: c7 } = await prisma.inventoryLot.deleteMany({
    where: { lotNumber: { startsWith: 'DEMO-LOT-' } },
  });
  if (c7) console.log(`  🗑  ${c7} دفعة مخزون`);

  // FarmerCatalogItems
  const { count: c8 } = await prisma.farmerCatalogItem.deleteMany({
    where: { farmerId: { in: demoFarmerIds } },
  });
  if (c8) console.log(`  🗑  ${c8} عنصر كتالوج`);

  // FarmerFarms
  const { count: c9 } = await prisma.farmerFarm.deleteMany({
    where: { farmerId: { in: demoFarmerIds } },
  });
  if (c9) console.log(`  🗑  ${c9} مزرعة`);

  // DriverZoneAssignments
  if (demoUsers.some((u) => u.driver)) {
    const driverIds = demoUsers.flatMap((u) => (u.driver ? [u.driver.id] : []));
    await prisma.driverZoneAssignment.deleteMany({ where: { driverId: { in: driverIds } } });
  }

  // Users (cascades Farmer, Buyer, Driver, InternalUser)
  const { count: c10 } = await prisma.user.deleteMany({
    where: { email: { endsWith: '@demo.jmart.sa' } },
  });
  if (c10) console.log(`  🗑  ${c10} مستخدم`);

  console.log('\n✅ تم حذف جميع البيانات التجريبية بنجاح.');
}

main()
  .catch((e) => {
    console.error('❌ فشلت عملية الحذف:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
