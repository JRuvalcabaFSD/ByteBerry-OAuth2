import { ClientEntity } from '@domain';
import type { IClientRepository, ILogger, IUpdateClientUseCase } from '@interfaces';
import { ForbiddenError, Injectable, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';
import { UpdateClientRequestDTO, ClientResponseDTO } from 'src/application/dtos/client-dtos.js';

/**
 * Use case for updating an existing OAuth2 client.
 *
 * This use case handles the logic for updating client details with the following steps:
 * 1. Retrieves the existing client by ID
 * 2. Verifies that the requesting user owns the client
 * 3. Creates an updated client entity using an immutable approach
 * 4. Persists the changes to the repository
 * 5. Returns the updated client as a response DTO
 *
 * @implements {IUpdateClientUseCase}
 *
 * @example
 * ```typescript
 * const useCase = new UpdateClientUseCase(clientRepository, logger);
 * const updatedClient = await useCase.execute(userId, clientId, updateRequest);
 * ```
 */

@LogContextClass()
@Injectable({ name: 'UpdateClientUseCase', depends: ['ClientRepository', 'Logger'] })
export class UpdateClientUseCase implements IUpdateClientUseCase {
	constructor(
		private readonly repository: IClientRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Updates an existing OAuth2 client for a given user.
	 *
	 * @param userId - The ID of the user attempting to update the client
	 * @param clientId - The ID of the client to update
	 * @param request - The update request containing the new client data
	 * @returns A promise that resolves to the updated client response DTO
	 * @throws {NotFoundRecordError} If the client with the given ID does not exist
	 * @throws {ForbiddenError} If the user does not own the client being updated
	 */

	@LogContextMethod()
	public async execute(userId: string, clientId: string, request: UpdateClientRequestDTO): Promise<ClientResponseDTO> {
		this.logger.info('Updating client', { userId, clientId });

		// 1. Find the existing client
		const existingClient = await this.repository.findByClientId(clientId);

		if (!existingClient) {
			this.logger.warn('Client not found for update', { userId, clientId });
			throw new NotFoundRecordError('Client not found');
		}

		// 2. Verify ownership
		if (!existingClient.isOwnedBy(userId)) {
			this.logger.warn('User attempted to update client they do not own', {
				userId,
				clientId,
				ownerId: existingClient.userId,
			});
			throw new ForbiddenError('You do not have permission to update this client');
		}

		// 3. Create updated entity (immutable approach)
		const updatedClient = ClientEntity.create({
			...existingClient,
			clientName: request.clientName ?? existingClient.clientName,
			redirectUris: request.redirectUris ?? existingClient.redirectUris,
			grantTypes: request.grantTypes ?? existingClient.grantTypes,
			isPublic: request.isPublic ?? existingClient.isPublic,
			updatedAt: new Date(),
		});

		// 4. Persist the updated client
		await this.repository.update(updatedClient);

		this.logger.info('Client updated successfully', {
			userId,
			clientId,
			updatedFields: Object.keys(request),
		});

		// 5. Return response DTO
		return ClientResponseDTO.fromEntity(updatedClient);
	}
}
