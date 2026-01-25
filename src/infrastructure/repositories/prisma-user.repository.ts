import { PrismaClient } from '@prisma/client';

import { DBConfig } from '@config';
import { UserEntity } from '@domain';
import { handledPrismaError, Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { IHashService, ILogger, IUserRepository } from '@interfaces';

/**
 * Repository for managing user persistence operations using Prisma ORM.
 * Implements the IUserRepository interface and provides methods for CRUD operations
 * and user authentication validation.
 *
 * @implements {IUserRepository}
 *
 * @example
 * ```
 * const userRepository = new UserRepository(dbConfig, hashService, logger);
 * const user = await userRepository.findByEmail('user@example.com');
 * ```
 */

@LogContextClass()
@Injectable({ name: 'UserRepository', depends: ['DBConfig', 'HashService', 'Logger'] })
export class UserRepository implements IUserRepository {
	private readonly client: PrismaClient;

	constructor(
		dbConfig: DBConfig,
		private readonly hashService: IHashService,
		private readonly logger: ILogger
	) {
		this.client = dbConfig.getClient();
	}

	/**
	 * Finds a user by email address.
	 * @param email - The email address to search for
	 * @returns A promise that resolves to a UserEntity if found, or null if no user exists with the given email
	 * @throws Will throw a handled Prisma error if the database query fails
	 */

	@LogContextMethod()
	public async findByEmail(email: string): Promise<UserEntity | null> {
		try {
			const user = await this.client.user.findUnique({ where: { email } });

			if (!user) return null;

			this.logger.debug('Find user in database', { email });
			return UserEntity.create({ ...user });
		} catch (error) {
			this.logger.error('search failed', { email });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds a user by their username.
	 * @param username - The username to search for
	 * @returns A promise that resolves to a UserEntity if found, or null if not found
	 * @throws Will throw an error if the database query fails
	 */

	@LogContextMethod()
	public async findByUserName(username: string): Promise<UserEntity | null> {
		try {
			const user = await this.client.user.findUnique({ where: { username } });

			if (!user) return null;

			this.logger.debug('Find user in database', { username });
			return UserEntity.create({ ...user });
		} catch (error) {
			this.logger.error('search failed', { username });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds a user by their unique identifier.
	 * @param id - The unique identifier of the user to retrieve
	 * @returns A promise that resolves to a UserEntity if found, or null if no user exists with the given id
	 * @throws Will throw a handled Prisma error if the database operation fails
	 */

	@LogContextMethod()
	public async findById(id: string): Promise<UserEntity | null> {
		try {
			const user = await this.client.user.findUnique({ where: { id } });

			if (!user) return null;

			this.logger.debug('Find user in database', { id });
			return UserEntity.create({ ...user });
		} catch (error) {
			this.logger.error('search failed', { id });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Validates user credentials by email or username and password.
	 *
	 * @param emailOrUsername - The user's email or username to look up
	 * @param password - The plaintext password to verify against the stored hash
	 * @returns A promise that resolves to a UserEntity if credentials are valid, or null if the user is not found or password is invalid
	 * @throws Will throw an error if the database query fails, after logging the failure
	 */

	@LogContextMethod()
	public async validateCredentials(emailOrUsername: string, password: string): Promise<UserEntity | null> {
		try {
			const user = await this.client.user.findFirst({
				where: { OR: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }] },
			});

			if (!user) return null;

			const entity = UserEntity.create({ ...user });
			const isValid = await this.hashService.verifyPassword(password, user.passwordHash);

			if (!isValid) return null;

			return entity;
		} catch (error) {
			this.logger.error('user validation failure', { emailOrUsername });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Saves a new user to the database.
	 * @param user - The user entity to be created
	 * @throws {PrismaClientKnownRequestError} If a database constraint is violated or operation fails
	 * @returns A promise that resolves when the user is successfully created
	 */

	@LogContextMethod()
	public async save(user: UserEntity): Promise<void> {
		try {
			await this.client.user.create({
				data: {
					id: user.id,
					email: user.email,
					username: user.username,
					passwordHash: user.passwordHash,
					fullName: user.fullName,
					roles: user.roles,
					isActive: user.isActive,
					emailVerified: user.emailVerified,
					isDeveloper: user.isDeveloper,
					canUseExpenses: user.canUseExpenses,
					developerEnabledAt: user.developerEnabledAt,
					expensesEnabledAt: user.expensesEnabledAt,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				},
			});
			this.logger.debug('user creation successfully', { username: user.username });
		} catch (error) {
			this.logger.error('user creation failure', { username: user.username });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Updates an existing user in the database.
	 * @param user - The user entity containing the updated information
	 * @returns A promise that resolves when the user has been successfully updated
	 * @throws {PrismaClientKnownRequestError} If the user does not exist or the update operation fails
	 * @example
	 * await userRepository.update(userEntity);
	 */

	@LogContextMethod()
	public async update(user: UserEntity): Promise<void> {
		try {
			await this.client.user.update({
				where: { id: user.id },
				data: {
					id: user.id,
					email: user.email,
					username: user.username,
					passwordHash: user.passwordHash,
					fullName: user.fullName,
					roles: user.roles,
					isActive: user.isActive,
					emailVerified: user.emailVerified,
					isDeveloper: user.isDeveloper,
					canUseExpenses: user.canUseExpenses,
					developerEnabledAt: user.developerEnabledAt,
					expensesEnabledAt: user.expensesEnabledAt,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				},
			});
			this.logger.debug('User updated successfully', {
				userId: user.id,
				email: user.email,
				username: user.username,
			});
		} catch (error) {
			this.logger.error('User update failed', {
				userId: user.id,
				email: user.email,
			});
			throw handledPrismaError(error);
		}
	}
}
