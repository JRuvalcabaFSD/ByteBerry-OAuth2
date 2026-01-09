import z, { array, boolean, flattenError, preprocess, string, url, ZodError } from 'zod';
import { ErrorList } from '@shared';
/**
 * List of supported OAuth 2.0 grant types for client validation.
 *
 * - `authorization_code`: Used for the Authorization Code Grant flow.
 * - `refresh_token`: Used to obtain new access tokens using a refresh token.
 */
const VALID_GRANT_TYPES = ['authorization_code', 'refresh_token'];

export function formattedZodError(error: ZodError, format: 'text'): { msg: string };
export function formattedZodError(error: ZodError, format: 'form'): { msg: string; errors: ErrorList[] };
export function formattedZodError(error: ZodError, format: 'form' | 'text'): { msg: string } | { msg: string; errors: ErrorList[] } {
	if (format === 'text') {
		const { fieldErrors } = flattenError(error);
		const todosMensajes = Object.values(fieldErrors).flat();
		return { msg: (todosMensajes[0] as string) ?? 'Error de validación' };
	}

	// Rama "form": lista detallada de errores por campo
	const errorList = error.issues.reduce<ErrorList[]>((acc, issue) => {
		const field = issue.path.join('.') || 'general';
		const msg = issue.message;

		const found = acc.find((e) => e.field === field);
		if (found) {
			if (Array.isArray(found.msg)) {
				found.msg.push(msg);
			} else {
				found.msg = [found.msg, msg];
			}
		} else {
			acc.push({ field, msg });
		}
		return acc;
	}, []);

	return { msg: 'Validation error', errors: errorList };
}

export const requiredString = (campo: string) => {
	return string(`${campo} is required`).trim().min(1, `${campo} cannot be empty`);
};

export const maxMinString = ({ field, max, min }: { field: string; max: number; min: number }) => {
	return string().refine((val) => val.length >= min && val.length <= max, {
		message: `${field} must be between ${min} and ${max} characters`,
	});
};

export const booleanString = (field: string) => {
	return preprocess(
		(val) => {
			if (typeof val === 'string') {
				if (val.toLowerCase() === 'true') return true;
				if (val.toLowerCase() === 'false') return false;
			}
			return val;
		},
		boolean(`${field} must be a boolean or "true"/"false" string`)
	);
};

export const ipString = (field: string) => {
	return string().regex(
		/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)||([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}|::1$/,
		`${field} does not have a valid format`
	);
};

export const urlsArray = (field: string) => {
	return array(
		requiredString("Redirect URI's").pipe(
			url({ hostname: /^(localhost|127\.0\.0\.1|.*)$/, protocol: /^https?$/, error: 'Invalid redirect URI Must be HTTPS or localhost' })
		),
		`${field} must be an array`
	);
};

export const grantTypesArray = (field: string) => {
	return array(
		z.enum(VALID_GRANT_TYPES, `Invalid grant type, Valid types: ${VALID_GRANT_TYPES.join(', ')}`),
		`${field} must be an array`
	).min(1, `${field} cannot be empty if provided`);
};
