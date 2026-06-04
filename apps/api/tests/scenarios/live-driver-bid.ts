/** Live-roleplay step 4: create driver + submit a bid on the open shipment. */
import { PrismaClient, UserType, UserStatus, DriverStatus, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const SHIPMENT = 'a87027bb-82b5-446e-abf6-33021fcf3939';
const ZONE = '5986d097-e22c-4f99-861b-f0163ef86a9c';

const prisma = new PrismaClient();

(async () => {
  // Reuse the existing driver if a previous run already created them.
  let user = await prisma.user.findUnique({ where: { email: 'driver-live-851028@jmart.test' } });
  let driver = user ? await prisma.driver.findUnique({ where: { userId: user.id } }) : null;
  if (!user || !driver) {
    const hash = await bcrypt.hash('TestPass123!', 12);
    user = user ?? await prisma.user.create({
      data: {
        email: 'driver-live-851028@jmart.test',
        phone: '+966500851030',
        passwordHash: hash,
        userType: UserType.DRIVER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    driver = driver ?? await prisma.driver.create({
      data: {
        userId: user.id,
        fullName: 'خالد العتيبي 🚚',
        nationalId: '100' + Date.now().toString().slice(-7),
        licenseNumber: 'LIC' + Date.now().toString().slice(-6),
        licenseExpiry: new Date(Date.now() + 365 * 86400_000),
        vehiclePlate: 'XYZ-' + Date.now().toString().slice(-4),
        vehicleType: VehicleType.SMALL_TRUCK,
        vehicleCapacityKg: 1500,
        status: DriverStatus.ACTIVE,
      },
    });
    await prisma.driverZoneAssignment.upsert({
      where: { driverId_zoneId: { driverId: driver.id, zoneId: ZONE } },
      update: {},
      create: { driverId: driver.id, zoneId: ZONE, canPickup: true, canDeliver: true },
    });
  }

  const login: any = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver-live-851028@jmart.test', password: 'TestPass123!' }),
  }).then((r) => r.json());
  const dTok = login.data.accessToken;

  const bid: any = await fetch('http://localhost:3000/api/v1/shipments/' + SHIPMENT + '/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + dTok },
    body: JSON.stringify({
      quotedPrice: 220,
      estimatedPickupAt: new Date(Date.now() + 4 * 3600_000).toISOString(),
      estimatedDeliveryAt: new Date(Date.now() + 28 * 3600_000).toISOString(),
      vehicleType: 'SMALL_TRUCK',
      capacityKg: 1500,
      notes: 'سيارة مبردة، توصيل في غضون 24 ساعة',
    }),
  }).then((r) => r.json());

  console.log(JSON.stringify({
    driver: { id: driver.id, name: driver.fullName, email: user.email },
    bid: { id: bid.data?.id, price: bid.data?.quotedPrice, status: bid.data?.status },
  }, null, 2));

  await prisma.$disconnect();
})();
