import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ApplicationStatus } from './application-status';

@Entity(`audit_logs`)
export class AuditLog {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @Column({ type: `uuid` })
  application_id!: string;

  @Column({ type: `uuid` })
  actor_id!: string;

  @Column({ type: `enum`, enum: ApplicationStatus, enumName: `application_status_enum` })
  from_state!: ApplicationStatus;

  @Column({ type: `enum`, enum: ApplicationStatus, enumName: `application_status_enum` })
  to_state!: ApplicationStatus;

  @CreateDateColumn({ type: `timestamptz` })
  timestamp!: Date;
}
