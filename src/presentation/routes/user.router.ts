import { RequestHandler, Router } from 'express';

import { UserController } from '@presentation';

/**
 * Creates and configures Express router for user-related endpoints.
 *
 * @param controller - The UserController instance that handles user operations
 * @param requireSession - Middleware function that validates user session/authentication
 * @returns An Express Router instance with the following routes configured:
 * - POST / - Register a new user (public)
 * - PUT /me - Update current user information (requires session)
 * - GET /me - Get current user information (requires session)
 * - PUT /me/password - Update current user password (requires session)
 *
 * @example
 * ```typescript
 * const userController = new UserController();
 * const sessionMiddleware = requireSessionMiddleware();
 * const userRouter = createUserRoutes(userController, sessionMiddleware);
 * app.use('/users', userRouter);
 * ```
 */

export function createUserRoutes(controller: UserController, requireSession: RequestHandler): Router {
	const router = Router();
	router.post('/', controller.register);
	router.put('/me', requireSession, controller.updateMe);
	router.get('/me', requireSession, controller.getMe);
	router.put('/me/password', requireSession, controller.updatePassword);
	return router;
}
