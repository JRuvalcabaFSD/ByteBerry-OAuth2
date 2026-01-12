import * as Schemas from '@application';
import { UserEntity, SessionEntity } from '@domain';
import { ValidateRequestError } from '@shared';

/**
 * Represents the data displayed on an OAuth2 consent screen.
 *
 * This interface contains all the necessary information for users to review
 * and authorize access to their resources by a client application.
 *
 * @interface ConsentScreenData
 *
 * @property {string} clientId - The unique identifier of the OAuth2 client application.
 * @property {string} clientName - The human-readable name of the client application.
 * @property {Array<{ name: string; description: string }>} scopes - The list of permission scopes requested by the client, each with a name and description.
 * @property {string} redirectUri - The URI where the user will be redirected after consent.
 * @property {string} responseType - The OAuth2 response type (e.g., "code", "token").
 * @property {string} codeChallenge - The PKCE code challenge string for enhanced security.
 * @property {string} codeChallengeMethod - The method used to generate the code challenge (e.g., "S256", "plain").
 * @property {string} [state] - Optional state parameter to maintain state between the request and callback.
 * @property {string} [scope] - Optional scope parameter as a space-separated string.
 */

export interface ConsentScreenData {
	clientId: string;
	clientName: string;
	scopes: Array<{ name: string; description: string }>;
	redirectUri: string;
	responseType: string;
	codeChallenge: string;
	codeChallengeMethod: string;
	state?: string;
	scope?: string;
}

/**
 * Data Transfer Object for OAuth 2.0 authorization code requests with PKCE support.
 *
 * This DTO encapsulates the parameters required for initiating an OAuth 2.0 authorization
 * code flow with Proof Key for Code Exchange (PKCE). It validates incoming query parameters
 * against a predefined schema and ensures type safety.
 *
 * @remarks
 * The class uses a private constructor pattern with a static factory method to ensure
 * all instances are properly validated before creation.
 *
 * @example
 * ```typescript
 * const queryParams = {
 *   client_id: 'my-client',
 *   redirect_uri: 'https://example.com/callback',
 *   response_type: 'code',
 *   code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
 *   code_challenge_method: 'S256',
 *   state: 'random-state-string',
 *   scope: 'read write'
 * };
 *
 * const codeRequest = CodeRequestDTO.fromQuery(queryParams);
 * ```
 *
 * @throws {ValidateRequestError} When the query parameters fail validation against CodeRequestSchema
 */

export class CodeRequestDTO {
	public readonly clientId!: string;
	public readonly redirectUri!: string;
	public readonly responseType!: string;
	public readonly codeChallenge!: string;
	public readonly codeChallengeMethod!: 'S256' | 'plain';
	public readonly state?: string;
	public readonly scope?: string;

	private constructor(data: Schemas.CodeRequestData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a CodeRequestDTO instance from a query string object.
	 *
	 * @param query - A record containing query string parameters as key-value pairs
	 * @returns A new CodeRequestDTO instance created from the validated query data
	 * @throws {ValidateRequestError} When the query parameters fail validation against CodeRequestSchema
	 *
	 * @example
	 * ```typescript
	 * const query = { code: 'abc123', state: 'xyz789' };
	 * const dto = CodeRequestDTO.fromQuery(query);
	 * ```
	 */

	public static fromQuery(query: Record<string, string>): CodeRequestDTO {
		const resp = Schemas.CodeRequestSchema.safeParse({ ...query });

		if (!resp.success) {
			const formatted = Schemas.formattedZodError(resp.error, 'form');

			throw new ValidateRequestError(formatted.msg, formatted.errors);
		}

		return new CodeRequestDTO(resp.data);
	}
}

/**
 * Data Transfer Object representing an OAuth2 authorization code response.
 *
 * This DTO encapsulates the authorization code and optional state parameter
 * returned during the OAuth2 authorization code flow.
 *
 * @remarks
 * The class provides utility methods to build redirect URLs with the authorization
 * code and state parameters, as well as JSON serialization capabilities.
 *
 * @example
 * ```typescript
 * const codeResponse = new CodeResponseDTO('auth_code_123', 'random_state');
 * const redirectUrl = codeResponse.buildRedirectURrl('https://example.com/callback');
 * // Returns: 'https://example.com/callback?code=auth_code_123&state=random_state'
 * ```
 */

export class CodeResponseDTO {
	constructor(
		public readonly code: string,
		public readonly state?: string
	) {}

	/**
	 * Builds a redirect URL by appending authorization code and optional state parameters.
	 *
	 * @param baseRedirectUri - The base URI to which the code and state parameters will be appended
	 * @returns A complete redirect URL string with the authorization code and optional state as query parameters
	 *
	 * @example
	 * ```ts
	 * const redirectUrl = buildRedirectURrl('https://example.com/callback');
	 * // Returns: 'https://example.com/callback?code=abc123&state=xyz789'
	 * ```
	 */

