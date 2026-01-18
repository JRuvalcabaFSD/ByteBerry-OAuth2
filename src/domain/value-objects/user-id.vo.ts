import { ValueObjectError } from '../errors/domain.errors.js';

/**
 * Value Object representing a User ID in UUID v4 format.
 *
 * Ensures that the provided value is a valid, non-empty UUID string.
 * Provides utility methods for creation, comparison, and value retrieval.
 *
 * @example
 * const userId = UserIdVO.create('123e4567-e89b-12d3-a456-426614174000');
 * console.log(userId.getValue()); // '123e4567-e89b-12d3-a456-426614174000'
 *
 * @remarks
 * Use {@link UserIdVO.createNullable} to handle nullable or undefined values safely.
 *
 * @throws ValueObjectError If the value is empty or not a valid UUID v4 string.
 */

export class UserIdVO {
	private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	private constructor(private readonly value: string) {
		this.validate(value);
	}

	/**
	 * Creates a new instance of the UserIdVO value object.
	 *
	 * @param value - The string representation of the user ID.
	 * @returns A new UserIdVO instance containing the provided user ID value.
	 */

	public static create(value: string): UserIdVO {
		return new UserIdVO(value);
	}

	/**
	 * Creates a new instance of `UserIdVO` if the provided value is a non-empty string.
	 * Returns `null` if the value is `null`, `undefined`, or an empty string.
	 *
	 * @param value - The string value to wrap in a `UserIdVO`, or `null`/`undefined`.
	 * @returns A new `UserIdVO` instance if `value` is a non-empty string; otherwise, `null`.
	 */

	static createNullable(value: string | null | undefined): UserIdVO | null {
		if (!value) return null;
		return new UserIdVO(value);
	}

	/**
	 * Retrieves the underlying string value of the user ID value object.
	 *
	 * @returns The string representation of the user ID.
	 */

	public getValue(): string {
		return this.value;
	}

	/**
	 * Determines whether the current UserIdVO instance is equal to another UserIdVO instance.
	 *
	 * @param other - The other UserIdVO instance to compare with, or null.
	 * @returns True if both instances have the same value; otherwise, false.
	 */

	public equals(other: UserIdVO | null): boolean {
		if (!other) return false;
		return this.value === other.value;
	}

	/**
	 * Returns the string representation of the user ID value object.
	 *
	 * @returns {string} The user ID as a string.
	 */

	public toString(): string {
		return this.value;
	}

	/**
	 * Validates the provided user ID value.
	 *
	 * @param value - The user ID string to validate.
	 * @throws ValueObjectError If the value is empty or not a valid UUID format.
	 */

	private validate(value: string): void {
		if (!value || value.trim().length === 0) throw new ValueObjectError('UserId cannot be empty');
		if (!UserIdVO.UUID_REGEX.test(value)) throw new ValueObjectError(`Invalid UserId format: ${value}. Must be a valid UUID`);
	}
}
