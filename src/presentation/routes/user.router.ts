import { RequestHandler, Router } from 'express';

import { UserController } from '@presentation';

//TODO documentar
export function createUserRoutes(controller: UserController, requireSession: RequestHandler): Router {
	const router = Router();
	router.post('/', controller.register);
	router.put('/me', requireSession, controller.updateMe);
	router.get('/me', requireSession, controller.getMe);
	return router;
}
