export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 2000,
  jwtSecret: process.env.JWT_SECRET ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    username: process.env.POSTGRES_USER ?? 'bnr',
    password: process.env.POSTGRES_PASSWORD ?? 'bnr',
    database: process.env.POSTGRES_DB ?? 'bnr',
  },
  pgPoolMax: Number(process.env.PG_POOL_MAX) || 10,
} as const;

export const assertEnvForRuntime = (): void => {
  if (env.nodeEnv === 'production' && env.jwtSecret.length < 32) {
    throw new Error(`JWT_SECRET must be set to at least 32 characters in production`);
  }
};

export const getJwtSigningSecret = (): string => {
  if (env.jwtSecret) return env.jwtSecret;
  if (env.nodeEnv !== 'production') {
    return `development-only-change-me-min-32-characters-long`;
  }
  throw new Error(`JWT_SECRET is required`);
};
