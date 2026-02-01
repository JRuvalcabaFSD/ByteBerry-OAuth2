import type { ILogger, IConfig, ILoginUseCase } from '@interfaces';
import { LoginRequestDTO } from '@application';
import { LoginController } from '@presentation';

describe('LoginController', () => {
	let controller: LoginController;
	let mockLogger: ILogger;
	let mockConfig: IConfig;
	let mockUseCase: ILoginUseCase;
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		} as unknown as ILogger;

		mockConfig = {
			version: '1.0.0',
			serviceUrl: 'https://example.com',
			isProduction: vi.fn().mockReturnValue(false),
			sessionCookieName: 'session_id',
			cookieMaxAge: 3600000,
			cookieHttpOnly: true,
			cookieSameSite: 'lax',
		} as unknown as IConfig;

		mockUseCase = {
			execute: vi.fn(),
		};

		mockReq = {
			cookies: {},
			query: {},
			body: {},
			ip: '127.0.0.1',
		};

		mockRes = {
			set: vi.fn().mockReturnThis(),
			render: vi.fn().mockReturnThis(),
			cookie: vi.fn().mockReturnThis(),
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			redirect: vi.fn().mockReturnThis(),
		};

		mockNext = vi.fn();

		controller = new LoginController(mockLogger, mockConfig, mockUseCase);
	});

	describe('getLoginForm', () => {
		it('should render login form with nonce and version', async () => {
			await controller.getLoginForm(mockReq, mockRes, mockNext);

			expect(mockRes.set).toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.stringContaining("script-src 'self' 'nonce-")
			);
			expect(mockRes.render).toHaveBeenCalledWith(
				'login',
				expect.objectContaining({
					version: '1.0.0',
					nonce: expect.any(String),
					returnUrl: '',
				})
			);
		});

		it('should include return_url from query params', async () => {
			mockReq.query.return_url = '/dashboard';

			await controller.getLoginForm(mockReq, mockRes, mockNext);

			expect(mockRes.render).toHaveBeenCalledWith(
				'login',
				expect.objectContaining({
					returnUrl: '/dashboard',
				})
			);
		});

		it('should log existing session cookie', async () => {
			mockReq.cookies.session_id = 'existing-session';

			await controller.getLoginForm(mockReq, mockRes, mockNext);

			expect(mockLogger.debug).toHaveBeenNthCalledWith(
				1,
				'User already has session cookie',
				expect.objectContaining({ sessionId: 'existing-session' })
			);
		});

		it('should call next with error on exception', async () => {
			const error = new Error('Render error');
			mockRes.render.mockImplementation(() => {
				throw error;
			});

			await controller.getLoginForm(mockReq, mockRes, mockNext);

			expect(mockLogger.error).toHaveBeenCalledWith('Error rendering login form', { error });
			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('login', () => {
		beforeEach(() => {
			vi.spyOn(LoginRequestDTO, 'fromBody').mockReturnValue({
				rememberMe: false,
			} as any);
		});

		it('should set session cookie and return user data', async () => {
			const mockResponse = {
				sessionId: 'session-123',
				user: { id: 'user-1' },
				toJson: vi.fn().mockReturnValue({ user: { id: 'user-1' } }),
			};

			(mockUseCase.execute as any).mockResolvedValue(mockResponse);

			await controller.login(mockReq, mockRes, mockNext);

			expect(mockRes.cookie).toHaveBeenCalledWith(
				'session_id',
				'session-123',
				expect.objectContaining({
					httpOnly: true,
					secure: false,
					sameSite: 'lax',
					maxAge: 3600000,
					path: '/',
				})
			);
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalled();
		});

		it('should use extended cookie age for rememberMe', async () => {
			(LoginRequestDTO.fromBody as any).mockReturnValue({ rememberMe: true });

			const mockResponse = {
				sessionId: 'session-123',
				user: { id: 'user-1' },
				toJson: vi.fn().mockReturnValue({}),
			};

			(mockUseCase.execute as any).mockResolvedValue(mockResponse);

			await controller.login(mockReq, mockRes, mockNext);

			expect(mockRes.cookie).toHaveBeenCalledWith(
				'session_id',
				'session-123',
				expect.objectContaining({
					maxAge: 30 * 24 * 3600000,
				})
			);
		});

		it('should redirect to valid internal return_url', async () => {
			mockReq.body.return_url = '/dashboard';

			const mockResponse = {
				sessionId: 'session-123',
				user: { id: 'user-1' },
				toJson: vi.fn(),
			};

			(mockUseCase.execute as any).mockResolvedValue(mockResponse);

			await controller.login(mockReq, mockRes, mockNext);

			expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
		});

		it('should not redirect to external return_url', async () => {
			mockReq.body.return_url = 'https://evil.com/phishing';

			const mockResponse = {
				sessionId: 'session-123',
				user: { id: 'user-1' },
				toJson: vi.fn().mockReturnValue({}),
			};

			(mockUseCase.execute as any).mockResolvedValue(mockResponse);

			await controller.login(mockReq, mockRes, mockNext);

			expect(mockLogger.warn).toHaveBeenCalledWith('Invalid return_url detected, ignoring', expect.any(Object));
			expect(mockRes.redirect).not.toHaveBeenCalled();
			expect(mockRes.json).toHaveBeenCalled();
		});

		it('should call next with error on exception', async () => {
			const error = new Error('Login failed');
			(mockUseCase.execute as any).mockRejectedValue(error);

			await controller.login(mockReq, mockRes, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('isInternalUrl', () => {
		it('should allow relative URLs starting with /', () => {
			const result = (controller as any).isInternalUrl('/dashboard');
			expect(result).toBe(true);
		});

		it('should reject protocol-relative URLs', () => {
			const result = (controller as any).isInternalUrl('//evil.com');
			expect(result).toBe(false);
		});

		it('should reject javascript: URLs', () => {
			const result = (controller as any).isInternalUrl('javascript:alert("xss")');
			expect(result).toBe(false);
		});

		it('should allow same-origin absolute URLs', () => {
			const result = (controller as any).isInternalUrl('https://example.com/dashboard');
			expect(result).toBe(true);
		});

		it('should reject different-origin absolute URLs', () => {
			const result = (controller as any).isInternalUrl('https://evil.com/phishing');
			expect(result).toBe(false);
		});

		it('should reject invalid URLs', () => {
			const result = (controller as any).isInternalUrl('not a valid url');
			expect(result).toBe(false);
		});
	});
});
