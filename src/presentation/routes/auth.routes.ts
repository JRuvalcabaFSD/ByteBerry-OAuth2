import { RequestHandler, Router } from 'express';

import { AuthController, JwksController, LoginController, TokenController } from '@presentation';

//TODO documentar
export function createAuthRoutes(
	loginCtl: LoginController,
	authCtl: AuthController,
	tokenCtl: TokenController,
	jwksCtl: JwksController,
	requireSession: RequestHandler
): Router {
	const router = Router();

	router.get('/login', loginCtl.getLoginForm);
	router.post('/login', loginCtl.login);
	router.get('/authorize', requireSession, authCtl.authorize);
	router.get('/authorize/consent', requireSession, authCtl.showConsentScreen);
	router.post('/authorize/decision', requireSession, authCtl.processConsent);
	router.post('/token', tokenCtl.handle);
	router.get('/.well-known/jwks.json', jwksCtl.handle);
	return router;
}
