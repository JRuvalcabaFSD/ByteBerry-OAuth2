import type { IConsentRepository, IDeleteConsentUseCase, ILogger } from '@interfaces';
import { ForbiddenError, Injectable, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';

/**
 * Use case for revoking user consent.
 *
 * This use case handles the deletion/revocation of user consent records.
 * It performs validation to ensure the consent exists and that the requesting user
 * owns the consent before revoking it. The operation is idempotent, so attempting
 * to revoke an already revoked consent will succeed without error.
 *
 * @class DeleteConsentUseCase
 * @implements {IDeleteConsentUseCase}
 *
 * @example
 * const useCase = new DeleteConsentUseCase(consentRepository, logger);
 * await useCase.execute(userId, consentId);
 *
 * @throws {NotFoundRecordError} When the consent with the given ID does not exist.
 * @throws {ForbiddenError} When the user attempting to revoke does not own the consent.
 */

@LogContextClass()
@Injectable({ name: 'DeleteConsentUseCase', depends: ['ConsentRepository', 'Logger'] })
export class DeleteConsentUseCase implements IDeleteConsentUseCase {
	constructor(
		private readonly repository: IConsentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Revokes a user's consent for a specific client application.
	 *
	 * This method performs the following operations:
	 * - Retrieves the consent record by ID
	 * - Validates that the consent exists
	 * - Verifies that the requesting user owns the consent
	 * - Checks if the consent is already revoked (idempotent operation)
	 * - Revokes the consent in the repository
	 *
	 * @param userId - The ID of the user revoking the consent
	 * @param consentId - The ID of the consent to be revoked
	 * @throws {NotFoundRecordError} When the consent record does not exist
	 * @throws {ForbiddenError} When the user does not own the consent being revoked
	 * @returns A promise that resolves when the consent has been successfully revoked
	 */

	@LogContextMethod()
	public async execute(userId: string, consentId: string): Promise<void> {
		this.logger.info('Revoking user consent', { userId, consentId });

		const consent = await this.repository.findById(consentId);

		if (!consent) {
			this.logger.warn('Consent not found for revocation', { userId, consentId });
			throw new NotFoundRecordError('Consent not found');
		}

		if (consent.userId !== userId) {
			this.logger.warn('User attempted to revoke consent they do not own', {
				userId,
				consentId,
				actualUserId: consent.userId,
			});
			throw new ForbiddenError('You do not have permission to revoke this consent');
		}

		if (consent.isRevoked()) {
			this.logger.info('Consent already revoked', { userId, consentId });
			return; // Idempotent operation
		}

		await this.repository.revokeConsent(consentId);

		this.logger.info('Consent revoked successfully', {
			userId,
			consentId,
			clientId: consent.clientId,
		});
	}
}
