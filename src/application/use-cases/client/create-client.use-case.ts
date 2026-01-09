import { getRandomValues } from 'crypto';

import { ClientEntity } from '@domain';
import { CreateClientRequestDTO, CreateClientResponseDTO } from '@application';
import { ConflictError, Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { IClientRepository, ICreateClientUseCase, IHashService, ILogger, IUuid } from '@interfaces';

/**
 * Use case for creating a new OAuth 2.0 client.
 *
 * Handles the complete workflow of generating and securely storing a new OAuth client,
 * including unique client ID generation, cryptographically secure secret generation,
 * and secret hashing before persistence.
 *
 * @implements {ICreateClientUseCase}
 *
 * @example
 * ```typescript
 * const useCase = new CreateClientUseCase(
 *   repository,
 *   hashService,
 *   uuidService,
 *   logger
 * );
 *
 * const response = await useCase.execute(userId, {
 *   clientName: 'My App',
 *   redirectUris: ['https://example.com/callback']
 * });
 * ```
 */

@LogContextClass()
@Injectable({ name: 'CreateClientUseCase', depends: ['ClientRepository', 'HashService', 'Uuid', 'Logger'] })
export class CreateClientUseCase implements ICreateClientUseCase {
	constructor(
		private readonly repository: IClientRepository,
		private readonly hashService: IHashService,
		private readonly uuid: IUuid,
		private readonly logger: ILogger
	) {}

	/**
	 * Creates a new OAuth 2.0 client for the specified user.
	 *
	 * Generates a unique client ID and secure client secret, hashes the secret for storage,
	 * and persists the client entity to the database. The plaintext client secret is only
	 * returned in this response and cannot be retrieved later.
	 *
	 * @param userId - The ID of the user creating the OAuth client
	 * @param request - The client creation request containing clientName and other client details
	 * @returns A promise that resolves to the created client response with the plaintext secret
	 * @throws {ConflictError} If the generated clientId already exists (paranoid check)
	 *
	 * @example
	 * const response = await createClientUseCase.execute('user-123', {
	 *   clientName: 'My App',
	 *   redirectUris: ['https://example.com/callback']
	 * });
	 * // Store clientSecret securely - it won't be shown again
	 */

	@LogContextMethod()
	public async execute(userId: string, request: CreateClientRequestDTO): Promise<CreateClientResponseDTO> {
		this.logger.debug('Creating OAuth client', { userId, clientName: request.clientName });

		// Generate unique clientId
		const clientId = this.uuid.generate();

		// Check clientId uniqueness (paranoid check)
		const exist = await this.repository.findByClientId(clientId);
		if (exist) {
			this.logger.error('Generated clientId already exists', { clientId });
			throw new ConflictError('Failed to generate unique client ID, please try again');
		}

		// Generate secure client secret (32 random chars)
		const clientSecret = this.generateSecureSecret();

		// Hash client secret
		const clientSecretHash = await this.hashService.hashPassword(clientSecret);

		// Create entity
		const client = ClientEntity.create({
			...request,
			id: this.uuid.generate(),
			clientId,
			clientSecret: clientSecretHash,
			isActive: true,
			userId,
			grantTypes: request.grantTypes ?? ['authorization_code', 'refresh_token'],
		});

		// Save to database
		await this.repository.save(client);

		this.logger.info('OAuth client created successfully', {
			id: client.id,
			clientId: client.clientId,
			userId: client.userId,
			clientName: client.clientName,
		});

		// Return response with plaintext secret (ONLY time it's shown)
		return CreateClientResponseDTO.fromEntity(client, clientSecret);
	}

	/**
	 * Generates a cryptographically secure random secret string.
	 *
	 * The secret consists of 32 characters, each randomly selected from
	 * the set of uppercase and lowercase letters, digits, hyphens, and underscores.
	 * Utilizes the Web Crypto API to ensure strong randomness.
	 *
	 * @returns {string} A securely generated 32-character secret string.
	 */

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
