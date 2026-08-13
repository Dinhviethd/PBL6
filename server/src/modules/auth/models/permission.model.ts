import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '@/modules/auth/models/role.model';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  idPermission!: string;

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany(() => Role, role => role.permissions)
  roles!: Role[];
}
