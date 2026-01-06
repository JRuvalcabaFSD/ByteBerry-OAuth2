import { formattedZodError, TokenRequestData, TokenRequestSchema } from '@application';
import { ValidateRequestError } from '@shared';

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

	private constructor(data: TokenRequestData) {
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
		const result = TokenRequestSchema.safeParse({ ...body });

		if (!result.success) {
			const formatted = formattedZodError(result.error, 'text');
			throw new ValidateRequestError(formatted.msg);
		}

		return new TokenRequestDTO(result.data);
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
