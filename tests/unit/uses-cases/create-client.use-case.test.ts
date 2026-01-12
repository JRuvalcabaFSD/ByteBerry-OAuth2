import { ConflictError } from '@shared';
import { vi } from 'vitest';
import type { IClientRepository, IHashService, ILogger, IUuid } from '@interfaces';
import { CreateClientUseCase, type CreateClientRequestDTO } from '@application';

describe('CreateClientUseCase', () => {
	let useCase: CreateClientUseCase;
	let repository: IClientRepository;
	let hashService: IHashService;
	let uuid: IUuid;
	let logger: ILogger;

	beforeEach(() => {
		repository = {
			findByClientId: vi.fn(),
			save: vi.fn(),
		} as unknown as IClientRepository;

		hashService = {
			hashPassword: vi.fn().mockResolvedValue('hashed-secret'),
		} as unknown as IHashService;

		uuid = {
			generate: vi.fn().mockReturnValueOnce('client-id-123').mockReturnValueOnce('entity-id-456'),
		} as unknown as IUuid;

		logger = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		} as unknown as ILogger;

		useCase = new CreateClientUseCase(repository, hashService, uuid, logger);
	});

	it('should create a client successfully', async () => {
		const userId = 'user-123';
		const request: CreateClientRequestDTO = {
			clientName: 'My App',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			isPublic: false,
		};

		vi.mocked(repository.findByClientId).mockResolvedValueOnce(null);
		vi.mocked(repository.save).mockResolvedValueOnce(undefined);

		const result = await useCase.execute(userId, request);

		expect(result).toBeDefined();
		expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Creating OAuth client'), { userId, clientName: request.clientName });
		expect(uuid.generate).toHaveBeenCalledTimes(2);
		expect(repository.findByClientId).toHaveBeenCalledWith('client-id-123');
		expect(hashService.hashPassword).toHaveBeenCalled();
		expect(repository.save).toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('OAuth client created successfully'), expect.any(Object));
	});

	it('should throw ConflictError when clientId already exists', async () => {
		const userId = 'user-123';
		const request: CreateClientRequestDTO = {
			clientName: 'My App',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			isPublic: false,
		};

		vi.mocked(repository.findByClientId).mockResolvedValueOnce({ id: 'existing-id' } as never);

		await expect(useCase.execute(userId, request)).rejects.toThrow(ConflictError);
		expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Generated clientId already exists'), { clientId: 'client-id-123' });
	});

	it('should use default grantTypes when not provided', async () => {
		const userId = 'user-123';
		const request: CreateClientRequestDTO = {
			clientName: 'My App',
			redirectUris: ['https://example.com/callback'],
			grantTypes: undefined as any,
			isPublic: false,
		};

		vi.mocked(repository.findByClientId).mockResolvedValueOnce(null);
		vi.mocked(repository.save).mockResolvedValueOnce(undefined);

		await useCase.execute(userId, request);

		const saveCall = vi.mocked(repository.save).mock.calls[0][0];
		expect(saveCall.grantTypes).toEqual(['authorization_code', 'refresh_token']);
	});

	it('should hash the client secret before saving', async () => {
		const userId = 'user-123';
		const request: CreateClientRequestDTO = {
			clientName: 'My App',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			isPublic: false,
		};

		vi.mocked(repository.findByClientId).mockResolvedValueOnce(null);
		vi.mocked(repository.save).mockResolvedValueOnce(undefined);

		await useCase.execute(userId, request);

		expect(hashService.hashPassword).toHaveBeenCalled();
	});
});