	public buildRedirectURrl(baseRedirectUri: string): string {
		const url = new URL(baseRedirectUri);
		url.searchParams.set('code', this.code);

		if (this.state) {
			url.searchParams.set('state', this.state);
		}

		return url.toString();
	}

	public toJSON(): { code: string; state?: string } {
		return {
			code: this.code,
			...(this.state && { state: this.state }),
		};
	}
}

/**
 * Represents a user entity in the authentication system.
 *
 * @interface User
 * @property {string} id - The unique identifier of the user.
 * @property {string} email - The email address of the user.
 * @property {string | null} username - The username of the user, or null if not set.
 * @property {string | null} fullName - The full name of the user, or null if not set.
 * @property {string[]} roles - An array of role identifiers assigned to the user.
 */

interface User {
	id: string;
	email: string;
	username: string | null;
	fullName: string | null;
	roles: string[];
}

/**
 * Represents the response data returned after a successful user login.
 *
 * @interface LoginResponseData
 * @property {string} sessionId - Unique identifier for the user's authenticated session
 * @property {User} user - The authenticated user object containing user details
 * @property {Date} expiresAt - The date and time when the session will expire
 * @property {string} message - A descriptive message about the login result
 */

interface LoginResponseData {
	sessionId: string;
	user: User;
	expiresAt: Date;
	message: string;
}

/**
 * Data Transfer Object for handling login requests.
 *
 * This class encapsulates login credentials and metadata required for user authentication.
 * It provides validation through a factory method that parses and validates input data
 * using a Zod schema.
 *
 * @remarks
 * - The class uses a private constructor to enforce creation through the `fromBody` factory method
 * - All properties are readonly to ensure immutability after instantiation
 * - Validation errors are formatted and thrown as `ValidateRequestError`
 *
 * @example
 * ```typescript
 * const loginRequest = LoginRequestDTO.fromBody({
 *   emailOrUserName: 'user@example.com',
 *   password: 'securePassword123',
 *   rememberMe: 'true',
 *   userAgent: 'Mozilla/5.0...',
 *   ipAddress: '192.168.1.1'
 * });
 * ```
 */

export class LoginRequestDTO {
	public readonly emailOrUserName!: string;
	public readonly password!: string;
	public readonly rememberMe?: boolean;
	public readonly userAgent?: string;
	public readonly ipAddress?: string;

	private constructor(data: Schemas.LoginRequestData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a LoginRequestDTO instance from a request body object.
	 *
	 * @param body - A record containing string key-value pairs from the request body
	 * @returns A new LoginRequestDTO instance with validated data
	 * @throws {ValidateRequestError} When the body fails validation against LoginRequestSchema
	 *
	 * @remarks
	 * This method validates the input body using LoginRequestSchema and formats any validation
	 * errors before throwing them. The validation is performed using Zod's safeParse method.
	 */

	public static fromBody(body: Record<string, string>, ip?: string): LoginRequestDTO {
		const resp = Schemas.LoginRequestSchema.safeParse({ ...body, ipAddress: ip });

		if (!resp.success) {
			const formattedError = Schemas.formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formattedError.msg, formattedError.errors);
		}

		return new LoginRequestDTO(resp.data);
	}
}

/**
 * Data Transfer Object for login response.
 *
 * Represents the response returned after a successful login operation,
 * containing session information, user details, and expiration data.
 *
 * @remarks
 * This class uses a private constructor to enforce creation through the
 * static factory method `fromEntities`, ensuring proper initialization
 * from domain entities.
 *
 * @example
 * ```typescript
 * const loginResponse = LoginResponseDTO.fromEntities(userEntity, sessionEntity);
 * const json = loginResponse.toJson();
 * ```
 */

export class LoginResponseDTO {
	public readonly sessionId!: string;
	public readonly user!: User;
	public readonly expiresAt!: Date;
	public readonly message!: string;

