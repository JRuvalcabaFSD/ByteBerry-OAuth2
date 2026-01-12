import { ConsentEntity } from '@domain';
import { DenyConsentError, Injectable, LogContextClass, LogContextMethod } from '@shared';
import { ConsentDecisionDTO } from '@application';
import type { IConsentRepository, IProcessConsentUseCase, IUuid, ILogger } from '@interfaces';

/**
 * Use case for processing user consent decisions in the OAuth2 flow.
 *
 * Handles both approval and denial of consent requests. When a user denies consent,
 * throws a DenyConsentError. When approved, creates and persists a ConsentEntity
 * with the requested scopes.
 *
 * @implements {IProcessConsentUseCase}
 *
 * @example
 * const useCase = new ProcessConsentUseCase(consentRepository, uuidService, logger);
 * await useCase.execute('user-123', {
 *   clientId: 'client-456',
 *   decision: 'approve',
 *   scope: 'read write'
 * });
 */

@LogContextClass()
@Injectable({ name: 'ProcessConsentUseCase', depends: ['ConsentRepository', 'Uuid', 'Logger'] })
export class ProcessConsentUseCase implements IProcessConsentUseCase {
	constructor(
		private readonly repository: IConsentRepository,
		private readonly uuid: IUuid,
		private readonly logger: ILogger
	) {}

	/**
	 * Processes a user's consent decision for an OAuth2 client.
	 *
	 * If the user denies consent, throws a DenyConsentError. Otherwise, creates and persists
	 * a new consent record with the requested scopes.
	 *
	 * @param userId - The ID of the user making the consent decision
	 * @param decision - The consent decision containing the client ID, decision choice, and requested scopes
	 * @returns A promise that resolves when the consent has been processed and saved
	 * @throws {DenyConsentError} When the user denies consent
	 */

	@LogContextMethod()
	public async execute(userId: string, decision: ConsentDecisionDTO): Promise<void> {
		this.logger.info('Processing consent decision', { userId, clientId: decision.clientId, decision: decision.decision });

		// Handle denial
		if (decision.decision === 'deny') {
			this.logger.info('User denied consent', {
				userId,
				clientId: decision.clientId,
			});
			throw new DenyConsentError();
		}

		// User approved - create/update consent
		const requestedScopes = decision.scope ? decision.scope.split(' ') : ['read'];

		const consent = ConsentEntity.create({
			id: this.uuid.generate(),
			userId,
			clientId: decision.clientId,
			scopes: requestedScopes,
			grantedAt: new Date(),
			expiresAt: null, // No expiration for now (F3 can add expiration logic)
			revokedAt: null,
		});

		await this.repository.save(consent);

		this.logger.info('Consent granted and saved', {
			userId,
			clientId: decision.clientId,
			scopes: requestedScopes,
			consentId: consent.id,
		});
	}
}
