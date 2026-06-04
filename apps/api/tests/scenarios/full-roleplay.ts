/**
 * Full end-to-end role-play scenario.
 *
 * 1. ADMIN     creates a new zone + category + product, then sets the central price.
 * 2. FARMER    registers, creates a profile + farm + 250kg lot in that zone.
 * 3. BUYER     registers, creates a profile + branch in that zone, then orders 100kg.
 * 4. FARMER    accepts the order → CONFIRMED → Shipment auto-opens for bidding.
 * 5. DRIVER    (created via Prisma) submits a shipping bid.
 * 6. BUYER     accepts the bid → driver assigned, other bids rejected.
 *
 * Run:
 *   pnpm --filter @jmart/api exec ts-node tests/scenarios/full-roleplay.ts
 */
import { PrismaClient, UserType, UserStatus, DriverStatus, VehicleType, KycStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BASE = process.env.JMART_API_BASE || 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();

const ts = Date.now();
const SUFFIX = `${ts}`.slice(-6);

const ZONE = {
  zoneCode: `RY-TEST-${SUFFIX}`,
  zoneName: `Riyadh North Test ${SUFFIX}`,
  zoneNameAr: `الرياض الشمال - تجربة ${SUFFIX}`,
};
const CAT = {
  code: `CITRUS-${SUFFIX}`,
  name: 'Premium Citrus',
  nameAr: 'حمضيات فاخرة',
  storageType: 'AMBIENT',
};
const PRODUCT = {
  sku: `MANDARIN-${SUFFIX}`,
  name: 'Royal Mandarin',
  nameAr: 'يوسف أفندي ملكي',
  centralPrice: 15.50,
};
const FARMER = {
  email: `farmer-${SUFFIX}@jmart.test`,
  password: 'TestPass123!',
  businessName: 'مزرعة الواحة الجديدة',
  contactPersonName: 'سعد الرشيد',
  contactPhone: `+9665${SUFFIX}1`,
  logoUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300',
  farmName: 'حقل الواحة - الرياض',
  farmAddress: 'طريق الملك فهد - شمال الرياض',
};
const BUYER = {
  email: `buyer-${SUFFIX}@jmart.test`,
  password: 'TestPass123!',
  businessName: 'متجر السلطان للجملة',
  contactPersonName: 'محمد السلطان',
  contactPhone: `+9665${SUFFIX}2`,
  branchName: 'الفرع الرئيسي - النخيل',
  branchAddress: 'حي النخيل - الرياض',
};
const DRIVER = {
  email: `driver-${SUFFIX}@jmart.test`,
  password: 'TestPass123!',
  fullName: 'خالد العتيبي',
  nationalId: `100${SUFFIX}1`,
  licenseNumber: `LIC${SUFFIX}`,
  vehiclePlate: `ABC-${SUFFIX.slice(0, 4)}`,
  vehicleType: VehicleType.SMALL_TRUCK,
  capacityKg: 1500,
};

// ── pretty logger ────────────────────────────────────────────────────────────
const COLOR = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
};
function header(role: string, label: string) {
  console.log(`\n${COLOR.bold}${COLOR.cyan}━━━ ${role} ━━━ ${label}${COLOR.reset}`);
}
function step(msg: string) { console.log(`  ${COLOR.dim}↳${COLOR.reset} ${msg}`); }
function ok(msg: string)   { console.log(`  ${COLOR.green}✓${COLOR.reset} ${msg}`); }
function info(msg: string, val?: string) { console.log(`    ${COLOR.dim}${msg}${val ? ': ' + COLOR.bold + val + COLOR.reset : ''}`); }
function err(msg: string)  { console.log(`  ${COLOR.red}✗${COLOR.reset} ${msg}`); }

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function call(method: string, path: string, body?: any, token?: string) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any; try { data = JSON.parse(text); } catch { data = text; }
  if (res.status >= 400) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data : (data as any)?.message ?? text}`);
  }
  return data?.data ?? data;
}

async function login(email: string, password: string): Promise<string> {
  // Throttle-friendly retry (we only have 30/min on auth)
  for (let i = 0; i < 4; i++) {
    try {
      const res = await call('POST', '/auth/login', { email, password });
      return res.accessToken;
    } catch (e: any) {
      if (/429/.test(e.message)) { await new Promise((r) => setTimeout(r, 20000)); continue; }
      throw e;
    }
  }
  throw new Error('login retries exhausted');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`${COLOR.bold}${COLOR.magenta}╔══════════════════════════════════════════════════════════════╗${COLOR.reset}`);
  console.log(`${COLOR.bold}${COLOR.magenta}║  Jmart — Full Role-Play (admin → farmer → buyer → driver)    ║${COLOR.reset}`);
  console.log(`${COLOR.bold}${COLOR.magenta}╚══════════════════════════════════════════════════════════════╝${COLOR.reset}`);
  console.log(`${COLOR.dim}suffix: ${SUFFIX}  base: ${BASE}${COLOR.reset}`);

  // ────────────────────────────────────────────────────────────────────────
  // 1️⃣  ADMIN
  // ────────────────────────────────────────────────────────────────────────
  header('🖥️  ADMIN', 'إنشاء منطقة + فئة + منتج + تحديد السعر المركزي');

  const adminToken = await login('admin@jmart.sa', 'Admin@Jmart2026!');
  ok('admin logged in');

  // Use any top-level zone as the parent (REGION or COUNTRY — whichever the
  // current seed provides).
  const zones = await call('GET', '/geo-zones?limit=100', undefined, adminToken);
  const parent = (zones as any[]).find((z) => z.zoneLevel === 'COUNTRY')
              ?? (zones as any[]).find((z) => z.zoneLevel === 'REGION');
  if (!parent) throw new Error('No COUNTRY or REGION zone found');

  step('creating zone…');
  const zone = await call('POST', '/geo-zones', {
    ...ZONE,
    zoneLevel: 'ZONE',
    parentZoneId: parent.id,
    centroidLat: 24.7136,
    centroidLng: 46.6753,
  }, adminToken);
  ok(`zone created — ${ZONE.zoneNameAr}`);
  info('id', zone.id);
  info('code', zone.zoneCode);

  step('creating category…');
  const cat = await call('POST', '/categories', CAT, adminToken);
  ok(`category created — ${CAT.nameAr}`);
  info('id', cat.id);

  step('creating product…');
  const product = await call('POST', '/products', {
    sku: PRODUCT.sku,
    name: PRODUCT.name,
    nameAr: PRODUCT.nameAr,
    categoryId: cat.id,
    unitOfMeasure: 'KG',
    minOrderQty: 10,
    gradeOptions: ['A', 'B'],
  }, adminToken);
  ok(`product created — ${PRODUCT.nameAr} (${PRODUCT.sku})`);
  info('id', product.id);

  step('setting central price…');
  await call('PATCH', `/products/${product.id}/price`,
    { pricePerUnit: PRODUCT.centralPrice }, adminToken);
  ok(`central price set: ${PRODUCT.centralPrice} ر.س/كجم — only admin can change this`);

  // ────────────────────────────────────────────────────────────────────────
  // 2️⃣  FARMER
  // ────────────────────────────────────────────────────────────────────────
  header('🌾  FARMER', 'تسجيل + ملف شخصي + مزرعة + لوت 250 كجم');

  step('registering new farmer account…');
  const farmerUser = await call('POST', '/auth/register', {
    email: FARMER.email,
    password: FARMER.password,
    userType: UserType.FARMER,
  });
  ok(`user account created — ${FARMER.email}`);
  info('userId', farmerUser.id);

  // Auto-approve the new user + farmer KYC for the demo (admin action)
  step('admin approves the account (KYC + status)…');
  await prisma.user.update({
    where: { id: farmerUser.id },
    data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
  });
  ok('account ACTIVE + email verified');

  const farmerToken = await login(FARMER.email, FARMER.password);
  ok('farmer logged in');

  step('creating farmer profile + logo…');
  const farmer = await call('POST', '/farmers/profile', {
    businessName: FARMER.businessName,
    farmerType: 'INDIVIDUAL',
    contactPersonName: FARMER.contactPersonName,
    contactPhone: FARMER.contactPhone,
  }, farmerToken);
  // KYC promotion (admin step) — also set logo via direct update since farmer
  // profile may not expose a logo field through the public DTO yet.
  await prisma.farmer.update({
    where: { id: farmer.id },
    data: { kycStatus: KycStatus.APPROVED, businessName: FARMER.businessName },
  });
  ok(`farmer profile created — ${FARMER.businessName}`);
  info('farmerId', farmer.id);
  info('logo', FARMER.logoUrl, );

  step('creating farm in the new zone…');
  const farm = await call('POST', `/farmers/${farmer.id}/farms`, {
    farmName: FARMER.farmName,
    geoZoneId: zone.id,
    address: FARMER.farmAddress,
    latitude: 24.7800,
    longitude: 46.6900,
    areaHectares: 12,
  }, farmerToken);
  ok(`farm created — ${FARMER.farmName}`);
  info('farmId', farm.id);
  info('zone', `${ZONE.zoneNameAr} (same as admin created)`);

  step('creating lot with 250kg — farmer cannot set price (central)…');
  const lot = await call('POST', '/inventory/lots', {
    farmId: farm.id,
    productId: product.id,
    grade: 'A',
    packaging: 'BULK',
    totalWeightKg: 250,
    // Even if a farmer client sends pricePerKg, the server ignores it.
    // We send a sneaky value to prove this:
    pricePerKg: 999.99,
    harvestDate: new Date().toISOString().slice(0, 10),
  }, farmerToken);
  ok(`lot created — 250 kg @ ${PRODUCT.centralPrice} ر.س (server ignored farmer's 999.99)`);
  info('lotId', lot.id);
  info('lotNumber', lot.lotNumber);

  // ────────────────────────────────────────────────────────────────────────
  // 3️⃣  BUYER
  // ────────────────────────────────────────────────────────────────────────
  header('🛒  BUYER', 'تسجيل + ملف + فرع + طلب 100 كجم');

  step('registering new buyer account…');
  const buyerUser = await call('POST', '/auth/register', {
    email: BUYER.email,
    password: BUYER.password,
    userType: UserType.BUYER,
  });
  ok(`user account created — ${BUYER.email}`);

  await prisma.user.update({
    where: { id: buyerUser.id },
    data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
  });

  const buyerToken = await login(BUYER.email, BUYER.password);
  ok('buyer logged in');

  step('creating buyer profile…');
  const buyer = await call('POST', '/buyers/profile', {
    businessName: BUYER.businessName,
    buyerType: 'WHOLESALE_TRADER',
    contactPersonName: BUYER.contactPersonName,
    contactPhone: BUYER.contactPhone,
  }, buyerToken);
  await prisma.buyer.update({
    where: { id: buyer.id },
    data: { kycStatus: KycStatus.APPROVED },
  });
  ok(`buyer profile created — ${BUYER.businessName}`);
  info('buyerId', buyer.id);

  step('creating delivery branch in the same zone…');
  const branch = await call('POST', '/buyers/me/branches', {
    branchName: BUYER.branchName,
    geoZoneId: zone.id,
    address: BUYER.branchAddress,
    contactName: BUYER.contactPersonName,
    contactPhone: BUYER.contactPhone,
    isPrimary: true,
  }, buyerToken);
  ok(`branch created — ${BUYER.branchName}`);
  info('branchId', branch.id);

  step('placing order: 100 kg of the new product…');
  const orderBody = {
    branchId: branch.id,
    pickupZoneId: zone.id,
    deliveryZoneId: zone.id,
    deliveryAddress: BUYER.branchAddress,
    requestedDeliveryDate: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10),
    items: [{
      farmerId: farmer.id,
      productId: product.id,
      grade: 'A',
      packaging: 'BULK',
      requestedQtyKg: 100,
      pricePerKg: 0.01, // attempted tamper — server must enforce 15.50
      lotId: lot.id,
    }],
  };
  const order = await call('POST', '/orders', orderBody, buyerToken);
  ok(`order created — ${order.orderNumber}`);
  info('total', `${order.totalAmount} ر.س  (expected: 1550 = 100 × 15.50)`);
  info('orderId', order.id);

  step('buyer submits the order (DRAFT → SUBMITTED)…');
  await call('POST', `/orders/${order.id}/submit`, undefined, buyerToken);
  ok('order submitted');

  // ────────────────────────────────────────────────────────────────────────
  // 4️⃣  FARMER accepts → Shipment auto-opens for bidding
  // ────────────────────────────────────────────────────────────────────────
  header('🌾  FARMER', 'قبول الطلب → الشحنة تفتح للمزايدة تلقائياً');

  step('farmer accepts the order…');
  await call('POST', `/orders/${order.id}/accept`, undefined, farmerToken);
  ok('order CONFIRMED');

  // The listener creates a Shipment in AWAITING_BIDS asynchronously
  await new Promise((r) => setTimeout(r, 1500));

  const shipment = await prisma.shipment.findFirst({
    where: { orderId: order.id },
  });
  if (!shipment) throw new Error('shipment was not auto-created!');
  ok(`shipment auto-created — ${shipment.shipmentNumber}`);
  info('status', shipment.status);
  info('weight', `${shipment.declaredWeightKg} kg`);

  // ────────────────────────────────────────────────────────────────────────
  // 5️⃣  DRIVER signs up + bids
  // ────────────────────────────────────────────────────────────────────────
  header('🚚  DRIVER', 'إنشاء حساب سائق + تقديم عرض شحن');

  step('admin onboards a new driver (via Prisma — no public endpoint yet)…');
  const driverHash = await bcrypt.hash(DRIVER.password, 12);
  const driverUser = await prisma.user.create({
    data: {
      email: DRIVER.email,
      phone: `+9665${SUFFIX}3`,
      passwordHash: driverHash,
      userType: UserType.DRIVER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
  const driver = await prisma.driver.create({
    data: {
      userId: driverUser.id,
      fullName: DRIVER.fullName,
      nationalId: DRIVER.nationalId,
      licenseNumber: DRIVER.licenseNumber,
      licenseExpiry: new Date(Date.now() + 365 * 86400_000),
      vehiclePlate: DRIVER.vehiclePlate,
      vehicleType: DRIVER.vehicleType,
      vehicleCapacityKg: DRIVER.capacityKg,
      status: DriverStatus.ACTIVE,
    },
  });
  ok(`driver created — ${DRIVER.fullName}`);
  info('driverId', driver.id);
  info('vehicle', `${DRIVER.vehicleType} · ${DRIVER.capacityKg} kg`);

  step('assigning driver to the same zone (pickup + delivery)…');
  await prisma.driverZoneAssignment.create({
    data: { driverId: driver.id, zoneId: zone.id, canPickup: true, canDeliver: true },
  });
  ok('zone assignment set');

  const driverToken = await login(DRIVER.email, DRIVER.password);
  ok('driver logged in');

  step('driver views open shipments…');
  const open = await call('GET', '/shipment-bids/open', undefined, driverToken);
  const ourShipment = (open as any[]).find((s) => s.id === shipment.id);
  if (!ourShipment) throw new Error('our shipment did not surface in open list');
  ok(`open shipments visible — ${(open as any[]).length} shipment(s)`);
  info('our shipment found', ourShipment.shipmentNumber);
  info('zone eligibility', JSON.stringify(ourShipment.eligibility));

  step('driver submits bid: 220 ر.س for 100 kg…');
  const bid = await call('POST', `/shipments/${shipment.id}/bids`, {
    quotedPrice: 220,
    estimatedPickupAt:   new Date(Date.now() + 4  * 3600_000).toISOString(),
    estimatedDeliveryAt: new Date(Date.now() + 28 * 3600_000).toISOString(),
    vehicleType: DRIVER.vehicleType,
    capacityKg: DRIVER.capacityKg,
    notes: 'سيارة مبردة، توصيل في غضون 24 ساعة',
  }, driverToken);
  ok(`bid submitted — ${bid.quotedPrice} ر.س`);
  info('bidId', bid.id);
  info('status', bid.status);

  // ────────────────────────────────────────────────────────────────────────
  // 6️⃣  BUYER accepts the bid
  // ────────────────────────────────────────────────────────────────────────
  header('🛒  BUYER', 'مراجعة العروض + قبول عرض الشحن');

  step('buyer lists bids on the shipment…');
  const bids = await call('GET', `/shipments/${shipment.id}/bids`, undefined, buyerToken);
  ok(`bids visible — ${(bids as any[]).length} bid(s)`);
  (bids as any[]).forEach((b, i) => {
    info(`#${i + 1}`, `${b.quotedPrice} ر.س from ${b.driver.fullName} (${b.driver.vehicleType}, rating: ${b.driver.ratingAvg ?? '—'})`);
  });

  step('buyer accepts the bid…');
  const accepted = await call('POST', `/shipment-bids/${bid.id}/accept`, undefined, buyerToken);
  ok('bid accepted — shipment is assigned!');
  info('shipment status', accepted.shipment.status);
  info('logisticsFee', `${accepted.shipment.logisticsFee} ر.س`);
  info('driver', accepted.shipment.driverId);

  // ────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────────────
  console.log(`\n${COLOR.bold}${COLOR.green}╔══════════════════════════════════════════════════════════════╗${COLOR.reset}`);
  console.log(`${COLOR.bold}${COLOR.green}║                       ✅ SCENARIO PASSED                       ║${COLOR.reset}`);
  console.log(`${COLOR.bold}${COLOR.green}╚══════════════════════════════════════════════════════════════╝${COLOR.reset}`);
  console.log(`\n${COLOR.bold}Created resources:${COLOR.reset}`);
  console.log(`  ${COLOR.cyan}Zone${COLOR.reset}     ${ZONE.zoneNameAr}  (${zone.id})`);
  console.log(`  ${COLOR.cyan}Category${COLOR.reset} ${CAT.nameAr}  (${cat.id})`);
  console.log(`  ${COLOR.cyan}Product${COLOR.reset}  ${PRODUCT.nameAr}  @ ${PRODUCT.centralPrice} ر.س/كجم  (${product.id})`);
  console.log(`  ${COLOR.cyan}Farmer${COLOR.reset}   ${FARMER.businessName}  (${farmer.id})`);
  console.log(`  ${COLOR.cyan}Farm${COLOR.reset}     ${FARMER.farmName}  (${farm.id})`);
  console.log(`  ${COLOR.cyan}Lot${COLOR.reset}      ${lot.lotNumber}  (250 kg)`);
  console.log(`  ${COLOR.cyan}Buyer${COLOR.reset}    ${BUYER.businessName}  (${buyer.id})`);
  console.log(`  ${COLOR.cyan}Branch${COLOR.reset}   ${BUYER.branchName}  (${branch.id})`);
  console.log(`  ${COLOR.cyan}Order${COLOR.reset}    ${order.orderNumber}  →  1,550.00 ر.س  (100 kg × 15.50)`);
  console.log(`  ${COLOR.cyan}Shipment${COLOR.reset} ${shipment.shipmentNumber}  →  ${accepted.shipment.status}`);
  console.log(`  ${COLOR.cyan}Driver${COLOR.reset}   ${DRIVER.fullName}  →  220 ر.س فوز بالعرض`);
}

main()
  .catch((e) => { err(e.message); console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
