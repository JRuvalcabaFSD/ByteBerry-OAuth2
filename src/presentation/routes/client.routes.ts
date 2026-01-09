import { ClientController } from '@presentation';
import { Router } from 'express';

export function createClientRoutes(controller: ClientController): Router {
	const router = Router();
	router.post('/', controller.create);
	return router;
}
