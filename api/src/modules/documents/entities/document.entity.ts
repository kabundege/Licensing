import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity(`documents`)
export class Document {
  @PrimaryGeneratedColumn(`uuid`)
  id!: string;

  @Column({ type: `uuid` })
  application_id!: string;

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
