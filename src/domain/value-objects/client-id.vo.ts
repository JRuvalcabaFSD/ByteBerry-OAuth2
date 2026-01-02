import { ValueObjectError } from '@domain';

/**
 * Value object representing a client identifier in the OAuth2 domain.
 *
 * @remarks
 * This class encapsulates a client ID string with validation rules ensuring:
 * - The value is not empty or whitespace-only
 * - The length is between 8 and 128 characters
 *
 * The class follows the value object pattern with immutability and equality comparison.
 *
 * @example
 * ```typescript
 * const clientId = ClientIdVO.create('my-client-id-123');
 * console.log(clientId.getValue()); // 'my-client-id-123'
 * ```
 *
 * @throws {Error} When the client ID is empty or whitespace-only
 * @throws {Error} When the client ID length is not between 8 and 128 characters
 */

export class ClientIdVO {
	/**
	 * Creates a new instance of the value object.
	 * This constructor is private to enforce the use of factory methods for object creation.
	 *
	 * @param value - The string value to be encapsulated by this value object
	 * @private
	 */

	private constructor(private readonly value: string) {}

	/**
	 * Creates a new instance of `ClientIdVO` after validating the provided client ID string.
	 *
	 * @param value - The client ID string to validate and encapsulate.
	 * @returns A new `ClientIdVO` instance containing the validated client ID.
	 * @throws {ValueObjectError} If the client ID is empty, or its length is not between 8 and 128 characters.
	 */

	static create(value: string): ClientIdVO {
		if (!value || value.trim().length === 0) throw new ValueObjectError('Client ID cannot be empty');
		if (value.length < 8 || value.length > 128) throw new ValueObjectError('Client ID must be between 8 and 128 characters');
		return new ClientIdVO(value);
	}

	/**
	 * Retrieves the client identifier value.
	 *
	 * @returns The string representation of the client ID.
	 */

	public getValue(): string {
		return this.value;
	}

	/**
	 * Compares this ClientId with another ClientId for equality.
	 *
	 * @param other - The ClientId instance to compare with
	 * @returns `true` if both ClientId instances have the same value, `false` otherwise
	 */

	public equals(other: ClientIdVO): boolean {
		return this.value === other.value;
	}
}
