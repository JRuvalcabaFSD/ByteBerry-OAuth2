import { RequestHandler, Router } from 'express';

import { AuthController, LoginController, TokenController } from '@presentation';

//TODO documentar
export function createAuthRoutes(
	loginCtl: LoginController,
	authCtl: AuthController,
	tokenCtl: TokenController,
	requireSession: RequestHandler
): Router {
	const router = Router();

	router.get('/login', loginCtl.getLoginForm);
	router.post('/login', loginCtl.login);
	router.get('/authorize', requireSession, authCtl.handle);
	router.post('/token', tokenCtl.handle);
	return router;
}
