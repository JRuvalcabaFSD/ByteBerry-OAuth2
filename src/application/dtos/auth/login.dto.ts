import { ValidateRequestError } from '@shared';
import { SessionEntity, UserEntity } from '@domain';
import { formattedZodError, LoginRequestData, LoginRequestSchema } from '@application';

/**
 * Represents a user entity in the authentication system.
 *
 * @interface User
 * @property {string} id - The unique identifier of the user.
 * @property {string} email - The email address of the user.
 * @property {string | null} username - The username of the user, or null if not set.
 * @property {string | null} fullName - The full name of the user, or null if not set.
 * @property {string[]} roles - An array of role identifiers assigned to the user.
 */

interface User {
	id: string;
	email: string;
	username: string | null;
	fullName: string | null;
	roles: string[];
}

/**
 * Represents the response data returned after a successful user login.
 *
 * @interface LoginResponseData
 * @property {string} sessionId - Unique identifier for the user's authenticated session
 * @property {User} user - The authenticated user object containing user details
 * @property {Date} expiresAt - The date and time when the session will expire
 * @property {string} message - A descriptive message about the login result
 */

interface LoginResponseData {
	sessionId: string;
	user: User;
	expiresAt: Date;
	message: string;
}

/**
 * Data Transfer Object for handling login requests.
 *
 * This class encapsulates login credentials and metadata required for user authentication.
 * It provides validation through a factory method that parses and validates input data
 * using a Zod schema.
 *
 * @remarks
 * - The class uses a private constructor to enforce creation through the `fromBody` factory method
 * - All properties are readonly to ensure immutability after instantiation
 * - Validation errors are formatted and thrown as `ValidateRequestError`
 *
 * @example
 * ```typescript
 * const loginRequest = LoginRequestDTO.fromBody({
 *   emailOrUserName: 'user@example.com',
 *   password: 'securePassword123',
 *   rememberMe: 'true',
 *   userAgent: 'Mozilla/5.0...',
 *   ipAddress: '192.168.1.1'
 * });
 * ```
 */

export class LoginRequestDTO {
	public readonly emailOrUserName!: string;
	public readonly password!: string;
	public readonly rememberMe?: boolean;
	public readonly userAgent?: string;
	public readonly ipAddress?: string;

	private constructor(data: LoginRequestData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a LoginRequestDTO instance from a request body object.
	 *
	 * @param body - A record containing string key-value pairs from the request body
	 * @returns A new LoginRequestDTO instance with validated data
	 * @throws {ValidateRequestError} When the body fails validation against LoginRequestSchema
	 *
	 * @remarks
	 * This method validates the input body using LoginRequestSchema and formats any validation
	 * errors before throwing them. The validation is performed using Zod's safeParse method.
	 */

	public static fromBody(body: Record<string, string>, ip?: string): LoginRequestDTO {
		const resp = LoginRequestSchema.safeParse({ ...body, ip });

		if (!resp.success) {
			const formattedError = formattedZodError(resp.error, 'form');
			throw new ValidateRequestError(formattedError.msg, formattedError.errors);
		}

		return new LoginRequestDTO(resp.data);
	}
}

/**
 * Data Transfer Object for login response.
 *
 * Represents the response returned after a successful login operation,
 * containing session information, user details, and expiration data.
 *
 * @remarks
 * This class uses a private constructor to enforce creation through the
 * static factory method `fromEntities`, ensuring proper initialization
 * from domain entities.
 *
 * @example
 * ```typescript
 * const loginResponse = LoginResponseDTO.fromEntities(userEntity, sessionEntity);
 * const json = loginResponse.toJson();
 * ```
 */

export class LoginResponseDTO {
	public readonly sessionId!: string;
	public readonly user!: User;
	public readonly expiresAt!: Date;
	public readonly message!: string;

	private constructor(data: LoginResponseData) {
		Object.assign(this, data);
	}

	/**
	 * Creates a LoginResponseDTO instance from user and session entities.
	 *
	 * @param user - The user entity containing user information
	 * @param session - The session entity containing session details
	 * @returns A new LoginResponseDTO instance with session ID, public user data, expiration time, and success message
	 *
	 * @example
	 * ```typescript
	 * const loginResponse = LoginResponseDTO.fromEntities(userEntity, sessionEntity);
	 * ```
	 */

	public static fromEntities(user: UserEntity, session: SessionEntity): LoginResponseDTO {
		return new LoginResponseDTO({
			sessionId: session.id,
			user: user.toPublic(),
			expiresAt: session.expiresAt,
			message: 'Login successful',
		});
	}

	public toJson(): { user: User; expiresAt: string; message: string } {
		return {
			user: this.user,
			expiresAt: this.expiresAt.toISOString(),
			message: this.message,
		};
	}
}
