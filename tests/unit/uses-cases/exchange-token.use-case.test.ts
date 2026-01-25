import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Errors from '@shared';
import * as Interfaces from '@interfaces';
import { ExchangeTokenUseCase, TokenRequestDTO } from '@application';

describe('ExchangeTokenUseCase', () => {
	let useCase: ExchangeTokenUseCase;
	let mockCodeRepository: Interfaces.ICodeRepository;
	let mockUserRepository: Interfaces.IUserRepository;
	let mockClientRepository: Interfaces.IClientRepository;
	let mockJwtService: Interfaces.IJwtService;
	let mockPkceVerifier: Interfaces.IPkceVerifierUseCase;
	let mockLogger: Interfaces.ILogger;
	let mockConfig: Interfaces.IConfig;

	beforeEach(() => {
		mockCodeRepository = {
			findByCode: vi.fn(),
			save: vi.fn(),
		} as any;

		mockUserRepository = {
			findById: vi.fn(),
		} as any;

		mockClientRepository = {} as any;

		mockJwtService = {
			generateAccessToken: vi.fn().mockReturnValue('access_token_123'),
		} as any;

		mockPkceVerifier = {
			verify: vi.fn().mockReturnValue(true),
		} as any;

		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as any;

		mockConfig = {
			jwtAccessTokenExpiresIn: 900,
		} as any;

		useCase = new ExchangeTokenUseCase(
			mockCodeRepository,
			mockUserRepository,
			mockClientRepository,
			mockJwtService,
			mockPkceVerifier,
			mockLogger,
			mockConfig
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should set expiresIn from config', () => {
			expect(useCase.expiresIn).toBe(900);
		});

		it('should use default expiresIn when config value is not provided', () => {
			const partialConfig = { ...mockConfig };
			delete (partialConfig as any).jwtAccessTokenExpiresIn;

			const newUseCase = new ExchangeTokenUseCase(
				mockCodeRepository,
				mockUserRepository,
				mockClientRepository,
				mockJwtService,
				mockPkceVerifier,
				mockLogger,
				partialConfig
			);
			expect(newUseCase.expiresIn).toBe(900);
		});
	});

	describe('execute', () => {
		const validRequest: TokenRequestDTO = {
			code: 'valid_auth_code_123',
			clientId: 'client_123',
			redirectUri: 'https://example.com/callback',
			codeVerifier: 'a_valid_code_verifier_string_that_is_long_enough_for_validation_test123456789',
		} as any;

		const mockAuthCode = {
			userId: 'user_123',
			clientId: { getValue: () => 'client_123' },
			redirectUri: 'https://example.com/callback',
			codeChallenge: { getMethod: () => 'S256' },
			scope: 'read write',
			isExpired: vi.fn().mockReturnValue(false),
			isUsed: vi.fn().mockReturnValue(false),
			markAsUsed: vi.fn(),
			expiresAt: new Date(),
		} as any;

		const mockUser = {
			id: 'user_123',
			email: 'user@example.com',
			username: 'testuser',
			roles: ['user'],
			canLogin: vi.fn().mockReturnValue(true),
		} as any;

		it('should successfully exchange authorization code for access token', async () => {
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(mockAuthCode);
			mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser);

			const result = await useCase.execute(validRequest);

			expect(result).toBeInstanceOf(Object);
			expect(mockCodeRepository.findByCode).toHaveBeenCalledWith(validRequest.code);
			expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
			expect(mockJwtService.generateAccessToken).toHaveBeenCalled();
			expect(mockCodeRepository.save).toHaveBeenCalledWith(mockAuthCode);
		});

		it('should throw InvalidCodeError when authorization code not found', async () => {
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(null);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidCodeError);
		});

		it('should throw InvalidCodeError when authorization code is expired', async () => {
			const expiredAuthCode = { ...mockAuthCode, isExpired: vi.fn().mockReturnValue(true) };
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(expiredAuthCode);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidCodeError);
		});

		it('should throw InvalidCodeError when authorization code is already used', async () => {
			const usedAuthCode = { ...mockAuthCode, isUsed: vi.fn().mockReturnValue(true) };
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(usedAuthCode);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidCodeError);
		});

		it('should throw InvalidClientError when client ID mismatches', async () => {
			const mismatchedAuthCode = {
				...mockAuthCode,
				clientId: { getValue: () => 'different_client' },
			};
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(mismatchedAuthCode);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidClientError);
		});

		it('should throw InvalidCodeError when redirect URI mismatches', async () => {
			const mismatchedAuthCode = {
				...mockAuthCode,
				redirectUri: 'https://different.com/callback',
			};
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(mismatchedAuthCode);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidCodeError);
		});

		it('should throw InvalidCodeError when PKCE verification fails', async () => {
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(mockAuthCode);
			mockPkceVerifier.verify = vi.fn().mockReturnValue(false);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidCodeError);
		});

		it('should throw InvalidUser error when user not found', async () => {
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(mockAuthCode);
			mockUserRepository.findById = vi.fn().mockResolvedValue(null);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidUserError);
		});

		it('should mark authorization code as used after successful exchange', async () => {
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(mockAuthCode);
			mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser);

			await useCase.execute(validRequest);

			expect(mockAuthCode.markAsUsed).toHaveBeenCalled();
			expect(mockCodeRepository.save).toHaveBeenCalledWith(mockAuthCode);
		});

		it('should generate JWT token with correct claims', async () => {
			mockCodeRepository.findByCode = vi.fn().mockResolvedValue(mockAuthCode);
			mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser);

			await useCase.execute(validRequest);

			expect(mockJwtService.generateAccessToken).toHaveBeenCalledWith(
				expect.objectContaining({
					sub: 'user_123',
					email: 'user@example.com',
					username: 'testuser',
					roles: ['user'],
					scope: 'read write',
					client_id: 'client_123',
				})
			);
		});

		it('should throw InvalidCreationTokenError on unexpected error', async () => {
			mockCodeRepository.findByCode = vi.fn().mockRejectedValue(new Error('Database error'));

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidCreationTokenError);
		});

		it('should rethrow HttpError without wrapping', async () => {
			const httpError = new Errors.InvalidCodeError('Test error');
			mockCodeRepository.findByCode = vi.fn().mockRejectedValue(httpError);

			await expect(useCase.execute(validRequest)).rejects.toThrow(Errors.InvalidCodeError);
		});
	});
});
