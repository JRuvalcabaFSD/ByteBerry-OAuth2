import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { InvalidCodeError, ConsentRequiredError } from '@shared';
import type { IGenerateAuthCodeUseCase, IShowConsentUseCase, IProcessConsentUseCase, IConfig } from '@interfaces';
import { AuthController } from '@presentation';

describe('AuthController', () => {
	let authController: AuthController;
	let mockCodeUseCase: IGenerateAuthCodeUseCase;
	let mockShowConsentUseCase: IShowConsentUseCase;
	let mockProcessConsentUseCase: IProcessConsentUseCase;
	let mockConfig: IConfig;
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockCodeUseCase = {
			execute: vi.fn(),
		} as any;

		mockShowConsentUseCase = {
			execute: vi.fn(),
		} as any;

		mockProcessConsentUseCase = {
			execute: vi.fn(),
		} as any;

		mockConfig = {
			version: '1.0.0',
		} as any;

		authController = new AuthController(
			mockCodeUseCase,
			mockShowConsentUseCase,
			mockProcessConsentUseCase,
			mockConfig
		);

		mockRequest = {
			query: {
				client_id: 'test-client',
				redirect_uri: 'https://example.com/callback',
				response_type: 'code',
				state: 'state123',
				code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
				code_challenge_method: 'S256',
			},
			user: { userId: 'user123', sessionId: 'session123' },
		};

		mockResponse = {
			redirect: vi.fn(),
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};

		mockNext = vi.fn();
	});

	it('should redirect with authorization code when request is valid', async () => {
		const redirectUrl = 'https://example.com/callback?code=abc123&state=state123';
		const mockAuthResponse = {
			code: 'abc123',
			state: 'state123',
			toJSON: vi.fn().mockReturnValue({ code: 'abc123', state: 'state123' }),
			buildRedirectURrl: vi.fn().mockReturnValue(redirectUrl),
		};

		vi.mocked(mockCodeUseCase.execute).mockResolvedValue(mockAuthResponse as any);

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockCodeUseCase.execute).toHaveBeenCalledWith('user123', expect.any(Object));
		expect(mockResponse.redirect).toHaveBeenCalledWith(redirectUrl);
	});

	it('should throw InvalidCodeError when userId is missing', async () => {
		mockRequest.user = undefined;

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(TypeError));
	});

	it('should call next with error when useCase execution fails', async () => {
		const testError = new Error('Use case failed');

		vi.mocked(mockCodeUseCase.execute).mockRejectedValue(testError);

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(testError);
	});

	it('should call next with error when buildRedirectURrl fails', async () => {
		const testError = new Error('Build redirect failed');
		const mockAuthResponse = {
			code: 'abc123',
			state: 'state123',
			toJSON: vi.fn().mockReturnValue({ code: 'abc123', state: 'state123' }),
			buildRedirectURrl: vi.fn().mockImplementation(() => {
				throw testError;
			}),
		};

		vi.mocked(mockCodeUseCase.execute).mockResolvedValue(mockAuthResponse as any);

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(testError);
	});

	it('should return consent required response when ConsentRequiredError is thrown', async () => {
		const consentError = new ConsentRequiredError();

		vi.mocked(mockCodeUseCase.execute).mockRejectedValue(consentError);
		mockResponse.locals = { nonce: 'test-nonce' };

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockResponse.status).toHaveBeenCalledWith(200);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Consent required',
				clientId: 'test-client',
				scopes: [],
			})
		);
	});

	it('should render consent screen when showConsentScreen is called', async () => {
		const mockConsentResponse = {
			clientId: 'test-client',
			scopes: ['read', 'write'],
		};

		vi.mocked(mockShowConsentUseCase.execute).mockResolvedValue(mockConsentResponse as any);
		mockResponse.render = vi.fn();
		mockResponse.locals = { nonce: 'test-nonce' };

		await authController.showConsentScreen(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockShowConsentUseCase.execute).toHaveBeenCalledWith(expect.any(Object));
		expect(mockResponse.render).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				clientId: 'test-client',
				scopes: ['read', 'write'],
				userEmail: 'usuario@byteberry.dev',
				version: '1.0.0',
				nonce: 'test-nonce',
			})
		);
	});

	it('should throw InvalidCodeError when userId is missing in showConsentScreen', async () => {
		mockRequest.user = undefined;

		await authController.showConsentScreen(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(TypeError));
	});

	it('should call next with error when showConsentScreen useCase fails', async () => {
		const testError = new Error('Show consent failed');

		vi.mocked(mockShowConsentUseCase.execute).mockRejectedValue(testError);

		await authController.showConsentScreen(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(testError);
	});

	it('should redirect after processing consent decision', async () => {
		const redirectUrl = 'https://example.com/callback?code=xyz789&state=state123';
		const mockAuthResponse = {
			code: 'xyz789',
			state: 'state123',
			buildRedirectURrl: vi.fn().mockReturnValue(redirectUrl),
		};

		mockRequest.body = {
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			scope: 'read write',
			decision: 'approve',
			code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
			code_challenge_method: 'S256',
		};

		vi.mocked(mockProcessConsentUseCase.execute).mockResolvedValue(undefined);
		vi.mocked(mockCodeUseCase.execute).mockResolvedValue(mockAuthResponse as any);

		await authController.processConsent(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockProcessConsentUseCase.execute).toHaveBeenCalledWith('user123', expect.any(Object));
		expect(mockCodeUseCase.execute).toHaveBeenCalledWith('user123', expect.any(Object));
		expect(mockResponse.redirect).toHaveBeenCalledWith(redirectUrl);
	});

	it('should call next with error when processConsent fails', async () => {
		const testError = new Error('Process consent failed');

		mockRequest.body = {
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			scope: 'read write',
			decision: 'approve',
			code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
			code_challenge_method: 'S256',
		};

		vi.mocked(mockProcessConsentUseCase.execute).mockRejectedValue(testError);

		await authController.processConsent(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(testError);
	});
});
