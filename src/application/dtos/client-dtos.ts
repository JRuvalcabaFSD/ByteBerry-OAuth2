import { CreateClientData, CreateClientSchema, formattedZodError, UpdateClientData, UpdateClientSchema } from '@application';
import { ClientEntity } from '@domain';
import { ValidateRequestError } from '@shared';

/**
 * Represents an OAuth2 client application.
 *
 * @interface Client
 * @property {string} id - The unique identifier for the client.
 * @property {string} clientId - The OAuth2 client ID.
 * @property {string} clientName - The human-readable name of the client application.
 * @property {string[]} redirectUris - Array of allowed redirect URIs for OAuth2 callbacks.
 * @property {string[]} grantTypes - Array of allowed OAuth2 grant types (e.g., 'authorization_code', 'client_credentials').
 * @property {boolean} isPublic - Indicates whether the client is public (true) or confidential (false).
 * @property {boolean} isActive - Indicates whether the client is currently active.
 * @property {string} userId - The ID of the user who owns/created this client.
 * @property {Date} createdAt - Timestamp when the client was created.
 * @property {Date} updatedAt - Timestamp when the client was last updated.
 */

interface Client {
	id: string;
	clientId: string;
	clientName: string;
	redirectUris: string[];
	grantTypes: string[];
	isPublic: boolean;
	isActive: boolean;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Represents a client response containing client information along with the client secret.
 *
 * @interface ClientResponse
 * @extends {Client}
 * @property {string} clientSecret - The secret key associated with the client for authentication purposes.
 */

interface ClientResponse extends Client {
	clientSecret: string;
}

/**
 * Represents a client object with serialized date fields.
 *
 * Extends the {@link Client} interface while converting the `createdAt` and `updatedAt`
 * properties from Date objects to ISO 8601 formatted strings for serialization purposes.
 *
 * @typedef {Object} ClientObject
 * @property {string} createdAt - The date and time when the client was created, formatted as an ISO 8601 string.
 * @property {string} updatedAt - The date and time when the client was last updated, formatted as an ISO 8601 string.
 */

interface ClientObject extends Omit<Client, 'createdAt' | 'updatedAt'> {
	createdAt: string;
	updatedAt: string;
}

/**
 * Data Transfer Object for creating an OAuth 2.0 client.
 *
 * @remarks
 * This DTO is used to validate and transfer client creation request data.
 * It uses Zod schema for runtime validation before instantiation.
 *
 * @example
 * ```typescript
 * const clientDTO = CreateClientRequestDTO.fromBody({
 *   clientName: 'My App',
 *   redirectUris: ['http://localhost:3000/callback'],
 *   grantTypes: ['authorization_code'],
 *   isPublic: false
 * });
 * ```
 */

export class CreateClientRequestDTO {
	public readonly clientName!: string;
	public readonly redirectUris!: string[];
	public readonly grantTypes!: string[];
	public readonly isPublic!: boolean;

	private constructor(data: CreateClientData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a CreateClientRequestDTO instance from a request body object.
	 * Validates the body against the CreateClientSchema before instantiation.
	 *
	 * @param body - The request body containing client creation data
	 * @returns A new CreateClientRequestDTO instance with validated data
	 * @throws {ValidateRequestError} When validation fails, includes formatted error messages and error details
	 */

	public static fromBody(body: Record<string, string>): CreateClientRequestDTO {
		const resp = CreateClientSchema.safeParse({ ...body });

		if (!resp.success) {
			const formatted = formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formatted.msg, formatted.errors);
		}

		return new CreateClientRequestDTO(resp.data);
	}
}

/**
 * Data Transfer Object for client creation response.
 *
 * Handles the transformation of a ClientEntity into a JSON-serializable response,
 * including the client secret that is only available at creation time.
 *
 * @example
 * ```typescript
 * const dto = CreateClientResponseDTO.fromEntity(clientEntity, secret);
 * const response = dto.toJSON();
 * ```
 */

export class CreateClientResponseDTO {
	private readonly client!: ClientResponse;

	private constructor(data: { client: ClientResponse }) {
		Object.assign(this, data);
	}

	/**
	 * Creates a CreateClientResponseDTO from a ClientEntity with an additional client secret.
	 * @param client - The client entity to convert
	 * @param clientSecret - The client secret to include in the response
	 * @returns A new CreateClientResponseDTO instance containing the client data with the secret
	 */

	public static fromEntity(client: ClientEntity, clientSecret: string): CreateClientResponseDTO {
		return new CreateClientResponseDTO({ client: { ...client, clientSecret } });
	}

	/**
	 * Converts the client data transfer object to a JSON-serializable format.
	 * Transforms ISO 8601 date strings for the createdAt and updatedAt timestamps.
	 * @returns {Object} An object containing the serialized client data with ISO string dates.
	 * @returns {ClientObject} returns.client - The client object with date properties converted to ISO strings.
	 */

