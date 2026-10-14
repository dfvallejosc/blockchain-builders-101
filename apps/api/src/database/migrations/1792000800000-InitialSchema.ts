import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792000800000 implements MigrationInterface {
  name = 'InitialSchema1792000800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "issuer" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "type" character varying NOT NULL, "city" character varying NOT NULL, "nit" character varying NOT NULL, "ministry_registration" character varying NOT NULL, "contact_name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL, "certificate_types" character varying array NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "ck_issuer_certificate_types" CHECK ("certificate_types" <@ ARRAY['height-work', 'confined-spaces', 'crane-operation', 'occupational-medical']::varchar[]), CONSTRAINT "ck_issuer_type" CHECK ("type" IN ('clinic', 'training-center')), CONSTRAINT "PK_0650c5a53be3a0d22b580e27d25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_issuer_nit" ON "issuer"  ("nit") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "worker" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "issuer_id" uuid NOT NULL, "full_name" character varying NOT NULL, "document_type" character varying NOT NULL, "document_number" character varying NOT NULL, "consented_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "ck_worker_document_type" CHECK ("document_type" IN ('cc', 'ce', 'ppt', 'passport')), CONSTRAINT "PK_dc8175fa0e34ce7a39e4ec73b94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_worker_issuer_document" ON "worker"  ("issuer_id", "document_type", "document_number") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_worker_issuer_id" ON "worker"  ("issuer_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "certificate" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "number" SERIAL NOT NULL, "issuer_id" uuid NOT NULL, "worker_id" uuid NOT NULL, "type" character varying NOT NULL, "issued_at" date NOT NULL, "valid_until" date NOT NULL, "annulled_at" TIMESTAMP WITH TIME ZONE, "salt" text NOT NULL, "fingerprint" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "ck_certificate_type" CHECK ("type" IN ('height-work', 'confined-spaces', 'crane-operation', 'occupational-medical')), CONSTRAINT "PK_8daddfc65f59e341c2bbc9c9e43" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_certificate_fingerprint" ON "certificate"  ("fingerprint") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_certificate_worker_id" ON "certificate"  ("worker_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_certificate_issuer_id" ON "certificate"  ("issuer_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_certificate_number" ON "certificate"  ("number") `,
    );
    await queryRunner.query(
      `ALTER TABLE "worker" ADD CONSTRAINT "FK_9c983634450714d581084d6fa0c" FOREIGN KEY ("issuer_id") REFERENCES "issuer"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "FK_1afd3c88e832360645d8532f461" FOREIGN KEY ("issuer_id") REFERENCES "issuer"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "FK_1aa8d3a007a5067f061616a3802" FOREIGN KEY ("worker_id") REFERENCES "worker"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP CONSTRAINT "FK_1aa8d3a007a5067f061616a3802"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP CONSTRAINT "FK_1afd3c88e832360645d8532f461"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker" DROP CONSTRAINT "FK_9c983634450714d581084d6fa0c"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_certificate_number"`);
    await queryRunner.query(`DROP INDEX "public"."ix_certificate_issuer_id"`);
    await queryRunner.query(`DROP INDEX "public"."ix_certificate_worker_id"`);
    await queryRunner.query(`DROP INDEX "public"."ix_certificate_fingerprint"`);
    await queryRunner.query(`DROP TABLE "certificate"`);
    await queryRunner.query(`DROP INDEX "public"."ix_worker_issuer_id"`);
    await queryRunner.query(`DROP INDEX "public"."uq_worker_issuer_document"`);
    await queryRunner.query(`DROP TABLE "worker"`);
    await queryRunner.query(`DROP INDEX "public"."uq_issuer_nit"`);
    await queryRunner.query(`DROP TABLE "issuer"`);
  }
}
