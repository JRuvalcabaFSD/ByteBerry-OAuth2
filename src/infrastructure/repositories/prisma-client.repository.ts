import { ClientType, PrismaClient } from '@prisma/client';

import { DBConfig } from '@config';
import { clientMapper } from '@infrastructure';
import type { IClientRepository, ILogger } from '@interfaces';
import { ClientIdVO, ClientEntity, UserIdVO } from '@domain';
import { getErrMessage, handledPrismaError, Injectable, InvalidPersisteError, LogContextClass, LogContextMethod } from '@shared';

/**
 * Repository implementation for managing OAuth clients using Prisma ORM.
 * This class provides methods to perform CRUD operations on OAuth client entities,
 * including finding by various identifiers, saving, updating, soft deleting, and
 * handling secret rotation. It implements the IClientRepository interface.
 *
 * @implements {IClientRepository}
 */

@LogContextClass()
@Injectable({ name: 'ClientRepository', depends: ['DBConfig', 'Logger'] })
export class PrismaClientRepository implements IClientRepository {
	private readonly client: PrismaClient;

	constructor(
		DBConfig: DBConfig,
		private readonly logger: ILogger
	) {
		this.client = DBConfig.getClient();
	}

	/**
	 * Finds an OAuth client by its client ID.
	 * @param clientId - The client ID value object.
	 * @returns A promise that resolves to the ClientEntity if found, or null if not found.
	 */

