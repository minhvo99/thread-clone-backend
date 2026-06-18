import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, type PoolConfig } from 'pg'
import { PrismaClient } from '../generated/prisma/client'

export type DatabaseConfig = {
  databaseUrl: string
  directUrl?: string
}

function getRequiredEnv(name: 'DATABASE_URL'): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing database config: ${name}`)
  }

  return value
}

function getOptionalEnv(name: 'DIRECT_URL'): string | undefined {
  const value = process.env[name]?.trim()

  return value || undefined
}

function readDatabaseConfig(): DatabaseConfig {
  return {
    databaseUrl: getRequiredEnv('DATABASE_URL'),
    directUrl: getOptionalEnv('DIRECT_URL'),
  }
}

export const databaseConfig = readDatabaseConfig()

const poolConfig: PoolConfig = {
  connectionString: databaseConfig.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

export const pool = new Pool(poolConfig)

pool.on('connect', () => {
  console.log('Database connected')
})

pool.on('error', (err: Error) => {
  console.error('Unexpected database error', err)
})

const adapter = new PrismaPg(pool)

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect()
  await pool.end()
  console.log('Database connection closed')
}
