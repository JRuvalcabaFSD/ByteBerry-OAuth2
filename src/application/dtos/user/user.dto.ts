import { UserEntity } from '@domain';
import { ValidateRequestError } from '@shared';
import {
	formattedZodError,
	RegisterUserRequestData,
	UpdatePasswordRequestData,
	UpdatePasswordSchema,
	UpdateUserRequestData,
	UpdateUserSchema,
	UserRegisterSchema,
} from '@application';

/**
 * Represents a user in the system.
 *
 * @interface User
 * @property {string} id - The unique identifier of the user.
 * @property {string} email - The email address of the user.
 * @property {string | null} username - The username of the user. May be null if not set.
 * @property {string | null} fullName - The full name of the user. May be null if not provided.
 * @property {string[]} roles - An array of role identifiers assigned to the user.
 * @property {boolean} isActive - Indicates whether the user account is currently active.
 * @property {boolean} emailVerified - Indicates whether the user's email address has been verified.
 * @property {Date} createdAt - The timestamp when the user account was created.
 * @property {Date} updatedAt - The timestamp when the user account was last updated.
 */

interface User {
	id: string;
	email: string;
	username: string | null;
	fullName: string | null;
	roles: string[];
	isActive: boolean;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Represents the response data structure for the "me" user endpoint.
 * @property user - The user data associated with the current authenticated user.
 */

interface UserData {
	user: User;
}

/**
 * Represents a user object with string-formatted creation and update timestamps.
 *
 * This interface extends the `User` type, omitting the `createdAt` and `updatedAt` properties,
 * and redefines them as strings (typically ISO date strings).
 *
 * @remarks
 * Useful for scenarios where date fields need to be serialized or formatted as strings,
 * such as API responses.
 *
 * @see User
 *
 * @property {string} createdAt - The ISO string representation of the user's creation date.
 * @property {string} updatedAt - The ISO string representation of the user's last update date.
 */

interface UserObject extends Omit<User, 'createdAt' | 'updatedAt'> {
	createdAt: string;
	updatedAt: string;
}

/**
 * Represents the response data for a user registration operation.
 *
 * @remarks
 * This interface extends the base UserData interface and adds a message property
 * to provide feedback about the registration process.
 *
 * @extends UserData
 *
 * @property {string} message - A message describing the result of the registration operation
 *
 * @example
 * ```typescript
 * const response: RegisterUserResponseData = {
 *   id: '123',
 *   email: 'user@example.com',
 *   message: 'User registered successfully'
 * };
 * ```
 */

interface RegisterUserResponseData extends UserData {
	message: string;
}

/**
 * Data Transfer Object for user response data.
 *
 * Encapsulates user information in a standardized format for API responses.
 * Provides methods to create instances from domain entities and serialize
 * the data to JSON format with proper date formatting.
 *
 * @remarks
 * This DTO ensures a consistent response structure for user-related endpoints
 * and handles the conversion of Date objects to ISO string format for JSON serialization.
 *
 * @example
 * ```typescript
 * const userEntity = new UserEntity({ ... });
 * const userDto = UserResponseDTO.fromEntity(userEntity);
 * const jsonResponse = userDto.toJSON();
 * ```
 */

export class UserResponseDTO {
	public readonly user!: User;

