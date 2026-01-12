import type { IClientRepository, IGetClientByIdUseCase, ILogger } from '@interfaces';
import { ForbiddenError, Injectable, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';
import { ClientResponseDTO } from 'src/application/dtos/client-dtos.js';

/**
 * Use case for retrieving an OAuth client by its ID.
 *
 * Retrieves a specific OAuth client and verifies that the requesting user owns it.
 * Throws an error if the client is not found or if the user does not have access to it.
 *
 * @implements {IGetClientByIdUseCase}
 *
 * @example
 * const useCase = new GetClientByIdUseCase(repository, logger);
 * const client = await useCase.execute(userId, clientId);
 */

@LogContextClass()
@Injectable({ name: 'GetClientByIdUseCase', depends: ['ClientRepository', 'Logger'] })
export class GetClientByIdUseCase implements IGetClientByIdUseCase {
	constructor(
		private readonly repository: IClientRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Retrieves an OAuth client by its ID and verifies ownership.
	 * @param userId - The ID of the user attempting to access the client
	 * @param clientId - The ID of the OAuth client to retrieve
	 * @returns A promise that resolves to a ClientResponseDTO containing the client data
	 * @throws {NotFoundRecordError} If the OAuth client does not exist
	 * @throws {ForbiddenError} If the user does not own the OAuth client
	 */

	@LogContextMethod()
	public async execute(userId: string, clientId: string): Promise<ClientResponseDTO> {
		this.logger.debug('Getting OAuth client', { userId, clientId });

		// Find client.
		const client = await this.repository.findByClientId(clientId);

		if (!client) {
			this.logger.warn('OAuth client not found', { clientId });
			throw new NotFoundRecordError('OAuth client not found');
		}

		// Verify ownership
		if (!client.isOwnedBy(userId)) {
			this.logger.warn("User attempted to access another user's OAuth client", {
				userId,
				clientId,
				ownerId: client.userId,
			});
			throw new ForbiddenError('You do not have access to this OAuth client');
		}

		return ClientResponseDTO.fromEntity(client);
	}
}
