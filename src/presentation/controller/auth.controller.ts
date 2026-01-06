import { NextFunction, Request, Response } from 'express';

import { Injectable, InvalidCodeError } from '@shared';
import { CodeRequestDTO, TokenRequestDTO } from '@application';
import type { IExchangeTokenUseCase, IGenerateAuthCodeUseCase } from '@interfaces';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		AuthController: AuthController;
		tokenController: TokenController;
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

@Injectable({ name: 'AuthController', depends: ['GenerateCodeUseCase'] })
export class AuthController {
	constructor(private readonly useCase: IGenerateAuthCodeUseCase) {}

	public handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const request = CodeRequestDTO.fromQuery(req.query as Record<string, string>);
			const userId = req.user?.userId;

			if (!userId) throw new InvalidCodeError('Authentication required');

			const response = this.useCase.execute(userId, request);
			const redirectUri = (await response).buildRedirectURrl(request.redirectUri);

			res.redirect(redirectUri);
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
