import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, type ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, databaseConfig],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.getOrThrow<ConfigType<typeof databaseConfig>>('database');
        return {
          type: 'postgres' as const,
          url: database.url,
          ssl: database.ssl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
