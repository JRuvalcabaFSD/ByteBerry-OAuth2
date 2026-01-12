import { SessionMapper, SessionRepository } from '@infrastructure';
import type { ILogger } from '@interfaces';

describe('SessionRepository', () => {
	let repository: SessionRepository;
	let mockLogger: ILogger;
	let mockPrismaClient: any;
	let mockDBConfig: any;

	const mockSessionData = {
		id: 'session-123',
		userId: 'user-123',
		metadata: { ip: '127.0.0.1' },
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 3600000),
	};

	const mockSessionEntity = {
		id: 'session-123',
		userId: 'user-123',
		metadata: { ip: '127.0.0.1' },
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 3600000),
		isExpired: vi.fn().mockReturnValue(false),
		getRemainingSeconds: vi.fn().mockReturnValue(3600),
	} as any;

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		} as any;

		mockPrismaClient = {
			session: {
				create: vi.fn(),
				findUnique: vi.fn(),
				delete: vi.fn(),
				deleteMany: vi.fn(),
				findMany: vi.fn(),
				count: vi.fn(),
			},
		};

		mockDBConfig = {
			getClient: vi.fn().mockReturnValue(mockPrismaClient),
		};

		repository = new SessionRepository(mockDBConfig, mockLogger);
		vi.spyOn(SessionMapper, 'toDomain').mockReturnValue(mockSessionEntity);
	});

	describe('save', () => {
		it('should save a session successfully', async () => {
			mockPrismaClient.session.create.mockResolvedValue(mockSessionData);

			await repository.save(mockSessionEntity);

			expect(mockPrismaClient.session.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					id: 'session-123',
					userId: 'user-123',
				}),
			});
			expect(mockLogger.debug).toHaveBeenCalledWith('[SessionRepository.save] Session saved to database', expect.any(Object));
		});

		it('should handle save errors', async () => {
			const error = new Error('Database error');
			mockPrismaClient.session.create.mockRejectedValue(error);

			await expect(repository.save(mockSessionEntity)).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[SessionRepository.save] Failed to save session', expect.any(Object));
		});
	});

	describe('findById', () => {
		it('should find and return a session', async () => {
			mockPrismaClient.session.findUnique.mockResolvedValue(mockSessionData);

			const result = await repository.findById('session-123');

			expect(result).toEqual(mockSessionEntity);
			expect(mockPrismaClient.session.findUnique).toHaveBeenCalledWith({ where: { id: 'session-123' } });
		});

		it('should return null if session not found', async () => {
			mockPrismaClient.session.findUnique.mockResolvedValue(null);

			const result = await repository.findById('session-123');

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('[SessionRepository.findById] Session not found', { sessionId: 'session-123' });
		});

		it('should delete and return null if session is expired', async () => {
			const expiredEntity = { ...mockSessionEntity, isExpired: vi.fn().mockReturnValue(true) };
			(SessionMapper.toDomain as any).mockReturnValue(expiredEntity);
			mockPrismaClient.session.findUnique.mockResolvedValue(mockSessionData);
			mockPrismaClient.session.delete.mockResolvedValue({});

			const result = await repository.findById('session-123');

			expect(result).toBeNull();
			expect(mockPrismaClient.session.delete).toHaveBeenCalledWith({ where: { id: 'session-123' } });
		});

		it('should handle find errors', async () => {
			const error = new Error('Database error');
			mockPrismaClient.session.findUnique.mockRejectedValue(error);

			await expect(repository.findById('session-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[SessionRepository.findById] Failed to find session', { sessionId: 'session-123' });
		});
	});

	describe('deleteById', () => {
		it('should delete a session successfully', async () => {
			mockPrismaClient.session.delete.mockResolvedValue(mockSessionData);

			await repository.deleteById('session-123');

			expect(mockPrismaClient.session.delete).toHaveBeenCalledWith({ where: { id: 'session-123' } });
			expect(mockLogger.info).toHaveBeenCalledWith('[SessionRepository.deleteById] Session deleted from database', { sessionId: 'session-123' });
		});

		it('should handle P2025 error gracefully', async () => {
			const error = { code: 'P2025', message: 'Record not found' };
			mockPrismaClient.session.delete.mockRejectedValue(error);

			await repository.deleteById('session-123');

			expect(mockLogger.warn).toHaveBeenCalledWith('[SessionRepository.deleteById] Session not found for deletion', { sessionId: 'session-123' });
		});

		it('should throw on other delete errors', async () => {
			const error = new Error('Database error');
			mockPrismaClient.session.delete.mockRejectedValue(error);

			await expect(repository.deleteById('session-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[SessionRepository.deleteById] Failed to delete session', { sessionId: 'session-123' });
		});
	});

	describe('deleteByUserId', () => {
		it('should delete all sessions for a user', async () => {
			mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 3 });

			await repository.deleteByUserId('user-123');

			expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
			expect(mockLogger.info).toHaveBeenCalledWith('[SessionRepository.deleteByUserId] All user sessions deleted', {
				userId: 'user-123',
				sessionsDeleted: 3,
			});
		});

		it('should handle delete errors', async () => {
			const error = new Error('Database error');
			mockPrismaClient.session.deleteMany.mockRejectedValue(error);

			await expect(repository.deleteByUserId('user-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[SessionRepository.deleteByUserId] Failed to delete user sessions', { userId: 'user-123' });
		});
	});

	describe('cleanup', () => {
		it('should clean up expired sessions and log at info level', async () => {
			mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 5 });

			const result = await repository.cleanup();

			expect(result).toBe(5);
			expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({
				where: { expiresAt: { lt: expect.any(Date) } },
			});
			expect(mockLogger.info).toHaveBeenCalledWith('[SessionRepository.cleanup] Expired sessions cleaned up', { deletedCount: 5 });
		});

		it('should log at debug level when no sessions are expired', async () => {
			mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 0 });

			const result = await repository.cleanup();

			expect(result).toBe(0);
			expect(mockLogger.debug).toHaveBeenCalledWith('[SessionRepository.cleanup] No expired sessions to clean up');
		});

		it('should handle cleanup errors', async () => {
			const error = new Error('Database error');
			mockPrismaClient.session.deleteMany.mockRejectedValue(error);

			await expect(repository.cleanup()).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[SessionRepository.cleanup] Failed to cleanup expired sessions');
		});
	});

	describe('findByUserId', () => {
		it('should find all active sessions for a user', async () => {
			mockPrismaClient.session.findMany.mockResolvedValue([mockSessionData]);

			const result = await repository.findByUserId('user-123');

			expect(result).toEqual([mockSessionEntity]);
			expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
				where: { userId: 'user-123', expiresAt: { gt: expect.any(Date) } },
				orderBy: { createdAt: 'desc' },
			});
		});

		it('should return empty array when no sessions found', async () => {
			mockPrismaClient.session.findMany.mockResolvedValue([]);

			const result = await repository.findByUserId('user-123');

			expect(result).toEqual([]);
		});

		it('should handle find errors', async () => {
			const error = new Error('Database error');
			mockPrismaClient.session.findMany.mockRejectedValue(error);

			await expect(repository.findByUserId('user-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[SessionRepository.findByUserId] Failed to find user sessions', { userId: 'user-123' });
		});
	});

	describe('countByUserId', () => {
		it('should count active sessions for a user', async () => {
			mockPrismaClient.session.count.mockResolvedValue(2);

			const result = await repository.countByUserId('user-123');

			expect(result).toBe(2);
			expect(mockPrismaClient.session.count).toHaveBeenCalledWith({
				where: { userId: 'user-123', expiresAt: { gt: expect.any(Date) } },
			});
		});

		it('should handle count errors', async () => {
			const error = new Error('Database error');
			mockPrismaClient.session.count.mockRejectedValue(error);

			await expect(repository.countByUserId('user-123')).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith('[SessionRepository.countByUserId] Failed to count user sessions', { userId: 'user-123' });
		});
	});

	describe('getAuditTrail', () => {
		it('should throw not implemented error', async () => {
			await expect(repository.getAuditTrail('session-123')).rejects.toThrow('Method not implemented.');
		});
	});
});
