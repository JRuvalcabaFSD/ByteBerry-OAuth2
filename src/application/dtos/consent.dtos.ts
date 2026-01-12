import { ValidateRequestError } from '@shared';
import { CodeRequestDTO, ConsentDecisionData, ConsentDecisionSchema, formattedZodError } from '@application';
import { ConsentEntity } from '@domain';

/**
 * Represents consent data for an OAuth2 client authorization.
 *
 * @interface ConsentData
 * @property {string} id - The unique identifier for the consent record.
 * @property {string} clientId - The OAuth2 client identifier.
 * @property {string} clientName - The human-readable name of the client application.
 * @property {string[]} scopes - An array of OAuth2 scopes that have been granted.
 * @property {Date} grantedAt - The timestamp when the consent was granted.
 * @property {Date | null} expiresAt - The timestamp when the consent expires, or null if it never expires.
 */

interface ConsentData {
	id: string;
	clientId: string;
	clientName: string;
	scopes: string[];
	grantedAt: Date;
	expiresAt: Date | null;
}

/**
 * Represents a consent object with serialized date fields.
 *
 * Extends {@link ConsentData} while converting date-related fields to strings
 * for serialization purposes.
 *
 * @interface ConsentObject
 * @extends {Omit<ConsentData, 'grantedAt' | 'expiresAt'>}
 *
 * @property {string} grantedAt - The timestamp when consent was granted, represented as an ISO 8601 string.
 * @property {string | null} expiresAt - The timestamp when consent expires, represented as an ISO 8601 string, or null if consent does not expire.
 */

interface ConsentObject extends Omit<ConsentData, 'grantedAt' | 'expiresAt'> {
	grantedAt: string;
	expiresAt: string | null;
}

/**
 * Data Transfer Object for displaying OAuth2 scope information.
 * Provides scope names and their localized descriptions for UI presentation.
 *
 * @class ScopeDisplayDTO
 * @example
 * const scopes = ScopeDisplayDTO.fromScopeNames(['read', 'write']);
 * scopes.forEach(scope => console.log(scope.name, scope.description));
 */

export class ScopeDisplayDTO {
	public readonly name!: string;
	public readonly description!: string;

	private constructor(data: { name: string; description: string }) {
		Object.assign(this, data);
	}

	/**
	 * Converts an array of scope names into an array of ScopeDisplayDTO objects with descriptions.
	 *
	 * @param scopeNames - An array of scope name strings to be converted
	 * @returns An array of ScopeDisplayDTO objects, each containing a scope name and its corresponding description
	 *
	 * @description
	 * Maps each scope name to a ScopeDisplayDTO with a human-readable description in Spanish.
	 * If a scope name is not found in the predefined descriptions, a generic description is generated.
	 *
	 * Supported scopes:
	 * - `read` - View expense, category, and report information
	 * - `write` - Create, edit, and delete expenses and categories
	 * - `admin` - Full access to all administration functions
	 * - `profile` - View user profile information
	 * - `profile:write` - Modify user profile information
	 *
	 * @example
	 * const scopes = ScopeDisplayDTO.fromScopeNames(['read', 'write']);
	 * // Returns an array with descriptions for each scope
	 */

	public static fromScopeNames(scopeNames: string[]): ScopeDisplayDTO[] {
		const scopeDescriptions: Record<string, string> = {
			read: 'Ver tu información de gastos, categorías y reportes',
			write: 'Crear, editar y eliminar gastos y categorías',
			admin: 'Acceso completo a todas las funciones de administración',
			profile: 'Ver tu información de perfil de usuario',
			'profile:write': 'Modificar tu información de perfil',
		};

		return scopeNames.map((scopeName) => {
			const description = scopeDescriptions[scopeName] || `Acceso al scope: ${scopeName}`;
			return new ScopeDisplayDTO({ name: scopeName, description });
		});
	}

	/**
	 * Converts the current instance to a plain object representation.
	 * @returns An object containing the name and description properties.
	 */

	public toObject(): { name: string; description: string } {
		return {
			name: this.name,
			description: this.description,
		};
	}
}

/**
 * Data Transfer Object for consent decision requests in OAuth2 flow.
 *
 * Represents a user's approval or denial of a client application's request
 * to access protected resources on their behalf.
 *
 * @class ConsentDecisionDTO
 *
 * @property {('approve' | 'deny')} decision - The user's consent decision
 * @property {string} clientId - The OAuth2 client identifier
 * @property {string} redirectUri - The URI where the authorization code will be sent
 * @property {string} responseType - The OAuth2 response type (e.g., 'code')
 * @property {string} codeChallenge - The PKCE code challenge
 * @property {('S256' | 'plain')} codeChallengeMethod - The PKCE code challenge method
 * @property {string} [state] - Optional state parameter for CSRF protection
 * @property {string} [scope] - Optional space-separated list of requested scopes
 *
 * @example
 * const dto = ConsentDecisionDTO.fromBody({
 *   decision: 'approve',
 *   client_id: 'my-app',
 *   redirect_uri: 'https://app.example.com/callback',
 *   response_type: 'code',
 *   code_challenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
 *   code_challenge_method: 'S256',
 *   state: 'xyz123'
 * });
 *
 * @throws {ValidateRequestError} When decision value is neither 'approve' nor 'deny'
 */

