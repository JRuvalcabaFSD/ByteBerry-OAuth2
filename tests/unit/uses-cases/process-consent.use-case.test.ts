import { DenyConsentError } from '@shared';
import type { IConsentRepository, IUuid, ILogger } from '@interfaces';
import { ProcessConsentUseCase, type ConsentDecisionDTO } from '@application';

describe('ProcessConsentUseCase', () => {
	let useCase: ProcessConsentUseCase;
	let mockRepository: IConsentRepository;
	let mockUuid: IUuid;
	let mockLogger: ILogger;

	beforeEach(() => {
		mockRepository = {
			save: vi.fn(),
		} as unknown as IConsentRepository;

		mockUuid = {
			generate: vi.fn(() => 'uuid-123'),
		} as unknown as IUuid;

		mockLogger = {
			info: vi.fn(),
		} as unknown as ILogger;

		useCase = new ProcessConsentUseCase(mockRepository, mockUuid, mockLogger);
	});

	describe('execute', () => {
		it('should throw DenyConsentError when user denies consent', async () => {
			const userId = 'user-123';
			const decision = {
				clientId: 'client-456',
				decision: 'deny',
				scope: 'read write',
				redirectUri: 'https://client.example.com/callback',
				responseType: 'code',
				codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
				codeChallengeMethod: 'S256',
			} as unknown as ConsentDecisionDTO;

			await expect(useCase.execute(userId, decision)).rejects.toThrow(DenyConsentError);
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should save consent with default scope when no scope provided', async () => {
			const userId = 'user-123';
			const decision = {
				clientId: 'client-456',
				decision: 'approve',
				redirectUri: 'https://client.example.com/callback',
				responseType: 'code',
				codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
				codeChallengeMethod: 'S256',
			} as unknown as ConsentDecisionDTO;

			await useCase.execute(userId, decision);

			expect(mockRepository.save).toHaveBeenCalledOnce();
			const savedConsent = (mockRepository.save as any).mock.calls[0][0];
			expect(savedConsent.scopes).toEqual(['read']);
		});

		it('should save consent with requested scopes when approved', async () => {
			const userId = 'user-123';
			const decision = {
				clientId: 'client-456',
				decision: 'approve',
				scope: 'read write delete',
				redirectUri: 'https://client.example.com/callback',
				responseType: 'code',
				codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
				codeChallengeMethod: 'S256',
			} as unknown as ConsentDecisionDTO;

			await useCase.execute(userId, decision);

			expect(mockRepository.save).toHaveBeenCalledOnce();
			const savedConsent = (mockRepository.save as any).mock.calls[0][0];
			expect(savedConsent.scopes).toEqual(['read', 'write', 'delete']);
			expect(savedConsent.userId).toBe(userId);
			expect(savedConsent.clientId).toBe(decision.clientId);
		});

		it('should log consent decision processing', async () => {
			const userId = 'user-123';
			const decision = {
				clientId: 'client-456',
				decision: 'approve',
				scope: 'read',
				redirectUri: 'https://client.example.com/callback',
				responseType: 'code',
				codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
				codeChallengeMethod: 'S256',
			} as unknown as ConsentDecisionDTO;

			await useCase.execute(userId, decision);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Processing consent decision',
				expect.objectContaining({
					userId,
					clientId: decision.clientId,
				})
			);
		});
	});
});
