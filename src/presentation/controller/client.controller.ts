import { CreateClientRequestDTO, UpdateClientRequestDTO } from '@application';
import type * as UseCases from '@interfaces';
import { Injectable } from '@shared';
import { NextFunction, Request, Response } from 'express';

/**
 * Extends the ServiceMap interface to include the ClientController.
 * This allows for dependency injection and service resolution within the application.
 * @module @ServiceMap
 * @interface ServiceMap
 * @property {ClientController} ClientController - The controller responsible for handling client-related operations.
 *
 */
declare module '@ServiceMap' {
	interface ServiceMap {
		ClientController: ClientController;
	}
}

/**
 * Controller for managing OAuth2 clients.
 *
 * Handles HTTP requests related to OAuth2 client operations including creation,
 * retrieval, updating, deletion, and secret rotation. All operations are performed
 * within the context of an authenticated user.
 *
 * @class ClientController
 *
 * @example
 * // Usage in Express route setup
 * const controller = new ClientController(
 *   createUseCase,
 *   listUseCase,
 *   getUseCase,
 *   updateUseCase,
 *   deleteUseCase,
 *   rotateUseCase
 * );
 *
 * router.post('/clients', controller.create);
 * router.get('/clients', controller.list);
 * router.get('/clients/:id', controller.getById);
 * router.patch('/clients/:id', controller.update);
 * router.delete('/clients/:id', controller.delete);
 * router.post('/clients/:id/rotate-secret', controller.rotate);
 */

@Injectable({
	name: 'ClientController',
	depends: [
		'CreateClientUseCase',
		'ListClientUseCase',
		'GetClientByIdUseCase',
		'UpdateClientUseCase',
		'DeleteClientUseCase',
		'RotateSecretUseCase',
	],
})
export class ClientController {
	constructor(
		private readonly createUseCase: UseCases.ICreateClientUseCase,
		private readonly listUseCase: UseCases.IListClientUseCase,
		private readonly getUseCase: UseCases.IGetClientByIdUseCase,
		private readonly updateUseCase: UseCases.IUpdateClientUseCase,
		private readonly deleteUseCase: UseCases.IDeleteClientUseCase,
		private readonly rotateUseCase: UseCases.IRotateSecretUseCase
	) {}

	/**
	 * Creates a new OAuth2 client for the authenticated user.
	 *
	 * @param req - The Express request object containing the user context and client creation details in the body
	 * @param res - The Express response object used to send the created client data
	 * @param next - The Express next function for error handling
	 * @returns A promise that resolves when the response is sent
	 *
	 * @throws Passes errors to the next middleware for centralized error handling
	 *
	 * @example
	 * POST /clients
	 * Body: { name: "My App", redirectUris: ["https://example.com/callback"] }
	 * Response: 201 Created
	 */

	public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const request = CreateClientRequestDTO.fromBody(req.body);
			const response = this.createUseCase.execute(userId, request);

			res.status(201).json((await response).toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Retrieves a list of clients for the authenticated user.
	 * @param req - The Express request object containing the authenticated user information
	 * @param res - The Express response object used to send the HTTP response
	 * @param next - The Express next function for error handling middleware
	 * @returns A promise that resolves to void
	 * @throws Passes errors to the next middleware via the next function
	 */

	public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const response = await this.listUseCase.execute(userId);

			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Retrieves a client by its ID for the authenticated user.
	 *
	 * @param req - The Express request object containing the authenticated user and client ID in params
	 * @param res - The Express response object used to send the JSON response
	 * @param next - The Express next function for error handling
	 * @returns A promise that resolves to void
	 *
	 * @throws Will pass errors to the next middleware via the error handler
	 *
	 * @example
	 * // GET /clients/:id
	 * // Returns the client details in JSON format with a 200 status code
	 */

	public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const clientId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

			const response = await this.getUseCase.execute(userId, clientId);

			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Updates an existing OAuth2 client for the authenticated user.
	 *
	 * @param req - The Express request object containing the client ID in params and update data in body
	 * @param res - The Express response object used to send the updated client data
	 * @param next - The Express next middleware function for error handling
	 * @returns A promise that resolves to void
	 *
	 * @throws Passes any errors to the next middleware for centralized error handling
	 *
	 * @example
	 * // PATCH /clients/:id
	 * // Request body: { name: "Updated Client Name", ... }
	 * // Response: 200 OK with updated client JSON
	 */

	public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const clientId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

			const request = UpdateClientRequestDTO.fromBody(req.body);
			const response = await this.updateUseCase.execute(userId, clientId, request);

			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Deletes a client by ID.
	 *
	 * @param req - The Express request object containing the authenticated user and client ID in params
	 * @param _res - The Express response object (unused)
	 * @param next - The Express next function for error handling
	 * @returns A promise that resolves when the client is successfully deleted
	 * @throws Passes errors to the next middleware via the error handler
	 */

	public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const clientId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

			await this.deleteUseCase.execute(userId, clientId);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Rotates the client credentials for the authenticated user.
	 * @param req - The Express request object containing the authenticated user information
	 * @param res - The Express response object used to send the rotated client data
	 * @param next - The Express next middleware function for error handling
	 * @returns A promise that resolves when the response is sent
	 * @throws Passes errors to the next middleware via the error handler
	 */

	public rotate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const clientId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

			const response = this.rotateUseCase.execute(userId, clientId);

			res.status(200).json((await response).toJSON());
		} catch (error) {
			next(error);
		}
	};
}
