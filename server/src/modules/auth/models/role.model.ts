import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Permission } from '@/modules/auth/models/permission.model';
import { User } from '@/modules/auth/models/user.model';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  idRole!: string;

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  isSystem!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany(() => User, user => user.roles)
  users!: User[];

  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({
    name: 'roles_permissions',
    joinColumn: {
      name: 'idRole',
      referencedColumnName: 'idRole',
    },
    inverseJoinColumn: {
      name: 'idPermission',
      referencedColumnName: 'idPermission',
    },
  })
  permissions!: Permission[];
}
