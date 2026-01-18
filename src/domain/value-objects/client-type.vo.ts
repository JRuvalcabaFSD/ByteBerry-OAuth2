import { ValueObjectError } from '../errors/domain.errors.js';

/**
 * Value Object representing the type of OAuth2 client.
 *
 * This class encapsulates the allowed client types: `SYSTEM` and `THIRD_PARTY`.
 * It provides factory methods for each type, as well as validation and comparison utilities.
 *
 * Usage:
 * - Use `ClientTypeVO.system()` to create a SYSTEM client type.
 * - Use `ClientTypeVO.thirdParty()` to create a THIRD_PARTY client type.
 * - Use `ClientTypeVO.fromString(value)` to create a client type from a string, with validation.
 *
 * Methods:
 * - `isSystem()`: Checks if the client type is SYSTEM.
 * - `isThirdParty()`: Checks if the client type is THIRD_PARTY.
 * - `equals(other: string)`: Compares the client type to another string value.
 * - `getValue()`: Returns the string value of the client type.
 *
 * Throws:
 * - `ValueObjectError` if an invalid or empty client type is provided.
 */

export class ClientTypeVO {
	private static readonly SYSTEM_VALUE = 'SYSTEM';
	private static readonly THIRD_PARTY_VALUE = 'THIRD_PARTY';

	private constructor(private readonly value: string) {
		this.validate(value);
	}

	/**
	 * Creates a new instance of `ClientTypeVO` representing a system client type.
	 *
	 * @returns {ClientTypeVO} A value object for the system client type.
	 */

	public static system(): ClientTypeVO {
		return new ClientTypeVO(ClientTypeVO.SYSTEM_VALUE);
	}

	/**
	 * Creates a new instance of `ClientTypeVO` representing a third-party client type.
	 *
	 * @returns {ClientTypeVO} An instance of `ClientTypeVO` with the value set to third-party.
	 */

	public static thirdParty(): ClientTypeVO {
		return new ClientTypeVO(ClientTypeVO.THIRD_PARTY_VALUE);
	}

	/**
	 * Creates a new instance of `ClientTypeVO` from a string value.
	 *
	 * The input string is normalized to uppercase and validated against the allowed client types:
	 * - `SYSTEM`
	 * - `THIRD_PARTY`
	 *
	 * @param value - The string representation of the client type.
	 * @returns A new `ClientTypeVO` instance corresponding to the provided value.
	 * @throws {ValueObjectError} If the provided value is not a valid client type.
	 */

	public static fromString(value: string): ClientTypeVO {
		const normalize = value.toUpperCase();

		if (normalize !== ClientTypeVO.SYSTEM_VALUE && normalize !== ClientTypeVO.THIRD_PARTY_VALUE)
			throw new ValueObjectError(`Invalid client type: ${value}. Must be SYSTEM or THIRD_PARTY`);

		return new ClientTypeVO(normalize);
	}

	/**
	 * Determines if the client type is set to "system".
	 *
	 * @returns {boolean} `true` if the client type is "system"; otherwise, `false`.
	 */

	public isSystem(): boolean {
		return this.value === ClientTypeVO.SYSTEM_VALUE;
	}

	/**
	 * Determines whether the client type is considered a third-party client.
	 *
	 * @returns {boolean} `true` if the client type is third-party; otherwise, `false`.
	 */

	public isThirdParty(): boolean {
		return this.value === ClientTypeVO.THIRD_PARTY_VALUE;
	}

	/**
	 * Determines whether the current value object is equal to the provided string.
	 *
	 * @param other - The string to compare with the current value.
	 * @returns `true` if the current value is equal to the provided string; otherwise, `false`.
	 */

	public equals(other: string): boolean {
		if (!other) return false;
		return this.value === other;
	}

	/**
	 * Retrieves the underlying string value of the client type.
	 *
	 * @returns {string} The value representing the client type.
	 */

	public getValue(): string {
		return this.value;
	}

	/**
	 * Validates the provided client type value.
	 * Throws a {@link ValueObjectError} if the value is empty or consists only of whitespace.
	 *
	 * @param value - The client type string to validate.
	 * @throws ValueObjectError If the value is empty or contains only whitespace.
	 */

	private validate(value: string): void {
		if (!value || value.trim().length === 0) throw new ValueObjectError('Client Type cannot be empty');
	}
}
