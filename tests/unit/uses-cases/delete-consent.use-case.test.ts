import { ForbiddenError, NotFoundRecordError } from '@shared';
import type { IConsentRepository, ILogger } from '@interfaces';
import { DeleteConsentUseCase } from '@application';

describe('DeleteConsentUseCase', () => {
	let useCase: DeleteConsentUseCase;
	let mockRepository: IConsentRepository;
	let mockLogger: ILogger;

	beforeEach(() => {
		mockRepository = {
			findById: vi.fn(),
			revokeConsent: vi.fn(),
		} as unknown as IConsentRepository;

		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
		} as unknown as ILogger;

		useCase = new DeleteConsentUseCase(mockRepository, mockLogger);
	});

	it('should revoke consent successfully when user owns it', async () => {
		const userId = 'user123';
		const consentId = 'consent123';
		const mockConsent = {
			id: consentId,
			userId,
			clientId: 'client123',
			isRevoked: vi.fn().mockReturnValue(false),
		};

		vi.mocked(mockRepository.findById).mockResolvedValue(mockConsent as any);

		await useCase.execute(userId, consentId);

		expect(mockRepository.findById).toHaveBeenCalledWith(consentId);
		expect(mockRepository.revokeConsent).toHaveBeenCalledWith(consentId);
		expect(mockLogger.info).toHaveBeenCalled();
	});

	it('should throw NotFoundRecordError when consent does not exist', async () => {
		const userId = 'user123';
		const consentId = 'consent123';

		vi.mocked(mockRepository.findById).mockResolvedValue(null);

		await expect(useCase.execute(userId, consentId)).rejects.toThrow(NotFoundRecordError);
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it('should throw ForbiddenError when user does not own the consent', async () => {
		const userId = 'user123';
		const consentId = 'consent123';
		const mockConsent = {
			id: consentId,
			userId: 'user456',
			clientId: 'client123',
			isRevoked: vi.fn().mockReturnValue(false),
		};

		vi.mocked(mockRepository.findById).mockResolvedValue(mockConsent as any);

		await expect(useCase.execute(userId, consentId)).rejects.toThrow(ForbiddenError);
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it('should be idempotent when consent is already revoked', async () => {
		const userId = 'user123';
		const consentId = 'consent123';
		const mockConsent = {
			id: consentId,
			userId,
			clientId: 'client123',
			isRevoked: vi.fn().mockReturnValue(true),
		};

		vi.mocked(mockRepository.findById).mockResolvedValue(mockConsent as any);

		await useCase.execute(userId, consentId);

		expect(mockRepository.revokeConsent).not.toHaveBeenCalled();
		expect(mockLogger.info).toHaveBeenCalledWith('Consent already revoked', expect.any(Object));
	});
});
