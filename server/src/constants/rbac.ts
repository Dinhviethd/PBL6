export const RoleCode = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

export const PermissionCode = {
  AUTH_READ_SELF: 'auth:read_self',
  RBAC_READ: 'rbac:read',
  RBAC_MANAGE: 'rbac:manage',
} as const;

export type PermissionCode = (typeof PermissionCode)[keyof typeof PermissionCode];

export const DEFAULT_PERMISSIONS = [
  {
    code: PermissionCode.AUTH_READ_SELF,
    name: 'Read own auth profile',
    description: 'Allows a user to read their own authenticated profile.',
  },
  {
    code: PermissionCode.RBAC_READ,
    name: 'Read RBAC data',
    description: 'Allows reading role and permission data.',
  },
  {
    code: PermissionCode.RBAC_MANAGE,
    name: 'Manage RBAC data',
    description: 'Allows managing roles, permissions, and assignments.',
  },
] as const;

export const DEFAULT_ROLES = [
  {
    code: RoleCode.USER,
    name: 'User',
    description: 'Default role for registered users.',
    isSystem: true,
    permissions: [PermissionCode.AUTH_READ_SELF],
  },
  {
    code: RoleCode.ADMIN,
    name: 'Admin',
    description: 'System administrator with all permissions.',
    isSystem: true,
    permissions: Object.values(PermissionCode),
  },
] as const;