	@LogContextMethod()
	public async findByClientId(clientId: ClientIdVO): Promise<ClientEntity | null> {
		try {
			const record = await this.client.oAuthClient.findUnique({ where: { client_id: clientId.getValue(), deleted_at: null } });

			if (!record) {
				this.logger.debug('OAuth client not found by clientId', { clientId });
				return null;
			}

			return clientMapper.toDomain(record);
		} catch (error) {
			this.logger.error('Failed to find OAuth client by clientId', { clientId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds an OAuth client by its unique identifier, excluding soft-deleted records.
	 *
	 * @param id - The unique identifier of the OAuth client.
	 * @returns A promise that resolves to the ClientEntity if found, or null if not found.
	 * @throws {HandledPrismaError} If an error occurs during the database operation.
	 */

	@LogContextMethod()
	public async findById(id: string): Promise<ClientEntity | null> {
		try {
			const record = await this.client.oAuthClient.findUnique({ where: { id, deleted_at: null } });

			if (!record) {
				this.logger.debug('OAuth client not found by id', { id });
				return null;
			}

			return clientMapper.toDomain(record);
		} catch (error) {
			this.logger.error('Failed to find OAuth client by id', { id });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Retrieves a list of OAuth clients associated with the specified user ID.
	 * The clients are ordered by creation date in descending order and exclude deleted records.
	 *
	 * @param userId - The unique identifier of the user whose clients are to be retrieved.
	 * @returns A promise that resolves to an array of ClientEntity objects representing the user's OAuth clients.
	 * @throws {Error} If an error occurs during the database query, it is handled and re-thrown as a specific error type.
	 */

	@LogContextMethod()
	public async findByUserId(userId: UserIdVO): Promise<ClientEntity[]> {
		try {
			const records = await this.client.oAuthClient.findMany({
				where: { owner_user_id: userId.getValue(), deleted_at: null },
				orderBy: { created_at: 'desc' },
			});

			this.logger.debug('Found OAuth clients for user', {
				userId,
				count: records.length,
			});

			return records.map((record) => clientMapper.toDomain(record));
		} catch (error) {
			this.logger.error('Failed to find OAuth clients by userId', { userId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Retrieves all OAuth clients associated with the specified user ID.
	 *
	 * @param userId - The unique identifier of the user whose clients are to be retrieved.
	 * @returns A promise that resolves to an array of ClientEntity objects representing the OAuth clients.
	 * @throws {HandledPrismaError} If an error occurs during the database query.
	 */

	@LogContextMethod()
	public async findAllByUserId(userId: UserIdVO): Promise<ClientEntity[]> {
		try {
			const records = await this.client.oAuthClient.findMany({ where: { owner_user_id: userId.getValue() } });

			this.logger.debug('Found OAuth clients for user', {
				userId,
				count: records.length,
			});

			return records.map((record) => clientMapper.toDomain(record));
		} catch (error) {
			this.logger.error('Failed to find OAuth clients by userId', { userId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Saves a client entity to the database. If the client is already persisted, it updates the existing record; otherwise, it creates a new one.
	 * @param client - The client entity to save.
	 * @returns A promise that resolves to the saved client entity.
	 * @throws {HandledPrismaError} If the save operation fails.
	 */

	@LogContextMethod()
	public async save(client: ClientEntity): Promise<ClientEntity> {
		try {
			const data = clientMapper.toEntity(client);

			if (client.isPersisted()) {
				const update = await this.client.oAuthClient.update({ where: { id: client.getId() }, data });

				return clientMapper.toDomain(update);
			} else {
				const created = await this.client.oAuthClient.create({ data });
				return clientMapper.toDomain(created);
			}
		} catch (error) {
			this.logger.error('OAuth client creation failed', {
				clientId: client.clientId,
			});
			throw handledPrismaError(error);
		}
	}

	/**
	 * Updates an existing OAuth client in the database.
	 *
	 * This method first checks if the client has been persisted. If not, it throws an error.
	 * It then maps the client entity to the database format and performs the update operation.
	 * Logs the success or failure of the operation.
	 *
	 * @param client - The ClientEntity instance to update. Must be a persisted client.
	 * @returns A Promise that resolves to void when the update is successful.
	 * @throws InvalidPersisteError if the client has not been persisted.
	 * @throws HandledPrismaError if the database update fails.
	 */

	@LogContextMethod()
	public async update(client: ClientEntity): Promise<void> {
		try {
			if (!client.isPersisted()) throw new InvalidPersisteError('Cannot update a client that has not been persisted');

			const data = clientMapper.toEntity(client);

			await this.client.oAuthClient.update({ where: { id: client.getId() }, data });

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
	 * Soft deletes an OAuth client by setting the `deleted_at` timestamp to the current date.
	 * Logs a debug message on success and an error message on failure.
	 * @param clientId - The unique identifier of the OAuth client to soft delete.
	 * @returns A promise that resolves when the soft delete operation is complete.
	 * @throws Throws a handled Prisma error if the update operation fails.
	 */

	@LogContextMethod()
	public async softDelete(clientId: ClientIdVO): Promise<void> {
		try {
			await this.client.oAuthClient.update({ where: { client_id: clientId.getValue() }, data: { deleted_at: new Date() } });
			this.logger.debug('OAuth client soft deleted', { id: clientId.getValue() });
		} catch (error) {
			this.logger.error('OAuth client soft delete failed', { id: clientId.getValue() });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Checks if an OAuth client exists by its client ID.
	 * @param clientId - The client ID value object to check for existence.
	 * @returns A promise that resolves to true if the client exists and is not deleted, false otherwise.
	 * @throws {Error} If there's an error during the database query.
	 */

	@LogContextMethod()
	public async existByClientId(clientId: ClientIdVO): Promise<boolean> {
		try {
			const count = await this.client.oAuthClient.count({ where: { client_id: clientId.getValue(), deleted_at: null } });

			return count > 0;
		} catch (error) {
			this.logger.error('Failed to check OAuth client existence', { clientId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Rotates the client secret for the specified OAuth client.
	 * Updates the client with the new secret hash, stores the old secret hash for a grace period,
	 * and sets the expiration date for the old secret.
	 *
	 * @param clientId - The unique identifier of the OAuth client.
	 * @param newSecretHash - The hashed value of the new client secret.
	 * @param oldSecretHash - The hashed value of the old client secret to be retained during the grace period.
	 * @param gracePeriodExpiration - The date and time when the old secret expires and is no longer valid.
	 * @returns A promise that resolves when the secret rotation is complete.
	 * @throws {Error} If the database update fails, an error is thrown after logging.
	 */

	@LogContextMethod()
	public async rotateSecret(
		clientId: ClientIdVO,
		newSecretHash: string,
		oldSecretHash: string,
		gracePeriodExpiration: Date
	): Promise<void> {
		try {
			await this.client.oAuthClient.update({
				where: { client_id: clientId.getValue() },
				data: {
					client_secret_hash: newSecretHash,
					client_Secret_Old: oldSecretHash,
					secret_Expires_At: gracePeriodExpiration,
					updated_at: new Date(),
				},
			});
			this.logger.debug('Client secret rotated successfully', { clientId, gracePeriodExpiresAt: gracePeriodExpiration.toISOString() });
		} catch (error) {
			this.logger.error('Failed to rotate client secret', { clientId, error: getErrMessage(error) });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds OAuth clients owned by the specified user ID.
	 * Retrieves third-party clients that are not deleted, ordered by creation date in descending order.
	 *
	 * @param ownerId - The unique identifier of the owner user.
	 * @returns A promise that resolves to an array of ClientEntity instances.
	 * @throws {HandledPrismaError} If the database query fails.
	 */

	@LogContextMethod()
	public async findByOwnerId(ownerId: UserIdVO): Promise<ClientEntity[]> {
		try {
			const records = await this.client.oAuthClient.findMany({
				where: { owner_user_id: ownerId.getValue(), client_type: ClientType.THIRD_PARTY, deleted_at: null },
				orderBy: { created_at: 'desc' },
			});

			this.logger.debug('Found OAuth clients for Owner ID', {
				ownerId: ownerId.getValue(),
				count: records.length,
			});

			return records.map((record) => clientMapper.toDomain(record));
		} catch (error) {
			this.logger.error('Failed to find OAuth clients by userId', { ownerId: ownerId.getValue() });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Determines whether the OAuth client with the given client ID is owned by the specified user.
	 *
	 * @param clientId - The client ID to check.
	 * @param userId - The user ID to check ownership against.
	 * @returns A promise that resolves to true if the client is owned by the user, false otherwise.
	 */

	@LogContextMethod()
	public async isOwnedBy(clientId: ClientIdVO, userId: UserIdVO): Promise<boolean> {
		const client = await this.client.oAuthClient.findUnique({
			where: { client_id: clientId.getValue() },
			select: {
				owner_user_id: true,
				client_type: true,
				deleted_at: true,
			},
		});

		if (!client) return false;
		if (client.deleted_at) return false;
		if (client.client_type === ClientType.SYSTEM) return false;

		return client.owner_user_id === userId.getValue();
	}
}
