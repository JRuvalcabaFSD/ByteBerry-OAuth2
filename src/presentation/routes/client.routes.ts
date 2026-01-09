import { ClientController } from '@presentation';
import { Router } from 'express';

//TODO documentar
export function createClientRoutes(controller: ClientController): Router {
	const router = Router();
	router.post('/', controller.create);
	router.get('/', controller.list);
	router.get('/:id', controller.getById);
	router.put('/:id', controller.update);
	return router;
}
