import z from 'zod';

import { booleanString, ipString, maxMinString, requiredString } from './helpers.js';

/**
 * Represents the data required to register a new user.
 *
 * @property email - The user's email address (required).
 * @property username - The user's chosen username (optional).
 * @property password - The user's password (required).
 * @property fullName - The user's full name (optional).
 * @property ipAddress - The IP address from which the registration is made (optional).
 */

export interface RegisterUserRequestData {
	email: string;
	username?: string;
	password: string;
	fullName?: string;
	ipAddress?: string;
	accountType?: 'user' | 'developer';
}

/**
 * Data transfer object for updating the current user's profile information.
 *
 * @property fullName - The user's full name. Optional; set to `null` to remove.
 * @property username - The user's username. Optional; set to `null` to remove.
 */
export interface UpdateUserRequestData {
	fullName?: string | null;
	username?: string | null;
}

/**
 * Represents the data required to update a user's password.
 *
 * @property currentPassword - The user's current password for verification.
 * @property newPassword - The new password to set for the user.
 * @property revokeAllSessions - Optional flag to indicate if all active sessions should be revoked after the password change.
 */

export interface UpdatePasswordRequestData {
	currentPassword: string;
	newPassword: string;
	revokeAllSessions?: boolean;
}

/**
 * Type representing the data structure for updating a user.
 * Inferred from the UserUpdateSchema Zod schema definition.
 *
 * @remarks
 * This type is automatically generated from the Zod schema validation,
 * ensuring type safety between runtime validation and TypeScript types.
 */

export type UserUpdateData = z.infer<typeof UpdateUserSchema>;

/**
 * Zod schema for validating user registration data.
 *
 * Fields:
 * - `email`: Required string. Must be a valid email address matching the specified regex pattern.
 * - `username`: Optional string. Trimmed, must be between 2 and 30 characters if provided.
 * - `password`: Required string. Must be between 6 and 24 characters.
 * - `fullName`: Optional string. Trimmed, maximum of 100 characters.
 * - `ipAddress`: Optional string. Must be a valid IPv4 address format if provided.
 *
 * Used to validate the shape and constraints of user registration requests.
 */

export const UserRegisterSchema: z.ZodType<RegisterUserRequestData> = z.object({
	email: requiredString('Email').pipe(z.email({ pattern: z.regexes.email, error: 'Email must be a valid email address' })),
	username: z
		.string()
		.trim()
		.pipe(maxMinString({ field: 'User name', min: 3, max: 30 }))
		.optional(),
	password: requiredString('Password').pipe(maxMinString({ field: 'Password', min: 6, max: 24 })),
	fullName: z.string().trim().max(100, 'Full name must be 100 characters or less').optional(),
	ipAddress: ipString('ipAddress').optional(),
	accountType: z.enum(['user', 'developer']).optional().default('user'),
});

/**
 * Zod schema for validating user update requests.
 *
 * This schema validates the following fields:
 * - `fullName` (optional, nullable): A trimmed string with a maximum length of 100 characters.
 * - `username` (optional): A trimmed string that must be between 3 and 30 characters in length.
 *
 * Additional validation rules:
 * - At least one of `fullName` or `username` must be provided.
 * - If `username` is provided, it cannot be null or an empty string.
 *
 * @remarks
 * Used to ensure that user update requests contain valid and sufficient data.
 */
export const UpdateUserSchema: z.ZodType<UpdateUserRequestData> = z
	.object({
		fullName: z.string().trim().max(100, 'Full name must be 100 characters or less').nullable().optional(),
		username: z
			.string()
			.trim()
			.refine((val) => val.length >= 3 && val.length <= 30, { message: 'Username must be between 3 and 30 characters' })
			.optional(),
	})
	.superRefine((data, ctx) => {
		const hasFullName = data.fullName !== undefined;
		const hasUsername = data.username !== undefined;

		if (!hasFullName && !hasUsername) {
			ctx.addIssue({
				code: 'custom',
				message: 'At least one field (fullName or username) must be provided',
			});
		}

		if (hasUsername && (data.username === null || data.username === '')) {
			ctx.addIssue({
				code: 'custom',
				message: 'Username cannot be empty or null',
				path: ['username'],
			});
		}
	});

/**
 * Zod schema for validating user password update requests.
 *
 * This schema enforces the following rules:
 * - `currentPassword`: Required string representing the user's current password.
 * - `newPassword`: Required string for the new password, must be between 8 and 16 characters,
 *   and must be different from the current password.
 * - `revokeAllSessions`: Optional boolean (as a string) indicating whether to revoke all sessions after password change.
 *
 * The schema also ensures that the new password is not the same as the current password.
 *
 * @see UpdatePasswordRequestData
 */

export const UpdatePasswordSchema: z.ZodType<UpdatePasswordRequestData> = z
	.object({
		currentPassword: requiredString('Current Password'),
		newPassword: requiredString('New password').pipe(maxMinString({ field: 'New password', max: 24, min: 6 })),
		revokeAllSessions: booleanString('revokeAllSessions').optional(),
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: 'New password must be different from current password',
		path: ['newPassword'],
	});
