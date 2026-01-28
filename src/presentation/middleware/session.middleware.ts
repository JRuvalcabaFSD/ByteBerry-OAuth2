import { NextFunction, Request, RequestHandler, Response } from 'express';

import { ILogger, ISessionErrorHandle, ISessionRepository } from '@interfaces';

/**
 * Options for configuring the session middleware.
 *
 * @property onError - A handler function that is invoked when a session-related error occurs.
 */
interface SessionMiddlewareOptions {
	onError: ISessionErrorHandle;
}

/**
 * Creates an Express middleware for validating user sessions using a session repository.
 *
 * This middleware checks for a session cookie, validates the session's existence and expiration,
 * and attaches the user information to the request object if the session is valid.
 * If the session is missing, not found, or expired, it delegates error handling to the provided `onError` handler.
 * All relevant events and errors are logged using the provided logger.
 *
 * @param repository - The session repository used to retrieve and validate sessions.
 * @param logger - The logger instance for logging debug, warning, and error messages.
 * @param options - Middleware options, including an `onError` handler for session-related errors.
 * @returns An Express request handler that validates sessions and attaches user info to the request.
 */

export function createSessionMiddleware(
	repository: ISessionRepository,
	logger: ILogger,
	options: SessionMiddlewareOptions,
	cookieName?: string
): RequestHandler {
	const COOKIE_NAME: string = cookieName ?? 'session_id';
	const { onError } = options;

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const sessionId = req.cookies[COOKIE_NAME] as string | undefined;

			if (!sessionId) {
				logger.debug('No session cookie found, redirecting to login', { path: req.path, method: req.method });
				return onError.handle(req, res, next, 'no-cookie');
			}

			const session = await repository.findById(sessionId);

			if (!session) {
				logger.warn('Session not found, redirecting to login', {
					sessionId: sessionId.substring(0, 8) + '...',
					path: req.path,
				});

				return onError.handle(req, res, next, 'not-found');
			}

			if (session.isExpired()) {
				logger.warn('Expired session detected, redirecting to login', {
					sessionId: sessionId.substring(0, 8) + '...',
					expiresAt: session.expiresAt.toISOString(),
				});

				return onError.handle(req, res, next, 'expired');
			}

			req.user = {
				userId: session.userId,
				sessionId: sessionId.substring(0, 8) + '...',
			};

			logger.debug('Session validate successfully', {
				userId: session.userId,
				sessionId: sessionId.substring(0, 8) + '...',
				path: req.path,
			});

			next();
		} catch (error) {
			logger.error('Unexpected error in session middleware', { error });
			next(error);
		}
	};
}
