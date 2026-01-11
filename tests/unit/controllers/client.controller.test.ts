import type * as UseCases from '@interfaces';
import { ClientController } from '@presentation';
import { Request, Response, NextFunction } from 'express';

describe('ClientController', () => {
	let controller: ClientController;
	let mockCreateUseCase: any;
	let mockListUseCase: any;
	let mockGetUseCase: any;
	let mockUpdateUseCase: any;
	let mockDeleteUseCase: any;
	let mockRotateUseCase: any;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockCreateUseCase = {
			execute: vi.fn(),
		} as any;
		mockListUseCase = {
			execute: vi.fn(),
		} as any;
		mockGetUseCase = {
			execute: vi.fn(),
		} as any;
		mockUpdateUseCase = {
			execute: vi.fn(),
		} as any;
		mockDeleteUseCase = {
			execute: vi.fn(),
		} as any;
		mockRotateUseCase = {
			execute: vi.fn(),
		} as any;

		controller = new ClientController(
			mockCreateUseCase as unknown as UseCases.ICreateClientUseCase,
			mockListUseCase as unknown as UseCases.IListClientUseCase,
			mockGetUseCase as unknown as UseCases.IGetClientByIdUseCase,
			mockUpdateUseCase as unknown as UseCases.IUpdateClientUseCase,
			mockDeleteUseCase as unknown as UseCases.IDeleteClientUseCase,
			mockRotateUseCase as unknown as UseCases.IRotateSecretUseCase
		);

		mockReq = {
			user: { userId: 'test-user-id', sessionId: 'session-123' },
			body: {},
			params: {},
		};

		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
		};

		mockNext = vi.fn();
	});

	describe('create', () => {
		it('should create a client and return 201 status', async () => {
			const mockClientResponse = { toJSON: vi.fn().mockReturnValue({ id: '1', name: 'Test' }) };
			mockCreateUseCase.execute.mockResolvedValue(mockClientResponse);
			mockReq.body = {
				clientName: 'Test Client',
				redirectUris: ['https://example.com/callback'],
			};

			await controller.create(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(201);
			expect(mockRes.json).toHaveBeenCalledWith({ id: '1', name: 'Test' });
		});

		it('should call next with error on exception', async () => {
			const error = new Error('Create failed');
			mockCreateUseCase.execute.mockRejectedValue(error);
			mockReq.body = {
				clientName: 'Test Client',
				redirectUris: ['https://example.com/callback'],
			};

			await controller.create(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('list', () => {
		it('should list clients and return 200 status', async () => {
			const mockClientsResponse = { toJSON: vi.fn().mockReturnValue([{ id: '1', name: 'Client1' }]) };
			mockListUseCase.execute.mockResolvedValue(mockClientsResponse);

			await controller.list(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith([{ id: '1', name: 'Client1' }]);
		});

		it('should call next with error on exception', async () => {
			const error = new Error('List failed');
			mockListUseCase.execute.mockRejectedValue(error);

			await controller.list(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('getById', () => {
		it('should get client by id and return 200 status', async () => {
			mockReq.params = { id: 'client-1' };
			const mockClientResponse = { toJSON: vi.fn().mockReturnValue({ id: 'client-1', name: 'Test' }) };
			mockGetUseCase.execute.mockResolvedValue(mockClientResponse);

			await controller.getById(mockReq as Request, mockRes as Response, mockNext);

			expect(mockGetUseCase.execute).toHaveBeenCalledWith('test-user-id', 'client-1');
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({ id: 'client-1', name: 'Test' });
		});

		it('should call next with error on exception', async () => {
			mockReq.params = { id: 'client-1' };
			const error = new Error('Get failed');
			mockGetUseCase.execute.mockRejectedValue(error);

			await controller.getById(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('update', () => {
		it('should update client and return 200 status', async () => {
			mockReq.params = { id: 'client-1' };
			mockReq.body = { clientName: 'Updated' };
			const mockClientResponse = { toJSON: vi.fn().mockReturnValue({ id: 'client-1', name: 'Updated' }) };
			mockUpdateUseCase.execute.mockResolvedValue(mockClientResponse);

			await controller.update(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({ id: 'client-1', name: 'Updated' });
		});

		it('should call next with error on exception', async () => {
			mockReq.params = { id: 'client-1' };
			mockReq.body = { clientName: 'Updated' };
			const error = new Error('Update failed');
			mockUpdateUseCase.execute.mockRejectedValue(error);

			await controller.update(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('delete', () => {
		it('should delete client and return 204 status', async () => {
			mockReq.params = { id: 'client-1' };
			mockDeleteUseCase.execute.mockResolvedValue(undefined);

			await controller.delete(mockReq as Request, mockRes as Response, mockNext);

			expect(mockDeleteUseCase.execute).toHaveBeenCalledWith('test-user-id', 'client-1');
			expect(mockRes.status).toHaveBeenCalledWith(204);
			expect(mockRes.send).toHaveBeenCalled();
		});

		it('should call next with error on exception', async () => {
			mockReq.params = { id: 'client-1' };
			const error = new Error('Delete failed');
			mockDeleteUseCase.execute.mockRejectedValue(error);

			await controller.delete(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});

	describe('rotate', () => {
		it('should rotate secret and return 200 status', async () => {
			mockReq.params = { id: 'client-1' };
			const mockClientResponse = { toJSON: vi.fn().mockReturnValue({ id: 'client-1', secret: 'new-secret' }) };
			mockRotateUseCase.execute.mockResolvedValue(mockClientResponse);

			await controller.rotate(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRotateUseCase.execute).toHaveBeenCalledWith('test-user-id', 'client-1');
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({ id: 'client-1', secret: 'new-secret' });
		});

		it('should call next with error on exception', async () => {
			mockReq.params = { id: 'client-1' };
			const error = new Error('Rotate failed');
			mockRotateUseCase.execute.mockRejectedValue(error);

			await controller.rotate(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith(error);
		});
	});
});
