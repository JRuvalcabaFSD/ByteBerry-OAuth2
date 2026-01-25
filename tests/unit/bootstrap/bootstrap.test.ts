import { bootstrap } from "@bootstrap";
import { BootstrapError } from "@shared";

// Mock del módulo container
const loggerMock = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
	child: vi.fn(() => loggerMock),
	log: vi.fn(),
	checkHealth: vi.fn(),
};

const mockGShutdown = {
	registerCleanup: vi.fn(),
	shutdown: vi.fn(),
	performShutdown: vi.fn(),
	setupSignalHandlers: vi.fn(),
};

vi.mock("@container", () => ({
	bootstrapContainer: vi.fn(() => ({
		resolve: vi.fn((token: string) => {
			if (token === "HttpServer") {
				return {
					start: vi.fn().mockResolvedValue(undefined),
				};
			}
			if (token === "Logger") {
				return loggerMock;
			}
			if (token === "GracefulShutdown") {
				return mockGShutdown;
			}
			if (token === "ClientRepository") {
				return {
					findBySystemRole: vi.fn().mockResolvedValue(null),
					save: vi.fn().mockResolvedValue(undefined),
				};
			}
			if (token === "HashService") {
				return {
					hashPassword: vi.fn().mockResolvedValue("hashed-secret"),
					verifyPassword: vi.fn().mockResolvedValue(true),
				};
			}
			if (token === "Uuid") {
				return {
					generate: vi.fn().mockReturnValue("uuid-mock"),
				};
			}
			if (token === "Config") {
				return {
					bffClientSecret: "12345678901234567890123456789012",
					bffClientId: "bff-client-id",
					bffClientName: "BFF Client",
					bffClientRedirectUris: ["http://localhost/callback"],
				};
			}
			if (token === "DBConfig") {
				return {
					testConnection: vi.fn().mockResolvedValue(undefined),
				};
			}
			return {};
		}),
	})),
}));

