import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Application } from '../../applications/entities/application.entity';

@Entity(`documents`)
export class Document {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @ManyToOne(() => Application, { nullable: false })
  @JoinColumn({ name: `application_id` })
  application!: Application;

  @Column({ type: `uuid` })
  application_id!: string;

  @Column({ type: `varchar`, length: 256, nullable: true })
  group_key!: string | null;

  @Column({ type: `int`, default: 1 })
  version!: number;

  @Column({ type: `boolean`, default: true })
  is_current!: boolean;

  @Column({ type: `varchar`, length: 512 })
  file_path!: string;

  @Column({ type: `varchar`, length: 512 })
  original_name!: string;

  @Column({ type: `varchar`, length: 255 })
  mime_type!: string;

  @Column({ type: `int` })
  size_bytes!: number;

  @Column({ type: `uuid` })
  uploader_id!: string;
}
