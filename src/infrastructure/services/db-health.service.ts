import { PrismaClient } from '@prisma/client';

import type { IDatabaseHealthChecker, IDatabaseHealthResponse, ILogger } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';
import { DBConfig } from '@config';

/**
 * Service for checking the health and status of the database connection.
 *
 * Implements database connectivity validation, table existence verification,
 * and record count monitoring. Provides comprehensive health status information
 * including connection state, latency, table availability, and data statistics.
 *
 * @implements {IDatabaseHealthChecker}
 *
 * @example
 * ```typescript
 * const healthService = new DatabaseHealthService(prismaClient, logger);
 * const status = await healthService.getHealthStatus();
 * console.log(`Connected: ${status.connected}, Latency: ${status.latency}ms`);
 * ```
 */

@LogContextClass()
@Injectable({ name: 'DatabaseHealthChecker', depends: ['Logger', 'DBConfig'] })
export class DatabaseHealthService implements IDatabaseHealthChecker {
	public readonly client: PrismaClient;

	constructor(
		public readonly logger: ILogger,
		dbConfig: DBConfig
	) {
		this.client = dbConfig.getClient();
	}

	/**
	 * Checks if the database connection is active and operational.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the connection is successful, `false` otherwise.
	 */

	@LogContextMethod()
	public async checkConnection(): Promise<boolean> {
		try {
			await this.client.$queryRawUnsafe('SELECT 1');
			this.logger.debug('Database connection check successful');
			return true;
		} catch (error) {
			this.logger.error('Database connection check failed', { error });
			return false;
		}
	}

	/**
	 * Checks the existence of required tables in the public schema of the database.
	 *
	 * Queries the PostgreSQL system catalog to verify the presence of three tables:
	 * - `users`
	 * - `oauth_clients`
	 * - `authorization_codes`
	 *
	 * @returns {Promise<{ users: boolean; oAuthClients: boolean; authCodes: boolean }>}
	 * An object containing boolean flags indicating whether each table exists in the database.
	 * Returns all flags as `false` if the query fails.
	 *
	 * @throws Does not throw. Errors are caught and logged, with default values returned.
	 *
	 * @example
	 * ```typescript
	 * const tableStatus = await dbHealthService.checkTables();
	 * if (tableStatus.users && tableStatus.oAuthClients && tableStatus.authCodes) {
	 *   console.log('All required tables exist');
	 * }
	 * ```
	 */

	@LogContextMethod()
	public async checkTables(): Promise<{
		users: boolean;
		oAuthClients: boolean;
		authCodes: boolean;
		sessions: boolean;
		userConsents: boolean;
		scopeDefinitions: boolean;
	}> {
		const tables = {
			users: false,
			oAuthClients: false,
			authCodes: false,
			sessions: false,
			userConsents: false,
			scopeDefinitions: false,
		};

		try {
			const result = await this.client.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'oauth_clients', 'authorization_codes','sessions','user_consents','scope_definitions')
      `;

			const existingTables = result.map((row) => row.tablename);

			tables.users = existingTables.includes('users');
			tables.oAuthClients = existingTables.includes('oauth_clients');
			tables.authCodes = existingTables.includes('authorization_codes');
			tables.sessions = existingTables.includes('sessions');
			tables.userConsents = existingTables.includes('user_consents');
			tables.scopeDefinitions = existingTables.includes('scope_definitions');

			this.logger.debug('Database tables check completed', { tables });

			return tables;
		} catch (error) {
			this.logger.error('Database tables check failed', { error });
			return tables;
		}
	}

	/**
	 * Retrieves the current health status of the database.
	 *
	 * Performs a comprehensive health check including connection status, latency measurement,
	 * table verification, and record counts for key entities (users, OAuth clients, and authorization codes).
	 *
	 * @returns {Promise<IDatabaseHealthResponse>} A promise that resolves to an object containing:
	 *   - `connected` {boolean} - Whether the database connection is active
	 *   - `latency` {number} - Connection latency in milliseconds
	 *   - `tables` {any} - Table structure/validation information
	 *   - `recordCounts` {Object} [optional] - Object containing counts of:
	 *     - `users` {number} - Number of user records
	 *     - `oAuthClients` {number} - Number of OAuth client records
	 *     - `authCodes` {number} - Number of authorization code records
	 *
	 * @remarks
	 * - Record counts are only included in the response if the database is connected
	 * - If record count retrieval fails, a warning is logged but the health status is still returned
	 * - Connection latency is measured in milliseconds
	 */

	@LogContextMethod()
	public async getHealthStatus(): Promise<IDatabaseHealthResponse> {
		const startTime = Date.now();

		const connected = await this.checkConnection();
		const latency = Date.now() - startTime;
		const tables = await this.checkTables();

		let recordCounts:
			| {
					users: number;
					oAuthClients: number;
					authCodes: number;
					sessions: number;
					userConsents: number;
					scopeDefinitions: number;
			  }
			| undefined;

		if (connected) {
			try {
				const [users, oAuthClients, authCodes, sessions, userConsents, scopeDefinitions] = await Promise.all([
					this.client.user.count(),
					this.client.oAuthClient.count(),
					this.client.authorizationCode.count(),
					this.client.session.count(),
					this.client.userConsent.count(),
					this.client.scopeDefinition.count(),
				]);

				recordCounts = { users, oAuthClients, authCodes, sessions, userConsents, scopeDefinitions };

				this.logger.debug('Database record counts retrieved', { recordCounts });
			} catch (error) {
				this.logger.warn('Failed to retrieved record counts', { error });
			}
		}

		const status = {
			connected,
			latency,
			tables,
			...(recordCounts !== undefined && { recordCounts }),
		};

		this.logger.info('Database health status retrieved', {
			connected: status.connected,
			latency: status.latency,
		});

		return status;
	}
}
