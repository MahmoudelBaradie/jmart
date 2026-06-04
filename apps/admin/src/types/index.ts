export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  userType: string;
  status: string;
  createdAt: string;
  internalUser?: InternalUser;
  farmer?: { businessName: string };
  buyer?: { businessName: string };
}

export interface InternalUser {
  id: string;
  fullName: string;
  role: string;
  department?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  buyerId: string;
  buyer?: { id: string; businessName: string; contactPersonName: string };
  deliveryAddress: string;
  requestedDeliveryAt?: string;
  subtotal?: number;
  totalAmount?: number;
  createdAt: string;
  _count?: { items: number };
}

export interface Farmer {
  id: string;
  businessName: string;
  contactPersonName: string;
  contactPhone: string;
  kycStatus: string;
  status: string;
  userId: string;
  createdAt: string;
  user?: { email: string };
}

export interface Buyer {
  id: string;
  businessName: string;
  contactPersonName: string;
  contactPhone: string;
  kycStatus: string;
  status: string;
  userId: string;
  createdAt: string;
  user?: { email: string };
}

export interface Driver {
  id: string;
  fullName: string;
  vehicleType: string;
  vehiclePlate?: string;
  vehicleCapacityKg?: number;
  status: string;
  userId: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  status: string;
  orderId: string;
  order?: { orderNumber: string; totalAmount?: number };
  driver?: { fullName: string; vehiclePlate?: string };
  estimatedDeliveryAt?: string;
  actualDeliveryAt?: string;
  createdAt: string;
}

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  inspectionType: string;
  result: string;
  lotId: string;
  lot?: { lotNumber: string };
  inspector?: { fullName: string };
  createdAt: string;
  completedAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  totalAmount: number;
  dueDate?: string;
  orderId: string;
  order?: { orderNumber: string };
  createdAt: string;
}

export interface Dispute {
  id: string;
  disputeNumber: string;
  status: string;
  disputeCategory: string;
  description: string;
  orderId?: string;
  filedById: string;
  createdAt: string;
}

export interface Task {
  id: string;
  taskNumber: string;
  taskType: string;
  title: string;
  priority: string;
  status: string;
  assignedTo?: { fullName: string; role: string };
  slaDeadline?: string;
  createdAt: string;
}

export interface InventoryLot {
  id: string;
  lotNumber: string;
  status: string;
  qtyAvailable?: number;
  qtyTotal?: number;
  farmerId: string;
  productId: string;
  product?: { name: string; category: string };
  farmer?: { businessName: string };
  createdAt: string;
}

export interface Warehouse {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  status: string;
  totalCapacityM3?: number;
  city?: string;
  address?: string;
  createdAt: string;
}

export interface GeoZone {
  id: string;
  zoneName: string;
  zoneCode: string;
  zoneLevel: number;
  status: string;
  parentZoneId?: string;
  createdAt: string;
}
