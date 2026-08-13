import { In } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES, RoleCode } from '@/constants/rbac';
import { Permission } from '@/modules/auth/models/permission.model';
import { Role } from '@/modules/auth/models/role.model';
import { User } from '@/modules/auth/models/user.model';

const parseAdminEmails = (): string[] => {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
};

export const seedRbac = async (): Promise<void> => {
  const permissionRepository = AppDataSource.getRepository(Permission);
  const roleRepository = AppDataSource.getRepository(Role);
  const userRepository = AppDataSource.getRepository(User);

  for (const permission of DEFAULT_PERMISSIONS) {
    await permissionRepository.upsert(permission, ['code']);
  }

  const permissions = await permissionRepository.find();
  const permissionByCode = new Map(permissions.map(permission => [permission.code, permission]));

  for (const roleDefinition of DEFAULT_ROLES) {
    await roleRepository.upsert(
      {
        code: roleDefinition.code,
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: roleDefinition.isSystem,
      },
      ['code']
    );

    const role = await roleRepository.findOne({
      where: { code: roleDefinition.code },
      relations: {
        permissions: true,
      },
    });

    if (role) {
      role.permissions = roleDefinition.permissions
        .map(permissionCode => permissionByCode.get(permissionCode))
        .filter((permission): permission is Permission => Boolean(permission));
      await roleRepository.save(role);
    }
  }

  const userRole = await roleRepository.findOne({ where: { code: RoleCode.USER } });
  if (userRole) {
    const usersWithoutRoles = await userRepository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .where('role.idRole IS NULL')
      .getMany();

    for (const user of usersWithoutRoles) {
      user.roles = [userRole];
      await userRepository.save(user);
    }
  }

  const adminEmails = parseAdminEmails();
  const adminRole = await roleRepository.findOne({ where: { code: RoleCode.ADMIN } });
  if (adminEmails.length > 0 && adminRole) {
    const adminUsers = await userRepository.find({
      where: { email: In(adminEmails) },
      relations: {
        roles: true,
      },
    });

    for (const user of adminUsers) {
      const hasAdminRole = user.roles?.some(role => role.code === RoleCode.ADMIN);
      if (!hasAdminRole) {
        user.roles = [...(user.roles || []), adminRole];
        await userRepository.save(user);
      }
    }
  }
};
