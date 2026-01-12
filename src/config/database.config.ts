import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '@prisma/client';
import type { IConfig, ILogger } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		DBConfig: DBConfig;
	}
}

/**
 * Database configuration class that manages PostgreSQL connections using Prisma ORM.
 *
 * This class initializes and maintains a connection pool to a PostgreSQL database
 * using the PrismaPg adapter. It provides methods to access the Prisma client,
 * test database connectivity, and properly disconnect from the database.
 *
 * @example
 * ```typescript
 * const dbConfig = new DBConfig(config, logger);
 * const prismaClient = dbConfig.getClient();
 * const isConnected = await dbConfig.testConnection();
 * await dbConfig.disconnect();
 * ```
 */

@LogContextClass()
@Injectable({ name: 'DBConfig', depends: ['Config', 'Logger'] })
export class DBConfig {
	private readonly client: PrismaClient;
	private readonly pool: Pool;

	constructor(
		config: IConfig,
		private readonly logger: ILogger
	) {
		this.pool = new Pool({
			connectionString: config.databaseUrl,
			min: config.databasePoolMin,
			max: config.databasePoolMax,
		});

		const adapter = new PrismaPg(this.pool);
		this.client = new PrismaClient({ adapter });
	}

	/**
	 * Retrieves the Prisma database client instance.
	 * @returns {PrismaClient} The initialized Prisma client for database operations.
	 */

	public getClient(): PrismaClient {
		return this.client;
	}

	/**
	 * Tests the database connection by executing a simple query.
	 * @returns A promise that resolves to `true` if the connection is successful.
	 * @throws Will throw an error if the database connection fails.
	 */

	@LogContextMethod()
	public async testConnection(): Promise<boolean> {
		await this.client.$queryRawUnsafe('SELECT 1');
		this.logger.info('Connection to the database was successful');
		return true;
	}

	/**
	 * Disconnects from the database client.
	 * Safely closes the database connection if a client instance exists.
	 * Logs an informational message upon successful disconnection.
	 * @returns A promise that resolves when the disconnection is complete.
	 */

	@LogContextMethod()
	public async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.$disconnect();
			this.logger.info('Disconnected with the database');
		}
	}
}
