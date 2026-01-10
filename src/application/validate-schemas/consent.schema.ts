import z, { object, string, url, ZodType } from 'zod';

import { requiredString } from './helpers.js';

/**
 * Represents the data required for processing a user's consent decision in an OAuth 2.0 authorization flow.
 *
 * @interface ConsentDecisionData
 * @property {('approve' | 'deny')} decision - The user's consent decision: approve or deny the authorization request.
 * @property {string} clientId - The unique identifier of the OAuth 2.0 client application.
 * @property {string} redirectUri - The URI where the authorization server will redirect the user after processing the consent.
 * @property {string} responseType - The OAuth 2.0 response type (e.g., 'code', 'token').
 * @property {string} codeChallenge - The code challenge string used in PKCE (Proof Key for Code Exchange) flow.
 * @property {('S256' | 'plain')} codeChallengeMethod - The method used to generate the code challenge: S256 (SHA-256) or plain.
 * @property {string} [state] - Optional opaque state value to maintain state between the request and callback.
 * @property {string} [scope] - Optional space-delimited list of scopes being requested by the client.
 */

export interface ConsentDecisionData {
	decision: 'approve' | 'deny';
	clientId: string;
	redirectUri: string;
	responseType: string;
	codeChallenge: string;
	codeChallengeMethod: 'S256' | 'plain';
	state?: string;
	scope?: string;
}

/**
 * Schema for validating consent decision data in OAuth2 authorization flow.
 *
 * @typedef {Object} ConsentDecisionData
 * @property {('approve'|'deny')} decision - The user's consent decision (required)
 * @property {string} clientId - The OAuth2 client identifier (required)
 * @property {string} redirectUri - The redirect URI where the authorization response will be sent. Must be a valid URL (required)
 * @property {string} responseType - The response type for the authorization request (required)
 * @property {string} codeChallenge - Base64url encoded code challenge. Must be exactly 43 characters and contain only alphanumeric characters, hyphens, and underscores (required)
 * @property {('S256'|'plain')} codeChallengeMethod - The code challenge method used for PKCE (required)
 * @property {string} [state] - Optional state parameter for maintaining state between request and callback. Maximum 500 characters
 * @property {string} [scope] - Optional requested scopes for the authorization
 *
 * @example
 * const validData = {
 *   decision: 'approve',
 *   clientId: 'client123',
 *   redirectUri: 'https://example.com/callback',
 *   responseType: 'code',
 *   codeChallenge: 'E9Mrozoa2owUaunTPUJAstGoFYzLHUVVQwuoM6GFERQ',
 *   codeChallengeMethod: 'S256',
 *   state: 'random_state_value',
 *   scope: 'openid profile email'
 * };
 */

export const ConsentDecisionSchema: ZodType<ConsentDecisionData> = object({
	decision: requiredString('Decision').pipe(z.enum(['approve', 'deny'], 'Invalid Decision, Valid types: approve or deny')),
	client_id: requiredString('Client ID'),
	redirect_uri: requiredString('Redirect URI').pipe(url('Redirect URI must be a valid URL')),
	response_type: requiredString('Response type'),
	code_challenge: requiredString('Code challenge')
		.length(43, 'Code challenge must be 43 characters')
		.regex(/^[A-Za-z0-9_-]+$/, 'Code Challenge must be pure base64url encoded'),
	code_challenge_method: requiredString('Code challenge method').pipe(
		z.enum(['S256', 'plain'], 'Invalid Code challenge method, Valid types: S256 or plain')
	),
	state: string().max(500, 'state must be less than 500 characters').optional(),
	scope: string().optional(),
}).transform((data) => ({
	decision: data.decision,
	clientId: data.client_id,
	redirectUri: data.redirect_uri,
	responseType: data.response_type,
	codeChallenge: data.code_challenge,
	codeChallengeMethod: data.code_challenge_method,
	state: data.state,
	scope: data.scope,
}));
