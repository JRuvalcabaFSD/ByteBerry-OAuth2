import { vi } from 'vitest';
import type { IValidateClientUseCase, ILogger } from '@interfaces';
import { ScopeDisplayDTO, ShowConsentUseCase, type CodeRequestDTO, type ConsentScreenData } from '@application';

describe('ShowConsentUseCase', () => {
	let useCase: ShowConsentUseCase;
	let validateClientMock: IValidateClientUseCase;
	let loggerMock: ILogger;

	beforeEach(() => {
		validateClientMock = {
			execute: vi.fn(),
		};
		loggerMock = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			log: vi.fn(),
			child: vi.fn(),
			checkHealth: vi.fn(),
		} as unknown as ILogger;
		useCase = new ShowConsentUseCase(validateClientMock, loggerMock);
	});

	it('should prepare consent screen data with provided scopes', async () => {
		const request = {
			clientId: 'test-client',
			redirectUri: 'https://example.com/callback',
			scope: 'read write',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
			codeChallengeMethod: 'S256',
		} as unknown as CodeRequestDTO;
		const clientInfo = {
			clientId: 'test-client',
			clientName: 'Test App',
			isPublic: false,
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
		} as unknown as any;

		vi.mocked(validateClientMock.execute).mockResolvedValue(clientInfo);

		const result = await useCase.execute(request);

		expect(result.clientId).toBe('test-client');
		expect(result.clientName).toBe('Test App');
		expect(result.scopes).toHaveLength(2);
	});

	it('should use default scope when scope is not provided', async () => {
		const request = {
			clientId: 'test-client',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
			codeChallengeMethod: 'S256',
		} as unknown as CodeRequestDTO;

		vi.mocked(validateClientMock.execute).mockResolvedValue({
			clientId: 'test-client',
			clientName: 'Test App',
			isPublic: false,
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
		} as unknown as any);

		await useCase.execute(request);

		expect(validateClientMock.execute).toHaveBeenCalledWith({
			clientId: 'test-client',
			redirectUri: 'https://example.com/callback',
			grantType: 'authorization_code',
		});
	});

	it('should throw error when client validation fails', async () => {
		const request = {
			clientId: 'invalid-client',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
			codeChallengeMethod: 'S256',
		} as unknown as CodeRequestDTO;

		vi.mocked(validateClientMock.execute).mockRejectedValue(
			new Error('Client validation failed')
		);

		await expect(useCase.execute(request)).rejects.toThrow('Client validation failed');
	});

	it('should log debug and info messages', async () => {
		const request = {
			clientId: 'test-client',
			redirectUri: 'https://example.com/callback',
			scope: 'read',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU',
			codeChallengeMethod: 'S256',
		} as unknown as CodeRequestDTO;

		vi.mocked(validateClientMock.execute).mockResolvedValue({
			clientId: 'test-client',
			clientName: 'Test App',
			isPublic: false,
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
		} as unknown as any);

		await useCase.execute(request);

		expect(loggerMock.debug).toHaveBeenCalledWith('[ShowConsentUseCase.execute] Preparing consent screen data', {
			clientId: 'test-client',
		});
		expect(loggerMock.info).toHaveBeenCalled();
	});
});
