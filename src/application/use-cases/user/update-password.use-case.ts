import { UserEntity } from '@domain';
import { UpdatePasswordRequestDTO, UpdatePasswordResponseDTO } from '@application';
import type { IHashService, ILogger, ISessionRepository, IUpdatePasswordUseCase, IUserRepository } from '@interfaces';
import { Injectable, InvalidCredentialsError, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';

/**
 * Use case for updating a user's password.
 *
 * This use case handles the process of updating a user's password, including:
 * - Verifying the user exists
 * - Validating the current password
 * - Hashing and storing the new password
 * - Optionally revoking all active sessions
 *
 * @remarks
 * The use case follows the principle of secure password management by:
 * - Requiring the current password for verification
 * - Using a hash service for password security
 * - Providing the option to revoke all sessions after password change
 *
 * @throws {NotFoundRecordError} When the user is not found
 * @throws {InvalidCredentialsError} When the current password is incorrect
 *
 * @example
 * ```typescript
 * const useCase = new UpdatePasswordUseCase(
 *   userRepository,
 *   sessionRepository,
 *   hashService,
 *   logger
 * );
 *
 * const result = await useCase.execute('user-id', {
 *   currentPassword: 'oldPassword123',
 *   newPassword: 'newSecurePassword456',
 *   revokeAllSessions: true
 * });
 * ```
 */

@LogContextClass()
@Injectable({ name: 'UpdatePasswordUseCase', depends: ['UserRepository', 'SessionRepository', 'HashService', 'Logger'] })
export class UpdatePasswordUseCase implements IUpdatePasswordUseCase {
	constructor(
		private readonly userRepository: IUserRepository,
		private readonly sessionRepository: ISessionRepository,
		private readonly hashService: IHashService,
		private readonly logger: ILogger
	) {}

	/**
	 * Updates a user's password after verifying their current password.
	 *
	 * @param userId - The unique identifier of the user whose password is being updated
	 * @param request - The password update request containing current password, new password, and session revocation preference
	 *
	 * @returns A promise that resolves to an UpdatePasswordResponseDTO indicating success and whether sessions were revoked
	 *
	 * @throws {NotFoundRecordError} When the user with the specified userId is not found
	 * @throws {InvalidCredentialsError} When the provided current password does not match the user's stored password
	 *
	 * @remarks
	 * This method performs the following operations:
	 * 1. Validates the user exists in the system
	 * 2. Verifies the current password matches the stored hash
	 * 3. Hashes the new password
	 * 4. Updates the user record with the new password hash
	 * 5. Optionally revokes all active sessions if requested
	 *
	 * All operations are logged for security auditing purposes.
	 */

	@LogContextMethod()
	public async execute(userId: string, request: UpdatePasswordRequestDTO): Promise<UpdatePasswordResponseDTO> {
		this.logger.debug('Processing password update request', {
			userId,
			revokeAllSessions: request.revokeAllSessions,
		});

		// Get current user
		const currentUser = await this.userRepository.findById(userId);
		if (!currentUser) {
			this.logger.warn('User not found for password update', { userId });
			throw new NotFoundRecordError('User not found');
		}

		// Verify current password
		const isCurrentPasswordValid = await this.hashService.verifyPassword(request.currentPassword, currentUser.passwordHash);

		if (!isCurrentPasswordValid) {
			this.logger.warn('Invalid current password for password update', {
				userId: currentUser.id,
				email: currentUser.email,
			});
			throw new InvalidCredentialsError('Current password is incorrect');
		}

		// 3. Hash new password
		const newPasswordHash = await this.hashService.hashPassword(request.newPassword);

		const updatedUser = UserEntity.create({
			...currentUser,
			passwordHash: newPasswordHash,
			updatedAt: new Date(),
		});

		await this.userRepository.update(updatedUser);

		this.logger.info('Password updated successfully', {
			userId: updatedUser.id,
			email: updatedUser.email,
			sessionsToRevoke: request.revokeAllSessions,
		});

		// 5. Revoke sessions if requested
		if (request.revokeAllSessions) {
			await this.sessionRepository.deleteByUserId(userId);

			this.logger.info('All sessions revoked after password update', {
				userId,
			});
		}

		return UpdatePasswordResponseDTO.success(request.revokeAllSessions);
	}
}
