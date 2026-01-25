import { RequestHandler, Router } from 'express';

import { UserController } from '@presentation';

//TODO documentar
export function createUserRoutes(controller: UserController, requireSession: RequestHandler): Router {
	const router = Router();
	router.post('/', controller.register);
	router.put('/me', requireSession, controller.updateMe);
	router.get('/me', requireSession, controller.getMe);
	router.put('/me/password', requireSession, controller.updatePassword);
	router.put('/me/upgrade/developer', requireSession, controller.upgradeToDeveloper);
	router.put('/me/upgrade/expenses', requireSession, controller.enableExpenses);
	router.get('/me/consents', requireSession, controller.listConsents);
	router.delete('/me/consents/:id', requireSession, controller.revokeConsent);
	return router;
}
