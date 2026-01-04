/**
 * Represents the data structure for an OAuth client entity.
 *
 * @property id - Unique identifier for the OAuth client.
 * @property clientId - The client ID used for OAuth authentication.
 * @property clientSecret - The client secret used for OAuth authentication.
 * @property clientName - Human-readable name of the client.
 * @property redirectUris - List of allowed redirect URIs for the client.
 * @property grantTypes - Supported OAuth grant types for the client.
 * @property isPublic - Indicates if the client is public (does not require a secret).
 * @property isActive - Indicates if the client is currently active.
 * @property createdAt - Timestamp when the client was created.
 * @property updatedAt - Timestamp when the client was last updated.
 * @property userId - Identifier of the user who owns the client.
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
	userId: string;
}

/**
 * Represents an OAuth client entity with properties and methods for managing OAuth clients.
 *
 * This class encapsulates the data and behaviors associated with an OAuth client, including
 * identification, credentials, supported grant types, redirect URIs, and ownership.
 *
 * Instances of `OAuthClientEntity` are immutable and can only be created via the static `create` method,
 * which ensures default values for optional fields.
 *
 * @remarks
 * - Use `isOwnedBy` to check client ownership.
 * - Use `isValidRedirectUri` to validate redirect URIs.
 * - Use `supportsGrandType` to verify supported grant types.
 * - Use `toPublic` to obtain a representation without the client secret.
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
	public readonly userId!: string;

	private constructor(data: ClientData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new instance of `OAuthClientEntity` using the provided parameters.
	 *
	 * Default values are assigned for optional fields:
	 * - `isPublic` defaults to `false` if not specified.
	 * - `isActive` defaults to `true` if not specified.
	 * - `createdAt` and `updatedAt` default to the current date and time if not specified.
	 *
	 * @param params - The data required to create an OAuth client entity.
	 * @returns A new `OAuthClientEntity` instance.
	 */

	public static create(params: ClientData): ClientEntity {
		const now = new Date();

		return new ClientEntity({
			...params,
			isPublic: params.isPublic ?? false,
			isActive: params.isActive ?? true,
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
