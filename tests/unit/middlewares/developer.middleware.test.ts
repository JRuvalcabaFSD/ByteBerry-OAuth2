import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenError } from '@shared';
import type { Request, Response, NextFunction } from 'express';
import type { ILogger, IUserRepository } from '@interfaces';
import { createDeveloperMiddleware } from '@presentation';

function mockLogger(): ILogger {
	return {
		debug: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		child: vi.fn().mockReturnThis(),
		log: vi.fn(),
		checkHealth: vi.fn(),
	};
}

describe('createDeveloperMiddleware', () => {
	let repository: IUserRepository;
	let logger: ILogger;
	let req: Partial<Request>;
	let res: Partial<Response>;
	let next: NextFunction;

	beforeEach(() => {
		logger = mockLogger();
		repository = {
			findById: vi.fn(),
		} as any;
		req = {};
		res = {};
		next = vi.fn();
	});

	it('should throw ForbiddenError if req.user is missing', async () => {
		const middleware = createDeveloperMiddleware(repository, logger);
		req.user = undefined;

		await middleware(req as Request, res as Response, next);

		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
		expect(logger.debug).toHaveBeenCalledWith('[createRequireDeveloperMiddleware] Developer access check failed - no authenticate user');
	});

	it('should throw ForbiddenError if user not found', async () => {
		const middleware = createDeveloperMiddleware(repository, logger);
		req.user = { userId: '123', sessionId: 'sess-1' } as any;
		(repository.findById as any).mockResolvedValue(null);

		await middleware(req as Request, res as Response, next);

		expect(repository.findById).toHaveBeenCalledWith('123');
		expect(logger.warn).toHaveBeenCalledWith(
			'Developer access check failed - user not found',
			{ userId: '123' }
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it('should throw ForbiddenError if user cannot create clients', async () => {
		const middleware = createDeveloperMiddleware(repository, logger);
		req.user = { userId: '123', sessionId: 'sess-1' } as any;
		const user = {
			id: '123',
			email: 'dev@example.com',
			isDeveloper: false,
			accountType: 'basic',
			canCreateClients: vi.fn().mockReturnValue(false),
		};
		(repository.findById as any).mockResolvedValue(user);

		await middleware(req as Request, res as Response, next);

		expect(user.canCreateClients).toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			'Developer access denied',
			{
				userId: user.id,
				email: user.email,
				isDeveloper: user.isDeveloper,
				accountType: user.accountType,
			}
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it('should call next() if user can create clients', async () => {
		const middleware = createDeveloperMiddleware(repository, logger);
		req.user = { userId: '123', sessionId: 'sess-1' } as any;
		const user = {
			id: '123',
			email: 'dev@example.com',
			isDeveloper: true,
			accountType: 'developer',
			canCreateClients: vi.fn().mockReturnValue(true),
		};
		(repository.findById as any).mockResolvedValue(user);

		await middleware(req as Request, res as Response, next);

		expect(user.canCreateClients).toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith(
			'Developer access granted',
			{
				userId: user.id,
				email: user.email,
				accountType: user.accountType,
			}
		);
		expect(next).toHaveBeenCalledWith();
	});

	it('should pass any thrown error to next', async () => {
		const middleware = createDeveloperMiddleware(repository, logger);
		req.user = { userId: '123', sessionId: 'sess-1' } as any;
		const error = new Error('db error');
		(repository.findById as any).mockRejectedValue(error);

		await middleware(req as Request, res as Response, next);

		expect(next).toHaveBeenCalledWith(error);
	});
});
