import { EntityError } from '@domain';
import { UserResponseDTO } from '@application';
import type { IEnableExpensesUseCase, ILogger, IUserRepository } from '@interfaces';
import { getErrMessage, Injectable, InvalidUserError, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';

/**
 * Use case for enabling expenses for a user.
 *
 * This class implements the business logic required to enable the expenses feature
 * for a user identified by their user ID. It interacts with the user repository to
 * retrieve and update the user entity, and logs relevant information throughout the process.
 *
 * @implements IEnableExpensesUseCase
 *
 * @constructor
 * @param repository - The user repository for accessing and updating user data.
 * @param logger - The logger instance for logging informational, debug, and warning messages.
 *
 * @method execute
 * Enables expenses for the specified user.
 *
 * @param userId - The unique identifier of the user for whom expenses should be enabled.
 * @returns A promise that resolves to a UserResponseDTO representing the updated user.
 * @throws NotFoundRecordError If the user is not found in the repository.
 * @throws InvalidUserError If enabling expenses violates a business rule.
 * @throws Error For any other unexpected errors during the process.
 */

@LogContextClass()
@Injectable({ name: 'EnableExpensesUseCase', depends: ['UserRepository', 'Logger'] })
export class EnableExpensesUseCase implements IEnableExpensesUseCase {
	constructor(
		public readonly repository: IUserRepository,
		public readonly logger: ILogger
	) {}

	/**
	 * Enables expenses for a user by their unique identifier.
	 *
	 * This method retrieves the user from the repository, attempts to enable expenses
	 * for the user, and updates the user record. It logs the process at various stages,
	 * including success, not found, and business rule violations.
	 *
	 * @param userId - The unique identifier of the user to enable expenses for.
	 * @returns A promise that resolves to a {@link UserResponseDTO} representing the updated user.
	 * @throws {NotFoundRecordError} If the user is not found in the repository.
	 * @throws {InvalidUserError} If enabling expenses violates a business rule.
	 * @throws {Error} For any other unexpected errors during the process.
	 */

	@LogContextMethod()
	public async execute(userId: string): Promise<UserResponseDTO> {
		this.logger.info('Enabling expenses for user', { userId });

		const currentUser = await this.repository.findById(userId);

		if (!currentUser) {
			this.logger.debug('User not found for expenses enablement', { userId });
			throw new NotFoundRecordError('User not found');
		}

		try {
			currentUser.enableExpenses();
		} catch (error) {
			this.logger.warn('Expenses enablement failed - business rule violation', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			if (error instanceof EntityError) throw new InvalidUserError(getErrMessage(error), 400);
			throw error;
		}

		await this.repository.update(currentUser);

		this.logger.info('Expenses enabled for user successfully', {
			userId: currentUser.id,
			email: currentUser.email,
			accountType: currentUser.accountType,
			expensesEnabledAt: currentUser.expensesEnabledAt?.toISOString(),
		});

		return UserResponseDTO.fromEntity(currentUser);
	}
}
