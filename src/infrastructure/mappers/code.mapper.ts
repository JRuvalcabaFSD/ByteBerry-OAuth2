import { ClientIdVO, CodeChallengeVO, CodeEntity } from '@domain';
import { AuthorizationCode } from '@prisma/client';

/**
 * Maps an authorization code domain object to its entity representation.
 *
 * @param code - The authorization code domain object to map
 * @returns The mapped CodeEntity with value objects created from the authorization code properties
 * @remarks
 * This method creates a new CodeEntity instance with:
 * - All properties from the input code
 * - A ClientIdVO value object created from the clientId
 * - A CodeChallengeVO value object created from the codeChallenge and codeChallengeMethod
 *
 * If the code has been marked as used (code.used is true and code.usedAt exists),
 * the resulting entity is also marked as used.
 */

export class CodeMapper {
	public static toEntity(code: AuthorizationCode): CodeEntity {
		const entity = CodeEntity.create({
			...code,
			clientId: ClientIdVO.create(code.clientId),
			codeChallenge: CodeChallengeVO.create(code.codeChallenge, code.codeChallengeMethod as 'S256' | 'plain'),
		});

		if (code.used && code.usedAt) {
			entity.markAsUsed();
		}

		return entity;
	}
}
