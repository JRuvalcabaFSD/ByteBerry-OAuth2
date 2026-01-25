import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BootstrapError } from '@shared';
import { ensureSystemClients } from '@bootstrap';

const makeConfig = (overrides = {}) => ({
	bffClientSecret: 'a'.repeat(32),
	bffClientId: 'bff-client-id',
	bffClientName: 'BFF Client',
	bffClientRedirectUris: ['http://localhost/callback'],
	...overrides,
});

const makeLogger = () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
});

const makeRepository = (overrides = {}) => ({
	findBySystemRole: vi.fn(),
	save: vi.fn(),
	...overrides,
});

const makeHashService = (overrides = {}) => ({
	verifyPassword: vi.fn(),
	hashPassword: vi.fn(),
	...overrides,
});

const makeUuid = () => ({
	generate: vi.fn(() => 'generated-uuid'),
});

const makeClientEntity = () => ({
	id: 'generated-uuid',
	clientId: 'bff-client-id',
	clientSecret: 'hashed-secret',
	clientName: 'BFF Client',
	redirectUris: ['http://localhost/callback'],
	grantTypes: ['authorization_code', 'refresh_token'],
	isPublic: false,
	isActive: true,
	isSystemClient: true,
	systemRole: 'bff',
});

vi.mock('@domain', async () => {
	const actual = await vi.importActual<any>('@domain');
	return {
		...actual,
		ClientEntity: {
			create: vi.fn(() => makeClientEntity()),
		},
		AppError: actual.AppError,
		ValueObjectError: actual.ValueObjectError,
		EntityError: actual.EntityError,
	};
});

vi.mock('@shared', async () => {
	const actual = await vi.importActual<any>('@shared');
	return {
		...actual,
		withLoggerContext: (logger: any) => logger,
		BootstrapError: actual.BootstrapError,
	};
});

describe('ensureSystemClients', () => {
	let repository: any;
	let hashService: any;
	let uuid: any;
	let logger: any;
	let config: any;

	beforeEach(() => {
		repository = makeRepository();
		hashService = makeHashService();
		uuid = makeUuid();
		logger = makeLogger();
		config = makeConfig();
	});

	it('throws BootstrapError if bffClientSecret is too short', async () => {
		config.bffClientSecret = 'short';
		await expect(
			ensureSystemClients(repository, hashService, uuid, logger, config)
		).rejects.toThrow(BootstrapError);
		expect(logger.error).toHaveBeenCalledWith('BFF_CLIENT_SECRET too short', { length: 5 });
	});

	it('does nothing if BFF client exists and secret matches', async () => {
		const existingClient = { clientId: 'bff-client-id', clientSecret: 'hashed-secret' };
		repository.findBySystemRole.mockResolvedValue(existingClient);
		hashService.verifyPassword.mockResolvedValue(true);

		await ensureSystemClients(repository, hashService, uuid, logger, config);

		expect(repository.findBySystemRole).toHaveBeenCalledWith('bff');
		expect(hashService.verifyPassword).toHaveBeenCalledWith(config.bffClientSecret, existingClient.clientSecret);
		expect(logger.warn).not.toHaveBeenCalled();
		expect(repository.save).not.toHaveBeenCalled();
	});

	it('logs a warning if BFF client exists but secret does not match', async () => {
		const existingClient = { clientId: 'bff-client-id', clientSecret: 'hashed-secret' };
		repository.findBySystemRole.mockResolvedValue(existingClient);
		hashService.verifyPassword.mockResolvedValue(false);

		await ensureSystemClients(repository, hashService, uuid, logger, config);

		expect(logger.warn).toHaveBeenCalledWith(
			'BFF client secret in database does not match environment variable',
			expect.objectContaining({
				clientId: existingClient.clientId,
				message: expect.any(String),
			})
		);
		expect(repository.save).not.toHaveBeenCalled();
	});

	it('creates and saves BFF client if not existing', async () => {
		repository.findBySystemRole.mockResolvedValue(null);
		hashService.hashPassword.mockResolvedValue('hashed-secret');

		await ensureSystemClients(repository, hashService, uuid, logger, config);

		expect(logger.info).toHaveBeenCalledWith('Creating BFF system client...');
		expect(hashService.hashPassword).toHaveBeenCalledWith(config.bffClientSecret);
		expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
			clientId: config.bffClientId,
			clientSecret: 'hashed-secret',
			systemRole: 'bff',
		}));
		expect(logger.info).toHaveBeenCalledWith('BFF system client created successfully', {
			clientId: config.bffClientId,
			systemRole: 'bff',
		});
	});
});
