import * as Dtos from '@application';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		ValidateClientUseCase: IValidateClientUseCase;
		CreateClientUseCase: ICreateClientUseCase;
		ListClientUseCase: IListClientUseCase;
		GetClientByIdUseCase: IGetClientByIdUseCase;
		UpdateClientUseCase: IUpdateClientUseCase;
		DeleteClientUseCase: IDeleteClientUseCase;
		RotateSecretUseCase: IRotateSecretUseCase;
	}
}

/**
 * Use case interface for validating OAuth2 client credentials.
 *
 * @interface IValidateClientUseCase
 *
 * @remarks
 * This interface defines the contract for validating client credentials
 * in an OAuth2 authentication flow. Implementations should verify the
 * client's identity and authorization.
 *
 * @method execute - Validates the client credentials
 * @param {ValidateClientRequestDto} data - The data required for client validation
 * @returns {Promise<ValidateClientResponseDto>} - A promise that resolves to the validation result
 *
 * @example
 * ```typescript
 * class ValidateClientUseCase implements IValidateClientUseCase {
 *   async execute(data: ValidateClientRequestDto): Promise<ValidateClientResponseDto> {
 *     // Validation logic here
 *   }
 * }
 * ```
 */

export interface IValidateClientUseCase {
	execute(data: Dtos.ValidateClientRequestDto): Promise<Dtos.ValidateClientResponseDto>;
}

/**
 * Use case for creating a new OAuth2 client.
 *
 * @interface ICreateClientUseCase
 * @method execute - Creates a new client for the specified user.
 * @param userId - The unique identifier of the user creating the client.
 * @param request - The client creation request containing necessary configuration details.
 * @returns A promise that resolves to the created client response with client credentials and metadata.
 */

export interface ICreateClientUseCase {
	execute(userId: string, request: Dtos.CreateClientRequestDTO): Promise<Dtos.CreateClientResponseDTO>;
}

/**
 * Use case interface for listing clients associated with a user.
 *
 * @interface IListClientUseCase
 *
 * @method execute
 * @param {string} userId - The unique identifier of the user whose clients are to be listed.
 * @returns {Promise<ListClientResponseDTO>} A promise that resolves to a DTO containing the list of clients for the specified user.
 *
 * @example
 * const listClientUseCase: IListClientUseCase = new ListClientUseCase();
 * const result = await listClientUseCase.execute('user-123');
 */

export interface IListClientUseCase {
	execute(userId: string): Promise<Dtos.ListClientResponseDTO>;
}

/**
 * Use case for retrieving a client by its ID.
 * @interface IGetClientByIdUseCase
 * @method execute - Fetches a client's details for a given user and client ID.
 * @param {string} userId - The ID of the user requesting the client information.
 * @param {string} clientId - The ID of the client to retrieve.
 * @returns {Promise<Dtos.ClientResponseDTO>} A promise that resolves to the client response DTO containing the client's details.
 */

export interface IGetClientByIdUseCase {
	execute(userId: string, clientId: string): Promise<Dtos.ClientResponseDTO>;
}

/**
 * Interface for the update client use case.
 *
 * @interface IUpdateClientUseCase
 *
 * @method execute - Updates an existing client with the provided request data.
 * @param userId - The ID of the user performing the update.
 * @param clientId - The ID of the client to be updated.
 * @param request - The update client request DTO containing the new client data.
 * @returns {Dtos.ClientResponseDTO} The updated client response DTO.
 */

export interface IUpdateClientUseCase {
	execute(userId: string, clientId: string, request: Dtos.UpdateClientRequestDTO): Promise<Dtos.ClientResponseDTO>;
}

/**
 * Use case interface for deleting a client.
 *
 * @interface IDeleteClient
 * @method execute - Deletes a client for a specific user.
 * @param {string} userId - The ID of the user who owns the client.
 * @param {string} clientId - The ID of the client to delete.
 * @returns {Promise<void>} A promise that resolves when the client is successfully deleted.
 */

export interface IDeleteClientUseCase {
	execute(userId: string, clientId: string): Promise<void>;
}

/**
 * Use case for rotating a client's secret.
 *
 * @interface IRotateSecretUseCase
 * @method execute - Rotates the secret for a specified client owned by a user.
 * @param {string} userId - The unique identifier of the user who owns the client.
 * @param {string} clientId - The unique identifier of the client whose secret should be rotated.
 * @returns {Promise<Dtos.RotateSecretResponseDTO>} A promise that resolves to the response containing the rotated secret details.
 */

export interface IRotateSecretUseCase {
	execute(userId: string, clientId: string): Promise<Dtos.RotateSecretResponseDTO>;
}
