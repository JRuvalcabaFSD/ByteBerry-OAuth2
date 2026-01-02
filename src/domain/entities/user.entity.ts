/**
 * Represents the properties of a user entity.
 *
 * @property id - Unique identifier for the user.
 * @property email - The user's email address.
 * @property username - The user's username, or null if not set.
 * @property passwordHash - The hashed password of the user.
 * @property fullName - The user's full name, or null if not set.
 * @property roles - An array of roles assigned to the user.
 * @property isActive - Indicates whether the user account is active.
 * @property emailVerified - Indicates whether the user's email has been verified.
 * @property createdAt - The date and time when the user was created.
 * @property updatedAt - The date and time when the user was last updated.
 */

interface UserProps {
	id: string;
	email: string;
	username: string | null;
	passwordHash: string;
	fullName: string | null;
	roles: string[];
	isActive: boolean;
	emailVerified: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Represents a user within the system, encapsulating user-related properties and behaviors.
 *
 * The `UserEntity` class provides a domain model for user accounts, including identity, authentication,
 * authorization roles, and account status. It offers methods for password validation, role checking,
 * and generating a public representation of the user without sensitive information.
 *
 * Instances of `UserEntity` are immutable and should be created using the static `create` method.
 *
 * @remarks
 * - The password is stored as a hash in the `passwordHash` property.
 * - The class supports role-based access checks via `hasRole` and `hasAnyRoles`.
 * - The `toPublic` method returns a user object suitable for exposure in APIs, omitting sensitive data.
 *
 * @example
 * ```typescript
 * const user = UserEntity.create({
 *   id: '123',
 *   email: 'user@example.com',
 *   username: 'user123',
 *   passwordHash: 'hashedPassword',
 *   fullName: 'User Example',
 *   roles: ['user'],
 *   isActive: true,
 *   emailVerified: false,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 *
 * if (user.validatePassword('plainPassword')) {
 *   // Password is valid
 * }
 *
 * if (user.hasRole('admin')) {
 *   // User is an admin
 * }
 *
 * const publicUser = user.toPublic();
 * ```
 */

export class UserEntity {
	public readonly id!: string;
	public readonly email!: string;
	public readonly username!: string | null;
	public readonly passwordHash!: string;
	public readonly fullName!: string | null;
	public readonly roles!: string[];
	public readonly isActive!: boolean;
	public readonly emailVerified!: boolean;
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;

	/**
	 * Creates a new User entity with the provided properties.
	 * This constructor is private to enforce controlled instantiation.
	 *
	 * @param props - The properties required to create a User entity.
	 */

	private constructor(props: UserProps) {
		Object.assign(this, props);
	}

	/**
	 * Creates a new instance of the UserEntity with the provided properties.
	 *
	 * Normalizes and sets default values for certain fields:
	 * - Converts the email to lowercase and trims whitespace.
	 * - Sets `username` and `fullName` to `null` if not provided.
	 * - Defaults `roles` to `['user']` if not specified.
	 * - Defaults `isActive` to `true` and `emailVerified` to `false` if not specified.
	 * - Sets `createdAt` and `updatedAt` to the current date if not provided.
	 *
	 * @param props - The properties required to create a UserEntity.
	 * @returns A new UserEntity instance with normalized and defaulted properties.
	 */

	public static create(props: UserProps): UserEntity {
		const now = new Date();

		return new UserEntity({
			...props,
			email: props.email.toLowerCase().trim(),
			username: props.username ?? null,
			fullName: props.fullName ?? null,
			roles: props.roles ?? ['user'],
			isActive: props.isActive ?? true,
			emailVerified: props.emailVerified ?? false,
			createdAt: props.createdAt ?? now,
			updatedAt: props.updatedAt ?? now,
		} as UserEntity);
	}

	/**
	 * Checks if the user possesses a specific role.
	 *
	 * @param role - The name of the role to check for.
	 * @returns `true` if the user has the specified role; otherwise, `false`.
	 * @example
	 * const isAdmin = user.hasRole('admin');
	 */

	public hasRole(role: string): boolean {
		return this.roles.includes(role);
	}

	/**
	 * Checks if the user has at least one of the specified roles.
	 *
	 * @param roles - An array of role names to check against the user's roles.
	 * @returns `true` if the user has any of the specified roles, otherwise `false`.
	 *
	 * @example
	 * const hasAccess = user.hasAnyRoles(['admin', 'editor']);
	 */

	public hasAnyRoles(roles: string[]): boolean {
		return roles.some((role) => this.roles.includes(role));
	}

	/**
	 * Determines whether the user is allowed to log in.
	 *
	 * @returns {boolean} `true` if the user is active and can log in; otherwise, `false`.
	 *
	 * @example
	 * const canUserLogin = user.canLogin();
	 */

	public canLogin(): boolean {
		return this.isActive;
	}

	/**
	 * Returns a public representation of the user by omitting the `passwordHash` property.
	 * This method is useful for exposing user data without sensitive information.
	 *
	 * @returns An object containing all user properties except `passwordHash`.
	 *
	 * @example
	 * const publicUser = user.toPublic();
	 */

	public toPublic(): Omit<UserProps, 'passwordHash'> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { passwordHash, ...rest } = this;
		return { ...rest };
	}
}
