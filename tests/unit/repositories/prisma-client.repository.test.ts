import type { DBConfig } from '@config';
import type { ClientEntity } from '@domain';
import { ClientRepository } from '@infrastructure';
import type { ILogger } from '@interfaces';

vi.mock('@shared', () => ({
	handledPrismaError: vi.fn((error) => error),
	getErrMessage: vi.fn((error) => error?.message || 'Unknown error'),
	Injectable: () => (target: any) => target,
	LogContextClass: () => (target: any) => target,
	LogContextMethod: () => (target: any) => target,
}));

vi.mock('@infrastructure', async () => {
	const actual = await vi.importActual('@infrastructure');
	return {
		...actual,
		clientMapper: {
			toDomain: vi.fn((client) => client),
		},
	};
});

describe('ClientRepository', () => {
	let repository: ClientRepository;
	let mockPrismaClient: any;
	let mockLogger: ILogger;
	let mockDbConfig: DBConfig;

	beforeEach(() => {
		mockPrismaClient = {
			oAuthClient: {
				findUnique: vi.fn(),
				findMany: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				count: vi.fn(),
			},
		};

		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
		} as any;

		mockDbConfig = {
			getClient: vi.fn(() => mockPrismaClient),
		} as any;

		repository = new ClientRepository(mockDbConfig, mockLogger);
	});

	describe('findByClientId', () => {
		it('should return a client entity when found', async () => {
			const clientData = { id: '1', clientId: 'test-client', userId: 'user-1' };
			mockPrismaClient.oAuthClient.findUnique.mockResolvedValue(clientData);

			const result = await repository.findByClientId('test-client');

			expect(result).toMatchObject({ id: '1', clientId: 'test-client', userId: 'user-1' });
			expect(mockPrismaClient.oAuthClient.findUnique).toHaveBeenCalledWith({ where: { clientId: 'test-client' } });
		});

		it('should return null when client not found', async () => {
			mockPrismaClient.oAuthClient.findUnique.mockResolvedValue(null);

			const result = await repository.findByClientId('non-existent');

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('OAuth client not found by clientId', { clientId: 'non-existent' });
		});

		it('should throw handled error on database failure', async () => {
			const dbError = new Error('DB Error');
			mockPrismaClient.oAuthClient.findUnique.mockRejectedValue(dbError);

			await expect(repository.findByClientId('test-client')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to find OAuth client by clientId', { clientId: 'test-client' });
		});
	});

	describe('findById', () => {
		it('should return a client entity when found', async () => {
			const clientData = { id: '1', clientId: 'test-client' };
			mockPrismaClient.oAuthClient.findUnique.mockResolvedValue(clientData);

			const result = await repository.findById('1');

			expect(result).toMatchObject({ id: '1', clientId: 'test-client' });
			expect(mockPrismaClient.oAuthClient.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
		});

		it('should return null when client not found', async () => {
			mockPrismaClient.oAuthClient.findUnique.mockResolvedValue(null);

			const result = await repository.findById('non-existent');

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('OAuth client not found by id', { id: 'non-existent' });
		});
	});

	describe('findByUserId', () => {
		it('should return active clients for user', async () => {
			const clients = [
				{ id: '1', clientId: 'client-1', userId: 'user-1', isActive: true },
				{ id: '2', clientId: 'client-2', userId: 'user-1', isActive: true },
			];
			mockPrismaClient.oAuthClient.findMany.mockResolvedValue(clients);

			const result = await repository.findByUserId('user-1');

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ id: '1', clientId: 'client-1', userId: 'user-1' });
			expect(result[1]).toMatchObject({ id: '2', clientId: 'client-2', userId: 'user-1' });
			expect(mockPrismaClient.oAuthClient.findMany).toHaveBeenCalledWith({
				where: { userId: 'user-1', isActive: true },
				orderBy: { createdAt: 'desc' },
			});
			expect(mockLogger.debug).toHaveBeenCalledWith('Found OAuth clients for user', { userId: 'user-1', count: 2 });
		});

		it('should return empty array when no clients found', async () => {
			mockPrismaClient.oAuthClient.findMany.mockResolvedValue([]);

			const result = await repository.findByUserId('user-1');

			expect(result).toEqual([]);
		});
	});

	describe('findAllByUserId', () => {
		it('should return all clients for user regardless of active status', async () => {
			const clients = [
				{ id: '1', clientId: 'client-1', userId: 'user-1' },
				{ id: '2', clientId: 'client-2', userId: 'user-1' },
			];
			mockPrismaClient.oAuthClient.findMany.mockResolvedValue(clients);

			const result = await repository.findAllByUserId('user-1');

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ id: '1', clientId: 'client-1', userId: 'user-1' });
			expect(result[1]).toMatchObject({ id: '2', clientId: 'client-2', userId: 'user-1' });
			expect(mockPrismaClient.oAuthClient.findMany).toHaveBeenCalledWith({
				where: { userId: 'user-1' },
				orderBy: { createdAt: 'desc' },
			});
		});
	});

	describe('save', () => {
		it('should create a new client', async () => {
			const client = { id: '1', clientId: 'new-client', userId: 'user-1' } as ClientEntity;
			mockPrismaClient.oAuthClient.create.mockResolvedValue(client);

			await repository.save(client);

			expect(mockPrismaClient.oAuthClient.create).toHaveBeenCalledWith({ data: client });
			expect(mockLogger.debug).toHaveBeenCalledWith('OAuth client created successfully', {
				id: '1',
				clientId: 'new-client',
				userId: 'user-1',
			});
		});

		it('should throw error on creation failure', async () => {
			const client = { id: '1', clientId: 'new-client' } as ClientEntity;
			const dbError = new Error('Create failed');
			mockPrismaClient.oAuthClient.create.mockRejectedValue(dbError);

			await expect(repository.save(client)).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('OAuth client creation failed', { clientId: 'new-client' });
		});
	});

	describe('update', () => {
		it('should update an existing client', async () => {
			const client = {
				id: '1',
				clientId: 'test-client',
				clientName: 'Updated App',
				redirectUris: ['https://app.example.com'],
				grantTypes: ['authorization_code'],
				isPublic: false,
				isActive: true,
				updatedAt: new Date(),
			} as ClientEntity;

			mockPrismaClient.oAuthClient.update.mockResolvedValue(client);

			await repository.update(client);

			expect(mockPrismaClient.oAuthClient.update).toHaveBeenCalledWith({
				where: { clientId: 'test-client' },
				data: {
					clientName: 'Updated App',
					redirectUris: ['https://app.example.com'],
					grantTypes: ['authorization_code'],
					isPublic: false,
					isActive: true,
					updatedAt: client.updatedAt,
				},
			});
		});
	});

	describe('softDelete', () => {
		it('should mark client as inactive', async () => {
			mockPrismaClient.oAuthClient.update.mockResolvedValue({});

			await repository.softDelete('client-id');

			expect(mockPrismaClient.oAuthClient.update).toHaveBeenCalled();
			const call = mockPrismaClient.oAuthClient.update.mock.calls[0][0];
			expect(call.where).toEqual({ clientId: 'client-id' });
			expect(call.data.isActive).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith('OAuth client soft deleted', { id: 'client-id' });
		});
	});

	describe('existByClientId', () => {
		it('should return true when client exists', async () => {
			mockPrismaClient.oAuthClient.count.mockResolvedValue(1);

			const result = await repository.existByClientId('test-client');

			expect(result).toBe(true);
			expect(mockPrismaClient.oAuthClient.count).toHaveBeenCalledWith({ where: { clientId: 'test-client' } });
		});

		it('should return false when client does not exist', async () => {
			mockPrismaClient.oAuthClient.count.mockResolvedValue(0);

			const result = await repository.existByClientId('non-existent');

			expect(result).toBe(false);
		});
	});

	describe('rotateSecret', () => {
		it('should update client secret with new hash', async () => {
			const gracePeriodExpiration = new Date();
			mockPrismaClient.oAuthClient.update.mockResolvedValue({});

			await repository.rotateSecret('client-id', 'new-hash', 'old-hash', gracePeriodExpiration);

			expect(mockPrismaClient.oAuthClient.update).toHaveBeenCalledWith({
				where: { clientId: 'client-id' },
				data: {
					clientSecret: 'new-hash',
					clientSecretOld: 'old-hash',
					secretExpiresAt: gracePeriodExpiration,
					updatedAt: expect.any(Date),
				},
			});
			expect(mockLogger.debug).toHaveBeenCalledWith('Client secret rotated successfully', {
				clientId: 'client-id',
				gracePeriodExpiresAt: gracePeriodExpiration.toISOString(),
			});
		});

		it('should throw error on rotation failure', async () => {
			const dbError = new Error('Rotation failed');
			mockPrismaClient.oAuthClient.update.mockRejectedValue(dbError);

			await expect(repository.rotateSecret('client-id', 'new-hash', 'old-hash', new Date())).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
});
