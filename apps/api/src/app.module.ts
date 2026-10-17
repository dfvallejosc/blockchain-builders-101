import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, type ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { appConfig } from './config/app.config.js';
import { clerkConfig } from './config/clerk.config.js';
import { databaseConfig } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { postgresConnection } from './database/connection.js';
import { CertificatesModule } from './certificates/certificates.module.js';
import { HealthModule } from './health/health.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { IssuersModule } from './issuers/issuers.module.js';
import { WorkersModule } from './workers/workers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, clerkConfig, databaseConfig],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.getOrThrow<ConfigType<typeof databaseConfig>>('database');
        return { ...postgresConnection(database.url, database.ssl), autoLoadEntities: true };
      },
    }),
    AuthModule,
    IssuersModule,
    WorkersModule,
    CertificatesModule,
    VerificationModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
