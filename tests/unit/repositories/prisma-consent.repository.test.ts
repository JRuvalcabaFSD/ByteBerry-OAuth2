import { ConsentEntity } from '@domain';
import type { ILogger } from '@interfaces';
import type { DBConfig } from '@config';
import { ConsentRepository } from '@infrastructure';

vi.mock('@shared', () => ({
	handledPrismaError: vi.fn((error) => error),
	getErrMessage: vi.fn((error) => (error instanceof Error ? error.message : 'Unknown error')),
	Injectable: vi.fn(),
	LogContextClass: vi.fn(),
	LogContextMethod: vi.fn(),
}));

describe('ConsentRepository', () => {
	let consentRepository: ConsentRepository;
	let mockPrismaClient: any;
	let mockLogger: ILogger;
	let mockDBConfig: DBConfig;

	const mockConsentData = {
		id: 'consent-123',
		userId: 'user-123',
		clientId: 'client-456',
		scopes: ['openid', 'profile'],
		grantedAt: new Date('2024-01-01'),
		expiresAt: new Date('2025-01-01'),
		revokedAt: null,
	};

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		} as any;

		mockPrismaClient = {
			userConsent: {
				findFirst: vi.fn(),
				findUnique: vi.fn(),
				findMany: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
			},
		} as any;

		mockDBConfig = {
			getClient: vi.fn().mockReturnValue(mockPrismaClient),
		} as any;

		consentRepository = new ConsentRepository(mockDBConfig, mockLogger);
	});

	describe('findByUserAndClient', () => {
		it('should return ConsentEntity when active consent exists', async () => {
			mockPrismaClient.userConsent.findFirst.mockResolvedValue(mockConsentData);
			vi.spyOn(ConsentEntity, 'create').mockReturnValue({} as any);

			const result = await consentRepository.findByUserAndClient('user-123', 'client-456');

			expect(mockPrismaClient.userConsent.findFirst).toHaveBeenCalledWith({
				where: { userId: 'user-123', clientId: 'client-456', revokedAt: null },
			});
			expect(result).toBeDefined();
			expect(mockLogger.debug).toHaveBeenCalledWith('Active consent found', expect.objectContaining({ consentId: 'consent-123' }));
		});

		it('should return null when no consent found', async () => {
			mockPrismaClient.userConsent.findFirst.mockResolvedValue(null);

			const result = await consentRepository.findByUserAndClient('user-123', 'client-456');

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('No consent found', { userId: 'user-123', clientId: 'client-456' });
		});

		it('should throw error on database failure', async () => {
			const dbError = new Error('Database error');
			mockPrismaClient.userConsent.findFirst.mockRejectedValue(dbError);

			await expect(consentRepository.findByUserAndClient('user-123', 'client-456')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error finding consent',
				expect.objectContaining({ userId: 'user-123', clientId: 'client-456' })
			);
		});
	});

	describe('save', () => {
		it('should create new consent when no active consent exists', async () => {
			mockPrismaClient.userConsent.findFirst.mockResolvedValue(null);
			mockPrismaClient.userConsent.create.mockResolvedValue(mockConsentData);

			const consentEntity = {
				id: 'consent-123',
				userId: 'user-123',
				clientId: 'client-456',
				scopes: ['openid', 'profile'],
				grantedAt: new Date('2024-01-01'),
				expiresAt: new Date('2025-01-01'),
				revokedAt: null,
			} as any;

			await consentRepository.save(consentEntity);

			expect(mockPrismaClient.userConsent.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					id: 'consent-123',
					userId: 'user-123',
					clientId: 'client-456',
				}),
			});
			expect(mockLogger.info).toHaveBeenCalledWith(
				'New consent created successfully',
				expect.objectContaining({ autoRevokedPrevious: false })
			);
		});

		it('should revoke existing consent before creating new one', async () => {
			const existingConsent = { ...mockConsentData, id: 'consent-old' };
			mockPrismaClient.userConsent.findFirst.mockResolvedValue(existingConsent);
			mockPrismaClient.userConsent.update.mockResolvedValue({});
			mockPrismaClient.userConsent.create.mockResolvedValue(mockConsentData);

			const consentEntity = {
				id: 'consent-123',
				userId: 'user-123',
				clientId: 'client-456',
				scopes: ['openid', 'profile'],
				grantedAt: new Date('2024-01-01'),
				expiresAt: new Date('2025-01-01'),
				revokedAt: null,
			} as any;

			await consentRepository.save(consentEntity);

			expect(mockPrismaClient.userConsent.update).toHaveBeenCalledWith({
				where: { id: 'consent-old' },
				data: { revokedAt: expect.any(Date) },
			});
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Auto-revoking existing active consent before creating new one',
				expect.any(Object)
			);
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.userConsent.findFirst.mockRejectedValue(new Error('DB error'));

			const consentEntity = {
				id: 'consent-123',
				userId: 'user-123',
				clientId: 'client-456',
				scopes: ['openid', 'profile'],
				grantedAt: new Date('2024-01-01'),
				expiresAt: new Date('2025-01-01'),
				revokedAt: null,
			} as any;

			await expect(consentRepository.save(consentEntity)).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('Error saving consent', expect.any(Object));
		});
	});

	describe('findByUserId', () => {
		it('should return array of ConsentEntity for user', async () => {
			mockPrismaClient.userConsent.findMany.mockResolvedValue([mockConsentData]);
			vi.spyOn(ConsentEntity, 'create').mockReturnValue({} as any);

			const result = await consentRepository.findByUserId('user-123');

			expect(mockPrismaClient.userConsent.findMany).toHaveBeenCalledWith({
				where: { userId: 'user-123', revokedAt: null },
				orderBy: { grantedAt: 'desc' },
			});
			expect(Array.isArray(result)).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith('Consents found', { userId: 'user-123', count: 1 });
		});

		it('should return empty array when no consents found', async () => {
			mockPrismaClient.userConsent.findMany.mockResolvedValue([]);

			const result = await consentRepository.findByUserId('user-123');

			expect(result).toEqual([]);
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.userConsent.findMany.mockRejectedValue(new Error('DB error'));

			await expect(consentRepository.findByUserId('user-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('Error finding consents by user ID', expect.any(Object));
		});
	});

	describe('revokeConsent', () => {
		it('should revoke consent by ID', async () => {
			mockPrismaClient.userConsent.update.mockResolvedValue({ ...mockConsentData, revokedAt: new Date() });

			await consentRepository.revokeConsent('consent-123');

			expect(mockPrismaClient.userConsent.update).toHaveBeenCalledWith({
				where: { id: 'consent-123' },
				data: { revokedAt: expect.any(Date) },
			});
			expect(mockLogger.info).toHaveBeenCalledWith('Consent revoked successfully', { consentId: 'consent-123' });
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.userConsent.update.mockRejectedValue(new Error('DB error'));

			await expect(consentRepository.revokeConsent('consent-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('Error revoking consent', expect.any(Object));
		});
	});

	describe('findById', () => {
		it('should return ConsentEntity when consent exists', async () => {
			mockPrismaClient.userConsent.findUnique.mockResolvedValue(mockConsentData);
			vi.spyOn(ConsentEntity, 'create').mockReturnValue({} as any);

			const result = await consentRepository.findById('consent-123');

			expect(mockPrismaClient.userConsent.findUnique).toHaveBeenCalledWith({ where: { id: 'consent-123' } });
			expect(result).toBeDefined();
			expect(mockLogger.debug).toHaveBeenCalledWith('Consent found', { consentId: 'consent-123', userId: 'user-123' });
		});

		it('should return null when consent not found', async () => {
			mockPrismaClient.userConsent.findUnique.mockResolvedValue(null);

			const result = await consentRepository.findById('consent-123');

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('Consent not found', { consentId: 'consent-123' });
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.userConsent.findUnique.mockRejectedValue(new Error('DB error'));

			await expect(consentRepository.findById('consent-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('Error finding consent by ID', expect.any(Object));
		});
	});
});
