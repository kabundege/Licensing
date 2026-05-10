import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ApplicationStatus } from './application-status';

@Entity(`applications`)
export class Application {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @Column({ type: `uuid` })
  applicant_id!: string;

  @Column({ type: `enum`, enum: ApplicationStatus, enumName: `application_status_enum` })
  status!: ApplicationStatus;

  @Column({ type: `uuid`, nullable: true })
  reviewer_id!: string | null;

  @Column({ type: `uuid`, nullable: true })
  approver_id!: string | null;

  @Column({ type: `int`, default: 0 })
  version!: number;
}
