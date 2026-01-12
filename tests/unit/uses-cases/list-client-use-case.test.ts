import { ListClientUseCase, ListClientResponseDTO } from '@application';
import type { IClientRepository, ILogger } from '@interfaces';

describe('ListClientUseCase', () => {
	let useCase: ListClientUseCase;
	let mockRepository: IClientRepository;
	let mockLogger: ILogger;

	beforeEach(() => {
		mockRepository = {
			findByUserId: vi.fn(),
		} as unknown as IClientRepository;

		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
		} as unknown as ILogger;

		useCase = new ListClientUseCase(mockRepository, mockLogger);
	});

	it('should list clients for a given user', async () => {
		const userId = 'user-123';
		const mockClients = [
			{ id: 'client-1', name: 'Client 1' },
			{ id: 'client-2', name: 'Client 2' },
		];

		vi.spyOn(mockRepository, 'findByUserId').mockResolvedValue(mockClients as any);
		vi.spyOn(ListClientResponseDTO, 'fromEntities').mockReturnValue({
			clients: mockClients,
		} as any);

		const result = await useCase.execute(userId);

		expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
		expect(mockLogger.debug).toHaveBeenCalledWith('[ListClientUseCase.execute] Listing OAuth clients', { userId });
		expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('OAuth clients retrieved'), {
			userId,
			count: 2,
		});
		expect(result).toBeDefined();
	});

	it('should return empty list when user has no clients', async () => {
		const userId = 'user-456';
		const mockClients: any[] = [];

		vi.spyOn(mockRepository, 'findByUserId').mockResolvedValue(mockClients);
		vi.spyOn(ListClientResponseDTO, 'fromEntities').mockReturnValue({
			clients: [],
		} as any);

		const result = await useCase.execute(userId);

		expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
		expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('OAuth clients retrieved'), {
			userId,
			count: 0,
		});
		expect(result).toBeDefined();
	});
});
