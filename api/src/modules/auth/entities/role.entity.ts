import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { RoleName } from './role-name';
import { Permission } from './permission.entity';

@Entity(`roles`)
@Unique([`name`])
export class Role {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @Column({ type: `enum`, enum: RoleName })
  name!: RoleName;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    cascade: false,
  })

  @JoinTable({
    name: `role_permissions`,
    joinColumn: { name: `role_id`, referencedColumnName: `id` },
    inverseJoinColumn: { name: `permission_id`, referencedColumnName: `id` },
  })
  permissions!: Permission[];

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
