import type { IClientRepository, IConsentRepository, ILogger } from '@interfaces';
import { ListConsentsResponseDTO, ListConsentUseCase } from '@application';

describe('ListConsentUseCase', () => {
	let useCase: ListConsentUseCase;
	let consentRepository: IConsentRepository;
	let clientRepository: IClientRepository;
	let logger: ILogger;

	beforeEach(() => {
		consentRepository = {
			findByUserId: vi.fn(),
		} as unknown as IConsentRepository;

		clientRepository = {
			findByClientId: vi.fn(),
		} as unknown as IClientRepository;

		logger = {
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as ILogger;

		useCase = new ListConsentUseCase(consentRepository, clientRepository, logger);
	});

	it('should return empty response when no consents found', async () => {
		vi.mocked(consentRepository.findByUserId).mockResolvedValue([]);

		const result = await useCase.execute('user-123');

		expect(result).toEqual(ListConsentsResponseDTO.fromEntities([], new Map()));
		expect(logger.debug).toHaveBeenCalledWith('No consents found for user', { userId: 'user-123' });
	});

	it('should retrieve consents and enrich with client names', async () => {
		const mockConsents = [
			{ clientId: 'client-1', userId: 'user-123' },
			{ clientId: 'client-2', userId: 'user-123' },
		];
		const mockClients = [
			{ clientId: 'client-1', clientName: 'App One' },
			{ clientId: 'client-2', clientName: 'App Two' },
		];

		vi.mocked(consentRepository.findByUserId).mockResolvedValue(mockConsents as any);
		vi.mocked(clientRepository.findByClientId)
			.mockResolvedValueOnce(mockClients[0] as unknown as any)
			.mockResolvedValueOnce(mockClients[1] as unknown as any);

		const result = await useCase.execute('user-123');

		expect(clientRepository.findByClientId).toHaveBeenCalledWith('client-1');
		expect(clientRepository.findByClientId).toHaveBeenCalledWith('client-2');
		expect(logger.debug).toHaveBeenCalledWith('User consents retrieved successfully', {
			userId: 'user-123',
			count: 2,
			uniqueClients: 2,
		});
	});

	it('should handle client fetch errors gracefully', async () => {
		const mockConsents = [{ clientId: 'client-1', userId: 'user-123' }];

		vi.mocked(consentRepository.findByUserId).mockResolvedValue(mockConsents as any);
		vi.mocked(clientRepository.findByClientId).mockRejectedValue(new Error('Network error'));

		const result = await useCase.execute('user-123');

		expect(logger.warn).toHaveBeenCalledWith('Failed to fetch client name', {
			clientId: 'client-1',
			error: 'Network error',
		});
	});

	it('should handle duplicate client IDs', async () => {
		const mockConsents = [
			{ clientId: 'client-1', userId: 'user-123' },
			{ clientId: 'client-1', userId: 'user-123' },
		];

		vi.mocked(consentRepository.findByUserId).mockResolvedValue(mockConsents as any);
		vi.mocked(clientRepository.findByClientId).mockResolvedValue({
			clientId: 'client-1',
			clientName: 'App One',
		} as unknown as any);

		await useCase.execute('user-123');

		expect(clientRepository.findByClientId).toHaveBeenCalledTimes(1);
		expect(logger.debug).toHaveBeenCalledWith('User consents retrieved successfully', {
			userId: 'user-123',
			count: 2,
			uniqueClients: 1,
		});
	});

	it('should return null userId as empty response', async () => {
		vi.mocked(consentRepository.findByUserId).mockResolvedValue(null);

		const result = await useCase.execute('user-123');

		expect(result).toEqual(ListConsentsResponseDTO.fromEntities([], new Map()));
	});
});
