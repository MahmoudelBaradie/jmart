-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'FARMER', 'BUYER', 'DRIVER', 'SHIPPING_COMPANY');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('SUPER_ADMIN', 'OPS_MANAGER', 'OPS_SPECIALIST', 'FINANCE_OFFICER', 'GEO_ZONE_MANAGER', 'WAREHOUSE_MANAGER', 'CONTRACT_OFFICER', 'ACCOUNT_MANAGER', 'QUALITY_INSPECTOR', 'DRIVER_COORDINATOR', 'DISPUTE_HANDLER', 'SUPPORT_AGENT');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FarmerType" AS ENUM ('INDIVIDUAL', 'COOPERATIVE', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('WHOLESALE_TRADER', 'RESTAURANT', 'RESTAURANT_CHAIN', 'CATERING');

-- CreateEnum
CREATE TYPE "AccountTier" AS ENUM ('STANDARD', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ZoneLevel" AS ENUM ('COUNTRY', 'REGION', 'CITY', 'ZONE', 'SUB_ZONE');

-- CreateEnum
CREATE TYPE "ZoneStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LIMITED_COVERAGE');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('AMBIENT', 'REFRIGERATED', 'COLD_ROOM', 'FROZEN');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_RESERVED', 'FULLY_RESERVED', 'QUALITY_HOLD', 'DISPATCHED', 'DEPLETED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SPOT', 'SCHEDULED_INSTANCE', 'CONTRACT_PULL', 'TENDER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_ASSIGNMENT', 'PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'SETTLED', 'CANCELLED', 'DISPUTED', 'EXCEPTION', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PENDING_SIGNATURES', 'PARTIALLY_SIGNED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('SUPPLY', 'EXCLUSIVE', 'TENDER_AWARD');

-- CreateEnum
CREATE TYPE "PriceLockType" AS ENUM ('FIXED', 'BANDED', 'MARKET_RATE', 'NEGOTIATED_MONTHLY');

-- CreateEnum
CREATE TYPE "SettlementFrequency" AS ENUM ('PER_ORDER', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ScheduledFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SubstitutionRule" AS ENUM ('SUBSTITUTE', 'SKIP', 'PARTIAL_FILL', 'NOTIFY_ONLY');

-- CreateEnum
CREATE TYPE "ScheduledTemplateStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING_DRIVER', 'DRIVER_ASSIGNED', 'OFFER_SENT', 'ACCEPTED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'LOADING', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'PROOF_UPLOADED', 'DELIVERED', 'FAILED', 'RETURNED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('PICKUP', 'SMALL_TRUCK', 'MEDIUM_TRUCK', 'LARGE_TRUCK');

-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'FULL', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('INBOUND', 'PRE_DISPATCH', 'ON_DELIVERY', 'DISPUTE_TRIGGERED');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PASSED', 'PARTIAL_PASS', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "QualityAction" AS ENUM ('RELEASED', 'REPACK_ORDERED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('BUYER_INVOICE', 'SUPPLIER_INVOICE', 'CARRIER_INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'HELD');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('QUEUED', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_METHOD', 'PLATFORM_CREDIT', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisputeCategory" AS ENUM ('QUALITY', 'QUANTITY', 'LOGISTICS', 'FINANCIAL', 'CONTRACT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('FILED', 'ASSIGNED', 'EVIDENCE_COLLECTION', 'UNDER_REVIEW', 'RESOLUTION_PROPOSED', 'ESCALATED', 'ACCEPTED', 'REJECTED', 'EXECUTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeResponsibility" AS ENUM ('FARMER', 'CARRIER', 'BUYER', 'PLATFORM', 'SHARED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ORDER_ASSIGNMENT', 'QUALITY_CHECK', 'DISPUTE_HANDLING', 'CONTRACT_REVIEW', 'KYC_REVIEW', 'PAYOUT_APPROVAL', 'DRIVER_ASSIGNMENT', 'SLA_WARNING', 'ESCALATION_HANDLING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'ESCALATED', 'RESOLVED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "SlaStatus" AS ENUM ('NORMAL', 'WARNING', 'AT_RISK', 'BREACHED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('TIME_BASED', 'EVENT_BASED', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'OVERRIDE', 'SUSPEND', 'ACTIVATE');

-- CreateEnum
CREATE TYPE "RepackReason" AS ENUM ('QUALITY_SPLIT', 'WEIGHT_ADJUSTMENT', 'ORDER_SPLIT', 'GRADE_SEPARATION');

-- CreateEnum
CREATE TYPE "RepackStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnDestination" AS ENUM ('ORIGIN_FARM', 'WAREHOUSE', 'ON_SITE_DISPOSAL');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PenaltyStatus" AS ENUM ('PENDING', 'APPROVED', 'WAIVED', 'APPEALED', 'APPLIED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED', 'TIERED');

-- CreateEnum
CREATE TYPE "BreachSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "passwordHash" VARCHAR(255) NOT NULL,
    "userType" "UserType" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "refreshToken" VARCHAR(512) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "employeeId" VARCHAR(50),
    "role" "InternalRole" NOT NULL,
    "department" VARCHAR(100),
    "directManagerId" UUID,
    "zoneAssignments" UUID[],
    "shiftStart" VARCHAR(5),
    "shiftEnd" VARCHAR(5),
    "isOnDuty" BOOLEAN NOT NULL DEFAULT false,
    "maxConcurrentTasks" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(100) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "InternalRole" NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","permissionId")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL,
    "ownerType" VARCHAR(50) NOT NULL,
    "documentType" VARCHAR(100) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" VARCHAR(255),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "businessName" VARCHAR(255) NOT NULL,
    "farmerType" "FarmerType" NOT NULL,
    "nationalId" VARCHAR(50),
    "commercialRegNo" VARCHAR(100),
    "contactPersonName" VARCHAR(255) NOT NULL,
    "contactPhone" VARCHAR(20) NOT NULL,
    "bankAccountIban" VARCHAR(34),
    "bankName" VARCHAR(100),
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kycReviewedById" UUID,
    "kycReviewedAt" TIMESTAMP(3),
    "kycRejectionReason" TEXT,
    "creditScore" DECIMAL(5,2),
    "ratingAvg" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "accountManagerId" UUID,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_farms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farmerId" UUID NOT NULL,
    "farmName" VARCHAR(255) NOT NULL,
    "geoZoneId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "areaHectares" DECIMAL(10,2),
    "primaryProducts" TEXT[],
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmer_farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "businessName" VARCHAR(255) NOT NULL,
    "buyerType" "BuyerType" NOT NULL,
    "commercialRegNo" VARCHAR(100),
    "contactPersonName" VARCHAR(255) NOT NULL,
    "contactPhone" VARCHAR(20) NOT NULL,
    "accountTier" "AccountTier" NOT NULL DEFAULT 'STANDARD',
    "creditLimit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "creditUsed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "creditScore" DECIMAL(5,2),
    "ratingAvg" DECIMAL(3,2),
    "accountManagerId" UUID,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyerId" UUID NOT NULL,
    "branchName" VARCHAR(255) NOT NULL,
    "branchCode" VARCHAR(50),
    "geoZoneId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "contactName" VARCHAR(255),
    "contactPhone" VARCHAR(20),
    "deliveryNotes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_follows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyerId" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "companyName" VARCHAR(255) NOT NULL,
    "commercialRegNo" VARCHAR(100),
    "fleetSize" INTEGER NOT NULL DEFAULT 0,
    "hasRefrigerated" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "bankAccountIban" VARCHAR(34),
    "ratingAvg" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "shippingCompanyId" UUID,
    "fullName" VARCHAR(255) NOT NULL,
    "nationalId" VARCHAR(50) NOT NULL,
    "licenseNumber" VARCHAR(50) NOT NULL,
    "licenseExpiry" DATE NOT NULL,
    "vehiclePlate" VARCHAR(20) NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehicleCapacityKg" DECIMAL(10,2) NOT NULL,
    "hasRefrigeration" BOOLEAN NOT NULL DEFAULT false,
    "refrigerationCertExpiry" DATE,
    "bankAccountIban" VARCHAR(34),
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING',
    "ratingAvg" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_zone_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driverId" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "canPickup" BOOLEAN NOT NULL DEFAULT true,
    "canDeliver" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_zone_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zoneCode" VARCHAR(20) NOT NULL,
    "zoneName" VARCHAR(255) NOT NULL,
    "zoneNameAr" VARCHAR(255),
    "parentZoneId" UUID,
    "zoneLevel" "ZoneLevel" NOT NULL,
    "boundaryGeoJson" JSONB,
    "centroidLat" DECIMAL(10,8),
    "centroidLng" DECIMAL(11,8),
    "primaryWarehouseId" UUID,
    "secondaryWarehouseId" UUID,
    "coverageStartTime" VARCHAR(5),
    "coverageEndTime" VARCHAR(5),
    "maxOrderWeightKg" DECIMAL(10,2),
    "status" "ZoneStatus" NOT NULL DEFAULT 'ACTIVE',
    "managedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_shipping_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fromZoneId" UUID NOT NULL,
    "toZoneId" UUID NOT NULL,
    "rateType" VARCHAR(50) NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "perKgRate" DECIMAL(10,4) NOT NULL,
    "minCharge" DECIMAL(10,2),
    "maxWeightKg" DECIMAL(10,2),
    "vehicleType" "VehicleType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "setById" UUID,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_capacity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zoneId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeOrders" INTEGER,
    "activeDrivers" INTEGER,
    "availableSupplyKg" DECIMAL(15,2),
    "demandKg" DECIMAL(15,2),
    "utilizationPct" DECIMAL(5,2),
    "status" VARCHAR(50),

    CONSTRAINT "zone_capacity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nameAr" VARCHAR(255),
    "parentId" UUID,
    "storageType" "StorageType" NOT NULL,
    "tempMinC" DECIMAL(5,2),
    "tempMaxC" DECIMAL(5,2),
    "maxHoursTransit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nameAr" VARCHAR(255),
    "unitOfMeasure" VARCHAR(20) NOT NULL,
    "minOrderQty" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "maxOrderQty" DECIMAL(10,2),
    "gradeOptions" TEXT[],
    "packagingTypes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceFloor" DECIMAL(15,4),
    "priceCeiling" DECIMAL(15,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_catalog_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farmerId" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "grade" VARCHAR(10) NOT NULL DEFAULT 'A',
    "packagingType" VARCHAR(50),
    "pricePerUnit" DECIMAL(15,4) NOT NULL,
    "priceValidUntil" TIMESTAMP(3),
    "availableQty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reservedQty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "minOrderQty" DECIMAL(10,2),
    "leadTimeHours" INTEGER NOT NULL DEFAULT 24,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "lastPriceUpdated" TIMESTAMP(3),
    "updatedBy" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lotNumber" VARCHAR(100) NOT NULL,
    "farmerId" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "grade" VARCHAR(10) NOT NULL,
    "geoZoneId" UUID NOT NULL,
    "warehouseId" UUID,
    "sectionId" UUID,
    "qtyTotal" DECIMAL(15,2) NOT NULL,
    "qtyAvailable" DECIMAL(15,2) NOT NULL,
    "qtyReserved" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "qtyInQualityHold" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "qtyDamaged" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "qtyDispatched" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "harvestDate" DATE,
    "expiryDate" DATE NOT NULL,
    "batchNotes" TEXT,
    "storageType" "StorageType" NOT NULL,
    "currentTempC" DECIMAL(5,2),
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lotId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "qtyReserved" DECIMAL(15,2) NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "lot_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalogItemId" UUID NOT NULL,
    "oldPrice" DECIMAL(15,4),
    "newPrice" DECIMAL(15,4) NOT NULL,
    "changedById" UUID,
    "changedByType" VARCHAR(50),
    "changeReason" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderNumber" VARCHAR(50) NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "buyerId" UUID NOT NULL,
    "buyerBranchId" UUID,
    "pickupZoneId" UUID NOT NULL,
    "deliveryZoneId" UUID NOT NULL,
    "pickupAddress" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryLatitude" DECIMAL(10,8),
    "deliveryLongitude" DECIMAL(11,8),
    "contractId" UUID,
    "scheduledTemplateId" UUID,
    "requestedDeliveryAt" TIMESTAMP(3),
    "confirmedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2),
    "logisticsFee" DECIMAL(15,2),
    "taxAmount" DECIMAL(15,2),
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'SAR',
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "cancellationReason" TEXT,
    "cancelledById" UUID,
    "cancelledByType" VARCHAR(50),
    "assignedOpsId" UUID,
    "shipmentId" UUID,
    "invoiceId" UUID,
    "buyerNotes" TEXT,
    "internalNotes" TEXT,
    "deliveryProofUrl" TEXT,
    "deliveryConfirmedBy" VARCHAR(50),
    "disputeWindowEnds" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "farmerId" UUID NOT NULL,
    "catalogItemId" UUID,
    "grade" VARCHAR(10),
    "packagingType" VARCHAR(50),
    "requestedQty" DECIMAL(15,2) NOT NULL,
    "confirmedQty" DECIMAL(15,2),
    "deliveredQty" DECIMAL(15,2),
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "pricedLockedAt" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "qualityStatus" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "changedById" UUID,
    "changedByType" VARCHAR(50),
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_order_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateNumber" VARCHAR(50) NOT NULL,
    "buyerId" UUID NOT NULL,
    "buyerBranchId" UUID,
    "deliveryZoneId" UUID NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "frequencyType" "ScheduledFrequency" NOT NULL,
    "frequencyDays" INTEGER[],
    "preferredDeliveryTime" VARCHAR(5),
    "deliveryWindowMinutes" INTEGER NOT NULL DEFAULT 120,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT true,
    "modificationCutoffHours" INTEGER NOT NULL DEFAULT 12,
    "substitutionRule" "SubstitutionRule" NOT NULL DEFAULT 'SKIP',
    "status" "ScheduledTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" DATE NOT NULL,
    "validUntil" DATE,
    "contractId" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_order_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_order_template_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "preferredFarmerId" UUID,
    "grade" VARCHAR(10),
    "qtyFixed" DECIMAL(15,2),
    "qtyMin" DECIMAL(15,2),
    "qtyMax" DECIMAL(15,2),

    CONSTRAINT "scheduled_order_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_order_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "orderId" UUID,
    "scheduledDate" DATE NOT NULL,
    "generationStatus" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "scheduled_order_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractNumber" VARCHAR(50) NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "farmerId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalVolumeMin" DECIMAL(15,2),
    "totalVolumeMax" DECIMAL(15,2),
    "volumeUnit" VARCHAR(20) NOT NULL DEFAULT 'KG',
    "settlementFrequency" "SettlementFrequency" NOT NULL DEFAULT 'PER_ORDER',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
    "priceLockType" "PriceLockType" NOT NULL DEFAULT 'FIXED',
    "priceReviewFrequency" VARCHAR(50),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "draftedById" UUID,
    "reviewedById" UUID,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "farmerSignedAt" TIMESTAMP(3),
    "buyerSignedAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledById" UUID,
    "internalNotes" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "grade" VARCHAR(10),
    "qtyPerPeriod" DECIMAL(15,2) NOT NULL,
    "periodUnit" VARCHAR(20) NOT NULL,
    "tolerancePct" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "pricePerUnit" DECIMAL(15,4),
    "priceBandMin" DECIMAL(15,4),
    "priceBandMax" DECIMAL(15,4),

    CONSTRAINT "contract_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_penalty_clauses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractId" UUID NOT NULL,
    "breachType" VARCHAR(100) NOT NULL,
    "threshold" DECIMAL(10,4),
    "penaltyType" VARCHAR(50) NOT NULL,
    "penaltyValue" DECIMAL(15,4) NOT NULL,
    "maxPenalty" DECIMAL(15,2),
    "appliesTo" VARCHAR(50) NOT NULL,

    CONSTRAINT "contract_penalty_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalty_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractId" UUID NOT NULL,
    "clauseId" UUID NOT NULL,
    "farmerId" UUID,
    "orderId" UUID,
    "appliedTo" VARCHAR(50) NOT NULL,
    "breachEvidence" TEXT NOT NULL,
    "penaltyAmount" DECIMAL(15,2) NOT NULL,
    "status" "PenaltyStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" UUID,
    "waivedById" UUID,
    "waiveReason" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalty_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentNumber" VARCHAR(50) NOT NULL,
    "orderId" UUID NOT NULL,
    "shippingCompanyId" UUID,
    "driverId" UUID,
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" DECIMAL(10,8),
    "pickupLng" DECIMAL(11,8),
    "pickupZoneId" UUID NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryLat" DECIMAL(10,8),
    "deliveryLng" DECIMAL(11,8),
    "deliveryZoneId" UUID NOT NULL,
    "declaredWeightKg" DECIMAL(10,2),
    "actualWeightKg" DECIMAL(10,2),
    "vehicleType" "VehicleType",
    "requiresRefrigeration" BOOLEAN NOT NULL DEFAULT false,
    "estimatedPickupAt" TIMESTAMP(3),
    "actualPickupAt" TIMESTAMP(3),
    "estimatedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "logisticsFee" DECIMAL(15,2) NOT NULL,
    "feeCalculation" JSONB,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING_DRIVER',
    "deliveryPhotoUrls" TEXT[],
    "deliverySignatureUrl" TEXT,
    "deliveryConfirmedBy" VARCHAR(50),
    "driverNotes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_trips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "tripNumber" VARCHAR(50) NOT NULL,
    "offerSentAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "pickupArrivedAt" TIMESTAMP(3),
    "pickupWaitMinutes" INTEGER,
    "pickupConfirmedAt" TIMESTAMP(3),
    "weighSlipUrl" TEXT,
    "inTransitStartedAt" TIMESTAMP(3),
    "gpsRouteLog" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "proofUploadedAt" TIMESTAMP(3),
    "temperatureLog" JSONB,
    "tempBreachDetected" BOOLEAN NOT NULL DEFAULT false,
    "distanceKm" DECIMAL(10,2),
    "durationMinutes" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "driverRating" DECIMAL(3,2),
    "ratedByBuyer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driverId" UUID NOT NULL,
    "tripId" UUID,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "speedKmh" DECIMAL(6,2),
    "heading" DECIMAL(6,2),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driverId" UUID NOT NULL,
    "shiftDate" DATE NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "vehiclePlate" VARCHAR(20),
    "vehicleTempC" DECIMAL(5,2),
    "status" VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    "tripsCount" INTEGER NOT NULL DEFAULT 0,
    "totalKgDelivered" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "driver_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrier_rate_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shippingCompanyId" UUID NOT NULL,
    "fromZoneId" UUID NOT NULL,
    "toZoneId" UUID NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "perKgRate" DECIMAL(10,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrier_rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouseCode" VARCHAR(20) NOT NULL,
    "warehouseName" VARCHAR(255) NOT NULL,
    "geoZoneId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "totalCapacityM3" DECIMAL(10,2),
    "managerId" UUID,
    "operatingHoursStart" VARCHAR(5),
    "operatingHoursEnd" VARCHAR(5),
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouseId" UUID NOT NULL,
    "sectionCode" VARCHAR(20) NOT NULL,
    "sectionName" VARCHAR(100) NOT NULL,
    "storageType" "StorageType" NOT NULL,
    "targetTempMinC" DECIMAL(5,2),
    "targetTempMaxC" DECIMAL(5,2),
    "capacityM3" DECIMAL(10,2),
    "usedM3" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "warehouse_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temperature_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sectionId" UUID,
    "tripId" UUID,
    "sensorId" VARCHAR(100),
    "temperatureC" DECIMAL(5,2) NOT NULL,
    "humidityPct" DECIMAL(5,2),
    "isBreach" BOOLEAN NOT NULL DEFAULT false,
    "breachSeverity" "BreachSeverity",
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temperature_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repacking_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repackNumber" VARCHAR(50) NOT NULL,
    "warehouseId" UUID NOT NULL,
    "sourceLotId" UUID NOT NULL,
    "orderId" UUID,
    "repackReason" "RepackReason" NOT NULL,
    "sourceQty" DECIMAL(15,2) NOT NULL,
    "goodQty" DECIMAL(15,2),
    "damagedQty" DECIMAL(15,2),
    "initiatedById" UUID NOT NULL,
    "approvedById" UUID,
    "completedById" UUID,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "RepackStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repacking_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repacking_output_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repackOrderId" UUID NOT NULL,
    "newLotId" UUID NOT NULL,
    "grade" VARCHAR(10),
    "qty" DECIMAL(15,2) NOT NULL,
    "packagingType" VARCHAR(50),

    CONSTRAINT "repacking_output_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_standards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID,
    "categoryId" UUID,
    "grade" VARCHAR(10) NOT NULL,
    "tempMinOnArrivalC" DECIMAL(5,2),
    "tempMaxOnArrivalC" DECIMAL(5,2),
    "maxDefectPct" DECIMAL(5,2),
    "maxWeightVariancePct" DECIMAL(5,2) NOT NULL DEFAULT 2,
    "visualCriteria" TEXT,
    "rejectionCriteria" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspectionNumber" VARCHAR(50) NOT NULL,
    "lotId" UUID NOT NULL,
    "orderId" UUID,
    "orderItemId" UUID,
    "warehouseId" UUID,
    "inspectorId" UUID NOT NULL,
    "inspectionType" "InspectionType" NOT NULL,
    "declaredWeightKg" DECIMAL(10,2),
    "actualWeightKg" DECIMAL(10,2),
    "weightVariancePct" DECIMAL(5,2),
    "temperatureOnArrival" DECIMAL(5,2),
    "tempCompliant" BOOLEAN,
    "visualGrade" VARCHAR(10),
    "defectPct" DECIMAL(5,2),
    "result" "InspectionResult" NOT NULL DEFAULT 'PENDING',
    "passedQty" DECIMAL(15,2),
    "rejectedQty" DECIMAL(15,2),
    "actionTaken" "QualityAction",
    "supervisorSignOffId" UUID,
    "supervisorNotes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspectionId" UUID NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" VARCHAR(50),
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspectionId" UUID NOT NULL,
    "defectType" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "affectedPct" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "defect_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL,
    "orderId" UUID,
    "contractId" UUID,
    "issuerId" UUID NOT NULL,
    "issuerType" VARCHAR(50) NOT NULL,
    "recipientId" UUID NOT NULL,
    "recipientType" VARCHAR(50) NOT NULL,
    "lineItems" JSONB NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "taxAmount" DECIMAL(15,2) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'SAR',
    "dueDate" DATE,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedBy" VARCHAR(50),
    "generatedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paymentNumber" VARCHAR(50) NOT NULL,
    "invoiceId" UUID NOT NULL,
    "payerId" UUID NOT NULL,
    "payerType" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'SAR',
    "paymentMethod" VARCHAR(50) NOT NULL,
    "paymentReference" VARCHAR(255),
    "gatewayTransactionId" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "holdReason" TEXT,
    "heldAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batchNumber" VARCHAR(50) NOT NULL,
    "batchDate" DATE NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'BUILDING',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payoutNumber" VARCHAR(50) NOT NULL,
    "payoutBatchId" UUID,
    "recipientId" UUID NOT NULL,
    "recipientType" VARCHAR(50) NOT NULL,
    "farmerId" UUID,
    "shippingCompanyId" UUID,
    "driverId" UUID,
    "buyerId" UUID,
    "orderId" UUID,
    "invoiceId" UUID,
    "grossAmount" DECIMAL(15,2) NOT NULL,
    "commissionDeducted" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "penaltiesDeducted" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'SAR',
    "recipientIban" VARCHAR(34),
    "status" "PayoutStatus" NOT NULL DEFAULT 'QUEUED',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "bankReference" VARCHAR(255),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruleName" VARCHAR(255) NOT NULL,
    "appliesTo" VARCHAR(50) NOT NULL,
    "appliesToValue" VARCHAR(100),
    "orderType" "OrderType",
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" DECIMAL(10,4) NOT NULL,
    "minCommission" DECIMAL(10,2),
    "maxCommission" DECIMAL(10,2),
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_holds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paymentId" UUID,
    "payoutId" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "holdReason" VARCHAR(100) NOT NULL,
    "referenceId" UUID,
    "referenceType" VARCHAR(50),
    "heldById" UUID NOT NULL,
    "releasedById" UUID,
    "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releaseNotes" TEXT,

    CONSTRAINT "financial_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "refundNumber" VARCHAR(50) NOT NULL,
    "originalPaymentId" UUID NOT NULL,
    "orderId" UUID,
    "disputeId" UUID,
    "refundAmount" DECIMAL(15,2) NOT NULL,
    "refundType" "RefundType" NOT NULL,
    "refundMethod" "RefundMethod" NOT NULL,
    "refundReason" TEXT NOT NULL,
    "initiatedById" UUID NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disputeNumber" VARCHAR(50) NOT NULL,
    "orderId" UUID NOT NULL,
    "filedById" UUID NOT NULL,
    "filedByType" VARCHAR(50) NOT NULL,
    "againstId" UUID NOT NULL,
    "againstType" VARCHAR(50) NOT NULL,
    "disputeCategory" "DisputeCategory" NOT NULL,
    "disputeSubcategory" VARCHAR(100),
    "description" TEXT NOT NULL,
    "claimedAmount" DECIMAL(15,2),
    "status" "DisputeStatus" NOT NULL DEFAULT 'FILED',
    "assignedToId" UUID,
    "assignedAt" TIMESTAMP(3),
    "evidenceDeadline" TIMESTAMP(3),
    "resolutionDeadline" TIMESTAMP(3),
    "responsibility" "DisputeResponsibility",
    "resolutionType" VARCHAR(100),
    "resolutionNotes" TEXT,
    "escalatedToId" UUID,
    "escalationReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disputeId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "submittedByType" VARCHAR(50) NOT NULL,
    "evidenceType" VARCHAR(100) NOT NULL,
    "fileUrl" TEXT,
    "description" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "returnNumber" VARCHAR(50) NOT NULL,
    "orderId" UUID NOT NULL,
    "disputeId" UUID,
    "shipmentId" UUID,
    "returnReason" VARCHAR(100) NOT NULL,
    "returnDestination" "ReturnDestination" NOT NULL,
    "itemsReturned" JSONB NOT NULL,
    "returnDriverId" UUID,
    "initiatedById" UUID NOT NULL,
    "approvedById" UUID,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "costBearer" VARCHAR(50),
    "returnCost" DECIMAL(15,2),
    "pickupConfirmedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "taskType" "TaskType" NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "warningAtPct" DECIMAL(5,2) NOT NULL DEFAULT 60,
    "atRiskAtPct" DECIMAL(5,2) NOT NULL DEFAULT 85,
    "escalateAtPct" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "escalationTargetRole" "InternalRole",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "taskNumber" VARCHAR(50) NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'P2',
    "referenceId" UUID,
    "referenceType" VARCHAR(50),
    "assignedToId" UUID,
    "assignedAt" TIMESTAMP(3),
    "assignedById" UUID,
    "slaDefinitionId" UUID,
    "slaDeadline" TIMESTAMP(3),
    "slaStatus" "SlaStatus" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'CREATED',
    "blockerReason" TEXT,
    "resolutionNotes" TEXT,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "taskId" UUID NOT NULL,
    "escalationLevel" INTEGER NOT NULL,
    "escalatedFromId" UUID,
    "escalatedToId" UUID NOT NULL,
    "escalationType" "EscalationType" NOT NULL,
    "reason" TEXT,
    "slaRemainingPct" DECIMAL(5,2),
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "approvalNumber" VARCHAR(50) NOT NULL,
    "approvalType" VARCHAR(100) NOT NULL,
    "referenceId" UUID NOT NULL,
    "referenceType" VARCHAR(50) NOT NULL,
    "requestedById" UUID NOT NULL,
    "currentApproverId" UUID,
    "approvalFlow" JSONB NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT,
    "finalDecisionAt" TIMESTAMP(3),
    "finalDecisionById" UUID,
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipientId" UUID NOT NULL,
    "recipientType" VARCHAR(50) NOT NULL,
    "notificationType" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
    "channels" TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notificationId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "senderId" UUID NOT NULL,
    "senderType" VARCHAR(50) NOT NULL,
    "recipientId" UUID NOT NULL,
    "recipientType" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(255),
    "content" TEXT NOT NULL,
    "referenceId" UUID,
    "referenceType" VARCHAR(50),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "auditId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID,
    "actorType" VARCHAR(50),
    "actionType" "AuditAction" NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" UUID NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "changeDelta" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "sessionId" VARCHAR(255),
    "reason" TEXT,
    "relatedAuditId" UUID,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" UUID NOT NULL,
    "activityType" VARCHAR(100) NOT NULL,
    "performedById" UUID,
    "performedByType" VARCHAR(50),
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "raterId" UUID NOT NULL,
    "raterType" VARCHAR(50) NOT NULL,
    "ratedId" UUID NOT NULL,
    "ratedType" VARCHAR(50) NOT NULL,
    "farmerId" UUID,
    "buyerId" UUID,
    "driverId" UUID,
    "orderId" UUID,
    "score" DECIMAL(3,2) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_userType_status_idx" ON "users"("userType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshToken_key" ON "user_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_users_userId_key" ON "internal_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_users_employeeId_key" ON "internal_users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "kyc_documents_ownerId_ownerType_idx" ON "kyc_documents"("ownerId", "ownerType");

-- CreateIndex
CREATE UNIQUE INDEX "farmers_userId_key" ON "farmers"("userId");

-- CreateIndex
CREATE INDEX "farmers_kycStatus_idx" ON "farmers"("kycStatus");

-- CreateIndex
CREATE INDEX "farmer_farms_geoZoneId_idx" ON "farmer_farms"("geoZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_userId_key" ON "buyers"("userId");

-- CreateIndex
CREATE INDEX "buyers_kycStatus_idx" ON "buyers"("kycStatus");

-- CreateIndex
CREATE INDEX "buyers_accountTier_idx" ON "buyers"("accountTier");

-- CreateIndex
CREATE INDEX "buyer_branches_buyerId_idx" ON "buyer_branches"("buyerId");

-- CreateIndex
CREATE INDEX "buyer_branches_geoZoneId_idx" ON "buyer_branches"("geoZoneId");

-- CreateIndex
CREATE INDEX "farm_follows_farmId_idx" ON "farm_follows"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_follows_buyerId_farmId_key" ON "farm_follows"("buyerId", "farmId");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_companies_userId_key" ON "shipping_companies"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_zone_assignments_driverId_zoneId_key" ON "driver_zone_assignments"("driverId", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "geo_zones_zoneCode_key" ON "geo_zones"("zoneCode");

-- CreateIndex
CREATE UNIQUE INDEX "zone_shipping_rates_fromZoneId_toZoneId_vehicleType_effecti_key" ON "zone_shipping_rates"("fromZoneId", "toZoneId", "vehicleType", "effectiveFrom");

-- CreateIndex
CREATE INDEX "zone_capacity_logs_zoneId_recordedAt_idx" ON "zone_capacity_logs"("zoneId", "recordedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_code_key" ON "product_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "farmer_catalog_items_productId_idx" ON "farmer_catalog_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_catalog_items_farmerId_productId_grade_packagingType_key" ON "farmer_catalog_items"("farmerId", "productId", "grade", "packagingType");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lots_lotNumber_key" ON "inventory_lots"("lotNumber");

-- CreateIndex
CREATE INDEX "inventory_lots_productId_geoZoneId_idx" ON "inventory_lots"("productId", "geoZoneId");

-- CreateIndex
CREATE INDEX "inventory_lots_status_idx" ON "inventory_lots"("status");

-- CreateIndex
CREATE INDEX "inventory_lots_expiryDate_idx" ON "inventory_lots"("expiryDate");

-- CreateIndex
CREATE INDEX "inventory_lots_farmerId_idx" ON "inventory_lots"("farmerId");

-- CreateIndex
CREATE INDEX "lot_reservations_orderId_idx" ON "lot_reservations"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "lot_reservations_lotId_orderItemId_key" ON "lot_reservations"("lotId", "orderItemId");

-- CreateIndex
CREATE INDEX "price_history_catalogItemId_effectiveAt_idx" ON "price_history"("catalogItemId", "effectiveAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_buyerId_idx" ON "orders"("buyerId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_pickupZoneId_deliveryZoneId_idx" ON "orders"("pickupZoneId", "deliveryZoneId");

-- CreateIndex
CREATE INDEX "orders_confirmedDeliveryAt_idx" ON "orders"("confirmedDeliveryAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_farmerId_idx" ON "order_items"("farmerId");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_changedAt_idx" ON "order_status_history"("orderId", "changedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_order_templates_templateNumber_key" ON "scheduled_order_templates"("templateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_order_template_items_templateId_productId_grade_key" ON "scheduled_order_template_items"("templateId", "productId", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_order_instances_templateId_scheduledDate_key" ON "scheduled_order_instances"("templateId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "supply_contracts_contractNumber_key" ON "supply_contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "supply_contracts_farmerId_idx" ON "supply_contracts"("farmerId");

-- CreateIndex
CREATE INDEX "supply_contracts_buyerId_idx" ON "supply_contracts"("buyerId");

-- CreateIndex
CREATE INDEX "supply_contracts_status_idx" ON "supply_contracts"("status");

-- CreateIndex
CREATE INDEX "supply_contracts_endDate_idx" ON "supply_contracts"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "contract_items_contractId_productId_grade_key" ON "contract_items"("contractId", "productId", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "shipments"("shipmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderId_key" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_driverId_idx" ON "shipments"("driverId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_trips_tripNumber_key" ON "driver_trips"("tripNumber");

-- CreateIndex
CREATE INDEX "driver_locations_driverId_recordedAt_idx" ON "driver_locations"("driverId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "driver_locations_tripId_recordedAt_idx" ON "driver_locations"("tripId", "recordedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "driver_shifts_driverId_shiftDate_key" ON "driver_shifts"("driverId", "shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "carrier_rate_cards_shippingCompanyId_fromZoneId_toZoneId_ve_key" ON "carrier_rate_cards"("shippingCompanyId", "fromZoneId", "toZoneId", "vehicleType", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_warehouseCode_key" ON "warehouses"("warehouseCode");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_sections_warehouseId_sectionCode_key" ON "warehouse_sections"("warehouseId", "sectionCode");

-- CreateIndex
CREATE INDEX "temperature_logs_sectionId_recordedAt_idx" ON "temperature_logs"("sectionId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "temperature_logs_isBreach_recordedAt_idx" ON "temperature_logs"("isBreach", "recordedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "repacking_orders_repackNumber_key" ON "repacking_orders"("repackNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_inspectionNumber_key" ON "quality_inspections"("inspectionNumber");

-- CreateIndex
CREATE INDEX "quality_inspections_lotId_idx" ON "quality_inspections"("lotId");

-- CreateIndex
CREATE INDEX "quality_inspections_orderId_idx" ON "quality_inspections"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoices_recipientId_recipientType_idx" ON "invoices"("recipientId", "recipientType");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payout_batches_batchNumber_key" ON "payout_batches"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_payoutNumber_key" ON "payouts"("payoutNumber");

-- CreateIndex
CREATE INDEX "payouts_recipientId_recipientType_idx" ON "payouts"("recipientId", "recipientType");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundNumber_key" ON "refunds"("refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_disputeNumber_key" ON "disputes"("disputeNumber");

-- CreateIndex
CREATE INDEX "disputes_orderId_idx" ON "disputes"("orderId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "disputes_assignedToId_idx" ON "disputes"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "return_orders_returnNumber_key" ON "return_orders"("returnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sla_definitions_taskType_key" ON "sla_definitions"("taskType");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_taskNumber_key" ON "tasks"("taskNumber");

-- CreateIndex
CREATE INDEX "tasks_assignedToId_status_idx" ON "tasks"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "tasks_priority_slaStatus_idx" ON "tasks"("priority", "slaStatus");

-- CreateIndex
CREATE INDEX "tasks_referenceId_referenceType_idx" ON "tasks"("referenceId", "referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_approvalNumber_key" ON "approval_requests"("approvalNumber");

-- CreateIndex
CREATE INDEX "notifications_recipientId_recipientType_isRead_idx" ON "notifications"("recipientId", "recipientType", "isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "communication_logs_referenceId_referenceType_idx" ON "communication_logs"("referenceId", "referenceType");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_timestamp_idx" ON "audit_logs"("actorId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_createdAt_idx" ON "activity_logs"("entityType", "entityId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_users" ADD CONSTRAINT "internal_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_users" ADD CONSTRAINT "internal_users_directManagerId_fkey" FOREIGN KEY ("directManagerId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_kycReviewedById_fkey" FOREIGN KEY ("kycReviewedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_farms" ADD CONSTRAINT "farmer_farms_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_farms" ADD CONSTRAINT "farmer_farms_geoZoneId_fkey" FOREIGN KEY ("geoZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_branches" ADD CONSTRAINT "buyer_branches_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_branches" ADD CONSTRAINT "buyer_branches_geoZoneId_fkey" FOREIGN KEY ("geoZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_follows" ADD CONSTRAINT "farm_follows_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_follows" ADD CONSTRAINT "farm_follows_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farmer_farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_companies" ADD CONSTRAINT "shipping_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "shipping_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_zone_assignments" ADD CONSTRAINT "driver_zone_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_zone_assignments" ADD CONSTRAINT "driver_zone_assignments_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_zones" ADD CONSTRAINT "geo_zones_parentZoneId_fkey" FOREIGN KEY ("parentZoneId") REFERENCES "geo_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_zones" ADD CONSTRAINT "geo_zones_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_shipping_rates" ADD CONSTRAINT "zone_shipping_rates_fromZoneId_fkey" FOREIGN KEY ("fromZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_shipping_rates" ADD CONSTRAINT "zone_shipping_rates_toZoneId_fkey" FOREIGN KEY ("toZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_shipping_rates" ADD CONSTRAINT "zone_shipping_rates_setById_fkey" FOREIGN KEY ("setById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_shipping_rates" ADD CONSTRAINT "zone_shipping_rates_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_capacity_logs" ADD CONSTRAINT "zone_capacity_logs_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_catalog_items" ADD CONSTRAINT "farmer_catalog_items_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_catalog_items" ADD CONSTRAINT "farmer_catalog_items_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farmer_farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_catalog_items" ADD CONSTRAINT "farmer_catalog_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farmer_farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_geoZoneId_fkey" FOREIGN KEY ("geoZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "warehouse_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_reservations" ADD CONSTRAINT "lot_reservations_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_reservations" ADD CONSTRAINT "lot_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_reservations" ADD CONSTRAINT "lot_reservations_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "farmer_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerBranchId_fkey" FOREIGN KEY ("buyerBranchId") REFERENCES "buyer_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickupZoneId_fkey" FOREIGN KEY ("pickupZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "supply_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_scheduledTemplateId_fkey" FOREIGN KEY ("scheduledTemplateId") REFERENCES "scheduled_order_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_templates" ADD CONSTRAINT "scheduled_order_templates_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_templates" ADD CONSTRAINT "scheduled_order_templates_buyerBranchId_fkey" FOREIGN KEY ("buyerBranchId") REFERENCES "buyer_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_templates" ADD CONSTRAINT "scheduled_order_templates_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_templates" ADD CONSTRAINT "scheduled_order_templates_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "supply_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_templates" ADD CONSTRAINT "scheduled_order_templates_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_template_items" ADD CONSTRAINT "scheduled_order_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "scheduled_order_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_template_items" ADD CONSTRAINT "scheduled_order_template_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_order_instances" ADD CONSTRAINT "scheduled_order_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "scheduled_order_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_contracts" ADD CONSTRAINT "supply_contracts_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_contracts" ADD CONSTRAINT "supply_contracts_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_contracts" ADD CONSTRAINT "supply_contracts_draftedById_fkey" FOREIGN KEY ("draftedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_contracts" ADD CONSTRAINT "supply_contracts_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_contracts" ADD CONSTRAINT "supply_contracts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "supply_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_penalty_clauses" ADD CONSTRAINT "contract_penalty_clauses_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "supply_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_applications" ADD CONSTRAINT "penalty_applications_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "supply_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_applications" ADD CONSTRAINT "penalty_applications_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "contract_penalty_clauses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_applications" ADD CONSTRAINT "penalty_applications_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_applications" ADD CONSTRAINT "penalty_applications_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_applications" ADD CONSTRAINT "penalty_applications_waivedById_fkey" FOREIGN KEY ("waivedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "shipping_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_pickupZoneId_fkey" FOREIGN KEY ("pickupZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trips" ADD CONSTRAINT "driver_trips_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trips" ADD CONSTRAINT "driver_trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "driver_trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_shifts" ADD CONSTRAINT "driver_shifts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrier_rate_cards" ADD CONSTRAINT "carrier_rate_cards_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "shipping_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_geoZoneId_fkey" FOREIGN KEY ("geoZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_sections" ADD CONSTRAINT "warehouse_sections_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "warehouse_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repacking_orders" ADD CONSTRAINT "repacking_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repacking_orders" ADD CONSTRAINT "repacking_orders_sourceLotId_fkey" FOREIGN KEY ("sourceLotId") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repacking_orders" ADD CONSTRAINT "repacking_orders_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repacking_orders" ADD CONSTRAINT "repacking_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repacking_output_lots" ADD CONSTRAINT "repacking_output_lots_repackOrderId_fkey" FOREIGN KEY ("repackOrderId") REFERENCES "repacking_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repacking_output_lots" ADD CONSTRAINT "repacking_output_lots_newLotId_fkey" FOREIGN KEY ("newLotId") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_standards" ADD CONSTRAINT "quality_standards_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_standards" ADD CONSTRAINT "quality_standards_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_supervisorSignOffId_fkey" FOREIGN KEY ("supervisorSignOffId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_photos" ADD CONSTRAINT "quality_photos_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_records" ADD CONSTRAINT "defect_records_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "payout_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "shipping_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_holds" ADD CONSTRAINT "financial_holds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_holds" ADD CONSTRAINT "financial_holds_heldById_fkey" FOREIGN KEY ("heldById") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_holds" ADD CONSTRAINT "financial_holds_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_originalPaymentId_fkey" FOREIGN KEY ("originalPaymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_slaDefinitionId_fkey" FOREIGN KEY ("slaDefinitionId") REFERENCES "sla_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalatedFromId_fkey" FOREIGN KEY ("escalatedFromId") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_finalDecisionById_fkey" FOREIGN KEY ("finalDecisionById") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

