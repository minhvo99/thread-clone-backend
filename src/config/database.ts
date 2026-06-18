import { Pool, type PoolConfig } from 'pg';

export type DatabaseConfig = {
    databaseUrl: string;
    directUrl?: string;
};

function getRequiredEnv(name: 'DATABASE_URL'): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing database config: ${name}`);
    }

    return value;
}

function getOptionalEnv(name: 'DIRECT_URL'): string | undefined {
    const value = process.env[name]?.trim();

    return value || undefined;
}

function readDatabaseConfig(): DatabaseConfig {
    return {
        databaseUrl: getRequiredEnv('DATABASE_URL'),
        directUrl: getOptionalEnv('DIRECT_URL'),
    };
}

export const databaseConfig = readDatabaseConfig();

const poolConfig: PoolConfig = {
    connectionString: databaseConfig.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('Database connected');
});

pool.on('error', (err: Error) => {
    console.error('Unexpected database error', err);
});