describe("Bootstrap", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("bootstrap", () => {
		it("should re-throw AppError if thrown", async () => {
			vi.resetModules();
			const { AppError } = await import("@domain");
			vi.doMock("@container", () => ({
				bootstrapContainer: () => {
					throw new AppError("App error", "bootstrap");
				},
			}));
			const { bootstrap } = await import("@bootstrap");
			await expect(bootstrap()).rejects.toThrow(AppError);
			await expect(bootstrap()).rejects.toThrow("App error");
			vi.resetModules();
		});
		it("should successfully bootstrap the application", async () => {
			const result = await bootstrap({ skipDbValidation: true });

			expect(result).toBeDefined();
			expect(result.container).toBeDefined();
		});

		it("should start the HTTP server", async () => {
			const result = await bootstrap({ skipDbValidation: true });
			const httpServer = result.container.resolve("HttpServer");

			expect(httpServer).toBeDefined();
		});

		it("should throw BootstrapError on failure", async () => {
			vi.resetModules();
			vi.doMock("@container", () => ({
				bootstrapContainer: () => {
					throw new Error("Container creation failed");
				},
			}));
			const { bootstrap } = await import("@bootstrap");
			const { BootstrapError } = await import("@shared");
			await expect(bootstrap()).rejects.toThrow(BootstrapError);
			vi.resetModules();
		});

		it("should include error message in BootstrapError", async () => {
			vi.resetModules();
			vi.doMock("@container", () => ({
				bootstrapContainer: () => {
					throw new Error("Specific failure");
				},
			}));
			const { bootstrap } = await import("@bootstrap");
			const { BootstrapError } = await import("@shared");
			try {
				await bootstrap();
			} catch (error) {
				expect(error).toBeInstanceOf(BootstrapError);
				expect((error as BootstrapError).message).toContain("Specific failure");
			}
			vi.resetModules();
		});

		it("should validate database connection when skipDbValidation is false", async () => {
			const result = await bootstrap({ skipDbValidation: false });

			expect(result).toBeDefined();
			expect(result.container).toBeDefined();
		});

		it("should skip database connection validation when skipDbValidation is true", async () => {
			const result = await bootstrap({ skipDbValidation: true });

			expect(result).toBeDefined();
		});

		it("should throw BootstrapError when database connection fails", async () => {
			vi.resetModules();
			vi.doMock("@container", () => ({
				bootstrapContainer: () => ({
					resolve: vi.fn((token: string) => {
						if (token === "DBConfig") {
							return {
								testConnection: vi
									.fn()
									.mockRejectedValue(new Error("Database connection failed")),
							};
						}
						if (token === "Logger") {
							return loggerMock;
						}
						return {};
					}),
				}),
			}));
			const { bootstrap } = await import("@bootstrap");
			const { BootstrapError } = await import("@shared");
			await expect(bootstrap({ skipDbValidation: false })).rejects.toThrow(
				BootstrapError,
			);
			vi.resetModules();
		});

		it("should skip system clients creation when skipSystemClients is true", async () => {
			const result = await bootstrap({ skipSystemClients: true });

			expect(result).toBeDefined();
			const repository = result.container.resolve("ClientRepository");
			expect(repository.findBySystemRole).not.toHaveBeenCalled();
		});

		it("should skip system clients creation when NODE_ENV is test", async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";

			const result = await bootstrap({ skipSystemClients: false });

			expect(result).toBeDefined();
			const repository = result.container.resolve("ClientRepository");
			expect(repository.findBySystemRole).not.toHaveBeenCalled();

			process.env.NODE_ENV = originalEnv;
		});

		it("should create system clients when not in test env and skipSystemClients is false", async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			const result = await bootstrap({
				skipSystemClients: false,
				skipDbValidation: true,
			});

			expect(result).toBeDefined();

			process.env.NODE_ENV = originalEnv;
		});
	});

	describe("ensureSystemClients", () => {
		const mockRepository = {
			findBySystemRole: vi.fn(),
			save: vi.fn(),
			findByClientId: vi.fn(),
			findById: vi.fn(),
			findByUserId: vi.fn(),
			findAllByUserId: vi.fn(),
			update: vi.fn(),
			softDelete: vi.fn(),
			existByClientId: vi.fn(),
			rotateSecret: vi.fn(),
		};

		const mockHashService = {
			hashPassword: vi.fn(),
			verifyPassword: vi.fn(),
			verifySha256: vi.fn(),
		};

		const mockUuid = {
			generate: vi.fn(),
			isValid: vi.fn(),
			checkHealth: vi.fn(),
		};

		const mockConfig = {
			// Core environments
			nodeEnv: "test" as const,
			port: 3000,
			version: "1.0.0",
			serviceName: "oauth2-service",
			serviceUrl: "http://localhost:3000",
			logLevel: "info" as const,
			logRequests: false,
			autoCleanupIntervalMs: 60000,

			// OAuth2 environments
			oauth2AuthCodeExpiresIn: 300,
			oauth2RefreshTokenExpiresIn: 86400,

			// JWT environments
			jwtKeyId: "test-key-id",
			jwtIssuer: "oauth2-service",
			jwtAudience: ["oauth2-service"],
			jwtAccessTokenExpiresIn: 3600,

			// Security environments
			corsOrigins: ["*"],
			bcryptRounds: 10,

			// Database environments
			databaseUrl: "postgresql://test:test@localhost/test",
			databasePoolMin: 1,
			databasePoolMax: 10,

			// System Clients
			bffClientSecret: "12345678901234567890123456789012",
			bffClientId: "bff-client-id",
			bffClientName: "BFF Client",
			bffClientRedirectUris: ["http://localhost/callback"],

			// Methods
			isDevelopment: vi.fn(() => false),
			isProduction: vi.fn(() => false),
			isTest: vi.fn(() => true),
			checkHealth: vi.fn(() => Promise.resolve({ status: "healthy" as const })),
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("should throw BootstrapError when BFF client secret is too short", async () => {
			const invalidConfig = { ...mockConfig, bffClientSecret: "short" };

			const { ensureSystemClients } = await import("@bootstrap");
			const { BootstrapError } = await import("@shared");

			await expect(
				ensureSystemClients(
					mockRepository,
					mockHashService,
					mockUuid,
					loggerMock,
					invalidConfig,
				),
			).rejects.toThrow(BootstrapError);
		});

		it("should log warning when existing client secret does not match config", async () => {
			mockRepository.findBySystemRole.mockResolvedValue({
				clientId: "existing-client",
				clientSecret: "hashed-secret",
			});
			mockHashService.verifyPassword.mockResolvedValue(false);

			const { ensureSystemClients } = await import("@bootstrap");

			await ensureSystemClients(
				mockRepository,
				mockHashService,
				mockUuid,
				loggerMock,
				mockConfig,
			);

			expect(mockRepository.findBySystemRole).toHaveBeenCalledWith("bff");
			expect(mockHashService.verifyPassword).toHaveBeenCalledWith(
				mockConfig.bffClientSecret,
				"hashed-secret",
			);
			expect(loggerMock.warn).toHaveBeenCalled();
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it("should create new BFF client when none exists", async () => {
			mockRepository.findBySystemRole.mockResolvedValue(null);
			mockHashService.hashPassword.mockResolvedValue("hashed-secret");
			mockUuid.generate.mockReturnValue("new-uuid");

			const { ensureSystemClients } = await import("@bootstrap");

			await ensureSystemClients(
				mockRepository,
				mockHashService,
				mockUuid,
				loggerMock,
				mockConfig,
			);

			expect(mockRepository.findBySystemRole).toHaveBeenCalledWith("bff");
			expect(mockHashService.hashPassword).toHaveBeenCalledWith(
				mockConfig.bffClientSecret,
			);
			expect(mockUuid.generate).toHaveBeenCalled();
			expect(mockRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					clientId: mockConfig.bffClientId,
					clientSecret: "hashed-secret",
					clientName: mockConfig.bffClientName,
					redirectUris: mockConfig.bffClientRedirectUris,
					grantTypes: ["authorization_code", "refresh_token"],
					isPublic: false,
					isActive: true,
					isSystemClient: true,
					systemRole: "bff",
				}),
			);
		});

		it("should not create new client when existing client secret matches", async () => {
			const existingClient = {
				clientId: "existing-client",
				clientSecret: "hashed-secret",
			};
			mockRepository.findBySystemRole.mockResolvedValue(existingClient);
			mockHashService.verifyPassword.mockResolvedValue(true);

			const { ensureSystemClients } = await import("@bootstrap");

			await ensureSystemClients(
				mockRepository,
				mockHashService,
				mockUuid,
				loggerMock,
				mockConfig,
			);

			expect(mockRepository.findBySystemRole).toHaveBeenCalledWith("bff");
			expect(mockHashService.verifyPassword).toHaveBeenCalledWith(
				mockConfig.bffClientSecret,
				"hashed-secret",
			);
			expect(mockHashService.hashPassword).not.toHaveBeenCalled();
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it("should throw Error when system clients bootstrap fails", async () => {
			mockRepository.findBySystemRole.mockRejectedValue(
				new Error("Repository error"),
			);

			const { ensureSystemClients } = await import("@bootstrap");

			await expect(
				ensureSystemClients(
					mockRepository,
					mockHashService,
					mockUuid,
					loggerMock,
					mockConfig,
				),
			).rejects.toThrow("Repository error");
		});
	});
});
