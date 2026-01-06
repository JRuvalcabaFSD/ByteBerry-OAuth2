import { JwtPayload } from 'jsonwebtoken';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		JwtService: IJwtService;
	}
}

/**
 * Represents the payload structure of a JWT (JSON Web Token) used for authentication and authorization.
 *
 * @property sub - The subject identifier for the token (usually the user ID).
 * @property email - The email address associated with the subject.
 * @property username - The username of the subject.
 * @property roles - An array of roles assigned to the subject.
 * @property scope - The scope of access granted by the token.
 * @property client_id - The client identifier for which the token was issued.
 * @property iat - Issued at time (as a UNIX timestamp).
 * @property exp - Expiration time (as a UNIX timestamp).
 * @property iss - The issuer of the token.
 * @property aud - The intended audience for the token.
 */

export interface IJwtPayload {
	sub: string;
	email: string;
	username?: string | null;
	roles: string[];
	scope: string;
	client_id: string;
	iat: number;
	exp: number;
	iss: string;
	aud: string;
}

/**
 * Interface for JWT (JSON Web Token) service operations.
 *
 * Provides methods to generate, verify, and decode JWT tokens.
 *
 * @interface IJwtService
 *
 * @method generateAccessToken - Generates a JWT access token with the given payload.
 * @param payload - The payload to include in the JWT token, excluding standard claims.
 * @returns A signed JWT access token as a string.
 *
 * @example
 * const token = jwtService.generateAccessToken({
 * 	sub: 'user123',
 * 	email: 'user@example.com',
 * 	username: 'user123',
 * 	roles: ['user'],
 * 	scope: 'read:messages',
 * 	client_id: 'client123'
 * });
 *
 * @method verifyToken - Verifies the validity of a given JWT token.
 * @param token - The JWT token to verify.
 * @param expectedAudience - The expected audience claim to validate against.
 * @returns The decoded JWT payload if the token is valid.
 *
 * @example
 * try {
 * const payload = jwtService.verifyToken(token);
 * console.log('Token is valid:', payload);
 * } catch (error) {
 * console.error('Invalid token:', error);
 * }
 *
 * @method decodeToken - Decodes a JWT token without verifying its signature.
 * @param token - The JWT token to decode.
 * @returns The decoded JWT payload or null if decoding fails.
 *
 * @example
 * const payload = jwtService.decodeToken(token);
 * if (payload) {
 * 	console.log('Decoded payload:', payload);
 * } else {
 * 	console.log('Failed to decode token.');
 * }
 */
export interface IJwtService {
	generateAccessToken(payload: Omit<IJwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string;
	verifyToken(token: string, expectedAudience: string): JwtPayload;
	decodeToken(token: string): JwtPayload | null;
}
