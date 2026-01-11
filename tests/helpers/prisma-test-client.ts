/**
 * Singleton PrismaClient para tests de integración con DB
 *
 * IMPORTANTE: Solo una instancia de Prisma para TODOS los tests
 * Esto previene errores de "too many clients" y violación de llaves únicas
 *
 * @module tests/helpers/prisma-test-client
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Singleton instance - UNA SOLA para todos los tests
 */
let prismaInstance: PrismaClient | null = null;
let poolInstance: Pool | null = null;

/**
 * Obtiene la instancia singleton de PrismaClient para tests
 */
export async function getPrismaTestClient(): Promise<PrismaClient> {
	if (!prismaInstance) {
		const databaseUrl = process.env.DATABASE_URL;

		if (!databaseUrl) {
			throw new Error(
				'DATABASE_URL no está definida. Asegúrate de tener .env.test configurado'
			);
		}

		// Crear pool de PostgreSQL
		poolInstance = new Pool({
			connectionString: databaseUrl,
			min: 1,
			max: 5,
		});

		// Crear adapter de Prisma
		const adapter = new PrismaPg(poolInstance);

		// Crear instancia de Prisma
		prismaInstance = new PrismaClient({
			adapter,
			log: [], // Sin logs en tests
		});

		await prismaInstance.$connect();
		console.log('✅ PrismaClient singleton creado para tests');
	}

	return prismaInstance;
}

/**
 * Cierra la conexión de Prisma y el pool de PostgreSQL
 */
export async function closePrismaTestClient(): Promise<void> {
	if (prismaInstance) {
		await prismaInstance.$disconnect();
		prismaInstance = null;
		console.log('✅ PrismaClient singleton cerrado');
	}

	if (poolInstance) {
		await poolInstance.end();
		poolInstance = null;
		console.log('✅ PostgreSQL pool cerrado');
	}
}
