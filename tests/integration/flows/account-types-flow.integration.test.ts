/**
 * Integration tests for Account Types flows
 *
 * Tests the following scenarios:
 * 1. Registration as 'user' → verify correct flags
 * 2. Registration as 'developer' → verify correct flags
 * 3. User upgrade to developer → verify state change
 * 4. Developer enable expenses → verify state change
 * 5. Normal user attempts to create client → 403
 * 6. Developer creates client → 201
 */

import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import type { Application } from "express";

import {
	getPrismaTestClient,
	closePrismaTestClient,
} from "../../helpers/prisma-test-client.js";
import {
	cleanDatabase,
	createTestUser,
	seedScopes,
	type TestUserData,
} from "../../helpers/database-helper.js";
import { TestServer } from "../../helpers/test-server.js";

describe("Account Types Flow - Integration Tests", () => {
	let prisma: PrismaClient;
	let testServer: TestServer;
	let app: Application;

	beforeAll(async () => {
		prisma = await getPrismaTestClient();
		testServer = new TestServer(0);
		await testServer.start();
		app = await testServer.getApp();
	});

	beforeEach(async () => {
		await cleanDatabase(prisma);
		await seedScopes(prisma);
	});

	afterAll(async () => {
		await testServer.stop();
		await closePrismaTestClient();
	});

	/**
	 * Helper to login and get auth cookies
	 */
	async function loginAndGetCookies(
		email: string,
		password: string,
	): Promise<string[]> {
		const loginResponse = await request(app)
			.post("/auth/login")
			.send({
				emailOrUserName: email,
				password,
				rememberMe: false,
			})
			.expect(200);

		return (loginResponse.headers["set-cookie"] as unknown as string[]) ?? [];
	}

	describe("Registration with Account Types", () => {
		it('should register a new user with default "user" account type when accountType is not specified', async () => {
			// Arrange
			const userData = {
				email: "newuser@test.com",
				username: "newuser",
				password: "SecurePass123!",
				fullName: "New User",
			};

			// Act
			const response = await request(app)
				.post("/user/")
				.send(userData)
				.expect(201);

			// Assert - Response structure
			expect(response.body).toHaveProperty("user");
			expect(response.body.user.email).toBe(userData.email);
			expect(response.body.user.username).toBe(userData.username);

			// Verify database state
			const dbUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});

			expect(dbUser).toBeDefined();
			expect(dbUser?.isDeveloper).toBe(false);
			expect(dbUser?.canUseExpenses).toBe(true);
			expect(dbUser?.developerEnabledAt).toBeNull();
			expect(dbUser?.expensesEnabledAt).toBeDefined();
		});

		it('should register a new user with "user" account type and correct flags', async () => {
			// Arrange
			const userData = {
				email: "usertype@test.com",
				username: "usertype",
				password: "SecurePass123!",
				fullName: "User Type Test",
				accountType: "user",
			};

			// Act
			const response = await request(app)
				.post("/user/")
				.send(userData)
				.expect(201);

			// Assert - Response structure
			expect(response.body).toHaveProperty("user");
			expect(response.body.user.email).toBe(userData.email);

			// Verify database state - USER account type
			const dbUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});

			expect(dbUser).toBeDefined();
			expect(dbUser?.isDeveloper).toBe(false);
			expect(dbUser?.canUseExpenses).toBe(true);
			expect(dbUser?.developerEnabledAt).toBeNull();
			expect(dbUser?.expensesEnabledAt).not.toBeNull();
		});

		it('should register a new user with "developer" account type and correct flags', async () => {
			// Arrange
			const userData = {
				email: "devtype@test.com",
				username: "devtype",
				password: "SecurePass123!",
				fullName: "Developer Type Test",
				accountType: "developer",
			};

			// Act
			const response = await request(app)
				.post("/user/")
				.send(userData)
				.expect(201);

			// Assert - Response structure
			expect(response.body).toHaveProperty("user");
			expect(response.body.user.email).toBe(userData.email);

			// Verify database state - DEVELOPER account type
			const dbUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});

			expect(dbUser).toBeDefined();
			expect(dbUser?.isDeveloper).toBe(true);
			expect(dbUser?.canUseExpenses).toBe(false);
			expect(dbUser?.developerEnabledAt).not.toBeNull();
			expect(dbUser?.expensesEnabledAt).toBeNull();
		});
	});

	describe("User Upgrade to Developer", () => {
		let userAccount: TestUserData;
		let authCookies: string[];

		beforeEach(async () => {
			// Create a standard user account
			userAccount = await createTestUser(prisma, "user", {
				email: "upgradetest@test.com",
				username: "upgradetest",
			});
			authCookies = await loginAndGetCookies(
				userAccount.email,
				userAccount.passwordPlain,
			);
		});

		it("should upgrade a user to developer successfully", async () => {
			// Verify initial state - user has no developer access
			const initialUser = await prisma.user.findUnique({
				where: { id: userAccount.id },
			});
			expect(initialUser?.isDeveloper).toBe(false);
			expect(initialUser?.developerEnabledAt).toBeNull();

			// Act - Upgrade to developer
			const response = await request(app)
				.put("/user/me/upgrade/developer")
				.set("Cookie", authCookies)
				.expect(200);

			// Assert - Response
			expect(response.body).toHaveProperty("message");
			expect(response.body).toHaveProperty("user");
			expect(response.body.user.isDeveloper).toBe(true);

			// Verify database state after upgrade
			const upgradedUser = await prisma.user.findUnique({
				where: { id: userAccount.id },
			});

			expect(upgradedUser?.isDeveloper).toBe(true);
			expect(upgradedUser?.developerEnabledAt).not.toBeNull();
			// Should retain expenses access
			expect(upgradedUser?.canUseExpenses).toBe(true);
		});

		it("should return error when user is already a developer", async () => {
			// Setup - First upgrade

			await request(app)
				.put("/user/me/upgrade/developer")
				.set("Cookie", authCookies)
				.expect(200);



			// Test if original session still works

			const meResponse = await request(app)
				.get("/user/me")
				.set("Cookie", authCookies);



			// If session is still valid, use it. If not, get fresh cookies.
			if (meResponse.status === 200) {
				const response = await request(app)
					.put("/user/me/upgrade/developer")
					.set("Cookie", authCookies)
					.expect(400);

				// Assert
				expect(response.body).toHaveProperty("error");
				expect(response.body.message).toContain("already");
			} else {

				const freshAuthCookies = await loginAndGetCookies(
					userAccount.email,
					userAccount.passwordPlain,
				);


				const response = await request(app)
					.put("/user/me/upgrade/developer")
					.set("Cookie", freshAuthCookies)
					.expect(400);

				// Assert
				expect(response.body).toHaveProperty("error");
				expect(response.body.message).toContain("already");
			}
		});

		it("should require authentication for upgrade", async () => {
			// Act - Without auth cookies
			await request(app).put("/user/me/upgrade/developer").expect(401);
		});

		it("should allow developer to create clients after upgrade", async () => {
			// Upgrade to developer first
			await request(app)
				.put("/user/me/upgrade/developer")
				.set("Cookie", authCookies)
				.expect(200);

			// Act - Create client
			const clientData = {
				clientName: "Post-Upgrade Client",
				redirectUris: ["https://example.com/callback"],
			};

			const response = await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send(clientData)
				.expect(201);

			// Assert
			expect(response.body).toHaveProperty("client");
			expect(response.body.client.clientName).toBe(clientData.clientName);
		});
	});

	describe("Developer Enable Expenses", () => {
		let developerAccount: TestUserData;
		let authCookies: string[];

		beforeEach(async () => {
			// Create a developer account (no expenses access)
			developerAccount = await createTestUser(prisma, "developer", {
				email: "devexpenses@test.com",
				username: "devexpenses",
			});
			authCookies = await loginAndGetCookies(
				developerAccount.email,
				developerAccount.passwordPlain,
			);
		});

		it("should enable expenses for a developer successfully", async () => {
			// Verify initial state - developer has no expenses access
			const initialUser = await prisma.user.findUnique({
				where: { id: developerAccount.id },
			});
			expect(initialUser?.canUseExpenses).toBe(false);
			expect(initialUser?.expensesEnabledAt).toBeNull();

			// Act - Enable expenses
			const response = await request(app)
				.put("/user/me/upgrade/expenses")
				.set("Cookie", authCookies)
				.expect(200);

			// Assert - Response
			expect(response.body).toHaveProperty("message");
			expect(response.body).toHaveProperty("user");
			expect(response.body.user.canUseExpenses).toBe(true);

			// Verify database state after enabling expenses
			const updatedUser = await prisma.user.findUnique({
				where: { id: developerAccount.id },
			});

			expect(updatedUser?.canUseExpenses).toBe(true);
			expect(updatedUser?.expensesEnabledAt).not.toBeNull();
			// Should retain developer access
			expect(updatedUser?.isDeveloper).toBe(true);
		});

		it("should return error when user already has expenses enabled", async () => {
			// Setup - First enable expenses
			await request(app)
				.put("/user/me/upgrade/expenses")
				.set("Cookie", authCookies)
				.expect(200);

			// Get fresh auth cookies after enabling expenses
			const freshAuthCookies = await loginAndGetCookies(
				developerAccount.email,
				developerAccount.passwordPlain,
			);

			// Act - Try to enable again
			const response = await request(app)
				.put("/user/me/upgrade/expenses")
				.set("Cookie", freshAuthCookies);

			// Debug - See what we actually get
			console.log("Response status:", response.status);
			console.log("Response body:", response.body);

			// Assert
			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
			expect(response.body.message).toContain("already");
		});

		it("should require authentication for enabling expenses", async () => {
			// Act - Without auth cookies
			await request(app).put("/user/me/upgrade/expenses").expect(401);
		});
	});

	describe("Client Creation Permissions", () => {
		describe("Normal user attempts to create client", () => {
			let userAccount: TestUserData;
			let authCookies: string[];

			beforeEach(async () => {
				// Create a standard user account (no developer access)
				userAccount = await createTestUser(prisma, "user", {
					email: "normaluser@test.com",
					username: "normaluser",
				});
				authCookies = await loginAndGetCookies(
					userAccount.email,
					userAccount.passwordPlain,
				);
			});

			it("should return 403 when normal user tries to create a client", async () => {
				// Verify user is not a developer
				const dbUser = await prisma.user.findUnique({
					where: { id: userAccount.id },
				});
				expect(dbUser?.isDeveloper).toBe(false);

				// Act - Try to create client
				const clientData = {
					clientName: "Forbidden Client",
					redirectUris: ["https://example.com/callback"],
				};

				const response = await request(app)
					.post("/client")
					.set("Cookie", authCookies)
					.send(clientData)
					.expect(403);

				// Assert
				expect(response.body).toHaveProperty("error");
				expect(response.body.message).toContain("Developer access required");
			});

			it("should return 403 when normal user tries to list clients", async () => {
				// Act
				const response = await request(app)
					.get("/client")
					.set("Cookie", authCookies)
					.expect(403);

				// Assert
				expect(response.body).toHaveProperty("error");
			});

			it("should return 403 when normal user tries to access client by ID", async () => {
				// Act
				const response = await request(app)
					.get("/client/some-client-id")
					.set("Cookie", authCookies)
					.expect(403);

				// Assert
				expect(response.body).toHaveProperty("error");
			});
		});

		describe("Developer creates client", () => {
			let developerAccount: TestUserData;
			let authCookies: string[];

			beforeEach(async () => {
				// Create a developer account
				developerAccount = await createTestUser(prisma, "developer", {
					email: "devuser@test.com",
					username: "devuser",
				});
				authCookies = await loginAndGetCookies(
					developerAccount.email,
					developerAccount.passwordPlain,
				);
			});

			it("should return 201 when developer creates a client", async () => {
				// Verify user is a developer
				const dbUser = await prisma.user.findUnique({
					where: { id: developerAccount.id },
				});
				expect(dbUser?.isDeveloper).toBe(true);

				// Act - Create client
				const clientData = {
					clientName: "Developer OAuth Client",
					redirectUris: [
						"https://myapp.com/callback",
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

				// Assert - Response structure
				expect(response.body).toHaveProperty("client");
				expect(response.body.client).toHaveProperty("id");
				expect(response.body.client).toHaveProperty("clientId");
				expect(response.body.client).toHaveProperty("clientSecret"); // Only shown once
				expect(response.body.client.clientName).toBe(clientData.clientName);
				expect(response.body.client.redirectUris).toEqual(
					clientData.redirectUris,
				);
				expect(response.body.client.grantTypes).toEqual(clientData.grantTypes);
				expect(response.body.client.userId).toBe(developerAccount.id);
				expect(response.body.client.isActive).toBe(true);

				// Verify database
				const dbClient = await prisma.oAuthClient.findUnique({
					where: { clientId: response.body.client.clientId },
				});
				expect(dbClient).toBeDefined();
				expect(dbClient?.clientName).toBe(clientData.clientName);
				expect(dbClient?.userId).toBe(developerAccount.id);
			});

			it("should allow developer to list their clients", async () => {
				// Create a client first
				await request(app)
					.post("/client")
					.set("Cookie", authCookies)
					.send({
						clientName: "List Test Client",
						redirectUris: ["https://example.com/callback"],
					})
					.expect(201);

				// Act - List clients
				const response = await request(app)
					.get("/client")
					.set("Cookie", authCookies)
					.expect(200);

				// Assert
				expect(response.body).toHaveProperty("clients");
				expect(Array.isArray(response.body.clients)).toBe(true);
				expect(response.body.clients.length).toBeGreaterThanOrEqual(1);
			});

			it("should allow developer to create a public client", async () => {
				// Act
				const clientData = {
					clientName: "Public Mobile App",
					redirectUris: ["https://public-app.com/callback"],
					isPublic: true,
				};

				const response = await request(app)
					.post("/client")
					.set("Cookie", authCookies)
					.send(clientData)
					.expect(201);

				// Assert
				expect(response.body.client.isPublic).toBe(true);
			});
		});

		describe("Hybrid user (developer + expenses)", () => {
			let hybridAccount: TestUserData;
			let authCookies: string[];

			beforeEach(async () => {
				// Create a hybrid account (both developer and expenses)
				hybridAccount = await createTestUser(prisma, "hybrid", {
					email: "hybrid@test.com",
					username: "hybrid",
				});
				authCookies = await loginAndGetCookies(
					hybridAccount.email,
					hybridAccount.passwordPlain,
				);
			});

			it("should allow hybrid user to create clients", async () => {
				// Verify hybrid account has both flags
				const dbUser = await prisma.user.findUnique({
					where: { id: hybridAccount.id },
				});
				expect(dbUser?.isDeveloper).toBe(true);
				expect(dbUser?.canUseExpenses).toBe(true);

				// Act
				const clientData = {
					clientName: "Hybrid User Client",
					redirectUris: ["https://hybrid.com/callback"],
				};

				const response = await request(app)
					.post("/client")
					.set("Cookie", authCookies)
					.send(clientData)
					.expect(201);

				// Assert
				expect(response.body.client.clientName).toBe(clientData.clientName);
				expect(response.body.client.userId).toBe(hybridAccount.id);
			});

			it("should return error when hybrid user tries to upgrade to developer again", async () => {
				// Get fresh auth cookies for hybrid user
				const freshAuthCookies = await loginAndGetCookies(
					hybridAccount.email,
					hybridAccount.passwordPlain,
				);

				// Act
				const response = await request(app)
					.put("/user/me/upgrade/developer")
					.set("Cookie", freshAuthCookies)
					.expect(400);

				// Assert
				expect(response.body.message).toContain("already");
			});

			it("should return error when hybrid user tries to enable expenses again", async () => {
				// Get fresh auth cookies for hybrid user
				const freshAuthCookies = await loginAndGetCookies(
					hybridAccount.email,
					hybridAccount.passwordPlain,
				);

				// Act
				const response = await request(app)
					.put("/user/me/upgrade/expenses")
					.set("Cookie", freshAuthCookies)
					.expect(400);

				// Assert
				expect(response.body.message).toContain("already");
			});
		});
	});

	describe("Account Type Transitions (Full Journey)", () => {
		it("should complete full journey: user → developer → hybrid", async () => {
			// Step 1: Register as user
			const userData = {
				email: "journey@test.com",
				username: "journey",
				password: "JourneyPass123!",
				fullName: "Journey User",
				accountType: "user",
			};

			await request(app).post("/user/").send(userData).expect(201);

			// Verify initial state
			let dbUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});
			expect(dbUser?.isDeveloper).toBe(false);
			expect(dbUser?.canUseExpenses).toBe(true);

			// Login
			const authCookies = await loginAndGetCookies(
				userData.email,
				userData.password,
			);

			// Step 2: Try to create client (should fail)
			await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send({
					clientName: "Should Fail",
					redirectUris: ["https://fail.com/callback"],
				})
				.expect(403);

			// Step 3: Upgrade to developer
			await request(app)
				.put("/user/me/upgrade/developer")
				.set("Cookie", authCookies)
				.expect(200);

			// Verify now HYBRID (developer + expenses)
			dbUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});
			expect(dbUser?.isDeveloper).toBe(true);
			expect(dbUser?.canUseExpenses).toBe(true); // Should retain expenses

			// Step 4: Now create client (should succeed)
			const clientResponse = await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send({
					clientName: "Journey Client",
					redirectUris: ["https://journey.com/callback"],
				})
				.expect(201);

			expect(clientResponse.body.client.clientName).toBe("Journey Client");
		});

		it("should complete full journey: developer → hybrid", async () => {
			// Step 1: Register as developer
			const userData = {
				email: "devjourney@test.com",
				username: "devjourney",
				password: "DevJourney123!",
				fullName: "Developer Journey",
				accountType: "developer",
			};

			await request(app).post("/user/").send(userData).expect(201);

			// Verify initial state
			let dbUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});
			expect(dbUser?.isDeveloper).toBe(true);
			expect(dbUser?.canUseExpenses).toBe(false);

			// Login
			const authCookies = await loginAndGetCookies(
				userData.email,
				userData.password,
			);

			// Step 2: Create client (should succeed immediately)
			await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send({
					clientName: "Dev Journey Client",
					redirectUris: ["https://devjourney.com/callback"],
				})
				.expect(201);

			// Step 3: Enable expenses
			await request(app)
				.put("/user/me/upgrade/expenses")
				.set("Cookie", authCookies)
				.expect(200);

			// Verify now HYBRID
			dbUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});
			expect(dbUser?.isDeveloper).toBe(true);
			expect(dbUser?.canUseExpenses).toBe(true);

			// Step 4: Should still be able to create clients
			const clientResponse = await request(app)
				.post("/client")
				.set("Cookie", authCookies)
				.send({
					clientName: "Post-Expenses Client",
					redirectUris: ["https://post.com/callback"],
				})
				.expect(201);

			expect(clientResponse.body.client.clientName).toBe(
				"Post-Expenses Client",
			);
		});
	});
});
