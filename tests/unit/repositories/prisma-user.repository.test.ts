import type { IHashService, ILogger } from '@interfaces';
import type { DBConfig } from '@config';
import { UserRepository } from '@infrastructure';

describe('UserRepository', () => {
	let userRepository: UserRepository;
	let mockPrismaClient: any;
	let mockDBConfig: any;
	let mockHashService: any;
	let mockLogger: any;

	beforeEach(() => {
		mockPrismaClient = {
			user: {
				findUnique: vi.fn(),
				findFirst: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
			},
		};

		mockDBConfig = {
			getClient: vi.fn(() => mockPrismaClient),
			client: mockPrismaClient,
			pool: null,
			logger: mockLogger,
			testConnection: vi.fn(),
			disconnect: vi.fn(),
		} as any;

		mockHashService = {
			verifyPassword: vi.fn() as any,
			hashPassword: vi.fn() as any,
			verifySha256: vi.fn() as any,
		} as any;

		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			child: vi.fn(),
			log: vi.fn(),
			checkHealth: vi.fn(),
		} as any;

		userRepository = new UserRepository(mockDBConfig, mockHashService, mockLogger);
	});

	describe('findByEmail', () => {
		it('should return a UserEntity when user exists', async () => {
			const userData = { id: '1', email: 'test@example.com', username: 'testuser', passwordHash: 'hash' };
			mockPrismaClient.user.findUnique.mockResolvedValue(userData);

			const result = await userRepository.findByEmail('test@example.com');

			expect(result).toBeDefined();
			expect(mockLogger.debug).toHaveBeenCalledWith('[UserRepository.findByEmail] Find user in database', { email: 'test@example.com' });
		});

		it('should return null when user does not exist', async () => {
			mockPrismaClient.user.findUnique.mockResolvedValue(null);

			const result = await userRepository.findByEmail('notfound@example.com');

			expect(result).toBeNull();
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

			await expect(userRepository.findByEmail('test@example.com')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[UserRepository.findByEmail] search failed', { email: 'test@example.com' });
		});
	});

	describe('findByUserName', () => {
		it('should return a UserEntity when user exists', async () => {
			const userData = { id: '1', email: 'test@example.com', username: 'testuser', passwordHash: 'hash' };
			mockPrismaClient.user.findUnique.mockResolvedValue(userData);

			const result = await userRepository.findByUserName('testuser');

			expect(result).toBeDefined();
			expect(mockLogger.debug).toHaveBeenCalledWith('[UserRepository.findByUserName] Find user in database', { username: 'testuser' });
		});

		it('should return null when user does not exist', async () => {
			mockPrismaClient.user.findUnique.mockResolvedValue(null);

			const result = await userRepository.findByUserName('notfound');

			expect(result).toBeNull();
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

			await expect(userRepository.findByUserName('testuser')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[UserRepository.findByUserName] search failed', { username: 'testuser' });
		});
	});

	describe('findById', () => {
		it('should return a UserEntity when user exists', async () => {
			const userData = { id: '1', email: 'test@example.com', username: 'testuser', passwordHash: 'hash' };
			mockPrismaClient.user.findUnique.mockResolvedValue(userData);

			const result = await userRepository.findById('1');

			expect(result).toBeDefined();
			expect(mockLogger.debug).toHaveBeenCalledWith('[UserRepository.findById] Find user in database', { id: '1' });
		});

		it('should return null when user does not exist', async () => {
			mockPrismaClient.user.findUnique.mockResolvedValue(null);

			const result = await userRepository.findById('nonexistent');

			expect(result).toBeNull();
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

			await expect(userRepository.findById('1')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[UserRepository.findById] search failed', { id: '1' });
		});
	});

	describe('validateCredentials', () => {
		it('should return UserEntity when credentials are valid', async () => {
			const userData = { id: '1', email: 'test@example.com', username: 'testuser', passwordHash: 'hash' };
			mockPrismaClient.user.findFirst.mockResolvedValue(userData);
			mockHashService.verifyPassword.mockResolvedValue(true);

			const result = await userRepository.validateCredentials('test@example.com', 'password');

			expect(result).toBeDefined();
			expect(mockHashService.verifyPassword).toHaveBeenCalledWith('password', 'hash');
		});

		it('should return null when user not found', async () => {
			mockPrismaClient.user.findFirst.mockResolvedValue(null);

			const result = await userRepository.validateCredentials('notfound@example.com', 'password');

			expect(result).toBeNull();
		});

		it('should return null when password is invalid', async () => {
			const userData = { id: '1', email: 'test@example.com', username: 'testuser', passwordHash: 'hash' };
			mockPrismaClient.user.findFirst.mockResolvedValue(userData);
			mockHashService.verifyPassword.mockResolvedValue(false);

			const result = await userRepository.validateCredentials('test@example.com', 'wrongpassword');

			expect(result).toBeNull();
		});

		it('should throw error on database failure', async () => {
			mockPrismaClient.user.findFirst.mockRejectedValue(new Error('Database error'));

			await expect(userRepository.validateCredentials('test@example.com', 'password')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[UserRepository.validateCredentials] user validation failure', { emailOrUsername: 'test@example.com' });
		});
	});

	describe('save', () => {
		it('should save a user successfully', async () => {
			const user = { id: '1', email: 'test@example.com', username: 'testuser' } as any;
			mockPrismaClient.user.create.mockResolvedValue(user);

			await userRepository.save(user);

			expect(mockPrismaClient.user.create).toHaveBeenCalledWith({ data: user });
			expect(mockLogger.debug).toHaveBeenCalledWith('[UserRepository.save] user creation successfully', { username: 'testuser' });
		});

		it('should throw error on database failure', async () => {
			const user = { id: '1', email: 'test@example.com', username: 'testuser' } as any;
			mockPrismaClient.user.create.mockRejectedValue(new Error('Unique constraint failed'));

			await expect(userRepository.save(user)).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[UserRepository.save] user creation failure', { username: 'testuser' });
		});
	});

	describe('update', () => {
		it('should update a user successfully', async () => {
			const user = { id: '1', email: 'test@example.com', username: 'testuser' } as any;
			mockPrismaClient.user.update.mockResolvedValue(user);

			await userRepository.update(user);

			expect(mockPrismaClient.user.update).toHaveBeenCalledWith({ where: { id: '1' }, data: user });
			expect(mockLogger.debug).toHaveBeenCalledWith('[UserRepository.update] User updated successfully', {
				userId: '1',
				email: 'test@example.com',
				username: 'testuser',
			});
		});

		it('should throw error on database failure', async () => {
			const user = { id: '1', email: 'test@example.com', username: 'testuser' } as any;
			mockPrismaClient.user.update.mockRejectedValue(new Error('User not found'));

			await expect(userRepository.update(user)).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[UserRepository.update] User update failed', {
				userId: '1',
				email: 'test@example.com',
			});
		});
	});
});
