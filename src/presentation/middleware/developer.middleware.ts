import { ILogger, IUserRepository } from '@interfaces';
import { ForbiddenError, withLoggerContext } from '@shared';
import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Creates an Express middleware that restricts access to routes requiring "developer" privileges.
 *
 * This middleware checks if the authenticated user (from `req.user`) exists and has the ability to create clients,
 * which is typically associated with developer-level access. If the user is not authenticated, does not exist,
 * or lacks developer privileges, a `ForbiddenError` is thrown and the request is denied.
 *
 * Logging is performed at various stages for debugging and auditing purposes.
 *
 * @param repository - The user repository used to fetch user details by ID.
 * @param logger - The logger instance for contextual logging.
 * @returns An Express `RequestHandler` that enforces developer access.
 */

export function createRequireDeveloperMiddleware(repository: IUserRepository, logger: ILogger): RequestHandler {
	const ctxLogger = withLoggerContext(logger, 'createRequireDeveloperMiddleware');
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user?.userId;

			if (!userId) {
				ctxLogger.debug('Developer access check failed - no authenticate user');
				throw new ForbiddenError('Authentication required');
			}

			const user = await repository.findById(userId);

			if (!user) {
				logger.warn('Developer access check failed - user not found', { userId });
				throw new ForbiddenError('User not found');
			}

			if (!user?.canCreateClients()) {
				logger.warn('Developer access denied', {
					userId: user.id,
					email: user.email,
					isDeveloper: user.isDeveloper,
					accountType: user.accountType,
				});

				throw new ForbiddenError('Developer access required. You can enable developer features at PUT /user/me/upgrade/developer');
			}

			logger.debug('Developer access granted', {
				userId: user.id,
				email: user.email,
				accountType: user.accountType,
			});

			next();
		} catch (error) {
			next(error);
		}
	};
}