export class ConsentDecisionDTO {
	public readonly decision!: 'approve' | 'deny';
	public readonly clientId!: string;
	public readonly redirectUri!: string;
	public readonly responseType!: string;
	public readonly codeChallenge!: string;
	public readonly codeChallengeMethod!: 'S256' | 'plain';
	public readonly state?: string;
	public readonly scope?: string;

	private constructor(data: ConsentDecisionData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a ConsentDecisionDTO instance from a request body object.
	 *
	 * @param body - The request body containing consent decision data
	 * @returns A new ConsentDecisionDTO instance with validated data
	 * @throws {ValidateRequestError} If the body fails schema validation or contains an invalid decision value
	 * @remarks The decision field must be either 'approve' or 'deny'
	 */

	public static fromBody(body: Record<string, string>): ConsentDecisionDTO {
		const resp = ConsentDecisionSchema.safeParse({ ...body });
		if (!resp.success) {
			const formatted = formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formatted.msg, formatted.errors);
		}

		if (resp.data.decision !== 'approve' && resp.data.decision !== 'deny') {
			throw new ValidateRequestError('Invalid decision value');
		}

		return new ConsentDecisionDTO(resp.data);
	}

	/**
	 * Converts the current authorization request to a CodeRequestDTO.
	 *
	 * Constructs a query parameters object containing required OAuth 2.0 PKCE parameters
	 * (client_id, redirect_uri, response_type, code_challenge, code_challenge_method)
	 * and optionally includes state and scope if they are defined.
	 *
	 * @returns {CodeRequestDTO} A CodeRequestDTO instance created from the constructed query parameters.
	 */
	public toCodeRequest(): CodeRequestDTO {
		const queryParams: Record<string, string> = {
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			response_type: this.responseType,
			code_challenge: this.codeChallenge,
			code_challenge_method: this.codeChallengeMethod,
		};

		if (this.state) {
			queryParams.state = this.state;
		}

		if (this.scope) {
			queryParams.scope = this.scope;
		}

		return CodeRequestDTO.fromQuery(queryParams);
	}
}

/**
 * Data Transfer Object for listing user consents.
 *
 * Represents a response containing a collection of consent records with client information.
 * Transforms consent entities into a serializable format with human-readable client names.
 *
 * @class ListConsentsResponseDTO
 *
 * @example
 * const dto = ListConsentsResponseDTO.fromEntities(consents, clientNameMap);
 * const json = dto.toJSON();
 */
export class ListConsentsResponseDTO {
	public readonly consents!: ConsentData[];

	private constructor(data: { consents: ConsentData[] }) {
		Object.assign(this, data);
	}

	/**
	 * Creates a ListConsentsResponseDTO from an array of ConsentEntity objects.
	 * @param consents - Array of consent entities to transform
	 * @param clientNames - Map of client IDs to their display names
	 * @returns A new ListConsentsResponseDTO containing the transformed consent data
	 */

	public static fromEntities(consents: ConsentEntity[], clientNames: Map<string, string>): ListConsentsResponseDTO {
		const data = consents.map((consent) => ({
			id: consent.id,
			clientId: consent.clientId,
			clientName: clientNames.get(consent.clientId) || 'Unknown Application',
			scopes: consent.scopes,
			grantedAt: consent.grantedAt,
			expiresAt: consent.expiresAt,
		}));

		return new ListConsentsResponseDTO({ consents: data });
	}

	/**
	 * Converts the consent collection to a JSON-serializable object.
	 *
	 * @returns An object containing an array of consent objects with serialized dates.
	 * Each consent object includes the id, clientId, clientName, scopes, grantedAt timestamp,
	 * and an optional expiresAt timestamp. Dates are converted to ISO string format.
	 */

	public toJSON(): { consents: ConsentObject[] } {
		return {
			consents: this.consents.map((consent) => ({
				id: consent.id,
				clientId: consent.clientId,
				clientName: consent.clientName,
				scopes: consent.scopes,
				grantedAt: consent.grantedAt.toISOString(),
				expiresAt: consent.expiresAt ? consent.expiresAt.toISOString() : null,
			})),
		};
	}
}
