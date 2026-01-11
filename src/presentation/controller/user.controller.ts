import { NextFunction, Request, Response } from 'express';

import { Injectable } from '@shared';
import { RegisterUserRequestDTO, UpdatePasswordRequestDTO, UpdateUserRequestDTO } from '@application';
import type * as UseCases from '@interfaces';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		UserController: UserController;
	}
}

/**
 * Controller for handling user-related HTTP requests.
 *
 * @class UserController
 *
 * @description
 * Manages user operations including registration, profile retrieval and updates,
 * password management, and consent listing. All methods follow Express middleware
 * conventions with error handling via next() function.
 *
 * @example
 * ```typescript
 * const userController = new UserController(
 *   registerUseCase,
 *   getUseCase,
 *   updateUserUseCase,
 *   updatePasswordUseCase,
 *   listConsentUseCase
 * );
 * ```
 *
 * @see {@link IRegisterUserUseCase}
 * @see {@link IGetUserUseCase}
 * @see {@link IUpdateUserUseCase}
 * @see {@link IUpdatePasswordUseCase}
 * @see {@link IListClientUseCase}
 */

@Injectable({
	name: 'UserController',
	depends: [
		'RegisterUserUseCase',
		'GetUserUseCase',
		'UpdateUserUseCase',
		'UpdatePasswordUseCase',
		'ListConsentsUseCase',
		'DeleteConsentUseCase',
	],
})
export class UserController {
	constructor(
		private readonly registerUseCase: UseCases.IRegisterUserUseCase,
		private readonly getUseCase: UseCases.IGetUserUseCase,
		private readonly updateUserUseCase: UseCases.IUpdateUserUseCase,
		private readonly updatePasswordUseCase: UseCases.IUpdatePasswordUseCase,
		private readonly listConsentUseCase: UseCases.IListClientUseCase,
		private readonly deleteConsentUseCase: UseCases.IDeleteClientUseCase
	) {}

	/**
	 * Handles user registration requests.
	 *
	 * @param req - The Express request object containing user registration data in the body
	 * @param res - The Express response object used to send the registration result
	 * @param next - The Express next function for error handling and middleware chaining
	 * @returns A promise that resolves to void
	 *
	 * @throws Passes any caught errors to the next middleware via the next function
	 *
	 * @example
	 * POST /register
	 * Body: { email: "user@example.com", password: "..." }
	 * Response: 201 Created with user data
	 */

	public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const request = RegisterUserRequestDTO.fromBody(req.body);
			const response = this.registerUseCase.execute(request);
			res.status(201).json((await response).toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Retrieves the current authenticated user's information.
	 *
	 * @param req - The Express request object containing the authenticated user
	 * @param res - The Express response object used to send the JSON response
	 * @param next - The Express next middleware function for error handling
	 * @returns A promise that resolves to void
	 *
	 * @throws Will pass any caught errors to the next middleware via the next function
	 *
	 * @example
	 * // Returns HTTP 200 with user data
	 * app.get('/me', getMe);
	 */

	public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const response = await this.getUseCase.execute(userId);

			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Updates the current authenticated user's information.
	 *
	 * @param req - Express request object containing the authenticated user and update data in the body
	 * @param res - Express response object used to send the updated user data
	 * @param next - Express next function for error handling middleware
	 * @returns A promise that resolves when the update operation completes
	 *
	 * @throws Will pass any errors to the next middleware via next(error)
	 *
	 * @remarks
	 * This endpoint requires authentication. The user ID is extracted from req.user.
	 * The response returns the updated user data in JSON format with a 200 status code.
	 */

	public updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const request = UpdateUserRequestDTO.fromBody(req.body);
			const response = await this.updateUserUseCase.execute(userId, request);

			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Updates the password for the authenticated user.
	 *
	 * @param req - Express request object containing the user's authentication data and new password in the body
	 * @param res - Express response object used to send the update result
	 * @param next - Express next function for error handling middleware
	 * @returns A promise that resolves when the password update is complete
	 * @throws Will pass any errors to the next middleware handler
	 */

	public updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const request = UpdatePasswordRequestDTO.fromBody(req.body);
			const response = await this.updatePasswordUseCase.execute(userId, request);
			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Lists all consents for the authenticated user.
	 *
	 * @param req - The Express request object containing the authenticated user information
	 * @param res - The Express response object used to send the HTTP response
	 * @param next - The Express next function for error handling middleware
	 * @returns A promise that resolves to void. Sends a 200 status with consent data in JSON format
	 * @throws Passes any caught errors to the next middleware for centralized error handling
	 */

	public listConsents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const response = await this.listConsentUseCase.execute(userId);

			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Revokes a user's consent for an OAuth2 application.
	 *
	 * @param req - Express request object containing the authenticated user and consent ID in params
	 * @param res - Express response object
	 * @param next - Express next middleware function for error handling
	 * @returns Promise that resolves to void
	 * @throws Passes errors to the error handling middleware via next()
	 */

	public revokeConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const consentId = req.params.id;

			await this.deleteConsentUseCase.execute(userId, consentId);

			res.status(204).send();
		} catch (error) {
			next(error);
		}
	};
}