	public toJSON(): { client: ClientObject } {
		return {
			client: {
				...this.client,
				createdAt: this.client.createdAt.toISOString(),
				updatedAt: this.client.updatedAt.toISOString(),
			},
		};
	}
}

/**
 * Data Transfer Object for listing clients in response.
 *
 * This DTO is responsible for transforming client entities into a standardized response format.
 * It provides methods to create instances from client entities and serialize them to JSON.
 *
 * @class ListClientResponseDTO
 *
 * @property {Array<Client>} clients - Array of client objects to be returned in the response.
 *
 * @example
 * const clients = await clientRepository.findAll();
 * const response = ListClientResponseDTO.fromEntities(clients);
 * const json = response.toJSON();
 */

export class ListClientResponseDTO {
	public readonly clients!: Array<Client>;

	private constructor(data: { clients: Array<Client> }) {
		Object.assign(this, data);
	}

	/**
	 * Creates a ListClientResponseDTO from an array of ClientEntity objects.
	 * @param clients - Array of ClientEntity instances to convert
	 * @returns ListClientResponseDTO containing the public client data with timestamps
	 */

	public static fromEntities(clients: ClientEntity[]): ListClientResponseDTO {
		return new ListClientResponseDTO({
			clients: clients.map((client) => ({ ...client.toPublic(), createdAt: client.createdAt, updatedAt: client.updatedAt })),
		});
	}

	/**
	 * Serializes the clients collection to a JSON-compatible object.
	 * Converts all client objects to a serializable format by transforming
	 * Date objects (createdAt, updatedAt) to ISO 8601 string representations.
	 *
	 * @returns An object containing an array of serialized client objects with
	 *          date properties converted to ISO strings.
	 */

	public toJSON(): { clients: Array<ClientObject> } {
		return {
			clients: this.clients.map((client) => ({
				...client,
				createdAt: client.createdAt.toISOString(),
				updatedAt: client.updatedAt.toISOString(),
			})),
		};
	}
}

/**
 * Data Transfer Object for client responses.
 *
 * Provides a structured way to serialize and deserialize client entities
 * for API responses, with automatic date formatting to ISO 8601 strings.
 *
 * @class ClientResponseDTO
 *
 * @property {Client} client - The client entity data.
 *
 * @example
 * ```typescript
 * const clientResponse = ClientResponseDTO.fromEntity(clientEntity);
 * const json = clientResponse.toJSON();
 * ```
 */

export class ClientResponseDTO {
	public readonly client!: Client;

	private constructor(data: { client: Client }) {
		Object.assign(this, data);
	}

	/**
	 * Converts a ClientEntity to a ClientResponseDTO.
	 * @param client - The ClientEntity instance to convert.
	 * @returns A new ClientResponseDTO containing the client data.
	 */

	public static fromEntity(client: ClientEntity): ClientResponseDTO {
		return new ClientResponseDTO({ client: { ...client } });
	}

	/**
	 * Serializes the client object to a JSON-compatible format.
	 * Converts date properties (createdAt, updatedAt) to ISO 8601 string format.
	 * @returns An object containing the serialized client with ISO-formatted timestamps.
	 */

	public toJSON(): { client: ClientObject } {
		return {
			client: {
				...this.client,
				createdAt: this.client.createdAt.toISOString(),
				updatedAt: this.client.updatedAt.toISOString(),
			},
		};
	}
}

/**
 * Data Transfer Object for updating an OAuth2 client.
 *
 * @class UpdateClientRequestDTO
 * @description Represents the request payload for updating client credentials and configuration.
 * All properties are optional, allowing partial updates of client settings.
 *
 * @property {string} [clientName] - The name of the OAuth2 client
 * @property {string[]} [redirectUris] - Array of allowed redirect URIs for the client
 * @property {string[]} [grantTypes] - Array of OAuth2 grant types the client is allowed to use
 * @property {boolean} [isPublic] - Flag indicating whether the client is public or confidential
 *
 * @method fromBody - Static factory method to create and validate an UpdateClientRequestDTO from request body
 * @param {Record<string, string>} body - The raw request body to validate and parse
 * @returns {UpdateClientRequestDTO} A validated instance of UpdateClientRequestDTO
 * @throws {ValidateRequestError} When validation against UpdateClientSchema fails
 *
 * @example
 * const dto = UpdateClientRequestDTO.fromBody({
 *   clientName: 'My App',
 *   redirectUris: ['https://example.com/callback']
 * });
 */

export class UpdateClientRequestDTO {
	public readonly clientName?: string;
	public readonly redirectUris?: string[];
	public readonly grantTypes?: string[];
	public readonly isPublic?: boolean;

	private constructor(data: UpdateClientData) {
		Object.assign(this, data);
	}

	/**
	 * Creates an UpdateClientData instance from a request body object.
	 * @param body - The request body containing client update data as key-value pairs
	 * @returns An UpdateClientRequestDTO instance with validated data
	 * @throws {ValidateRequestError} When the body fails schema validation
	 */

	public static fromBody(body: Record<string, string>): UpdateClientData {
		const resp = UpdateClientSchema.safeParse({ ...body });

		if (!resp.success) {
			const formatted = formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formatted.msg, formatted.errors);
		}

		return new UpdateClientRequestDTO(resp.data);
	}
}
