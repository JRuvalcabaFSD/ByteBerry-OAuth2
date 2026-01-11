import { DBConfig } from '@config';
import { CodeEntity } from '@domain';
import { CodeMapper, CodeRepository } from '@infrastructure';
import { ILogger } from '@interfaces';

describe('CodeRepository', () => {
	let codeRepository: CodeRepository;
	let mockLogger: ILogger;
	let mockDbConfig: DBConfig;
	let mockPrismaClient: any;

	beforeEach(() => {
		mockPrismaClient = {
			authorizationCode: {
				upsert: vi.fn(),
				findUnique: vi.fn(),
				deleteMany: vi.fn(),
			},
		};

		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
			child: vi.fn(),
			log: vi.fn(),
			checkHealth: vi.fn(),
		} as any;

		mockDbConfig = {
			getClient: vi.fn(() => mockPrismaClient),
			client: mockPrismaClient,
			pool: null,
			logger: mockLogger,
			testConnection: vi.fn(),
			disconnect: vi.fn(),
		} as any;

		codeRepository = new CodeRepository(mockDbConfig, mockLogger);
	});

	describe('save', () => {
		it('should save a new authorization code', async () => {
			const codeEntity = {
				code: 'auth_code_123',
				userId: 'user_1',
				clientId: { getValue: () => 'client_1' },
				redirectUri: 'http://localhost:3000/callback',
				codeChallenge: { getChallenge: () => 'challenge', getMethod: () => 'S256' },
				scope: 'openid profile',
				state: 'state_123',
				expiresAt: new Date(Date.now() + 600000),
				isUsed: () => false,
			} as any;

			await codeRepository.save(codeEntity);

			expect(mockPrismaClient.authorizationCode.upsert).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('[CodeRepository.save] Authorization code saved successfully', {
				code: 'auth_code_123',
			});
		});

		it('should handle errors when saving fails', async () => {
			const codeEntity = {
				code: 'auth_code_123',
				userId: 'user_1',
				clientId: { getValue: () => 'client_1' },
				redirectUri: 'http://localhost:3000/callback',
				codeChallenge: { getChallenge: () => 'challenge', getMethod: () => 'S256' },
				scope: 'openid profile',
				state: 'state_123',
				expiresAt: new Date(),
				isUsed: () => false,
			} as any;

			const error = new Error('Database error');
			mockPrismaClient.authorizationCode.upsert.mockRejectedValue(error);

			await expect(codeRepository.save(codeEntity)).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'[CodeRepository.save] Failed to save authorization code',
				expect.objectContaining({ code: 'auth_code_123' })
			);
		});
	});

	describe('findByCode', () => {
		it('should return a code entity when found', async () => {
			const mockAuthCode = {
				code: 'auth_code_123',
				userId: 'user_1',
				clientId: 'client_1',
				redirectUri: 'http://localhost:3000/callback',
				codeChallenge: 'challenge',
				codeChallengeMethod: 'S256',
				scope: 'openid profile',
				state: 'state_123',
				expiresAt: new Date(),
				used: false,
				usedAt: null,
				createdAt: new Date(),
				user: {},
				client: {},
			};

			mockPrismaClient.authorizationCode.findUnique.mockResolvedValue(mockAuthCode);
			vi.spyOn(CodeMapper, 'toEntity').mockReturnValue({} as CodeEntity);

			const result = await codeRepository.findByCode('auth_code_123');

			expect(mockPrismaClient.authorizationCode.findUnique).toHaveBeenCalledWith({
				where: { code: 'auth_code_123' },
				include: { user: true, client: true },
			});
			expect(result).toBeDefined();
		});

		it('should return null when code not found', async () => {
			mockPrismaClient.authorizationCode.findUnique.mockResolvedValue(null);

			const result = await codeRepository.findByCode('nonexistent_code');

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('[CodeRepository.findByCode] Authorization code not found', {
				code: 'nonexistent_code',
			});
		});

		it('should handle errors when finding fails', async () => {
			const error = new Error('Database error');
			mockPrismaClient.authorizationCode.findUnique.mockRejectedValue(error);

			await expect(codeRepository.findByCode('auth_code_123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'[CodeRepository.findByCode] Failed to find authorization code',
				expect.objectContaining({ code: 'auth_code_123' })
			);
		});
	});

	describe('cleanup', () => {
		it('should delete expired and used authorization codes', async () => {
			mockPrismaClient.authorizationCode.deleteMany
				.mockResolvedValueOnce({ count: 5 })
				.mockResolvedValueOnce({ count: 3 });

			await codeRepository.cleanup();

			expect(mockPrismaClient.authorizationCode.deleteMany).toHaveBeenCalledTimes(2);
			expect(mockLogger.info).toHaveBeenCalledWith('[CodeRepository.cleanup] Authorization codes cleanup completed', {
				expiredDeleted: 5,
				usedDeleted: 3,
				totalDeleted: 8,
			});
		});

		it('should handle errors during cleanup', async () => {
			const error = new Error('Database error');
			mockPrismaClient.authorizationCode.deleteMany.mockRejectedValue(error);

			await expect(codeRepository.cleanup()).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'[CodeRepository.cleanup] Failed to cleanup authorization codes',
				expect.any(Object)
			);
		});
	});
});
