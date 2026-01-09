import * as Dtos from '@application';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		RegisterUserUseCase: IRegisterUserUseCase;
		GetUserUseCase: IGetUserUseCase;
		UpdateUserUseCase: IUpdateUserUseCase;
		UpdatePasswordUseCase: IUpdatePasswordUseCase;
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
