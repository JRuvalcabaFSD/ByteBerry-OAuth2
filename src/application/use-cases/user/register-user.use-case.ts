import { UserEntity } from '@domain';
import { ConflictError, Injectable, LogContextClass } from '@shared';
import { RegisterUserRequestDTO, RegisterUserResponseDTO } from '@application';
import type { IHashService, ILogger, IRegisterUserUseCase, IUserRepository, IUuid } from '@interfaces';

/**
 * Use case for registering a new user in the system.
 *
 * This class handles the complete user registration workflow including:
 * - Validation that email and username are not already registered
 * - Password hashing using the provided hash service
 * - User entity creation with default role and unverified email status
 * - Persistence of the user to the repository
 * - Comprehensive logging at each step
 *
 * @implements {IRegisterUserUseCase}
 *
 * @example
 * const useCase = new RegisterUserUseCase(userRepository, hashService, uuidService, logger);
 * const response = await useCase.execute({
 *   email: 'user@example.com',
 *   username: 'johndoe',
 *   password: 'securePassword123',
 *   fullName: 'John Doe',
 *   ipAddress: '192.168.1.1'
 * });
 *
 * @throws {ConflictError} When email or username is already registered
 */

@LogContextClass()
@Injectable({ name: 'RegisterUserUseCase', depends: ['UserRepository', 'HashService', 'Uuid', 'Logger'] })
export class RegisterUserUseCase implements IRegisterUserUseCase {
	private readonly DEFAULT_USER_ROLE = 'user';

	constructor(
		public readonly repository: IUserRepository,
		public readonly hashService: IHashService,
		public readonly uuid: IUuid,
		public readonly logger: ILogger
	) {}

	/**
	 * Executes the user registration process.
	 *
	 * Validates that the email and username are not already registered, hashes the password,
	 * creates a new user entity with default role and inactive email verification status,
	 * persists it to the repository, and returns the registered user data.
	 *
	 * @param request - The registration request containing email, username, password, and optional fullName
	 * @returns A promise that resolves to the registered user response DTO
	 * @throws {ConflictError} When the email is already registered
	 * @throws {ConflictError} When the username is already registered
	 *
	 * @example
	 * ```typescript
	 * const response = await registerUserUseCase.execute({
	 *   email: 'user@example.com',
	 *   username: 'johndoe',
	 *   password: 'securePassword123',
	 *   fullName: 'John Doe',
	 *   ipAddress: '192.168.1.1'
	 * });
	 * ```
	 */

	public async execute(request: RegisterUserRequestDTO): Promise<RegisterUserResponseDTO> {
		this.logger.debug('Registration attempt', {
			email: request.email,
			username: request.username,
			hasFullName: !!request.fullName,
			ipAddress: request.ipAddress,
		});

		// check if the email is registered
		const existUserByEmail = await this.repository.findByEmail(request.email);
		if (existUserByEmail) {
			this.logger.warn('Registration failed - email already exists', {
				email: request.email,
				ipAddress: request.ipAddress,
			});
			throw new ConflictError('Email already registered');
		}

		//Check if the username is registered
		const existUserByUserName = await this.repository.findByUserName(request.username);
		if (existUserByUserName) {
			this.logger.warn('Registration failed - username already exists', {
				username: request.username,
				ipAddress: request.ipAddress,
			});

			throw new ConflictError('Username already registered');
		}

		//encrypt password
		const passwordHash = await this.hashService.hashPassword(request.password);

		const user = UserEntity.create({
			id: this.uuid.generate(),
			email: request.email,
			username: request.username ?? null,
			passwordHash,
			fullName: request.fullName ?? null,
			roles: [this.DEFAULT_USER_ROLE],
			isActive: true,
			emailVerified: false,
		});

		//Save user in db
		await this.repository.save(user);

		this.logger.debug('User registered successfully', {
			userId: user.id,
			email: user.email,
			username: user.username,
			roles: user.roles,
			ipAddress: request.ipAddress,
		});

		return RegisterUserResponseDTO.fromEntity(user);
	}
}
