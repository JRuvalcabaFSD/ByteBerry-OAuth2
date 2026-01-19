import { ClientEntity } from '@domain';
import { IClientRepository, IConfig, IHashService, ILogger, IUuid } from '@interfaces';
import { BootstrapError } from '@shared';

export async function ensureSystemClients(
	repository: IClientRepository,
	hashService: IHashService,
	uuid: IUuid,
	logger: ILogger,
	config: IConfig
): Promise<void> {
	logger.debug('Checking system clients configuration...');

	if (config.bffClientSecret.length < 32) {
		logger.error('BFF_CLIENT_SECRET too short', { length: config.bffClientSecret.length });
		throw new BootstrapError('BFF_CLIENT_SECRET must be at least 32 characters long');
	}

	const existingBffClient = await repository.findBySystemRole('bff');

	if (existingBffClient) {
		logger.debug('BFF system client already exists', {
			clientId: existingBffClient.clientId,
		});

		const secretMatches = await hashService.verifyPassword(config.bffClientSecret, existingBffClient.clientSecret);

		if (!secretMatches) {
			logger.warn('BFF client secret in database does not match environment variable', {
				clientId: existingBffClient.clientId,
				message: 'Secret may have been rotated. Consider updating DB or fixing env configuration.',
			});
		}

		return;
	}

	logger.info('Creating BFF system client...');

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

	logger.info('BFF system client created successfully', {
		clientId: bffClient.clientId,
		systemRole: bffClient.systemRole,
	});
}
