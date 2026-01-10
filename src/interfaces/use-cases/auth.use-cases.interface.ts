import * as Dtos from '@application';

import { CodeChallengeVO } from '@domain';
import { JwksResponse } from '@interfaces';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		LoginUseCase: ILoginUseCase;
		GenerateCodeUseCase: IGenerateAuthCodeUseCase;
		PkceVerifierUseCase: IPkceVerifierUseCase;
		ExchangeTokenUseCase: IExchangeTokenUseCase;
		GetJwksUseCase: IGetJwksUseCase;
		CheckConsentUseCase: ICheckConsentUseCase;
		ShowConsentUseCase: IShowConsentUseCase;
	}
}

/**
 * Use case interface for user login operations.
 *
 * @remarks
 * This interface defines the contract for executing login functionality,
 * accepting login credentials and returning authentication tokens or user session data.
 *
 * @method execute - Executes the login process with the provided request data.
 * @param request - The login request data transfer object containing user credentials.
 * @returns A promise that resolves to the login response data transfer object.
 *
 * @public
 */

export interface ILoginUseCase {
	execute(request: Dtos.LoginRequestDTO): Promise<Dtos.LoginResponseDTO>;
}

/**
 * Use case interface for generating OAuth 2.0 authorization codes.
 *
 * @remarks
 * This interface defines the contract for generating authorization codes in the OAuth 2.0 flow.
 * The authorization code is typically generated during the authorization step and later exchanged
 * for access tokens.
 *
 * @interface IGenerateAuthCodeUseCase
 */

export interface IGenerateAuthCodeUseCase {
	execute(userId: string, request: Dtos.CodeRequestDTO): Promise<Dtos.CodeResponseDTO>;
}

/**
 * Use case interface for verifying PKCE (Proof Key for Code Exchange) code verifiers.
 *
 * This interface defines the contract for validating that a code verifier matches
 * a previously generated code challenge, which is a critical security step in the
 * OAuth 2.0 PKCE flow.
 *
 * @interface IPkceVerifierUseCase
 *
 * @example
 * ```typescript
 * class PkceVerifierUseCase implements IPkceVerifierUseCase {
 *   verify(challenge: CodeChallengeVO, verifier: string): boolean {
 *     // Implementation to verify the code challenge against the verifier
 *     return true;
 *   }
 * }
 * ```
 */

export interface IPkceVerifierUseCase {
	verify(challenge: CodeChallengeVO, verifier: string): boolean;
}

/**
 * Use case interface for exchanging authorization codes or refresh tokens for access tokens.
 *
 * @remarks
 * This interface defines the contract for implementing OAuth2 token exchange operations.
 * It handles the business logic for processing token requests and returning appropriate
 * token responses according to OAuth2 specifications.
 *
 * @example
 * ```typescript
 * class ExchangeTokenUseCase implements IExchangeTokenUseCase {
 *   async execute(request: TokenRequestDTO): Promise<TokenResponseDTO> {
 *     // Implementation logic
 *   }
 * }
 * ```
 */

export interface IExchangeTokenUseCase {
	execute(request: Dtos.TokenRequestDTO): Promise<Dtos.TokenResponseDTO>;
}

/**
 * Use case interface for retrieving JSON Web Key Set (JWKS).
 *
 * This interface defines the contract for a use case that fetches the JWKS,
 * which contains the public keys used to verify JWT tokens.
 *
 * @interface IJwksServiceUseCase
 * @example
 * ```typescript
 * class JwksService implements IJwksServiceUseCase {
 *   async execute(): Promise<JwksResponse> {
 *     // Implementation to fetch JWKS
 *   }
 * }
 * ```
 */

export interface IGetJwksUseCase {
	execute(): Promise<JwksResponse>;
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
	execute(request: Dtos.CodeRequestDTO): Promise<Dtos.ConsentScreenData>;
}
