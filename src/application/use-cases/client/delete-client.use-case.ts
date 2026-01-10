import type { IClientRepository, IDeleteClientUseCase, ILogger } from '@interfaces';
import { ForbiddenError, Injectable, LogContextClass, LogContextMethod, NotFoundRecordError } from '@shared';

/**
 * Use case for soft deleting an OAuth client.
 *
 * Performs a soft delete operation on an OAuth client by marking it as inactive.
 * Includes ownership verification and checks to prevent deleting already-deleted clients.
 *
 * @implements {IDeleteClientUseCase}
 */

@LogContextClass()
@Injectable({ name: 'DeleteClientUseCase', depends: ['ClientRepository', 'Logger'] })
export class DeleteClientUseCase implements IDeleteClientUseCase {
	constructor(
		private readonly repository: IClientRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Soft deletes an OAuth client for the specified user.
	 *
	 * @param userId - The ID of the user requesting the deletion
	 * @param clientId - The ID of the OAuth client to delete
	 * @returns A promise that resolves when the client has been soft deleted
	 * @throws {NotFoundRecordError} If the client with the given clientId does not exist
	 * @throws {ForbiddenError} If the user does not own the client
	 * @remarks
	 * - This operation performs a soft delete, marking the client as inactive
	 * - If the client is already inactive, the method returns without performing any action
	 * - The method verifies that the user owns the client before allowing deletion
	 */

	@LogContextMethod()
	public async execute(userId: string, clientId: string): Promise<void> {
		this.logger.debug('Soft deleting OAuth client', { userId, clientId });

		// Find the existing client
		const existingClient = await this.repository.findByClientId(clientId);

		if (!existingClient) {
			this.logger.warn('Client not found for deletion', { userId, clientId });
			throw new NotFoundRecordError('Client not found');
		}

		// Verify ownership
		if (!existingClient.isOwnedBy(userId)) {
			this.logger.warn('User attempted to delete client they do not own', {
				userId,
				clientId,
				ownerId: existingClient.userId,
			});
			throw new ForbiddenError('You do not have permission to delete this client');
		}

		// Check if already deleted
		if (!existingClient.isClientActive()) {
			this.logger.debug('Client already inactive (soft deleted)', { userId, clientId });
			return;
		}

		// Perform soft delete
		await this.repository.softDelete(clientId);

		this.logger.debug('OAuth client soft deleted successfully', {
			userId,
			clientId,
			clientName: existingClient.clientName,
		});
	}
}
