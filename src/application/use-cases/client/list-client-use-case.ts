import type { IClientRepository, IListClientUseCase, ILogger } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';
import { ListClientResponseDTO } from 'src/application/dtos/client-dtos.js';

/**
 * Use case for listing OAuth clients associated with a user.
 *
 * Retrieves all OAuth clients owned by a specific user and returns them
 * as a formatted response DTO. Includes logging for debugging and monitoring purposes.
 *
 * @implements {IListClientUseCase}
 *
 * @example
 * const useCase = new ListClientUseCase(clientRepository, logger);
 * const response = await useCase.execute(userId);
 */

@LogContextClass()
@Injectable({ name: 'ListClientUseCase', depends: ['ClientRepository', 'Logger'] })
export class ListClientUseCase implements IListClientUseCase {
	constructor(
		private readonly repository: IClientRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the list clients use case for a specific user.
	 * @param userId - The unique identifier of the user whose OAuth clients should be listed
	 * @returns A promise that resolves to a DTO containing the list of OAuth clients for the user
	 * @throws Will log debug and info messages during execution
	 */

	@LogContextMethod()
	public async execute(userId: string): Promise<ListClientResponseDTO> {
		this.logger.debug('Listing OAuth clients', { userId });

		const clients = await this.repository.findByUserId(userId);

		this.logger.info('OAuth clients retrieved', {
			userId,
			count: clients.length,
		});

		return ListClientResponseDTO.fromEntities(clients);
	}
}
