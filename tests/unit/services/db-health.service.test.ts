import type { ILogger } from '@interfaces';
import type { DBConfig } from '@config';
import type { PrismaClient } from '@prisma/client';
import { DatabaseHealthService } from '@infrastructure';

describe('DatabaseHealthService', () => {
	let service: DatabaseHealthService;
	let mockLogger: ILogger;
	let mockPrismaClient: PrismaClient;
	let mockDBConfig: DBConfig;

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
		} as unknown as ILogger;

		mockPrismaClient = {
			$queryRawUnsafe: vi.fn(),
			$queryRaw: vi.fn(),
			user: { count: vi.fn() },
			oAuthClient: { count: vi.fn() },
			authorizationCode: { count: vi.fn() },
			session: { count: vi.fn() },
			userConsent: { count: vi.fn() },
			scopeDefinition: { count: vi.fn() },
		} as unknown as PrismaClient;

		mockDBConfig = {
			getClient: vi.fn().mockReturnValue(mockPrismaClient),
		} as unknown as DBConfig;

		service = new DatabaseHealthService(mockLogger, mockDBConfig);
	});

	describe('checkConnection', () => {
		it('should return true when connection is successful', async () => {
			vi.mocked(mockPrismaClient.$queryRawUnsafe).mockResolvedValueOnce(null);

			const result = await service.checkConnection();

			expect(result).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith('[DatabaseHealthService.checkConnection] Database connection check successful');
		});

		it('should return false when connection fails', async () => {
			const error = new Error('Connection failed');
			vi.mocked(mockPrismaClient.$queryRawUnsafe).mockRejectedValueOnce(error);

			const result = await service.checkConnection();

			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith('[DatabaseHealthService.checkConnection] Database connection check failed', { error });
		});
	});

	describe('checkTables', () => {
		it('should return all tables as true when all exist', async () => {
			const tables = [
				{ tablename: 'users' },
				{ tablename: 'oauth_clients' },
				{ tablename: 'authorization_codes' },
				{ tablename: 'sessions' },
				{ tablename: 'user_consents' },
				{ tablename: 'scope_definitions' },
			];
			vi.mocked(mockPrismaClient.$queryRaw).mockResolvedValueOnce(tables);

			const result = await service.checkTables();

			expect(result).toEqual({
				users: true,
				oAuthClients: true,
				authCodes: true,
				sessions: true,
				userConsents: true,
				scopeDefinitions: true,
			});
			expect(mockLogger.debug).toHaveBeenCalledWith('[DatabaseHealthService.checkTables] Database tables check completed', { tables: result });
		});

		it('should return partial tables when some are missing', async () => {
			const tables = [{ tablename: 'users' }, { tablename: 'oauth_clients' }];
			vi.mocked(mockPrismaClient.$queryRaw).mockResolvedValueOnce(tables);

			const result = await service.checkTables();

			expect(result.users).toBe(true);
			expect(result.oAuthClients).toBe(true);
			expect(result.authCodes).toBe(false);
			expect(result.sessions).toBe(false);
		});

		it('should return all false when query fails', async () => {
			const error = new Error('Query failed');
			vi.mocked(mockPrismaClient.$queryRaw).mockRejectedValueOnce(error);

			const result = await service.checkTables();

			expect(result).toEqual({
				users: false,
				oAuthClients: false,
				authCodes: false,
				sessions: false,
				userConsents: false,
				scopeDefinitions: false,
			});
			expect(mockLogger.error).toHaveBeenCalledWith('[DatabaseHealthService.checkTables] Database tables check failed', { error });
		});
	});

	describe('getHealthStatus', () => {
		it('should return health status with connection and tables', async () => {
			vi.mocked(mockPrismaClient.$queryRawUnsafe).mockResolvedValueOnce(null);
			vi.mocked(mockPrismaClient.$queryRaw).mockResolvedValueOnce([
				{ tablename: 'users' },
				{ tablename: 'oauth_clients' },
			]);

			const result = await service.getHealthStatus();

			expect(result.connected).toBe(true);
			expect(result.latency).toBeGreaterThanOrEqual(0);
			expect(result.tables).toBeDefined();
			expect(mockLogger.info).toHaveBeenCalled();
		});

		it('should include recordCounts when connected', async () => {
			vi.mocked(mockPrismaClient.$queryRawUnsafe).mockResolvedValueOnce(null);
			vi.mocked(mockPrismaClient.$queryRaw).mockResolvedValueOnce([]);
			vi.mocked(mockPrismaClient.user.count).mockResolvedValueOnce(5);
			vi.mocked(mockPrismaClient.oAuthClient.count).mockResolvedValueOnce(3);
			vi.mocked(mockPrismaClient.authorizationCode.count).mockResolvedValueOnce(10);
			vi.mocked(mockPrismaClient.session.count).mockResolvedValueOnce(2);
			vi.mocked(mockPrismaClient.userConsent.count).mockResolvedValueOnce(8);
			vi.mocked(mockPrismaClient.scopeDefinition.count).mockResolvedValueOnce(4);

			const result = await service.getHealthStatus();

			expect(result.recordCounts).toEqual({
				users: 5,
				oAuthClients: 3,
				authCodes: 10,
				sessions: 2,
				userConsents: 8,
				scopeDefinitions: 4,
			});
		});

		it('should not include recordCounts when not connected', async () => {
			vi.mocked(mockPrismaClient.$queryRawUnsafe).mockRejectedValueOnce(new Error('Connection failed'));
			vi.mocked(mockPrismaClient.$queryRaw).mockResolvedValueOnce([]);

			const result = await service.getHealthStatus();

			expect(result.connected).toBe(false);
			expect(result.recordCounts).toBeUndefined();
		});

		it('should return status even if record count retrieval fails', async () => {
			vi.mocked(mockPrismaClient.$queryRawUnsafe).mockResolvedValueOnce(null);
			vi.mocked(mockPrismaClient.$queryRaw).mockResolvedValueOnce([]);
			vi.mocked(mockPrismaClient.user.count).mockRejectedValueOnce(new Error('Count failed'));

			const result = await service.getHealthStatus();

			expect(result.connected).toBe(true);
			expect(result.recordCounts).toBeUndefined();
			expect(mockLogger.warn).toHaveBeenCalledWith('[DatabaseHealthService.getHealthStatus] Failed to retrieved record counts', expect.any(Object));
		});
	});
});
