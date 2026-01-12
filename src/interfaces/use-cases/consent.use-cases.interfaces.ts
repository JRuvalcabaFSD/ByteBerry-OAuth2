import { CodeRequestDTO, ConsentScreenData, ConsentDecisionDTO, ListConsentsResponseDTO } from '@application';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		CheckConsentUseCase: ICheckConsentUseCase;
		ShowConsentUseCase: IShowConsentUseCase;
		ProcessConsentUseCase: IProcessConsentUseCase;
		ListConsentsUseCase: IListConsentsUseCase;
	}
}

/**
 * Use case for checking if a user has granted consent for a client application.
 *
 * @interface ICheckConsentUseCase
 *
 * @method execute
 * @param {string} userId - The unique identifier of the user.
 * @param {string} clientId - The unique identifier of the client application.
 * @param {string[]} [requestedScopes] - Optional array of scopes requested by the client.
 * @returns {Promise<boolean>} A promise that resolves to true if the user has granted consent for the specified client and scopes, false otherwise.
 */

export interface ICheckConsentUseCase {
	execute(userId: string, clientId: string, requestedScopes?: string[]): Promise<boolean>;
}

/**
 * Use case interface for displaying the consent screen during OAuth 2.0 authorization flow.
 *
 * @interface IShowConsentUseCase
 *
 * @method execute - Processes a code request and returns the consent screen data to be displayed to the user.
 * @param request - The code request DTO containing authorization parameters
 * @returns A promise that resolves to the consent screen data
 */

export interface IShowConsentUseCase {
	execute(request: CodeRequestDTO): Promise<ConsentScreenData>;
}

/**
 * Use case interface for processing user consent decisions in OAuth2 flow.
 *
 * @interface IProcessConsentUseCase
 *
 * @method execute - Processes a user's consent decision and generates an authorization code.
 * @param userId - The unique identifier of the user making the consent decision.
 * @param decision - The consent decision details (approve/deny) provided by the user.
 * @returns A promise that resolves to a code response containing the authorization code or error details.
 *
 * @throws {Error} May reject if the consent processing fails or user validation fails.
 */

export interface IProcessConsentUseCase {
	execute(userId: string, decision: ConsentDecisionDTO): Promise<void>;
}

/**
 * Use case interface for listing consents associated with a user.
 *
 * @interface IListConsentsUseCase
 *
 * @method execute - Retrieves all consents for a specific user.
 * @param userId - The unique identifier of the user whose consents to retrieve.
 * @returns A promise that resolves to a {@link ListConsentsResponseDTO} containing the user's consent data.
 * @throws May throw an error if the user is not found or if a database error occurs.
 */

export interface IListConsentsUseCase {
	execute(userId: string): Promise<ListConsentsResponseDTO>;
}
