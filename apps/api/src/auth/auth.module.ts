import { type ClerkClient, createClerkClient } from '@clerk/backend';
import { Module } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { splitOrigins } from '../app.setup.js';
import { appConfig } from '../config/app.config.js';
import { clerkConfig } from '../config/clerk.config.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { AccountsService, CLERK_CLIENT, WEB_APP_URL } from './accounts.service.js';
import { AuthGuard } from './auth.guard.js';
import { ClerkTokenVerifier } from './clerk-token-verifier.js';
import { MeController } from './me.controller.js';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier.js';

export const createTokenVerifier = (config: ConfigService): TokenVerifier => {
  const clerk = config.getOrThrow<ConfigType<typeof clerkConfig>>('clerk');
  const app = config.getOrThrow<ConfigType<typeof appConfig>>('app');
  const authorizedParties = splitOrigins(app.corsOrigin ?? '').filter((origin) => origin !== '');
  return new ClerkTokenVerifier({ jwtKey: clerk.jwtKey, secretKey: clerk.secretKey, authorizedParties });
};

export const createClerkClientFromConfig = (config: ConfigService): ClerkClient | null => {
  const { secretKey } = config.getOrThrow<ConfigType<typeof clerkConfig>>('clerk');
  if (!secretKey) return null;
  return createClerkClient({ secretKey });
};

@Module({
  imports: [TypeOrmModule.forFeature([Issuer])],
  controllers: [MeController],
  providers: [
    { provide: TOKEN_VERIFIER, inject: [ConfigService], useFactory: createTokenVerifier },
    { provide: CLERK_CLIENT, inject: [ConfigService], useFactory: createClerkClientFromConfig },
    {
      provide: WEB_APP_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): string | undefined => config.get<ConfigType<typeof appConfig>>('app')?.webAppUrl,
    },
    { provide: APP_GUARD, useClass: AuthGuard },
    AccountsService,
  ],
  exports: [AccountsService],
})
export class AuthModule {}
