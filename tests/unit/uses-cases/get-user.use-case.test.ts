import { NotFoundRecordError } from '@shared';
import { GetUserUseCase, UserResponseDTO } from '@application';
import type { IUserRepository, ILogger } from '@interfaces';

describe('GetUserUseCase', () => {
	let useCase: GetUserUseCase;
	let mockRepository: IUserRepository;
	let mockLogger: ILogger;

	beforeEach(() => {
		mockRepository = {
			findById: vi.fn(),
		} as unknown as IUserRepository;

		mockLogger = {
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as ILogger;

		useCase = new GetUserUseCase(mockRepository, mockLogger);
	});

	it('should retrieve user and return UserResponseDTO on success', async () => {
		const userId = 'user-123';
		const mockUser = { id: userId, email: 'test@example.com' };
		const mockDto = {
			user: { id: userId, email: 'test@example.com' },
			toJSON: vi.fn(),
		};

		vi.spyOn(mockRepository, 'findById').mockResolvedValue(mockUser as never);
		vi.spyOn(UserResponseDTO, 'fromEntity').mockReturnValue(mockDto as unknown as UserResponseDTO);

		const result = await useCase.execute(userId);

		expect(mockLogger.debug).toHaveBeenCalledWith('Fetching user information', { userId });
		expect(mockRepository.findById).toHaveBeenCalledWith(userId);
		expect(mockLogger.debug).toHaveBeenCalledWith('User information retrieved successfully', {
			userId: mockUser.id,
			email: mockUser.email,
		});
		expect(result).toEqual(mockDto);
	});

	it('should throw NotFoundRecordError when user is not found', async () => {
		const userId = 'user-123';

		vi.spyOn(mockRepository, 'findById').mockResolvedValue(null as never);

		await expect(useCase.execute(userId)).rejects.toThrow(NotFoundRecordError);
		expect(mockLogger.warn).toHaveBeenCalledWith('User not found for /user/me request', {
			userId,
			action: 'should_logout',
		});
	});

	it('should log debug message with correct userId on execution', async () => {
		const userId = 'user-456';

		vi.spyOn(mockRepository, 'findById').mockResolvedValue(null as never);

		await expect(useCase.execute(userId)).rejects.toThrow();
		expect(mockLogger.debug).toHaveBeenCalledWith('Fetching user information', { userId });
	});
});
