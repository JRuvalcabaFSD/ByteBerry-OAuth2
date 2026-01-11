import {
	ScopeDisplayDTO,
	ConsentDecisionDTO,
	ListConsentsResponseDTO,
} from "@application";

describe("consent Dto's", () => {
	describe("ScopeDisplayDTO", () => {
		describe("fromScopeNames", () => {
			it("should create ScopeDisplayDTO instances for supported scopes", () => {
				const scopes = ScopeDisplayDTO.fromScopeNames(["read", "write"]);

				expect(scopes).toHaveLength(2);
				expect(scopes[0].name).toBe("read");
				expect(scopes[0].description).toBe(
					"Ver tu información de gastos, categorías y reportes",
				);
				expect(scopes[1].name).toBe("write");
				expect(scopes[1].description).toBe(
					"Crear, editar y eliminar gastos y categorías",
				);
			});

			it("should handle all predefined scopes with correct descriptions", () => {
				const scopeNames = [
					"read",
					"write",
					"admin",
					"profile",
					"profile:write",
				];
				const scopes = ScopeDisplayDTO.fromScopeNames(scopeNames);

				const expectedDescriptions: Record<string, string> = {
					read: "Ver tu información de gastos, categorías y reportes",
					write: "Crear, editar y eliminar gastos y categorías",
					admin: "Acceso completo a todas las funciones de administración",
					profile: "Ver tu información de perfil de usuario",
					"profile:write": "Modificar tu información de perfil",
				};

				scopes.forEach((scope, index) => {
					expect(scope.name).toBe(scopeNames[index]);
					expect(scope.description).toBe(
						expectedDescriptions[scopeNames[index]],
					);
				});
			});

			it("should generate generic description for unknown scopes", () => {
				const scopes = ScopeDisplayDTO.fromScopeNames([
					"unknown-scope",
					"custom:read",
				]);

				expect(scopes[0].name).toBe("unknown-scope");
				expect(scopes[0].description).toBe("Acceso al scope: unknown-scope");
				expect(scopes[1].name).toBe("custom:read");
				expect(scopes[1].description).toBe("Acceso al scope: custom:read");
			});

			it("should handle empty scope array", () => {
				const scopes = ScopeDisplayDTO.fromScopeNames([]);

				expect(scopes).toEqual([]);
			});

			it("should handle mixed known and unknown scopes", () => {
				const scopes = ScopeDisplayDTO.fromScopeNames([
					"read",
					"unknown",
					"write",
				]);

				expect(scopes).toHaveLength(3);
				expect(scopes[0].description).toBe(
					"Ver tu información de gastos, categorías y reportes",
				);
				expect(scopes[1].description).toBe("Acceso al scope: unknown");
				expect(scopes[2].description).toBe(
					"Crear, editar y eliminar gastos y categorías",
				);
			});
		});

		describe("toObject", () => {
			it("should convert ScopeDisplayDTO to plain object", () => {
				const scopes = ScopeDisplayDTO.fromScopeNames(["read"]);
				const obj = scopes[0].toObject();

				expect(obj).toEqual({
					name: "read",
					description: "Ver tu información de gastos, categorías y reportes",
				});
			});

			it("should return object with name and description properties", () => {
				const scopes = ScopeDisplayDTO.fromScopeNames(["admin"]);
				const obj = scopes[0].toObject();

				expect(obj).toHaveProperty("name");
				expect(obj).toHaveProperty("description");
				expect(typeof obj.name).toBe("string");
				expect(typeof obj.description).toBe("string");
			});
		});
	});

	describe("ConsentDecisionDTO", () => {
		const validBody = {
			decision: "approve",
			client_id: "test-client",
			redirect_uri: "https://example.com/callback",
			response_type: "code",
			code_challenge: "E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU",
			code_challenge_method: "S256",
			state: "xyz123",
			scope: "read write",
		};

		describe("fromBody", () => {
			it("should create ConsentDecisionDTO with valid body", () => {
				const dto = ConsentDecisionDTO.fromBody(validBody);

				expect(dto.decision).toBe("approve");
				expect(dto.clientId).toBe("test-client");
				expect(dto.redirectUri).toBe("https://example.com/callback");
				expect(dto.responseType).toBe("code");
				expect(dto.codeChallenge).toBe(
					"E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU",
				);
				expect(dto.codeChallengeMethod).toBe("S256");
				expect(dto.state).toBe("xyz123");
				expect(dto.scope).toBe("read write");
			});

			it("should accept deny decision", () => {
				const dto = ConsentDecisionDTO.fromBody({
					...validBody,
					decision: "deny",
				});

				expect(dto.decision).toBe("deny");
			});

			it("should throw ValidateRequestError for invalid decision", () => {
				expect(() =>
					ConsentDecisionDTO.fromBody({ ...validBody, decision: "invalid" }),
				).toThrow();
			});

			it("should handle optional state parameter", () => {
				const { state, ...bodyWithoutState } = validBody;
				const dto = ConsentDecisionDTO.fromBody(bodyWithoutState);

				expect(dto.state).toBeUndefined();
			});

			it("should handle optional scope parameter", () => {
				const { scope, ...bodyWithoutScope } = validBody;
				const dto = ConsentDecisionDTO.fromBody(bodyWithoutScope);

				expect(dto.scope).toBeUndefined();
			});

			it("should throw ValidateRequestError for missing required fields", () => {
				expect(() =>
					ConsentDecisionDTO.fromBody({ decision: "approve" }),
				).toThrow();
			});

			it("should support plain code challenge method", () => {
				const dto = ConsentDecisionDTO.fromBody({
					...validBody,
					code_challenge_method: "plain",
				});

				expect(dto.codeChallengeMethod).toBe("plain");
			});
		});

		describe("toCodeRequest", () => {
			it("should convert to CodeRequestDTO with all parameters", () => {
				const dto = ConsentDecisionDTO.fromBody(validBody);
				const codeRequest = dto.toCodeRequest();

				expect(codeRequest).toBeDefined();
			});

			it("should include optional state in code request", () => {
				const dto = ConsentDecisionDTO.fromBody(validBody);
				const codeRequest = dto.toCodeRequest();

				expect(codeRequest.state).toBe("xyz123");
			});

			it("should include optional scope in code request", () => {
				const dto = ConsentDecisionDTO.fromBody(validBody);
				const codeRequest = dto.toCodeRequest();

				expect(codeRequest.scope).toBe("read write");
			});

			it("should omit optional parameters when not present", () => {
				const { state, scope, ...bodyWithoutOptionals } = validBody;
				const dto = ConsentDecisionDTO.fromBody(bodyWithoutOptionals);
				const codeRequest = dto.toCodeRequest();

				expect(codeRequest.state).toBeUndefined();
				expect(codeRequest.scope).toBeUndefined();
			});

			it("should include required PKCE parameters", () => {
				const dto = ConsentDecisionDTO.fromBody(validBody);
				const codeRequest = dto.toCodeRequest();

				expect(codeRequest.clientId).toBe("test-client");
				expect(codeRequest.redirectUri).toBe("https://example.com/callback");
				expect(codeRequest.responseType).toBe("code");
				expect(codeRequest.codeChallenge).toBe(
					"E9Mrozoa2owUKYpOm9O0zFYwXoXQhf_vHg6eHVAITJU",
				);
				expect(codeRequest.codeChallengeMethod).toBe("S256");
			});
		});
	});

	describe("ListConsentsResponseDTO", () => {
		const mockConsentEntities = [
			{
				id: "consent-1",
				clientId: "client-1",
				scopes: ["read", "write"],
				grantedAt: new Date("2024-01-15T10:00:00Z"),
				expiresAt: new Date("2025-01-15T10:00:00Z"),
			},
			{
				id: "consent-2",
				clientId: "client-2",
				scopes: ["read"],
				grantedAt: new Date("2024-02-20T14:30:00Z"),
				expiresAt: null,
			},
		];

		const mockClientNames = new Map([
			["client-1", "My App"],
			["client-2", "Third Party Service"],
		]);

		describe("fromEntities", () => {
			it("should create ListConsentsResponseDTO from consent entities", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);

				expect(dto.consents).toHaveLength(2);
				expect(dto.consents[0].id).toBe("consent-1");
				expect(dto.consents[1].id).toBe("consent-2");
			});

			it("should map client names from provided map", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);

				expect(dto.consents[0].clientName).toBe("My App");
				expect(dto.consents[1].clientName).toBe("Third Party Service");
			});

			it("should use Unknown Application for unmapped client IDs", () => {
				const emptyClientNames = new Map<string, string>();
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					emptyClientNames,
				);

				expect(dto.consents[0].clientName).toBe("Unknown Application");
				expect(dto.consents[1].clientName).toBe("Unknown Application");
			});

			it("should preserve consent data structure", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);

				expect(dto.consents[0]).toEqual({
					id: "consent-1",
					clientId: "client-1",
					clientName: "My App",
					scopes: ["read", "write"],
					grantedAt: mockConsentEntities[0].grantedAt,
					expiresAt: mockConsentEntities[0].expiresAt,
				});
			});

			it("should handle empty consent entities array", () => {
				const dto = ListConsentsResponseDTO.fromEntities([], mockClientNames);

				expect(dto.consents).toEqual([]);
			});
		});

		describe("toJSON", () => {
			it("should convert dates to ISO string format", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);
				const json = dto.toJSON();

				expect(json.consents[0].grantedAt).toBe("2024-01-15T10:00:00.000Z");
				expect(json.consents[0].expiresAt).toBe("2025-01-15T10:00:00.000Z");
			});

			it("should convert null expiresAt to null", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);
				const json = dto.toJSON();

				expect(json.consents[1].expiresAt).toBeNull();
			});

			it("should include all consent properties in JSON output", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);
				const json = dto.toJSON();

				expect(json.consents[0]).toHaveProperty("id");
				expect(json.consents[0]).toHaveProperty("clientId");
				expect(json.consents[0]).toHaveProperty("clientName");
				expect(json.consents[0]).toHaveProperty("scopes");
				expect(json.consents[0]).toHaveProperty("grantedAt");
				expect(json.consents[0]).toHaveProperty("expiresAt");
			});

			it("should preserve scopes array in JSON output", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);
				const json = dto.toJSON();

				expect(json.consents[0].scopes).toEqual(["read", "write"]);
				expect(json.consents[1].scopes).toEqual(["read"]);
			});

			it("should return object with consents array", () => {
				const dto = ListConsentsResponseDTO.fromEntities(
					mockConsentEntities as any,
					mockClientNames,
				);
				const json = dto.toJSON();

				expect(json).toHaveProperty("consents");
				expect(Array.isArray(json.consents)).toBe(true);
			});
		});
	});
});
