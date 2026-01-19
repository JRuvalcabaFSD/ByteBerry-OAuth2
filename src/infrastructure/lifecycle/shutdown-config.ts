import { DBConfig } from '@config';
import { GracefulShutdown } from '@infrastructure';
import { IHttpServer, ILogger } from '@interfaces';
import { getErrMessage, withLoggerContext } from '@shared';

/**
 * Configures and initializes the graceful shutdown mechanism for the application.
 *
 * This function resolves the GracefulShutdown service from the dependency injection container
 * and sets up logging for the shutdown configuration process.
 *
 * @param container - The dependency injection container that provides access to application services
 * @returns The configured GracefulShutdown instance that can be used to manage application shutdown
 *
 * @example
 * ```typescript
 * const shutdown = configureShutdown(container);
 * // Use shutdown instance to handle graceful application termination
 * ```
 */

export function configureShutdown(
	GShutdown: GracefulShutdown,
	logger: ILogger,
	httpServer: IHttpServer,
	DBConfig: DBConfig
): GracefulShutdown {
	const ctxLogger = withLoggerContext(logger, 'configureShutdown');

	ctxLogger.debug('Configuring graceful shutdown');

	//Register database server in cleanup function
	GShutdown.registerCleanup(async () => {
		ctxLogger.debug('Closing database connection');

		try {
			if (DBConfig && typeof DBConfig.disconnect === 'function') {
				await DBConfig.disconnect();
			}
		} catch (error) {
			ctxLogger.error('Failed to disconnect from database', { error: getErrMessage(error) });
			throw error;
		}
	});

	//Register Http Service in cleanup function
	GShutdown.registerCleanup(async () => {
		ctxLogger.debug('Closing Http Server');

		try {
			if (httpServer && typeof httpServer.stop === 'function') {
				await httpServer.stop();

				ctxLogger.info('Http Server closed');
			}
		} catch (error) {
			ctxLogger.error('Failed to stop Http Server', { error: getErrMessage(error) });
			throw error;
		}
	});

	// TODO Register redis server in cleanup function

	return GShutdown;
}
