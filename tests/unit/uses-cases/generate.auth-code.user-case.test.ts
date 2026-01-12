import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeRequestDTO, CodeResponseDTO, GenerateAuthCodeUseCase } from '@application';
import { AppError,  } from '@domain';
import type { ICodeRepository, IConfig, ILogger, IValidateClientUseCase } from '@interfaces';

describe('GenerateAuthCodeUseCase', () => {
	let useCase: GenerateAuthCodeUseCase;
	let mockRepository: ICodeRepository;
	let mockValidateClient: IValidateClientUseCase;
	let mockLogger: ILogger;
	let mockConfig: IConfig;
	let mockCheckConsent: any;

	beforeEach(() => {
		mockRepository = {
			save: vi.fn().mockResolvedValue(undefined),
		} as unknown as ICodeRepository;

		mockValidateClient = {
			execute: vi.fn().mockResolvedValue({
				clientId: 'test-client-id',
				redirectUris: ['https://example.com/callback'],
				grantTypes: ['authorization_code'],
			}),
		} as unknown as IValidateClientUseCase;

		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
		} as unknown as ILogger;

		mockConfig = {
			oauth2AuthCodeExpiresIn: 10,
		} as unknown as IConfig;

		mockCheckConsent = {
			execute: vi.fn().mockResolvedValue(true),
		} as any;

		useCase = new GenerateAuthCodeUseCase(mockRepository, mockValidateClient, mockCheckConsent, mockLogger, mockConfig);
	});

	it('should generate authorization code successfully', async () => {
		const userId = 'user-123';
		const request: CodeRequestDTO = {
			clientId: 'test-client-id',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUedPyTP5_ryO5ZVut4gQstEUMi2DrNEA',
			codeChallengeMethod: 'S256',
			state: 'random-state',
		};

		const response = await useCase.execute(userId, request);

		expect(response).toBeInstanceOf(CodeResponseDTO);
		expect(response).toHaveProperty('code');
		expect(response).toHaveProperty('state', 'random-state');
		expect(mockValidateClient.execute).toHaveBeenCalledWith({
			clientId: 'test-client-id',
			redirectUri: 'https://example.com/callback',
			grantType: 'authorization_code',
		});
		expect(mockCheckConsent.execute).toHaveBeenCalledWith('user-123', 'test-client-id', []);
		expect(mockRepository.save).toHaveBeenCalled();
	});

	it('should set expiration minutes from config', async () => {
		expect(useCase['expirationMinutes']).toBe(10);
	});

	it('should use default expiration minutes when config value is undefined', () => {
		const configWithoutExpiration = { oauth2AuthCodeExpiresIn: undefined } as unknown as IConfig;
		const useCaseWithDefault = new GenerateAuthCodeUseCase(
			mockRepository,
			mockValidateClient,
			mockCheckConsent,
			mockLogger,
			configWithoutExpiration
		);

		expect(useCaseWithDefault['expirationMinutes']).toBe(1);
	});

	it('should throw ConsentRequiredError when user has no consent', async () => {
		const userId = 'user-123';
		const request: CodeRequestDTO = {
			clientId: 'test-client-id',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUedPyTP5_ryO5ZVut4gQstEUMi2DrNEA',
			codeChallengeMethod: 'S256',
			state: 'state',
			scope: 'openid profile',
		};

		vi.mocked(mockCheckConsent.execute).mockResolvedValueOnce(false);

		const { ConsentRequiredError } = await import('@shared');
		await expect(useCase.execute(userId, request)).rejects.toThrow(ConsentRequiredError);
		expect(mockRepository.save).not.toHaveBeenCalled();
	});

	it('should throw error when client validation fails', async () => {
		const userId = 'user-123';
		const request: CodeRequestDTO = {
			clientId: 'invalid-client',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUedPyTP5_ryO5ZVut4gQstEUMi2DrNEA',
			codeChallengeMethod: 'S256',
			state: 'state',
		};

		const appError = new AppError('Client validation failed', 'oauth');
		(mockValidateClient.execute as any).mockRejectedValueOnce(appError);

		await expect(useCase.execute(userId, request)).rejects.toThrow(appError);
		expect(mockRepository.save).not.toHaveBeenCalled();
	});

	it('should log debug messages during execution', async () => {
		const userId = 'user-123';
		const request: CodeRequestDTO = {
			clientId: 'test-client-id',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUedPyTP5_ryO5ZVut4gQstEUMi2DrNEA',
			codeChallengeMethod: 'S256',
			state: 'state',
		};

		await useCase.execute(userId, request);

		expect(mockLogger.debug).toHaveBeenCalledWith('[GenerateAuthCodeUseCase.execute] Generating authorization code', expect.any(Object));
		expect(mockLogger.debug).toHaveBeenCalledWith('[GenerateAuthCodeUseCase.execute] Client validated for authorization', expect.any(Object));
		expect(mockLogger.debug).toHaveBeenCalledWith('[GenerateAuthCodeUseCase.execute] User has valid consent, proceeding with code generation', expect.any(Object));
		expect(mockLogger.debug).toHaveBeenCalledWith('[GenerateAuthCodeUseCase.execute] Authorization code generated', expect.any(Object));
	});

	it('should log error when unexpected error occurs', async () => {
		const userId = 'user-123';
		const request: CodeRequestDTO = {
			clientId: 'test-client-id',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUedPyTP5_ryO5ZVut4gQstEUMi2DrNEA',
			codeChallengeMethod: 'S256',
			state: 'state',
		};

		const unexpectedError = new Error('Unexpected error');
		(mockRepository.save as any).mockRejectedValueOnce(unexpectedError);

		await expect(useCase.execute(userId, request)).rejects.toThrow();
		expect(mockLogger.error).toHaveBeenCalledWith(
			'[GenerateAuthCodeUseCase.execute] Unexpected error generating authorization code',
			expect.objectContaining({ client_id: 'test-client-id' })
		);
	});

	it('should not log error for AppError instances', async () => {
		const userId = 'user-123';
		const request: CodeRequestDTO = {
			clientId: 'test-client-id',
			redirectUri: 'https://example.com/callback',
			responseType: 'code',
			codeChallenge: 'E9Mrozoa2owUedPyTP5_ryO5ZVut4gQstEUMi2DrNEA',
			codeChallengeMethod: 'S256',
			state: 'state',
		};

		const appError = new AppError('App error', 'domain');
		(mockRepository.save as any).mockRejectedValueOnce(appError);

		await expect(useCase.execute(userId, request)).rejects.toThrow();
		expect(mockLogger.error).not.toHaveBeenCalled();
	});
});
