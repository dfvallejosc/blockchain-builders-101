import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { toSqlList } from '../database/sql.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { Worker } from '../workers/worker.entity.js';
import { CertificateType, type CertificateTypeValue } from './certificate-type.js';

// `id` is the public lookup key in the QR. `number` is a human-readable counter for the
// printed HAB-YYYY-NNNNNN code, which is formatted in code and never accepted by the public lookup.
@Entity('certificate')
@Index('uq_certificate_number', ['number'], { unique: true })
@Index('ix_certificate_issuer_id', ['issuerId'])
@Index('ix_certificate_worker_id', ['workerId'])
@Index('ix_certificate_fingerprint', ['fingerprint'])
@Check('ck_certificate_type', `"type" IN (${toSqlList(Object.values(CertificateType))})`)
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Generated('increment')
  @Column({ type: 'integer' })
  number!: number;

  @Column({ name: 'issuer_id', type: 'uuid' })
  issuerId!: string;

  @ManyToOne(() => Issuer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'issuer_id' })
  issuer!: Relation<Issuer>;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId!: string;

  @ManyToOne(() => Worker, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'worker_id' })
  worker!: Relation<Worker>;

  @Column({ type: 'varchar' })
  type!: CertificateTypeValue;

  @Column({ name: 'issued_at', type: 'date' })
  issuedAt!: string;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil!: string;

  @Column({ name: 'annulled_at', type: 'timestamptz', nullable: true })
  annulledAt!: Date | null;

  @Column({ type: 'text' })
  salt!: string;

  @Column({ type: 'text' })
  fingerprint!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;
}
