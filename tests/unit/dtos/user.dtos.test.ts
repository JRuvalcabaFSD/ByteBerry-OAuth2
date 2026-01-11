import {
	RegisterUserRequestDTO,
	RegisterUserResponseDTO,
	UpdatePasswordRequestDTO,
	UpdatePasswordResponseDTO,
	UpdateUserRequestDTO,
	UpdateUserResponseDTO,
	UserResponseDTO,
} from "@application";
import { UserEntity } from "@domain";

describe("user Dto's", () => {
	describe("UserResponseDTO", () => {
		let mockUserEntity: UserEntity;
		const now = new Date("2024-01-15T10:30:00Z");

		beforeEach(() => {
			mockUserEntity = {
				id: "user-123",
				email: "user@example.com",
				username: "johndoe",
				fullName: "John Doe",
				roles: ["user"],
				isActive: true,
				emailVerified: true,
				createdAt: now,
				updatedAt: now,
				toPublic: vi.fn().mockReturnValue({
					id: "user-123",
					email: "user@example.com",
					username: "johndoe",
					fullName: "John Doe",
					roles: ["user"],
					isActive: true,
					emailVerified: true,
				}),
			} as unknown as UserEntity;
		});

		describe("fromEntity", () => {
			it("should create a UserResponseDTO from a UserEntity", () => {
				const dto = UserResponseDTO.fromEntity(mockUserEntity);

				expect(dto.user).toBeDefined();
				expect(dto.user.id).toBe("user-123");
				expect(dto.user.email).toBe("user@example.com");
			});

			it("should include createdAt and updatedAt from the entity", () => {
				const dto = UserResponseDTO.fromEntity(mockUserEntity);

				expect(dto.user.createdAt).toEqual(now);
				expect(dto.user.updatedAt).toEqual(now);
			});

			it("should call toPublic on the user entity", () => {
				UserResponseDTO.fromEntity(mockUserEntity);

				expect(mockUserEntity.toPublic).toHaveBeenCalled();
			});

			it("should include all user properties in the DTO", () => {
				const dto = UserResponseDTO.fromEntity(mockUserEntity);

				expect(dto.user).toMatchObject({
					id: "user-123",
					email: "user@example.com",
					username: "johndoe",
					fullName: "John Doe",
					roles: ["user"],
					isActive: true,
					emailVerified: true,
				});
			});
		});

		describe("toJSON", () => {
			it("should convert createdAt to ISO string format", () => {
				const dto = UserResponseDTO.fromEntity(mockUserEntity);
				const json = dto.toJSON();

				expect(json.user.createdAt).toBe("2024-01-15T10:30:00.000Z");
				expect(typeof json.user.createdAt).toBe("string");
			});

			it("should preserve all other user properties", () => {
				const dto = UserResponseDTO.fromEntity(mockUserEntity);
				const json = dto.toJSON();

				expect(json.user.id).toBe("user-123");
				expect(json.user.email).toBe("user@example.com");
				expect(json.user.username).toBe("johndoe");
				expect(json.user.fullName).toBe("John Doe");
				expect(json.user.roles).toEqual(["user"]);
				expect(json.user.isActive).toBe(true);
				expect(json.user.emailVerified).toBe(true);
			});

			it("should return a JSON-serializable object", () => {
				const dto = UserResponseDTO.fromEntity(mockUserEntity);
				const json = dto.toJSON();

				expect(() => JSON.stringify(json)).not.toThrow();
			});

			it("should not mutate the original user data", () => {
				const dto = UserResponseDTO.fromEntity(mockUserEntity);
				dto.toJSON();

				expect(dto.user.createdAt).toEqual(now);
				expect(dto.user.createdAt instanceof Date).toBe(true);
			});
		});
	});

	describe("RegisterUserRequestDTO", () => {
		describe("fromBody", () => {
			it("should create a RegisterUserRequestDTO with valid data", () => {
				const body = {
					email: "user@example.com",
					username: "johndoe",
					password: "SecurePass123!",
					fullName: "John Doe",
				};

				const dto = RegisterUserRequestDTO.fromBody(body);

				expect(dto.email).toBe("user@example.com");
				expect(dto.username).toBe("johndoe");
				expect(dto.password).toBe("SecurePass123!");
				expect(dto.fullName).toBe("John Doe");
			});

			it("should include ipAddress when provided", () => {
				const body = {
					email: "user@example.com",
					username: "johndoe",
					password: "SecurePass123!",
				};

				const dto = RegisterUserRequestDTO.fromBody(body, "192.168.1.1");

				expect(dto.ipAddress).toBe("192.168.1.1");
			});

			it("should throw ValidateRequestError when email is missing", () => {
				const body = {
					username: "johndoe",
					password: "SecurePass123!",
				};

				expect(() => RegisterUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when password is missing", () => {
				const body = {
					email: "user@example.com",
					username: "johndoe",
				};

				expect(() => RegisterUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should allow username to be optional", () => {
				const body = {
					email: "user@example.com",
					password: "SecurePass123!",
				};

				const dto = RegisterUserRequestDTO.fromBody(body);

				expect(dto.username).toBeUndefined();
			});

			it("should throw ValidateRequestError with invalid email format", () => {
				const body = {
					email: "invalid-email",
					username: "johndoe",
					password: "SecurePass123!",
				};

				expect(() => RegisterUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should allow fullName to be optional", () => {
				const body = {
					email: "user@example.com",
					username: "johndoe",
					password: "SecurePass123!",
				};

				const dto = RegisterUserRequestDTO.fromBody(body);

				expect(dto.fullName).toBeUndefined();
			});

			it("should throw ValidateRequestError with username too short", () => {
				const body = {
					email: "user@example.com",
					username: "ab",
					password: "SecurePass123!",
				};

				expect(() => RegisterUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when password is too weak", () => {
				const body = {
					email: "user@example.com",
					username: "johndoe",
					password: "weak",
				};

				expect(() => RegisterUserRequestDTO.fromBody(body)).toThrow();
			});
		});
		describe("RegisterUserResponseDTO", () => {
			let mockUserEntity: UserEntity;
			const now = new Date("2024-01-15T10:30:00Z");

			beforeEach(() => {
				mockUserEntity = {
					id: "user-123",
					email: "user@example.com",
					username: "johndoe",
					fullName: "John Doe",
					roles: ["user"],
					isActive: true,
					emailVerified: true,
					createdAt: now,
					updatedAt: now,
					toPublic: vi.fn().mockReturnValue({
						id: "user-123",
						email: "user@example.com",
						username: "johndoe",
						fullName: "John Doe",
						roles: ["user"],
						isActive: true,
						emailVerified: true,
					}),
				} as unknown as UserEntity;
			});

			describe("fromEntity", () => {
				it("should create a RegisterUserResponseDTO from a UserEntity", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);

					expect(dto.user).toBeDefined();
					expect(dto.user.id).toBe("user-123");
					expect(dto.user.email).toBe("user@example.com");
				});

				it("should include the default success message", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);

					expect(dto.message).toBe("User registered successfully");
				});

				it("should include createdAt and updatedAt from the entity", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);

					expect(dto.user.createdAt).toEqual(now);
					expect(dto.user.updatedAt).toEqual(now);
				});

				it("should call toPublic on the user entity", () => {
					RegisterUserResponseDTO.fromEntity(mockUserEntity);

					expect(mockUserEntity.toPublic).toHaveBeenCalled();
				});

				it("should include all user properties in the DTO", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);

					expect(dto.user).toMatchObject({
						id: "user-123",
						email: "user@example.com",
						username: "johndoe",
						fullName: "John Doe",
						roles: ["user"],
						isActive: true,
						emailVerified: true,
					});
				});
			});

			describe("toJSON", () => {
				it("should convert createdAt to ISO string format", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);
					const json = dto.toJSON();

					expect(json.user.createdAt).toBe("2024-01-15T10:30:00.000Z");
					expect(typeof json.user.createdAt).toBe("string");
				});

				it("should include the message in JSON output", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);
					const json = dto.toJSON();

					expect(json.message).toBe("User registered successfully");
				});

				it("should preserve all user properties in JSON output", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);
					const json = dto.toJSON();

					expect(json.user.id).toBe("user-123");
					expect(json.user.email).toBe("user@example.com");
					expect(json.user.username).toBe("johndoe");
					expect(json.user.fullName).toBe("John Doe");
					expect(json.user.roles).toEqual(["user"]);
					expect(json.user.isActive).toBe(true);
					expect(json.user.emailVerified).toBe(true);
				});

				it("should return a JSON-serializable object", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);
					const json = dto.toJSON();

					expect(() => JSON.stringify(json)).not.toThrow();
				});

				it("should not mutate the original user data", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);
					dto.toJSON();

					expect(dto.user.createdAt).toEqual(now);
					expect(dto.user.createdAt instanceof Date).toBe(true);
				});

				it("should keep updatedAt as a Date in the DTO", () => {
					const dto = RegisterUserResponseDTO.fromEntity(mockUserEntity);

					expect(dto.user.updatedAt instanceof Date).toBe(true);
				});
			});
		});
	});
	describe("UpdateUserRequestDTO", () => {
		describe("fromBody", () => {
			it("should create an UpdateUserRequestDTO with valid fullName", () => {
				const body = {
					fullName: "Jane Doe",
				};

				const dto = UpdateUserRequestDTO.fromBody(body);

				expect(dto.fullName).toBe("Jane Doe");
			});

			it("should create an UpdateUserRequestDTO with valid username", () => {
				const body = {
					username: "janedoe",
				};

				const dto = UpdateUserRequestDTO.fromBody(body);

				expect(dto.username).toBe("janedoe");
			});

			it("should create an UpdateUserRequestDTO with both fullName and username", () => {
				const body = {
					fullName: "Jane Doe",
					username: "janedoe",
				};

				const dto = UpdateUserRequestDTO.fromBody(body);

				expect(dto.fullName).toBe("Jane Doe");
				expect(dto.username).toBe("janedoe");
			});

			it("should throw ValidateRequestError with empty body", () => {
				const body = {};

				expect(() => UpdateUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should allow fullName to be null", () => {
				const body = {
					fullName: null as any,
				};

				const dto = UpdateUserRequestDTO.fromBody(body);

				expect(dto.fullName).toBeNull();
			});

			it("should throw ValidateRequestError when username is null", () => {
				const body = {
					username: null as any,
				};

				expect(() => UpdateUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when fullName is too long", () => {
				const body = {
					fullName: "a".repeat(101),
				};

				expect(() => UpdateUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when username is too short", () => {
				const body = {
					username: "ab",
				};

				expect(() => UpdateUserRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when username is empty", () => {
				const body = {
					username: "",
				};

				expect(() => UpdateUserRequestDTO.fromBody(body)).toThrow();
			});
		});
	});

	describe("UpdateUserResponseDTO", () => {
		let mockUserEntity: UserEntity;
		const now = new Date("2024-01-15T10:30:00Z");

		beforeEach(() => {
			mockUserEntity = {
				id: "user-123",
				email: "user@example.com",
				username: "johndoe",
				fullName: "John Doe",
				roles: ["user"],
				isActive: true,
				emailVerified: true,
				createdAt: now,
				updatedAt: now,
				toPublic: vi.fn().mockReturnValue({
					id: "user-123",
					email: "user@example.com",
					username: "johndoe",
					fullName: "John Doe",
					roles: ["user"],
					isActive: true,
					emailVerified: true,
				}),
			} as unknown as UserEntity;
		});

		describe("fromEntity", () => {
			it("should create an UpdateUserResponseDTO from a UserEntity", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);

				expect(dto.user).toBeDefined();
				expect(dto.user.id).toBe("user-123");
				expect(dto.user.email).toBe("user@example.com");
			});

			it("should include createdAt and updatedAt from the entity", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);

				expect(dto.user.createdAt).toEqual(now);
				expect(dto.user.updatedAt).toEqual(now);
			});

			it("should call toPublic on the user entity", () => {
				UpdateUserResponseDTO.fromEntity(mockUserEntity);

				expect(mockUserEntity.toPublic).toHaveBeenCalled();
			});

			it("should include all user properties in the DTO", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);

				expect(dto.user).toMatchObject({
					id: "user-123",
					email: "user@example.com",
					username: "johndoe",
					fullName: "John Doe",
					roles: ["user"],
					isActive: true,
					emailVerified: true,
				});
			});
		});

		describe("toJSON", () => {
			it("should convert createdAt to ISO string format", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);
				const json = dto.toJSON();

				expect(json.user.createdAt).toBe("2024-01-15T10:30:00.000Z");
				expect(typeof json.user.createdAt).toBe("string");
			});

			it("should convert updatedAt to ISO string format", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);
				const json = dto.toJSON();

				expect(json.user.updatedAt).toBe("2024-01-15T10:30:00.000Z");
				expect(typeof json.user.updatedAt).toBe("string");
			});

			it("should preserve all user properties in JSON output", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);
				const json = dto.toJSON();

				expect(json.user.id).toBe("user-123");
				expect(json.user.email).toBe("user@example.com");
				expect(json.user.username).toBe("johndoe");
				expect(json.user.fullName).toBe("John Doe");
				expect(json.user.roles).toEqual(["user"]);
				expect(json.user.isActive).toBe(true);
				expect(json.user.emailVerified).toBe(true);
			});

			it("should return a JSON-serializable object", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);
				const json = dto.toJSON();

				expect(() => JSON.stringify(json)).not.toThrow();
			});

			it("should not mutate the original user data", () => {
				const dto = UpdateUserResponseDTO.fromEntity(mockUserEntity);
				dto.toJSON();

				expect(dto.user.createdAt).toEqual(now);
				expect(dto.user.createdAt instanceof Date).toBe(true);
				expect(dto.user.updatedAt).toEqual(now);
				expect(dto.user.updatedAt instanceof Date).toBe(true);
			});
		});
	});
	describe("UpdatePasswordRequestDTO", () => {
		describe("fromBody", () => {
			it("should create an UpdatePasswordRequestDTO with valid data", () => {
				const body = {
					currentPassword: "OldPassword123!",
					newPassword: "NewPassword456!",
				};

				const dto = UpdatePasswordRequestDTO.fromBody(body);

				expect(dto.currentPassword).toBe("OldPassword123!");
				expect(dto.newPassword).toBe("NewPassword456!");
			});

			it("should include revokeAllSessions when provided", () => {
				const body = {
					currentPassword: "OldPassword123!",
					newPassword: "NewPassword456!",
					revokeAllSessions: "true",
				};

				const dto = UpdatePasswordRequestDTO.fromBody(body);

				expect(dto.revokeAllSessions).toBeDefined();
			});

			it("should throw ValidateRequestError when currentPassword is missing", () => {
				const body = {
					newPassword: "NewPassword456!",
				};

				expect(() => UpdatePasswordRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when newPassword is missing", () => {
				const body = {
					currentPassword: "OldPassword123!",
				};

				expect(() => UpdatePasswordRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when currentPassword is empty", () => {
				const body = {
					currentPassword: "",
					newPassword: "NewPassword456!",
				};

				expect(() => UpdatePasswordRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when newPassword is too weak", () => {
				const body = {
					currentPassword: "OldPassword123!",
					newPassword: "weak",
				};

				expect(() => UpdatePasswordRequestDTO.fromBody(body)).toThrow();
			});

			it("should allow revokeAllSessions to be optional", () => {
				const body = {
					currentPassword: "OldPassword123!",
					newPassword: "NewPassword456!",
				};

				const dto = UpdatePasswordRequestDTO.fromBody(body);

				expect(dto.revokeAllSessions).toBeUndefined();
			});

			it("should throw ValidateRequestError when currentPassword is empty", () => {
				const body = {
					currentPassword: "",
					newPassword: "NewPassword456!",
				};

				expect(() => UpdatePasswordRequestDTO.fromBody(body)).toThrow();
			});

			it("should throw ValidateRequestError when newPassword is empty", () => {
				const body = {
					currentPassword: "OldPassword123!",
					newPassword: "",
				};

				expect(() => UpdatePasswordRequestDTO.fromBody(body)).toThrow();
			});
		});
	});
	describe("UpdatePasswordResponseDTO", () => {
		describe("success", () => {
			it("should create an UpdatePasswordResponseDTO with default success message", () => {
				const dto = UpdatePasswordResponseDTO.success();

				expect(dto.message).toBe("Password updated successfully");
			});

			it("should create an UpdatePasswordResponseDTO with sessionRevoked set to true", () => {
				const dto = UpdatePasswordResponseDTO.success(true);

				expect(dto.message).toBe("Password updated successfully");
				expect(dto.sessionRevoked).toBe(true);
			});

			it("should create an UpdatePasswordResponseDTO with sessionRevoked set to false", () => {
				const dto = UpdatePasswordResponseDTO.success(false);

				expect(dto.message).toBe("Password updated successfully");
				expect(dto.sessionRevoked).toBe(false);
			});

			it("should have sessionRevoked as undefined when not provided", () => {
				const dto = UpdatePasswordResponseDTO.success();

				expect(dto.sessionRevoked).toBeUndefined();
			});
		});

		describe("toJSON", () => {
			it("should return an object with message property", () => {
				const dto = UpdatePasswordResponseDTO.success();
				const json = dto.toJSON();

				expect(json.message).toBe("Password updated successfully");
			});

			it("should include sessionRevoked when it is true", () => {
				const dto = UpdatePasswordResponseDTO.success(true);
				const json = dto.toJSON();

				expect(json.sessionRevoked).toBe(true);
				expect("sessionRevoked" in json).toBe(true);
			});

			it("should include sessionRevoked when it is false", () => {
				const dto = UpdatePasswordResponseDTO.success(false);
				const json = dto.toJSON();

				expect(json.sessionRevoked).toBe(false);
				expect("sessionRevoked" in json).toBe(true);
			});

			it("should not include sessionRevoked when it is undefined", () => {
				const dto = UpdatePasswordResponseDTO.success();
				const json = dto.toJSON();

				expect("sessionRevoked" in json).toBe(false);
			});

			it("should return a JSON-serializable object", () => {
				const dto = UpdatePasswordResponseDTO.success(true);
				const json = dto.toJSON();

				expect(() => JSON.stringify(json)).not.toThrow();
			});

			it("should produce correct JSON string with sessionRevoked true", () => {
				const dto = UpdatePasswordResponseDTO.success(true);
				const json = dto.toJSON();
				const jsonString = JSON.stringify(json);

				expect(jsonString).toBe(
					'{"message":"Password updated successfully","sessionRevoked":true}',
				);
			});

			it("should produce correct JSON string without sessionRevoked", () => {
				const dto = UpdatePasswordResponseDTO.success();
				const json = dto.toJSON();
				const jsonString = JSON.stringify(json);

				expect(jsonString).toBe('{"message":"Password updated successfully"}');
			});
		});
	});
});
