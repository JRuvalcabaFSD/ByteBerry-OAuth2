import { ClientEntity } from '@domain';

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
 * Interface for the OAuth client repository, defining methods for accessing and manipulating OAuth client entities.
 *
 * @remarks
 * This repository interface abstracts the data access layer for OAuth clients, providing methods to find, save, update, and soft-delete client records.
 *
 * @method findByClientId Retrieves an OAuth client entity by its client ID.
 * @param clientId - The unique client identifier.
 *
 * @method findById Retrieves an OAuth client entity by its unique ID.
 * @param Id - The unique identifier of the OAuth client.
 * @returns A promise that resolves to the OAuth client entity or null if not found.
 *
 * @method findByUserId Retrieves all actives OAuth client entities associated with a specific user ID.
 * @param userId - The user's unique identifier.
 * @returns A promise that resolves to an array of OAuth client entities.
 *
 * @method findAllByUserId Retrieves all OAuth client entities for a given user ID (including inactive).
 * @param userId - The user's unique identifier.
 * @returns A promise that resolves to an array of OAuth client entities.
 *
 * @method save Persists a new OAuth client entity.
 * @param client - The OAuth client entity to save.
 * @returns A promise that resolves when the operation is complete.
 *
 * @method update Updates an existing OAuth client entity.
 * @param client - The OAuth client entity to update.
 * @returns A promise that resolves when the operation is complete.
 *
 * @method softDelete Soft deletes an OAuth client entity.
 * @param id - The identifier of the OAuth client entity to soft delete.
 * @returns A promise that resolves when the operation is complete.
 *
 * @method existByClientId Checks if an OAuth client exists by its client ID.
 * @param clientId - The unique client identifier.
 * @returns A promise that resolves to true if the client exists, false otherwise.
 */

export interface IClientRepository {
	findByClientId(clientId: string): Promise<ClientEntity | null>;
	findById(Id: string): Promise<ClientEntity | null>;
	findByUserId(userId: string): Promise<ClientEntity[]>;
	findAllByUserId(userId: string): Promise<ClientEntity[]>;
	save(client: ClientEntity): Promise<void>;
	update(client: ClientEntity): Promise<void>;
	softDelete(id: string): Promise<void>;
	existByClientId(clientId: string): Promise<boolean>;
}
