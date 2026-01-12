/**
 * Data transfer object for validating OAuth2 client credentials.
 *
 * @remarks
 * This interface defines the structure for client validation requests in the OAuth2 flow.
 * It includes the required client identifier and optional parameters for redirect URI
 * and grant type validation.
 *
 * @property clientId - The unique identifier of the OAuth2 client application
 * @property redirectUri - Optional. The URI to redirect to after authorization
 * @property grandType - Optional. The OAuth2 grant type being requested (note: likely should be "grantType")
 */

export interface ValidateClientRequestDto {
	clientId: string;
	redirectUri: string;
	grantType: string;
}

/**
 * Data Transfer Object representing the response when validating an OAuth2 client.
 *
 * @interface ValidateClientResponseDto
 * @property {string} clientId - The unique identifier of the OAuth2 client
 * @property {string} clientName - The human-readable name of the client application
 * @property {boolean} isPublic - Indicates whether the client is a public client (true) or confidential client (false)
 * @property {string[]} redirectUris - Array of authorized redirect URIs for the OAuth2 authorization flow
 * @property {string[]} grantTypes - Array of OAuth2 grant types supported by this client (e.g., 'authorization_code', 'client_credentials')
 */

export interface ValidateClientResponseDto {
	clientId: string;
	clientName: string;
	isPublic: boolean;
	redirectUris: string[];
	grantTypes: string[];
}
