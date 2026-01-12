import {
	ClientResponseDTO,
	CreateClientRequestDTO,
	CreateClientResponseDTO,
	formattedZodError,
	ListClientResponseDTO,
	RotateSecretResponseDTO,
	UpdateClientRequestDTO,
} from "@application";
import { ValidateRequestError } from "@shared";

vi.mock("@application", async () => {
	const actual = await vi.importActual("@application");
	return {
		...actual,
		formattedZodError: vi.fn((error, type) => ({
			msg: "Validation failed",
			errors: { field: "error message" },
		})),
	};
});

describe("Client Dto's", () => {
	describe("CreateClientRequestDTO", () => {
		describe("fromBody", () => {
			it("should create a valid CreateClientRequestDTO instance with valid data", () => {
				const validBody = {
					clientName: "Test App",
					redirectUris: ["http://localhost:3000/callback"],
					grantTypes: ["authorization_code"],
					isPublic: "false",
				} as any;

				const dto = CreateClientRequestDTO.fromBody(validBody);

				expect(dto).toBeInstanceOf(CreateClientRequestDTO);
				expect(dto.clientName).toBe("Test App");
			});

			it("should throw ValidateRequestError when validation fails", () => {
				const invalidBody = {
					clientName: "",
					redirectUris: ["invalid"],
					grantTypes: ["invalid"],
					isPublic: "invalid",
				} as any;

				expect(() => CreateClientRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should contain all required properties after successful creation", () => {
				const validBody = {
					clientName: "My OAuth App",
					redirectUris: ["https://example.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: "true",
				} as any;

				const dto = CreateClientRequestDTO.fromBody(validBody);

				expect(dto).toHaveProperty("clientName");
				expect(dto).toHaveProperty("redirectUris");
				expect(dto).toHaveProperty("grantTypes");
				expect(dto).toHaveProperty("isPublic");
			});

			it("should throw ValidateRequestError with invalid data", () => {
				const invalidBody = {
					clientName: "",
					redirectUris: ["invalid-uri"],
					grantTypes: ["invalid-grant"],
					isPublic: "not-boolean",
				} as any;

				expect(() => {
					CreateClientRequestDTO.fromBody(invalidBody);
				}).toThrow(ValidateRequestError);
			});
		});
	});

	describe("CreateClientResponseDTO", () => {
		describe("fromEntity", () => {
			it("should create a CreateClientResponseDTO instance from a ClientEntity with secret", () => {
				const mockClient = {
					id: "client-123",
					clientId: "oauth-client-id",
					clientName: "Test App",
					redirectUris: ["http://localhost:3000/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: "user-123",
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-15"),
				};
				const clientSecret = "secret-key-123";

				const dto = CreateClientResponseDTO.fromEntity(
					mockClient as any,
					clientSecret,
				);

				expect(dto).toBeInstanceOf(CreateClientResponseDTO);
			});

			it("should include client secret in the response", () => {
				const mockClient = {
					id: "client-456",
					clientId: "oauth-client-456",
					clientName: "Another App",
					redirectUris: ["https://example.com/callback"],
					grantTypes: ["client_credentials"],
					isPublic: true,
					isActive: true,
					userId: "user-456",
					createdAt: new Date("2024-02-01"),
					updatedAt: new Date("2024-02-10"),
				};
				const clientSecret = "new-secret-xyz";

				const dto = CreateClientResponseDTO.fromEntity(
					mockClient as any,
					clientSecret,
				);
				const json = dto.toJSON();

				expect(json.client).toHaveProperty("clientSecret", clientSecret);
			});
		});

		describe("toJSON", () => {
			it("should convert dates to ISO strings", () => {
				const createdDate = new Date("2024-01-01T10:00:00Z");
				const updatedDate = new Date("2024-01-15T15:30:00Z");
				const mockClient = {
					id: "client-789",
					clientId: "oauth-789",
					clientName: "Date Test App",
					redirectUris: ["http://localhost:8080/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: "user-789",
					createdAt: createdDate,
					updatedAt: updatedDate,
				};

				const dto = CreateClientResponseDTO.fromEntity(
					mockClient as any,
					"test-secret",
				);
				const json = dto.toJSON();

				expect(json.client.createdAt).toBe(createdDate.toISOString());
				expect(json.client.updatedAt).toBe(updatedDate.toISOString());
				expect(typeof json.client.createdAt).toBe("string");
				expect(typeof json.client.updatedAt).toBe("string");
			});

			it("should preserve all client properties in JSON output", () => {
				const mockClient = {
					id: "client-999",
					clientId: "oauth-999",
					clientName: "Complete Test App",
					redirectUris: ["https://app.example.com/auth"],
					grantTypes: ["authorization_code", "refresh_token"],
					isPublic: false,
					isActive: true,
					userId: "user-999",
					createdAt: new Date("2024-03-01"),
					updatedAt: new Date("2024-03-05"),
				};
				const clientSecret = "complete-secret";

				const dto = CreateClientResponseDTO.fromEntity(
					mockClient as any,
					clientSecret,
				);
				const json = dto.toJSON();

				expect(json.client).toMatchObject({
					id: mockClient.id,
					clientId: mockClient.clientId,
					clientName: mockClient.clientName,
					redirectUris: mockClient.redirectUris,
					grantTypes: mockClient.grantTypes,
					isPublic: mockClient.isPublic,
					isActive: mockClient.isActive,
					userId: mockClient.userId,
					clientSecret: clientSecret,
				});
			});

			it("should return an object with client property", () => {
				const mockClient = {
					id: "client-111",
					clientId: "oauth-111",
					clientName: "Structure Test",
					redirectUris: ["http://localhost:5000"],
					grantTypes: ["client_credentials"],
					isPublic: true,
					isActive: false,
					userId: "user-111",
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				const dto = CreateClientResponseDTO.fromEntity(
					mockClient as any,
					"secret",
				);
				const json = dto.toJSON();

				expect(json).toHaveProperty("client");
				expect(typeof json.client).toBe("object");
			});
		});
	});

	describe("ListClientResponseDTO", () => {
		describe("fromEntities", () => {
			it("should create a ListClientResponseDTO instance from an array of ClientEntity objects", () => {
				const mockClients = [
					{
						id: "client-1",
						clientId: "oauth-1",
						clientName: "App 1",
						redirectUris: ["http://localhost:3000/callback"],
						grantTypes: ["authorization_code"],
						isPublic: false,
						isActive: true,
						userId: "user-1",
						createdAt: new Date("2024-01-01"),
						updatedAt: new Date("2024-01-10"),
						toPublic: vi.fn(() => ({
							id: "client-1",
							clientId: "oauth-1",
							clientName: "App 1",
							redirectUris: ["http://localhost:3000/callback"],
							grantTypes: ["authorization_code"],
							isPublic: false,
							isActive: true,
							userId: "user-1",
						})),
					},
				];

				const dto = ListClientResponseDTO.fromEntities(mockClients as any);

				expect(dto).toBeInstanceOf(ListClientResponseDTO);
				expect(dto.clients).toHaveLength(1);
			});

			it("should include timestamps in the clients array", () => {
				const createdDate = new Date("2024-01-01");
				const updatedDate = new Date("2024-01-10");
				const mockClients = [
					{
						id: "client-2",
						clientId: "oauth-2",
						clientName: "App 2",
						redirectUris: ["https://example.com/callback"],
						grantTypes: ["client_credentials"],
						isPublic: true,
						isActive: true,
						userId: "user-2",
						createdAt: createdDate,
						updatedAt: updatedDate,
						toPublic: vi.fn(() => ({
							id: "client-2",
							clientId: "oauth-2",
							clientName: "App 2",
							redirectUris: ["https://example.com/callback"],
							grantTypes: ["client_credentials"],
							isPublic: true,
							isActive: true,
							userId: "user-2",
						})),
					},
				];

				const dto = ListClientResponseDTO.fromEntities(mockClients as any);

				expect(dto.clients[0]).toHaveProperty("createdAt", createdDate);
				expect(dto.clients[0]).toHaveProperty("updatedAt", updatedDate);
			});

			it("should handle multiple ClientEntity objects", () => {
				const mockClients = [
					{
						id: "client-1",
						clientId: "oauth-1",
						clientName: "App 1",
						redirectUris: ["http://localhost:3000/callback"],
						grantTypes: ["authorization_code"],
						isPublic: false,
						isActive: true,
						userId: "user-1",
						createdAt: new Date("2024-01-01"),
						updatedAt: new Date("2024-01-10"),
						toPublic: vi.fn(() => ({
							id: "client-1",
							clientId: "oauth-1",
							clientName: "App 1",
							redirectUris: ["http://localhost:3000/callback"],
							grantTypes: ["authorization_code"],
							isPublic: false,
							isActive: true,
							userId: "user-1",
						})),
					},
					{
						id: "client-2",
						clientId: "oauth-2",
						clientName: "App 2",
						redirectUris: ["https://example.com/callback"],
						grantTypes: ["client_credentials"],
						isPublic: true,
						isActive: false,
						userId: "user-2",
						createdAt: new Date("2024-02-01"),
						updatedAt: new Date("2024-02-15"),
						toPublic: vi.fn(() => ({
							id: "client-2",
							clientId: "oauth-2",
							clientName: "App 2",
							redirectUris: ["https://example.com/callback"],
							grantTypes: ["client_credentials"],
							isPublic: true,
							isActive: false,
							userId: "user-2",
						})),
					},
				];

				const dto = ListClientResponseDTO.fromEntities(mockClients as any);

				expect(dto.clients).toHaveLength(2);
				expect(dto.clients[0].clientName).toBe("App 1");
				expect(dto.clients[1].clientName).toBe("App 2");
			});

			it("should handle an empty array of clients", () => {
				const dto = ListClientResponseDTO.fromEntities([]);

				expect(dto).toBeInstanceOf(ListClientResponseDTO);
				expect(dto.clients).toHaveLength(0);
			});
		});

		describe("toJSON", () => {
			it("should convert all dates to ISO strings", () => {
				const createdDate = new Date("2024-01-01T10:00:00Z");
				const updatedDate = new Date("2024-01-15T15:30:00Z");
				const mockClients = [
					{
						id: "client-3",
						clientId: "oauth-3",
						clientName: "App 3",
						redirectUris: ["http://localhost:8080/callback"],
						grantTypes: ["authorization_code"],
						isPublic: false,
						isActive: true,
						userId: "user-3",
						createdAt: createdDate,
						updatedAt: updatedDate,
						toPublic: vi.fn(() => ({
							id: "client-3",
							clientId: "oauth-3",
							clientName: "App 3",
							redirectUris: ["http://localhost:8080/callback"],
							grantTypes: ["authorization_code"],
							isPublic: false,
							isActive: true,
							userId: "user-3",
						})),
					},
				];

				const dto = ListClientResponseDTO.fromEntities(mockClients as any);
				const json = dto.toJSON();

				expect(json.clients[0].createdAt).toBe(createdDate.toISOString());
				expect(json.clients[0].updatedAt).toBe(updatedDate.toISOString());
				expect(typeof json.clients[0].createdAt).toBe("string");
				expect(typeof json.clients[0].updatedAt).toBe("string");
			});

			it("should preserve all client properties in JSON output", () => {
				const mockClients = [
					{
						id: "client-4",
						clientId: "oauth-4",
						clientName: "App 4",
						redirectUris: ["https://app.example.com/auth"],
						grantTypes: ["authorization_code", "refresh_token"],
						isPublic: true,
						isActive: true,
						userId: "user-4",
						createdAt: new Date("2024-03-01"),
						updatedAt: new Date("2024-03-05"),
						toPublic: vi.fn(() => ({
							id: "client-4",
							clientId: "oauth-4",
							clientName: "App 4",
							redirectUris: ["https://app.example.com/auth"],
							grantTypes: ["authorization_code", "refresh_token"],
							isPublic: true,
							isActive: true,
							userId: "user-4",
						})),
					},
				];

				const dto = ListClientResponseDTO.fromEntities(mockClients as any);
				const json = dto.toJSON();

				expect(json.clients[0]).toMatchObject({
					id: "client-4",
					clientId: "oauth-4",
					clientName: "App 4",
					redirectUris: ["https://app.example.com/auth"],
					grantTypes: ["authorization_code", "refresh_token"],
					isPublic: true,
					isActive: true,
					userId: "user-4",
				});
			});

			it("should return an object with clients property containing an array", () => {
				const mockClients = [
					{
						id: "client-5",
						clientId: "oauth-5",
						clientName: "App 5",
						redirectUris: ["http://localhost:5000"],
						grantTypes: ["client_credentials"],
						isPublic: false,
						isActive: false,
						userId: "user-5",
						createdAt: new Date(),
						updatedAt: new Date(),
						toPublic: vi.fn(() => ({
							id: "client-5",
							clientId: "oauth-5",
							clientName: "App 5",
							redirectUris: ["http://localhost:5000"],
							grantTypes: ["client_credentials"],
							isPublic: false,
							isActive: false,
							userId: "user-5",
						})),
					},
				];

				const dto = ListClientResponseDTO.fromEntities(mockClients as any);
				const json = dto.toJSON();

				expect(json).toHaveProperty("clients");
				expect(Array.isArray(json.clients)).toBe(true);
			});

			it("should handle multiple clients with proper serialization", () => {
				const mockClients = [
					{
						id: "client-6",
						clientId: "oauth-6",
						clientName: "App 6",
						redirectUris: ["http://localhost:3000/callback"],
						grantTypes: ["authorization_code"],
						isPublic: false,
						isActive: true,
						userId: "user-6",
						createdAt: new Date("2024-01-01T08:00:00Z"),
						updatedAt: new Date("2024-01-10T12:00:00Z"),
						toPublic: vi.fn(() => ({
							id: "client-6",
							clientId: "oauth-6",
							clientName: "App 6",
							redirectUris: ["http://localhost:3000/callback"],
							grantTypes: ["authorization_code"],
							isPublic: false,
							isActive: true,
							userId: "user-6",
						})),
					},
					{
						id: "client-7",
						clientId: "oauth-7",
						clientName: "App 7",
						redirectUris: ["https://example.com/callback"],
						grantTypes: ["client_credentials"],
						isPublic: true,
						isActive: true,
						userId: "user-7",
						createdAt: new Date("2024-02-01T09:00:00Z"),
						updatedAt: new Date("2024-02-15T14:00:00Z"),
						toPublic: vi.fn(() => ({
							id: "client-7",
							clientId: "oauth-7",
							clientName: "App 7",
							redirectUris: ["https://example.com/callback"],
							grantTypes: ["client_credentials"],
							isPublic: true,
							isActive: true,
							userId: "user-7",
						})),
					},
				];

				const dto = ListClientResponseDTO.fromEntities(mockClients as any);
				const json = dto.toJSON();

				expect(json.clients).toHaveLength(2);
				expect(json.clients[0].clientName).toBe("App 6");
				expect(json.clients[1].clientName).toBe("App 7");
				expect(typeof json.clients[0].createdAt).toBe("string");
				expect(typeof json.clients[1].updatedAt).toBe("string");
			});
		});
	});

	describe("ClientResponseDTO", () => {
		describe("fromEntity", () => {
			it("should create a ClientResponseDTO instance from a ClientEntity", () => {
				const mockClient = {
					id: "client-123",
					clientId: "oauth-client-id",
					clientName: "Test App",
					redirectUris: ["http://localhost:3000/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: "user-123",
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-15"),
				};

				const dto = ClientResponseDTO.fromEntity(mockClient as any);

				expect(dto).toBeInstanceOf(ClientResponseDTO);
			});

			it("should copy all client properties to the DTO", () => {
				const mockClient = {
					id: "client-456",
					clientId: "oauth-456",
					clientName: "Another App",
					redirectUris: ["https://example.com/callback"],
					grantTypes: ["client_credentials"],
					isPublic: true,
					isActive: false,
					userId: "user-456",
					createdAt: new Date("2024-02-01"),
					updatedAt: new Date("2024-02-10"),
				};

				const dto = ClientResponseDTO.fromEntity(mockClient as any);

				expect(dto.client).toMatchObject({
					id: mockClient.id,
					clientId: mockClient.clientId,
					clientName: mockClient.clientName,
					redirectUris: mockClient.redirectUris,
					grantTypes: mockClient.grantTypes,
					isPublic: mockClient.isPublic,
					isActive: mockClient.isActive,
					userId: mockClient.userId,
				});
			});

			it("should preserve timestamps in the client object", () => {
				const createdDate = new Date("2024-01-01");
				const updatedDate = new Date("2024-01-15");
				const mockClient = {
					id: "client-789",
					clientId: "oauth-789",
					clientName: "Date Test App",
					redirectUris: ["http://localhost:8080/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: "user-789",
					createdAt: createdDate,
					updatedAt: updatedDate,
				};

				const dto = ClientResponseDTO.fromEntity(mockClient as any);

				expect(dto.client.createdAt).toBe(createdDate);
				expect(dto.client.updatedAt).toBe(updatedDate);
			});
		});

		describe("toJSON", () => {
			it("should convert dates to ISO strings", () => {
				const createdDate = new Date("2024-01-01T10:00:00Z");
				const updatedDate = new Date("2024-01-15T15:30:00Z");
				const mockClient = {
					id: "client-101",
					clientId: "oauth-101",
					clientName: "ISO Date Test",
					redirectUris: ["http://localhost:3000/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: "user-101",
					createdAt: createdDate,
					updatedAt: updatedDate,
				};

				const dto = ClientResponseDTO.fromEntity(mockClient as any);
				const json = dto.toJSON();

				expect(json.client.createdAt).toBe(createdDate.toISOString());
				expect(json.client.updatedAt).toBe(updatedDate.toISOString());
				expect(typeof json.client.createdAt).toBe("string");
				expect(typeof json.client.updatedAt).toBe("string");
			});

			it("should preserve all client properties in JSON output", () => {
				const mockClient = {
					id: "client-202",
					clientId: "oauth-202",
					clientName: "Complete Test App",
					redirectUris: ["https://app.example.com/auth"],
					grantTypes: ["authorization_code", "refresh_token"],
					isPublic: false,
					isActive: true,
					userId: "user-202",
					createdAt: new Date("2024-03-01"),
					updatedAt: new Date("2024-03-05"),
				};

				const dto = ClientResponseDTO.fromEntity(mockClient as any);
				const json = dto.toJSON();

				expect(json.client).toMatchObject({
					id: mockClient.id,
					clientId: mockClient.clientId,
					clientName: mockClient.clientName,
					redirectUris: mockClient.redirectUris,
					grantTypes: mockClient.grantTypes,
					isPublic: mockClient.isPublic,
					isActive: mockClient.isActive,
					userId: mockClient.userId,
				});
			});

			it("should return an object with client property", () => {
				const mockClient = {
					id: "client-303",
					clientId: "oauth-303",
					clientName: "Structure Test",
					redirectUris: ["http://localhost:5000"],
					grantTypes: ["client_credentials"],
					isPublic: true,
					isActive: false,
					userId: "user-303",
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				const dto = ClientResponseDTO.fromEntity(mockClient as any);
				const json = dto.toJSON();

				expect(json).toHaveProperty("client");
				expect(typeof json.client).toBe("object");
			});

			it("should not include client secret in the response", () => {
				const mockClient = {
					id: "client-404",
					clientId: "oauth-404",
					clientName: "Secret Test",
					redirectUris: ["https://example.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: "user-404",
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-15"),
				};

				const dto = ClientResponseDTO.fromEntity(mockClient as any);
				const json = dto.toJSON();

				expect(json.client).not.toHaveProperty("clientSecret");
			});

			it("should handle multiple clients independently", () => {
				const mockClient1 = {
					id: "client-505",
					clientId: "oauth-505",
					clientName: "App 1",
					redirectUris: ["http://localhost:3000"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: "user-505",
					createdAt: new Date("2024-01-01T08:00:00Z"),
					updatedAt: new Date("2024-01-10T12:00:00Z"),
				};

				const mockClient2 = {
					id: "client-606",
					clientId: "oauth-606",
					clientName: "App 2",
					redirectUris: ["https://example.com"],
					grantTypes: ["client_credentials"],
					isPublic: true,
					isActive: false,
					userId: "user-606",
					createdAt: new Date("2024-02-01T09:00:00Z"),
					updatedAt: new Date("2024-02-15T14:00:00Z"),
				};

				const dto1 = ClientResponseDTO.fromEntity(mockClient1 as any);
				const dto2 = ClientResponseDTO.fromEntity(mockClient2 as any);

				const json1 = dto1.toJSON();
				const json2 = dto2.toJSON();

				expect(json1.client.clientName).toBe("App 1");
				expect(json2.client.clientName).toBe("App 2");
				expect(json1.client.createdAt).not.toBe(json2.client.createdAt);
			});
		});
	});

	describe("UpdateClientRequestDTO", () => {
		describe("fromBody", () => {
			it("should create a valid UpdateClientRequestDTO instance with valid data", () => {
				const validBody = {
					clientName: "Updated App",
					redirectUris: ["http://localhost:3000/callback"],
					grantTypes: ["authorization_code"],
					isPublic: "true",
				} as any;

				const dto = UpdateClientRequestDTO.fromBody(validBody);

				expect(dto).toBeInstanceOf(UpdateClientRequestDTO);
				expect(dto.clientName).toBe("Updated App");
			});

			it("should create a DTO with partial data (only clientName)", () => {
				const partialBody = {
					clientName: "Partially Updated",
				} as any;

				const dto = UpdateClientRequestDTO.fromBody(partialBody);

				expect(dto).toBeInstanceOf(UpdateClientRequestDTO);
				expect(dto.clientName).toBe("Partially Updated");
				expect(dto.redirectUris).toBeUndefined();
				expect(dto.grantTypes).toBeUndefined();
				expect(dto.isPublic).toBeUndefined();
			});

			it("should create a DTO with only redirectUris", () => {
				const body = {
					clientName: "Test",
					redirectUris: ["https://example.com/callback"],
				} as any;

				const dto = UpdateClientRequestDTO.fromBody(body);

				expect(dto).toBeInstanceOf(UpdateClientRequestDTO);
				expect(dto.redirectUris).toEqual(["https://example.com/callback"]);
				expect(dto.grantTypes).toBeUndefined();
			});

			it("should create a DTO with only grantTypes", () => {
				const body = {
					clientName: "Test",
					grantTypes: ["authorization_code"],
				} as any;

				const dto = UpdateClientRequestDTO.fromBody(body);

				expect(dto).toBeInstanceOf(UpdateClientRequestDTO);
				expect(dto.grantTypes).toEqual(["authorization_code"]);
				expect(dto.redirectUris).toBeUndefined();
			});

			it("should create a DTO with only isPublic", () => {
				const body = {
					clientName: "Test",
					isPublic: "false",
				} as any;

				const dto = UpdateClientRequestDTO.fromBody(body);

				expect(dto).toBeInstanceOf(UpdateClientRequestDTO);
				expect(dto.isPublic).toBe(false);
			});

			it("should throw ValidateRequestError when validation fails", () => {
				const invalidBody = {
					clientName: "",
					redirectUris: ["invalid-uri"],
					grantTypes: ["invalid-grant"],
					isPublic: "invalid-boolean",
				} as any;

				expect(() => UpdateClientRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError on validation failure", () => {
				vi.resetAllMocks();
				const invalidBody = {
					redirectUris: ["invalid-uri"],
				} as any;

				expect(() => {
					UpdateClientRequestDTO.fromBody(invalidBody);
				}).toThrow(ValidateRequestError);
			});

			it("should handle empty body (no properties)", () => {
				const emptyBody = {} as any;

				expect(() => UpdateClientRequestDTO.fromBody(emptyBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should create a DTO with all optional properties", () => {
				const fullBody = {
					clientName: "Full Update",
					redirectUris: ["https://example.com/callback", "https://app.example.com/auth"],
					grantTypes: ["authorization_code"],
					isPublic: "true",
				} as any;

				const dto = UpdateClientRequestDTO.fromBody(fullBody);

				expect(dto).toBeInstanceOf(UpdateClientRequestDTO);
				expect(dto.clientName).toBe("Full Update");
				expect(dto.redirectUris).toEqual([
					"https://example.com/callback",
					"https://app.example.com/auth",
				]);
				expect(dto.grantTypes).toEqual(["authorization_code"]);
				expect(dto.isPublic).toBe(true);
			});

			it("should properly parse boolean string values", () => {
				const bodyTrue = { clientName: "Test", isPublic: "true" } as any;
				const bodyFalse = { clientName: "Test", isPublic: "false" } as any;

				const dtoTrue = UpdateClientRequestDTO.fromBody(bodyTrue);
				const dtoFalse = UpdateClientRequestDTO.fromBody(bodyFalse);

				expect(dtoTrue.isPublic).toBe(true);
				expect(dtoFalse.isPublic).toBe(false);
			});

			it("should preserve array structures for redirectUris and grantTypes", () => {
				const body = {
					clientName: "Test",
					redirectUris: ["http://localhost:3000", "http://localhost:8080", "https://prod.example.com"],
					grantTypes: ["authorization_code"],
				} as any;

				const dto = UpdateClientRequestDTO.fromBody(body);

				expect(Array.isArray(dto.redirectUris)).toBe(true);
				expect(Array.isArray(dto.grantTypes)).toBe(true);
				expect(dto.redirectUris).toHaveLength(3);
				expect(dto.grantTypes).toHaveLength(1);
			});
		});
	});

	describe("RotateSecretResponseDTO", () => {
		describe("create", () => {
			it("should create a RotateSecretResponseDTO instance with valid data", () => {
				const clientId = "client-123";
				const newSecret = "new-secret-key";
				const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

				const dto = RotateSecretResponseDTO.create(
					clientId,
					newSecret,
					expiresAt,
				);

				expect(dto).toBeInstanceOf(RotateSecretResponseDTO);
			});

			it("should set clientId correctly", () => {
				const clientId = "oauth-client-456";
				const newSecret = "secret-xyz";
				const expiresAt = new Date();

				const dto = RotateSecretResponseDTO.create(
					clientId,
					newSecret,
					expiresAt,
				);
				const json = dto.toJSON();

				expect(json.clientId).toBe(clientId);
			});

			it("should set clientSecret to the provided newSecret", () => {
				const clientId = "client-789";
				const newSecret = "rotated-secret-abc";
				const expiresAt = new Date();

				const dto = RotateSecretResponseDTO.create(
					clientId,
					newSecret,
					expiresAt,
				);
				const json = dto.toJSON();

				expect(json.clientSecret).toBe(newSecret);
			});

			it("should set oldSecretExpiresAt to the provided date", () => {
				const clientId = "client-001";
				const newSecret = "secret-001";
				const expiresAt = new Date("2024-12-31T23:59:59Z");

				const dto = RotateSecretResponseDTO.create(
					clientId,
					newSecret,
					expiresAt,
				);
				const json = dto.toJSON();

				expect(json.oldSecretExpiresAt).toBe(expiresAt.toISOString());
			});

			it("should include the correct success message", () => {
				const clientId = "client-msg";
				const newSecret = "secret-msg";
				const expiresAt = new Date();

				const dto = RotateSecretResponseDTO.create(
					clientId,
					newSecret,
					expiresAt,
				);
				const json = dto.toJSON();

				expect(json.message).toBe(
					"Secret rotated successfully. Old secret will remain valid for 24 hours.",
				);
			});
		});

		describe("toJSON", () => {
			it("should convert oldSecretExpiresAt to ISO string format", () => {
				const expiresAt = new Date("2024-06-15T10:30:00Z");
				const dto = RotateSecretResponseDTO.create(
					"client-iso",
					"secret-iso",
					expiresAt,
				);
				const json = dto.toJSON();

				expect(json.oldSecretExpiresAt).toBe(expiresAt.toISOString());
				expect(typeof json.oldSecretExpiresAt).toBe("string");
			});

			it("should preserve all properties in JSON output", () => {
				const clientId = "client-preserve";
				const newSecret = "secret-preserve";
				const expiresAt = new Date();

				const dto = RotateSecretResponseDTO.create(
					clientId,
					newSecret,
					expiresAt,
				);
				const json = dto.toJSON();

				expect(json).toHaveProperty("clientId", clientId);
				expect(json).toHaveProperty("clientSecret", newSecret);
				expect(json).toHaveProperty("oldSecretExpiresAt");
				expect(json).toHaveProperty("message");
			});

			it("should return an object with all required properties", () => {
				const dto = RotateSecretResponseDTO.create(
					"client-required",
					"secret-required",
					new Date(),
				);
				const json = dto.toJSON();

				expect(json).toHaveProperty("clientId");
				expect(json).toHaveProperty("clientSecret");
				expect(json).toHaveProperty("oldSecretExpiresAt");
				expect(json).toHaveProperty("message");
			});

			it("should not mutate the original date object", () => {
				const originalDate = new Date("2024-07-20T14:45:00Z");
				const originalISOString = originalDate.toISOString();

				const dto = RotateSecretResponseDTO.create(
					"client-immute",
					"secret-immute",
					originalDate,
				);
				dto.toJSON();

				expect(originalDate.toISOString()).toBe(originalISOString);
			});

			it("should handle future expiration dates correctly", () => {
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
				const dto = RotateSecretResponseDTO.create(
					"client-future",
					"secret-future",
					futureDate,
				);
				const json = dto.toJSON();

				expect(json.oldSecretExpiresAt).toBe(futureDate.toISOString());
			});

			it("should handle immediate expiration dates", () => {
				const now = new Date();
				const dto = RotateSecretResponseDTO.create(
					"client-now",
					"secret-now",
					now,
				);
				const json = dto.toJSON();

				expect(json.oldSecretExpiresAt).toBe(now.toISOString());
			});

			it("should handle different secret formats", () => {
				const secrets = [
					"simple-secret",
					"secret-with-special-chars-!@#$%",
					"very-long-secret-string-that-might-be-used-in-production-systems",
					"secret123456789",
				];

				secrets.forEach((secret) => {
					const dto = RotateSecretResponseDTO.create(
						"client-formats",
						secret,
						new Date(),
					);
					const json = dto.toJSON();

					expect(json.clientSecret).toBe(secret);
				});
			});

			it("should handle different client ID formats", () => {
				const clientIds = [
					"simple-id",
					"uuid-12345678-1234-5678-1234-567812345678",
					"client_with_underscores",
					"client-with-dashes",
				];

				clientIds.forEach((id) => {
					const dto = RotateSecretResponseDTO.create(id, "secret", new Date());
					const json = dto.toJSON();

					expect(json.clientId).toBe(id);
				});
			});

			it("should be serializable to JSON string", () => {
				const dto = RotateSecretResponseDTO.create(
					"client-serialize",
					"secret-serialize",
					new Date("2024-08-01T00:00:00Z"),
				);
				const json = dto.toJSON();

				const jsonString = JSON.stringify(json);
				expect(typeof jsonString).toBe("string");

				const parsed = JSON.parse(jsonString);
				expect(parsed.clientId).toBe("client-serialize");
				expect(parsed.clientSecret).toBe("secret-serialize");
				expect(typeof parsed.oldSecretExpiresAt).toBe("string");
			});
		});
	});
});
