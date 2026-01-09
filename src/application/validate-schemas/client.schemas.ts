import { object, ZodType } from 'zod';
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

export const CreateClientSchema: ZodType<CreateClientData> = object({
	clientName: requiredString('Client name').pipe(maxMinString({ field: 'Client name', min: 3, max: 30 })),
	redirectUris: urlsArray('redirectUris'),
	grantTypes: grantTypesArray('Grand types').optional(),
	isPublic: booleanString('isPublic').optional(),
}).transform((data) => ({
	clientName: data.clientName,
	redirectUris: data.redirectUris,
	grantTypes: data.grantTypes,
	isPublic: data.isPublic ?? true,
}));
