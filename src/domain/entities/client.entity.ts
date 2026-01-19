/**
 * Represents the data structure for an OAuth2 client entity.
 * This interface defines the properties required to store and manage client information
 * in the OAuth2 authorization server.
 * @property {string} id - The unique identifier for the client.
 * @property {string} clientId - The OAuth2 client identifier.
 * @property {string} clientSecret - The OAuth2 client secret.
 * @property {string} clientName - The human-readable name of the client.
 * @property {string[]} redirectUris - The allowed redirect URIs for the client.
 * @property {string[]} grantTypes - The supported grant types for the client.
 * @property {boolean} isPublic - Indicates if the client is public (no secret required).
 * @property {boolean} isActive - Indicates if the client is active and can be used.
 * @property {Date} [createdAt] - The timestamp when the client was created.
 * @property {Date} [updatedAt] - The timestamp when the client was last updated.
 * @property {string} [userId] - The identifier of the user who owns the client (undefined for system clients).
 * @property {boolean} isSystemClient - Indicates if this is a system-level client.
 * @property {string} [systemRole] - The system role associated with the client, if applicable.
 */

interface ClientData {
	id: string;
	clientId: string;
	clientSecret: string;
	clientName: string;
	redirectUris: string[];
	grantTypes: string[];
	isPublic: boolean;
	isActive: boolean;
	createdAt?: Date;
	updatedAt?: Date;
	userId?: string;
	isSystemClient: boolean;
	systemRole?: string;
}

/**
 * Represents an OAuth2 client entity in the system.
 *
 * This class encapsulates the data and behavior of an OAuth2 client, including its configuration,
 * ownership, and various validation methods. It follows the entity pattern with immutable properties
 * and a factory method for creation.
 *
 * @property {string} id - The unique identifier for the client.
 * @property {string} clientId - The public client identifier used in OAuth2 flows.
 * @property {string} clientSecret - The secret key for confidential clients (omitted in public representations).
 * @property {string} clientName - The human-readable name of the client.
 * @property {string[]} redirectUris - The list of allowed redirect URIs for authorization flows.
 * @property {string[]} grantTypes - The supported OAuth2 grant types (e.g., "authorization_code", "client_credentials").
 * @property {boolean} isPublic - Indicates if the client is public (true) or confidential (false).
 * @property {boolean} isActive - Indicates if the client is active and can be used.
 * @property {Date} createdAt - The timestamp when the client was created.
 * @property {Date} updatedAt - The timestamp when the client was last updated.
 * @property {string | undefined} userId - The ID of the user who owns this client (undefined for system clients).
 * @property {boolean} isSystemClient - Indicates if this is a system-managed client.
 * @property {string | undefined} systemRole - The role of the system client (e.g., "bff" for Backend for Frontend).
 */

export class ClientEntity {
	public readonly id!: string;
	public readonly clientId!: string;
	public readonly clientSecret!: string;
	public readonly clientName!: string;
	public readonly redirectUris!: string[];
	public readonly grantTypes!: string[];
	public readonly isPublic!: boolean;
	public readonly isActive!: boolean;
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
	public readonly userId?: string;
	public readonly isSystemClient!: boolean;
	public readonly systemRole?: string;

	private constructor(data: ClientData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new ClientEntity instance with the provided parameters, applying default values for optional fields.
	 * @param params - The data to initialize the client entity.
	 * @returns A new ClientEntity instance.
	 */

	public static create(params: ClientData): ClientEntity {
		const now = new Date();

		return new ClientEntity({
			...params,
			isPublic: params.isPublic ?? false,
			isActive: params.isActive ?? true,
			isSystemClient: params.isSystemClient ?? false,
			createdAt: params.createdAt ?? now,
			updatedAt: params.updatedAt ?? now,
		});
	}

	/**
	 * Determines whether the OAuth client entity is owned by the specified user.
	 *
	 * @param userId - The ID of the user to check ownership against.
	 * @returns `true` if the client is owned by the given user, otherwise `false`.
	 */

	public isOwnedBy(userId: string): boolean {
		return this.userId === userId;
	}

	/**
	 * Determines whether the OAuth client is currently active.
	 *
	 * @returns {boolean} `true` if the client is active; otherwise, `false`.
	 */

	public isClientActive(): boolean {
		return this.isActive;
	}

	/**
	 * Checks if the provided URI is included in the list of valid redirect URIs for this OAuth client.
	 *
	 * @param uri - The redirect URI to validate.
	 * @returns `true` if the URI is a valid redirect URI for this client; otherwise, `false`.
	 */

	public isValidRedirectUri(uri: string): boolean {
		return this.redirectUris.includes(uri);
	}

	/**
	 * Determines whether the OAuth client supports the specified grant type.
	 *
	 * @param grandType - The grant type to check for support (e.g., "authorization_code", "client_credentials").
	 * @returns `true` if the grant type is supported by the client; otherwise, `false`.
	 */

	public supportsGrandType(grandType: string): boolean {
		return this.grantTypes.includes(grandType);
	}

	/**
	 * Checks if the client is a system client.
	 * @returns True if the client is a system client, false otherwise.
	 */

	public isSystem(): boolean {
		return this.isSystemClient;
	}

	/**
	 * Determines if the client is a Backend for Frontend (BFF).
	 * @returns {boolean} True if the client is a system client with the role 'bff', otherwise false.
	 */

	public isBFF(): boolean {
		return this.isSystemClient && this.systemRole === 'bff';
	}

	/**
	 * Determines if the client is external.
	 * @returns True if the client is external (not a system client), false otherwise.
	 */

	public isExternal(): boolean {
		return !this.isSystemClient;
	}

	/**
	 * Determines whether the client requires user consent.
	 * @returns {boolean} True if the client is not a system client, false otherwise.
	 */

	public requiresConsent(): boolean {
		return !this.isSystemClient;
	}

	/**
	 * Determines whether Proof Key for Code Exchange (PKCE) is required for this OAuth2 client.
	 * PKCE is typically required for public clients to enhance security in the authorization code flow.
	 *
	 * @returns {boolean} True if PKCE is required (i.e., the client is public and not a system client), false otherwise.
	 */

	public requiresPKCE(): boolean {
		if (!this.isSystemClient && this.isPublic) return true;

		return false;
	}

	/**
	 * Determines if the client can be deleted.
	 * @returns {boolean} True if the client is not a system client, false otherwise.
	 */

	public canBeDeleted(): boolean {
		return !this.isSystemClient;
	}

	/**
	 * Determines whether the client can be modified.
	 * @returns {boolean} True if the client is not a system client, false otherwise.
	 */

	public canBeModified(): boolean {
		return !this.isSystemClient;
	}

	/**
	 * Returns a public representation of the OAuth client data, omitting the `clientSecret` property.
	 *
	 * @returns An object containing all properties of the OAuth client except for `clientSecret`.
	 */

	public toPublic(): Omit<ClientData, 'clientSecret'> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { clientSecret, ...rest } = this;
		return { ...rest };
	}
}
