import * as Dtos from '@application';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		RegisterUserUseCase: IRegisterUserUseCase;
		GetUserUseCase: IGetUserUseCase;
		UpdateUserUseCase: IUpdateUserUseCase;
		UpdatePasswordUseCase: IUpdatePasswordUseCase;
		DeleteConsentUseCase: IDeleteConsentUseCase;
		UpgradeToDeveloperUseCase: IUpgradeToDeveloperUseCase;
		EnableExpensesUseCase: IEnableExpensesUseCase;
	}
}

/**
 * Use case interface for user registration.
 * Handles the execution of user registration logic and returns the registration response.
 *
 * @interface IRegisterUserUseCase
 *
 * @example
 * ```typescript
 * const registerUserUseCase: IRegisterUserUseCase = {
 *   execute: async (request) => {
 *     // registration logic
 *     return response;
 *   }
 * };
 * ```
 */

export interface IRegisterUserUseCase {
	execute(request: Dtos.RegisterUserRequestDTO): Promise<Dtos.RegisterUserResponseDTO>;
}

/**
 * Use case interface for retrieving a user by their ID.
 * @interface IGetUserUseCase
 * @method execute - Fetches a user's information by ID and returns it as a DTO.
 * @param userId - The unique identifier of the user to retrieve.
 * @returns A promise that resolves to a UserResponseDTO containing the user's data.
 */

export interface IGetUserUseCase {
	execute(userId: string): Promise<Dtos.UserResponseDTO>;
}

/**
 * Interface for the use case responsible for updating a user's information.
 *
 * @remarks
 * Implementations of this interface should handle the business logic required to update
 * user details based on the provided request data.
 *
 * @method execute
 * @param serId - The unique identifier of the user to be updated.
 * @param request - The data transfer object containing the updated user information.
 * @returns A promise that resolves to a response DTO containing the result of the update operation.
 */

export interface IUpdateUserUseCase {
	execute(userId: string, request: Dtos.UpdateUserRequestDTO): Promise<Dtos.UpdateUserResponseDTO>;
}

/**
 * Use case interface for updating a user's password.
 *
 * @remarks
 * This interface defines the contract for updating a user's password,
 * typically implemented in the application's domain layer.
 *
 * @method execute
 * @param userId - The unique identifier of the user whose password is to be updated.
 * @param request - The data transfer object containing the new password and any additional required information.
 * @returns A promise that resolves to an UpdatePasswordResponseDTO, indicating the result of the password update operation.
 */

export interface IUpdatePasswordUseCase {
	execute(userId: string, request: Dtos.UpdatePasswordRequestDTO): Promise<Dtos.UpdatePasswordResponseDTO>;
}

/**
 * Use case interface for deleting a user's consent.
 *
 * @interface IDeleteConsentUseCase
 * @method execute - Deletes a specific consent record for a user
 * @param {string} userId - The unique identifier of the user
 * @param {string} consentId - The unique identifier of the consent to be deleted
 * @returns {Promise<void>} A promise that resolves when the consent has been successfully deleted
 * @throws {Error} May throw an error if the user or consent is not found, or if the deletion fails
 */

export interface IDeleteConsentUseCase {
	execute(userId: string, consentId: string): Promise<void>;
}

/**
 * Use case interface for upgrading a user to developer status.
 *
 * @remarks
 * Implementations of this interface should handle the logic required to upgrade
 * a user, identified by their unique ID, to a developer role or status within the system.
 *
 * @method execute
 * @param userId - The unique identifier of the user to be upgraded.
 * @returns A promise that resolves to a {@link Dtos.UserResponseDTO} containing the updated user information.
 */

export interface IUpgradeToDeveloperUseCase {
	execute(userId: string): Promise<Dtos.UserResponseDTO>;
}

/**
 * Use case interface for enabling expenses for a user.
 *
 * @remarks
 * This interface defines the contract for enabling expenses functionality,
 * typically used to allow a user to start tracking or managing expenses within the system.
 *
 * @method execute
 * @param userId - The unique identifier of the user for whom expenses are to be enabled.
 * @returns A promise that resolves to a {@link Dtos.UserResponseDTO} containing the updated user information.
 */

export interface IEnableExpensesUseCase {
	execute(userId: string): Promise<Dtos.UserResponseDTO>;
}
