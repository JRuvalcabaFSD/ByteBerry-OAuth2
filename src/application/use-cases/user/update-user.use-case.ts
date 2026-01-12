import { UserEntity } from '@domain';
import { UpdateUserRequestDTO, UpdateUserResponseDTO } from '@application';
import type { ILogger, IUpdateUserUseCase, IUserRepository } from '@interfaces';
import { ConflictError, Injectable, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';

/**
 * Use case for updating user profile information.
 *
 * @remarks
 * This use case handles the business logic for updating a user's profile, including:
 * - Validating that the user exists
 * - Ensuring username uniqueness when the username is being changed
 * - Updating the user entity with the new information
 * - Persisting the changes through the repository
 *
 * @example
 * ```typescript
 * const useCase = new UpdateUserUseCase(userRepository, logger);
 * const response = await useCase.execute('user-123', {
 *   fullName: 'John Doe',
 *   username: 'johndoe'
 * });
 * ```
 *
 * @throws {NotFoundRecordError} When the user with the specified ID is not found
 * @throws {ConflictError} When the requested username is already taken by another user
 */

@LogContextClass()
@Injectable({ name: 'UpdateUserUseCase', depends: ['UserRepository', 'Logger'] })
export class UpdateUserUseCase implements IUpdateUserUseCase {
	constructor(
		private readonly repository: IUserRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Updates a user's profile information.
	 *
	 * @param userId - The unique identifier of the user to update
	 * @param request - The update request containing the fields to modify (fullName, username)
	 *
	 * @returns A promise that resolves to an UpdateUserResponseDTO containing the updated user data
	 *
	 * @throws {NotFoundRecordError} When the user with the specified userId is not found
	 * @throws {ConflictError} When the requested username is already taken by another user
	 *
	 * @remarks
	 * This method performs the following operations:
	 * - Validates the user exists in the system
	 * - Checks username uniqueness if the username is being changed
	 * - Updates only the fields provided in the request
	 * - Automatically updates the `updatedAt` timestamp
	 * - Persists the changes to the repository
	 *
	 * @example
	 * ```typescript
	 * const response = await updateUserUseCase.execute('user-123', {
	 *   fullName: 'John Doe',
	 *   username: 'johndoe'
	 * });
	 * ```
	 */

	@LogContextMethod()
	public async execute(userId: string, request: UpdateUserRequestDTO): Promise<UpdateUserResponseDTO> {
		this.logger.debug('Updating user profile', {
			userId,
			fields: {
				fullName: request.fullName !== undefined,
				username: request.username !== undefined,
			},
		});

		// Get current user
		const currentUser = await this.repository.findById(userId);

		if (!currentUser) {
			this.logger.warn('User not found for profile update', { userId });
			throw new NotFoundRecordError('User not found');
		}

		// Check username uniqueness if username is being changed
		if (request.username !== undefined && request.username !== null && request.username !== currentUser.username) {
			this.logger.debug('Username change detected, checking uniqueness', {
				oldUsername: currentUser.username,
				newUsername: request.username,
			});

			const existingUser = await this.repository.findByUserName(request.username);
			if (existingUser) {
				this.logger.warn('Username already taken', {
					username: request.username,
					existingUserId: existingUser.id,
				});
				throw new ConflictError('Username is already taken');
			}
		}

		// Create updated user entity
		const updatedUser = UserEntity.create({
			...currentUser,
			fullName: request.fullName !== undefined ? request.fullName : currentUser.fullName,
			username: request.username !== undefined ? request.username : currentUser.username,
			updatedAt: new Date(),
		});

		// Persist changes
		await this.repository.update(updatedUser);
		this.logger.info('User profile updated successfully', {
			userId: updatedUser.id,
			email: updatedUser.email,
			changes: {
				fullName: request.fullName !== undefined,
				username: request.username !== undefined,
			},
		});

		return UpdateUserResponseDTO.fromEntity(updatedUser);
	}
}
