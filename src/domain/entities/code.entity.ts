import { ClientIdVO, CodeChallengeVO } from '@domain';

/**
 * Represents the data structure for an OAuth2 authorization code.
 *
 * @property code - The authorization code issued to the client.
 * @property userId - The unique identifier of the user who authorized the client.
 * @property clientId - The value object representing the client application's identifier.
 * @property redirectUri - The URI to which the response will be sent after authorization.
 * @property codeChallenge - The value object representing the PKCE code challenge.
 * @property expiresAt - The expiration date and time of the authorization code.
 * @property scope - (Optional) The scope of the access request as a space-delimited string.
 * @property state - (Optional) An opaque value used by the client to maintain state between the request and callback.
 */
interface CodeData {
	code: string;
	userId: string;
	clientId: ClientIdVO;
	redirectUri: string;
	codeChallenge: CodeChallengeVO;
	expiresAt: Date;
	scope?: string | null;
	state?: string | null;
}

/**
 * Parameters for creating or updating an AuthCode entity.
 *
 * Extends all properties from `AutCodeData` except `expiresAt`, and adds an optional
 * `expirationMinutes` property to specify the code's validity period in minutes.
 *
 * @property {number | null} [expirationMinutes] - Optional. The number of minutes until the auth code expires.
 */

interface CodeParams extends Omit<CodeData, 'expiresAt'> {
	expiresAt?: Date;
	expirationMinutes?: number | null;
}

/**
 * Represents an OAuth2 Authorization Code entity.
 *
 * This entity encapsulates the properties and behaviors of an authorization code
 * used in the OAuth2 authorization code flow. It tracks its usage, expiration,
 * and validity, and contains all relevant data such as the code itself, associated
 * user and client, redirect URI, code challenge, and optional scope and state.
 *
 * @remarks
 * - The authorization code can only be used once and has a limited lifetime.
 * - Use {@link CodeEntity.create} to instantiate a new authorization code.
 *
 * @property {string} code - The unique authorization code string.
 * @property {string} userId - The identifier of the user who authorized the client.
 * @property {ClientIdVO} clientId - The client application's identifier.
 * @property {string} redirectUri - The redirect URI associated with the code.
 * @property {CodeChallengeVO} codeChallenge - The PKCE code challenge value.
 * @property {Date} expiresAt - The expiration date and time of the code.
 * @property {string | null} [scope] - The optional scope of the authorization.
 * @property {string | null} [state] - The optional state parameter for CSRF protection.
 *
 * @method isUsed - Returns whether the code has already been used.
 * @method isExpired - Returns whether the code has expired.
 * @method markAsUsed - Marks the code as used.
 * @method isValid - Returns whether the code is valid (not used and not expired).
 */

export class CodeEntity {
	private used: boolean = false;

	public readonly code!: string;
	public readonly userId!: string;
	public readonly clientId!: ClientIdVO;
	public readonly redirectUri!: string;
	public readonly codeChallenge!: CodeChallengeVO;
	public readonly expiresAt!: Date;
	public readonly scope?: string | null;
	public readonly state?: string | null;

	/**
	 * Creates a new instance of the class using the provided authentication code data.
	 * This constructor is private and should only be called internally.
	 *
	 * @param data - The data object containing properties to assign to the instance.
	 */

	private constructor(data: CodeData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new instance of `AuthCodeEntity` with the provided parameters.
	 * Sets the expiration date based on the current time plus the specified number of expiration minutes.
	 * If `expirationMinutes` is not provided, defaults to 1 minute.
	 *
	 * @param params - The parameters required to create an `AuthCodeEntity`, including optional `expirationMinutes`.
	 * @returns A new `AuthCodeEntity` instance with the calculated expiration date.
	 */

	public static create(params: CodeParams): CodeEntity {
		let expiresAt: Date;
		if (params.expiresAt) {
			expiresAt = params.expiresAt;
		} else {
			expiresAt = new Date();
			expiresAt.setMinutes(expiresAt.getMinutes() + (params.expirationMinutes || 1));
		}

		return new CodeEntity({ ...params, expiresAt });
	}

	/**
	 * Determines whether the authorization code has already been used.
	 *
	 * @returns {boolean} `true` if the code has been used; otherwise, `false`.
	 */

	public isUsed(): boolean {
		return this.used;
	}

	/**
	 * Determines whether the authorization code has expired.
	 *
	 * @returns {boolean} `true` if the current date and time is after the expiration date (`expiresAt`); otherwise, `false`.
	 */

	public isExpired(): boolean {
		return new Date() > this.expiresAt;
	}

	/**
	 * Marks the authorization code as used.
	 *
	 * This method sets the `used` property to `true`, indicating that the authorization code
	 * has already been consumed and should not be reused.
	 */

	public markAsUsed(): void {
		this.used = true;
	}

	/**
	 * Determines whether the authorization code is valid.
	 *
	 * A code is considered valid if it has not been used and has not expired.
	 *
	 * @returns {boolean} `true` if the code is unused and unexpired; otherwise, `false`.
	 */

	public isValid(): boolean {
		return !this.isUsed() && !this.isExpired();
	}
}
