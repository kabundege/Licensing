import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Role } from './role.entity';

@Entity(`permissions`)
@Unique([`resource`, `action`])
export class Permission {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @Column({ type: `varchar`, length: 128 })
  resource!: string;

  @Column({ type: `varchar`, length: 128 })
  action!: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
