import { randomBytes } from 'crypto';

import { CodeRequestDTO, CodeResponseDTO } from '@application';
import { AppError, ClientIdVO, CodeChallengeVO, CodeEntity } from '@domain';
import { ConsentRequiredError, getErrMessage, Injectable, LogContextClass, LogContextMethod } from '@shared';
import type {
	ICheckConsentUseCase,
	ICodeRepository,
	IConfig,
	IGenerateAuthCodeUseCase,
	ILogger,
	IValidateClientUseCase,
} from '@interfaces';

/**
 * Use case for generating OAuth 2.0 authorization codes.
 *
 * This use case handles the generation of authorization codes as part of the OAuth 2.0
 * authorization code flow. It validates the client, creates a secure authorization code,
 * and stores it with associated metadata including PKCE challenge information.
 *
 * @remarks
 * The authorization code has a configurable expiration time (default: 1 minute) and is
 * generated using cryptographically secure random bytes. The code is associated with
 * a specific user, client, and optional PKCE code challenge for enhanced security.
 *
 * @example
 * ```typescript
 * const useCase = new GenerateAuthCodeUseCase(
 *   codeRepository,
 *   validateClientUseCase,
 *   logger,
 *   config
 * );
 *
 * const response = await useCase.execute(userId, {
 *   clientId: 'my-client-id',
 *   redirectUri: 'https://example.com/callback',
 *   codeChallenge: 'challenge-string',
 *   codeChallengeMethod: 'S256',
 *   state: 'random-state'
 * });
 * ```
 */

@LogContextClass()
@Injectable({
	name: 'GenerateCodeUseCase',
	depends: ['CodeRepository', 'ValidateClientUseCase', 'CheckConsentUseCase', 'Logger', 'Config'],
})
export class GenerateAuthCodeUseCase implements IGenerateAuthCodeUseCase {
	private readonly expirationMinutes: number;

	constructor(
		private readonly repository: ICodeRepository,
		private readonly validateClient: IValidateClientUseCase,
		private readonly checkConsent: ICheckConsentUseCase,
		private readonly logger: ILogger,
		readonly config: IConfig
	) {
		this.expirationMinutes = config.oauth2AuthCodeExpiresIn ?? 1;
	}

	/**
	 * Generates an OAuth 2.0 authorization code for a user.
	 *
	 * Validates the client credentials and user consent before generating a secure authorization code.
	 * The code is stored in the repository and returned along with the state parameter.
	 *
	 * @param userId - The unique identifier of the user requesting authorization
	 * @param request - The authorization code request containing clientId, redirectUri, scope, codeChallenge, codeChallengeMethod, and state
	 * @returns A promise that resolves to a CodeResponseDTO containing the generated authorization code and state
	 * @throws {Error} Throws 'CONSENT_REQUIRED' error if the user has not granted consent for the requested scopes
	 * @throws {AppError} Throws application-specific errors for client validation or repository failures
	 * @throws {Error} Throws unexpected errors during the authorization code generation process
	 */

	@LogContextMethod()
	public async execute(userId: string, request: CodeRequestDTO): Promise<CodeResponseDTO> {
		this.logger.debug('Generating authorization code', { userId, clientId: request });

		try {
			// Validate and obtain customer information
			const clientInfo = await this.validateClient.execute({
				clientId: request.clientId,
				redirectUri: request.redirectUri,
				grantType: 'authorization_code',
			});

			this.logger.debug('Client validated for authorization', {
				clientId: clientInfo.clientId,
				redirectUri: clientInfo.redirectUris,
				grandType: clientInfo.grantTypes,
			});

			// Validate consents
			const requestedScopes = request.scope ? request.scope.split(' ') : [];
			const hasConsent = await this.checkConsent.execute(userId, request.clientId, requestedScopes);

			if (!hasConsent) {
				this.logger.info('User consent required', {
					userId,
					clientId: request.clientId,
					requestedScopes,
				});

				// En F2, simplemente lanzamos un error indicando que se necesita consent
				// TODO En F3, esto redirigirá a la pantalla de consent
				throw new ConsentRequiredError(); // Error especial para indicar que se necesita consent
			}

			this.logger.debug('User has valid consent, proceeding with code generation', {
				userId,
				clientId: request.clientId,
			});

			// Generate clientId and codeChallenge
			const clientId = ClientIdVO.create(clientInfo.clientId);
			const codeChallenge = CodeChallengeVO.create(request.codeChallenge, request.codeChallengeMethod);

			const code = randomBytes(32).toString('base64');

			//Generate the entity
			const authCode = CodeEntity.create({
				...request,
				code,
				clientId,
				userId,
				codeChallenge,
				expirationMinutes: this.expirationMinutes,
			});

			// Save the entity
			await this.repository.save(authCode);

			// Return authorization object
			this.logger.debug('Authorization code generated', {
				userId,
				clientId: request.clientId,
				code: code.substring(0, 8) + '...', // Log only prefix for security
				expiresAt: authCode.expiresAt.toISOString(),
			});

			return new CodeResponseDTO(code, request.state);
		} catch (error) {
			if (!(error instanceof AppError)) {
				this.logger.error('Unexpected error generating authorization code', { error: getErrMessage(error), client_id: request.clientId });
			}

			throw error;
		}
	}
}
