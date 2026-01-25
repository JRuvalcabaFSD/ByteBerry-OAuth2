import { EntityError } from '@domain';
import { UserResponseDTO } from '@application';
import { getErrMessage, Injectable, InvalidUserError, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';
import type { ILogger, IUpgradeToDeveloperUseCase, IUserRepository } from '@interfaces';

/**
 * Use case for upgrading a user to developer status.
 *
 * This class encapsulates the business logic required to promote a user to a developer role.
 * It performs validation, handles business rule violations, logs relevant events, and persists changes.
 *
 * @implements {IUpgradeToDeveloperUseCase}
 *
 * @constructor
 * @param repository - The user repository for data access operations.
 * @param logger - The logger for recording informational and warning messages.
 *
 * @method execute
 * Upgrades the specified user to developer status.
 * Throws a NotFoundRecordError if the user does not exist.
 * Throws an InvalidUserError if business rules are violated during the upgrade.
 * Logs significant events and errors during the process.
 *
 * @param userId - The unique identifier of the user to upgrade.
 * @returns A promise that resolves to a UserResponseDTO representing the upgraded user.
 * @throws NotFoundRecordError If the user is not found.
 * @throws InvalidUserError If the upgrade violates business rules.
 */

@LogContextClass()
@Injectable({ name: 'UpgradeToDeveloperUseCase', depends: ['UserRepository', 'Logger'] })
export class UpgradeToDeveloperUseCase implements IUpgradeToDeveloperUseCase {
	constructor(
		private readonly repository: IUserRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Upgrades a user to developer status.
	 *
	 * This method attempts to upgrade the user identified by the given `userId` to a developer role.
	 * It logs the operation, checks if the user exists, and applies the upgrade. If the user is not found,
	 * a `NotFoundRecordError` is thrown. If the upgrade violates business rules, an `InvalidUserError` is thrown.
	 * The updated user entity is persisted and a `UserResponseDTO` is returned.
	 *
	 * @param userId - The unique identifier of the user to upgrade.
	 * @returns A promise that resolves to a `UserResponseDTO` representing the upgraded user.
	 * @throws {NotFoundRecordError} If the user does not exist.
	 * @throws {InvalidUserError} If the upgrade violates business rules.
	 * @throws {Error} For any other unexpected errors during the upgrade process.
	 */

	@LogContextMethod()
	public async execute(userId: string): Promise<UserResponseDTO> {
		this.logger.info('Upgrading user to developer', { userId });

		const currentUser = await this.repository.findById(userId);

		if (!currentUser) {
			this.logger.warn('User not found for developer upgrade', { userId });
			throw new NotFoundRecordError('user not found');
		}

		try {
			currentUser.upgradeToDeveloper();
		} catch (error) {
			this.logger.warn('Developer upgrade failed - business rule violation', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (error instanceof EntityError) throw new InvalidUserError(getErrMessage(error));
			throw error;
		}

		await this.repository.update(currentUser);

		return UserResponseDTO.fromEntity(currentUser);
	}
}
