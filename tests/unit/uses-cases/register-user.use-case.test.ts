import { ConflictError } from '@shared';
import type { IHashService, ILogger, IUserRepository, IUuid } from '@interfaces';
import { RegisterUserRequestDTO, RegisterUserResponseDTO, RegisterUserUseCase } from '@application';
import { UserEntity } from '@domain';

describe('RegisterUserUseCase', () => {
	let useCase: RegisterUserUseCase;
	let mockRepository: IUserRepository;
	let mockHashService: IHashService;
	let mockUuid: IUuid;
	let mockLogger: ILogger;

	const validRequestData = {
		email: 'user@example.com',
		username: 'johndoe',
		password: 'securePassword123',
		fullName: 'John Doe',
	};

	beforeEach(() => {
		mockRepository = {
			findByEmail: vi.fn().mockResolvedValue(null),
			findByUserName: vi.fn().mockResolvedValue(null),
			save: vi.fn().mockResolvedValue(undefined),
		} as any;

		mockHashService = {
			hashPassword: vi.fn().mockResolvedValue('hashedPassword123'),
		} as any;

		mockUuid = {
			generate: vi.fn().mockReturnValue('uuid-1234'),
		} as any;

		mockLogger = {
			debug: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		} as any;

		useCase = new RegisterUserUseCase(mockRepository, mockHashService, mockUuid, mockLogger);
	});

	it('should successfully register a new user', async () => {
		const validRequest = RegisterUserRequestDTO.fromBody(validRequestData, '192.168.1.1');
		const result = await useCase.execute(validRequest);

		expect(mockRepository.findByEmail).toHaveBeenCalledWith(validRequestData.email);
		expect(mockRepository.findByUserName).toHaveBeenCalledWith(validRequestData.username);
		expect(mockHashService.hashPassword).toHaveBeenCalledWith(validRequestData.password);
		expect(mockRepository.save).toHaveBeenCalled();
		expect(result).toBeInstanceOf(RegisterUserResponseDTO);
	});

	it('should throw ConflictError when email already exists', async () => {
		mockRepository.findByEmail = vi.fn().mockResolvedValue({ id: 'existing-user' });
		const validRequest = RegisterUserRequestDTO.fromBody(validRequestData, '192.168.1.1');

		await expect(useCase.execute(validRequest)).rejects.toThrow(ConflictError);
		expect(mockRepository.save).not.toHaveBeenCalled();
	});

	it('should throw ConflictError when username already exists', async () => {
		mockRepository.findByUserName = vi.fn().mockResolvedValue({ id: 'existing-user' });
		const validRequest = RegisterUserRequestDTO.fromBody(validRequestData, '192.168.1.1');

		await expect(useCase.execute(validRequest)).rejects.toThrow(ConflictError);
		expect(mockRepository.save).not.toHaveBeenCalled();
	});

	it('should hash the password before saving', async () => {
		const validRequest = RegisterUserRequestDTO.fromBody(validRequestData, '192.168.1.1');
		await useCase.execute(validRequest);

		expect(mockHashService.hashPassword).toHaveBeenCalledWith(validRequestData.password);
	});

	it('should generate a UUID for the new user', async () => {
		const validRequest = RegisterUserRequestDTO.fromBody(validRequestData, '192.168.1.1');
		await useCase.execute(validRequest);

		expect(mockUuid.generate).toHaveBeenCalled();
	});

	it('should log registration attempt', async () => {
		const validRequest = RegisterUserRequestDTO.fromBody(validRequestData, '192.168.1.1');
		await useCase.execute(validRequest);

		expect(mockLogger.debug).toHaveBeenNthCalledWith(
			1,
			'[RegisterUserUseCase] Registration attempt',
			expect.objectContaining({
				email: validRequestData.email,
				username: validRequestData.username,
				ipAddress: '192.168.1.1',
				hasFullName: true,
			})
		);
	});

	it('should log successful registration', async () => {
		const validRequest = RegisterUserRequestDTO.fromBody(validRequestData, '192.168.1.1');
		await useCase.execute(validRequest);

		expect(mockLogger.debug).toHaveBeenNthCalledWith(
			2,
			'[RegisterUserUseCase] User registered successfully',
			expect.objectContaining({
				userId: 'uuid-1234',
				email: validRequestData.email,
				username: validRequestData.username,
				roles: ['user'],
				ipAddress: '192.168.1.1',
			})
		);
	});

	it('should handle optional fullName field', async () => {
		const requestWithoutFullName = { ...validRequestData, fullName: undefined };
		const validRequest = RegisterUserRequestDTO.fromBody(requestWithoutFullName as any, '192.168.1.1');

		await useCase.execute(validRequest);

		expect(mockRepository.save).toHaveBeenCalled();
	});
});
