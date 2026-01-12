import { UpdateClientUseCase, UpdateClientRequestDTO, ClientResponseDTO } from '@application';
import { vi, Mocked } from 'vitest';
import { ClientEntity } from '@domain';
import { IClientRepository, ILogger } from '@interfaces';
import { ForbiddenError, NotFoundRecordError } from '@shared';

describe('UpdateClientUseCase', () => {
	let useCase: UpdateClientUseCase;
	let mockRepository: Mocked<IClientRepository>;
	let mockLogger: Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			findByClientId: vi.fn(),
			update: vi.fn(),
		} as unknown as Mocked<IClientRepository>;
		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
		} as unknown as Mocked<ILogger>;
		useCase = new UpdateClientUseCase(mockRepository, mockLogger);
	});

	it('should successfully update a client with all fields', async () => {
		const userId = 'user-123';
		const clientId = 'client-456';
		const existingClient = {
			clientId,
			userId,
			clientName: 'Old Name',
			redirectUris: ['http://old.com'],
			grantTypes: ['authorization_code'],
			isPublic: false,
			isOwnedBy: vi.fn().mockReturnValue(true),
		};
		const updateRequest: UpdateClientRequestDTO = {
			clientName: 'New Name',
			redirectUris: ['http://new.com'],
			grantTypes: ['implicit'],
			isPublic: true,
		};
		const updatedClientEntity = { ...existingClient, ...updateRequest };

		mockRepository.findByClientId.mockResolvedValue(existingClient as unknown as ClientEntity);
		vi.spyOn(ClientEntity, 'create').mockReturnValue(updatedClientEntity as any);
		vi.spyOn(ClientResponseDTO, 'fromEntity').mockReturnValue({ clientId } as any);

		const result = await useCase.execute(userId, clientId, updateRequest);

		expect(mockRepository.findByClientId).toHaveBeenCalledWith(clientId);
		expect(existingClient.isOwnedBy).toHaveBeenCalledWith(userId);
		expect(mockRepository.update).toHaveBeenCalledWith(updatedClientEntity);
		expect(result).toEqual({ clientId });
	});

	it('should throw NotFoundRecordError when client does not exist', async () => {
		const userId = 'user-123';
		const clientId = 'nonexistent';
		const updateRequest: UpdateClientRequestDTO = { clientName: 'New Name' };

		mockRepository.findByClientId.mockResolvedValue(null);

		await expect(useCase.execute(userId, clientId, updateRequest)).rejects.toThrow(NotFoundRecordError);
		expect(mockLogger.warn).toHaveBeenCalledWith('Client not found for update', { userId, clientId });
	});

	it('should throw ForbiddenError when user does not own the client', async () => {
		const userId = 'user-123';
		const ownerId = 'user-999';
		const clientId = 'client-456';
		const existingClient = {
			clientId,
			userId: ownerId,
			isOwnedBy: vi.fn().mockReturnValue(false),
		};
		const updateRequest: UpdateClientRequestDTO = { clientName: 'New Name' };

		mockRepository.findByClientId.mockResolvedValue(existingClient as unknown as ClientEntity);

		await expect(useCase.execute(userId, clientId, updateRequest)).rejects.toThrow(ForbiddenError);
		expect(mockLogger.warn).toHaveBeenCalledWith('User attempted to update client they do not own', {
			userId,
			clientId,
			ownerId,
		});
	});

	it('should preserve existing fields when not provided in update request', async () => {
		const userId = 'user-123';
		const clientId = 'client-456';
		const existingClient = {
			clientId,
			userId,
			clientName: 'Original Name',
			redirectUris: ['http://original.com'],
			grantTypes: ['authorization_code'],
			isPublic: false,
			isOwnedBy: vi.fn().mockReturnValue(true),
		};
		const updateRequest: UpdateClientRequestDTO = { clientName: 'Updated Name' };

		mockRepository.findByClientId.mockResolvedValue(existingClient as unknown as ClientEntity);
		vi.spyOn(ClientEntity, 'create').mockReturnValue(existingClient as any);
		vi.spyOn(ClientResponseDTO, 'fromEntity').mockReturnValue({ clientId } as any);

		await useCase.execute(userId, clientId, updateRequest);

		expect(ClientEntity.create).toHaveBeenCalledWith(
			expect.objectContaining({
				clientName: 'Updated Name',
				redirectUris: existingClient.redirectUris,
				grantTypes: existingClient.grantTypes,
				isPublic: existingClient.isPublic,
			})
		);
	});

	it('should log successful update with updated fields', async () => {
		const userId = 'user-123';
		const clientId = 'client-456';
		const existingClient = {
			clientId,
			userId,
			clientName: 'Old',
			isOwnedBy: vi.fn().mockReturnValue(true),
		};
		const updateRequest: UpdateClientRequestDTO = { clientName: 'New' };

		mockRepository.findByClientId.mockResolvedValue(existingClient as unknown as ClientEntity);
		vi.spyOn(ClientEntity, 'create').mockReturnValue(existingClient as any);
		vi.spyOn(ClientResponseDTO, 'fromEntity').mockReturnValue({ clientId } as any);

		await useCase.execute(userId, clientId, updateRequest);

		expect(mockLogger.info).toHaveBeenCalledWith('Client updated successfully', {
			userId,
			clientId,
			updatedFields: ['clientName'],
		});
	});
});
