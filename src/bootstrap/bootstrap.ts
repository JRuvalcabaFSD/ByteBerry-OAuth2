import { AppError } from '@domain';
import { bootstrapContainer } from '@container';
import { IContainer, ILogger } from '@interfaces';
import { configureShutdown, GracefulShutdown } from '@infrastructure';
import { BootstrapError, getErrMessage, withLoggerContext } from '@shared';
import { ensureSystemClients } from './ensure-system-clients.js';

/**
 * Represents the result of the bootstrap process.
 *
 * @property container - The dependency injection container instance.
 * @property shutdown - The graceful shutdown handler.
 */
interface bootstrapResult {
	container: IContainer;
	shutdown: GracefulShutdown;
}

/**
 * Bootstraps the application by initializing the dependency injection container,
 * configuring shutdown handlers, validating the database connection (unless skipped),
 * and starting the HTTP server.
 *
 * @param options - Optional configuration object.
 * @param options.skipDbValidation - If true, skips database connection validation. Defaults to false.
 * @returns A promise that resolves to a `bootstrapResult` containing the DI container and shutdown handler.
 * @throws {AppError} If an application-specific error occurs during bootstrap.
 * @throws {BootstrapError} If any other error occurs during bootstrap, wrapped with additional context.
 */
export async function bootstrap({ skipDbValidation = false, skipSystemClients = false } = {}): Promise<bootstrapResult> {
	let logger: ILogger | undefined;

	try {
		const container = bootstrapContainer();
		const gracefulShutdown = container.resolve('GracefulShutdown');
		const httpServer = container.resolve('HttpServer');
		const DBConfig = container.resolve('DBConfig');

		logger = withLoggerContext(container.resolve('Logger'), 'bootstrap');

		logger.info('Service starting');

		const shutdown = configureShutdown(gracefulShutdown, logger, httpServer, DBConfig);

		if (!skipDbValidation) {
			await validateDbConnection(container, logger);
		}

		// Si estamos en entorno de test, omitimos la creación de system clients
		const isTestEnv = process.env.NODE_ENV === 'test';
		if (!skipSystemClients && !isTestEnv) {
			await ensureSystemClientsBootstrap(container, logger);
		}

		await httpServer.start();

		return { container, shutdown };
	} catch (error) {
		if (error instanceof AppError) throw error;
		throw new BootstrapError(`Service bootstrap failed: ${getErrMessage(error)}`, { timestamp: new Date().toISOString() });
	}
}

/**
 * Validates the database connection by attempting to test the connection using the provided container.
 * Logs an error and throws a `BootstrapError` if the connection test fails.
 *
 * @param container - The dependency injection container used to resolve the database configuration.
 * @param logger - The logger instance used for logging context and errors.
 * @throws {BootstrapError} If the database connection test fails.
 */

async function validateDbConnection(container: IContainer, logger: ILogger): Promise<void> {
	const ctxLogger = withLoggerContext(logger, 'bootstrap.validateDbConnection');

	try {
		await container.resolve('DBConfig').testConnection();
	} catch (error) {
		ctxLogger.error('Database connection failed', { error: getErrMessage(error) });
		throw new BootstrapError('Database connection failed', { error: getErrMessage(error) });
	}
}

/**
 * Ensures that system clients are bootstrapped in the OAuth2 system.
 * This function resolves necessary dependencies from the container, such as the client repository,
 * hash service, UUID generator, and configuration, then delegates to `ensureSystemClients` to
 * create or verify the existence of system clients. It logs the process and throws a
 * `BootstrapError` if the operation fails.
 *
 * @param container - The dependency injection container used to resolve services.
 * @param logger - The logger instance for recording bootstrap progress and errors.
 * @returns A promise that resolves when the system clients bootstrap is completed.
 * @throws {BootstrapError} If the system clients bootstrap fails.
 */

async function ensureSystemClientsBootstrap(container: IContainer, logger: ILogger) {
	const ctxLogger = withLoggerContext(logger, 'bootstrap.ensureSystemClients');

	try {
		ctxLogger.info('Ensuring system clients exist...');

		const repository = container.resolve('ClientRepository');
		const hashService = container.resolve('HashService');
		const uuid = container.resolve('Uuid');
		const config = container.resolve('Config');

		await ensureSystemClients(repository, hashService, uuid, ctxLogger, config);

		ctxLogger.info('System clients bootstrap completed');
	} catch (error) {
		ctxLogger.error('System clients bootstrap failed', { error: getErrMessage(error) });
		throw new BootstrapError('System clients bootstrap failed', { error: getErrMessage(error) });
	}
}
