import type { IClientRepository, ILogger, IValidateClientUseCase } from '@interfaces';
import type { ValidateClientRequestDto, ValidateClientResponseDto } from '@application';
import { getErrMessage, HttpError, Injectable, InvalidClientError, LogContextClass, LogContextMethod } from '@shared';

/**
 * Use case for validating OAuth2 client credentials and configuration.
 *
 * This use case verifies that a client is properly registered, has valid redirect URIs,
 * and supports the requested grant type. It performs the following validations:
 * - Checks if the client exists in the repository
 * - Validates the redirect URI against the client's registered URIs
 * - Verifies the grant type is supported by the client
 *
 * @remarks
 * This class is part of the OAuth2 authorization flow and should be used during
 * the initial client validation phase before proceeding with token generation.
 *
 * @throws {InvalidClientError} When the client is not found, has an invalid redirect URI,
 * or uses an unsupported grant type
 *
 * @example
 * ```typescript
 * const useCase = new ValidateClientUseCase(clientRepository, logger);
 * const result = await useCase.execute({
 *   clientId: 'my-client-id',
 *   redirectUri: 'https://example.com/callback',
 *   grantType: 'authorization_code'
 * });
 * ```
 */

@LogContextClass()
@Injectable({ name: 'ValidateClientUseCase', depends: ['ClientRepository', 'Logger'] })
export class ValidateClientUseCase implements IValidateClientUseCase {
	constructor(
		private readonly repository: IClientRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Validates an OAuth2 client by verifying its existence, redirect URI, and grant type support.
	 *
	 * @param data - The validation request containing clientId, redirectUri, and grantType
	 * @returns A promise that resolves to the validated client information including clientId,
	 *          clientName, isPublic flag, redirectUris, and grantTypes
	 * @throws {InvalidClientError} When the client is not found, redirect URI is invalid,
	 *         or grant type is not supported
	 * @throws {HttpError} When an HTTP-related error occurs during validation
	 *
	 * @remarks
	 * This method performs the following validations:
	 * 1. Checks if the client exists in the repository
	 * 2. Validates the provided redirect URI against the client's registered URIs
	 * 3. Verifies the requested grant type is supported by the client
	 *
	 * All validation steps are logged for debugging and monitoring purposes.
	 */

	@LogContextMethod()
	public async execute(data: ValidateClientRequestDto): Promise<ValidateClientResponseDto> {
		this.logger.debug('Validating OAuth client', { clientId: data.clientId });

		try {
			// look for if the client is registered
			const client = await this.repository.findByClientId(data.clientId);

			if (!client) {
				this.logger.warn('Client not found', { clientId: data.clientId });
				throw new InvalidClientError('Invalid client');
			}

			// validate the redirection url and the grand type.
			if (!client.isValidRedirectUri(data.redirectUri)) {
				this.logger.warn('Invalid redirect URI', { clientId: data.clientId, redirectUri: data.redirectUri });
				throw new InvalidClientError('Invalid redirect URI');
			}

			if (!client.supportsGrandType(data.grantType)) {
				this.logger.warn('Unsupported grand type', { clientId: data.clientId, grandType: data.grantType });
				throw new InvalidClientError('Unsupported grand type');
			}

			if (!client.isActive) {
				this.logger.warn('Client inactive', { clientId: data.clientId, grandType: data.grantType });
				throw new InvalidClientError('Client inactive');
			}

			//We return the validated client
			const { clientId, clientName, isPublic, redirectUris, grantTypes } = client;

			this.logger.debug('Client validate successfully', { clientId, clientName });

			return { clientId, clientName, isPublic, redirectUris, grantTypes };
		} catch (error) {
			if (!(error instanceof HttpError)) {
				this.logger.error('Unexpected error validating client', { err: getErrMessage(error), clientId: data.clientId });
			}

			throw error;
		}
	}
}
