import { UpdateUserUseCase, UpdateUserRequestDTO, UpdateUserResponseDTO } from '@application';
import { UserEntity } from '@domain';
import { ILogger, IUserRepository } from '@interfaces';
import { ConflictError, NotFoundRecordError } from '@shared';

describe('UpdateUserUseCase', () => {
	let useCase: UpdateUserUseCase;
	let mockRepository: IUserRepository;
	let mockLogger: ILogger;

	beforeEach(() => {
		mockRepository = {
			findById: vi.fn(),
			findByUserName: vi.fn(),
			update: vi.fn(),
		} as unknown as IUserRepository;

		mockLogger = {
			debug: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
		} as unknown as ILogger;

		useCase = new UpdateUserUseCase(mockRepository, mockLogger);
	});

	describe('execute', () => {
		const userId = 'user-123';
		const mockUser = {
			id: userId,
			fullName: 'John Smith',
			username: 'johnsmith',
			email: 'john@example.com',
			updatedAt: new Date(),
		} as UserEntity;

		it('should update user successfully with fullName only', async () => {
			const request: UpdateUserRequestDTO = { fullName: 'John Doe' };
			const updatedUserEntity = { ...mockUser, fullName: 'John Doe', updatedAt: expect.any(Date) };

			vi.spyOn(mockRepository, 'findById').mockResolvedValue(mockUser);
			vi.spyOn(mockRepository, 'update').mockResolvedValue(undefined);
			vi.spyOn(UpdateUserResponseDTO, 'fromEntity').mockReturnValue({} as UpdateUserResponseDTO);

			await useCase.execute(userId, request);

			expect(mockRepository.findById).toHaveBeenCalledWith(userId);
			expect(mockRepository.update).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith(
				'[UpdateUserUseCase.execute] User profile updated successfully',
				expect.objectContaining({
					userId,
					email: 'john@example.com',
					changes: {
						fullName: true,
						username: false,
					},
				})
			);
		});

		it('should update user successfully with username only', async () => {
			const request: UpdateUserRequestDTO = { username: 'newusername' };

			vi.spyOn(mockRepository, 'findById').mockResolvedValue(mockUser);
			vi.spyOn(mockRepository, 'findByUserName').mockResolvedValue(null);
			vi.spyOn(mockRepository, 'update').mockResolvedValue(undefined);
			vi.spyOn(UpdateUserResponseDTO, 'fromEntity').mockReturnValue({} as UpdateUserResponseDTO);

			await useCase.execute(userId, request);

			expect(mockRepository.findByUserName).toHaveBeenCalledWith('newusername');
			expect(mockRepository.update).toHaveBeenCalled();
		});

		it('should throw NotFoundRecordError when user does not exist', async () => {
			const request: UpdateUserRequestDTO = { fullName: 'John Doe' };

			vi.spyOn(mockRepository, 'findById').mockResolvedValue(null);

			await expect(useCase.execute(userId, request)).rejects.toThrow(NotFoundRecordError);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'[UpdateUserUseCase.execute] User not found for profile update',
				{ userId }
			);
		});

		it('should throw ConflictError when username is already taken', async () => {
			const request: UpdateUserRequestDTO = { username: 'takenusername' };
			const existingUser = { id: 'user-456', username: 'takenusername' } as UserEntity;

			vi.spyOn(mockRepository, 'findById').mockResolvedValue(mockUser);
			vi.spyOn(mockRepository, 'findByUserName').mockResolvedValue(existingUser);

			await expect(useCase.execute(userId, request)).rejects.toThrow(ConflictError);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'[UpdateUserUseCase.execute] Username already taken',
				expect.objectContaining({
					username: 'takenusername',
					existingUserId: 'user-456',
				})
			);
		});

		it('should not check username uniqueness when username is not changed', async () => {
			const request: UpdateUserRequestDTO = { fullName: 'John Doe' };

			vi.spyOn(mockRepository, 'findById').mockResolvedValue(mockUser);
			vi.spyOn(mockRepository, 'update').mockResolvedValue(undefined);
			vi.spyOn(UpdateUserResponseDTO, 'fromEntity').mockReturnValue({} as UpdateUserResponseDTO);

			await useCase.execute(userId, request);

			expect(mockRepository.findByUserName).not.toHaveBeenCalled();
		});

		it('should update both fullName and username successfully', async () => {
			const request: UpdateUserRequestDTO = { fullName: 'Jane Doe', username: 'janedoe' };

			vi.spyOn(mockRepository, 'findById').mockResolvedValue(mockUser);
			vi.spyOn(mockRepository, 'findByUserName').mockResolvedValue(null);
			vi.spyOn(mockRepository, 'update').mockResolvedValue(undefined);
			vi.spyOn(UpdateUserResponseDTO, 'fromEntity').mockReturnValue({} as UpdateUserResponseDTO);

			await useCase.execute(userId, request);

			expect(mockRepository.findByUserName).toHaveBeenCalledWith('janedoe');
			expect(mockRepository.update).toHaveBeenCalled();
		});
	});
});
