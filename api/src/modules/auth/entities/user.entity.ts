import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Role } from './role.entity';

@Entity(`users`)
@Unique([`email`])
export class User {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @Column({ type: `varchar`, length: 320 })
  email!: string;

  @Column({ type: `varchar`, length: 255 })
  password!: string;

  @Column({ type: `varchar`, length: 255 })
  name!: string;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: `user_roles`,
    joinColumn: { name: `user_id`, referencedColumnName: `id` },
    inverseJoinColumn: { name: `role_id`, referencedColumnName: `id` },
  })
  roles!: Role[];
}
