import { RotateSecretResponseDTO, RotateSecretUseCase } from '@application';
import { vi } from 'vitest';
import { ForbiddenError, NotFoundRecordError } from '@shared';
import type { IClientRepository, IHashService, ILogger } from '@interfaces';

describe('RotateSecretUseCase', () => {
	let useCase: RotateSecretUseCase;
	let mockRepository: IClientRepository;
	let mockHashService: IHashService;
	let mockLogger: ILogger;

	const userId = 'user-123';
	const clientId = 'client-456';
	const oldSecretHash = 'old-secret-hash';
	const newSecretHash = 'new-secret-hash';

	beforeEach(() => {
		mockRepository = {
			findByClientId: vi.fn(),
			rotateSecret: vi.fn(),
		} as unknown as IClientRepository;

		mockHashService = {
			hashPassword: vi.fn().mockResolvedValue(newSecretHash),
		} as unknown as IHashService;

		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		} as unknown as ILogger;

		useCase = new RotateSecretUseCase(mockRepository, mockHashService, mockLogger);
	});

	describe('execute', () => {
		it('should successfully rotate client secret', async () => {
			const mockClient = {
				clientId,
				userId,
				clientName: 'Test Client',
				clientSecret: oldSecretHash,
				isOwnedBy: vi.fn().mockReturnValue(true),
			};

			vi.spyOn(mockRepository, 'findByClientId').mockResolvedValue(mockClient as any);
			vi.spyOn(mockRepository, 'rotateSecret').mockResolvedValue(undefined);

			const result = await useCase.execute(userId, clientId);

			expect(result).toBeInstanceOf(RotateSecretResponseDTO);
			const json = result.toJSON();
			expect(json.clientId).toBe(clientId);
			expect(json.clientSecret).toBeDefined();
			expect(json.clientSecret.length).toBe(32);
			expect(json.oldSecretExpiresAt).toBeDefined();
			expect(mockRepository.rotateSecret).toHaveBeenCalled();
		});

		it('should throw NotFoundRecordError when client does not exist', async () => {
			vi.spyOn(mockRepository, 'findByClientId').mockResolvedValue(null);

			await expect(useCase.execute(userId, clientId)).rejects.toThrow(NotFoundRecordError);
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Client not found for secret rotation'), {
				userId,
				clientId,
			});
		});

		it('should throw ForbiddenError when user does not own the client', async () => {
			const mockClient = {
				clientId,
				userId: 'different-user',
				clientName: 'Test Client',
				clientSecret: oldSecretHash,
				isOwnedBy: vi.fn().mockReturnValue(false),
			};

			vi.spyOn(mockRepository, 'findByClientId').mockResolvedValue(mockClient as any);

			await expect(useCase.execute(userId, clientId)).rejects.toThrow(ForbiddenError);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('User attempted to rotate secret for client they do not own'),
				expect.objectContaining({ userId, clientId })
			);
		});

		it('should hash the new secret using hash service', async () => {
			const mockClient = {
				clientId,
				userId,
				clientName: 'Test Client',
				clientSecret: oldSecretHash,
				isOwnedBy: vi.fn().mockReturnValue(true),
			};

			vi.spyOn(mockRepository, 'findByClientId').mockResolvedValue(mockClient as any);
			vi.spyOn(mockRepository, 'rotateSecret').mockResolvedValue(undefined);

			await useCase.execute(userId, clientId);

			expect(mockHashService.hashPassword).toHaveBeenCalled();
		});

		it('should set grace period expiration to 24 hours from now', async () => {
			const mockClient = {
				clientId,
				userId,
				clientName: 'Test Client',
				clientSecret: oldSecretHash,
				isOwnedBy: vi.fn().mockReturnValue(true),
			};

			vi.spyOn(mockRepository, 'findByClientId').mockResolvedValue(mockClient as any);
			vi.spyOn(mockRepository, 'rotateSecret').mockResolvedValue(undefined);

			const beforeExecution = new Date();
			const result = await useCase.execute(userId, clientId);
			const afterExecution = new Date();
			const json = result.toJSON();

			const expectedMinTime = new Date(beforeExecution.getTime() + 24 * 60 * 60 * 1000);
			const expectedMaxTime = new Date(afterExecution.getTime() + 24 * 60 * 60 * 1000);
			const expiresAtTime = new Date(json.oldSecretExpiresAt).getTime();

			expect(expiresAtTime).toBeGreaterThanOrEqual(expectedMinTime.getTime());
			expect(expiresAtTime).toBeLessThanOrEqual(expectedMaxTime.getTime());
		});

		it('should log rotation events appropriately', async () => {
			const mockClient = {
				clientId,
				userId,
				clientName: 'Test Client',
				clientSecret: oldSecretHash,
				isOwnedBy: vi.fn().mockReturnValue(true),
			};

			vi.spyOn(mockRepository, 'findByClientId').mockResolvedValue(mockClient as any);
			vi.spyOn(mockRepository, 'rotateSecret').mockResolvedValue(undefined);

			await useCase.execute(userId, clientId);

			expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Rotating client secret'), {
				userId,
				clientId,
			});
			expect(mockLogger.debug).toHaveBeenCalled();
		});

		it('should call repository.rotateSecret with correct parameters', async () => {
			const mockClient = {
				clientId,
				userId,
				clientName: 'Test Client',
				clientSecret: oldSecretHash,
				isOwnedBy: vi.fn().mockReturnValue(true),
			};

			vi.spyOn(mockRepository, 'findByClientId').mockResolvedValue(mockClient as any);
			vi.spyOn(mockRepository, 'rotateSecret').mockResolvedValue(undefined);

			await useCase.execute(userId, clientId);

			expect(mockRepository.rotateSecret).toHaveBeenCalledWith(
				clientId,
				newSecretHash,
				oldSecretHash,
				expect.any(Date)
			);
		});
	});
});
