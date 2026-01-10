import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { InvalidCodeError } from '@shared';
import type { IGenerateAuthCodeUseCase } from '@interfaces';
import { AuthController } from '@presentation';

describe('AuthController', () => {
	let authController: AuthController;
	let mockUseCase: IGenerateAuthCodeUseCase;
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockUseCase = {
			execute: vi.fn(),
		} as any;

		authController = new AuthController(mockUseCase);

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

		vi.spyOn(mockUseCase, 'execute').mockResolvedValue(mockAuthResponse as any);

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockUseCase.execute).toHaveBeenCalledWith('user123', expect.any(Object));
		expect(mockAuthResponse.buildRedirectURrl).toHaveBeenCalledWith('https://example.com/callback');
		expect(mockResponse.redirect).toHaveBeenCalledWith(redirectUrl);
	});

	it('should throw InvalidCodeError when userId is missing', async () => {
		mockRequest.user = undefined;

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.any(InvalidCodeError));
	});

	it('should call next with error when useCase execution fails', async () => {
		const testError = new Error('Use case failed');

		vi.spyOn(mockUseCase, 'execute').mockRejectedValue(testError);

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

		vi.spyOn(mockUseCase, 'execute').mockResolvedValue(mockAuthResponse as any);

		await authController.authorize(mockRequest as Request, mockResponse as Response, mockNext);

		expect(mockNext).toHaveBeenCalledWith(testError);
	});
});
