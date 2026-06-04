import { SetMetadata } from '@nestjs/common';
import { InternalRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: InternalRole[]) => SetMetadata(ROLES_KEY, roles);