	private constructor(data: LoginResponseData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a LoginResponseDTO instance from user and session entities.
	 *
	 * @param user - The user entity containing user information
	 * @param session - The session entity containing session details
	 * @returns A new LoginResponseDTO instance with session ID, public user data, expiration time, and success message
	 *
	 * @example
	 * ```typescript
	 * const loginResponse = LoginResponseDTO.fromEntities(userEntity, sessionEntity);
	 * ```
	 */

	public static fromEntities(user: UserEntity, session: SessionEntity): LoginResponseDTO {
		return new LoginResponseDTO({
			sessionId: session.id,
			user: user.toPublic(),
			expiresAt: session.expiresAt,
			message: 'Login successful',
		});
	}

	public toJson(): { user: User; expiresAt: string; message: string } {
		return {
			user: this.user,
			expiresAt: this.expiresAt.toISOString(),
			message: this.message,
		};
	}
}

/**
 * Represents the data structure for an OAuth2 token response.
 *
 * @interface TokenResponseData
 * @property {string} accessToken - The access token issued by the authorization server.
 * @property {number} expiresIn - The lifetime in seconds of the access token.
 * @property {string} scope - The scope of the access token as described by RFC 6749.
 */

interface TokenResponseData {
	accessToken: string;
	expiresIn: number;
	scope: string;
}

/**
 * Data Transfer Object for OAuth2 token requests.
 *
 * This class encapsulates the data required to request an OAuth2 access token,
 * following the Authorization Code Grant flow with PKCE (Proof Key for Code Exchange).
 *
 * @remarks
 * The class uses a private constructor to enforce creation through the factory method
 * `fromBody`, which validates the input data against a schema before instantiation.
 *
 * @example
 * ```typescript
 * const tokenRequest = TokenRequestDTO.fromBody({
 *   grantType: 'authorization_code',
 *   code: 'auth_code_123',
 *   redirectUri: 'https://example.com/callback',
 *   clientId: 'client_123',
 *   codeVerifier: 'verifier_abc'
 * });
 * ```
 */

export class TokenRequestDTO {
	public readonly grantType!: string;
	public readonly code!: string;
	public readonly redirectUri!: string;
	public readonly clientId!: string;
	public readonly codeVerifier!: string;

	private constructor(data: Schemas.TokenRequestData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a TokenRequestDTO instance from a request body object.
	 *
	 * @param body - A record containing string key-value pairs representing the request body
	 * @returns A new TokenRequestDTO instance created from the validated body data
	 * @throws {ValidateRequestError} When the body fails validation against TokenRequestSchema
	 *
	 * @remarks
	 * This method performs validation using Zod's safeParse and formats any validation
	 * errors before throwing them as ValidateRequestError instances.
	 */

	public static fromBody(body: Record<string, string>): TokenRequestDTO {
		const resp = Schemas.TokenRequestSchema.safeParse({ ...body });

		if (!resp.success) {
			const formatted = Schemas.formattedZodError(resp.error, 'text');
			throw new ValidateRequestError(formatted.msg);
		}

		return new TokenRequestDTO(resp.data);
	}
}

/**
 * Data Transfer Object for OAuth2 token responses.
 *
 * @remarks
 * This class encapsulates the OAuth2 token response data following the RFC 6749 specification.
 * It provides a structured way to handle access token information including the token itself,
 * token type, expiration time, and authorized scopes.
 *
 * The class uses a private constructor with a static factory method pattern to ensure
 * controlled instantiation and immutability of token data.
 *
 * @example
 * ```typescript
 * const tokenResponse = TokenResponseDTO.create({
 *   accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   expiresIn: 3600,
 *   scope: 'read write'
 * });
 *
 * const json = tokenResponse.toJson();
 * // Returns: { access_token: '...', token_type: 'Bearer', expires_in: 3600, scope: 'read write' }
 * ```
 */

export class TokenResponseDTO {
	private readonly accessToken!: string;
	private readonly tokenType = 'Bearer';
	private readonly expiresIn!: number;
	private readonly scope!: string;

	private constructor(data: TokenResponseData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new instance of TokenResponseDTO from the provided data.
	 *
	 * @param data - The token response data to be encapsulated in the DTO
	 * @returns A new TokenResponseDTO instance containing the provided data
	 *
	 * @example
	 * ```typescript
	 * const tokenData: TokenResponseData = { accessToken: 'abc123', expiresIn: 3600 };
	 * const tokenDto = TokenResponseDTO.create(tokenData);
	 * ```
	 */

	public static create(data: TokenResponseData): TokenResponseDTO {
		return new TokenResponseDTO(data);
	}

	/**
	 * Converts the token data to a JSON object representation.
	 *
	 * @returns An object containing the OAuth2 token information with the following properties:
	 * - `access_token`: The access token string
	 * - `token_type`: The type of token, always 'Bearer'
	 * - `expires_in`: The number of seconds until the token expires
	 * - `scope`: The scope of the token permissions
	 */

	public toJson(): {
		access_token: string;
		token_type: 'Bearer';
		expires_in: number;
		scope: string;
	} {
		return {
			access_token: this.accessToken,
			token_type: this.tokenType,
			expires_in: this.expiresIn,
			scope: this.scope,
		};
	}
}
