import { ClientEntity } from '@domain';
import { DBConfig } from '@config';
import { PrismaClient } from '@prisma/client';
import { clientMapper } from '@infrastructure';
import type { IClientRepository, ILogger } from '@interfaces';
import { handledPrismaError, Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Repository for managing OAuth client entities using Prisma ORM.
 *
 * Provides data access operations for OAuth clients including CRUD operations,
 * querying by various identifiers, and soft deletion functionality.
 *
 * @implements {IClientRepository}
 *
 * @example
 * ```typescript
 * const repository = new ClientRepository(prismaClient, logger);
 * const client = await repository.findByClientId('client-id-123');
 * ```
 */

@LogContextClass()
@Injectable({ name: 'ClientRepository', depends: ['DBConfig', 'Logger'] })
export class ClientRepository implements IClientRepository {
	private readonly client: PrismaClient;
	constructor(
		dbConfig: DBConfig,
		private readonly logger: ILogger
	) {
		this.client = dbConfig.getClient();
	}

	/**
	 * Finds an OAuth client by its client ID.
	 * @param clientId - The unique identifier of the OAuth client to retrieve.
	 * @returns A promise that resolves to the ClientEntity if found, or null if not found.
	 * @throws {PrismaError} If a database error occurs during the query.
	 */

	@LogContextMethod()
	public async findByClientId(clientId: string): Promise<ClientEntity | null> {
		try {
			const client = await this.client.oAuthClient.findUnique({ where: { clientId } });

			if (!client) {
				this.logger.debug('OAuth client not found by clientId', { clientId });
				return null;
			}

			return clientMapper.toDomain(client);
		} catch (error) {
			this.logger.error('Failed to find OAuth client by clientId', { clientId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds an OAuth client by its unique identifier.
	 * @param id - The unique identifier of the OAuth client to retrieve
	 * @returns A promise that resolves to the OAuth client entity if found, or null if not found
	 * @throws {PrismaError} If a database error occurs during the query
	 */

	@LogContextMethod()
	public async findById(id: string): Promise<ClientEntity | null> {
		try {
			const client = await this.client.oAuthClient.findUnique({ where: { id } });

			if (!client) {
				this.logger.debug('OAuth client not found by id', { id });
				return null;
			}

			return clientMapper.toDomain(client);
		} catch (error) {
			this.logger.error('Failed to find OAuth client by id', { id });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds all active OAuth clients associated with a specific user.
	 *
	 * @param userId - The unique identifier of the user
	 * @returns A promise that resolves to an array of ClientEntity objects, ordered by creation date (newest first)
	 * @throws Will throw a handled Prisma error if the database query fails
	 *
	 * @example
	 * const clients = await repository.findByUserId('user-123');
	 */

	@LogContextMethod()
	public async findByUserId(userId: string): Promise<ClientEntity[]> {
		try {
			const client = await this.client.oAuthClient.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: 'desc' } });

			this.logger.debug('Found OAuth clients for user', {
				userId,
				count: client.length,
			});

			return client.map((client) => clientMapper.toDomain(client));
		} catch (error) {
			this.logger.error('Failed to find OAuth clients by userId', { userId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Retrieves all OAuth clients associated with a specific user.
	 * @param userId - The ID of the user whose OAuth clients should be retrieved
	 * @returns A promise that resolves to an array of ClientEntity objects, ordered by creation date in descending order
	 * @throws {PrismaError} If the database query fails, a handled Prisma error is thrown
	 * @example
	 * const clients = await repository.findAllByUserId('user-123');
	 */

	@LogContextMethod()
	public async findAllByUserId(userId: string): Promise<ClientEntity[]> {
		try {
			const client = await this.client.oAuthClient.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
			this.logger.debug('Found OAuth clients for user', {
				userId,
				count: client.length,
			});

			return client.map((client) => clientMapper.toDomain(client));
		} catch (error) {
			this.logger.error('Failed to find OAuth clients by userId', { userId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Saves a new OAuth client to the database.
	 * @param client - The client entity to be saved
	 * @throws {PrismaError} If the database operation fails
	 * @returns A promise that resolves when the client is successfully created
	 */

	@LogContextMethod()
	public async save(client: ClientEntity): Promise<void> {
		try {
			await this.client.oAuthClient.create({ data: { ...client } });
			this.logger.debug('OAuth client created successfully', {
				id: client.id,
				clientId: client.clientId,
				userId: client.userId,
			});
		} catch (error) {
			this.logger.error('OAuth client creation failed', {
				clientId: client.clientId,
			});
			throw handledPrismaError(error);
		}
	}

	/**
	 * Updates an existing OAuth client with the provided information.
	 *
	 * @param client - The OAuth client entity containing updated information
	 * @param client.clientId - The unique identifier of the client to update
	 * @param client.clientName - The name of the OAuth client
	 * @param client.redirectUris - The allowed redirect URIs for the client
	 * @param client.grantTypes - The grant types authorized for the client
	 * @param client.isPublic - Whether the client is public or confidential
	 * @param client.isActive - Whether the client is currently active
	 * @param client.updatedAt - The timestamp of the update
	 * @returns A promise that resolves when the update is complete
	 * @throws {PrismaError} If the update operation fails, a handled Prisma error is thrown
	 *
	 * @example
	 * ```
	 * const updatedClient = new ClientEntity({
	 *   clientId: 'client-123',
	 *   clientName: 'My App',
	 *   redirectUris: ['https://app.example.com/callback'],
	 *   grantTypes: ['authorization_code'],
	 *   isPublic: false,
	 *   isActive: true,
	 *   updatedAt: new Date()
	 * });
	 * await repository.update(updatedClient);
	 * ```
	 */

	@LogContextMethod()
	public async update(client: ClientEntity): Promise<void> {
		try {
			await this.client.oAuthClient.update({
				where: { clientId: client.clientId },
				data: {
					clientName: client.clientName,
					redirectUris: client.redirectUris,
					grantTypes: client.grantTypes,
					isPublic: client.isPublic,
					isActive: client.isActive,
					updatedAt: client.updatedAt,
				},
			});

			this.logger.debug('OAuth client updated successfully', {
				id: client.id,
				clientId: client.clientId,
			});
		} catch (error) {
			this.logger.error('OAuth client update failed', {
				id: client.id,
			});
			throw handledPrismaError(error);
		}
	}

	/**
	 * Soft deletes an OAuth client by marking it as inactive.
	 * @param id - The unique identifier of the OAuth client to soft delete
	 * @throws {PrismaError} If the database operation fails
	 * @returns A promise that resolves when the soft delete is complete
	 */

	@LogContextMethod()
	public async softDelete(id: string): Promise<void> {
		try {
			await this.client.oAuthClient.update({ where: { clientId: id }, data: { isActive: false, updatedAt: new Date() } });
			this.logger.debug('OAuth client soft deleted', { id });
		} catch (error) {
			this.logger.error('OAuth client soft delete failed', { id });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Checks if an OAuth client exists by its client ID.
	 * @param clientId - The unique identifier of the OAuth client to check
	 * @returns A promise that resolves to true if the OAuth client exists, false otherwise
	 * @throws {PrismaError} If the database query fails
	 */

	@LogContextMethod()
	public async existByClientId(clientId: string): Promise<boolean> {
		try {
			const count = await this.client.oAuthClient.count({ where: { clientId } });
			return count > 0;
		} catch (error) {
			this.logger.error('Failed to check OAuth client existence', { clientId });
			throw handledPrismaError(error);
		}
	}
}
