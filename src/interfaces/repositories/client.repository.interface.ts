import { ClientEntity, ClientIdVO, UserIdVO } from '@domain';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		ClientRepository: IClientRepository;
	}
}

/**
 * Interface for a repository that manages ClientEntity instances.
 * Provides methods for querying, saving, updating, and deleting client data,
 * typically used in an OAuth2 authorization server context.
 */

export interface IClientRepository {
	/**
	 * Finds a client entity by its client ID.
	 * @param clientId - The unique identifier of the client.
	 * @returns A promise that resolves to the ClientEntity if found, or null if not found.
	 */

	findByClientId(clientId: ClientIdVO): Promise<ClientEntity | null>;

	/**
	 * Finds a client entity by its internal ID.
	 * @param Id - The internal unique identifier of the client.
	 * @returns A promise that resolves to the ClientEntity if found, or null if not found.
	 */

	findById(Id: string): Promise<ClientEntity | null>;

	/**
	 * Finds all client entities associated with a specific user ID.
	 * @param userId - The unique identifier of the user.
	 * @returns A promise that resolves to an array of ClientEntity instances.
	 */

	findByUserId(userId: UserIdVO): Promise<ClientEntity[]>;

	/**
	 * Finds all client entities associated with a specific user ID (alias for findByUserId).
	 * @param userId - The unique identifier of the user.
	 * @returns A promise that resolves to an array of ClientEntity instances.
	 */

	findAllByUserId(userId: UserIdVO): Promise<ClientEntity[]>;

	/**
	 * Saves a new client entity to the repository.
	 * @param client - The ClientEntity to save.
	 * @returns A promise that resolves when the save operation is complete.
	 */

	save(client: ClientEntity): Promise<ClientEntity>;

	/**
	 * Updates an existing client entity in the repository.
	 * @param client - The ClientEntity to update.
	 * @returns A promise that resolves when the update operation is complete.
	 */

	update(client: ClientEntity): Promise<void>;

	/**
	 * Soft deletes a client entity by its ID (marks as deleted without removing from storage).
	 * @param id - The internal unique identifier of the client.
	 * @returns A promise that resolves when the soft delete operation is complete.
	 */

	softDelete(clientId: ClientIdVO): Promise<void>;

	/**
	 * Checks if a client exists by its client ID.
	 * @param clientId - The unique identifier of the client.
	 * @returns A promise that resolves to true if the client exists, false otherwise.
	 */

	existByClientId(clientId: ClientIdVO): Promise<boolean>;

	/**
	 * Rotates the secret for a client, updating it with a new hash while maintaining a grace period for the old hash.
	 * @param clientId - The unique identifier of the client.
	 * @param newSecretHash - The hash of the new secret.
	 * @param oldSecretHash - The hash of the old secret.
	 * @param gracePeriodExpiration - The date when the grace period for the old secret expires.
	 * @returns A promise that resolves when the rotation is complete.
	 */

	rotateSecret(clientId: ClientIdVO, newSecretHash: string, oldSecretHash: string, gracePeriodExpiration: Date): Promise<void>;

	/**
	 * Finds all client entities owned by a specific owner ID.
	 * @param ownerId - The unique identifier of the owner.
	 * @returns A promise that resolves to an array of ClientEntity instances.
	 */

	findByOwnerId(ownerId: UserIdVO): Promise<ClientEntity[]>;

	/**
	 * Checks if a client is owned by a specific user.
	 * @param clientId - The unique identifier of the client.
	 * @param userId - The unique identifier of the user.
	 * @returns A promise that resolves to true if the client is owned by the user, false otherwise.
	 */

	isOwnedBy(clientId: ClientIdVO, userId: UserIdVO): Promise<boolean>;
}
