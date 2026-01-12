import { UpdatePasswordRequestDTO, UpdatePasswordResponseDTO, UpdatePasswordUseCase } from '@application';
import { UserEntity } from '@domain';
import { NotFoundRecordError, InvalidCredentialsError } from '@shared';
import type { IHashService, ILogger, ISessionRepository, IUserRepository } from '@interfaces';

describe('UpdatePasswordUseCase', () => {
	let useCase: UpdatePasswordUseCase;
	let userRepository: IUserRepository;
	let sessionRepository: ISessionRepository;
	let hashService: IHashService;
	let logger: ILogger;

	beforeEach(() => {
		userRepository = {
			findById: vi.fn(),
			update: vi.fn(),
		} as any;

		sessionRepository = {
			deleteByUserId: vi.fn(),
		} as any;

		hashService = {
			verifyPassword: vi.fn(),
			hashPassword: vi.fn(),
		} as any;

		logger = {
			debug: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
		} as any;

		useCase = new UpdatePasswordUseCase(userRepository, sessionRepository, hashService, logger);
	});

	it('should update password successfully', async () => {
		const userId = 'user-123';
		const currentPassword = 'oldPassword123';
		const newPassword = 'newPassword456';
		const mockUser = { id: userId, email: 'test@example.com', passwordHash: 'hashedOld' } as UserEntity;
		const newPasswordHash = 'hashedNew';

		vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
		vi.mocked(hashService.verifyPassword).mockResolvedValue(true);
		vi.mocked(hashService.hashPassword).mockResolvedValue(newPasswordHash);
		vi.mocked(userRepository.update).mockResolvedValue(undefined);

		const request: UpdatePasswordRequestDTO = { currentPassword, newPassword, revokeAllSessions: false };
		const result = await useCase.execute(userId, request);

		expect(userRepository.findById).toHaveBeenCalledWith(userId);
		expect(hashService.verifyPassword).toHaveBeenCalledWith(currentPassword, mockUser.passwordHash);
		expect(hashService.hashPassword).toHaveBeenCalledWith(newPassword);
		expect(userRepository.update).toHaveBeenCalled();
		expect(result).toEqual(UpdatePasswordResponseDTO.success(false));
	});

	it('should throw NotFoundRecordError when user does not exist', async () => {
		const userId = 'non-existent';
		vi.mocked(userRepository.findById).mockResolvedValue(null);

		const request: UpdatePasswordRequestDTO = { currentPassword: 'old', newPassword: 'new', revokeAllSessions: false };

		await expect(useCase.execute(userId, request)).rejects.toThrow(NotFoundRecordError);
		expect(logger.warn).toHaveBeenCalledWith('[UpdatePasswordUseCase.execute] User not found for password update', { userId });
	});

	it('should throw InvalidCredentialsError when current password is incorrect', async () => {
		const userId = 'user-123';
		const mockUser = { id: userId, email: 'test@example.com', passwordHash: 'hashedOld' } as UserEntity;

		vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
		vi.mocked(hashService.verifyPassword).mockResolvedValue(false);

		const request: UpdatePasswordRequestDTO = { currentPassword: 'wrongPassword', newPassword: 'new', revokeAllSessions: false };

		await expect(useCase.execute(userId, request)).rejects.toThrow(InvalidCredentialsError);
		expect(logger.warn).toHaveBeenCalledWith('[UpdatePasswordUseCase.execute] Invalid current password for password update', {
			userId: mockUser.id,
			email: mockUser.email,
		});
	});

	it('should revoke all sessions when revokeAllSessions is true', async () => {
		const userId = 'user-123';
		const mockUser = { id: userId, email: 'test@example.com', passwordHash: 'hashedOld' } as UserEntity;
		const newPasswordHash = 'hashedNew';

		vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
		vi.mocked(hashService.verifyPassword).mockResolvedValue(true);
		vi.mocked(hashService.hashPassword).mockResolvedValue(newPasswordHash);
		vi.mocked(userRepository.update).mockResolvedValue(undefined);
		vi.mocked(sessionRepository.deleteByUserId).mockResolvedValue(undefined);

		const request: UpdatePasswordRequestDTO = { currentPassword: 'old', newPassword: 'new', revokeAllSessions: true };
		const result = await useCase.execute(userId, request);

		expect(sessionRepository.deleteByUserId).toHaveBeenCalledWith(userId);
		expect(result).toEqual(UpdatePasswordResponseDTO.success(true));
	});

	it('should not revoke sessions when revokeAllSessions is false', async () => {
		const userId = 'user-123';
		const mockUser = { id: userId, email: 'test@example.com', passwordHash: 'hashedOld' } as UserEntity;
		const newPasswordHash = 'hashedNew';

		vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
		vi.mocked(hashService.verifyPassword).mockResolvedValue(true);
		vi.mocked(hashService.hashPassword).mockResolvedValue(newPasswordHash);
		vi.mocked(userRepository.update).mockResolvedValue(undefined);

		const request: UpdatePasswordRequestDTO = { currentPassword: 'old', newPassword: 'new', revokeAllSessions: false };
		await useCase.execute(userId, request);

		expect(sessionRepository.deleteByUserId).not.toHaveBeenCalled();
	});
});
