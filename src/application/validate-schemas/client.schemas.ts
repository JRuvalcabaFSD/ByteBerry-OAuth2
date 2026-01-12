import z from 'zod';
import { requiredString, maxMinString, urlsArray, grantTypesArray, booleanString } from './helpers.js';
/**
 * Represents the data required to create a new OAuth client.
 *
 * @property clientName - The name of the OAuth client.
 * @property redirectUris - An array of allowed redirect URIs for the client.
 * @property grantTypes - (Optional) An array of OAuth grant types supported by the client.
 * @property isPublic - (Optional) Indicates if the client is public (does not require a client secret).
 */

export interface CreateClientData {
	clientName: string;
	redirectUris: string[];
	grantTypes?: string[];
	isPublic?: boolean;
}

/**
 * Data structure for updating an OAuth client.
 * @typedef {Object} UpdateOauthClientData
 * @property {string} [clientName] - The new name of the OAuth client.
 * @property {string[]} [redirectUris] - Array of redirect URIs allowed for the OAuth client.
 * @property {string[]} [grantTypes] - Array of grant types supported by the OAuth client.
 * @property {boolean} [isPublic] - Indicates whether the OAuth client is public or confidential.
 */

export interface UpdateClientData {
	clientName?: string;
	redirectUris?: string[];
	grantTypes?: string[];
	isPublic?: boolean;
}

/**
 * Zod schema for validating OAuth2 client creation data.
 *
 * @schema
 * - `clientName` - Required string between 3-30 characters representing the client application name
 * - `redirectUris` - Required array of valid URLs where the client can redirect after authentication
 * - `grantTypes` - Optional array of OAuth2 grant types supported by the client
 * - `isPublic` - Optional boolean flag indicating if the client is public (defaults to true)
 *
 * @returns {CreateClientData} Validated and transformed client creation data with normalized grant types and default isPublic value
 */

export const CreateClientSchema: z.ZodType<CreateClientData> = z
	.object({
		clientName: requiredString('Client name').pipe(maxMinString({ field: 'Client name', min: 3, max: 30 })),
		redirectUris: urlsArray('redirectUris'),
		grantTypes: grantTypesArray('Grand types').optional(),
		isPublic: booleanString('isPublic').optional(),
	})
	.transform((data) => ({
		clientName: data.clientName,
		redirectUris: data.redirectUris,
		grantTypes: data.grantTypes,
		isPublic: data.isPublic ?? true,
	}));

/**
 * Zod schema for validating client update requests.
 *
 * Validates the following fields:
 * - `clientName` - Optional. A trimmed string between 3-30 characters
 * - `redirectUris` - Optional. An array of valid URLs
 * - `grantTypes` - Optional. An array of valid grant types
 * - `isPublic` - Optional. A boolean value passed as a string
 *
 * @remarks
 * At least one field must be provided for the update request to be valid.
 * If `clientName` is provided, it cannot be empty or null.
 *
 * @throws {ZodError} When validation fails, including when:
 * - No fields are provided
 * - `clientName` is empty or null when provided
 * - Any field fails its respective validation rules
 */

export const UpdateClientSchema: z.ZodType<UpdateClientData> = z
	.object({
		clientName: z
			.string()
			.trim()
			.pipe(maxMinString({ field: 'Client name', min: 3, max: 30 }))
			.optional(),
		redirectUris: urlsArray('redirectUris').optional(),
		grantTypes: grantTypesArray('Grand types').optional(),
		isPublic: booleanString('isPublic').optional(),
	})
	.superRefine((data, ctx) => {
		const hasClientName = data.clientName !== undefined;

		if (!hasClientName) {
			ctx.addIssue({
				code: 'custom',
				message: 'At least clientName must be provided',
			});
		}

		if (hasClientName && (data.clientName === null || data.clientName === '')) {
			ctx.addIssue({
				code: 'custom',
				message: 'Client name cannot be empty or null',
				path: ['clientName'],
			});
		}
	});

/**
 * Represents the inferred type from the UpdateClientSchema Zod validator.
 * This type ensures type-safe validation and serialization of client update payloads
 * by extracting the TypeScript type definition from the corresponding Zod schema.
 */

export type UpdateClientSchema = z.infer<typeof UpdateClientSchema>;
