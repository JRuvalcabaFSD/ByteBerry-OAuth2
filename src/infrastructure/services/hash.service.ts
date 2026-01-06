import { compare, hash } from 'bcrypt';
import { createHash } from 'crypto';

import type { IConfig, IHashService } from '@interfaces';
import { Injectable } from '@shared';

/**
 * Service for hashing and verifying values using SHA-256 and bcrypt algorithms.
 *
 * Implements the `IHashService` interface, providing methods for:
 * - Verifying a value against a SHA-256 hash.
 * - Hashing passwords using bcrypt.
 * - Verifying passwords against bcrypt hashes.
 *
 * @remarks
 * - SHA-256 verification uses base64url encoding for the hash comparison.
 * - Bcrypt hashing rounds can be configured via the constructor.
 *
 * @example
 * ```typescript
 * const hashService = new NodeHashService(12);
 * const hash = await hashService.hashPassword('myPassword');
 * const isValid = await hashService.verifyPassword('myPassword', hash);
 * ```
 */

@Injectable({ name: 'HashService', depends: ['Config'] })
export class NodeHashService implements IHashService {
	private readonly BCRYPT_ROUNDS: number;

	constructor(config: IConfig) {
		this.BCRYPT_ROUNDS = config.bcryptRounds ?? 10;
	}

	/**
	 * Verifies if a given value matches a SHA-256 hash.
	 *
	 * @param value - The plain text value to be hashed and verified
	 * @param hash - The base64url-encoded SHA-256 hash to compare against
	 * @returns `true` if the computed hash of the value matches the provided hash, `false` otherwise
	 *
	 * @example
	 * ```typescript
	 * const isValid = hashService.verifySha256('myPlainText', 'expectedHashValue');
	 * console.log(isValid); // true or false
	 * ```
	 */

	public verifySha256(value: string, hash: string): boolean {
		const computed = createHash('sha256').update(value).digest('base64url');
		return computed === hash;
	}

	/**
	 * Hashes a password using bcrypt algorithm.
	 *
	 * @param password - The plain text password to be hashed
	 * @returns A promise that resolves to the hashed password string
	 * @throws {Error} If the hashing operation fails
	 *
	 * @example
	 * ```typescript
	 * const hashedPassword = await hashPassword('mySecurePassword123');
	 * ```
	 */

	public async hashPassword(password: string): Promise<string> {
		return hash(password, this.BCRYPT_ROUNDS);
	}

	/**
	 * Verifies if a plain text password matches a hashed password.
	 *
	 * @param password - The plain text password to verify
	 * @param hashedPassword - The hashed password to compare against
	 * @returns A Promise that resolves to `true` if the password matches the hash, `false` otherwise
	 *
	 * @remarks
	 * This method uses bcrypt's compare function to safely verify passwords.
	 * If an error occurs during comparison, it returns `false` instead of throwing.
	 *
	 * @example
	 * ```typescript
	 * const isValid = await hashService.verifyPassword('myPassword123', hashedPwd);
	 * if (isValid) {
	 *   console.log('Password is correct');
	 * }
	 * ```
	 */

	public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
		try {
			return await compare(password, hashedPassword);
		} catch {
			return false;
		}
	}
}
