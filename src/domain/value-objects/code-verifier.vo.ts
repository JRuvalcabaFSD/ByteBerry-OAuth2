import { ValueObjectError } from '../errors/domain.errors.js';

/**
 * Value Object representing a PKCE code verifier as specified in OAuth 2.0.
 *
 * Ensures the code verifier:
 * - Is not empty or whitespace.
 * - Has a length between 43 and 128 characters.
 * - Contains only base64url characters (A-Z, a-z, 0-9, '-', '_').
 *
 * Use {@link CodeVerifierVO.create} to instantiate and validate a code verifier.
 *
 * @example
 * ```typescript
 * const verifier = CodeVerifierVO.create('a_valid_code_verifier_string');
 * ```
 *
 * @throws ValueObjectError If the code verifier is invalid.
 */

export class CodeVerifierVO {
	private constructor(private readonly value: string) {}

	/**
	 * Creates a new instance of {@link CodeVerifierVO} after validating the provided code verifier string.
	 *
	 * Validates that the input:
	 * - Is not empty or only whitespace.
	 * - Has a length between 43 and 128 characters, inclusive.
	 * - Contains only base64url characters (A-Z, a-z, 0-9, '-', '_').
	 *
	 * @param value - The code verifier string to validate and encapsulate.
	 * @returns A new {@link CodeVerifierVO} instance containing the validated code verifier.
	 * @throws {ValueObjectError} If the input is empty, has an invalid length, or contains invalid characters.
	 */

	public static create(value: string): CodeVerifierVO {
		if (!value || value.trim().length === 0) throw new ValueObjectError('Code verifier cannot be empty');
		if (value.length < 43 || value.length > 128) throw new ValueObjectError('Code verifier must between 43 an 128 characters');
		if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new ValueObjectError('Code verifier must pure base64url encoded');

		return new CodeVerifierVO(value);
	}

	/**
	 * Retrieves the underlying string value of the code verifier.
	 *
	 * @returns The code verifier as a string.
	 */

	public getValue(): string {
		return this.value;
	}
}
