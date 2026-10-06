import { ValidationPipe } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { appConfig } from './config/app.config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService).getOrThrow<ConfigType<typeof appConfig>>('app');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  if (config.corsOrigin) {
    app.enableCors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) });
  }

  await app.listen(config.port);
}
await bootstrap();
