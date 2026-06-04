/**
 * demo-seed.ts — بيانات تجريبية شاملة وقابلة للحذف
 * تشغيل:  pnpm ts-node prisma/demo-seed.ts
 * حذف:    pnpm ts-node prisma/demo-clear.ts
 *
 * كلمة المرور الموحدة: Demo@Jmart2026!
 * جميع المستخدمين: @demo.jmart.sa
 */

import { PrismaClient, UserType, UserStatus, KycStatus, FarmerType, BuyerType,
  DriverStatus, VehicleType, OrderStatus, OrderType, InvoiceType, InvoiceStatus,
  ContractType, ContractStatus, StorageType, InspectionType, InspectionResult,
  PayoutStatus, DisputeStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PWD   = 'Demo@Jmart2026!';

// ─── Reference IDs (from seed.ts) ────────────────────────────────────────────
const ID = {
  adminInternal : 'd822c3c2-073f-421c-9c1a-9ff1fd5f423d',
  qcInternal    : 'f4dcf9e5-3845-4911-b62a-9e579e0e9497',
  whA           : 'bb29caae-b7be-43ea-a8a1-9458171b0184',
  whB           : '7b2adcaf-c6de-49a3-9a3b-45a552620f1f',
  zoneA         : '26fe7824-1270-4f6f-8229-5e82a3eb6d80',
  zoneB         : '20afca0e-e90f-40c4-a5bf-915c9fddbc75',
  zoneJed       : '53ca7e21-5666-4554-b2f2-55d61231e6b9',
  // products
  tomato        : '0a52803f-4ef6-429c-bffe-132c4406bc08',
  cucumber      : 'a865feba-9de7-48a3-9675-3e6f6c5c827f',
  pepper        : '009079d4-b263-46a6-8f66-b6934b086cbb',
  lettuce       : '9e7c841e-27e1-481f-aaf1-0e8928e3a3ca',
  orange        : 'd6ba01c6-0265-4611-ad30-bfa67226b513',
  apple         : 'c64920af-3900-4f77-aaf5-2dd51e9f46a8',
  grape         : '91f8e2c0-45aa-4d8d-9355-8d84dab5b839',
  cherryTomato  : '49b74a64-061e-4552-9cd0-b3f7543a482d',
  hotPepper     : 'e9da299c-3de9-48ff-8f53-77088cc88891',
  zucchini      : '14835956-58f0-4bc5-b5b2-c50036977667',
  eggplant      : 'e42ddaca-8305-47ee-a57c-c4cd8d24de14',
  cabbage       : '5aa1ca45-cc50-40e0-9f3e-56c7ce8f2488',
  carrot        : '7b7349d8-7c96-40cd-aed2-9d3d4baa3ef9',
  spinach       : '79383865-d732-489f-9abd-8959b52b7117',
  potato        : 'bbbd5145-19cf-40df-8587-498e5a10415d',
  onion         : '4b668396-462b-4a1f-b83c-ae7a15170673',
  garlic        : 'ea37c3cf-90aa-464f-bb94-467cb9ff12d0',
  mango         : 'd2b1330c-d449-4ec3-b753-6faee509b59b',
  lemon         : '9b2b7346-a79b-4d69-9628-8804c270199f',
  pomegranate   : '3e7921cf-1b2e-4c03-847e-5f8e2019be36',
  watermelon    : 'b24e4ef0-7ce3-40de-8885-fc4e0cf1ac9c',
  honeydew      : '368139db-b6e3-45fe-8196-3a4e437a131e',
  ajwaDate      : 'a5d8c546-ea1d-4d60-8daa-79becb3ac4a5',
  sukkariDate   : 'd2db37f2-8afd-4d6a-9f26-479505c50324',
  lentil        : '54a50c3e-42b3-48b4-984d-04b05e0835f2',
  chickpea      : 'b14fbad3-7fbf-44f4-9f40-136b52d9b669',
  mint          : '9845dc7b-280a-46b4-b7f4-178d003f062d',
  parsley       : '7939b2c8-b865-481e-b8d7-2ab11bc6a692',
  coriander     : '12bc60f0-4c65-4eed-9819-11914be18a38',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ago  = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const from = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function main() {
  console.log('🌱 إضافة البيانات التجريبية الشاملة...\n');

  const existing = await prisma.user.findFirst({ where: { email: { endsWith: '@demo.jmart.sa' } } });
  if (existing) {
    console.log('⚠️  موجودة. شغّل demo-clear.ts أولاً.');
    return;
  }

  const hash = await bcrypt.hash(PWD, 10);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. FARMERS — 6 مزارعين
  // ══════════════════════════════════════════════════════════════════════════
  console.log('👨‍🌾 إنشاء المزارعين (6)...');

  const fu = await Promise.all([
    prisma.user.create({ data: { email:'farmer1@demo.jmart.sa', phone:'+966511000001', passwordHash:hash, userType:UserType.FARMER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'farmer2@demo.jmart.sa', phone:'+966511000002', passwordHash:hash, userType:UserType.FARMER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'farmer3@demo.jmart.sa', phone:'+966511000003', passwordHash:hash, userType:UserType.FARMER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'farmer4@demo.jmart.sa', phone:'+966511000004', passwordHash:hash, userType:UserType.FARMER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'farmer5@demo.jmart.sa', phone:'+966511000005', passwordHash:hash, userType:UserType.FARMER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'farmer6@demo.jmart.sa', phone:'+966511000006', passwordHash:hash, userType:UserType.FARMER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
  ]);

  const [f1,f2,f3,f4,f5,f6] = await Promise.all([
    prisma.farmer.create({ data: { userId:fu[0].id, businessName:'مزرعة النخيل الذهبي',       farmerType:FarmerType.INDIVIDUAL,  contactPersonName:'خالد العتيبي',     contactPhone:'+966511000001', kycStatus:KycStatus.APPROVED, ratingAvg:4.7, ratingCount:38 } }),
    prisma.farmer.create({ data: { userId:fu[1].id, businessName:'تعاونية القصيم الزراعية',   farmerType:FarmerType.COOPERATIVE, contactPersonName:'عبدالله القحطاني', contactPhone:'+966511000002', kycStatus:KycStatus.APPROVED, ratingAvg:4.9, ratingCount:112 } }),
    prisma.farmer.create({ data: { userId:fu[2].id, businessName:'مزرعة الربيع للفواكه',      farmerType:FarmerType.INDIVIDUAL,  contactPersonName:'سلطان الشمري',     contactPhone:'+966511000003', kycStatus:KycStatus.APPROVED, ratingAvg:4.5, ratingCount:27 } }),
    prisma.farmer.create({ data: { userId:fu[3].id, businessName:'مجمع المدينة الزراعي',      farmerType:FarmerType.AGGREGATOR,  contactPersonName:'ناصر الدوسري',     contactPhone:'+966511000004', kycStatus:KycStatus.APPROVED, ratingAvg:4.8, ratingCount:65 } }),
    prisma.farmer.create({ data: { userId:fu[4].id, businessName:'مزرعة النجد للتمور',        farmerType:FarmerType.INDIVIDUAL,  contactPersonName:'فهد الرشيدي',      contactPhone:'+966511000005', kycStatus:KycStatus.APPROVED, ratingAvg:4.6, ratingCount:21 } }),
    prisma.farmer.create({ data: { userId:fu[5].id, businessName:'مزارع الحجاز',              farmerType:FarmerType.COOPERATIVE, contactPersonName:'محمد المالكي',     contactPhone:'+966511000006', kycStatus:KycStatus.PENDING } }),
  ]);
  console.log('  ✅ 6 مزارعين');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. FARMS — مزارع
  // ══════════════════════════════════════════════════════════════════════════
  const [farm1,farm2,farm3,farm4,farm5,farm6] = await Promise.all([
    prisma.farmerFarm.create({ data: { farmerId:f1.id, farmName:'مزرعة النخيل - حائل',        geoZoneId:ID.zoneA, address:'طريق الملك عبدالعزيز، حائل',           latitude:24.70, longitude:46.65, areaHectares:12.5 } }),
    prisma.farmerFarm.create({ data: { farmerId:f2.id, farmName:'مزرعة التعاونية - القصيم',   geoZoneId:ID.zoneB, address:'المنطقة الزراعية، بريدة، القصيم',      latitude:24.80, longitude:46.69, areaHectares:45.0 } }),
    prisma.farmerFarm.create({ data: { farmerId:f3.id, farmName:'مزرعة الربيع - الرياض',      geoZoneId:ID.zoneA, address:'شارع الرياض الزراعي، جنوب الرياض',    latitude:24.55, longitude:46.72, areaHectares:8.0  } }),
    prisma.farmerFarm.create({ data: { farmerId:f4.id, farmName:'مجمع المدينة - المزاحمية',   geoZoneId:ID.zoneA, address:'طريق المزاحمية، الرياض',              latitude:24.50, longitude:46.30, areaHectares:80.0 } }),
    prisma.farmerFarm.create({ data: { farmerId:f5.id, farmName:'مزرعة التمور - المدينة',     geoZoneId:ID.zoneB, address:'طريق الهجرة، المدينة المنورة',        latitude:24.47, longitude:39.61, areaHectares:30.0 } }),
    prisma.farmerFarm.create({ data: { farmerId:f6.id, farmName:'مزرعة الحجاز - جدة',        geoZoneId:ID.zoneJed, address:'شارع الأمير سلطان، جدة',            latitude:21.52, longitude:39.21, areaHectares:15.0 } }),
  ]);
  console.log('  ✅ 6 مزارع');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. CATALOG ITEMS — عروض المنتجات (35 عنصر)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📦 إنشاء عروض المنتجات (35 عرض)...');

  const cats = await Promise.all([
    // ── Farmer 1: خضروات رياض ─────────────────────────────────────────────
    prisma.farmerCatalogItem.create({ data: { farmerId:f1.id, farmId:farm1.id, productId:ID.tomato,      grade:'A', packagingType:'CRATE',  pricePerUnit:3.50, availableQty:2000, minOrderQty:100, leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f1.id, farmId:farm1.id, productId:ID.tomato,      grade:'B', packagingType:'LOOSE',  pricePerUnit:2.80, availableQty:800,  minOrderQty:50,  leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f1.id, farmId:farm1.id, productId:ID.cucumber,   grade:'A', packagingType:'CRATE',  pricePerUnit:2.80, availableQty:1500, minOrderQty:50,  leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f1.id, farmId:farm1.id, productId:ID.pepper,     grade:'A', packagingType:'CRATE',  pricePerUnit:6.00, availableQty:500,  minOrderQty:20,  leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f1.id, farmId:farm1.id, productId:ID.cherryTomato,grade:'A',packagingType:'PUNNET', pricePerUnit:12.00,availableQty:200,  minOrderQty:10,  leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f1.id, farmId:farm1.id, productId:ID.zucchini,   grade:'A', packagingType:'CRATE',  pricePerUnit:3.20, availableQty:600,  minOrderQty:20,  leadTimeHours:12, isListed:true } }),

    // ── Farmer 2: تعاونية - خضروات + توابل ────────────────────────────────
    prisma.farmerCatalogItem.create({ data: { farmerId:f2.id, farmId:farm2.id, productId:ID.tomato,      grade:'A', packagingType:'CRATE',  pricePerUnit:3.20, availableQty:8000, minOrderQty:500, leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f2.id, farmId:farm2.id, productId:ID.onion,       grade:'A', packagingType:'SACK',   pricePerUnit:1.80, availableQty:5000, minOrderQty:200, leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f2.id, farmId:farm2.id, productId:ID.potato,      grade:'A', packagingType:'SACK',   pricePerUnit:1.50, availableQty:6000, minOrderQty:200, leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f2.id, farmId:farm2.id, productId:ID.garlic,      grade:'A', packagingType:'SACK',   pricePerUnit:8.00, availableQty:800,  minOrderQty:20,  leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f2.id, farmId:farm2.id, productId:ID.carrot,      grade:'A', packagingType:'CRATE',  pricePerUnit:2.50, availableQty:3000, minOrderQty:100, leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f2.id, farmId:farm2.id, productId:ID.eggplant,    grade:'A', packagingType:'CRATE',  pricePerUnit:3.80, availableQty:700,  minOrderQty:50,  leadTimeHours:24, isListed:true } }),

    // ── Farmer 3: فواكه ────────────────────────────────────────────────────
    prisma.farmerCatalogItem.create({ data: { farmerId:f3.id, farmId:farm3.id, productId:ID.orange,      grade:'A', packagingType:'BOX',    pricePerUnit:5.50, availableQty:3000, minOrderQty:200, leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f3.id, farmId:farm3.id, productId:ID.apple,       grade:'A', packagingType:'CRATE',  pricePerUnit:7.00, availableQty:2000, minOrderQty:100, leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f3.id, farmId:farm3.id, productId:ID.grape,       grade:'A', packagingType:'BOX',    pricePerUnit:9.50, availableQty:800,  minOrderQty:50,  leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f3.id, farmId:farm3.id, productId:ID.mango,       grade:'A', packagingType:'CRATE',  pricePerUnit:8.00, availableQty:1200, minOrderQty:50,  leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f3.id, farmId:farm3.id, productId:ID.pomegranate, grade:'A', packagingType:'BOX',    pricePerUnit:10.00,availableQty:600,  minOrderQty:20,  leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f3.id, farmId:farm3.id, productId:ID.lemon,       grade:'A', packagingType:'CRATE',  pricePerUnit:4.50, availableQty:500,  minOrderQty:50,  leadTimeHours:24, isListed:true } }),

    // ── Farmer 4: مجمع - متنوع ─────────────────────────────────────────────
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.watermelon,  grade:'A', packagingType:'LOOSE',  pricePerUnit:1.80, availableQty:15000,minOrderQty:500, leadTimeHours:48, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.honeydew,    grade:'A', packagingType:'CRATE',  pricePerUnit:3.00, availableQty:3000, minOrderQty:200, leadTimeHours:48, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.cabbage,     grade:'A', packagingType:'LOOSE',  pricePerUnit:2.00, availableQty:4000, minOrderQty:100, leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.spinach,     grade:'A', packagingType:'BAG',    pricePerUnit:7.00, availableQty:300,  minOrderQty:5,   leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.lettuce,     grade:'A', packagingType:'LOOSE',  pricePerUnit:5.00, availableQty:400,  minOrderQty:10,  leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.hotPepper,   grade:'A', packagingType:'CRATE',  pricePerUnit:9.00, availableQty:200,  minOrderQty:10,  leadTimeHours:24, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.mint,        grade:'A', packagingType:'BUNCH',  pricePerUnit:15.00,availableQty:100,  minOrderQty:5,   leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.parsley,     grade:'A', packagingType:'BUNCH',  pricePerUnit:12.00,availableQty:150,  minOrderQty:5,   leadTimeHours:12, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f4.id, farmId:farm4.id, productId:ID.coriander,   grade:'A', packagingType:'BUNCH',  pricePerUnit:10.00,availableQty:150,  minOrderQty:5,   leadTimeHours:12, isListed:true } }),

    // ── Farmer 5: تمور ─────────────────────────────────────────────────────
    prisma.farmerCatalogItem.create({ data: { farmerId:f5.id, farmId:farm5.id, productId:ID.ajwaDate,    grade:'A',     packagingType:'BOX',  pricePerUnit:45.00,availableQty:2000, minOrderQty:20,  leadTimeHours:48, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f5.id, farmId:farm5.id, productId:ID.ajwaDate,    grade:'EXTRA', packagingType:'BOX',  pricePerUnit:65.00,availableQty:500,  minOrderQty:5,   leadTimeHours:48, isListed:true } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f5.id, farmId:farm5.id, productId:ID.sukkariDate, grade:'A',     packagingType:'BOX',  pricePerUnit:35.00,availableQty:3000, minOrderQty:10,  leadTimeHours:48, isListed:true } }),

    // ── Farmer 6: حجاز (قيد المراجعة) ─────────────────────────────────────
    prisma.farmerCatalogItem.create({ data: { farmerId:f6.id, farmId:farm6.id, productId:ID.lentil,      grade:'A', packagingType:'SACK',   pricePerUnit:4.50, availableQty:5000, minOrderQty:500, leadTimeHours:72, isListed:false } }),
    prisma.farmerCatalogItem.create({ data: { farmerId:f6.id, farmId:farm6.id, productId:ID.chickpea,    grade:'A', packagingType:'SACK',   pricePerUnit:5.00, availableQty:4000, minOrderQty:500, leadTimeHours:72, isListed:false } }),
  ]);
  console.log('  ✅ 35 عرض منتج');

  // ══════════════════════════════════════════════════════════════════════════
  // 4. INVENTORY LOTS — 20 دفعة مخزون
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🏭 إنشاء دفعات المخزون (20 دفعة)...');

  const lots = await Promise.all([
    // Farmer 1
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F1-001', farmerId:f1.id, farmId:farm1.id, productId:ID.tomato,      grade:'A', geoZoneId:ID.zoneA, warehouseId:ID.whA, storageType:StorageType.REFRIGERATED, qtyTotal:2000, qtyAvailable:1750, qtyReserved:250, harvestDate:ago(3),  expiryDate:from(10) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F1-002', farmerId:f1.id, farmId:farm1.id, productId:ID.cucumber,    grade:'A', geoZoneId:ID.zoneA, warehouseId:ID.whA, storageType:StorageType.REFRIGERATED, qtyTotal:1500, qtyAvailable:1500,              harvestDate:ago(1),  expiryDate:from(7)  } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F1-003', farmerId:f1.id, farmId:farm1.id, productId:ID.pepper,      grade:'A', geoZoneId:ID.zoneA, warehouseId:ID.whA, storageType:StorageType.REFRIGERATED, qtyTotal:500,  qtyAvailable:500,               harvestDate:ago(2),  expiryDate:from(8)  } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F1-004', farmerId:f1.id, farmId:farm1.id, productId:ID.zucchini,    grade:'A', geoZoneId:ID.zoneA,                     storageType:StorageType.REFRIGERATED, qtyTotal:600,  qtyAvailable:600,               harvestDate:ago(1),  expiryDate:from(5)  } }),
    // Farmer 2
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F2-001', farmerId:f2.id, farmId:farm2.id, productId:ID.tomato,      grade:'A', geoZoneId:ID.zoneB, warehouseId:ID.whB, storageType:StorageType.REFRIGERATED, qtyTotal:8000, qtyAvailable:6000, qtyReserved:2000,harvestDate:ago(2),  expiryDate:from(12) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F2-002', farmerId:f2.id, farmId:farm2.id, productId:ID.onion,       grade:'A', geoZoneId:ID.zoneB, warehouseId:ID.whB, storageType:StorageType.AMBIENT,       qtyTotal:5000, qtyAvailable:4500, qtyReserved:500, harvestDate:ago(7),  expiryDate:from(60) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F2-003', farmerId:f2.id, farmId:farm2.id, productId:ID.potato,      grade:'A', geoZoneId:ID.zoneB, warehouseId:ID.whB, storageType:StorageType.AMBIENT,       qtyTotal:6000, qtyAvailable:5500,              harvestDate:ago(10), expiryDate:from(45) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F2-004', farmerId:f2.id, farmId:farm2.id, productId:ID.carrot,      grade:'A', geoZoneId:ID.zoneB,                     storageType:StorageType.REFRIGERATED, qtyTotal:3000, qtyAvailable:3000,              harvestDate:ago(4),  expiryDate:from(20) } }),
    // Farmer 3
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F3-001', farmerId:f3.id, farmId:farm3.id, productId:ID.orange,      grade:'A', geoZoneId:ID.zoneA, warehouseId:ID.whA, storageType:StorageType.REFRIGERATED, qtyTotal:3000, qtyAvailable:2500, qtyReserved:500, harvestDate:ago(5),  expiryDate:from(20) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F3-002', farmerId:f3.id, farmId:farm3.id, productId:ID.mango,       grade:'A', geoZoneId:ID.zoneA, warehouseId:ID.whA, storageType:StorageType.REFRIGERATED, qtyTotal:1200, qtyAvailable:1100,              harvestDate:ago(3),  expiryDate:from(14) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F3-003', farmerId:f3.id, farmId:farm3.id, productId:ID.lemon,       grade:'A', geoZoneId:ID.zoneA,                     storageType:StorageType.REFRIGERATED, qtyTotal:500,  qtyAvailable:500,               harvestDate:ago(6),  expiryDate:from(25) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F3-004', farmerId:f3.id, farmId:farm3.id, productId:ID.pomegranate, grade:'A', geoZoneId:ID.zoneA,                     storageType:StorageType.REFRIGERATED, qtyTotal:600,  qtyAvailable:600,               harvestDate:ago(4),  expiryDate:from(30) } }),
    // Farmer 4
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F4-001', farmerId:f4.id, farmId:farm4.id, productId:ID.watermelon,  grade:'A', geoZoneId:ID.zoneA, warehouseId:ID.whA, storageType:StorageType.AMBIENT,       qtyTotal:15000,qtyAvailable:12000,qtyReserved:3000,harvestDate:ago(2),  expiryDate:from(15) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F4-002', farmerId:f4.id, farmId:farm4.id, productId:ID.cabbage,     grade:'A', geoZoneId:ID.zoneA, warehouseId:ID.whA, storageType:StorageType.AMBIENT,       qtyTotal:4000, qtyAvailable:3500,              harvestDate:ago(6),  expiryDate:from(20) } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F4-003', farmerId:f4.id, farmId:farm4.id, productId:ID.spinach,     grade:'A', geoZoneId:ID.zoneA,                     storageType:StorageType.REFRIGERATED, qtyTotal:300,  qtyAvailable:300,               harvestDate:ago(1),  expiryDate:from(4)  } }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F4-004', farmerId:f4.id, farmId:farm4.id, productId:ID.mint,        grade:'A', geoZoneId:ID.zoneA,                     storageType:StorageType.REFRIGERATED, qtyTotal:100,  qtyAvailable:100,               harvestDate:ago(1),  expiryDate:from(3)  } }),
    // Farmer 5 — تمور
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F5-001', farmerId:f5.id, farmId:farm5.id, productId:ID.ajwaDate,    grade:'A',     geoZoneId:ID.zoneB,                 storageType:StorageType.AMBIENT,       qtyTotal:2000, qtyAvailable:1800,              harvestDate:ago(30), expiryDate:from(180)} }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F5-002', farmerId:f5.id, farmId:farm5.id, productId:ID.ajwaDate,    grade:'EXTRA', geoZoneId:ID.zoneB,                 storageType:StorageType.AMBIENT,       qtyTotal:500,  qtyAvailable:450,               harvestDate:ago(30), expiryDate:from(180)} }),
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F5-003', farmerId:f5.id, farmId:farm5.id, productId:ID.sukkariDate, grade:'A',     geoZoneId:ID.zoneB,                 storageType:StorageType.AMBIENT,       qtyTotal:3000, qtyAvailable:2700,              harvestDate:ago(20), expiryDate:from(120)} }),
    // Farmer 6
    prisma.inventoryLot.create({ data: { lotNumber:'DEMO-LOT-F6-001', farmerId:f6.id, farmId:farm6.id, productId:ID.lentil,      grade:'A', geoZoneId:ID.zoneJed,               storageType:StorageType.AMBIENT,       qtyTotal:5000, qtyAvailable:5000,              harvestDate:ago(60), expiryDate:from(300)} }),
  ]);
  console.log('  ✅ 20 دفعة مخزون');

  // ══════════════════════════════════════════════════════════════════════════
  // 5. BUYERS — 5 مشترين
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🛒 إنشاء المشترين (5)...');

  const bu = await Promise.all([
    prisma.user.create({ data: { email:'buyer1@demo.jmart.sa', phone:'+966522000001', passwordHash:hash, userType:UserType.BUYER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'buyer2@demo.jmart.sa', phone:'+966522000002', passwordHash:hash, userType:UserType.BUYER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'buyer3@demo.jmart.sa', phone:'+966522000003', passwordHash:hash, userType:UserType.BUYER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'buyer4@demo.jmart.sa', phone:'+966522000004', passwordHash:hash, userType:UserType.BUYER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'buyer5@demo.jmart.sa', phone:'+966522000005', passwordHash:hash, userType:UserType.BUYER, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
  ]);

  const [b1,b2,b3,b4,b5] = await Promise.all([
    prisma.buyer.create({ data: { userId:bu[0].id, businessName:'مطعم الأصالة',           buyerType:BuyerType.RESTAURANT,       contactPersonName:'سعد الحارثي',   contactPhone:'+966522000001', kycStatus:KycStatus.APPROVED, accountTier:'STANDARD' as any, paymentTermsDays:14 } }),
    prisma.buyer.create({ data: { userId:bu[1].id, businessName:'سلسلة مطاعم الضيافة',   buyerType:BuyerType.RESTAURANT_CHAIN, contactPersonName:'فيصل المطيري',  contactPhone:'+966522000002', kycStatus:KycStatus.APPROVED, accountTier:'PREMIUM'  as any, paymentTermsDays:30, creditLimit:500000 } }),
    prisma.buyer.create({ data: { userId:bu[2].id, businessName:'شركة التموين الذهبي',   buyerType:BuyerType.CATERING,         contactPersonName:'محمد السالم',   contactPhone:'+966522000003', kycStatus:KycStatus.APPROVED, accountTier:'STANDARD' as any, paymentTermsDays:21 } }),
    prisma.buyer.create({ data: { userId:bu[3].id, businessName:'تجار الجملة المتحدون', buyerType:BuyerType.WHOLESALE_TRADER, contactPersonName:'عمر الزهراني',  contactPhone:'+966522000004', kycStatus:KycStatus.APPROVED, accountTier:'PREMIUM'  as any, paymentTermsDays:45, creditLimit:1000000 } }),
    prisma.buyer.create({ data: { userId:bu[4].id, businessName:'مركز توزيع الأغذية',   buyerType:BuyerType.WHOLESALE_TRADER, contactPersonName:'أحمد الغامدي',  contactPhone:'+966522000005', kycStatus:KycStatus.APPROVED, accountTier:'STANDARD' as any, paymentTermsDays:30 } }),
  ]);
  console.log('  ✅ 5 مشترين');

  // ══════════════════════════════════════════════════════════════════════════
  // 6. DRIVERS — 3 سائقين
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🚛 إنشاء السائقين (3)...');

  const du = await Promise.all([
    prisma.user.create({ data: { email:'driver1@demo.jmart.sa', phone:'+966533000001', passwordHash:hash, userType:'DRIVER' as any, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'driver2@demo.jmart.sa', phone:'+966533000002', passwordHash:hash, userType:'DRIVER' as any, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
    prisma.user.create({ data: { email:'driver3@demo.jmart.sa', phone:'+966533000003', passwordHash:hash, userType:'DRIVER' as any, status:UserStatus.ACTIVE, emailVerifiedAt:new Date() } }),
  ]);

  const [drv1,drv2,drv3] = await Promise.all([
    prisma.driver.create({ data: { userId:du[0].id, fullName:'أحمد الدوسري',  nationalId:'1099887766', licenseNumber:'LIC-D001', licenseExpiry:from(365), vehiclePlate:'أ ب ت 1234', vehicleType:VehicleType.MEDIUM_TRUCK, vehicleCapacityKg:5000,  hasRefrigeration:true,  status:DriverStatus.ACTIVE, ratingAvg:4.8, ratingCount:56 } }),
    prisma.driver.create({ data: { userId:du[1].id, fullName:'طارق العنزي',   nationalId:'1099887767', licenseNumber:'LIC-D002', licenseExpiry:from(200), vehiclePlate:'ج ح خ 5678', vehicleType:VehicleType.SMALL_TRUCK,  vehicleCapacityKg:2000,  hasRefrigeration:false, status:DriverStatus.ACTIVE, ratingAvg:4.5, ratingCount:30 } }),
    prisma.driver.create({ data: { userId:du[2].id, fullName:'يوسف المزروع', nationalId:'1099887768', licenseNumber:'LIC-D003', licenseExpiry:from(180), vehiclePlate:'د ذ ر 9012', vehicleType:VehicleType.MEDIUM_TRUCK, vehicleCapacityKg:8000,  hasRefrigeration:true,  status:DriverStatus.ACTIVE, ratingAvg:4.9, ratingCount:88 } }),
  ]);

  await Promise.all([
    prisma.driverZoneAssignment.create({ data: { driverId:drv1.id, zoneId:ID.zoneA, canPickup:true, canDeliver:true } }),
    prisma.driverZoneAssignment.create({ data: { driverId:drv1.id, zoneId:ID.zoneB, canPickup:true, canDeliver:true } }),
    prisma.driverZoneAssignment.create({ data: { driverId:drv2.id, zoneId:ID.zoneA, canPickup:true, canDeliver:true } }),
    prisma.driverZoneAssignment.create({ data: { driverId:drv3.id, zoneId:ID.zoneB, canPickup:true, canDeliver:true } }),
    prisma.driverZoneAssignment.create({ data: { driverId:drv3.id, zoneId:ID.zoneJed, canPickup:true, canDeliver:true } }),
  ]);
  console.log('  ✅ 3 سائقين');

  // ══════════════════════════════════════════════════════════════════════════
  // 7. ORDERS — 15 طلب بحالات مختلفة
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 إنشاء الطلبات (15 طلب)...');

  const mkOrder = (num: string, buyerId: string, pZone: string, dZone: string, addr: string, sub: number, log: number, items: any[], status: OrderStatus, extra?: any) =>
    prisma.order.create({ data: { orderNumber:`DEMO-ORD-${num}`, orderType:OrderType.SPOT, buyerId, pickupZoneId:pZone, deliveryZoneId:dZone, deliveryAddress:addr, subtotal:sub, logisticsFee:log||0, taxAmount:Math.round(sub*0.15*100)/100, totalAmount:Math.round((sub+log)*1.15*100)/100, status, ...extra } });

  const mkItem = (orderId: string, productId: string, farmerId: string, catId: string | null, qty: number, price: number, extra?: any) =>
    prisma.orderItem.create({ data: { orderId, productId, farmerId, catalogItemId:catId||null, requestedQty:qty, confirmedQty:extra?.confirmed||null, deliveredQty:extra?.delivered||null, unitPrice:price, subtotal:Math.round(qty*price*100)/100, pricedLockedAt:new Date(), grade:'A' } });

  // ─ SUBMITTED ──────────────────────────────────────────────────────────────
  const o1 = await mkOrder('001', b1.id, ID.zoneA, ID.zoneA, 'شارع الأمير سلطان، الرياض',    700,   50,  [], OrderStatus.SUBMITTED, { requestedDeliveryAt:from(2) });
  await mkItem(o1.id, ID.tomato,   f1.id, cats[0].id,  200, 3.5);

  const o2 = await mkOrder('002', b3.id, ID.zoneB, ID.zoneA, 'طريق الملك فهد، شمال الرياض', 1800,  100, [], OrderStatus.SUBMITTED, { requestedDeliveryAt:from(3) });
  await mkItem(o2.id, ID.onion,   f2.id, cats[7].id,  500, 1.8);
  await mkItem(o2.id, ID.potato,  f2.id, cats[8].id,  400, 1.5);

  // ─ CONFIRMED ──────────────────────────────────────────────────────────────
  const o3 = await mkOrder('003', b2.id, ID.zoneB, ID.zoneA, 'طريق الملك فهد، الرياض',     21000, 350, [], OrderStatus.CONFIRMED, { requestedDeliveryAt:from(1), confirmedDeliveryAt:from(1) });
  await mkItem(o3.id, ID.tomato,  f2.id, cats[6].id,  2000, 3.2, { confirmed:2000 });
  await mkItem(o3.id, ID.orange,  f3.id, cats[12].id, 1000, 5.5, { confirmed:1000 });
  await mkItem(o3.id, ID.carrot,  f2.id, cats[10].id,  500, 2.5, { confirmed:500  });

  const o4 = await mkOrder('004', b4.id, ID.zoneA, ID.zoneA, 'المنطقة الصناعية، الرياض',    6000,  200, [], OrderStatus.CONFIRMED, { requestedDeliveryAt:from(2), confirmedDeliveryAt:from(2) });
  await mkItem(o4.id, ID.watermelon, f4.id, cats[18].id, 3000, 1.8, { confirmed:3000 });
  await mkItem(o4.id, ID.honeydew,   f4.id, cats[19].id,  200, 3.0, { confirmed:200  });

  // ─ IN_TRANSIT ─────────────────────────────────────────────────────────────
  const o5 = await mkOrder('005', b1.id, ID.zoneB, ID.zoneA, 'حي السفارات، الرياض',         4400,  200, [], OrderStatus.IN_TRANSIT, { requestedDeliveryAt:ago(1), confirmedDeliveryAt:ago(1) });
  await mkItem(o5.id, ID.orange, f3.id, cats[12].id, 800, 5.5, { confirmed:800 });

  const o6 = await mkOrder('006', b5.id, ID.zoneA, ID.zoneA, 'طريق عثمان بن عفان، الرياض', 5250,  150, [], OrderStatus.IN_TRANSIT, { requestedDeliveryAt:ago(1), confirmedDeliveryAt:ago(1) });
  await mkItem(o6.id, ID.tomato,    f1.id, cats[0].id,  1000, 3.5, { confirmed:1000 });
  await mkItem(o6.id, ID.cucumber,  f1.id, cats[2].id,   500, 2.8, { confirmed:500  });

  const o7 = await mkOrder('007', b2.id, ID.zoneA, ID.zoneA, 'مجمع العليا التجاري، الرياض',  9000, 300, [], OrderStatus.IN_TRANSIT, { requestedDeliveryAt:ago(1), confirmedDeliveryAt:ago(2) });
  await mkItem(o7.id, ID.mango,      f3.id, cats[15].id, 500,  8.0, { confirmed:500  });
  await mkItem(o7.id, ID.grape,      f3.id, cats[14].id, 300,  9.5, { confirmed:300  });
  await mkItem(o7.id, ID.apple,      f3.id, cats[13].id, 300,  7.0, { confirmed:300  });

  // ─ DELIVERED ──────────────────────────────────────────────────────────────
  const o8 = await mkOrder('008', b2.id, ID.zoneA, ID.zoneA, 'مجمع العليا، الرياض',          2100, 150, [], OrderStatus.DELIVERED, { requestedDeliveryAt:ago(10), confirmedDeliveryAt:ago(10), actualDeliveryAt:ago(9) });
  await mkItem(o8.id, ID.tomato, f1.id, cats[0].id, 600, 3.5, { confirmed:600, delivered:580 });

  const o9 = await mkOrder('009', b4.id, ID.zoneB, ID.zoneA, 'طريق الملك عبدالله، الرياض',  4500, 200, [], OrderStatus.DELIVERED, { requestedDeliveryAt:ago(7),  confirmedDeliveryAt:ago(7),  actualDeliveryAt:ago(6)  });
  await mkItem(o9.id, ID.onion,   f2.id, cats[7].id,  1500, 1.8, { confirmed:1500, delivered:1500 });
  await mkItem(o9.id, ID.potato,  f2.id, cats[8].id,  1000, 1.5, { confirmed:1000, delivered:980  });

  const o10 = await mkOrder('010', b3.id, ID.zoneA, ID.zoneA, 'شارع التخصصي، الرياض',       6250, 250, [], OrderStatus.DELIVERED, { requestedDeliveryAt:ago(14), confirmedDeliveryAt:ago(14), actualDeliveryAt:ago(13) });
  await mkItem(o10.id, ID.ajwaDate,   f5.id, cats[28].id, 100, 45.0, { confirmed:100, delivered:100 });
  await mkItem(o10.id, ID.sukkariDate,f5.id, cats[30].id, 100, 35.0, { confirmed:100, delivered:100 });

  // ─ COMPLETED ──────────────────────────────────────────────────────────────
  const o11 = await mkOrder('011', b5.id, ID.zoneA, ID.zoneA, 'الدائري الشمالي، الرياض',     8750, 300, [], OrderStatus.COMPLETED, { requestedDeliveryAt:ago(20), confirmedDeliveryAt:ago(20), actualDeliveryAt:ago(19) });
  await mkItem(o11.id, ID.watermelon, f4.id, cats[18].id, 3000, 1.8, { confirmed:3000, delivered:2950 });
  await mkItem(o11.id, ID.honeydew,   f4.id, cats[19].id,  500, 3.0, { confirmed:500,  delivered:500  });

  const o12 = await mkOrder('012', b1.id, ID.zoneB, ID.zoneA, 'حي النخيل، الرياض',          3600, 180, [], OrderStatus.COMPLETED, { requestedDeliveryAt:ago(25), confirmedDeliveryAt:ago(25), actualDeliveryAt:ago(24) });
  await mkItem(o12.id, ID.orange, f3.id, cats[12].id, 400, 5.5, { confirmed:400, delivered:400 });
  await mkItem(o12.id, ID.lemon,  f3.id, cats[17].id, 200, 4.5, { confirmed:200, delivered:200 });

  // ─ CANCELLED ──────────────────────────────────────────────────────────────
  const o13 = await mkOrder('013', b1.id, ID.zoneA, ID.zoneA, 'شارع التحلية، الرياض',         560,   0, [], OrderStatus.CANCELLED, { cancellationReason:'ألغى المشتري قبل التأكيد' });
  await mkItem(o13.id, ID.cucumber, f1.id, cats[2].id, 200, 2.8);

  const o14 = await mkOrder('014', b3.id, ID.zoneB, ID.zoneA, 'طريق الأمير فيصل، الرياض',   1800,   0, [], OrderStatus.CANCELLED, { cancellationReason:'نفاد المخزون لدى المزارع' });
  await mkItem(o14.id, ID.tomato, f2.id, cats[6].id, 500, 3.2);

  // ─ SETTLED ────────────────────────────────────────────────────────────────
  const o15 = await mkOrder('015', b4.id, ID.zoneA, ID.zoneA, 'المنطقة الصناعية الثانية',   22500, 400, [], OrderStatus.SETTLED, { requestedDeliveryAt:ago(30), confirmedDeliveryAt:ago(30), actualDeliveryAt:ago(29) });
  await mkItem(o15.id, ID.tomato,   f2.id, cats[6].id,  3000, 3.2, { confirmed:3000, delivered:3000 });
  await mkItem(o15.id, ID.onion,    f2.id, cats[7].id,  2000, 1.8, { confirmed:2000, delivered:2000 });
  await mkItem(o15.id, ID.potato,   f2.id, cats[8].id,  2000, 1.5, { confirmed:2000, delivered:2000 });

  console.log('  ✅ 15 طلب (مقدم×2، مؤكد×2، في الطريق×3، مسلّم×3، مكتمل×2، ملغي×2، مسوّى×1)');

  // ══════════════════════════════════════════════════════════════════════════
  // 8. INVOICES — فواتير
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🧾 إنشاء الفواتير (5)...');

  const inv = await Promise.all([
    prisma.invoice.create({ data: { invoiceNumber:'DEMO-INV-001', invoiceType:InvoiceType.SUPPLIER_INVOICE, orderId:o8.id,  issuerId:f1.id, issuerType:'FARMER', recipientId:b2.id, recipientType:'BUYER', lineItems:[{description:'طماطم A – 580 كغ', qty:580, unitPrice:3.5, total:2030}],                                                           subtotal:2030,  taxRate:0.15, taxAmount:304.5,  totalAmount:2334.5,  currency:'SAR', status:InvoiceStatus.ISSUED,          generatedAt:ago(9),  dueDate:from(5) } }),
    prisma.invoice.create({ data: { invoiceNumber:'DEMO-INV-002', invoiceType:InvoiceType.SUPPLIER_INVOICE, orderId:o9.id,  issuerId:f2.id, issuerType:'FARMER', recipientId:b4.id, recipientType:'BUYER', lineItems:[{description:'بصل A – 1500 كغ', qty:1500, unitPrice:1.8, total:2700},{description:'بطاطس A – 980 كغ', qty:980, unitPrice:1.5, total:1470}], subtotal:4170,  taxRate:0.15, taxAmount:625.5,  totalAmount:4795.5,  currency:'SAR', status:InvoiceStatus.PAID,            generatedAt:ago(6),  dueDate:from(14) } }),
    prisma.invoice.create({ data: { invoiceNumber:'DEMO-INV-003', invoiceType:InvoiceType.SUPPLIER_INVOICE, orderId:o10.id, issuerId:f5.id, issuerType:'FARMER', recipientId:b3.id, recipientType:'BUYER', lineItems:[{description:'تمر عجوة A – 100 كغ', qty:100, unitPrice:45, total:4500},{description:'تمر سكري A – 100 كغ', qty:100, unitPrice:35, total:3500}],   subtotal:8000,  taxRate:0.15, taxAmount:1200,   totalAmount:9200,    currency:'SAR', status:InvoiceStatus.PARTIALLY_PAID, generatedAt:ago(13), dueDate:from(1)  } }),
    prisma.invoice.create({ data: { invoiceNumber:'DEMO-INV-004', invoiceType:InvoiceType.SUPPLIER_INVOICE, orderId:o11.id, issuerId:f4.id, issuerType:'FARMER', recipientId:b5.id, recipientType:'BUYER', lineItems:[{description:'بطيخ A – 2950 كغ', qty:2950, unitPrice:1.8, total:5310},{description:'شمام A – 500 كغ', qty:500, unitPrice:3.0, total:1500}],      subtotal:6810,  taxRate:0.15, taxAmount:1021.5, totalAmount:7831.5,  currency:'SAR', status:InvoiceStatus.PAID,            generatedAt:ago(19), dueDate:ago(5)   } }),
    prisma.invoice.create({ data: { invoiceNumber:'DEMO-INV-005', invoiceType:InvoiceType.SUPPLIER_INVOICE, orderId:o15.id, issuerId:f2.id, issuerType:'FARMER', recipientId:b4.id, recipientType:'BUYER', lineItems:[{description:'طماطم 3000 كغ', qty:3000, unitPrice:3.2, total:9600},{description:'بصل 2000 كغ', qty:2000, unitPrice:1.8, total:3600},{description:'بطاطس 2000 كغ', qty:2000, unitPrice:1.5, total:3000}], subtotal:16200, taxRate:0.15, taxAmount:2430,   totalAmount:18630,   currency:'SAR', status:InvoiceStatus.PAID,            generatedAt:ago(29), dueDate:ago(15)  } }),
  ]);
  console.log('  ✅ 5 فواتير (صادرة / مدفوعة / مدفوعة جزئياً)');

  // ══════════════════════════════════════════════════════════════════════════
  // 9. PAYOUTS — مدفوعات للمزارعين
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n💰 إنشاء المدفوعات (4)...');

  await Promise.all([
    prisma.payout.create({ data: { payoutNumber:'DEMO-PAY-001', recipientId:f2.id, recipientType:'FARMER', farmerId:f2.id, orderId:o15.id, invoiceId:inv[4].id, grossAmount:16200, commissionDeducted:486,  netAmount:15714, currency:'SAR', status:PayoutStatus.COMPLETED, processedAt:ago(20) } }),
    prisma.payout.create({ data: { payoutNumber:'DEMO-PAY-002', recipientId:f4.id, recipientType:'FARMER', farmerId:f4.id, orderId:o11.id, invoiceId:inv[3].id, grossAmount:6810,  commissionDeducted:204.3,netAmount:6605.7,currency:'SAR', status:PayoutStatus.COMPLETED, processedAt:ago(12) } }),
    prisma.payout.create({ data: { payoutNumber:'DEMO-PAY-003', recipientId:f1.id, recipientType:'FARMER', farmerId:f1.id, orderId:o8.id,  invoiceId:inv[0].id, grossAmount:2030,  commissionDeducted:60.9, netAmount:1969.1,currency:'SAR', status:PayoutStatus.QUEUED } }),
    prisma.payout.create({ data: { payoutNumber:'DEMO-PAY-004', recipientId:f5.id, recipientType:'FARMER', farmerId:f5.id, orderId:o10.id, invoiceId:inv[2].id, grossAmount:8000,  commissionDeducted:320,  netAmount:7680,  currency:'SAR', status:PayoutStatus.QUEUED } }),
  ]);
  console.log('  ✅ 4 مدفوعات (2 مكتملة، 2 بانتظار)');

  // ══════════════════════════════════════════════════════════════════════════
  // 10. SUPPLY CONTRACTS — عقود توريد
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📄 إنشاء عقود التوريد (3)...');

  const [cnt1, cnt2, cnt3] = await Promise.all([
    prisma.supplyContract.create({ data: { contractNumber:'DEMO-CNT-001', contractType:ContractType.EXCLUSIVE, farmerId:f2.id, buyerId:b2.id, title:'عقد توريد خضروات موسم 2026', description:'عقد حصري لتوريد الطماطم والبصل طوال الموسم', startDate:new Date('2026-06-01'), endDate:new Date('2026-09-30'), totalVolumeMin:80000, totalVolumeMax:120000, farmerSignedAt:ago(5),  buyerSignedAt:ago(4),  status:ContractStatus.ACTIVE  } }),
    prisma.supplyContract.create({ data: { contractNumber:'DEMO-CNT-002', contractType:ContractType.SUPPLY,    farmerId:f5.id, buyerId:b3.id, title:'عقد توريد تمور رمضان 2026',  description:'توريد تمور عجوة وسكري خلال شهر رمضان',      startDate:new Date('2026-02-01'), endDate:new Date('2026-04-30'), totalVolumeMin:5000,  totalVolumeMax:8000,  farmerSignedAt:ago(10), buyerSignedAt:ago(9),  status:ContractStatus.ACTIVE  } }),
    prisma.supplyContract.create({ data: { contractNumber:'DEMO-CNT-003', contractType:ContractType.SUPPLY,    farmerId:f3.id, buyerId:b4.id, title:'عقد توريد فواكه سنوي',       description:'توريد منتظم للفواكه الطازجة للسوق المركزي',  startDate:new Date('2026-01-01'), endDate:new Date('2026-12-31'), totalVolumeMin:20000, totalVolumeMax:40000,                                           status:ContractStatus.PENDING_SIGNATURES } }),
  ]);

  await Promise.all([
    prisma.contractItem.create({ data: { contractId:cnt1.id, productId:ID.tomato, grade:'A', qtyPerPeriod:5000, periodUnit:'WEEK', tolerancePct:10, pricePerUnit:3.2  } }),
    prisma.contractItem.create({ data: { contractId:cnt1.id, productId:ID.onion,  grade:'A', qtyPerPeriod:2000, periodUnit:'WEEK', tolerancePct:10, pricePerUnit:1.8  } }),
    prisma.contractItem.create({ data: { contractId:cnt2.id, productId:ID.ajwaDate,    grade:'A', qtyPerPeriod:500,  periodUnit:'WEEK', tolerancePct:5,  pricePerUnit:42.0 } }),
    prisma.contractItem.create({ data: { contractId:cnt2.id, productId:ID.sukkariDate, grade:'A', qtyPerPeriod:800,  periodUnit:'WEEK', tolerancePct:5,  pricePerUnit:32.0 } }),
    prisma.contractItem.create({ data: { contractId:cnt3.id, productId:ID.orange, grade:'A', qtyPerPeriod:1000, periodUnit:'WEEK', tolerancePct:10, pricePerUnit:5.2  } }),
    prisma.contractItem.create({ data: { contractId:cnt3.id, productId:ID.mango,  grade:'A', qtyPerPeriod:500,  periodUnit:'WEEK', tolerancePct:10, pricePerUnit:7.5  } }),
  ]);
  console.log('  ✅ 3 عقود توريد (2 نشط، 1 بانتظار التوقيع)');

  // ══════════════════════════════════════════════════════════════════════════
  // 11. QUALITY INSPECTIONS — فحوصات الجودة
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🔬 إنشاء فحوصات الجودة (6)...');

  await Promise.all([
    prisma.qualityInspection.create({ data: { inspectionNumber:'DEMO-QC-001', lotId:lots[0].id,  inspectorId:ID.qcInternal, inspectionType:InspectionType.INBOUND,      declaredWeightKg:2000, actualWeightKg:1980, weightVariancePct:1.0,  temperatureOnArrival:8,  tempCompliant:true,  visualGrade:'A', defectPct:1.5, result:InspectionResult.PASSED,       passedQty:1980, rejectedQty:20,  completedAt:ago(3) } }),
    prisma.qualityInspection.create({ data: { inspectionNumber:'DEMO-QC-002', lotId:lots[4].id,  inspectorId:ID.qcInternal, inspectionType:InspectionType.INBOUND,      declaredWeightKg:8000, actualWeightKg:7950, weightVariancePct:0.6,  temperatureOnArrival:9,  tempCompliant:true,  visualGrade:'A', defectPct:2.0, result:InspectionResult.PASSED,       passedQty:7950, rejectedQty:50,  completedAt:ago(2) } }),
    prisma.qualityInspection.create({ data: { inspectionNumber:'DEMO-QC-003', lotId:lots[8].id,  inspectorId:ID.qcInternal, inspectionType:InspectionType.INBOUND,      declaredWeightKg:3000, actualWeightKg:2980, weightVariancePct:0.7,  temperatureOnArrival:7,  tempCompliant:true,  visualGrade:'A', defectPct:1.0, result:InspectionResult.PASSED,       passedQty:2980, rejectedQty:20,  completedAt:ago(5) } }),
    prisma.qualityInspection.create({ data: { inspectionNumber:'DEMO-QC-004', lotId:lots[12].id, inspectorId:ID.qcInternal, inspectionType:InspectionType.INBOUND,      declaredWeightKg:15000,actualWeightKg:14850,weightVariancePct:1.0,  temperatureOnArrival:18, tempCompliant:true,  visualGrade:'A', defectPct:2.5, result:InspectionResult.PASSED,       passedQty:14850,rejectedQty:150, completedAt:ago(2) } }),
    prisma.qualityInspection.create({ data: { inspectionNumber:'DEMO-QC-005', lotId:lots[1].id,  inspectorId:ID.qcInternal, inspectionType:InspectionType.PRE_DISPATCH,  declaredWeightKg:1500, actualWeightKg:1490, weightVariancePct:0.7,  temperatureOnArrival:10, tempCompliant:true,  visualGrade:'A', defectPct:0.5, result:InspectionResult.PASSED,       passedQty:1490, rejectedQty:10,  completedAt:ago(1) } }),
    prisma.qualityInspection.create({ data: { inspectionNumber:'DEMO-QC-006', lotId:lots[5].id,  inspectorId:ID.qcInternal, inspectionType:InspectionType.INBOUND,      declaredWeightKg:5000, actualWeightKg:4800, weightVariancePct:4.0,  temperatureOnArrival:22, tempCompliant:true,  visualGrade:'B', defectPct:8.0, result:InspectionResult.PARTIAL_PASS, passedQty:4400, rejectedQty:400, completedAt:ago(7), supervisorNotes:'عيوب طفيفة في الحجم، مقبول درجة B' } }),
  ]);
  console.log('  ✅ 6 فحوصات جودة');

  // ══════════════════════════════════════════════════════════════════════════
  // 12. RATINGS — التقييمات
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n⭐ إنشاء التقييمات (10)...');

  await Promise.all([
    prisma.rating.create({ data: { raterId:bu[1].id, raterType:'BUYER', ratedId:fu[1].id, ratedType:'FARMER', farmerId:f2.id, orderId:o15.id, score:5.0, comment:'توريد ممتاز وفي الوقت المحدد، جودة عالية جداً' } }),
    prisma.rating.create({ data: { raterId:bu[3].id, raterType:'BUYER', ratedId:fu[1].id, ratedType:'FARMER', farmerId:f2.id, orderId:o9.id,  score:4.5, comment:'جودة جيدة، تأخر بسيط في التوصيل' } }),
    prisma.rating.create({ data: { raterId:bu[0].id, raterType:'BUYER', ratedId:fu[0].id, ratedType:'FARMER', farmerId:f1.id, orderId:o8.id,  score:4.5, comment:'طماطم طازجة، لكن الكمية كانت أقل من المتفق' } }),
    prisma.rating.create({ data: { raterId:bu[2].id, raterType:'BUYER', ratedId:fu[4].id, ratedType:'FARMER', farmerId:f5.id, orderId:o10.id, score:5.0, comment:'تمور فاخرة جداً وتغليف احترافي' } }),
    prisma.rating.create({ data: { raterId:bu[4].id, raterType:'BUYER', ratedId:fu[3].id, ratedType:'FARMER', farmerId:f4.id, orderId:o11.id, score:4.0, comment:'بطيخ طازج، بعض الوحدات كانت صغيرة' } }),
    prisma.rating.create({ data: { raterId:bu[0].id, raterType:'BUYER', ratedId:fu[2].id, ratedType:'FARMER', farmerId:f3.id, orderId:o12.id, score:5.0, comment:'فواكه لذيذة وتوصيل سريع' } }),
    // تقييمات المزارعين للمشترين
    prisma.rating.create({ data: { raterId:fu[1].id, raterType:'FARMER', ratedId:bu[1].id, ratedType:'BUYER', buyerId:b2.id, orderId:o15.id, score:5.0, comment:'دفع في الموعد، تواصل ممتاز' } }),
    prisma.rating.create({ data: { raterId:fu[0].id, raterType:'FARMER', ratedId:bu[1].id, ratedType:'BUYER', buyerId:b2.id, orderId:o8.id,  score:4.0, comment:'دفع متأخر قليلاً' } }),
    prisma.rating.create({ data: { raterId:fu[4].id, raterType:'FARMER', ratedId:bu[2].id, ratedType:'BUYER', buyerId:b3.id, orderId:o10.id, score:5.0, comment:'مشتري محترف ودفع فوري' } }),
    prisma.rating.create({ data: { raterId:fu[3].id, raterType:'FARMER', ratedId:bu[4].id, ratedType:'BUYER', buyerId:b5.id, orderId:o11.id, score:4.5, comment:'تعامل جيد ودفع منتظم' } }),
  ]);
  console.log('  ✅ 10 تقييمات');

  // ══════════════════════════════════════════════════════════════════════════
  // 13. DISPUTES — نزاعات
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n⚠️  إنشاء النزاعات (2)...');

  await Promise.all([
    prisma.dispute.create({ data: { disputeNumber:'DEMO-DSP-001', orderId:o8.id,  filedById:bu[1].id, filedByType:'BUYER', againstId:fu[0].id, againstType:'FARMER', disputeCategory:'QUANTITY' as any, description:'استلمنا 580 كغ بدلاً من 600 كغ. نطلب تعويضاً عن 20 كغ الناقصة بسعر 3.5 ريال = 70 ريال.', claimedAmount:70,   status:DisputeStatus.FILED,          evidenceDeadline:from(3) } }),
    prisma.dispute.create({ data: { disputeNumber:'DEMO-DSP-002', orderId:o9.id,  filedById:bu[3].id, filedByType:'BUYER', againstId:fu[1].id, againstType:'FARMER', disputeCategory:'QUALITY'  as any, description:'جزء من البطاطس المستلمة (حوالي 100 كغ) كانت تالفة وغير صالحة للبيع.', claimedAmount:150,  status:DisputeStatus.UNDER_REVIEW,   evidenceDeadline:from(1), assignedToId:ID.adminInternal, assignedAt:ago(3) } }),
  ]);
  console.log('  ✅ 2 نزاع');

  // ══════════════════════════════════════════════════════════════════════════
  // 14. NOTIFICATIONS — إشعارات
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🔔 إنشاء الإشعارات (10)...');

  await Promise.all([
    prisma.notification.create({ data: { recipientId:bu[0].id, recipientType:'BUYER',  notificationType:'ORDER_CONFIRMED',  title:'تم تأكيد طلبك',         body:'تم تأكيد الطلب DEMO-ORD-005 وجارٍ التوصيل',             channels:['IN_APP'], isRead:false } }),
    prisma.notification.create({ data: { recipientId:fu[0].id, recipientType:'FARMER', notificationType:'NEW_ORDER',        title:'طلب جديد',               body:'وصلك طلب جديد DEMO-ORD-001 بانتظار موافقتك',            channels:['IN_APP'], isRead:false } }),
    prisma.notification.create({ data: { recipientId:fu[1].id, recipientType:'FARMER', notificationType:'NEW_ORDER',        title:'طلب جديد',               body:'وصلك طلب جديد DEMO-ORD-002 بانتظار موافقتك',            channels:['IN_APP'], isRead:true  } }),
    prisma.notification.create({ data: { recipientId:bu[1].id, recipientType:'BUYER',  notificationType:'INVOICE_ISSUED',   title:'فاتورة جديدة',           body:'صدرت فاتورة DEMO-INV-001 بقيمة 2,334.5 ريال',           channels:['IN_APP'], isRead:false } }),
    prisma.notification.create({ data: { recipientId:fu[0].id, recipientType:'FARMER', notificationType:'DISPUTE_OPENED',   title:'نزاع مفتوح',             body:'أُفتح نزاع DEMO-DSP-001 على طلب DEMO-ORD-008',           channels:['IN_APP'], isRead:false } }),
    prisma.notification.create({ data: { recipientId:fu[1].id, recipientType:'FARMER', notificationType:'PAYOUT_PROCESSED', title:'مدفوعاتك جاهزة',         body:'تمت معالجة مدفوعاتك DEMO-PAY-001 بمبلغ 15,714 ريال',     channels:['IN_APP'], isRead:true  } }),
    prisma.notification.create({ data: { recipientId:bu[2].id, recipientType:'BUYER',  notificationType:'CONTRACT_PENDING', title:'عقد بانتظار',            body:'العقد DEMO-CNT-003 يحتاج توقيعك',                        channels:['IN_APP'], isRead:false } }),
    prisma.notification.create({ data: { recipientId:fu[2].id, recipientType:'FARMER', notificationType:'CONTRACT_PENDING', title:'عقد بانتظار',            body:'العقد DEMO-CNT-003 يحتاج توقيعك',                        channels:['IN_APP'], isRead:false } }),
    prisma.notification.create({ data: { recipientId:du[0].id, recipientType:'DRIVER', notificationType:'NEW_DELIVERY',     title:'رحلة جديدة',             body:'طلب توصيل جديد في نطاق أ، يرجى القبول',                  channels:['IN_APP'], isRead:false } }),
    prisma.notification.create({ data: { recipientId:bu[3].id, recipientType:'BUYER',  notificationType:'DISPUTE_REVIEW',   title:'نزاع قيد المراجعة',      body:'نزاعك DEMO-DSP-002 قيد المراجعة من فريق جمارت',          channels:['IN_APP'], isRead:true  } }),
  ]);

  // Seed at least one internal-staff notification so the Admin /notifications
  // page isn't misleadingly empty during demos. Recipient resolved by email
  // so we don't need to import the admin id from seed.ts.
  const admin = await prisma.user.findUnique({ where: { email: 'admin@jmart.sa' } });
  if (admin) {
    await prisma.notification.createMany({
      data: [
        { recipientId: admin.id, recipientType: 'INTERNAL', notificationType: 'DISPUTE_OPENED',
          title: 'نزاع جديد بانتظار المراجعة', body: 'NZA-001 من المشتري شركة الخير — يحتاج تعيين',
          channels: ['IN_APP'], isRead: false },
        { recipientId: admin.id, recipientType: 'INTERNAL', notificationType: 'NEW_ORDER',
          title: 'طلب كبير غير عادي', body: 'الطلب DEMO-ORD-008 تجاوز 25,000 ريال — مراجعة موصى بها',
          channels: ['IN_APP'], isRead: false },
        { recipientId: admin.id, recipientType: 'INTERNAL', notificationType: 'PAYOUT_PROCESSED',
          title: 'مدفوعات بانتظار الاعتماد', body: '٣ مدفوعات للمزارعين بانتظار اعتمادك المالي',
          channels: ['IN_APP'], isRead: true },
      ],
    });
  }
  console.log('  ✅ إشعارات (مستخدمون + إدارة)');

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🎉 اكتملت البيانات التجريبية الشاملة!');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('المستخدمون (كلمة المرور: Demo@Jmart2026!)');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('المزارعون:');
  console.log('  farmer1@demo.jmart.sa  مزرعة النخيل الذهبي       (خضروات، RUH-A)');
  console.log('  farmer2@demo.jmart.sa  تعاونية القصيم الزراعية   (خضروات+بصل، RUH-B)');
  console.log('  farmer3@demo.jmart.sa  مزرعة الربيع للفواكه      (فواكه، RUH-A)');
  console.log('  farmer4@demo.jmart.sa  مجمع المدينة الزراعي      (متنوع، RUH-A)');
  console.log('  farmer5@demo.jmart.sa  مزرعة النجد للتمور        (تمور، RUH-B)');
  console.log('  farmer6@demo.jmart.sa  مزارع الحجاز              (قيد المراجعة)');
  console.log('المشترون:');
  console.log('  buyer1@demo.jmart.sa   مطعم الأصالة');
  console.log('  buyer2@demo.jmart.sa   سلسلة مطاعم الضيافة (PREMIUM)');
  console.log('  buyer3@demo.jmart.sa   شركة التموين الذهبي');
  console.log('  buyer4@demo.jmart.sa   تجار الجملة المتحدون (PREMIUM)');
  console.log('  buyer5@demo.jmart.sa   مركز توزيع الأغذية');
  console.log('السائقون:');
  console.log('  driver1@demo.jmart.sa  أحمد الدوسري  (شاحنة متوسطة مبردة)');
  console.log('  driver2@demo.jmart.sa  طارق العنزي   (شاحنة صغيرة)');
  console.log('  driver3@demo.jmart.sa  يوسف المزروع  (شاحنة كبيرة مبردة)');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('البيانات:');
  console.log('  35 عرض منتج  |  20 دفعة مخزون  |  15 طلب  |  5 فواتير');
  console.log('  4 مدفوعات   |  3 عقود          |  6 فحوصات جودة');
  console.log('  2 نزاع       |  10 تقييمات      |  10 إشعارات');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('للحذف: pnpm ts-node prisma/demo-clear.ts');
}

main()
  .catch((e) => { console.error('❌ فشلت العملية:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
