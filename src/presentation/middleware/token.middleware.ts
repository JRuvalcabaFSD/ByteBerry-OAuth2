import { IJwtService, ILogger, IConfig } from '@interfaces';
import { InvalidCredentialsError, withLoggerContext } from '@shared';
import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Creates an Express middleware that validates a JWT Bearer token from the Authorization header.
 *
 * @param config - The application configuration object, used for service-specific validation.
 * @param jwtService - The service responsible for verifying JWT tokens.
 * @param logger - The logger instance for contextual logging.
 * @returns An Express request handler that authenticates requests using JWT Bearer tokens.
 *
 * @remarks
 * - If the Authorization header is missing or does not contain a Bearer token, an `InvalidCredentialsError` is thrown.
 * - If the token is invalid or missing a subject (`sub`), an `InvalidCredentialsError` is thrown.
 * - On successful validation, attaches a `user` object with `userId` to the request.
 * - Logs authentication attempts and errors with contextual information.
 */

export function createTokenMiddleware(config: IConfig, jwtService: IJwtService, logger: ILogger): RequestHandler {
	const ctxLogger = withLoggerContext(logger, 'createTokenMiddleware');

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const authHeader = req.headers.authorization;
			if (!authHeader?.startsWith('Bearer ')) {
				ctxLogger.debug('No token found');
				throw new InvalidCredentialsError('Missing Bearer token');
			}

			const token = authHeader.split(' ')[1];
			if (!token) throw new InvalidCredentialsError('Missing token after Bearer');

			const payload = jwtService.verifyToken(token, config.serviceName);
			if (!payload.sub) throw new InvalidCredentialsError('Token without subject');

			req.user = {
				userId: payload.sub,
			};

			ctxLogger.debug('Session validate successfully', {
				userId: payload.sub,
				path: req.path,
			});

			next();
		} catch (error) {
			next(error);
		}
	};
}
