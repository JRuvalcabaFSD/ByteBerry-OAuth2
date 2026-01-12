import { ForbiddenError, NotFoundRecordError } from '@shared';
import { vi } from 'vitest';
import type { IClientRepository, ILogger } from '@interfaces';
import { DeleteClientUseCase } from '@application';

describe('DeleteClientUseCase', () => {
	let useCase: DeleteClientUseCase;
	let mockRepository: IClientRepository;
	let mockLogger: ILogger;
	let mockClient: any;

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			child: vi.fn(),
			log: vi.fn(),
			checkHealth: vi.fn(),
		};

		mockRepository = {
			findByClientId: vi.fn(),
			softDelete: vi.fn(),
		} as any;

		mockClient = {
			clientId: 'client-123',
			clientName: 'Test Client',
			userId: 'user-123',
			isOwnedBy: vi.fn(),
			isClientActive: vi.fn(),
		};

		useCase = new DeleteClientUseCase(mockRepository, mockLogger);
	});

	it('should soft delete a client successfully', async () => {
		vi.mocked(mockRepository.findByClientId).mockResolvedValue(mockClient);
		vi.mocked(mockClient.isOwnedBy).mockReturnValue(true);
		vi.mocked(mockClient.isClientActive).mockReturnValue(true);

		await useCase.execute('user-123', 'client-123');

		expect(mockRepository.findByClientId).toHaveBeenCalledWith('client-123');
		expect(mockRepository.softDelete).toHaveBeenCalledWith('client-123');
	});

	it('should throw NotFoundRecordError when client does not exist', async () => {
		vi.mocked(mockRepository.findByClientId).mockResolvedValue(null);

		await expect(useCase.execute('user-123', 'client-123')).rejects.toThrow(
			NotFoundRecordError
		);

		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it('should throw ForbiddenError when user does not own the client', async () => {
		vi.mocked(mockRepository.findByClientId).mockResolvedValue(mockClient);
		vi.mocked(mockClient.isOwnedBy).mockReturnValue(false);

		await expect(useCase.execute('user-456', 'client-123')).rejects.toThrow(
			ForbiddenError
		);

		expect(mockLogger.warn).toHaveBeenCalled();
		expect(mockRepository.softDelete).not.toHaveBeenCalled();
	});

	it('should return early if client is already inactive', async () => {
		vi.mocked(mockRepository.findByClientId).mockResolvedValue(mockClient);
		vi.mocked(mockClient.isOwnedBy).mockReturnValue(true);
		vi.mocked(mockClient.isClientActive).mockReturnValue(false);

		await useCase.execute('user-123', 'client-123');

		expect(mockRepository.softDelete).not.toHaveBeenCalled();
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'[DeleteClientUseCase.execute] Client already inactive (soft deleted)',
			expect.any(Object)
		);
	});
});
