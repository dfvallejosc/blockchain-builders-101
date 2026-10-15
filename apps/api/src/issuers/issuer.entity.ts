import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CertificateType, type CertificateTypeValue } from '../certificates/certificate-type.js';
import { toSqlList } from '../database/sql.js';
import { IssuerType, type IssuerTypeValue } from './issuer-type.js';

@Entity('issuer')
@Index('uq_issuer_nit', ['nit'], { unique: true, where: '"deleted_at" IS NULL' })
@Check('ck_issuer_type', `"type" IN (${toSqlList(Object.values(IssuerType))})`)
@Check(
  'ck_issuer_certificate_types',
  `"certificate_types" <@ ARRAY[${toSqlList(Object.values(CertificateType))}]::varchar[]`,
)
export class Issuer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  type!: IssuerTypeValue;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'varchar' })
  nit!: string;

  @Column({ name: 'ministry_registration', type: 'varchar' })
  ministryRegistration!: string;

  @Column({ name: 'contact_name', type: 'varchar' })
  contactName!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  phone!: string;

  @Column({ name: 'certificate_types', type: 'varchar', array: true })
  certificateTypes!: CertificateTypeValue[];

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;
}
