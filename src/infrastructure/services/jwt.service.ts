import jwt, { JwtPayload } from 'jsonwebtoken';

import type { IConfig, IJwtPayload, IJwtService, IKeyLoader, ILogger } from '@interfaces';
import { getErrMessage, Injectable, InvalidTokenError, LogContextClass } from '@shared';

/**
 * Service responsible for JWT (JSON Web Token) operations including generation, verification, and decoding.
 *
 * This service uses RS256 algorithm for token signing and verification, requiring both private and public keys.
 * It handles access token generation with configurable expiration times and validates tokens against expected
 * issuers and audiences.
 *
 * @remarks
 * - Uses RSA key pair (RS256 algorithm) for cryptographic operations
 * - Supports multiple audiences for token validation
 * - Includes comprehensive logging for security auditing
 * - Throws {@link InvalidTokenError} for token validation failures
 *
 * @example
 * ```typescript
 * const jwtService = new JwtService(config, keyLoader, logger);
 *
 * // Generate an access token
 * const token = jwtService.generateAccessToken({
 *   sub: 'user123',
 *   email: 'user@example.com',
 *   client_id: 'client123',
 *   scope: ['read', 'write']
 * });
 *
 * // Verify a token
 * const payload = jwtService.verifyToken(token, 'expected-audience');
 * ```
 */

@LogContextClass()
@Injectable({ name: 'JwtService', depends: ['Config', 'KeyLoader', 'Logger'] })
export class JwtService implements IJwtService {
	private readonly privateKey: string;
	private readonly publicKey: string;
	private readonly issuer: string;
	private readonly audience: string[];
	private readonly accessTokenExpiration: number;
	private readonly algorithm = 'RS256';

	constructor(
		config: IConfig,
		keyLoader: IKeyLoader,
		private readonly logger: ILogger
	) {
		this.privateKey = keyLoader.getPrivateKey();
		this.publicKey = keyLoader.getPublicKey();
		this.issuer = config.jwtIssuer;
		this.audience = config.jwtAudience;
		this.accessTokenExpiration = config.jwtAccessTokenExpiresIn;
	}
	/**
	 * Generates a JWT access token with the provided payload.
	 *
	 * @param payload - The token payload excluding system-generated fields (iat, exp, iss, aud).
	 *                  Must include user identification and authorization details.
	 * @returns A signed JWT access token as a string.
	 *
	 * @throws {Error} Throws an error if token generation fails during the signing process.
	 *
	 * @remarks
	 * The method automatically adds the following fields to the payload:
	 * - `iss` (issuer): Configured issuer identifier
	 * - `aud` (audience): Configured audience identifier
	 * - `iat` (issued at): Current timestamp in seconds
	 * - `exp` (expiration): Calculated from current time + configured access token expiration
	 *
	 * The token is signed using the configured private key and algorithm.
	 * All operations are logged for debugging and error tracking purposes.
	 */

	public generateAccessToken(payload: Omit<IJwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
		try {
			const now = Math.floor(Date.now() / 1000);

			// Generate the payload
			const completePayload: JwtPayload = {
				...payload,
				iss: this.issuer,
				aud: this.audience,
				iat: now,
				exp: now + this.accessTokenExpiration,
			};

			// Create and return the token
			const token = jwt.sign(completePayload, this.privateKey, { algorithm: this.algorithm });

			this.logger.debug('Access token generated', {
				sub: payload.sub,
				email: payload.email,
				client_id: payload.client_id,
				scope: payload.scope,
				expiresIn: this.accessTokenExpiration,
			});

			return token;
		} catch (error) {
			this.logger.error('Failed to generate JWT access token', { error: getErrMessage(error), sub: payload.sub });
			throw error;
		}
	}

	/**
	 * Verifies a JWT token and validates its signature, issuer, and audience.
	 *
	 * @param token - The JWT token string to verify
	 * @param expectedAudience - The expected audience claim value to validate against
	 * @returns The decoded JWT payload if verification succeeds
	 * @throws {InvalidTokenError} If the token is expired, has an invalid signature/format,
	 *                             contains an audience mismatch, or verification fails for any other reason
	 *
	 * @remarks
	 * This method performs the following validations:
	 * - Verifies the token signature using the configured public key and algorithm
	 * - Validates the issuer matches the configured issuer
	 * - Validates the audience claim matches the expected audience (if provided)
	 * - Ensures the decoded token is a valid JWT object (not a string)
	 */

	public verifyToken(token: string, expectedAudience: string): JwtPayload {
		try {
			const decoded = jwt.verify(token, this.publicKey, { algorithms: [this.algorithm], issuer: this.issuer });

			if (typeof decoded === 'string') throw new InvalidTokenError('The decoded token is a string, not a valid JWT object');
			if (expectedAudience) {
				const isValidAudience = this.validateAudience(decoded.aud, expectedAudience);

				if (!isValidAudience)
					throw new InvalidTokenError(`Token audience mismatch. Expected: ${expectedAudience}, Got: ${JSON.stringify(decoded.aud)}`);
			}

			this.logger.debug('JWT token verified successfully', { sub: decoded.sub });

			return decoded;
		} catch (error) {
			this.logger.warn('JWT token verification failed', { error: getErrMessage(error) });

			if (error instanceof jwt.TokenExpiredError) throw new InvalidTokenError('Token has expired');
			if (error instanceof jwt.JsonWebTokenError) throw new InvalidTokenError('Invalid token signature or format');
			throw new InvalidTokenError('Token verification failed');
		}
	}

	/**
	 * Decodes a JWT token without verification.
	 *
	 * This method extracts the payload from a JWT token without validating its signature.
	 * Use this when you need to read token claims but don't need to verify authenticity.
	 *
	 * @param token - The JWT token string to decode
	 * @returns The decoded JWT payload if successful, or null if decoding fails
	 *
	 * @remarks
	 * - Does not verify the token's signature or expiration
	 * - Logs warnings and debug information during the decoding process
	 * - Returns null if the token is invalid, malformed, or decodes to a string
	 *
	 * @example
	 * ```typescript
	 * const payload = jwtService.decodeToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
	 * if (payload) {
	 *   console.log(payload.sub);
	 * }
	 * ```
	 */

	public decodeToken(token: string): JwtPayload | null {
		this.logger.warn('Decoding JWT token without verification');

		try {
			const decoded = jwt.decode(token);

			if (!decoded || typeof decoded === 'string') {
				this.logger.warn('JWT token decoding failed');
				return null;
			}

			this.logger.debug('JWT token decoded successfully', { sub: (decoded as IJwtPayload).sub });

			return decoded as JwtPayload;
		} catch (error) {
			this.logger.warn('JWT token decoding failed', { error: getErrMessage(error) });
			return null;
		}
	}

	private validateAudience(aud: string | string[] | undefined, expectedAudience: string): boolean {
		if (typeof aud === 'string') {
			return aud === expectedAudience;
		}

		if (Array.isArray(aud)) {
			return aud.includes(expectedAudience);
		}

		return false;
	}
}
