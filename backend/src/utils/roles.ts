import { Role } from '@prisma/client';

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 5,
  GERENTE: 4,
  SUPERVISOR: 3,
  COLABORADOR: 2,
  USUARIO: 1,
};

export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY[role];
}

export function isRoleAtLeast(userRole: Role, minRole: Role): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(minRole);
}

export function isRoleAbove(userRole: Role, targetRole: Role): boolean {
  return getRoleLevel(userRole) > getRoleLevel(targetRole);
}
