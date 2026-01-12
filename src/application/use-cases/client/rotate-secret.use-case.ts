import { getRandomValues } from 'crypto';

import { RotateSecretResponseDTO } from '@application';
import type { IClientRepository, IHashService, ILogger, IRotateSecretUseCase } from '@interfaces';
import { ForbiddenError, Injectable, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';

/**
 * Use case for rotating a client's OAuth2 secret.
 *
 * This use case handles the rotation of OAuth2 client secrets with a grace period,
 * allowing clients to transition to the new secret while the old one remains valid
 * for a limited time.
 *
 * @remarks
 * - Validates that the user owns the client before allowing rotation
 * - Generates a cryptographically secure 32-character secret
 * - Implements a 24-hour grace period where both old and new secrets are valid
 * - The plaintext secret is only returned once during rotation
 *
 * @example
 * ```typescript
 * const result = await rotateSecretUseCase.execute(userId, clientId);
 * // result.clientSecret contains the new plaintext secret (shown only once)
 * // result.gracePeriodExpiresAt indicates when the old secret becomes invalid
 * ```
 *
 * @throws {NotFoundRecordError} When the client does not exist
 * @throws {ForbiddenError} When the user does not own the client
 */

@LogContextClass()
@Injectable({ name: 'RotateSecretUseCase', depends: ['ClientRepository', 'HashService', 'Logger'] })
export class RotateSecretUseCase implements IRotateSecretUseCase {
	private readonly GRACE_PERIOD_HOURS = 24;

	constructor(
		public readonly repository: IClientRepository,
		public readonly hashService: IHashService,
		public readonly logger: ILogger
	) {}

	/**
	 * Rotates the client secret for the specified client.
	 *
	 * @param userId - The ID of the user requesting the secret rotation
	 * @param clientId - The ID of the client whose secret should be rotated
	 * @returns A promise that resolves to a RotateSecretResponseDTO containing the new secret and grace period expiration
	 * @throws {NotFoundRecordError} If the client with the given clientId does not exist
	 * @throws {ForbiddenError} If the user does not own the specified client
	 *
	 * @remarks
	 * This method performs the following operations:
	 * - Verifies the client exists and is owned by the requesting user
	 * - Generates a new secure secret (32 random characters)
	 * - Hashes the new secret using the hash service
	 * - Sets a grace period of 24 hours for the old secret to remain valid
	 * - Rotates the secrets in the repository (old → clientSecretOld, new → clientSecret)
	 * - Returns the plaintext secret in the response (the only time it is shown)
	 *
	 * During the grace period, both the old and new secrets will be accepted for authentication.
	 */

	@LogContextMethod()
	public async execute(userId: string, clientId: string): Promise<RotateSecretResponseDTO> {
		this.logger.info('Rotating client secret', { userId, clientId });

		// Find the existing client
		const existingClient = await this.repository.findByClientId(clientId);

		if (!existingClient) {
			this.logger.warn('Client not found for secret rotation', { userId, clientId });
			throw new NotFoundRecordError('Client not found');
		}

		// Verify ownership
		if (!existingClient.isOwnedBy(userId)) {
			this.logger.warn('User attempted to rotate secret for client they do not own', {
				userId,
				clientId,
				ownerId: existingClient.userId,
			});
			throw new ForbiddenError('You do not have permission to rotate this client secret');
		}

		// Generate new secure secret (32 random chars)
		const newSecret = this.generateSecureSecret();

		// Hash new secret
		const newSecretHash = await this.hashService.hashPassword(newSecret);

		// Calculate grace period expiration (24 hours from now)
		const gracePeriodExpiration = new Date();
		gracePeriodExpiration.setHours(gracePeriodExpiration.getHours() + this.GRACE_PERIOD_HOURS);

		// Rotate secrets in repository
		// Current secret → clientSecretOld
		// New secret → clientSecret
		await this.repository.rotateSecret(clientId, newSecretHash, existingClient.clientSecret, gracePeriodExpiration);

		this.logger.debug('Client secret rotated successfully', {
			userId,
			clientId,
			clientName: existingClient.clientName,
			gracePeriodExpiresAt: gracePeriodExpiration.toISOString(),
		});

		// Return response with plaintext secret (ONLY time it's shown)
		return RotateSecretResponseDTO.create(clientId, newSecret, gracePeriodExpiration);
	}

	private generateSecureSecret(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		let secret = '';
		const randomBytes = getRandomValues(new Uint8Array(32));

		for (let i = 0; i < 32; i++) {
			secret += chars[randomBytes[i] % chars.length];
		}

		return secret;
	}
}
