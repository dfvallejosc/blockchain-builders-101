import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MinLength,
  Min,
  Matches,
  ValidateIf,
  validateSync,
} from 'class-validator';

export const NodeEnv = {
  Development: 'development',
  Test: 'test',
  Production: 'production',
} as const;

export type NodeEnvValue = (typeof NodeEnv)[keyof typeof NodeEnv];

export const RegistryDriver = {
  Postgres: 'postgres',
  Stellar: 'stellar',
} as const;

export type RegistryDriverValue =
  (typeof RegistryDriver)[keyof typeof RegistryDriver];

export class EnvironmentVariables {
  @IsEnum(Object.values(NodeEnv))
  NODE_ENV: NodeEnvValue = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
  DATABASE_URL!: string;

  @IsBoolean()
  DATABASE_SSL: boolean = false;

  @ValidateIf(
    (env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production,
  )
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production,
  )
  @IsString()
  @IsNotEmpty()
  CLERK_SECRET_KEY?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production,
  )
  @IsString()
  @IsNotEmpty()
  CLERK_PUBLISHABLE_KEY?: string;

  @IsOptional()
  @IsString()
  CLERK_JWT_KEY?: string;

  @IsEnum(Object.values(RegistryDriver))
  REGISTRY_DRIVER: RegistryDriverValue = RegistryDriver.Postgres;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.REGISTRY_DRIVER === RegistryDriver.Stellar,
  )
  @IsUrl({ protocols: ['http', 'https'], require_tld: false })
  STELLAR_RPC_URL?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.REGISTRY_DRIVER === RegistryDriver.Stellar,
  )
  @IsString()
  @IsNotEmpty()
  STELLAR_NETWORK_PASSPHRASE?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.REGISTRY_DRIVER === RegistryDriver.Stellar,
  )
  @Matches(/^C[A-Z2-7]{55}$/)
  STELLAR_CONTRACT_ID?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.REGISTRY_DRIVER === RegistryDriver.Stellar,
  )
  @IsString()
  @MinLength(32)
  STELLAR_MASTER_SECRET?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.REGISTRY_DRIVER === RegistryDriver.Stellar,
  )
  @Matches(/^S[A-Z2-7]{55}$/)
  STELLAR_ADMIN_SECRET?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.REGISTRY_DRIVER === RegistryDriver.Stellar,
  )
  @Matches(/^S[A-Z2-7]{55}$/)
  STELLAR_SPONSOR_SECRET?: string;
}

export const validateEnv = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const parsed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });
  parsed.PORT = Number(config.PORT ?? parsed.PORT);
  parsed.DATABASE_SSL =
    typeof config.DATABASE_SSL === 'string'
      ? config.DATABASE_SSL === 'true'
      : parsed.DATABASE_SSL;

  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map(
        (error) =>
          `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(`Variables de entorno inválidas. ${detail}`);
  }
  return parsed;
};
