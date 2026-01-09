import { NextFunction, Request, Response } from 'express';

import { Injectable } from '@shared';
import { RegisterUserRequestDTO, UpdateUserRequestDTO } from '@application';
import type { IGetUserUseCase, IRegisterUserUseCase, IUpdateUserUseCase } from '@interfaces';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		UserController: UserController;
	}
}

//TODO documentar
@Injectable({ name: 'UserController', depends: ['RegisterUserUseCase', 'GetUserUseCase', 'UpdateUserUseCase'] })
export class UserController {
	constructor(
		private readonly registerUseCase: IRegisterUserUseCase,
		private readonly getUseCase: IGetUserUseCase,
		private readonly updateUserUseCase: IUpdateUserUseCase
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
}
