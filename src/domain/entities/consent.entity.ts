interface ConsentData {
	id: string;
	userId: string;
	clientId: string;
	scopes: string[];
	grantedAt: Date;
	expiresAt?: Date | null;
	revokedAt?: Date | null;
}

/**
 * Represents a consent record for OAuth2 authorization.
 *
 * This entity manages user consent grants for OAuth2 clients, including scope
 * permissions, expiration, and revocation tracking.
 *
 * @example
 * ```typescript
 * const consent = ConsentEntity.create({
 *   id: '123',
 *   userId: 'user-456',
 *   clientId: 'client-789',
 *   scopes: ['read:profile', 'write:data'],
 *   grantedAt: new Date(),
 *   expiresAt: new Date(Date.now() + 3600000),
 *   revokedAt: null
 * });
 *
 * if (consent.isActive() && consent.hasAllScopes(['read:profile'])) {
 *   // Consent is valid and has required scopes
 * }
 * ```
 */

export class ConsentEntity {
	public readonly id!: string;
	public readonly userId!: string;
	public readonly clientId!: string;
	public readonly scopes!: string[];
	public readonly grantedAt!: Date;
	public readonly expiresAt!: Date | null;
	public readonly revokedAt!: Date | null;

	private constructor(data: ConsentData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new instance of ConsentEntity from the provided data.
	 * @param data - The consent data used to initialize the entity
	 * @returns A new ConsentEntity instance
	 */

	public static create(data: ConsentData): ConsentEntity {
		return new ConsentEntity(data);
	}

	/**
	 * Checks if the consent is currently active.
	 * A consent is considered active if it has not been revoked and has not expired.
	 * @returns {boolean} True if the consent is active, false otherwise.
	 */

	public isActive(): boolean {
		return !this.isRevoked() && !this.isExpired();
	}

	/**
	 * Checks if the consent has been revoked.
	 * @returns {boolean} True if the consent has been revoked, false otherwise.
	 */

	public isRevoked(): boolean {
		return this.revokedAt !== null;
	}

	/**
	 * Determines whether the consent has expired.
	 * @returns {boolean} `true` if the consent has an expiration date and the current date is past that date; `false` if the consent never expires or the expiration date has not been reached.
	 */

	public isExpired(): boolean {
		if (this.expiresAt === null) {
			return false;
		}
		return new Date() > this.expiresAt;
	}

	/**
	 * Checks if the consent includes the specified scope.
	 * @param scope - The scope to check for in the consent
	 * @returns True if the scope is included in the consent, false otherwise
	 */

	public hasScope(scope: string): boolean {
		return this.scopes.includes(scope);
	}

	/**
	 * Checks whether the consent has all of the requested scopes.
	 * @param requestedScopes - The scopes to check for.
	 * @returns `true` if all requested scopes are included in the consent scopes, `false` otherwise.
	 */

	public hasAllScopes(requestedScopes: string[]): boolean {
		return requestedScopes.every((scope) => this.scopes.includes(scope));
	}

	/**
	 * Converts the consent entity to a plain object representation.
	 *
	 * @returns An object containing the consent data with optional `expiresAt` and `revokedAt` fields.
	 * The returned object includes the consent ID, user ID, client ID, granted scopes, and grant timestamp.
	 * The `expiresAt` and `revokedAt` dates are only included if they are defined on the entity.
	 */

	public toObject(): Omit<ConsentData, 'expiresAt' | 'revokedAt'> & {
		expiresAt?: Date;
		revokedAt?: Date;
	} {
		return {
			id: this.id,
			userId: this.userId,
			clientId: this.clientId,
			scopes: this.scopes,
			grantedAt: this.grantedAt,
			...(this.expiresAt && { expiresAt: this.expiresAt }),
			...(this.revokedAt && { revokedAt: this.revokedAt }),
		};
	}
}
