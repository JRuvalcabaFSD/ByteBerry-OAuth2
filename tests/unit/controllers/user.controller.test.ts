import { describe, it, expect, beforeEach, vi, MockedObject } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type * as UseCases from '@interfaces';
import { UserController } from '@presentation';

describe('UserController', () => {
	let controller: UserController;
	let mockRegisterUseCase: MockedObject<UseCases.IRegisterUserUseCase>;
	let mockGetUseCase: MockedObject<UseCases.IGetUserUseCase>;
	let mockUpdateUserUseCase: MockedObject<UseCases.IUpdateUserUseCase>;
	let mockUpdatePasswordUseCase: MockedObject<UseCases.IUpdatePasswordUseCase>;
	let mockListConsentUseCase: MockedObject<UseCases.IListClientUseCase>;
	let mockDeleteConsentUseCase: MockedObject<UseCases.IDeleteClientUseCase>;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockRegisterUseCase = { execute: vi.fn() } as any;
		mockGetUseCase = { execute: vi.fn() } as any;
		mockUpdateUserUseCase = { execute: vi.fn() } as any;
		mockUpdatePasswordUseCase = { execute: vi.fn() } as any;
		mockListConsentUseCase = { execute: vi.fn() } as any;
		mockDeleteConsentUseCase = { execute: vi.fn() } as any;

		controller = new UserController(
			mockRegisterUseCase,
			mockGetUseCase,
			mockUpdateUserUseCase,
			mockUpdatePasswordUseCase,
			mockListConsentUseCase,
			mockDeleteConsentUseCase
		);

		mockReq = { body: {}, user: { userId: 'test-user-id', sessionId: 'session-123' }, params: {} };
		mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn() };
		mockNext = vi.fn();
	});

	describe('register', () => {
		it('should register a user and return 201 status', async () => {
			const mockResponse = { toJSON: () => ({ id: '1', email: 'test@example.com' }), user: {}, message: 'success' } as any;
			mockRegisterUseCase.execute.mockResolvedValue(mockResponse);
			mockReq.body = { email: 'test@example.com', password: 'password123', username: 'testuser' };

			await controller.register(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(201);
			expect(mockRes.json).toHaveBeenCalledWith({ id: '1', email: 'test@example.com' });
		});

		it('should call next with error on registration failure', async () => {
			const error = new Error('Registration failed');
			mockRegisterUseCase.execute.mockRejectedValue(error);
			mockReq.body = { email: 'test@example.com', password: 'password123', username: 'testuser' };

			await controller.register(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('getMe', () => {
		it('should retrieve user and return 200 status', async () => {
			const mockResponse = { toJSON: () => ({ userId: 'test-user-id', email: 'test@example.com' }), user: {} } as any;
			mockGetUseCase.execute.mockResolvedValue(mockResponse);

			await controller.getMe(mockReq as Request, mockRes as Response, mockNext);

			expect(mockGetUseCase.execute).toHaveBeenCalledWith('test-user-id');
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({ userId: 'test-user-id', email: 'test@example.com' });
		});

		it('should call next with error on get failure', async () => {
			const error = new Error('User not found');
			mockGetUseCase.execute.mockRejectedValue(error);

			await controller.getMe(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('updateMe', () => {
		it('should update user and return 200 status', async () => {
			const mockResponse = { toJSON: () => ({ userId: 'test-user-id', name: 'Updated Name' }), user: {} } as any;
			mockUpdateUserUseCase.execute.mockResolvedValue(mockResponse);
			mockReq.body = { fullName: 'Updated Name' };

			await controller.updateMe(mockReq as Request, mockRes as Response, mockNext);

			expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith('test-user-id', expect.any(Object));
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({ userId: 'test-user-id', name: 'Updated Name' });
		});

		it('should call next with error on update failure', async () => {
			const error = new Error('Update failed');
			mockUpdateUserUseCase.execute.mockRejectedValue(error);
			mockReq.body = { fullName: 'Updated Name' };

			await controller.updateMe(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('updatePassword', () => {
		it('should update password and return 200 status', async () => {
			const mockResponse = { toJSON: () => ({ success: true, message: 'Password updated successfully' }), message: 'Password updated successfully' } as any;
			mockUpdatePasswordUseCase.execute.mockResolvedValue(mockResponse);
			mockReq.body = { currentPassword: 'oldpass', newPassword: 'newpass123' };

			await controller.updatePassword(mockReq as Request, mockRes as Response, mockNext);

			expect(mockUpdatePasswordUseCase.execute).toHaveBeenCalledWith('test-user-id', expect.any(Object));
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Password updated successfully' });
		});

		it('should call next with error on password update failure', async () => {
			const error = new Error('Password update failed');
			mockUpdatePasswordUseCase.execute.mockRejectedValue(error);
			mockReq.body = { currentPassword: 'oldpass', newPassword: 'newpass123' };

			await controller.updatePassword(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('listConsents', () => {
		it('should list consents and return 200 status', async () => {
			const mockResponse = { toJSON: () => ([{ id: '1', clientId: 'client1' }]), clients: [{ id: '1', clientId: 'client1' }] } as any;
			mockListConsentUseCase.execute.mockResolvedValue(mockResponse);

			await controller.listConsents(mockReq as Request, mockRes as Response, mockNext);

			expect(mockListConsentUseCase.execute).toHaveBeenCalledWith('test-user-id');
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith([{ id: '1', clientId: 'client1' }]);
		});

		it('should call next with error on list failure', async () => {
			const error = new Error('List consents failed');
			mockListConsentUseCase.execute.mockRejectedValue(error);

			await controller.listConsents(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('revokeConsent', () => {
		it('should revoke consent and return 204 status', async () => {
			mockReq.params = { id: 'consent-123' };
			mockDeleteConsentUseCase.execute.mockResolvedValue(undefined);

			await controller.revokeConsent(mockReq as Request, mockRes as Response, mockNext);

			expect(mockDeleteConsentUseCase.execute).toHaveBeenCalledWith('test-user-id', 'consent-123');
			expect(mockRes.status).toHaveBeenCalledWith(204);
			expect(mockRes.send).toHaveBeenCalled();
		});

		it('should call next with error on revoke failure', async () => {
			const error = new Error('Revoke consent failed');
			mockReq.params = { id: 'consent-123' };
			mockDeleteConsentUseCase.execute.mockRejectedValue(error);

			await controller.revokeConsent(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});
});
