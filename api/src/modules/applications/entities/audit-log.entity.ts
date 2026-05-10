import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ApplicationStatus } from './application-status';

@Entity(`audit_logs`)
@Index(`idx_audit_logs_application_id_timestamp`, [`application_id`, `timestamp`])
@Index(`idx_audit_logs_document_id`, [`document_id`])
export class AuditLog {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @Column({ type: `uuid` })
  application_id!: string;

  @Column({ type: `uuid` })
  actor_id!: string;

  @Column({
    type: `enum`,
    enum: ApplicationStatus,
    enumName: `application_status_enum`,
    nullable: true,
  })
  from_state!: ApplicationStatus | null;

  @Column({
    type: `enum`,
    enum: ApplicationStatus,
    enumName: `application_status_enum`,
    nullable: true,
  })
  to_state!: ApplicationStatus | null;

  @Column({ type: `varchar`, length: 64, nullable: true })
  event_action!: string | null;

  @Column({ type: `uuid`, nullable: true })
  document_id!: string | null;

  @Column({ type: `jsonb`, nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: `timestamptz` })
  timestamp!: Date;
}
