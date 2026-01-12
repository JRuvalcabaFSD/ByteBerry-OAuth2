import { ClientController } from '@presentation';
import { Router } from 'express';

/**
 * Creates a router with client-related endpoints.
 * @param controller - The ClientController instance to handle route logic
 * @returns A configured Express Router with the following endpoints:
 *   - POST / - Create a new client
 *   - GET / - List all clients
 *   - GET /:id - Get a client by ID
 *   - PUT /:id - Update a client by ID
 *   - DELETE /:id - Delete a client by ID
 *  - POST /:id/rotate-secret - Rotate the secret for a client by ID
 */

export function createClientRoutes(controller: ClientController): Router {
	const router = Router();
	router.post('/', controller.create);
	router.get('/', controller.list);
	router.get('/:id', controller.getById);
	router.put('/:id', controller.update);
	router.delete('/:id', controller.delete);
	router.post('/:id/rotate-secret', controller.rotate);
	return router;
}
