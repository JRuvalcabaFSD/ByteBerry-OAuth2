import { NextFunction, Request, Response } from 'express';

import { ConsentRequiredError, Injectable, InvalidCodeError } from '@shared';
import { CodeRequestDTO, ConsentDecisionDTO, TokenRequestDTO } from '@application';
import type {
	IConfig,
	IExchangeTokenUseCase,
	IGenerateAuthCodeUseCase,
	IGetJwksUseCase,
	IProcessConsentUseCase,
	IShowConsentUseCase,
} from '@interfaces';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		authController: AuthController;
		tokenController: TokenController;
		jwksController: JwksController;
	}
}

/**
 * Controller responsible for handling OAuth2 authorization requests.
 *
 * This controller processes incoming authorization requests, validates the authenticated user,
 * generates authorization codes through the use case, and redirects the client to the
 * specified redirect URI with the authorization response.
 *
 * @class AuthController
 *
 * @example
 * ```typescript
 * const authController = new AuthController(generateAuthCodeUseCase);
 * app.get('/oauth/authorize', authController.handle);
 * ```
 */

@Injectable({ name: 'authController', depends: ['GenerateCodeUseCase', 'ShowConsentUseCase', 'ProcessConsentUseCase', 'Config'] })
export class AuthController {
	private readonly version: string;
	constructor(
		private readonly codeUseCase: IGenerateAuthCodeUseCase,
		private readonly showConsentUseCase: IShowConsentUseCase,
		private readonly processConsentUseCase: IProcessConsentUseCase,
		config: IConfig
	) {
		this.version = config.version;
	}

	public authorize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const request = CodeRequestDTO.fromQuery(req.query as Record<string, string>);
		try {
			const userId = req.user!.userId;

			const response = this.codeUseCase.execute(userId, request);
			const redirectUri = (await response).buildRedirectURrl(request.redirectUri);

			res.redirect(redirectUri);
		} catch (error) {
			if (error instanceof ConsentRequiredError) {
				// ✅ F2: Return simple response indicating consent is needed
				// F3: Will redirect to consent screen HTML
				res.status(200).json({
					message: 'Consent required',
					consentUrl: `/auth/authorize/consent?${new URLSearchParams(req.query as Record<string, string>).toString()}`,
					clientId: request.clientId,
					scopes: request.scope?.split(' ') || [],
				});
			}
			next(error);
		}
	};

	public showConsentScreen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;

			if (!userId) throw new InvalidCodeError('Authentication required');

			const request = CodeRequestDTO.fromQuery(req.query as Record<string, string>);
			const response = await this.showConsentUseCase.execute(request);

			return res.render('consent', {
				...response,
				userEmail: 'usuario@byteberry.dev',
				version: this.version,
				nonce: res.locals.nonce,
			});
		} catch (error) {
			next(error);
		}
	};

	public processConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const decision = ConsentDecisionDTO.fromBody(req.body);

			await this.processConsentUseCase.execute(userId, decision);
			const request = decision.toCodeRequest();
			const response = await this.codeUseCase.execute(userId, request);

			const redirectUrl = response.buildRedirectURrl(decision.redirectUri);
			res.redirect(redirectUrl);
		} catch (error) {
			next(error);
		}
	};
}

/**
 * Controller responsible for handling token exchange requests.
 *
 * This controller processes OAuth2 token exchange operations by:
 * - Receiving and validating token requests from the HTTP layer
 * - Delegating the token exchange logic to the use case
 * - Returning the appropriate HTTP response with the token data
 * - Forwarding any errors to the error handling middleware
 *
 * @class TokenController
 * @example
 * ```typescript
 * const tokenController = new TokenController(exchangeTokenUseCase);
 * router.post('/token', tokenController.handle);
 * ```
 */
@Injectable({ name: 'tokenController', depends: ['ExchangeTokenUseCase'] })
export class TokenController {
	constructor(private readonly useCase: IExchangeTokenUseCase) {}
	public handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const request = TokenRequestDTO.fromBody(req.body);
			const response = await this.useCase.execute(request);
			res.status(200).json(response.toJson());
		} catch (error) {
			next(error);
		}
	};
}

/**
 * Controller responsible for handling JWKS (JSON Web Key Set) endpoint requests.
 *
 * @remarks
 * This controller exposes the public keys used to verify JWT signatures.
 * It sets appropriate caching headers (1 hour) and security headers to optimize
 * performance and protect against MIME type sniffing attacks.
 *
 * @example
 * ```typescript
 * const jwksController = new JwksController(getJwksUseCase);
 * app.get('/.well-known/jwks.json', jwksController.handle);
 * ```
 */

@Injectable({ name: 'jwksController', depends: ['GetJwksUseCase'] })
export class JwksController {
	constructor(private readonly useCase: IGetJwksUseCase) {}

	public handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const jwks = await this.useCase.execute();
			res.set({ 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
			res.json(jwks);
		} catch (error) {
			next(error);
		}
	};
}
