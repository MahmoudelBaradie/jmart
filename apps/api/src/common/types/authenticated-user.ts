import { UserType, UserStatus, InternalRole } from '@prisma/client';

/**
 * Shape of `request.user` after JWT auth passes — this is exactly what
 * `JwtStrategy.validate()` returns (the full User row with related
 * profiles, minus passwordHash).
 *
 * Use this type for `@CurrentUser()` parameters in controllers instead of
 * `any` so callers get autocomplete and compile-time checks for fields
 * like `user.farmer?.id`, `user.internalUser?.role`, etc.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: UserType;
  status: UserStatus;
  phone?: string | null;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // ── Profile relations (only one is populated based on userType) ──
  internalUser?: {
    id: string;
    role: InternalRole;
    firstName?: string | null;
    lastName?: string | null;
  } | null;

  farmer?: {
    id: string;
    businessName?: string | null;
    contactPhone?: string | null;
  } | null;

  buyer?: {
    id: string;
    businessName?: string | null;
    phone?: string | null;
  } | null;

  driver?: {
    id: string;
    fullName?: string | null;
  } | null;

  shippingCompany?: {
    id: string;
    companyName?: string | null;
  } | null;
}
