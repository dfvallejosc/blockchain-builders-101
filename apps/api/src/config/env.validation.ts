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
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

export const NodeEnv = {
  Development: 'development',
  Test: 'test',
  Production: 'production',
} as const;

export type NodeEnvValue = (typeof NodeEnv)[keyof typeof NodeEnv];

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

  @ValidateIf((env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production)
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN?: string;

  // Required in production; elsewhere it is only checked when set, because a malformed value would fail at invite time.
  @ValidateIf((env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production || (env.WEB_APP_URL ?? '') !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  WEB_APP_URL?: string;

  @ValidateIf((env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production)
  @IsString()
  @IsNotEmpty()
  CLERK_SECRET_KEY?: string;

  @ValidateIf((env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Production)
  @IsString()
  @IsNotEmpty()
  CLERK_PUBLISHABLE_KEY?: string;

  @IsOptional()
  @IsString()
  CLERK_JWT_KEY?: string;
}

export const validateEnv = (config: Record<string, unknown>): EnvironmentVariables => {
  const parsed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });
  parsed.PORT = Number(config.PORT ?? parsed.PORT);
  parsed.DATABASE_SSL = typeof config.DATABASE_SSL === 'string' ? config.DATABASE_SSL === 'true' : parsed.DATABASE_SSL;

  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors.map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`).join('; ');
    throw new Error(`Variables de entorno inválidas. ${detail}`);
  }
  return parsed;
};
