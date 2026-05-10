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

  @CreateDateColumn({ type: `timestamptz` })
  timestamp!: Date;
}
