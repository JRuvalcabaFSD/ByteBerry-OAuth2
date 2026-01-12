import { ListConsentsResponseDTO } from '@application';
import type { IClientRepository, IConsentRepository, IListConsentsUseCase, ILogger } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Use case for listing all consents granted by a user.
 *
 * This use case retrieves all active consents for a given user and enriches them
 * with client information (client names) by fetching from the client repository.
 *
 * @implements {IListConsentsUseCase}
 *
 * @example
 * const useCase = new ListConsentUseCase(consentRepository, clientRepository, logger);
 * const response = await useCase.execute('user-123');
 */

@LogContextClass()
@Injectable({ name: 'ListConsentsUseCase', depends: ['ConsentRepository', 'ClientRepository', 'Logger'] })
export class ListConsentUseCase implements IListConsentsUseCase {
	constructor(
		private readonly consentRepository: IConsentRepository,
		private readonly clientRepository: IClientRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Retrieves all active consents for a user and enriches them with client information.
	 *
	 * @param userId - The unique identifier of the user whose consents should be listed
	 * @returns A promise that resolves to a DTO containing the user's consents enriched with client names
	 * @throws May log warnings if individual client details fail to fetch, but does not throw
	 *
	 * @remarks
	 * - Returns an empty response if no consents are found for the user
	 * - Fetches unique client details in parallel to enrich consent data
	 * - Non-fatal errors during client name fetching are logged as warnings and do not interrupt the operation
	 * - All logs include relevant context (userId, consent count, unique clients)
	 */

	@LogContextMethod()
	public async execute(userId: string): Promise<ListConsentsResponseDTO> {
		this.logger.debug('Listing user consents', { userId });

		// Get all active consents for the user
		const consents = await this.consentRepository.findByUserId(userId);

		if (!consents || consents.length === 0) {
			this.logger.debug('No consents found for user', { userId });
			return ListConsentsResponseDTO.fromEntities([], new Map());
		}

		// Get unique client IDs
		const clientIds = [...new Set(consents.map((c) => c.clientId))];

		// Fetch client names for enrichment
		const clientNames = new Map<string, string>();

		await Promise.all(
			clientIds.map(async (clientId) => {
				try {
					const client = await this.clientRepository.findByClientId(clientId);

					if (client) {
						clientNames.set(clientId, client.clientName);
					}
				} catch (error) {
					this.logger.warn('Failed to fetch client name', {
						clientId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			})
		);

		this.logger.debug('User consents retrieved successfully', {
			userId,
			count: consents.length,
			uniqueClients: clientIds.length,
		});

		return ListConsentsResponseDTO.fromEntities(consents, clientNames);
	}
}
