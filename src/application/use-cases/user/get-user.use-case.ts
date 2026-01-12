import { UserResponseDTO } from '@application';
import { Injectable, LogContextClass, NotFoundRecordError } from '@shared';
import type { IGetUserUseCase, ILogger, IUserRepository } from '@interfaces';

/**
 * Use case for retrieving user information by ID.
 *
 * Fetches a user from the repository and returns their information as a DTO.
 * Logs debug information about the operation and warns if the user is not found.
 *
 * @implements {IGetUserUseCase}
 *
 * @example
 * ```typescript
 * const useCase = new GetUserUseCase(userRepository, logger);
 * const userDto = await useCase.execute('user-123');
 * ```
 */

@LogContextClass()
@Injectable({ name: 'GetUserUseCase', depends: ['UserRepository', 'Logger'] })
export class GetUserUseCase implements IGetUserUseCase {
	constructor(
		private readonly repository: IUserRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Retrieves user information by user ID.
	 *
	 * @param userId - The unique identifier of the user to fetch
	 * @returns A promise that resolves to a {@link UserResponseDTO} containing the user's information
	 * @throws {NotFoundRecordError} If the user with the specified ID does not exist
	 *
	 * @example
	 * ```ts
	 * const userDTO = await useCase.execute('user-123');
	 * ```
	 */

	public async execute(userId: string): Promise<UserResponseDTO> {
		this.logger.debug('Fetching user information', { userId });

		//Get the user
		const user = await this.repository.findById(userId);

		if (!user) {
			this.logger.warn('User not found for /user/me request', { userId, action: 'should_logout' });
			throw new NotFoundRecordError('User not found. Your session may be invalid.');
		}

		this.logger.debug('User information retrieved successfully', {
			userId: user.id,
			email: user.email,
		});

		//Generate dto
		return UserResponseDTO.fromEntity(user);
	}
}
