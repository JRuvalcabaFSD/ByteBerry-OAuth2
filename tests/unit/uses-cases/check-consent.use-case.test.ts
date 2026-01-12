import { Mocked, vi } from 'vitest';

import type { IConsentRepository, ILogger } from '@interfaces';
import { CheckConsentUseCase } from '@application';

describe('CheckConsentUseCase', () => {
	let useCase: CheckConsentUseCase;
	let repository: Mocked<IConsentRepository>;
	let logger: Mocked<ILogger>;

	beforeEach(() => {
		repository = {
			findByUserAndClient: vi.fn(),
		} as any;

		logger = {
			debug: vi.fn(),
			info: vi.fn(),
		} as any;

		useCase = new CheckConsentUseCase(repository, logger);
	});

	it('should return false when no consent is found', async () => {
		repository.findByUserAndClient.mockResolvedValue(null);

		const result = await useCase.execute('user-1', 'client-1');

		expect(result).toBe(false);
		expect(logger.debug).toHaveBeenNthCalledWith(2, '[CheckConsentUseCase.execute] No consent found for user and client', {
			userId: 'user-1',
			clientId: 'client-1',
		});
	});

	it('should return false when consent is not active', async () => {
		const consent = {
			isActive: vi.fn().mockReturnValue(false),
			isRevoked: vi.fn().mockReturnValue(true),
			isExpired: vi.fn().mockReturnValue(false),
		};

		repository.findByUserAndClient.mockResolvedValue(consent as any);

		const result = await useCase.execute('user-1', 'client-1');

		expect(result).toBe(false);
		expect(logger.debug).toHaveBeenNthCalledWith(2, expect.stringContaining('Consent found but not active'), expect.objectContaining({
			userId: 'user-1',
			clientId: 'client-1',
		}));
	});

	it('should return false when consent does not cover all requested scopes', async () => {
		const consent = {
			isActive: vi.fn().mockReturnValue(true),
			hasAllScopes: vi.fn().mockReturnValue(false),
			scopes: ['read'],
		};

		repository.findByUserAndClient.mockResolvedValue(consent as any);

		const result = await useCase.execute('user-1', 'client-1', ['read', 'write']);

		expect(result).toBe(false);
		expect(logger.debug).toHaveBeenNthCalledWith(2, expect.stringContaining('Consent found but does not cover all requested scopes'), expect.objectContaining({
			userId: 'user-1',
			clientId: 'client-1',
		}));
	});

	it('should return true when consent is valid with no requested scopes', async () => {
		const consent = {
			isActive: vi.fn().mockReturnValue(true),
			scopes: ['read', 'write'],
		};

		repository.findByUserAndClient.mockResolvedValue(consent as any);

		const result = await useCase.execute('user-1', 'client-1');

		expect(result).toBe(true);
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Valid consent found'), expect.objectContaining({
			userId: 'user-1',
			clientId: 'client-1',
		}));
	});

	it('should return true when consent covers all requested scopes', async () => {
		const consent = {
			isActive: vi.fn().mockReturnValue(true),
			hasAllScopes: vi.fn().mockReturnValue(true),
			scopes: ['read', 'write'],
		};

		repository.findByUserAndClient.mockResolvedValue(consent as any);

		const result = await useCase.execute('user-1', 'client-1', ['read']);

		expect(result).toBe(true);
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Valid consent found'), expect.objectContaining({
			userId: 'user-1',
			clientId: 'client-1',
		}));
	});

	it('should return true when requested scopes array is empty', async () => {
		const consent = {
			isActive: vi.fn().mockReturnValue(true),
			scopes: ['read'],
		};

		repository.findByUserAndClient.mockResolvedValue(consent as any);

		const result = await useCase.execute('user-1', 'client-1', []);

		expect(result).toBe(true);
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Valid consent found'), expect.any(Object));
	});
});
