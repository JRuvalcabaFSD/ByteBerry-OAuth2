import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import type { Application } from "express";

import {
	getPrismaTestClient,
	closePrismaTestClient,
} from "../../helpers/prisma-test-client.js";
import {
	cleanDatabase,
	seedTestDatabase,
	seedTestDatabaseWithDeveloper,
	seedTestDatabaseWithDeveloperAndClient,
} from "../../helpers/database-helper.js";
import { TestServer } from "../../helpers/test-server.js";

describe("Client Endpoints - Integration Tests", () => {
	let prisma: PrismaClient;
	let testServer: TestServer;
	let app: Application;
	let testUserEmail: string;
	let testUserPassword: string;
	let testUserId: string;
	let authCookies: string[];

	beforeAll(async () => {
		prisma = await getPrismaTestClient();
		testServer = new TestServer(0);
		await testServer.start();
		app = await testServer.getApp();
	});

	beforeEach(async () => {
		await cleanDatabase(prisma);
		const seed = await seedTestDatabaseWithDeveloperAndClient(prisma);
		testUserEmail = seed.testUser.email;
		testUserPassword = seed.testUser.passwordPlain;
		testUserId = seed.testUser.id;

		// Login and get auth cookies
		const loginResponse = await request(app)
			.post("/auth/login")
			.send({
				emailOrUserName: testUserEmail,
				password: testUserPassword,
				rememberMe: false,
			})
			.expect(200);

		authCookies =
			(loginResponse.headers["set-cookie"] as unknown as string[]) ?? [];
	});

	afterAll(async () => {
		await testServer.stop();
		await closePrismaTestClient();
	});

	describe("POST /oauth/clients", () => {
		it("should create a new OAuth client with valid data", async () => {
			const clientData = {
				clientName: "My Test App",
				redirectUris: [
					"https://example.com/callback",
					"http://localhost:3000/callback",
				],
				grantTypes: ["authorization_code", "refresh_token"],
				isPublic: false,
			};

			const response = await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send(clientData)
				.expect(201);

			expect(response.body).toHaveProperty("client");
			expect(response.body.client).toHaveProperty("id");
			expect(response.body.client).toHaveProperty("clientId");
			expect(response.body.client).toHaveProperty("clientSecret"); // Only shown once
			expect(response.body.client.clientName).toBe(clientData.clientName);
			expect(response.body.client.redirectUris).toEqual(
				clientData.redirectUris,
			);
			expect(response.body.client.grantTypes).toEqual(clientData.grantTypes);
			expect(response.body.client.isPublic).toBe(false);
			expect(response.body.client.userId).toBe(testUserId);
			expect(response.body.client.isActive).toBe(true);
			expect(response.body.client).toHaveProperty("createdAt");
			expect(response.body.client).toHaveProperty("updatedAt");

			const dbClient = await prisma.oAuthClient.findUnique({
				where: { clientId: response.body.client.clientId },
			});
			expect(dbClient).toBeDefined();
			expect(dbClient?.clientName).toBe(clientData.clientName);
		});

		it("should create a public client when isPublic is true", async () => {
			const clientData = {
				clientName: "Public Mobile App",
				redirectUris: ["http://callback"],
				isPublic: true,
			};

			const response = await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send(clientData)
				.expect(201);

			expect(response.body.client.isPublic).toBe(true);
			expect(response.body.client.clientName).toBe("Public Mobile App");
		});

		it("should use default grant types if not provided", async () => {
			// Arrange
			const clientData = {
				clientName: "Default Grants App",
				redirectUris: ["https://example.com/callback"],
			};

			// Act
			const response = await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send(clientData)
				.expect(201);

			// Assert - Default: ['authorization_code', 'refresh_token']
			expect(response.body.client.grantTypes).toContain("authorization_code");
			expect(response.body.client.grantTypes).toContain("refresh_token");
		});

		it("should require authentication", async () => {
			// Act & Assert - No cookies
			await request(app)
				.post("/client")
				.send({
					clientName: "Test App",
					redirectUris: ["https://example.com/callback"],
				})
				.expect(401);
		});

		it("should return 400 with invalid redirect URI", async () => {
			const clientData = {
				clientName: "Invalid URI App",
				redirectUris: ["not-a-valid-url"], // Invalid URI format
			};

			const response = await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send(clientData);

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
			expect(response.body).toHaveProperty("message");
			expect(response).toHaveProperty("statusCode", 400);
			expect(response.body).toHaveProperty("errorList");
			expect(Array.isArray(response.body.errorList)).toBe(true);
		});

		it("should return 400 with missing clientName", async () => {
			// Arrange
			const clientData = {
				redirectUris: ["https://example.com/callback"],
			};

			// Act & Assert
			await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send(clientData)
				.expect(400);
		});

		it("should return 400 with empty redirectUris array", async () => {
			// Arrange
			const clientData = {
				clientName: "No Redirect App",
				redirectUris: [],
			};

			// Act & Assert
			await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send(clientData)
				.expect(400);
		});
	});

	describe("GET /oauth/clients", () => {
		it("should list all clients for authenticated user", async () => {
			// Arrange - Create 2 additional clients (seed creates 1 already)
			const client1 = await prisma.oAuthClient.create({
				data: {
					id: "client-1",
					clientId: "test-client-1",
					clientSecret: "hashed-secret-1",
					clientName: "App One",
					redirectUris: ["https://app1.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			const client2 = await prisma.oAuthClient.create({
				data: {
					id: "client-2",
					clientId: "test-client-2",
					clientSecret: "hashed-secret-2",
					clientName: "App Two",
					redirectUris: ["https://app2.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: true,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const response = await request(app)
				.get("/client")
				.set("Cookie", authCookies)
				.expect(200);

			// Assert - ListClientResponseDTO.toJSON() returns { clients: Array<ClientObject> }
			expect(response.body).toHaveProperty("clients");
			expect(Array.isArray(response.body.clients)).toBe(true);
			expect(response.body.clients).toHaveLength(3); // 1 from seed + 2 created above

			// Verify client data
			const returnedClient1 = response.body.clients.find(
				(c: any) => c.clientId === "test-client-1",
			);
			expect(returnedClient1).toBeDefined();
			expect(returnedClient1.clientName).toBe("App One");
			expect(returnedClient1).not.toHaveProperty("clientSecret"); // Secret not included in list
			expect(returnedClient1.createdAt).toBeDefined();
			expect(returnedClient1.updatedAt).toBeDefined();
		});

		it("should return empty array when user has no clients", async () => {
			// Note: Using seedTestDatabaseWithDeveloper for this test to start with clean clients
			// Re-setup for this specific test
			await cleanDatabase(prisma);
			const seed = await seedTestDatabaseWithDeveloper(prisma);
			const loginResponse = await request(app)
				.post("/auth/login")
				.send({
					emailOrUserName: seed.testUser.email,
					password: seed.testUser.passwordPlain,
					rememberMe: false,
				})
				.expect(200);

			const testCookies =
				(loginResponse.headers["set-cookie"] as unknown as string[]) ?? [];

			// Act
			const response = await request(app)
				.get("/client")
				.set("Cookie", testCookies)
				.expect(200);

			// Assert
			expect(response.body.clients).toEqual([]);
		});

		it("should only return clients owned by the authenticated user", async () => {
			// Arrange - Create client for another user
			const otherUser = await prisma.user.create({
				data: {
					id: "other-user",
					email: "other@test.com",
					username: "otheruser",
					passwordHash: "hashed",
					roles: ["user"],
					isActive: true,
					emailVerified: false,
				},
			});

			await prisma.oAuthClient.create({
				data: {
					id: "other-client",
					clientId: "other-client-id",
					clientSecret: "hashed",
					clientName: "Other User App",
					redirectUris: ["https://other.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: otherUser.id,
				},
			});

			// Create client for current test user (authCookies are from testUserId)
			// Note: testUserId already has 1 client from seedTestDatabase in beforeEach
			await prisma.oAuthClient.create({
				data: {
					id: "my-client",
					clientId: "my-client-id",
					clientSecret: "hashed",
					clientName: "My App",
					redirectUris: ["https://mine.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const response = await request(app)
				.get("/client")
				.set("Cookie", authCookies)
				.expect(200);

			// Assert - Should only see own clients (1 from seed + 1 created)
			expect(response.body.clients).toHaveLength(2);
			const myAppClient = response.body.clients.find(
				(c: any) => c.clientName === "My App",
			);
			expect(myAppClient).toBeDefined();
		});

		it("should require authentication", async () => {
			// Act & Assert
			await request(app).get("/client").expect(401);
		});
	});

	describe("GET /oauth/clients/:id", () => {
		it("should get client by clientId", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "test-client",
					clientId: "get-test-client",
					clientSecret: "hashed-secret",
					clientName: "Get Test App",
					redirectUris: ["https://gettest.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const response = await request(app)
				.get(`/client/${client.clientId}`)
				.set("Cookie", authCookies)
				.expect(200);

			// Assert - ClientResponseDTO.toJSON() returns { client: ClientObject }
			expect(response.body).toHaveProperty("client");
			expect(response.body.client.clientId).toBe("get-test-client");
			expect(response.body.client.clientName).toBe("Get Test App");
			expect(response.body.client).not.toHaveProperty("clientSecret"); // Secret not exposed
			expect(response.body.client.createdAt).toBeDefined();
			expect(response.body.client.updatedAt).toBeDefined();
		});

		it("should return 404 for non-existent client", async () => {
			// Act & Assert
			await request(app)
				.get("/client/non-existent-client-id")
				.set("Cookie", authCookies)
				.expect(404);
		});

		it("should return 403 when accessing another user's client", async () => {
			// Arrange - Create client for another user
			const otherUser = await prisma.user.create({
				data: {
					id: "other-user-2",
					email: "other2@test.com",
					username: "otheruser2",
					passwordHash: "hashed",
					roles: ["user"],
					isActive: true,
					emailVerified: false,
				},
			});

			const otherClient = await prisma.oAuthClient.create({
				data: {
					id: "forbidden-client",
					clientId: "forbidden-client-id",
					clientSecret: "hashed",
					clientName: "Forbidden App",
					redirectUris: ["https://forbidden.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: otherUser.id,
				},
			});

			// Act & Assert
			await request(app)
				.get(`/client/${otherClient.clientId}`)
				.set("Cookie", authCookies)
				.expect(403);
		});

		it("should require authentication", async () => {
			// Act & Assert
			await request(app).get("/client/some-client-id").expect(401);
		});
	});

	describe("PUT /oauth/clients/:id", () => {
		it("should update client name", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "update-client",
					clientId: "update-test-client",
					clientSecret: "hashed-secret",
					clientName: "Original Name",
					redirectUris: ["https://update.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const response = await request(app)
				.put(`/client/${client.clientId}`)
				.set("Cookie", authCookies)
				.send({
					clientName: "Updated Name",
				})
				.expect(200);

			// Assert - ClientResponseDTO.toJSON()
			expect(response.body.client.clientName).toBe("Updated Name");
			expect(response.body.client.clientId).toBe("update-test-client");

			// Verify in database
			const dbClient = await prisma.oAuthClient.findUnique({
				where: { clientId: client.clientId },
			});
			expect(dbClient?.clientName).toBe("Updated Name");
		});

		it("should update redirect URIs", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "update-uri-client",
					clientId: "update-uri-client-id",
					clientSecret: "hashed-secret",
					clientName: "URI Update App",
					redirectUris: ["https://old.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const newUris = [
				"https://new1.com/callback",
				"https://new2.com/callback",
			];
			const response = await request(app)
				.put(`/client/${client.clientId}`)
				.set("Cookie", authCookies)
				.send({
					clientName: "URI Update App",
					redirectUris: newUris,
				})
				.expect(200);

			// Assert
			expect(response.body.client.redirectUris).toEqual(newUris);
		});

		it("should update grant types", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "update-grants-client",
					clientId: "update-grants-id",
					clientSecret: "hashed-secret",
					clientName: "Grants Update App",
					redirectUris: ["https://grants.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const response = await request(app)
				.put(`/client/${client.clientId}`)
				.set("Cookie", authCookies)
				.send({
					clientName: "Grants Update App",
					grantTypes: ["authorization_code", "refresh_token"],
				})
				.expect(200);

			// Assert
			expect(response.body.client.grantTypes).toContain("refresh_token");
		});

		it("should update isPublic flag", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "update-public-client",
					clientId: "update-public-id",
					clientSecret: "hashed-secret",
					clientName: "Public Update App",
					redirectUris: ["https://public.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const response = await request(app)
				.put(`/client/${client.clientId}`)
				.set("Cookie", authCookies)
				.send({
					clientName: "Public Update App",
					isPublic: true,
				})
				.expect(200);

			// Assert
			expect(response.body.client.isPublic).toBe(true);
		});

		it("should return 404 for non-existent client", async () => {
			// Act & Assert
			await request(app)
				.put("/client/non-existent")
				.set("Cookie", authCookies)
				.send({
					clientName: "Updated Name",
				})
				.expect(404);
		});

		it("should return 403 when updating another user's client", async () => {
			// Arrange
			const otherUser = await prisma.user.create({
				data: {
					id: "other-user-3",
					email: "other3@test.com",
					username: "otheruser3",
					passwordHash: "hashed",
					roles: ["user"],
					isActive: true,
					emailVerified: false,
				},
			});

			const otherClient = await prisma.oAuthClient.create({
				data: {
					id: "forbidden-update-client",
					clientId: "forbidden-update-id",
					clientSecret: "hashed",
					clientName: "Forbidden Update App",
					redirectUris: ["https://forbidden.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: otherUser.id,
				},
			});

			// Act & Assert
			await request(app)
				.put(`/client/${otherClient.clientId}`)
				.set("Cookie", authCookies)
				.send({
					clientName: "Hacked Name",
				})
				.expect(403);
		});

		it("should require authentication", async () => {
			// Act & Assert
			await request(app)
				.put("/client/some-client")
				.send({
					clientName: "Updated",
				})
				.expect(401);
		});
	});

	describe("DELETE /oauth/clients/:id", () => {
		it("should soft delete client", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "delete-client",
					clientId: "delete-test-client",
					clientSecret: "hashed-secret",
					clientName: "Delete Test App",
					redirectUris: ["https://delete.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			await request(app)
				.delete(`/client/${client.clientId}`)
				.set("Cookie", authCookies)
				.expect(204);

			// Assert - Verify soft delete (isActive = false)
			const dbClient = await prisma.oAuthClient.findUnique({
				where: { clientId: client.clientId },
			});
			expect(dbClient).toBeDefined();
			expect(dbClient?.isActive).toBe(false);
		});

		it("should be idempotent (deleting already deleted client succeeds)", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "idempotent-delete-client",
					clientId: "idempotent-delete-id",
					clientSecret: "hashed-secret",
					clientName: "Idempotent Delete App",
					redirectUris: ["https://idempotent.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: false, // Already deleted
					userId: testUserId,
				},
			});

			// Act & Assert - Should succeed without error
			await request(app)
				.delete(`/client/${client.clientId}`)
				.set("Cookie", authCookies)
				.expect(204);
		});

		it("should return 404 for non-existent client", async () => {
			// Act & Assert
			await request(app)
				.delete("/client/non-existent-client")
				.set("Cookie", authCookies)
				.expect(404);
		});

		it("should return 403 when deleting another user's client", async () => {
			// Arrange
			const otherUser = await prisma.user.create({
				data: {
					id: "other-user-4",
					email: "other4@test.com",
					username: "otheruser4",
					passwordHash: "hashed",
					roles: ["user"],
					isActive: true,
					emailVerified: false,
				},
			});

			const otherClient = await prisma.oAuthClient.create({
				data: {
					id: "forbidden-delete-client",
					clientId: "forbidden-delete-id",
					clientSecret: "hashed",
					clientName: "Forbidden Delete App",
					redirectUris: ["https://forbidden.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: otherUser.id,
				},
			});

			// Act & Assert
			await request(app)
				.delete(`/client/${otherClient.clientId}`)
				.set("Cookie", authCookies)
				.expect(403);
		});

		it("should require authentication", async () => {
			// Act & Assert
			await request(app).delete("/client/some-client").expect(401);
		});
	});

	describe("POST /oauth/clients/:id/rotate-secret", () => {
		it("should rotate client secret successfully", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "rotate-client",
					clientId: "rotate-test-client",
					clientSecret: "old-hashed-secret",
					clientName: "Rotate Secret App",
					redirectUris: ["https://rotate.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act
			const response = await request(app)
				.post(`/client/${client.clientId}/rotate-secret`)
				.set("Cookie", authCookies)
				.expect(200);

			// Assert - RotateSecretResponseDTO.toJSON() returns:
			// { clientId, clientSecret, oldSecretExpiresAt: string, message }
			expect(response.body).toHaveProperty("clientId", client.clientId);
			expect(response.body).toHaveProperty("clientSecret"); // New plaintext secret (only time shown)
			expect(response.body).toHaveProperty("oldSecretExpiresAt"); // ISO string
			expect(response.body).toHaveProperty("message");
			expect(response.body.message).toContain("24 hours");

			// Verify new secret is different
			expect(response.body.clientSecret).not.toBe("old-hashed-secret");
			expect(response.body.clientSecret).toHaveLength(32); // generateSecureSecret() creates 32 chars

			// Verify grace period is ~24 hours from now
			const expiresAt = new Date(response.body.oldSecretExpiresAt);
			const now = new Date();
			const hoursDiff =
				(expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
			expect(hoursDiff).toBeGreaterThan(23);
			expect(hoursDiff).toBeLessThan(25);

			// Verify database update
			const dbClient = await prisma.oAuthClient.findUnique({
				where: { clientId: client.clientId },
			});
			expect(dbClient?.clientSecret).not.toBe("old-hashed-secret"); // New hash
			expect(dbClient?.clientSecretOld).toBe("old-hashed-secret"); // Old moved to clientSecretOld
			expect(dbClient?.secretExpiresAt).toBeDefined();
		});

		it("should return 404 for non-existent client", async () => {
			// Act & Assert
			await request(app)
				.post("/client/non-existent/rotate-secret")
				.set("Cookie", authCookies)
				.expect(404);
		});

		it("should return 403 when rotating another user's client secret", async () => {
			// Arrange
			const otherUser = await prisma.user.create({
				data: {
					id: "other-user-5",
					email: "other5@test.com",
					username: "otheruser5",
					passwordHash: "hashed",
					roles: ["user"],
					isActive: true,
					emailVerified: false,
				},
			});

			const otherClient = await prisma.oAuthClient.create({
				data: {
					id: "forbidden-rotate-client",
					clientId: "forbidden-rotate-id",
					clientSecret: "hashed",
					clientName: "Forbidden Rotate App",
					redirectUris: ["https://forbidden.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: otherUser.id,
				},
			});

			// Act & Assert
			await request(app)
				.post(`/client/${otherClient.clientId}/rotate-secret`)
				.set("Cookie", authCookies)
				.expect(403);
		});

		it("should require authentication", async () => {
			// Act & Assert
			await request(app).post("/client/some-client/rotate-secret").expect(401);
		});

		it("should handle multiple rotations correctly", async () => {
			// Arrange
			const client = await prisma.oAuthClient.create({
				data: {
					id: "multi-rotate-client",
					clientId: "multi-rotate-id",
					clientSecret: "secret-v1",
					clientName: "Multi Rotate App",
					redirectUris: ["https://multi.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// Act - First rotation
			const response1 = await request(app)
				.post(`/client/${client.clientId}/rotate-secret`)
				.set("Cookie", authCookies)
				.expect(200);

			const secret1 = response1.body.clientSecret;

			// Act - Second rotation (old secret should be replaced again)
			const response2 = await request(app)
				.post(`/client/${client.clientId}/rotate-secret`)
				.set("Cookie", authCookies)
				.expect(200);

			const secret2 = response2.body.clientSecret;

			// Assert - Secrets should be different
			expect(secret1).not.toBe(secret2);
			expect(response2.body.clientId).toBe(client.clientId);
		});
	});
});
