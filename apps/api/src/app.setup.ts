import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { appConfig } from './config/app.config.js';

export const configureApp = (app: INestApplication): void => {
  const config = app.get(ConfigService).getOrThrow<ConfigType<typeof appConfig>>('app');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  if (config.corsOrigin) {
    app.enableCors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) });
  }
};
