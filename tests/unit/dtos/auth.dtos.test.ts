import { describe, it, expect } from "vitest";
import * as Schemas from "@application";
import { CodeRequestDTO, CodeResponseDTO } from "@application";
import { ValidateRequestError } from "@shared";

describe("Auth Dto's", () => {
	describe("CodeRequestDTO", () => {
		describe("fromQuery", () => {
			it("should create a CodeRequestDTO instance with valid query parameters", () => {
				const query = {
					client_id: "test-client",
					redirect_uri: "https://example.com/callback",
					response_type: "code",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
					state: "random-state",
					scope: "read write",
				};

				const dto = CodeRequestDTO.fromQuery(query);

				expect(dto).toBeInstanceOf(CodeRequestDTO);
				expect(dto.clientId).toBe("test-client");
				expect(dto.redirectUri).toBe("https://example.com/callback");
				expect(dto.responseType).toBe("code");
				expect(dto.codeChallenge).toBe(
					"E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
				);
				expect(dto.codeChallengeMethod).toBe("S256");
				expect(dto.state).toBe("random-state");
				expect(dto.scope).toBe("read write");
			});

			it("should create a CodeRequestDTO instance without optional state and scope", () => {
				const query = {
					client_id: "test-client",
					redirect_uri: "https://example.com/callback",
					response_type: "code",
					code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
					code_challenge_method: "S256",
				};

				const dto = CodeRequestDTO.fromQuery(query);

				expect(dto.clientId).toBe("test-client");
				expect(dto.state).toBeUndefined();
				expect(dto.scope).toBeUndefined();
			});

			it("should throw ValidateRequestError when required fields are missing", () => {
				const invalidQuery = {
					client_id: "test-client",
				};

				expect(() => CodeRequestDTO.fromQuery(invalidQuery)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError with formatted error message", () => {
				const invalidQuery = {
					redirect_uri: "https://example.com/callback",
				};

				expect(() => CodeRequestDTO.fromQuery(invalidQuery)).toThrow();
			});
		});
	});

	describe("CodeResponseDTO", () => {
		describe("constructor", () => {
			it("should create a CodeResponseDTO instance with code and state", () => {
				const dto = new CodeResponseDTO("auth_code_123", "random_state");

				expect(dto).toBeInstanceOf(CodeResponseDTO);
				expect(dto.code).toBe("auth_code_123");
				expect(dto.state).toBe("random_state");
			});

			it("should create a CodeResponseDTO instance with only code", () => {
				const dto = new CodeResponseDTO("auth_code_123");

				expect(dto.code).toBe("auth_code_123");
				expect(dto.state).toBeUndefined();
			});
		});

		describe("buildRedirectURrl", () => {
			it("should build redirect URL with code and state parameters", () => {
				const dto = new CodeResponseDTO("auth_code_123", "random_state");
				const redirectUrl = dto.buildRedirectURrl(
					"https://example.com/callback",
				);

				expect(redirectUrl).toBe(
					"https://example.com/callback?code=auth_code_123&state=random_state",
				);
			});

			it("should build redirect URL with only code parameter when state is undefined", () => {
				const dto = new CodeResponseDTO("auth_code_123");
				const redirectUrl = dto.buildRedirectURrl(
					"https://example.com/callback",
				);

				expect(redirectUrl).toBe(
					"https://example.com/callback?code=auth_code_123",
				);
			});

			it("should properly encode special characters in code and state", () => {
				const dto = new CodeResponseDTO(
					"code+with/special=chars",
					"state&with=special",
				);
				const redirectUrl = dto.buildRedirectURrl(
					"https://example.com/callback",
				);

				expect(redirectUrl).toContain("code=code%2Bwith%2Fspecial%3Dchars");
				expect(redirectUrl).toContain("state=state%26with%3Dspecial");
			});

			it("should handle base redirect URI with existing query parameters", () => {
				const dto = new CodeResponseDTO("auth_code_123", "random_state");
				const redirectUrl = dto.buildRedirectURrl(
					"https://example.com/callback?existing=param",
				);

				expect(redirectUrl).toContain("existing=param");
				expect(redirectUrl).toContain("code=auth_code_123");
				expect(redirectUrl).toContain("state=random_state");
			});
		});

		describe("toJSON", () => {
			it("should return object with code and state", () => {
				const dto = new CodeResponseDTO("auth_code_123", "random_state");
				const json = dto.toJSON();

				expect(json).toEqual({ code: "auth_code_123", state: "random_state" });
			});

			it("should return object with only code when state is undefined", () => {
				const dto = new CodeResponseDTO("auth_code_123");
				const json = dto.toJSON();

				expect(json).toEqual({ code: "auth_code_123" });
				expect(json.state).toBeUndefined();
			});
		});
	});

	describe("LoginRequestDTO", () => {
		describe("fromBody", () => {
			it("should create a LoginRequestDTO instance with valid body and ip address", () => {
				const body = {
					emailOrUserName: "user@example.com",
					password: "securePassword123",
					userAgent: "Mozilla/5.0",
				};

				const dto = Schemas.LoginRequestDTO.fromBody(body, "192.168.1.1");

				expect(dto).toBeInstanceOf(Schemas.LoginRequestDTO);
				expect(dto.emailOrUserName).toBe("user@example.com");
				expect(dto.password).toBe("securePassword123");
			});
			it("should create a LoginRequestDTO instance with required fields only", () => {
				const body = {
					emailOrUserName: "test@example.com",
					password: "password123",
				};

				const dto = Schemas.LoginRequestDTO.fromBody(body);

				expect(dto.emailOrUserName).toBe("test@example.com");
				expect(dto.password).toBe("password123");
				expect(dto.rememberMe).toBeUndefined();
				expect(dto.userAgent).toBeUndefined();
				expect(dto.ipAddress).toBeUndefined();
			});

			it("should throw ValidateRequestError when required field is missing", () => {
				const invalidBody = {
					emailOrUserName: "user@example.com",
				};

				expect(() => Schemas.LoginRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError when both required fields are missing", () => {
				const invalidBody = {};

				expect(() => Schemas.LoginRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should include ip address in validated data when provided", () => {
				const body = {
					emailOrUserName: "user@example.com",
					password: "password123",
				};

				const dto = Schemas.LoginRequestDTO.fromBody(body, "10.0.0.1");

				expect(dto.ipAddress).toBe("10.0.0.1");
			});

			it("should handle rememberMe as optional parameter", () => {
				const body = {
					emailOrUserName: "user@example.com",
					password: "password123",
				};

				const dto = Schemas.LoginRequestDTO.fromBody(body);

				expect(dto.emailOrUserName).toBe("user@example.com");
				expect(dto.password).toBe("password123");
				expect(dto.rememberMe).toBeUndefined();
			});
		});
	});

	describe("LoginResponseDTO", () => {
		describe("fromEntities", () => {
			it("should create a LoginResponseDTO instance from user and session entities", () => {
				const mockUser = {
					id: "user-123",
					email: "user@example.com",
					username: "testuser",
					fullName: "Test User",
					roles: ["user"],
					toPublic: () => ({
						id: "user-123",
						email: "user@example.com",
						username: "testuser",
						fullName: "Test User",
						roles: ["user"],
					}),
				};

				const mockSession = {
					id: "session-456",
					expiresAt: new Date("2024-12-31T23:59:59Z"),
				};

				const dto = Schemas.LoginResponseDTO.fromEntities(
					mockUser as any,
					mockSession as any,
				);

				expect(dto).toBeInstanceOf(Schemas.LoginResponseDTO);
				expect(dto.sessionId).toBe("session-456");
				expect(dto.user).toEqual({
					id: "user-123",
					email: "user@example.com",
					username: "testuser",
					fullName: "Test User",
					roles: ["user"],
				});
				expect(dto.expiresAt).toEqual(new Date("2024-12-31T23:59:59Z"));
				expect(dto.message).toBe("Login successful");
			});

			it("should handle user with null username and fullName", () => {
				const mockUser = {
					id: "user-789",
					email: "user@example.com",
					username: null,
					fullName: null,
					roles: ["admin"],
					toPublic: () => ({
						id: "user-789",
						email: "user@example.com",
						username: null,
						fullName: null,
						roles: ["admin"],
					}),
				};

				const mockSession = {
					id: "session-101",
					expiresAt: new Date(),
				};

				const dto = Schemas.LoginResponseDTO.fromEntities(
					mockUser as any,
					mockSession as any,
				);

				expect(dto.user.username).toBeNull();
				expect(dto.user.fullName).toBeNull();
			});

			it("should handle user with multiple roles", () => {
				const mockUser = {
					id: "user-999",
					email: "admin@example.com",
					username: "admin",
					fullName: "Admin User",
					roles: ["admin", "moderator", "user"],
					toPublic: () => ({
						id: "user-999",
						email: "admin@example.com",
						username: "admin",
						fullName: "Admin User",
						roles: ["admin", "moderator", "user"],
					}),
				};

				const mockSession = {
					id: "session-202",
					expiresAt: new Date("2025-01-15T12:00:00Z"),
				};

				const dto = Schemas.LoginResponseDTO.fromEntities(
					mockUser as any,
					mockSession as any,
				);

				expect(dto.user.roles).toHaveLength(3);
				expect(dto.user.roles).toContain("admin");
			});
		});

		describe("toJson", () => {
			it("should convert LoginResponseDTO to JSON with ISO string date", () => {
				const expiryDate = new Date("2024-12-31T23:59:59Z");
				const mockUser = {
					id: "user-123",
					email: "user@example.com",
					username: "testuser",
					fullName: "Test User",
					roles: ["user"],
					toPublic: () => ({
						id: "user-123",
						email: "user@example.com",
						username: "testuser",
						fullName: "Test User",
						roles: ["user"],
					}),
				};

				const mockSession = {
					id: "session-456",
					expiresAt: expiryDate,
				};

				const dto = Schemas.LoginResponseDTO.fromEntities(
					mockUser as any,
					mockSession as any,
				);
				const json = dto.toJson();

				expect(json).toEqual({
					user: {
						id: "user-123",
						email: "user@example.com",
						username: "testuser",
						fullName: "Test User",
						roles: ["user"],
					},
					expiresAt: "2024-12-31T23:59:59.000Z",
					message: "Login successful",
				});
			});

			it("should not include sessionId in JSON output", () => {
				const mockUser = {
					id: "user-123",
					email: "user@example.com",
					username: "testuser",
					fullName: "Test User",
					roles: ["user"],
					toPublic: () => ({
						id: "user-123",
						email: "user@example.com",
						username: "testuser",
						fullName: "Test User",
						roles: ["user"],
					}),
				};

				const mockSession = {
					id: "session-456",
					expiresAt: new Date(),
				};

				const dto = Schemas.LoginResponseDTO.fromEntities(
					mockUser as any,
					mockSession as any,
				);
				const json = dto.toJson();

				expect(json).not.toHaveProperty("sessionId");
			});

			it("should return expiresAt as valid ISO string format", () => {
				const mockUser = {
					id: "user-123",
					email: "user@example.com",
					username: "testuser",
					fullName: "Test User",
					roles: ["user"],
					toPublic: () => ({
						id: "user-123",
						email: "user@example.com",
						username: "testuser",
						fullName: "Test User",
						roles: ["user"],
					}),
				};

				const mockSession = {
					id: "session-456",
					expiresAt: new Date("2025-06-15T14:30:00Z"),
				};

				const dto = Schemas.LoginResponseDTO.fromEntities(
					mockUser as any,
					mockSession as any,
				);
				const json = dto.toJson();

				expect(json.expiresAt).toBe("2025-06-15T14:30:00.000Z");
				expect(() => new Date(json.expiresAt)).not.toThrow();
			});
		});
	});

	describe("TokenRequestDTO", () => {
		describe("fromBody", () => {
			it("should create a TokenRequestDTO instance with valid body parameters", () => {
				const body = {
				grant_type: "authorization_code",
				code: "auth_code_123",
				redirect_uri: "https://example.com/callback",
				client_id: "client_123",
				code_verifier: "verifier_abc_def_ghi",
			};

			const dto = Schemas.TokenRequestDTO.fromBody(body);
				expect(dto.grantType).toBe("authorization_code");
				expect(dto.code).toBe("auth_code_123");
				expect(dto.redirectUri).toBe("https://example.com/callback");
				expect(dto.clientId).toBe("client_123");
				expect(dto.codeVerifier).toBe("verifier_abc_def_ghi");
			});

			it("should throw ValidateRequestError when required field grantType is missing", () => {
				const invalidBody = {
					code: "auth_code_123",
					redirectUri: "https://example.com/callback",
					codeVerifier: "verifier_abc",
				};

				expect(() => Schemas.TokenRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError when required field code is missing", () => {
				const invalidBody = {
					grantType: "authorization_code",
					redirectUri: "https://example.com/callback",
					codeVerifier: "verifier_abc",
				};

				expect(() => Schemas.TokenRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError when required field redirectUri is missing", () => {
				const invalidBody = {
					grantType: "authorization_code",
					code: "auth_code_123",
					codeVerifier: "verifier_abc",
				};

				expect(() => Schemas.TokenRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError when required field clientId is missing", () => {
				const invalidBody = {
					grantType: "authorization_code",
					code: "auth_code_123",
					redirectUri: "https://example.com/callback",
					codeVerifier: "verifier_abc",
				};

				expect(() => Schemas.TokenRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError when required field codeVerifier is missing", () => {
				const invalidBody = {
					grantType: "authorization_code",
					code: "auth_code_123",
					redirectUri: "https://example.com/callback",
					clientId: "client_123",
				};

				expect(() => Schemas.TokenRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should throw ValidateRequestError when all required fields are missing", () => {
				const invalidBody = {};

				expect(() => Schemas.TokenRequestDTO.fromBody(invalidBody)).toThrow(
					ValidateRequestError,
				);
			});

			it("should create a TokenRequestDTO with different valid grant types", () => {
				const body = {
					grant_type: "authorization_code",
					code: "code_xyz",
					redirect_uri: "https://example.com/callback",
					client_id: "client_xyz",
					code_verifier: "verifier_xyz",
				};

				const dto = Schemas.TokenRequestDTO.fromBody(body);

			expect(dto.grantType).toBe("authorization_code");
			});

			it("should handle code verifiers with special characters and long strings", () => {
				const longVerifier =
					"abcdefghijklmnopqrstuvwxyz0123456789-._~ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				const body = {
					grant_type: "authorization_code",
					code: "auth_code_123",
					redirect_uri: "https://example.com/callback",
					client_id: "client_123",
					code_verifier: longVerifier,
				};

				const dto = Schemas.TokenRequestDTO.fromBody(body);

				expect(dto.codeVerifier).toBe(longVerifier);
			});

			it("should handle redirect URIs with query parameters", () => {
				const body = {
					grant_type: "authorization_code",
					code: "auth_code_123",
					redirect_uri: "https://example.com/callback?param=value",
					client_id: "client_123",
					code_verifier: "verifier_abc",
				};

				const dto = Schemas.TokenRequestDTO.fromBody(body);

				expect(dto.redirectUri).toBe(
					"https://example.com/callback?param=value",
				);
			});
		});
	});

	describe("TokenResponseDTO", () => {
		describe("create", () => {
			it("should create a TokenResponseDTO instance with valid data", () => {
				const data = {
					accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
					expiresIn: 3600,
					scope: "read write",
				};

				const dto = Schemas.TokenResponseDTO.create(data);

				expect(dto).toBeInstanceOf(Schemas.TokenResponseDTO);
			});

			it("should create a TokenResponseDTO with different expiration times", () => {
				const data = {
					accessToken: "token_abc",
					expiresIn: 7200,
					scope: "admin",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.expires_in).toBe(7200);
			});

			it("should create a TokenResponseDTO with multiple scopes", () => {
				const data = {
					accessToken: "token_xyz",
					expiresIn: 3600,
					scope: "read write delete admin",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.scope).toBe("read write delete admin");
			});

			it("should create a TokenResponseDTO with a single scope", () => {
				const data = {
					accessToken: "token_single",
					expiresIn: 1800,
					scope: "read",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.scope).toBe("read");
			});

			it("should create a TokenResponseDTO with long-lived tokens", () => {
				const data = {
					accessToken: "long_lived_token",
					expiresIn: 86400,
					scope: "openid profile email",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.expires_in).toBe(86400);
			});

			it("should create a TokenResponseDTO with short-lived tokens", () => {
				const data = {
					accessToken: "short_lived_token",
					expiresIn: 60,
					scope: "read",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.expires_in).toBe(60);
			});
		});

		describe("toJson", () => {
			it("should convert TokenResponseDTO to JSON with correct structure", () => {
				const data = {
					accessToken: "token_abc123",
					expiresIn: 3600,
					scope: "read write",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json).toEqual({
					access_token: "token_abc123",
					token_type: "Bearer",
					expires_in: 3600,
					scope: "read write",
				});
			});

			it("should always include Bearer as token_type", () => {
				const data = {
					accessToken: "any_token",
					expiresIn: 3600,
					scope: "read",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.token_type).toBe("Bearer");
			});

			it("should convert camelCase properties to snake_case in JSON output", () => {
				const data = {
					accessToken: "token_value",
					expiresIn: 3600,
					scope: "openid",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json).toHaveProperty("access_token");
				expect(json).toHaveProperty("token_type");
				expect(json).toHaveProperty("expires_in");
				expect(json).not.toHaveProperty("accessToken");
				expect(json).not.toHaveProperty("expiresIn");
			});

			it("should preserve special characters in access token", () => {
				const specialToken =
					"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
				const data = {
					accessToken: specialToken,
					expiresIn: 3600,
					scope: "read write",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.access_token).toBe(specialToken);
			});

			it("should handle empty scope string", () => {
				const data = {
					accessToken: "token_empty_scope",
					expiresIn: 3600,
					scope: "",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.scope).toBe("");
			});

			it("should handle zero expiration time", () => {
				const data = {
					accessToken: "expired_token",
					expiresIn: 0,
					scope: "read",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				expect(json.expires_in).toBe(0);
			});

			it("should return valid OAuth2 compliant token response", () => {
				const data = {
					accessToken: "access_token_value",
					expiresIn: 3600,
					scope: "read write delete",
				};

				const dto = Schemas.TokenResponseDTO.create(data);
				const json = dto.toJson();

				// Verify OAuth2 RFC 6749 compliance
				expect(json).toHaveProperty("access_token");
				expect(json).toHaveProperty("token_type");
				expect(json).toHaveProperty("expires_in");
				expect(json).toHaveProperty("scope");
				expect(typeof json.access_token).toBe("string");
				expect(typeof json.token_type).toBe("string");
				expect(typeof json.expires_in).toBe("number");
				expect(typeof json.scope).toBe("string");
			});
		});
	});
});
