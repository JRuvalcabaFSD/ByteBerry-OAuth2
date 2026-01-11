import { NotFoundRecordError, ForbiddenError } from '@shared';
import { vi, Mocked } from 'vitest';
import type { IClientRepository, ILogger } from '@interfaces';
import { GetClientByIdUseCase, ClientResponseDTO } from '@application';

describe('GetClientByIdUseCase', () => {
	let useCase: GetClientByIdUseCase;
	let mockRepository: Mocked<IClientRepository>;
	let mockLogger: Mocked<ILogger>;

	beforeEach(() => {
		mockRepository = {
			findByClientId: vi.fn(),
		} as unknown as Mocked<IClientRepository>;

		mockLogger = {
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as Mocked<ILogger>;

		useCase = new GetClientByIdUseCase(mockRepository, mockLogger);
	});

	it('should return ClientResponseDTO when client exists and user owns it', async () => {
		const userId = 'user-123';
		const clientId = 'client-123';
		const mockClient = {
			isOwnedBy: vi.fn().mockReturnValue(true),
		} as unknown as any;

		vi.spyOn(ClientResponseDTO, 'fromEntity').mockReturnValue({
			id: clientId,
		} as unknown as ClientResponseDTO);
		mockRepository.findByClientId.mockResolvedValue(mockClient);

		const result = await useCase.execute(userId, clientId);

		expect(mockRepository.findByClientId).toHaveBeenCalledWith(clientId);
		expect(mockClient.isOwnedBy).toHaveBeenCalledWith(userId);
		expect(result).toEqual({ id: clientId });
	});

	it('should throw NotFoundRecordError when client does not exist', async () => {
		const userId = 'user-123';
		const clientId = 'client-123';

		mockRepository.findByClientId.mockResolvedValue(null);

		await expect(useCase.execute(userId, clientId)).rejects.toThrow(NotFoundRecordError);
		expect(mockLogger.warn).toHaveBeenCalledWith('OAuth client not found', { clientId });
	});

	it('should throw ForbiddenError when user does not own the client', async () => {
		const userId = 'user-123';
		const clientId = 'client-123';
		const ownerId = 'user-456';
		const mockClient = {
			userId: ownerId,
			isOwnedBy: vi.fn().mockReturnValue(false),
		} as unknown as any;

		mockRepository.findByClientId.mockResolvedValue(mockClient);

		await expect(useCase.execute(userId, clientId)).rejects.toThrow(ForbiddenError);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			"User attempted to access another user's OAuth client",
			expect.objectContaining({ userId, clientId, ownerId })
		);
	});

	it('should log debug message when executing', async () => {
		const userId = 'user-123';
		const clientId = 'client-123';

		mockRepository.findByClientId.mockResolvedValue(null);

		try {
			await useCase.execute(userId, clientId);
		} catch {
			/* */
		}

		expect(mockLogger.debug).toHaveBeenCalledWith('Getting OAuth client', { userId, clientId });
	});
});
