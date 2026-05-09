import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
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

  @Column({ name: `role_id`, type: `uuid` })
  roleId!: string;

  @ManyToOne(() => Role, (role) => role.users, { nullable: false })
  @JoinColumn({ name: `role_id` })
  role!: Role;
}
