import { ValueObjectError } from '../errors/domain.errors.js';

/**
 * Value Object representing a Client ID.
 *
 * Enforces validation rules:
 * - Must be a non-empty string.
 * - Length must be between 3 and 255 characters.
 * - Only alphanumeric characters, hyphens, and underscores are allowed.
 *
 * Use {@link ClientIdVO.create} to instantiate.
 *
 * @example
 * ```typescript
 * const clientId = ClientIdVO.create('my-client_123');
 * ```
 */

export class ClientIdVO {
	private static readonly MIN_LENGTH = 3;
	private static readonly MAX_LENGTH = 255;

	private constructor(private readonly value: string) {
		this.validate(value);
	}

	/**
	 * Creates a new instance of `ClientIdVO` using the provided string value.
	 *
	 * @param value - The client identifier as a string.
	 * @returns A new `ClientIdVO` instance initialized with the given value.
	 */

	public static create(value: string): ClientIdVO {
		return new ClientIdVO(value);
	}

	/**
	 * Returns the underlying string value of the client ID.
	 *
	 * @returns {string} The client ID value.
	 */

	public getValue(): string {
		return this.value;
	}

	equals(other: ClientIdVO): boolean {
		if (!other) return false;
		return this.value === other.value;
	}

	/**
	 * Returns the string representation of the client ID value object.
	 *
	 * @returns {string} The client ID as a string.
	 */

	public toString(): string {
		return this.value;
	}

	/**
	 * Validates the provided client ID string according to the following rules:
	 * - Must not be empty or consist solely of whitespace.
	 * - Must be at least {@link ClientIdVO.MIN_LENGTH} characters long.
	 * - Must not exceed {@link ClientIdVO.MAX_LENGTH} characters.
	 * - Must only contain alphanumeric characters, hyphens, and underscores.
	 *
	 * @param value - The client ID string to validate.
	 * @throws ValueObjectError If the value does not meet any of the validation criteria.
	 */

	public validate(value: string): void {
		if (!value || value.trim().length === 0) throw new ValueObjectError('Client ID cannot be empty');
		if (value.length < ClientIdVO.MIN_LENGTH) throw new ValueObjectError(`Client ID must be at least ${ClientIdVO.MIN_LENGTH} characters`);
		if (value.length > ClientIdVO.MAX_LENGTH) throw new ValueObjectError(`Client ID cannot exceed ${ClientIdVO.MIN_LENGTH} characters`);

		const validPattern = /^[a-zA-Z0-9_-]+$/;
		if (!validPattern.test(value))
			throw new ValueObjectError('ClientId can only contain alphanumeric characters, hyphens, and underscores');
	}
}
