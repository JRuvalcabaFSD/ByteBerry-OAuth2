import * as Errors from '@shared';
import * as Interfaces from '@interfaces';

import { CodeVerifierVO } from '@domain';
import { TokenRequestDTO, TokenResponseDTO } from '@application';
import { LogContextClass, LogContextMethod, Injectable } from '@shared';

/**
 * Use case for exchanging an authorization code for an access token in the OAuth2 flow.
 *
 * This class implements the token exchange endpoint of the OAuth2 authorization code grant type.
 * It validates the authorization code, verifies PKCE (Proof Key for Code Exchange), and generates
 * a JWT access token for authenticated users.
 *
 * @implements {Interfaces.IExchangeTokenUseCase}
 *
 * @remarks
 * The token exchange process includes the following validations:
 * - Authorization code existence and expiration
 * - Authorization code single-use enforcement (replay attack prevention)
 * - Client ID validation
 * - Redirect URI matching
 * - PKCE code verifier validation
 * - User account status verification
 *
 * @example
 * ```typescript
 * const useCase = new ExchangeTokenUseCase(
 *   codeRepository,
 *   userRepository,
 *   clientRepository,
 *   jwtService,
 *   pkceVerifier,
 *   logger,
 *   config
 * );
 *
 * const tokenResponse = await useCase.execute({
 *   code: 'auth_code_123',
 *   clientId: 'client_123',
 *   redirectUri: 'https://example.com/callback',
 *   codeVerifier: 'verifier_string'
 * });
 * ```
 */

@LogContextClass()
@Injectable({
	name: 'ExchangeTokenUseCase',
	depends: ['CodeRepository', 'UserRepository', 'ClientRepository', 'JwtService', 'PkceVerifierUseCase', 'Logger', 'Config'],
})
export class ExchangeTokenUseCase implements Interfaces.IExchangeTokenUseCase {
	public readonly expiresIn: number;

	constructor(
		public readonly codeRepository: Interfaces.ICodeRepository,
		public readonly userRepository: Interfaces.IUserRepository,
		public readonly clientRepository: Interfaces.IClientRepository,
		public readonly jwtService: Interfaces.IJwtService,
		public readonly pkceVerifier: Interfaces.IPkceVerifierUseCase,
		public readonly logger: Interfaces.ILogger,
		config: Interfaces.IConfig
	) {
		this.expiresIn = config.jwtAccessTokenExpiresIn || 900;
	}

	/**
	 * Exchanges an authorization code for an access token following the OAuth 2.0 authorization code flow with PKCE.
	 *
	 * This method performs the following validations and operations:
	 * - Verifies the authorization code exists and is valid
	 * - Checks the code has not expired
	 * - Ensures the code has not been previously used (prevents replay attacks)
	 * - Validates the client ID matches the one from the authorization request
	 * - Verifies the redirect URI matches (if provided in original request)
	 * - Performs PKCE verification using the code verifier
	 * - Validates the user exists and can login
	 * - Marks the authorization code as used
	 * - Generates a JWT access token with user claims
	 *
	 * @param request - The token request containing the authorization code, client credentials, redirect URI, and PKCE code verifier
	 * @returns A promise that resolves to a TokenResponseDTO containing the access token, expiration time, and scope
	 * @throws {Errors.InvalidCodeError} If the authorization code is invalid, expired, already used, or PKCE verification fails
	 * @throws {Errors.InvalidClientError} If the client ID doesn't match the authorization code's client ID
	 * @throws {Errors.InvalidUser} If the user associated with the authorization code is not found
	 * @throws {Errors.InvalidCreationTokenError} If an unexpected error occurs during token generation
	 */

	@LogContextMethod()
	public async execute(request: TokenRequestDTO): Promise<TokenResponseDTO> {
		this.logger.info('Starting token exchange', {
			code: request.code.substring(0, 10) + '...',
			clientId: request.clientId,
		});

		try {
			// Find authorization code
			const authCode = await this.codeRepository.findByCode(request.code);
			if (!authCode) {
				this.logger.warn('Authorization code not found', {
					code: request.code.substring(0, 10) + '...',
				});
				throw new Errors.InvalidCodeError('Invalid authorization code');
			}

			//Validate authorization code not expired
			if (authCode.isExpired()) {
				this.logger.warn('Authorization code expired', {
					code: request.code.substring(0, 10) + '...',
					expiresAt: authCode.expiresAt,
				});
				throw new Errors.InvalidCodeError('Authorization code has expired');
			}

			//Validate authorization code not already used
			if (authCode.isUsed()) {
				this.logger.error('Authorization code already used - potential replay attack', {
					code: request.code.substring(0, 10) + '...',
					userId: authCode.userId,
					clientId: authCode.clientId.getValue(),
				});
				throw new Errors.InvalidCodeError('Authorization code already been used');
			}

			//Validate client_id matches
			if (authCode.clientId.getValue() !== request.clientId) {
				this.logger.error('Client ID mismatch', {
					expected: authCode.clientId.getValue(),
					received: request.clientId,
				});

				throw new Errors.InvalidClientError('Invalid client credentials');
			}

			//Validate redirect_uri matches (if provided in original request)
			if (authCode.redirectUri !== request.redirectUri) {
				this.logger.error('Redirect URI mismatch', {
					expected: authCode.redirectUri,
					received: request.redirectUri,
				});
				throw new Errors.InvalidCodeError('Redirect URI mismatch');
			}

			// Verify PKCE code
			const codeVerifier = CodeVerifierVO.create(request.codeVerifier);
			const isValidPKCE = this.pkceVerifier.verify(authCode.codeChallenge, codeVerifier.getValue());

			if (!isValidPKCE) {
				this.logger.error('PKCE verification failed', {
					code: request.code.substring(0, 10) + '...',
					method: authCode.codeChallenge.getMethod(),
				});
				throw new Errors.InvalidCodeError('Invalid code verifier (PKCE verificación failed');
			}

			this.logger.debug('PKCE verification successful', {
				method: authCode.codeChallenge.getMethod(),
			});

			// Load user data for JWT claims
			const user = await this.userRepository.findById(authCode.userId);

			if (!user) {
				this.logger.error('User not found for authorization code', {
					userId: authCode.userId,
				});
				throw new Errors.InvalidUser('User not found for authorization code');
			}

			if (!user.canLogin()) {
				this.logger.warn('User account is inactive', {
					userId: user.id,
					email: user.email,
				});
			}

			authCode.markAsUsed();
			await this.codeRepository.save(authCode);

			this.logger.info('Authorization code marked as used', {
				code: request.code.substring(0, 10) + '...',
			});

			//Generate JQT access token
			const accessToken = this.jwtService.generateAccessToken({
				sub: user.id,
				email: user.email,
				username: user.username,
				roles: user.roles,
				scope: authCode.scope || 'read',
				client_id: request.clientId,
			});

			const response = TokenResponseDTO.create({ accessToken, expiresIn: this.expiresIn, scope: authCode.scope || 'read' });

			this.logger.info('Token exchange successful', {
				userId: user.id,
				email: user.email,
				clientId: request.clientId,
				scope: authCode.scope,
				expiresIn: this.expiresIn,
			});

			return response;
		} catch (error) {
			if (error instanceof Errors.HttpError) throw error;

			this.logger.error('Unexpected error during token exchange', { error: Errors.getErrMessage(error) });

			throw new Errors.InvalidCreationTokenError('Token exchange failed');
		}
	}
}
