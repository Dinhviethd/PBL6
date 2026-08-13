import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { User } from '@/modules/auth/models/user.model';
import { UpdateProfileDTO, RegisterDTO } from '@/modules/auth/auth.schema';
import { Role } from '@/modules/auth/models/role.model';

export class UserRepository {
  private repository: Repository<User>;
  private roleRepository: Repository<Role>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
    this.roleRepository = AppDataSource.getRepository(Role);
  }

  // Tìm user theo email
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
    });
  }

  async findByEmailWithRolesAndPermissions(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: {
        roles: {
          permissions: true,
        },
      },
    });
  }

  // Tìm user theo ID
  async findById(idUser: string): Promise<User | null> {
    return this.repository.findOne({
      where: { idUser },
    });
  }

  async findByIdWithRolesAndPermissions(idUser: string): Promise<User | null> {
    return this.repository.findOne({
      where: { idUser },
      relations: {
        roles: {
          permissions: true,
        },
      },
    });
  }

  // Tạo user mới
  async create(userData: RegisterDTO): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async assignRole(idUser: string, roleCode: string): Promise<User | null> {
    const user = await this.repository.findOne({
      where: { idUser },
      relations: {
        roles: true,
      },
    });
    if (!user) return null;

    const role = await this.roleRepository.findOne({
      where: { code: roleCode },
    });
    if (!role) return user;

    const hasRole = user.roles?.some(currentRole => currentRole.code === roleCode);
    if (!hasRole) {
      user.roles = [...(user.roles || []), role];
      await this.repository.save(user);
    }

    return this.findByIdWithRolesAndPermissions(idUser);
  }

  // Cập nhật user
  async update(idUser: string, updateData: UpdateProfileDTO): Promise<User | null> {
    await this.repository.update(idUser, updateData);
    return this.findById(idUser);
  }

  // Xóa user
  async delete(idUser: string): Promise<boolean> {
    const result = await this.repository.delete(idUser);
    return result.affected !== 0;
  }


}

// Export singleton instance
export const userRepository = new UserRepository();