	private constructor(data: UserData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new instance of `UserMeResponseDTO` from a given `UserEntity`.
	 * Maps the public properties of the user entity and includes additional fields
	 * such as `isActive`, `emailVerified`, and `createdAt`.
	 *
	 * @param user - The user entity to convert.
	 * @returns A new `UserMeResponseDTO` instance populated with user data.
	 */

	public static fromEntity(user: UserEntity): UserResponseDTO {
		return new UserResponseDTO({
			user: {
				...user.toPublic(),
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
		});
	}

	/**
	 * Serializes the user data to a JSON-compatible object, converting the `createdAt` property
	 * to an ISO string format.
	 *
	 * @returns An object containing the user data, with `createdAt` as a string.
	 */

	public toJSON(): { user: Omit<User, 'createdAt'> & { createdAt: string } } {
		return {
			user: {
				...this.user,
				createdAt: this.user.createdAt.toISOString(),
			},
		};
	}
}

/**
 * Data Transfer Object for user registration requests.
 *
 * This DTO encapsulates and validates the data required to register a new user,
 * including email, username, password, full name, and optional IP address.
 *
 * Use the static `fromBody` method to create an instance from a request body,
 * which performs validation and throws a `ValidateRequestError` if any field is invalid.
 *
 * @remarks
 * - The `email` and `password` fields are required.
 * - The `username` and `fullName` fields are optional, but have length and format constraints.
 * - The `ipAddress` field is optional and typically set from the request context.
 *
 * @example
 * ```typescript
 * const dto = RegisterRequestDTO.fromBody(req.body, req.ip);
 * ```
 */

export class RegisterUserRequestDTO {
	public readonly email!: string;
	public readonly username!: string;
	public readonly password!: string;
	public readonly fullName?: string;
	public readonly ipAddress?: string;

	private constructor(data: RegisterUserRequestData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new instance of `RegisterRequestDTO` from the provided request body.
	 *
	 * Validates the input fields (`email`, `password`, `username`, and `fullName`) and throws a `ValidateRequestError`
	 * if any validation fails. The method ensures that required fields are present and conform to expected formats and lengths.
	 *
	 * @param body - The request body containing user registration data as key-value pairs.
	 * @param ip - (Optional) The IP address of the user making the request.
	 * @returns A new `RegisterRequestDTO` instance populated with validated and sanitized data.
	 * @throws {ValidateRequestError} If required fields are missing or validation fails for any field.
	 */

	public static fromBody(body: Record<string, string>, ip?: string): RegisterUserRequestDTO {
		const resp = UserRegisterSchema.safeParse({ ...body, ip });

		if (!resp.success) {
			const formatted = formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formatted.msg, formatted.errors);
		}

		return new RegisterUserRequestDTO(resp.data);
	}

	private static isValidUsername(username: string): boolean {
		const usernameRegex = /^[a-zA-Z0-9_-]+$/;
		return usernameRegex.test(username);
	}

	private static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
}

/**
 * Data Transfer Object representing the response after a user registration.
 *
 * @remarks
 * This DTO encapsulates the registered user's public information and a message indicating the registration status.
 * It provides a static factory method to create an instance from a `UserEntity` and a method to serialize the response to JSON,
 * ensuring the `createdAt` property is formatted as an ISO string.
 *
 * @property user - The public representation of the registered user.
 * @property message - A message describing the registration result.
 *
 * @method fromEntity - Creates a `RegisterUserResponseDTO` from a `UserEntity`.
 * @method toJSON - Serializes the DTO to a JSON object, formatting `createdAt` as an ISO string.
 */

export class RegisterUserResponseDTO {
	public readonly user!: User;
	public readonly message!: string;

	private constructor(data: RegisterUserResponseData) {
		Object.assign(this, { ...data, message: data.message ?? 'User registered successfully' });
	}

	/**
	 * Creates a new instance of `RegisterUserResponseDTO` from a given `UserEntity`.
	 *
	 * This method extracts public user information using `toPublic()`, and includes
	 * additional properties such as `isActive`, `emailVerified`, and `createdAt`.
	 * It also sets a default success message.
	 *
	 * @param user - The `UserEntity` instance to convert.
	 * @returns A `RegisterUserResponseDTO` containing the user's public data and a success message.
	 */

	public static fromEntity(user: UserEntity): RegisterUserResponseDTO {
		return new RegisterUserResponseDTO({
			user: {
				...user.toPublic(),
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
			message: 'User registered successfully',
		});
	}

	/**
	 * Converts the current instance to a JSON-serializable object.
	 *
	 * @returns An object containing the user data with the `createdAt` property as an ISO string,
	 *          and a message string.
	 *
	 * The returned `user` object omits the original `createdAt` property (as a Date)
	 * and replaces it with its ISO string representation.
	 */

	public toJSON(): { user: Omit<User, 'createdAt'> & { createdAt: string }; message: string } {
		return {
			user: {
				...this.user,
				createdAt: this.user.createdAt.toISOString(),
			},
			message: this.message,
		};
	}
}

/**
 * Data Transfer Object for updating user information.
 *
 * This DTO validates and structures user update requests, ensuring that only
 * valid data is processed. It supports partial updates where both `fullName`
 * and `username` are optional.
 *
 * @remarks
 * - Uses Zod schema validation through `UpdateUserSchema`
 * - Throws `ValidateRequestError` when validation fails
 * - Immutable properties ensure data integrity
 *
 * @example
 * ```typescript
 * const updateDto = UpdateUserRequestDTO.fromBody({
 *   fullName: "John Doe",
 *   username: "johndoe"
 * });
 * ```
 */

export class UpdateUserRequestDTO {
	public readonly fullName?: string | null;
	public readonly username?: string | null;

	private constructor(data: UpdateUserRequestData) {
		Object.assign(this, data);
	}

	/**
	 * Creates an UpdateUserRequestDTO instance from a request body object.
	 *
	 * @param body - The request body containing user update data as key-value pairs
	 * @returns A new instance of UpdateUserRequestDTO with validated data
	 * @throws {ValidateRequestError} When the body fails validation against UpdateUserSchema
	 *
	 * @remarks
	 * This method validates the input body against the UpdateUserSchema using Zod's safeParse.
	 * If validation fails, errors are formatted and thrown as a ValidateRequestError.
	 */

	public static fromBody(body: Record<string, string>): UpdateUserRequestDTO {
		const resp = UpdateUserSchema.safeParse(body);

		if (!resp.success) {
			const formatted = formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formatted.msg, formatted.errors);
		}

		return new UpdateUserRequestDTO(resp.data);
	}
}

/**
 * Data Transfer Object for update user response.
 *
 * @remarks
 * This DTO encapsulates the user data returned after an update operation.
 * It provides methods to convert from a UserEntity to a response format
 * and to serialize the data to JSON with ISO string dates.
 *
 * @example
 * ```typescript
 * const responseDTO = UpdateUserResponseDTO.fromEntity(userEntity);
 * const jsonResponse = responseDTO.toJSON();
 * ```
 */

export class UpdateUserResponseDTO {
	public readonly user!: User;

	private constructor(data: UserData) {
		Object.assign(this, data);
	}

	/**
	 * Creates an UpdateUserResponseDTO instance from a UserEntity.
	 *
	 * @param user - The UserEntity instance to convert to a DTO
	 * @returns A new UpdateUserResponseDTO instance containing the user's public data along with creation and update timestamps
	 *
	 * @remarks
	 * This method transforms a domain entity into a data transfer object suitable for API responses.
	 * It includes all public user properties and adds the createdAt and updatedAt timestamps.
	 */

	public static fromEntity(user: UserEntity): UpdateUserResponseDTO {
		return new UpdateUserResponseDTO({
			user: {
				...user.toPublic(),
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
		});
	}

	/**
	 * Converts the user DTO to a JSON-serializable object.
	 *
	 * @returns An object containing the user data with ISO string formatted dates.
	 * The returned object has a `user` property with all user fields, where
	 * `createdAt` and `updatedAt` are converted to ISO 8601 string format.
	 */

	public toJSON(): { user: UserObject } {
		return {
			user: {
				...this.user,
				createdAt: this.user.createdAt.toISOString(),
				updatedAt: this.user.updatedAt.toISOString(),
			},
		};
	}
}

/**
 * Data Transfer Object for updating a user's password.
 *
 * This DTO encapsulates the data required to update a user's password,
 * including the current password for verification, the new password to set,
 * and an optional flag to revoke all active sessions.
 *
 * @remarks
 * This class uses a private constructor to enforce creation through the
 * static factory method `fromBody`, which validates the input data against
 * the UpdatePasswordSchema before instantiation.
 *
 * @example
 * ```typescript
 * const updatePasswordDTO = UpdatePasswordRequestDTO.fromBody({
 *   currentPassword: 'oldPassword123',
 *   newPassword: 'newSecurePassword456',
 *   revokeAllSessions: true
 * });
 * ```
 */

export class UpdatePasswordRequestDTO {
	public readonly currentPassword!: string;
	public readonly newPassword!: string;
	public readonly revokeAllSessions?: boolean;

	private constructor(data: UpdatePasswordRequestData) {
		Object.assign(this, data);
	}

	/**
	 * Creates an UpdatePasswordRequestDTO instance from a request body object.
	 *
	 * @param body - The request body containing password update data as key-value pairs
	 * @returns A new instance of UpdatePasswordRequestDTO with validated data
	 * @throws {ValidateRequestError} When the body fails validation against UpdatePasswordSchema
	 *
	 * @remarks
	 * This method validates the input body against the UpdatePasswordSchema using Zod.
	 * If validation fails, errors are formatted and thrown as a ValidateRequestError.
	 */

	public static fromBody(body: Record<string, string>): UpdatePasswordRequestDTO {
		const resp = UpdatePasswordSchema.safeParse({ ...body });

		if (!resp.success) {
			const formatted = formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formatted.msg, formatted.errors);
		}

		return new UpdatePasswordRequestDTO(resp.data);
	}
}

/**
 * Data Transfer Object for the response of a password update operation.
 *
 * @remarks
 * This DTO encapsulates the result of a password update request, including a success message
 * and an optional flag indicating whether the user's session was revoked as a result of the
 * password change.
 *
 * @example
 * ```typescript
 * // Create a successful response with session revocation
 * const response = UpdatePasswordResponseDTO.success(true);
 *
 * // Create a successful response without session revocation
 * const response = UpdatePasswordResponseDTO.success();
 *
 * // Convert to JSON for API response
 * const jsonResponse = response.toJSON();
 * ```
 */

export class UpdatePasswordResponseDTO {
	public readonly message!: string;
	public readonly sessionRevoked?: boolean;

	private constructor(data: { message: string; sessionRevoked?: boolean }) {
		Object.assign(this, data);
	}

	/**
	 * Creates a successful update password response DTO.
	 *
	 * @param sessionRevoked - Optional flag indicating whether the user's session was revoked after password update
	 * @returns A new UpdatePasswordResponseDTO instance with a success message and session revocation status
	 */

	public static success(sessionRevoked?: boolean): UpdatePasswordResponseDTO {
		return new UpdatePasswordResponseDTO({
			message: 'Password updated successfully',
			sessionRevoked,
		});
	}

	/**
	 * Converts the object to a JSON representation.
	 *
	 * @returns An object containing a message and optionally a sessionRevoked flag.
	 * The sessionRevoked property is only included if it has been explicitly set.
	 */

	public toJSON(): { message: string; sessionRevoked?: boolean } {
		return {
			message: this.message,
			...(this.sessionRevoked !== undefined && { sessionRevoked: this.sessionRevoked }),
		};
	}
}
