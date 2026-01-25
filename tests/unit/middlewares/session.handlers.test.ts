import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { RedirectToLoginErrorHandle, UnAuthorizedErrorHandle } from '@presentation';
import { InvalidSessionError } from '@shared';

describe('RedirectToLoginErrorHandle', () => {
	const createMockRes = () => {
		return {
			redirect: vi.fn()
		} as unknown as Response;
	};

	const createMockReq = (originalUrl: string) => {
		return {
			originalUrl
		} as unknown as Request;
	};

	it('should redirect to /auth/login with return_url for "no-cookie"', () => {
		const req = createMockReq('/some/path?foo=bar');
		const res = createMockRes();
		const next = vi.fn() as NextFunction;

		const handler = new RedirectToLoginErrorHandle();
		handler.handle(req, res, next, 'no-cookie');

		expect(res.redirect).toHaveBeenCalledWith(
			`/auth/login?return_url=${encodeURIComponent('/some/path?foo=bar')}`
		);
	});

	it('should redirect to /auth/login with return_url for "not-found"', () => {
		const req = createMockReq('/another/path');
		const res = createMockRes();
		const next = vi.fn() as NextFunction;

		const handler = new RedirectToLoginErrorHandle();
		handler.handle(req, res, next, 'not-found');

		expect(res.redirect).toHaveBeenCalledWith(
			`/auth/login?return_url=${encodeURIComponent('/another/path')}`
		);
	});

	it('should redirect to /auth/login with return_url for "expired"', () => {
		const req = createMockReq('/expired/session');
		const res = createMockRes();
		const next = vi.fn() as NextFunction;

		const handler = new RedirectToLoginErrorHandle();
		handler.handle(req, res, next, 'expired');

		expect(res.redirect).toHaveBeenCalledWith(
			`/auth/login?return_url=${encodeURIComponent('/expired/session')}`
		);
	});

	describe('UnAuthorizedErrorHandle', () => {
		const createMockRes = () => {
			return {
				set: vi.fn()
			} as unknown as Response;
		};

		const createMockReq = (originalUrl: string) => {
			return {
				originalUrl
			} as unknown as Request;
		};

		it('should set WWW-Authenticate header and call next with InvalidSessionError for "expired"', () => {
			const req = createMockReq('/expired');
			const res = createMockRes();
			const next = vi.fn() as NextFunction;

			const handler = new UnAuthorizedErrorHandle();
			handler.handle(req, res, next, 'expired');

			expect(res.set).toHaveBeenCalledWith(
				'WWW-Authenticate',
				'Bearer error="invalid_token", error_description="Session invalid or expired"'
			);
			expect(next).toHaveBeenCalledWith(expect.any(InvalidSessionError));
			const error = (next as any).mock.calls[0][0];
			expect(error.message).toBe('The session has expired');
		});

		it('should set WWW-Authenticate header and call next with InvalidSessionError for "no-cookie"', () => {
			const req = createMockReq('/no-cookie');
			const res = createMockRes();
			const next = vi.fn() as NextFunction;

			const handler = new UnAuthorizedErrorHandle();
			handler.handle(req, res, next, 'no-cookie');

			expect(res.set).toHaveBeenCalledWith(
				'WWW-Authenticate',
				'Bearer error="invalid_token", error_description="Session invalid or expired"'
			);
			expect(next).toHaveBeenCalledWith(expect.any(InvalidSessionError));
			const error = (next as any).mock.calls[0][0];
			expect(error.message).toBe('Invalid or missing session');
		});

		it('should set WWW-Authenticate header and call next with InvalidSessionError for "not-found"', () => {
			const req = createMockReq('/not-found');
			const res = createMockRes();
			const next = vi.fn() as NextFunction;

			const handler = new UnAuthorizedErrorHandle();
			handler.handle(req, res, next, 'not-found');

			expect(res.set).toHaveBeenCalledWith(
				'WWW-Authenticate',
				'Bearer error="invalid_token", error_description="Session invalid or expired"'
			);
			expect(next).toHaveBeenCalledWith(expect.any(InvalidSessionError));
			const error = (next as any).mock.calls[0][0];
			expect(error.message).toBe('Invalid or missing session');
		});
	});
});
