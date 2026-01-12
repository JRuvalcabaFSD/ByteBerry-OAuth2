import { Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { ILogger, IShowConsentUseCase, IValidateClientUseCase } from '@interfaces';
import { CodeRequestDTO, ConsentScreenData, ScopeDisplayDTO } from '@application';

/**
 * Use case for preparing and displaying the OAuth2 consent screen.
 *
 * This use case validates the client application and prepares the consent screen data
 * by retrieving client information and formatting the requested scopes for display.
 *
 * @implements {IShowConsentUseCase}
 *
 * @example
 * ```typescript
 * const useCase = new ShowConsentUseCase(validateClient, logger);
 * const consentData = await useCase.execute({
 *   clientId: 'my-app',
 *   redirectUri: 'https://example.com/callback',
 *   scope: 'read write'
 * });
 * ```
 */

@LogContextClass()
@Injectable({ name: 'ShowConsentUseCase', depends: ['ValidateClientUseCase', 'Logger'] })
export class ShowConsentUseCase implements IShowConsentUseCase {
	constructor(
		private readonly validateClient: IValidateClientUseCase,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the show consent use case.
	 * Prepares and returns consent screen data for the specified client and requested scopes.
	 *
	 * @param request - The code request DTO containing clientId, redirectUri, and optional scope
	 * @returns A promise that resolves to consent screen data including client information and scope details
	 * @throws Will throw an error if client validation fails
	 *
	 * @example
	 * const consentData = await showConsentUseCase.execute({
	 *   clientId: 'my-app',
	 *   redirectUri: 'https://myapp.com/callback',
	 *   scope: 'read write'
	 * });
	 */

	@LogContextMethod()
	public async execute(request: CodeRequestDTO): Promise<ConsentScreenData> {
		this.logger.debug('Preparing consent screen data', { clientId: request.clientId });

		// Validate client
		const clientInfo = await this.validateClient.execute({
			clientId: request.clientId,
			redirectUri: request.redirectUri,
			grantType: 'authorization_code',
		});

		// Parse scopes
		const requestedScopes = request.scope ? request.scope.split(' ') : ['read'];
		const scopeDisplayData = ScopeDisplayDTO.fromScopeNames(requestedScopes);

		this.logger.info('Consent screen data prepared', {
			clientId: clientInfo.clientId,
			clientName: clientInfo.clientName,
			scopesCount: scopeDisplayData.length,
		});

		return {
			...request,
			clientId: clientInfo.clientId,
			clientName: clientInfo.clientName,
			scopes: scopeDisplayData.map((s) => s.toObject()),
		};
	}
}
