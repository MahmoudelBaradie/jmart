import {
  PrismaClient, InternalRole, UserType, UserStatus,
  ZoneLevel, ZoneStatus, StorageType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Permissions ──────────────────────────────────────────
  const permissions = [
    { code: 'orders:read',          module: 'orders',    description: 'View orders' },
    { code: 'orders:write',         module: 'orders',    description: 'Create/update orders' },
    { code: 'orders:approve',       module: 'orders',    description: 'Approve orders' },
    { code: 'contracts:read',       module: 'contracts', description: 'View contracts' },
    { code: 'contracts:write',      module: 'contracts', description: 'Create/update contracts' },
    { code: 'contracts:approve',    module: 'contracts', description: 'Approve contracts' },
    { code: 'finance:read',         module: 'financial', description: 'View financial data' },
    { code: 'finance:payout_approve', module: 'financial', description: 'Approve payouts' },
    { code: 'finance:refund_approve', module: 'financial', description: 'Approve refunds' },
    { code: 'disputes:read',        module: 'disputes',  description: 'View disputes' },
    { code: 'disputes:write',       module: 'disputes',  description: 'Manage disputes' },
    { code: 'geo:configure',        module: 'geo',       description: 'Configure geo zones' },
    { code: 'inventory:read',       module: 'inventory', description: 'View inventory' },
    { code: 'inventory:write',      module: 'inventory', description: 'Manage inventory' },
    { code: 'quality:inspect',      module: 'quality',   description: 'Perform quality inspections' },
    { code: 'users:manage',         module: 'users',     description: 'Manage users' },
    { code: 'audit:read',           module: 'audit',     description: 'View audit logs' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({ where: { code: perm.code }, update: {}, create: perm });
  }
  console.log(`✅ Seeded ${permissions.length} permissions`);

  // ─── SLA Definitions ──────────────────────────────────────
  const slaDefinitions = [
    { taskType: 'ORDER_ASSIGNMENT'  as any, targetMinutes: 30,   escalationTargetRole: 'OPS_MANAGER'       as any },
    { taskType: 'QUALITY_CHECK'     as any, targetMinutes: 120,  escalationTargetRole: 'WAREHOUSE_MANAGER' as any },
    { taskType: 'DISPUTE_HANDLING'  as any, targetMinutes: 240,  escalationTargetRole: 'OPS_MANAGER'       as any },
    { taskType: 'CONTRACT_REVIEW'   as any, targetMinutes: 1440, escalationTargetRole: 'OPS_MANAGER'       as any },
    { taskType: 'KYC_REVIEW'        as any, targetMinutes: 2880, escalationTargetRole: 'OPS_MANAGER'       as any },
    { taskType: 'PAYOUT_APPROVAL'   as any, targetMinutes: 240,  escalationTargetRole: 'FINANCE_OFFICER'   as any },
    { taskType: 'DRIVER_ASSIGNMENT' as any, targetMinutes: 45,   escalationTargetRole: 'DRIVER_COORDINATOR' as any },
  ];

  for (const sla of slaDefinitions) {
    await prisma.slaDefinition.upsert({ where: { taskType: sla.taskType }, update: {}, create: sla });
  }
  console.log(`✅ Seeded ${slaDefinitions.length} SLA definitions`);

  // ─── Super Admin ───────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@Jmart2026!', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@jmart.sa' },
    update: {},
    create: { email: 'admin@jmart.sa', phone: '+966500000001', passwordHash: adminHash, userType: UserType.INTERNAL, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
  });
  await prisma.internalUser.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, fullName: 'System Administrator', employeeId: 'EMP-001', role: InternalRole.SUPER_ADMIN, department: 'Technology', isOnDuty: true },
  });
  console.log('✅ Super Admin: admin@jmart.sa / Admin@Jmart2026!');

  // ─── Ops Manager ──────────────────────────────────────────
  const opsHash = await bcrypt.hash('Ops@Jmart2026!', 12);
  const opsUser = await prisma.user.upsert({
    where: { email: 'ops@jmart.sa' },
    update: {},
    create: { email: 'ops@jmart.sa', phone: '+966500000002', passwordHash: opsHash, userType: UserType.INTERNAL, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
  });
  await prisma.internalUser.upsert({
    where: { userId: opsUser.id },
    update: {},
    create: { userId: opsUser.id, fullName: 'Operations Manager', employeeId: 'EMP-002', role: InternalRole.OPS_MANAGER, department: 'Operations', isOnDuty: true },
  });
  console.log('✅ Ops Manager: ops@jmart.sa / Ops@Jmart2026!');

  // ─── Finance Officer ───────────────────────────────────────
  const finHash = await bcrypt.hash('Finance@Jmart2026!', 12);
  const finUser = await prisma.user.upsert({
    where: { email: 'finance@jmart.sa' },
    update: {},
    create: { email: 'finance@jmart.sa', phone: '+966500000003', passwordHash: finHash, userType: UserType.INTERNAL, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
  });
  await prisma.internalUser.upsert({
    where: { userId: finUser.id },
    update: {},
    create: { userId: finUser.id, fullName: 'Finance Officer', employeeId: 'EMP-003', role: InternalRole.FINANCE_OFFICER, department: 'Finance', isOnDuty: true },
  });
  console.log('✅ Finance Officer: finance@jmart.sa / Finance@Jmart2026!');

  // ─── Quality Inspector ─────────────────────────────────────
  const qcHash = await bcrypt.hash('Quality@Jmart2026!', 12);
  const qcUser = await prisma.user.upsert({
    where: { email: 'quality@jmart.sa' },
    update: {},
    create: { email: 'quality@jmart.sa', phone: '+966500000004', passwordHash: qcHash, userType: UserType.INTERNAL, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
  });
  const qcInternal = await prisma.internalUser.upsert({
    where: { userId: qcUser.id },
    update: {},
    create: { userId: qcUser.id, fullName: 'Quality Inspector', employeeId: 'EMP-004', role: InternalRole.QUALITY_INSPECTOR, department: 'Quality Control', isOnDuty: true },
  });
  console.log('✅ Quality Inspector: quality@jmart.sa / Quality@Jmart2026!');

  // ─── Geo Zones — الرياض ───────────────────────────────────
  const riyadhRegion = await prisma.geoZone.upsert({
    where: { zoneCode: 'SAU-RUH' }, update: {},
    create: { zoneCode: 'SAU-RUH', zoneName: 'Riyadh Region', zoneNameAr: 'منطقة الرياض', zoneLevel: ZoneLevel.REGION, centroidLat: 24.7136, centroidLng: 46.6753, status: ZoneStatus.ACTIVE },
  });
  const zoneA = await prisma.geoZone.upsert({
    where: { zoneCode: 'RUH-A' }, update: {},
    create: { zoneCode: 'RUH-A', zoneName: 'Riyadh Zone A – Central', zoneNameAr: 'الرياض – نطاق أ (المركز)', parentZoneId: riyadhRegion.id, zoneLevel: ZoneLevel.ZONE, centroidLat: 24.6877, centroidLng: 46.7219, status: ZoneStatus.ACTIVE, coverageStartTime: '04:00', coverageEndTime: '22:00', maxOrderWeightKg: 20000 },
  });
  const zoneB = await prisma.geoZone.upsert({
    where: { zoneCode: 'RUH-B' }, update: {},
    create: { zoneCode: 'RUH-B', zoneName: 'Riyadh Zone B – North', zoneNameAr: 'الرياض – نطاق ب (الشمال)', parentZoneId: riyadhRegion.id, zoneLevel: ZoneLevel.ZONE, centroidLat: 24.8048, centroidLng: 46.6915, status: ZoneStatus.ACTIVE, coverageStartTime: '04:00', coverageEndTime: '22:00', maxOrderWeightKg: 15000 },
  });
  const zoneC = await prisma.geoZone.upsert({
    where: { zoneCode: 'RUH-C' }, update: {},
    create: { zoneCode: 'RUH-C', zoneName: 'Riyadh Zone C – East', zoneNameAr: 'الرياض – نطاق ج (الشرق)', parentZoneId: riyadhRegion.id, zoneLevel: ZoneLevel.ZONE, centroidLat: 24.7200, centroidLng: 46.8500, status: ZoneStatus.ACTIVE, coverageStartTime: '05:00', coverageEndTime: '21:00', maxOrderWeightKg: 12000 },
  });

  // ─── Geo Zones — جدة ──────────────────────────────────────
  const jeddahRegion = await prisma.geoZone.upsert({
    where: { zoneCode: 'SAU-JED' }, update: {},
    create: { zoneCode: 'SAU-JED', zoneName: 'Jeddah Region', zoneNameAr: 'منطقة جدة', zoneLevel: ZoneLevel.REGION, centroidLat: 21.4858, centroidLng: 39.1925, status: ZoneStatus.ACTIVE },
  });
  const jeddahZone = await prisma.geoZone.upsert({
    where: { zoneCode: 'JED-A' }, update: {},
    create: { zoneCode: 'JED-A', zoneName: 'Jeddah Central', zoneNameAr: 'جدة – المركز', parentZoneId: jeddahRegion.id, zoneLevel: ZoneLevel.ZONE, centroidLat: 21.5169, centroidLng: 39.2192, status: ZoneStatus.ACTIVE, coverageStartTime: '04:00', coverageEndTime: '22:00', maxOrderWeightKg: 18000 },
  });

  // ─── Geo Zones — الدمام ───────────────────────────────────
  const dammamRegion = await prisma.geoZone.upsert({
    where: { zoneCode: 'SAU-DMM' }, update: {},
    create: { zoneCode: 'SAU-DMM', zoneName: 'Eastern Province', zoneNameAr: 'المنطقة الشرقية', zoneLevel: ZoneLevel.REGION, centroidLat: 26.4207, centroidLng: 50.0888, status: ZoneStatus.ACTIVE },
  });
  const dammamZone = await prisma.geoZone.upsert({
    where: { zoneCode: 'DMM-A' }, update: {},
    create: { zoneCode: 'DMM-A', zoneName: 'Dammam Central', zoneNameAr: 'الدمام – المركز', parentZoneId: dammamRegion.id, zoneLevel: ZoneLevel.ZONE, centroidLat: 26.4207, centroidLng: 50.0888, status: ZoneStatus.ACTIVE, coverageStartTime: '05:00', coverageEndTime: '21:00', maxOrderWeightKg: 15000 },
  });

  console.log('✅ Seeded 9 Geo Zones (Riyadh ×3, Jeddah ×1, Dammam ×1 + 3 regions)');

  // ─── Zone Shipping Rates ──────────────────────────────────
  const shippingRates = [
    { fromZoneId: zoneA.id,    toZoneId: zoneA.id,    vehicleType: 'PICKUP'       as any, rateType: 'INTRA_ZONE', baseRate: 50,  perKgRate: 0.05, minCharge: 50  },
    { fromZoneId: zoneA.id,    toZoneId: zoneA.id,    vehicleType: 'MEDIUM_TRUCK' as any, rateType: 'INTRA_ZONE', baseRate: 150, perKgRate: 0.04, minCharge: 150 },
    { fromZoneId: zoneB.id,    toZoneId: zoneA.id,    vehicleType: 'MEDIUM_TRUCK' as any, rateType: 'INTER_ZONE', baseRate: 250, perKgRate: 0.06, minCharge: 250 },
    { fromZoneId: zoneA.id,    toZoneId: zoneB.id,    vehicleType: 'MEDIUM_TRUCK' as any, rateType: 'INTER_ZONE', baseRate: 250, perKgRate: 0.06, minCharge: 250 },
    { fromZoneId: jeddahZone.id, toZoneId: jeddahZone.id, vehicleType: 'MEDIUM_TRUCK' as any, rateType: 'INTRA_ZONE', baseRate: 200, perKgRate: 0.05, minCharge: 200 },
    { fromZoneId: dammamZone.id, toZoneId: dammamZone.id, vehicleType: 'MEDIUM_TRUCK' as any, rateType: 'INTRA_ZONE', baseRate: 200, perKgRate: 0.05, minCharge: 200 },
  ];

  for (const rate of shippingRates) {
    const key = { fromZoneId: rate.fromZoneId, toZoneId: rate.toZoneId, vehicleType: rate.vehicleType, effectiveFrom: new Date('2026-01-01') };
    await prisma.zoneShippingRate.upsert({
      where: { fromZoneId_toZoneId_vehicleType_effectiveFrom: key },
      update: {},
      create: { ...rate, effectiveFrom: new Date('2026-01-01') },
    });
  }
  console.log(`✅ Seeded ${shippingRates.length} shipping rates`);

  // ─── Product Categories ───────────────────────────────────
  const vegCategory = await prisma.productCategory.upsert({
    where: { code: 'VEG' }, update: {},
    create: { code: 'VEG', name: 'Vegetables', nameAr: 'خضروات', storageType: StorageType.REFRIGERATED, tempMinC: 2, tempMaxC: 12, maxHoursTransit: 24 },
  });
  const fruitCategory = await prisma.productCategory.upsert({
    where: { code: 'FRT' }, update: {},
    create: { code: 'FRT', name: 'Fruits', nameAr: 'فواكه', storageType: StorageType.REFRIGERATED, tempMinC: 4, tempMaxC: 10, maxHoursTransit: 48 },
  });
  const herbCategory = await prisma.productCategory.upsert({
    where: { code: 'HRB' }, update: {},
    create: { code: 'HRB', name: 'Herbs & Spices', nameAr: 'أعشاب وتوابل', storageType: StorageType.REFRIGERATED, tempMinC: 2, tempMaxC: 8, maxHoursTransit: 12 },
  });
  const grainCategory = await prisma.productCategory.upsert({
    where: { code: 'GRN' }, update: {},
    create: { code: 'GRN', name: 'Grains & Legumes', nameAr: 'حبوب وبقوليات', storageType: StorageType.AMBIENT, tempMinC: 15, tempMaxC: 30, maxHoursTransit: 168 },
  });
  const dateCategory = await prisma.productCategory.upsert({
    where: { code: 'DAT' }, update: {},
    create: { code: 'DAT', name: 'Dates', nameAr: 'تمور', storageType: StorageType.AMBIENT, tempMinC: 15, tempMaxC: 25, maxHoursTransit: 240 },
  });
  const melonCategory = await prisma.productCategory.upsert({
    where: { code: 'MLN' }, update: {},
    create: { code: 'MLN', name: 'Melons', nameAr: 'بطيخيات', storageType: StorageType.AMBIENT, tempMinC: 10, tempMaxC: 20, maxHoursTransit: 72 },
  });
  const rootCategory = await prisma.productCategory.upsert({
    where: { code: 'ROOT' }, update: {},
    create: { code: 'ROOT', name: 'Root Vegetables', nameAr: 'خضروات جذرية', storageType: StorageType.AMBIENT, tempMinC: 8, tempMaxC: 18, maxHoursTransit: 72 },
  });

  console.log('✅ Seeded 7 product categories');

  // ─── Products ─────────────────────────────────────────────
  const allProducts = [
    // خضروات
    { sku: 'VEG-TOM-001', name: 'Tomatoes',       nameAr: 'طماطم',       categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A','B'],   packagingTypes: ['LOOSE','CRATE'] },
    { sku: 'VEG-TOM-002', name: 'Cherry Tomatoes', nameAr: 'طماطم كرزية',  categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 10,  gradeOptions: ['A'],       packagingTypes: ['PUNNET','BOX'] },
    { sku: 'VEG-CUC-001', name: 'Cucumbers',       nameAr: 'خيار',        categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A','B'],   packagingTypes: ['LOOSE','CRATE'] },
    { sku: 'VEG-PEP-001', name: 'Bell Peppers',    nameAr: 'فلفل',        categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A'],       packagingTypes: ['CRATE'] },
    { sku: 'VEG-PEP-002', name: 'Hot Peppers',     nameAr: 'فلفل حار',    categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 10,  gradeOptions: ['A'],       packagingTypes: ['CRATE'] },
    { sku: 'VEG-LET-001', name: 'Lettuce',         nameAr: 'خس',          categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 10,  gradeOptions: ['A'],       packagingTypes: ['LOOSE'] },
    { sku: 'VEG-ZUC-001', name: 'Zucchini',        nameAr: 'كوسة',        categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A','B'],   packagingTypes: ['LOOSE','CRATE'] },
    { sku: 'VEG-EGG-001', name: 'Eggplant',        nameAr: 'باذنجان',     categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A','B'],   packagingTypes: ['LOOSE','CRATE'] },
    { sku: 'VEG-CAB-001', name: 'Cabbage',         nameAr: 'ملفوف',       categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A'],       packagingTypes: ['LOOSE'] },
    { sku: 'VEG-CAR-001', name: 'Carrots',         nameAr: 'جزر',         categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A','B'],   packagingTypes: ['LOOSE','BAG'] },
    { sku: 'VEG-SPN-001', name: 'Spinach',         nameAr: 'سبانخ',       categoryId: vegCategory.id,   unitOfMeasure: 'KG', minOrderQty: 5,   gradeOptions: ['A'],       packagingTypes: ['LOOSE','BAG'] },
    // خضروات جذرية
    { sku: 'ROOT-POT-001', name: 'Potatoes',       nameAr: 'بطاطس',       categoryId: rootCategory.id,  unitOfMeasure: 'KG', minOrderQty: 100, gradeOptions: ['A','B'],   packagingTypes: ['SACK','BOX'] },
    { sku: 'ROOT-ONI-001', name: 'Onions',         nameAr: 'بصل',         categoryId: rootCategory.id,  unitOfMeasure: 'KG', minOrderQty: 100, gradeOptions: ['A','B'],   packagingTypes: ['SACK','CRATE'] },
    { sku: 'ROOT-ONI-002', name: 'Green Onions',   nameAr: 'بصل أخضر',   categoryId: rootCategory.id,  unitOfMeasure: 'KG', minOrderQty: 10,  gradeOptions: ['A'],       packagingTypes: ['BUNCH'] },
    { sku: 'ROOT-GAR-001', name: 'Garlic',         nameAr: 'ثوم',         categoryId: rootCategory.id,  unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A'],       packagingTypes: ['LOOSE','SACK'] },
    { sku: 'ROOT-GNG-001', name: 'Ginger',         nameAr: 'زنجبيل',      categoryId: rootCategory.id,  unitOfMeasure: 'KG', minOrderQty: 10,  gradeOptions: ['A'],       packagingTypes: ['LOOSE'] },
    // فواكه
    { sku: 'FRT-ORA-001', name: 'Oranges',         nameAr: 'برتقال',      categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 100, gradeOptions: ['A','B'],   packagingTypes: ['CRATE','BOX'] },
    { sku: 'FRT-APL-001', name: 'Apples',          nameAr: 'تفاح',        categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 100, gradeOptions: ['A','B'],   packagingTypes: ['CRATE','BOX'] },
    { sku: 'FRT-GRP-001', name: 'Grapes',          nameAr: 'عنب',         categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A'],       packagingTypes: ['BOX'] },
    { sku: 'FRT-MNG-001', name: 'Mangoes',         nameAr: 'مانجو',       categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A','B'],   packagingTypes: ['CRATE','BOX'] },
    { sku: 'FRT-LMN-001', name: 'Lemons',          nameAr: 'ليمون',       categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A'],       packagingTypes: ['CRATE'] },
    { sku: 'FRT-POM-001', name: 'Pomegranates',    nameAr: 'رمان',        categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A','B'],   packagingTypes: ['BOX'] },
    { sku: 'FRT-GVA-001', name: 'Guavas',          nameAr: 'جوافة',       categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A'],       packagingTypes: ['BOX'] },
    { sku: 'FRT-PER-001', name: 'Pears',           nameAr: 'كمثرى',       categoryId: fruitCategory.id, unitOfMeasure: 'KG', minOrderQty: 50,  gradeOptions: ['A','B'],   packagingTypes: ['CRATE'] },
    // بطيخيات
    { sku: 'MLN-WAT-001', name: 'Watermelon',      nameAr: 'بطيخ',        categoryId: melonCategory.id, unitOfMeasure: 'KG', minOrderQty: 200, gradeOptions: ['A','B'],   packagingTypes: ['LOOSE'] },
    { sku: 'MLN-HON-001', name: 'Honeydew Melon',  nameAr: 'شمام',        categoryId: melonCategory.id, unitOfMeasure: 'KG', minOrderQty: 100, gradeOptions: ['A'],       packagingTypes: ['CRATE'] },
    // تمور
    { sku: 'DAT-AJW-001', name: 'Ajwa Dates',      nameAr: 'تمر عجوة',   categoryId: dateCategory.id,  unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A','EXTRA'], packagingTypes: ['BOX','BULK'] },
    { sku: 'DAT-MED-001', name: 'Medjool Dates',   nameAr: 'تمر مجهول',  categoryId: dateCategory.id,  unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A','B'],   packagingTypes: ['BOX','BULK'] },
    { sku: 'DAT-SUK-001', name: 'Sukkari Dates',   nameAr: 'تمر سكري',   categoryId: dateCategory.id,  unitOfMeasure: 'KG', minOrderQty: 20,  gradeOptions: ['A','B'],   packagingTypes: ['BOX','BULK'] },
    // حبوب وبقوليات
    { sku: 'GRN-LNT-001', name: 'Red Lentils',     nameAr: 'عدس أحمر',   categoryId: grainCategory.id, unitOfMeasure: 'KG', minOrderQty: 500, gradeOptions: ['A'],       packagingTypes: ['SACK'] },
    { sku: 'GRN-CHK-001', name: 'Chickpeas',       nameAr: 'حمص',         categoryId: grainCategory.id, unitOfMeasure: 'KG', minOrderQty: 500, gradeOptions: ['A','B'],   packagingTypes: ['SACK'] },
    { sku: 'GRN-WHT-001', name: 'Wheat',           nameAr: 'قمح',         categoryId: grainCategory.id, unitOfMeasure: 'KG', minOrderQty: 1000,gradeOptions: ['A'],       packagingTypes: ['SACK'] },
    // أعشاب
    { sku: 'HRB-MNT-001', name: 'Mint',            nameAr: 'نعناع',       categoryId: herbCategory.id,  unitOfMeasure: 'KG', minOrderQty: 5,   gradeOptions: ['A'],       packagingTypes: ['BUNCH','LOOSE'] },
    { sku: 'HRB-PRY-001', name: 'Parsley',         nameAr: 'بقدونس',      categoryId: herbCategory.id,  unitOfMeasure: 'KG', minOrderQty: 5,   gradeOptions: ['A'],       packagingTypes: ['BUNCH','LOOSE'] },
    { sku: 'HRB-COR-001', name: 'Coriander',       nameAr: 'كزبرة',       categoryId: herbCategory.id,  unitOfMeasure: 'KG', minOrderQty: 5,   gradeOptions: ['A'],       packagingTypes: ['BUNCH','LOOSE'] },
  ];

  for (const product of allProducts) {
    await prisma.product.upsert({ where: { sku: product.sku }, update: {}, create: product as any });
  }
  console.log(`✅ Seeded ${allProducts.length} products across 7 categories`);

  // ─── Warehouses ───────────────────────────────────────────
  const whA = await prisma.warehouse.upsert({
    where: { warehouseCode: 'WH-RUH-A-01' }, update: {},
    create: { warehouseCode: 'WH-RUH-A-01', warehouseName: 'مستودع الرياض المركزي', geoZoneId: zoneA.id, address: 'المدينة الصناعية، الرياض', latitude: 24.6500, longitude: 46.7100, totalCapacityM3: 5000, operatingHoursStart: '04:00', operatingHoursEnd: '23:00' },
  });
  const whB = await prisma.warehouse.upsert({
    where: { warehouseCode: 'WH-RUH-B-01' }, update: {},
    create: { warehouseCode: 'WH-RUH-B-01', warehouseName: 'مستودع الرياض الشمالي', geoZoneId: zoneB.id, address: 'المنطقة الصناعية الشمالية، الرياض', latitude: 24.8200, longitude: 46.7000, totalCapacityM3: 3000, operatingHoursStart: '05:00', operatingHoursEnd: '22:00' },
  });
  const whJed = await prisma.warehouse.upsert({
    where: { warehouseCode: 'WH-JED-A-01' }, update: {},
    create: { warehouseCode: 'WH-JED-A-01', warehouseName: 'مستودع جدة الرئيسي', geoZoneId: jeddahZone.id, address: 'المنطقة الصناعية، جدة', latitude: 21.5200, longitude: 39.2100, totalCapacityM3: 4000, operatingHoursStart: '04:00', operatingHoursEnd: '23:00' },
  });
  console.log('✅ Seeded 3 warehouses (Riyadh A, Riyadh B, Jeddah)');

  // ─── Warehouse Sections ───────────────────────────────────
  const sections = [
    { warehouseId: whA.id,   sectionCode: 'WH-RUH-A-REF-01', sectionName: 'قسم التبريد — خضروات',  storageType: StorageType.REFRIGERATED, targetTempMinC: 2,  targetTempMaxC: 8,  capacityM3: 800  },
    { warehouseId: whA.id,   sectionCode: 'WH-RUH-A-REF-02', sectionName: 'قسم التبريد — فواكه',   storageType: StorageType.REFRIGERATED, targetTempMinC: 4,  targetTempMaxC: 10, capacityM3: 600  },
    { warehouseId: whA.id,   sectionCode: 'WH-RUH-A-AMB-01', sectionName: 'قسم درجة الحرارة العادية', storageType: StorageType.AMBIENT, targetTempMinC: 15, targetTempMaxC: 28, capacityM3: 1500 },
    { warehouseId: whA.id,   sectionCode: 'WH-RUH-A-FRZ-01', sectionName: 'قسم التجميد',           storageType: StorageType.FROZEN,       targetTempMinC: -22, targetTempMaxC: -18, capacityM3: 400 },
    { warehouseId: whB.id,   sectionCode: 'WH-RUH-B-REF-01', sectionName: 'قسم التبريد',           storageType: StorageType.REFRIGERATED, targetTempMinC: 2,  targetTempMaxC: 10, capacityM3: 700  },
    { warehouseId: whB.id,   sectionCode: 'WH-RUH-B-AMB-01', sectionName: 'قسم درجة الحرارة العادية', storageType: StorageType.AMBIENT, targetTempMinC: 15, targetTempMaxC: 28, capacityM3: 1200 },
    { warehouseId: whJed.id, sectionCode: 'WH-JED-A-REF-01', sectionName: 'قسم التبريد',           storageType: StorageType.REFRIGERATED, targetTempMinC: 2,  targetTempMaxC: 10, capacityM3: 900  },
    { warehouseId: whJed.id, sectionCode: 'WH-JED-A-AMB-01', sectionName: 'قسم درجة الحرارة العادية', storageType: StorageType.AMBIENT, targetTempMinC: 15, targetTempMaxC: 28, capacityM3: 1400 },
  ];

  for (const sec of sections) {
    await prisma.warehouseSection.upsert({
      where: { id: sec.sectionCode } as any,
      update: {},
      create: sec,
    }).catch(async () => {
      // upsert by code+warehouse if id doesn't exist
      const existing = await prisma.warehouseSection.findFirst({ where: { sectionCode: sec.sectionCode } });
      if (!existing) await prisma.warehouseSection.create({ data: sec });
    });
  }
  console.log(`✅ Seeded ${sections.length} warehouse sections`);

  // ─── Quality Standards ────────────────────────────────────
  const qualityStandards = [
    { productId: null, categoryId: vegCategory.id,   grade: 'A', tempMinOnArrivalC: 2,  tempMaxOnArrivalC: 12, maxDefectPct: 3,  maxWeightVariancePct: 2, visualCriteria: 'لون موحد، بدون تشوهات واضحة، نضج مناسب', rejectionCriteria: 'عفن، تعفن، تشقق شديد، رائحة غير طبيعية' },
    { productId: null, categoryId: vegCategory.id,   grade: 'B', tempMinOnArrivalC: 2,  tempMaxOnArrivalC: 12, maxDefectPct: 10, maxWeightVariancePct: 5, visualCriteria: 'قابل للبيع مع عيوب طفيفة', rejectionCriteria: 'عفن، تعفن' },
    { productId: null, categoryId: fruitCategory.id, grade: 'A', tempMinOnArrivalC: 4,  tempMaxOnArrivalC: 10, maxDefectPct: 3,  maxWeightVariancePct: 2, visualCriteria: 'لون مثالي، نضج كامل، بدون كدمات', rejectionCriteria: 'عفن، تخمر، كدمات عميقة' },
    { productId: null, categoryId: fruitCategory.id, grade: 'B', tempMinOnArrivalC: 4,  tempMaxOnArrivalC: 10, maxDefectPct: 8,  maxWeightVariancePct: 4, visualCriteria: 'مقبول تجارياً مع عيوب بسيطة', rejectionCriteria: 'عفن، تخمر' },
    { productId: null, categoryId: rootCategory.id,  grade: 'A', tempMinOnArrivalC: 8,  tempMaxOnArrivalC: 18, maxDefectPct: 5,  maxWeightVariancePct: 3, visualCriteria: 'نظيف، متماسك، بدون تبرعم', rejectionCriteria: 'تعفن، تبرعم مفرط، إصابة بالآفات' },
    { productId: null, categoryId: grainCategory.id, grade: 'A', tempMinOnArrivalC: 15, tempMaxOnArrivalC: 30, maxDefectPct: 2,  maxWeightVariancePct: 1, visualCriteria: 'نظيف، يابس، خالٍ من الآفات', rejectionCriteria: 'رطوبة عالية، وجود حشرات، تلوث' },
    { productId: null, categoryId: dateCategory.id,  grade: 'A', tempMinOnArrivalC: 15, tempMaxOnArrivalC: 25, maxDefectPct: 2,  maxWeightVariancePct: 2, visualCriteria: 'لون موحد، نضج كامل، بدون جفاف مفرط', rejectionCriteria: 'عفن، تخمر، حشرات' },
    { productId: null, categoryId: melonCategory.id, grade: 'A', tempMinOnArrivalC: 10, tempMaxOnArrivalC: 20, maxDefectPct: 3,  maxWeightVariancePct: 3, visualCriteria: 'قوام صلب، لون موحد، رائحة ناضجة', rejectionCriteria: 'تعفن، طراوة مفرطة، كسر' },
  ];

  for (const qs of qualityStandards) {
    const existing = await prisma.qualityStandard.findFirst({
      where: { categoryId: qs.categoryId, grade: qs.grade, productId: null },
    });
    if (!existing) {
      await prisma.qualityStandard.create({ data: qs });
    }
  }
  console.log(`✅ Seeded ${qualityStandards.length} quality standards`);

  // ─── Commission Rules ─────────────────────────────────────
  const existingRules = await prisma.commissionRule.count();
  if (existingRules === 0) {
    await prisma.commissionRule.createMany({
      data: [
        { ruleName: 'Default Platform Commission', appliesTo: 'ALL',        commissionType: 'PERCENTAGE' as any, commissionValue: 0.03, minCommission: 10,  effectiveFrom: new Date('2026-01-01'), isActive: true },
        { ruleName: 'Premium Buyer Commission',    appliesTo: 'BUYER',      commissionType: 'PERCENTAGE' as any, commissionValue: 0.025, minCommission: 15, effectiveFrom: new Date('2026-01-01'), isActive: true },
        { ruleName: 'Dates Category Commission',   appliesTo: 'DATES',      commissionType: 'PERCENTAGE' as any, commissionValue: 0.04, minCommission: 20,  effectiveFrom: new Date('2026-01-01'), isActive: true },
        { ruleName: 'Grains Flat Rate',            appliesTo: 'GRAINS',     commissionType: 'FIXED'       as any, commissionValue: 50,   minCommission: 50,  effectiveFrom: new Date('2026-01-01'), isActive: true },
      ],
    });
    console.log('✅ Seeded 4 commission rules');
  }

  // ─── Demo Dual-Role User ──────────────────────────────────
  const demoHash = await bcrypt.hash('Demo@Jmart2026!', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@jmart.sa' }, update: {},
    create: { email: 'demo@jmart.sa', phone: '+966500000099', passwordHash: demoHash, userType: UserType.FARMER, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
  });
  await prisma.farmer.upsert({ where: { userId: demoUser.id }, update: {}, create: { userId: demoUser.id, businessName: 'مزرعة الديمو', farmerType: 'INDIVIDUAL' as any, contactPersonName: 'مستخدم تجريبي', contactPhone: '+966500000099', kycStatus: 'APPROVED' as any } });
  await prisma.buyer.upsert({ where: { userId: demoUser.id }, update: {}, create: { userId: demoUser.id, businessName: 'تجارة الديمو', buyerType: 'WHOLESALE_TRADER' as any, contactPersonName: 'مستخدم تجريبي', contactPhone: '+966500000099', kycStatus: 'APPROVED' as any } });
  console.log('✅ Demo Dual-Role User: demo@jmart.sa / Demo@Jmart2026!');

  console.log('\n🎉 Database seeded successfully!');
  console.log('─────────────────────────────────────────');
  console.log('Admin:     admin@jmart.sa   / Admin@Jmart2026!');
  console.log('Ops:       ops@jmart.sa     / Ops@Jmart2026!');
  console.log('Finance:   finance@jmart.sa / Finance@Jmart2026!');
  console.log('Quality:   quality@jmart.sa / Quality@Jmart2026!');
  console.log('Demo:      demo@jmart.sa    / Demo@Jmart2026!');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
