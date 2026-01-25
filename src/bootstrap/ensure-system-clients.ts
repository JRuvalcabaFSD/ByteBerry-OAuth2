import { ClientEntity } from '@domain';
import { IClientRepository, IConfig, IHashService, ILogger, IUuid } from '@interfaces';
import { BootstrapError, withLoggerContext } from '@shared';

/**
 * Ensures that the BFF (Backend For Frontend) system client is present and correctly configured in the client repository.
 *
 * - Checks if the BFF client secret from configuration meets the minimum length requirement.
 * - Verifies if a BFF system client already exists in the repository:
 *   - If it exists, checks if the stored client secret matches the configured secret.
 *   - Logs a warning if the secrets do not match.
 * - If the BFF system client does not exist, creates and saves a new one using the provided configuration.
 * - Logs relevant information and errors throughout the process.
 *
 * @param repository - The client repository for accessing and saving client entities.
 * @param hashService - Service for hashing and verifying client secrets.
 * @param uuid - Service for generating unique identifiers.
 * @param logger - Logger for debug, info, warning, and error messages.
 * @param config - Configuration object containing BFF client details and secrets.
 * @throws {BootstrapError} If the BFF client secret is shorter than 32 characters.
 */

export async function ensureSystemClients(
	repository: IClientRepository,
	hashService: IHashService,
	uuid: IUuid,
	logger: ILogger,
	config: IConfig
): Promise<void> {
	const ctxLogger = withLoggerContext(logger, 'ensureSystemClients');
	ctxLogger.debug('Checking system clients configuration...');

	if (config.bffClientSecret.length < 32) {
		ctxLogger.error('BFF_CLIENT_SECRET too short', { length: config.bffClientSecret.length });
		throw new BootstrapError('BFF_CLIENT_SECRET must be at least 32 characters long');
	}

	const existingBffClient = await repository.findBySystemRole('bff');

	if (existingBffClient) {
		ctxLogger.debug('BFF system client already exists', {
			clientId: existingBffClient.clientId,
		});

		const secretMatches = await hashService.verifyPassword(config.bffClientSecret, existingBffClient.clientSecret);

		if (!secretMatches) {
			ctxLogger.warn('BFF client secret in database does not match environment variable', {
				clientId: existingBffClient.clientId,
				message: 'Secret may have been rotated. Consider updating DB or fixing env configuration.',
			});
		}

		return;
	}

	ctxLogger.info('Creating BFF system client...');

	const clientSecretHash = await hashService.hashPassword(config.bffClientSecret);

	const bffClient = ClientEntity.create({
		id: uuid.generate(),
		clientId: config.bffClientId,
		clientSecret: clientSecretHash,
		clientName: config.bffClientName,
		redirectUris: config.bffClientRedirectUris,
		grantTypes: ['authorization_code', 'refresh_token'],
		isPublic: false,
		isActive: true,
		isSystemClient: true,
		systemRole: 'bff',
	});

	await repository.save(bffClient);

	ctxLogger.info('BFF system client created successfully', {
		clientId: bffClient.clientId,
		systemRole: bffClient.systemRole,
	});
}
