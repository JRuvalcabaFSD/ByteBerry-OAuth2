/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Enumeration of possible account types for users in the system.
 *
 * - `USER`: Represents a standard user account with basic access.
 * - `DEVELOPER`: Represents an account for developers with additional privileges.
 * - `HYBRID`: Represents an account that combines features of both user and developer types.
 */

import { EntityError } from '../errors/domain.errors.js';

export enum AccountType {
	USER = 'USER',
	DEVELOPER = 'DEVELOPER',
	HYBRID = 'HYBRID',
}

/**
 * Represents the properties of a user entity in the system.
 * This interface defines the structure for user data, including authentication,
 * profile information, and feature access flags.
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
	isDeveloper: boolean;
	canUseExpenses: boolean;
	developerEnabledAt: Date | null;
	expensesEnabledAt: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Represents a user entity in the system, encapsulating user-related data and behaviors.
 * This class enforces controlled instantiation through the static `create` method and provides
 * methods for role checking, account type determination, and feature access control.
 *
 * @property {string} id - The unique identifier for the user.
 * @property {string} email - The user's email address, normalized to lowercase and trimmed.
 * @property {string | null} username - The user's username, optional.
 * @property {string} passwordHash - The hashed password for authentication (excluded from public representations).
 * @property {string | null} fullName - The user's full name, optional.
 * @property {string[]} roles - An array of roles assigned to the user, defaults to ['user'].
 * @property {boolean} isActive - Indicates if the user account is active, defaults to true.
 * @property {boolean} emailVerified - Indicates if the user's email has been verified, defaults to false.
 * @property {boolean} isDeveloper - Indicates if the user has developer access, defaults to false.
 * @property {boolean} canUseExpenses - Indicates if the user can access expenses features, defaults to false.
 * @property {Date | null} developerEnabledAt - The timestamp when developer access was enabled, null if not.
 * @property {Date | null} expensesEnabledAt - The timestamp when expenses access was enabled, null if not.
 * @property {Date} createdAt - The timestamp when the user was created.
 * @property {Date} updatedAt - The timestamp when the user was last updated.
 *
 * @example
 * ```typescript
 * const user = UserEntity.create({
 *   id: '123',
 *   email: 'user@example.com',
 *   passwordHash: 'hashedpassword',
 *   // other properties...
 * });
 * console.log(user.accountType); // AccountType.USER
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
	public readonly isDeveloper: boolean = false;
	public readonly canUseExpenses: boolean = false;
	public readonly developerEnabledAt!: Date | null;
	public readonly expensesEnabledAt!: Date | null;
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
	 * Creates a new UserEntity instance with default values applied to optional properties.
	 *
	 * @param props - The properties to initialize the UserEntity with.
	 * @returns A new UserEntity instance.
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
			isDeveloper: props.isDeveloper ?? false,
			canUseExpenses: props.canUseExpenses ?? true,
			developerEnabledAt: props.developerEnabledAt ?? null,
			expensesEnabledAt: props.expensesEnabledAt ?? null,
			createdAt: props.createdAt ?? now,
			updatedAt: props.updatedAt ?? now,
		} as UserEntity);
	}

	/**
	 * Gets the account type based on the user's developer status and expense usage permissions.
	 * Returns {@link AccountType.HYBRID} if the user is a developer and can use expenses,
	 * {@link AccountType.DEVELOPER} if the user is a developer but cannot use expenses,
	 * or {@link AccountType.USER} otherwise.
	 */

	public get accountType(): AccountType {
		if (this.isDeveloper && this.canUseExpenses) return AccountType.HYBRID;
		if (this.isDeveloper) return AccountType.DEVELOPER;
		return AccountType.USER;
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
	 * Determines whether the user has permission to create clients.
	 * @returns {boolean} True if the user is a developer, false otherwise.
	 */

	public canCreateClients(): boolean {
		return this.isDeveloper;
	}

	/**
	 * Checks if the user has access to expenses.
	 * @returns {boolean} True if the user can access expenses, false otherwise.
	 */

	public canAccessExpenses(): boolean {
		return this.canUseExpenses;
	}

	/**
	 * Upgrades the user to developer status.
	 *
	 * This method sets the user's `isDeveloper` flag to true, records the timestamp when developer access was enabled,
	 * and updates the `updatedAt` field. If the user already has developer access, it throws an `EntityError`.
	 *
	 * @throws {EntityError} If the user already has developer access.
	 */

	public upgradeToDeveloper(): void {
		if (this.isDeveloper) throw new EntityError('User already has developer access');

		const now = new Date();

		(this as any).isDeveloper = true;
		(this as any).developerEnabledAt = now;
		(this as any).updatedAt = now;
	}

	/**
	 * Enables expenses access for the user.
	 * Throws an error if the user already has expenses access.
	 * @throws {EntityError} If the user already has expenses access.
	 */

	public enableExpenses(): void {
		if (this.canUseExpenses) throw new EntityError('User already has expenses access');

		const now = new Date();

		(this as any).canUseExpenses = true;
		(this as any).expensesEnabledAt = now;
		(this as any).updatedAt = now;
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

	public toPublic(): Omit<UserProps, 'passwordHash'> & { accountType: AccountType } {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { passwordHash, ...rest } = this;
		return { ...rest, accountType: this.accountType };
	}
}
