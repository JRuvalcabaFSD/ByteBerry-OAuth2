import { ValidateClientRequestDto, ValidateClientResponseDto } from '@application';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		ValidateClientUseCase: IValidateClientUseCase;
	}
}

/**
 * Use case interface for validating OAuth2 client credentials.
 *
 * @interface IValidateClientUseCase
 *
 * @remarks
 * This interface defines the contract for validating client credentials
 * in an OAuth2 authentication flow. Implementations should verify the
 * client's identity and authorization.
 *
 * @method execute - Validates the client credentials
 * @param {ValidateClientRequestDto} data - The data required for client validation
 * @returns {Promise<ValidateClientResponseDto>} - A promise that resolves to the validation result
 *
 * @example
 * ```typescript
 * class ValidateClientUseCase implements IValidateClientUseCase {
 *   async execute(data: ValidateClientRequestDto): Promise<ValidateClientResponseDto> {
 *     // Validation logic here
 *   }
 * }
 * ```
 */

export interface IValidateClientUseCase {
	execute(data: ValidateClientRequestDto): Promise<ValidateClientResponseDto>;
}
