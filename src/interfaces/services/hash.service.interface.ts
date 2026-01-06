//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		HashService: IHashService;
	}
}

/**
 * Interface for a service that provides hashing-related operations.
 *
 * @remarks
 * This interface defines a contract for verifying if a given value matches a provided SHA-256 hash.
 *
 * @method verifySha256
 * Verifies whether the provided value, when hashed using SHA-256, matches the given hash.
 *
 * @param value - The plain text string to verify.
 * @param hash - The SHA-256 hash to compare against.
 * @returns `true` if the value matches the hash; otherwise, `false`.
 *
 * @method hashPassword
 * Hashes a password using a secure hashing algorithm.
 *
 * @param password - The plain text password to hash.
 * @returns A promise that resolves to the hashed password string.
 *
 * @method verifyPassword
 * Verifies whether a plain text password matches a previously hashed password.
 *
 * @param password - The plain text password to verify.
 * @param hashedPassword - The hashed password to compare against.
 * @returns A promise that resolves to `true` if the password matches the hashed password; otherwise, `false`.
 */

export interface IHashService {
	verifySha256(value: string, hash: string): boolean;
	hashPassword(password: string): Promise<string>;
	verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
}
