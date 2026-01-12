import type { ICheckConsentUseCase, IConsentRepository, ILogger } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Use case for checking if a user has valid consent for a client application.
 *
 * Validates that:
 * - Consent exists for the user and client
 * - Consent is active (not revoked or expired)
 * - Consent covers all requested scopes (if scopes are specified)
 *
 * @implements {ICheckConsentUseCase}
 */

@LogContextClass()
@Injectable({ name: 'CheckConsentUseCase', depends: ['ConsentRepository', 'Logger'] })
export class CheckConsentUseCase implements ICheckConsentUseCase {
	constructor(
		private readonly repository: IConsentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Checks if a user has given valid consent for a specific OAuth2 client.
	 *
	 * @param userId - The unique identifier of the user
	 * @param clientId - The unique identifier of the OAuth2 client
	 * @param requestedScopes - Optional array of scopes being requested. If provided, consent must cover all requested scopes
	 *
	 * @returns A promise that resolves to `true` if the user has valid, active consent that covers all requested scopes; `false` otherwise
	 *
	 * @remarks
	 * A consent is considered valid when:
	 * - A consent record exists for the user and client combination
	 * - The consent is active (not revoked and not expired)
	 * - If requestedScopes are provided, the consent grants all of them
	 *
	 * The method logs debug information for each validation step and info-level logs when valid consent is found.
	 */

	@LogContextMethod()
	public async execute(userId: string, clientId: string, requestedScopes?: string[]): Promise<boolean> {
		this.logger.debug('Checking user consent', { userId, clientId, requestedScopes });

		const consent = await this.repository.findByUserAndClient(userId, clientId);

		if (!consent) {
			this.logger.debug('No consent found for user and client', { userId, clientId });
			return false;
		}

		if (!consent.isActive()) {
			this.logger.debug('Consent found but not active', {
				userId,
				clientId,
				isRevoked: consent.isRevoked(),
				isExpired: consent.isExpired(),
			});
			return false;
		}

		if (requestedScopes && requestedScopes.length !== 0) {
			const hasAllScopes = consent.hasAllScopes(requestedScopes);

			if (!hasAllScopes) {
				this.logger.debug('Consent found but does not cover all requested scopes', {
					userId,
					clientId,
					grantedScopes: consent.scopes,
					requestedScopes,
				});
				return false;
			}
		}

		this.logger.info('Valid consent found', {
			userId,
			clientId,
			scopes: consent.scopes,
		});

		return true;
	}
}
