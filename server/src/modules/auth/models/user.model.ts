import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '@/modules/auth/models/role.model';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  idUser!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  resetOTP?: string;

  @Column({ nullable: true, type: 'timestamp' })
  resetOTPExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'users_roles',
    joinColumn: {
      name: 'idUser',
      referencedColumnName: 'idUser',
    },
    inverseJoinColumn: {
      name: 'idRole',
      referencedColumnName: 'idRole',
    },
  })
  roles!: Role[];
}
