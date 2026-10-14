import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { toSqlList } from '../database/sql.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { DocumentType, type DocumentTypeValue } from './document-type.js';

@Entity('worker')
@Index('ix_worker_issuer_id', ['issuerId'])
@Index('uq_worker_issuer_document', ['issuerId', 'documentType', 'documentNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Check('ck_worker_document_type', `"document_type" IN (${toSqlList(Object.values(DocumentType))})`)
export class Worker {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'issuer_id', type: 'uuid' })
  issuerId!: string;

  @ManyToOne(() => Issuer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'issuer_id' })
  issuer!: Relation<Issuer>;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName!: string;

  @Column({ name: 'document_type', type: 'varchar' })
  documentType!: DocumentTypeValue;

  @Column({ name: 'document_number', type: 'varchar' })
  documentNumber!: string;

  @Column({ name: 'consented_at', type: 'timestamptz' })
  consentedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;
}
